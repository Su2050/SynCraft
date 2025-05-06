# clear_database.py
from app.database import engine
from sqlmodel import SQLModel, Session
from app.models import Node, Card

def clear_database():
    with Session(engine) as session:
        # 删除所有卡片数据
        session.query(Card).delete()
        # 删除所有节点数据
        session.query(Node).delete()
        session.commit()
        print("数据库已清空")

if __name__ == "__main__":
    clear_database()
