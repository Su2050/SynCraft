# backend/app/models/context_node.py
from datetime import datetime
import json
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from nanoid import generate
from typing import Dict, Any, Optional

class ContextNode(SQLModel, table=True):
    # 上下文节点关系的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 关联的上下文ID，外键关联到context表
    context_id: str = Field(foreign_key="context.id", index=True)
    
    # 关联的节点ID，外键关联到node表
    node_id: str = Field(foreign_key="node.id", index=True)
    
    # 关系创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 关系类型，如"root"（根节点）、"active"（活动节点）、"member"（普通成员）等
    relation_type: str = "member"
    
    # 额外信息，如排序顺序等
    node_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, default=dict))
    
    def __init__(self, **data):
        super().__init__(**data)
        # 确保node_metadata是字典类型
        if "node_metadata" in data:
            self._process_node_metadata(data["node_metadata"])
    
    def _process_node_metadata(self, value):
        """处理node_metadata，确保它是字典类型"""
        if value is None:
            self.node_metadata = {}
        elif isinstance(value, str):
            try:
                self.node_metadata = json.loads(value)
            except json.JSONDecodeError:
                self.node_metadata = {}
        else:
            self.node_metadata = value
