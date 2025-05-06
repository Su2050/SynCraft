# backend/app/database/database.py
from sqlmodel import SQLModel, create_engine, Session

# ---------- Engine ----------
engine = create_engine(
    "sqlite:///data.db",
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
