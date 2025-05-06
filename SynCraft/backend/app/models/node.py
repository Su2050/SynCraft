from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from nanoid import generate   # pip install nanoid

class Node(SQLModel, table=True):
    # 节点的唯一标识符
    id: str = Field(primary_key=True, index=True)
    
    # 父节点ID，外键关联到node表自身，用于构建树状结构
    parent_id: str | None = Field(default=None, foreign_key="node.id", index=True)
    
    # 关联的会话ID，外键关联到session表
    session_id: str = Field(foreign_key="session.id", index=True)
    
    # 到此节点为止的对话摘要
    summary_up_to_here: str | None = None
    
    # 模板键，用于指定使用的提示模板
    template_key: str | None = None
    
    # 节点创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 节点更新时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 扩展字段，JSON格式，用于存储额外信息
    ext: dict = Field(sa_column=Column(JSON, default=dict))
