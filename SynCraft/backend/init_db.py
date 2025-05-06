# backend/init_db.py
from app.database import engine
from sqlmodel import SQLModel

# 导入所有模型，确保它们被注册到SQLModel元数据中
from app.models import Node
from app.models.session import Session
from app.models.edge import Edge
from app.models.context import Context
from app.models.qapair import QAPair
from app.models.message import Message
from app.models.context_node import ContextNode

def init_db():
    """初始化数据库，创建所有表"""
    SQLModel.metadata.create_all(engine)
    print("数据库初始化完成，所有表已创建")

if __name__ == "__main__":
    init_db()
