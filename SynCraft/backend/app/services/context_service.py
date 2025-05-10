# backend/app/services/context_service.py
from sqlmodel import Session, select
from app.models.context import Context
from app.models.context_node import ContextNode
from app.models.node import Node
from app.models.session import Session as SessionModel
from nanoid import generate
from datetime import datetime
from typing import List, Dict, Optional, Any

class ContextService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_context(self, session_id: str, context_root_node_id: str, mode: str = "chat", 
                      source: Optional[str] = None) -> Context:
        """创建一个新的上下文"""
        # 验证会话存在
        session = self.db.get(SessionModel, session_id)
        if not session:
            raise ValueError(f"Session with id {session_id} not found")
        
        # 验证根节点存在
        root_node = self.db.get(Node, context_root_node_id)
        if not root_node:
            raise ValueError(f"Root node with id {context_root_node_id} not found")
        
        # 验证根节点属于同一会话
        if root_node.session_id != session_id:
            raise ValueError("Root node does not belong to the specified session")
        
        # 生成上下文ID
        if mode == "chat":
            context_id = f"chat-{session_id}"
        elif mode == "deepdive":
            context_id = f"deepdive-{context_root_node_id}-{session_id}"
        else:
            context_id = f"{mode}-{context_root_node_id}-{session_id}"
        
        # 检查是否已存在具有相同context_id的上下文
        existing_context = self.get_context_by_context_id(context_id)
        if existing_context:
            print(f"已存在具有相同context_id的上下文: {context_id}，返回现有上下文")
            return existing_context
        
        # 创建上下文
        context = Context(
            context_id=context_id,
            mode=mode,
            session_id=session_id,
            context_root_node_id=context_root_node_id,
            active_node_id=context_root_node_id,
            source=source
        )
        self.db.add(context)
        self.db.commit()
        self.db.refresh(context)
        
        # 创建上下文节点关系（根节点）
        context_node = ContextNode(
            context_id=context.id,
            node_id=context_root_node_id,
            relation_type="root"
        )
        self.db.add(context_node)
        self.db.commit()
        
        return context
    
    def get_context(self, context_id: str) -> Optional[Context]:
        """获取上下文详情"""
        return self.db.get(Context, context_id)
    
    def get_context_by_context_id(self, context_id_str: str) -> Optional[Context]:
        """通过上下文ID字符串获取上下文"""
        query = select(Context).where(Context.context_id == context_id_str)
        return self.db.exec(query).first()
    
    def get_context_with_nodes(self, context_id: str) -> Dict[str, Any]:
        """获取上下文详情，包括关联的节点"""
        context = self.db.get(Context, context_id)
        if not context:
            return None
        
        # 查询上下文节点关系
        query = select(ContextNode).where(ContextNode.context_id == context_id)
        context_nodes = self.db.exec(query).all()
        
        # 获取节点详情
        nodes_data = []
        for context_node in context_nodes:
            node = self.db.get(Node, context_node.node_id)
            if node:
                nodes_data.append({
                    "id": node.id,
                    "parent_id": node.parent_id,
                    "template_key": node.template_key,
                    "created_at": node.created_at,
                    "relation_type": context_node.relation_type,
                    "node_metadata": context_node.node_metadata
                })
        
        return {
            "id": context.id,
            "context_id": context.context_id,
            "mode": context.mode,
            "session_id": context.session_id,
            "context_root_node_id": context.context_root_node_id,
            "active_node_id": context.active_node_id,
            "created_at": context.created_at,
            "updated_at": context.updated_at,
            "source": context.source,
            "nodes": nodes_data
        }
    
    def update_context_without_commit(self, context_id: str, active_node_id: Optional[str] = None) -> Optional[Context]:
        """更新上下文信息但不提交事务，用于在更大的事务中使用"""
        print(f"开始更新上下文（不提交），context_id: {context_id}, active_node_id: {active_node_id}")
        
        context = self.db.get(Context, context_id)
        if not context:
            print(f"上下文不存在，context_id: {context_id}")
            return None
        
        print(f"当前上下文信息: id={context.id}, context_id={context.context_id}, mode={context.mode}, session_id={context.session_id}")
        print(f"当前active_node_id: {context.active_node_id}, 将更新为: {active_node_id}")
        
        # 更新活动节点
        if active_node_id:
            # 验证节点存在
            node = self.db.get(Node, active_node_id)
            if not node:
                error_msg = f"Node with id {active_node_id} not found"
                print(f"错误: {error_msg}")
                raise ValueError(error_msg)
            
            print(f"节点信息: id={node.id}, session_id={node.session_id}, parent_id={node.parent_id}")
            
            # 验证节点属于同一会话
            if node.session_id != context.session_id:
                error_msg = "Node does not belong to the context's session"
                print(f"错误: {error_msg}, node.session_id={node.session_id}, context.session_id={context.session_id}")
                raise ValueError(error_msg)
            
            # 保存旧值，用于日志
            old_active_node_id = context.active_node_id
            
            # 更新活动节点
            context.active_node_id = active_node_id
            print(f"更新活动节点: {old_active_node_id} -> {active_node_id}")
        
        context.updated_at = datetime.utcnow()
        
        # 添加到会话但不提交
        self.db.add(context)
        self.db.flush()  # 刷新会话，但不提交
        
        print(f"上下文更新成功（未提交），当前active_node_id: {context.active_node_id}")
        return context
    
    def update_context(self, context_id: str, active_node_id: Optional[str] = None) -> Optional[Context]:
        """更新上下文信息"""
        # 使用不提交版本的方法更新上下文
        context = self.update_context_without_commit(context_id, active_node_id)
        if not context:
            return None
        
        # 提交事务
        try:
            self.db.commit()
            self.db.refresh(context)
            print(f"上下文更新成功（已提交），当前active_node_id: {context.active_node_id}")
            return context
        except Exception as e:
            print(f"上下文更新失败: {e}")
            self.db.rollback()
            raise
    
    def delete_context(self, context_id: str) -> bool:
        """删除上下文及其关联的上下文节点关系"""
        context = self.db.get(Context, context_id)
        if not context:
            return False
        
        # 删除关联的上下文节点关系
        query = select(ContextNode).where(ContextNode.context_id == context_id)
        context_nodes = self.db.exec(query).all()
        for context_node in context_nodes:
            self.db.delete(context_node)
        
        # 删除上下文
        self.db.delete(context)
        self.db.commit()
        
        return True
    
    def add_node_to_context(self, context_id: str, node_id: str, relation_type: str = "member", 
                           node_metadata: Optional[Dict] = None) -> ContextNode:
        """将节点添加到上下文"""
        # 验证上下文存在
        context = self.db.get(Context, context_id)
        if not context:
            raise ValueError(f"Context with id {context_id} not found")
        
        # 验证节点存在
        node = self.db.get(Node, node_id)
        if not node:
            raise ValueError(f"Node with id {node_id} not found")
        
        # 验证节点属于同一会话
        if node.session_id != context.session_id:
            raise ValueError("Node does not belong to the context's session")
        
        # 检查节点是否已在上下文中
        query = select(ContextNode).where(
            ContextNode.context_id == context_id,
            ContextNode.node_id == node_id
        )
        existing = self.db.exec(query).first()
        if existing:
            # 如果已存在，更新关系类型和元数据
            existing.relation_type = relation_type
            if node_metadata:
                existing.node_metadata = node_metadata
            
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            
            return existing
        
        # 创建上下文节点关系
        context_node = ContextNode(
            context_id=context_id,
            node_id=node_id,
            relation_type=relation_type,
            node_metadata=node_metadata or {}
        )
        self.db.add(context_node)
        self.db.commit()
        self.db.refresh(context_node)
        
        return context_node
    
    def remove_node_from_context(self, context_id: str, node_id: str) -> bool:
        """从上下文中移除节点"""
        # 查询上下文节点关系
        query = select(ContextNode).where(
            ContextNode.context_id == context_id,
            ContextNode.node_id == node_id
        )
        context_node = self.db.exec(query).first()
        
        if not context_node:
            return False
        
        # 不允许移除根节点
        if context_node.relation_type == "root":
            raise ValueError("Cannot remove root node from context")
        
        # 删除上下文节点关系
        self.db.delete(context_node)
        self.db.commit()
        
        return True
    
    def get_context_nodes(self, context_id: str) -> List[Dict[str, Any]]:
        """获取上下文中的所有节点"""
        # 查询上下文节点关系
        query = select(ContextNode).where(ContextNode.context_id == context_id)
        context_nodes = self.db.exec(query).all()
        
        # 获取节点详情
        nodes_data = []
        for context_node in context_nodes:
            node = self.db.get(Node, context_node.node_id)
            if node:
                nodes_data.append({
                    "id": node.id,
                    "parent_id": node.parent_id,
                    "template_key": node.template_key,
                    "created_at": node.created_at,
                    "relation_type": context_node.relation_type,
                    "node_metadata": context_node.node_metadata
                })
        
        return nodes_data
    
    def get_session_contexts(self, session_id: str) -> List[Context]:
        """获取会话的所有上下文"""
        query = select(Context).where(Context.session_id == session_id)
        return self.db.exec(query).all()
