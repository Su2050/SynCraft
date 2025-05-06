# backend/app/models/message.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from nanoid import generate

class Message(SQLModel, table=True):
    # 消息的唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 关联的QA对ID，外键关联到qapair表
    qa_pair_id: str = Field(foreign_key="qapair.id", index=True)
    
    # 消息角色：user（用户）或assistant（AI助手）
    role: str
    
    # 消息内容
    content: str
    
    # 消息创建时间
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # 消息元数据，如token数量、模型名称等，JSON格式
    meta_info: dict | None = Field(sa_column=Column(JSON, default=dict))
