# backend/app/testAPI/conftest.py
import pytest
import os
from sqlmodel import SQLModel, Session, create_engine
from fastapi.testclient import TestClient
from typing import Generator, Dict, Any

# 设置测试环境变量
os.environ["TESTING"] = "true"

# 直接导入各个模型类，确保它们被正确注册
from app.models.node import Node
from app.models.session import Session as SessionModel
from app.models.edge import Edge
from app.models.context import Context
from app.models.context_node import ContextNode
from app.models.qapair import QAPair
from app.models.message import Message

from app.main import app
from app.database import get_session

# 创建文件数据库而不是内存数据库，确保连接共享
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

# 创建测试数据库会话
@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    创建一个测试数据库会话，用于测试
    """
    # 确保表被正确创建
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    # 创建会话并确保它在整个测试过程中共享
    with Session(engine) as session:
        yield session
    
    # 清理表
    SQLModel.metadata.drop_all(engine)

# 创建测试客户端
@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    创建一个测试客户端，用于测试API
    """
    # 覆盖依赖项，确保使用同一个数据库会话
    def override_get_session():
        yield db_session
    
    app.dependency_overrides[get_session] = override_get_session
    
    # 创建测试客户端
    with TestClient(app) as test_client:
        yield test_client
    
    # 清理依赖项
    app.dependency_overrides.clear()

# 创建测试数据
@pytest.fixture
def test_data(db_session: Session) -> Dict[str, Any]:
    """
    创建测试数据，用于测试
    """
    # 创建会话
    session = SessionModel(name="测试会话")
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    # 创建根节点
    root_node = Node(
        id="root-node-id",
        session_id=session.id,
        template_key="root"
    )
    db_session.add(root_node)
    db_session.commit()
    db_session.refresh(root_node)
    
    # 更新会话的根节点ID
    session.root_node_id = root_node.id
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    # 创建子节点
    child_node = Node(
        id="child-node-id",
        parent_id=root_node.id,
        session_id=session.id,
        template_key="child"
    )
    db_session.add(child_node)
    db_session.commit()
    db_session.refresh(child_node)
    
    # 创建边
    edge = Edge(
        source=root_node.id,
        target=child_node.id,
        session_id=session.id
    )
    db_session.add(edge)
    db_session.commit()
    db_session.refresh(edge)
    
    # 创建上下文
    context = Context(
        context_id=f"chat-{session.id}",
        mode="chat",
        session_id=session.id,
        context_root_node_id=root_node.id,
        active_node_id=root_node.id,
        source="test"
    )
    db_session.add(context)
    db_session.commit()
    db_session.refresh(context)
    
    # 创建上下文节点关系
    context_node = ContextNode(
        context_id=context.id,
        node_id=root_node.id,
        relation_type="root"
    )
    db_session.add(context_node)
    db_session.commit()
    db_session.refresh(context_node)
    
    # 创建QA对
    qa_pair = QAPair(
        node_id=root_node.id,
        session_id=session.id
    )
    db_session.add(qa_pair)
    db_session.commit()
    db_session.refresh(qa_pair)
    
    # 创建消息
    user_message = Message(
        qa_pair_id=qa_pair.id,
        role="user",
        content="测试问题"
    )
    db_session.add(user_message)
    db_session.commit()
    db_session.refresh(user_message)
    
    assistant_message = Message(
        qa_pair_id=qa_pair.id,
        role="assistant",
        content="测试回答"
    )
    db_session.add(assistant_message)
    db_session.commit()
    db_session.refresh(assistant_message)
    
    # 返回测试数据
    return {
        "session": session,
        "root_node": root_node,
        "child_node": child_node,
        "edge": edge,
        "context": context,
        "context_node": context_node,
        "qa_pair": qa_pair,
        "user_message": user_message,
        "assistant_message": assistant_message
    }
