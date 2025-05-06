# backend/app/models/qapair.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from nanoid import generate

class QAPair(SQLModel, table=True):
    # QA对的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 关联的节点ID，外键关联到node表
    node_id: str = Field(foreign_key="node.id", index=True)
    
    # 关联的会话ID，外键关联到session表
    session_id: str = Field(foreign_key="session.id", index=True)
    
    # QA对的创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # QA对的更新时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # QA对的标签列表，JSON格式
    tags: list | None = Field(sa_column=Column(JSON, default=list))
    
    # 是否被收藏
    is_favorite: bool = False
    
    # QA对的状态，如草稿、已发布、已归档等
    status: str | None = None
    
    # 用户评分
    rating: int | None = None
    
    # 查看次数
    view_count: int = 0
    
    # 扩展字段，JSON格式，用于存储额外信息
    ext: dict = Field(sa_column=Column(JSON, default=dict))
