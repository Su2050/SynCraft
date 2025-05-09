# backend/app/database/database.py
from sqlmodel import SQLModel, create_engine, Session

import os

# ---------- Engine ----------
# 检查是否在Docker容器中运行
if os.path.exists('/app'):
    # Docker环境
    db_path = "/app/db/data.db"
else:
    # 本地开发环境
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data.db")

# 确保数据库目录存在
os.makedirs(os.path.dirname(db_path), exist_ok=True)

engine = create_engine(
    f"sqlite:///{db_path}",
    echo=False,
    connect_args={"check_same_thread": False},
)

# ---------- Init (建表) ----------
def init_db() -> None:
    SQLModel.metadata.create_all(engine)

# ---------- Session dependency ----------
def get_session():
    with Session(engine) as session:
        yield session
