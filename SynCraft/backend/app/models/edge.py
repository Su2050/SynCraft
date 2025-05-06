# backend/app/models/edge.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from nanoid import generate

class Edge(SQLModel, table=True):
    # 边的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 源节点ID，外键关联到node表
    source: str = Field(foreign_key="node.id", index=True)
    
    # 目标节点ID，外键关联到node表
    target: str = Field(foreign_key="node.id", index=True)
    
    # 关联的会话ID，外键关联到session表
    session_id: str = Field(foreign_key="session.id", index=True)
    
    # 边创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
