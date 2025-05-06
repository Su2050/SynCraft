# backend/app/testAPI/test_session_service.py
import pytest
from sqlmodel import Session

from app.services.session_service import SessionService
from app.models.session import Session as SessionModel
from app.models.node import Node
from app.models.context import Context

def test_create_session(db_session: Session):
    """测试创建会话"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 创建会话
    result = session_service.create_session(name="测试会话")
    
    # 验证结果
    assert result["name"] == "测试会话"
    assert result["user_id"] == "local"
    assert result["root_node_id"] is not None
    assert result["main_context"] is not None
    assert result["main_context"]["mode"] == "chat"
    
    # 验证数据库中的记录
    session = db_session.get(SessionModel, result["id"])
    assert session is not None
    assert session.name == "测试会话"
    
    # 验证根节点
    root_node = db_session.get(Node, result["root_node_id"])
    assert root_node is not None
    assert root_node.session_id == result["id"]
    assert root_node.template_key == "root"
    
    # 验证主聊天上下文
    context = db_session.get(Context, result["main_context"]["id"])
    assert context is not None
    assert context.session_id == result["id"]
    assert context.context_root_node_id == result["root_node_id"]
    assert context.active_node_id == result["root_node_id"]
    assert context.mode == "chat"

def test_get_sessions(db_session: Session, test_data):
    """测试获取会话列表"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 获取会话列表
    result = session_service.get_sessions()
    
    # 验证结果
    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0].id == test_data["session"].id
    assert result["items"][0].name == test_data["session"].name

def test_get_session(db_session: Session, test_data):
    """测试获取会话详情"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 获取会话详情
    result = session_service.get_session(test_data["session"].id)
    
    # 验证结果
    assert result["id"] == test_data["session"].id
    assert result["name"] == test_data["session"].name
    assert result["root_node_id"] == test_data["root_node"].id
    assert len(result["contexts"]) == 1
    assert result["contexts"][0].id == test_data["context"].id

def test_update_session(db_session: Session, test_data):
    """测试更新会话"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 更新会话
    session = session_service.update_session(
        session_id=test_data["session"].id,
        name="更新后的会话名称"
    )
    
    # 验证结果
    assert session.name == "更新后的会话名称"
    
    # 验证数据库中的记录
    session = db_session.get(SessionModel, test_data["session"].id)
    assert session.name == "更新后的会话名称"

def test_delete_session(db_session: Session, test_data):
    """测试删除会话"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 删除会话
    success = session_service.delete_session(test_data["session"].id)
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    session = db_session.get(SessionModel, test_data["session"].id)
    assert session is None

def test_get_main_context(db_session: Session, test_data):
    """测试获取会话的主聊天上下文"""
    # 创建SessionService
    session_service = SessionService(db_session)
    
    # 获取会话的主聊天上下文
    context = session_service.get_main_context(test_data["session"].id)
    
    # 验证结果
    assert context is not None
    assert context.id == test_data["context"].id
    assert context.mode == "chat"
    assert context.context_root_node_id == test_data["root_node"].id
