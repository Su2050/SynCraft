# backend/app/services/session_service.py
from sqlmodel import Session, select
from app.models.session import Session as SessionModel
from app.models.node import Node
from app.models.context import Context
from app.models.context_node import ContextNode
from app.cache.cache_manager import cached
from nanoid import generate
from datetime import datetime
from typing import List, Dict, Optional, Any

class SessionService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, name: str, user_id: str = "local") -> Dict[str, Any]:
        """创建一个新会话，包括根节点和主聊天上下文"""
        try:
            # 使用事务包装整个创建过程，确保原子性
            with self.db.begin() as transaction:
                # 创建会话
                session = SessionModel(
                    name=name,
                    user_id=user_id
                )
                self.db.add(session)
                self.db.flush()  # 使用flush而不是commit，保持在同一事务中
                
                # 创建根节点
                root_node = Node(
                    id=generate(),
                    session_id=session.id,
                    template_key="root"
                )
                self.db.add(root_node)
                self.db.flush()
                
                # 更新会话的根节点ID
                session.root_node_id = root_node.id
                self.db.add(session)
                self.db.flush()
                
                # 创建主聊天上下文
                context = Context(
                    context_id=f"chat-{session.id}",
                    mode="chat",
                    session_id=session.id,
                    context_root_node_id=root_node.id,
                    active_node_id=root_node.id
                )
                self.db.add(context)
                self.db.flush()
                
                # 创建上下文节点关系
                context_node = ContextNode(
                    context_id=context.id,
                    node_id=root_node.id,
                    relation_type="root"
                )
                self.db.add(context_node)
                # 事务结束时会自动提交
        except Exception as e:
            # 记录错误并抛出异常
            # 在实际应用中，应该使用日志记录错误
            # import logging
            # logger = logging.getLogger(__name__)
            # logger.error(f"创建会话失败: {str(e)}")
            raise ValueError(f"创建会话失败: {str(e)}")
        
        # 返回会话信息
        return {
            "id": session.id,
            "name": session.name,
            "user_id": session.user_id,
            "root_node_id": root_node.id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "main_context": {
                "id": context.id,
                "context_id": context.context_id,
                "mode": context.mode,
                "context_root_node_id": context.context_root_node_id,
                "active_node_id": context.active_node_id
            }
        }
    
    @cached(ttl=60)
    def get_sessions(self, user_id: str = "local", limit: int = 10, offset: int = 0, 
                    sort_by: str = "created_at", sort_order: str = "desc") -> Dict[str, Any]:
        """获取会话列表"""
        # 构建查询
        query = select(SessionModel).where(SessionModel.user_id == user_id)
        
        # 添加排序
        if sort_order == "desc":
            query = query.order_by(getattr(SessionModel, sort_by).desc())
        else:
            query = query.order_by(getattr(SessionModel, sort_by))
        
        # 执行查询获取总数
        total_query = query
        total = len(self.db.exec(total_query).all())
        
        # 添加分页
        query = query.offset(offset).limit(limit)
        
        # 执行查询
        sessions = self.db.exec(query).all()
        
        return {
            "total": total,
            "items": sessions
        }
    
    @cached(ttl=60)
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取会话详情"""
        # 查询会话
        session = self.db.get(SessionModel, session_id)
        if not session:
            return None
        
        # 查询上下文
        query = select(Context).where(Context.session_id == session_id)
        contexts = self.db.exec(query).all()
        
        return {
            "id": session.id,
            "name": session.name,
            "user_id": session.user_id,
            "root_node_id": session.root_node_id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "contexts": contexts
        }
    
    def update_session(self, session_id: str, name: Optional[str] = None) -> Optional[SessionModel]:
        """更新会话"""
        # 查询会话
        session = self.db.get(SessionModel, session_id)
        if not session:
            return None
        
        # 更新字段
        if name is not None:
            session.name = name
        
        session.updated_at = datetime.utcnow()
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def delete_session(self, session_id: str) -> bool:
        """删除会话及其关联的节点、边、上下文等"""
        # 查询会话
        session = self.db.get(SessionModel, session_id)
        if not session:
            return False
        
        # 查询上下文
        query = select(Context).where(Context.session_id == session_id)
        contexts = self.db.exec(query).all()
        
        # 删除上下文节点关系
        for context in contexts:
            query = select(ContextNode).where(ContextNode.context_id == context.id)
            context_nodes = self.db.exec(query).all()
            for context_node in context_nodes:
                self.db.delete(context_node)
            
            # 删除上下文
            self.db.delete(context)
        
        # 查询节点
        query = select(Node).where(Node.session_id == session_id)
        nodes = self.db.exec(query).all()
        
        # 删除节点
        for node in nodes:
            self.db.delete(node)
        
        # 删除会话
        self.db.delete(session)
        self.db.commit()
        
        return True
    
    @cached(ttl=300)
    def get_main_context(self, session_id: str) -> Optional[Context]:
        """获取会话的主聊天上下文"""
        # 查询会话
        session = self.db.get(SessionModel, session_id)
        if not session:
            return None
        
        # 查询主聊天上下文
        query = select(Context).where(
            Context.session_id == session_id,
            Context.mode == "chat"
        )
        context = self.db.exec(query).first()
        
        return context
