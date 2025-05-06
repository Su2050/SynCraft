# backend/app/models/context.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from nanoid import generate

class Context(SQLModel, table=True):
    # 上下文的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 上下文ID，格式为：chat-{sessionId} 或 deepdive-{nodeId}-{sessionId}
    context_id: str = Field(index=True)
    
    # 上下文模式：chat（聊天模式）或 deepdive（深挖模式）
    mode: str
    
    # 关联的会话ID，外键关联到session表
    session_id: str = Field(foreign_key="session.id", index=True)
    
    # 上下文根节点ID，外键关联到node表，表示当前上下文的根节点，在chat模式下是会话的根节点，在deepdive模式下是被深挖的节点
    context_root_node_id: str = Field(foreign_key="node.id", index=True)
    
    # 活动节点ID，外键关联到node表，表示当前上下文中活动的节点
    active_node_id: str | None = Field(default=None, foreign_key="node.id")
    
    # 上下文创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 上下文更新时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 上下文来源，记录上下文是如何创建的
    source: str | None = None
