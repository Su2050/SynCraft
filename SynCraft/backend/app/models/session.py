# backend/app/models/session.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from nanoid import generate

class Session(SQLModel, table=True):
    # 会话的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 会话名称
    name: str
    
    # 根节点ID，外键关联到node表
    root_node_id: str | None = Field(default=None, foreign_key="node.id")
    
    # 会话创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 会话更新时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 用户ID，为未来的多用户支持预留
    user_id: str = "local"
