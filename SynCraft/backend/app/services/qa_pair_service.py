# backend/app/services/qa_pair_service.py
from sqlmodel import Session, select
from app.models.qapair import QAPair
from app.models.message import Message
from app.models.node import Node
from app.models.session import Session as SessionModel
from app.services.llm import get_llm_service
from app.utils.prompt import build_prompt
from nanoid import generate
from datetime import datetime
from typing import List, Dict, Optional, Any

class QAPairService:
    def __init__(self, db: Session):
        self.db = db
        self.llm_service = get_llm_service()
    
    def create_qa_pair(self, node_id: str, question: str, answer: Optional[str] = None, 
                      status: Optional[str] = None) -> Dict[str, Any]:
        """创建一个新的QA对"""
        # 验证节点存在
        node = self.db.get(Node, node_id)
        if not node:
            raise ValueError(f"Node with id {node_id} not found")
        
        # 创建QA对
        qa_pair = QAPair(
            node_id=node_id,
            session_id=node.session_id,
            status=status
        )
        self.db.add(qa_pair)
        self.db.commit()
        self.db.refresh(qa_pair)
        
        # 创建用户消息
        user_message = Message(
            qa_pair_id=qa_pair.id,
            role="user",
            content=question
        )
        self.db.add(user_message)
        self.db.commit()
        
        # 如果提供了回答，创建助手消息
        if answer:
            assistant_message = Message(
                qa_pair_id=qa_pair.id,
                role="assistant",
                content=answer
            )
            self.db.add(assistant_message)
            self.db.commit()
        
        # 返回QA对信息，包括消息
        return self.get_qa_pair_with_messages(qa_pair.id)
    
    def get_qa_pair(self, qa_pair_id: str) -> Optional[QAPair]:
        """获取QA对详情"""
        return self.db.get(QAPair, qa_pair_id)
    
    def get_qa_pair_with_messages(self, qa_pair_id: str) -> Dict[str, Any]:
        """获取QA对详情，包括消息"""
        qa_pair = self.db.get(QAPair, qa_pair_id)
        if not qa_pair:
            return None
        
        # 查询消息
        query = select(Message).where(Message.qa_pair_id == qa_pair_id).order_by(Message.timestamp)
        messages = self.db.exec(query).all()
        
        return {
            "id": qa_pair.id,
            "node_id": qa_pair.node_id,
            "session_id": qa_pair.session_id,
            "created_at": qa_pair.created_at,
            "updated_at": qa_pair.updated_at,
            "tags": qa_pair.tags,
            "is_favorite": qa_pair.is_favorite,
            "status": qa_pair.status,
            "rating": qa_pair.rating,
            "view_count": qa_pair.view_count,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp,
                    "meta_info": msg.meta_info
                }
                for msg in messages
            ]
        }
    
    def update_qa_pair(self, qa_pair_id: str, status: Optional[str] = None, 
                      rating: Optional[int] = None) -> Optional[QAPair]:
        """更新QA对信息"""
        qa_pair = self.db.get(QAPair, qa_pair_id)
        if not qa_pair:
            return None
        
        # 更新字段
        if status is not None:
            qa_pair.status = status
        
        if rating is not None:
            qa_pair.rating = rating
        
        qa_pair.updated_at = datetime.utcnow()
        
        self.db.add(qa_pair)
        self.db.commit()
        self.db.refresh(qa_pair)
        
        return qa_pair
    
    def delete_qa_pair(self, qa_pair_id: str) -> bool:
        """删除QA对及其消息"""
        qa_pair = self.db.get(QAPair, qa_pair_id)
        if not qa_pair:
            return False
        
        # 删除关联的消息
        query = select(Message).where(Message.qa_pair_id == qa_pair_id)
        messages = self.db.exec(query).all()
        for message in messages:
            self.db.delete(message)
        
        # 删除QA对
        self.db.delete(qa_pair)
        self.db.commit()
        
        return True
    
    def add_message(self, qa_pair_id: str, role: str, content: str, 
                   meta_info: Optional[Dict] = None) -> Message:
        """向QA对添加消息"""
        # 验证QA对存在
        qa_pair = self.db.get(QAPair, qa_pair_id)
        if not qa_pair:
            raise ValueError(f"QA pair with id {qa_pair_id} not found")
        
        # 保存原始更新时间
        original_updated_at = qa_pair.updated_at
        
        # 创建消息
        message = Message(
            qa_pair_id=qa_pair_id,
            role=role,
            content=content,
            meta_info=meta_info or {}
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # 确保更新时间有变化
        import time
        time.sleep(0.001)  # 添加小延迟确保时间戳不同
        
        # 更新QA对的更新时间 - 在单独的事务中更新
        qa_pair = self.db.get(QAPair, qa_pair_id)  # 重新获取QA对
        qa_pair.updated_at = datetime.utcnow()
        self.db.add(qa_pair)
        self.db.commit()
        
        return message
    
    def get_node_qa_pairs(self, node_id: str) -> List[Dict[str, Any]]:
        """获取节点的所有QA对"""
        # 查询QA对
        query = select(QAPair).where(QAPair.node_id == node_id).order_by(QAPair.created_at)
        qa_pairs = self.db.exec(query).all()
        
        result = []
        for qa_pair in qa_pairs:
            # 查询消息
            query = select(Message).where(Message.qa_pair_id == qa_pair.id).order_by(Message.timestamp)
            messages = self.db.exec(query).all()
            
            result.append({
                "id": qa_pair.id,
                "created_at": qa_pair.created_at,
                "updated_at": qa_pair.updated_at,
                "tags": qa_pair.tags,
                "is_favorite": qa_pair.is_favorite,
                "status": qa_pair.status,
                "messages": [
                    {
                        "id": msg.id,
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.timestamp
                    }
                    for msg in messages
                ]
            })
        
        return result
    
    def increment_view_count(self, qa_pair_id: str) -> Optional[QAPair]:
        """增加QA对的查看次数"""
        qa_pair = self.db.get(QAPair, qa_pair_id)
        if not qa_pair:
            return None
        
        qa_pair.view_count += 1
        
        self.db.add(qa_pair)
        self.db.commit()
        self.db.refresh(qa_pair)
        
        return qa_pair
    
    def ask_question(self, node_id: str, question: str) -> Dict[str, Any]:
        """提问并获取回答"""
        # 验证节点存在
        node = self.db.get(Node, node_id)
        if not node:
            raise ValueError(f"Node with id {node_id} not found")
        
        # 获取父节点（如果有）
        parent = None
        if node.parent_id:
            parent = self.db.get(Node, node.parent_id)
        
        # 构建提示词
        prompt = build_prompt(parent, question)
        
        # 调用LLM获取回答
        answer = self.llm_service.call_llm(prompt)
        if not answer or not isinstance(answer, str) or not answer.strip():
            # 兜底：LLM异常时给出默认回复
            answer = "AI暂时无法回答，请稍后再试。"
            print(f"[QAPairService.ask_question] LLM返回内容为空，已用默认回复。prompt={prompt}")

        # 创建QA对和消息
        return self.create_qa_pair(node_id, question, answer)
    
    def search_qa_pairs(self, query: Optional[str] = None, session_id: Optional[str] = None, 
                       limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """搜索QA对"""
        try:
            # 构建基本查询
            stmt = select(QAPair)
            
            # 添加过滤条件
            if session_id:
                stmt = stmt.where(QAPair.session_id == session_id)
            
            # 执行查询获取QA对
            qa_pairs = self.db.exec(stmt).all()
            
            # 构建结果
            items = []
            matched_qa_pairs = []
            
            # 搜索词转小写
            search_term = query.lower() if query else None
            
            for qa_pair in qa_pairs:
                # 查询消息
                msg_query = select(Message).where(Message.qa_pair_id == qa_pair.id).order_by(Message.timestamp)
                messages = self.db.exec(msg_query).all()
                
                # 提取问题和回答
                question = None
                answer = None
                for msg in messages:
                    if msg.role == "user":
                        question = msg.content
                    elif msg.role == "assistant":
                        answer = msg.content
                
                # 检查是否匹配查询
                if search_term:
                    question_text = (question or "").lower()
                    answer_text = (answer or "").lower()
                    
                    if search_term not in question_text and search_term not in answer_text:
                        continue  # 不匹配搜索词，跳过
                
                matched_qa_pairs.append(qa_pair)
                items.append({
                    "id": qa_pair.id,
                    "node_id": qa_pair.node_id,
                    "session_id": qa_pair.session_id,
                    "created_at": qa_pair.created_at,
                    "updated_at": qa_pair.updated_at,
                    "tags": qa_pair.tags,
                    "is_favorite": qa_pair.is_favorite,
                    "status": qa_pair.status,
                    "rating": qa_pair.rating,
                    "view_count": qa_pair.view_count,
                    "question": question[:100] + "..." if question and len(question) > 100 else question,
                    "answer": answer[:100] + "..." if answer and len(answer) > 100 else answer
                })
            
            # 应用分页
            total = len(matched_qa_pairs)
            items = items[offset:offset+limit]
            
            return {
                "total": total,
                "items": items
            }
        
        except Exception as e:
            # 记录错误并返回空结果
            print(f"搜索QA对时发生错误: {str(e)}")
            return {"total": 0, "items": [], "error": str(e)}
    
    def _search_qa_pairs_db_only(self, session_id: Optional[str] = None, 
                               limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """仅使用数据库查询和分页搜索QA对"""
        # 构建基本查询
        stmt = select(QAPair)
        
        # 添加过滤条件
        if session_id:
            stmt = stmt.where(QAPair.session_id == session_id)
        
        # 获取总数
        total_query = stmt
        all_qa_pairs = self.db.exec(total_query).all()
        total = len(all_qa_pairs)
        
        # 添加分页
        stmt = stmt.offset(offset).limit(limit)
        
        # 执行查询获取QA对
        qa_pairs = self.db.exec(stmt).all()
        
        # 构建结果
        items = []
        for qa_pair in qa_pairs:
            # 查询消息
            msg_query = select(Message).where(Message.qa_pair_id == qa_pair.id).order_by(Message.timestamp)
            messages = self.db.exec(msg_query).all()
            
            # 提取问题和回答
            question = None
            answer = None
            for msg in messages:
                if msg.role == "user":
                    question = msg.content
                elif msg.role == "assistant":
                    answer = msg.content
            
            items.append({
                "id": qa_pair.id,
                "node_id": qa_pair.node_id,
                "session_id": qa_pair.session_id,
                "created_at": qa_pair.created_at,
                "updated_at": qa_pair.updated_at,
                "tags": qa_pair.tags,
                "is_favorite": qa_pair.is_favorite,
                "status": qa_pair.status,
                "rating": qa_pair.rating,
                "view_count": qa_pair.view_count,
                "question": question[:100] + "..." if question and len(question) > 100 else question,
                "answer": answer[:100] + "..." if answer and len(answer) > 100 else answer
            })
        
        return {
            "total": total,
            "items": items
        }
    
    def _get_qa_pair_ids_with_filters(self, session_id: Optional[str] = None) -> List[str]:
        """获取符合过滤条件的QA对ID列表"""
        # 构建基本查询
        stmt = select(QAPair.id)
        
        # 添加过滤条件
        if session_id:
            stmt = stmt.where(QAPair.session_id == session_id)
        
        # 执行查询获取QA对ID
        result = self.db.exec(stmt).all()
        return [r[0] for r in result]
