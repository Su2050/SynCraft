# backend/app/services/node_service.py
from sqlmodel import Session, select
from app.models.node import Node
from app.models.edge import Edge
from app.models.qapair import QAPair
from app.models.message import Message
from app.models.session import Session as SessionModel
from nanoid import generate
from datetime import datetime
from typing import List, Dict, Optional, Any

class NodeService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_node(self, session_id: str, parent_id: Optional[str] = None, template_key: Optional[str] = None) -> Node:
        """创建一个新节点"""
        # 验证会话存在
        session = self.db.get(SessionModel, session_id)
        if not session:
            raise ValueError(f"Session with id {session_id} not found")
        
        # 如果提供了父节点ID，验证父节点存在
        if parent_id:
            parent = self.db.get(Node, parent_id)
            if not parent:
                raise ValueError(f"Parent node with id {parent_id} not found")
            
            # 验证父节点属于同一会话
            if parent.session_id != session_id:
                raise ValueError("Parent node does not belong to the specified session")
        
        # 创建节点
        node = Node(
            id=generate(),
            parent_id=parent_id,
            session_id=session_id,
            template_key=template_key
        )
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        
        # 如果有父节点，创建边
        if parent_id:
            edge = Edge(
                source=parent_id,
                target=node.id,
                session_id=session_id
            )
            self.db.add(edge)
            self.db.commit()
        
        return node
    
    def get_node(self, node_id: str) -> Optional[Node]:
        """获取节点详情"""
        return self.db.get(Node, node_id)
    
    def get_node_with_qa(self, node_id: str) -> Dict[str, Any]:
        """获取节点详情，包括关联的QA对"""
        node = self.db.get(Node, node_id)
        if not node:
            return None
        
        # 查询节点的QA对
        query = select(QAPair).where(QAPair.node_id == node_id).order_by(QAPair.created_at)
        qa_pairs = self.db.exec(query).all()
        
        qa_data = []
        for qa_pair in qa_pairs:
            # 查询消息
            query = select(Message).where(Message.qa_pair_id == qa_pair.id).order_by(Message.timestamp)
            messages = self.db.exec(query).all()
            
            qa_data.append({
                "id": qa_pair.id,
                "created_at": qa_pair.created_at,
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
        
        # 查询子节点
        query = select(Node).where(Node.parent_id == node_id)
        children = self.db.exec(query).all()
        
        return {
            "id": node.id,
            "parent_id": node.parent_id,
            "session_id": node.session_id,
            "summary_up_to_here": node.summary_up_to_here,
            "template_key": node.template_key,
            "created_at": node.created_at,
            "updated_at": node.updated_at,
            "qa_pairs": qa_data,
            "children": [
                {
                    "id": child.id,
                    "template_key": child.template_key,
                    "created_at": child.created_at
                }
                for child in children
            ]
        }
    
    def update_node(self, node_id: str, summary_up_to_here: Optional[str] = None, 
                   template_key: Optional[str] = None, ext: Optional[Dict] = None) -> Optional[Node]:
        """更新节点信息"""
        node = self.db.get(Node, node_id)
        if not node:
            return None
        
        # 更新字段
        if summary_up_to_here is not None:
            node.summary_up_to_here = summary_up_to_here
        
        if template_key is not None:
            node.template_key = template_key
        
        if ext is not None:
            node.ext = ext
        
        node.updated_at = datetime.utcnow()
        
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        
        return node
    
    def delete_node(self, node_id: str) -> bool:
        """删除节点及其子节点"""
        node = self.db.get(Node, node_id)
        if not node:
            return False
        
        # 递归删除子节点
        self._delete_node_recursive(node_id)
        
        return True
    
    def _delete_node_recursive(self, node_id: str) -> None:
        """递归删除节点及其子节点"""
        # 查询子节点
        query = select(Node).where(Node.parent_id == node_id)
        children = self.db.exec(query).all()
        
        # 递归删除子节点
        for child in children:
            self._delete_node_recursive(child.id)
        
        # 删除关联的边
        query = select(Edge).where((Edge.source == node_id) | (Edge.target == node_id))
        edges = self.db.exec(query).all()
        for edge in edges:
            self.db.delete(edge)
        
        # 删除关联的QA对
        query = select(QAPair).where(QAPair.node_id == node_id)
        qa_pairs = self.db.exec(query).all()
        for qa_pair in qa_pairs:
            # 删除关联的消息
            query = select(Message).where(Message.qa_pair_id == qa_pair.id)
            messages = self.db.exec(query).all()
            for message in messages:
                self.db.delete(message)
            
            self.db.delete(qa_pair)
        
        # 删除节点
        node = self.db.get(Node, node_id)
        if node:
            self.db.delete(node)
        
        self.db.commit()
    
    def get_node_path(self, node_id: str) -> List[Node]:
        """获取从根节点到指定节点的路径"""
        path = []
        current_node = self.db.get(Node, node_id)
        
        while current_node:
            path.insert(0, current_node)
            if not current_node.parent_id:
                break
            current_node = self.db.get(Node, current_node.parent_id)
        
        return path
    
    def get_node_children(self, node_id: str) -> List[Node]:
        """获取节点的直接子节点"""
        query = select(Node).where(Node.parent_id == node_id).order_by(Node.created_at)
        return self.db.exec(query).all()
    
    def get_node_descendants(self, node_id: str) -> List[Node]:
        """获取节点的所有后代节点"""
        descendants = []
        self._get_descendants_recursive(node_id, descendants)
        return descendants
    
    def _get_descendants_recursive(self, node_id: str, descendants: List[Node]) -> None:
        """递归获取节点的所有后代节点"""
        children = self.get_node_children(node_id)
        for child in children:
            descendants.append(child)
            self._get_descendants_recursive(child.id, descendants)
