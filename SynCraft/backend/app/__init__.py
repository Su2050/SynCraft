# backend/app/__init__.py
from app.database import init_db
from app.models import Node, Session, Edge, Context, ContextNode, QAPair, Message
from app.services import *
from app.utils import extract_entities, build_prompt

# 初始化数据库
init_db()
