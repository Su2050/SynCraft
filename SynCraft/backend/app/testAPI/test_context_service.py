# backend/app/testAPI/test_context_service.py
import pytest
from sqlmodel import Session, select

from app.services.context_service import ContextService
from app.models.context import Context
from app.models.context_node import ContextNode
from app.models.node import Node
from app.models.session import Session as SessionModel

def test_create_context(db_session: Session, test_data):
    """测试创建上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 创建上下文
    context = context_service.create_context(
        session_id=test_data["session"].id,
        context_root_node_id=test_data["root_node"].id,
        mode="deepdive",
        source="test"
    )
    
    # 验证结果
    assert context is not None
    assert context.session_id == test_data["session"].id
    assert context.context_root_node_id == test_data["root_node"].id
    assert context.active_node_id == test_data["root_node"].id
    assert context.mode == "deepdive"
    assert context.source == "test"
    assert context.context_id == f"deepdive-{test_data['root_node'].id}-{test_data['session'].id}"
    
    # 验证数据库中的记录
    db_context = db_session.get(Context, context.id)
    assert db_context is not None
    assert db_context.session_id == test_data["session"].id
    assert db_context.context_root_node_id == test_data["root_node"].id
    assert db_context.active_node_id == test_data["root_node"].id
    assert db_context.mode == "deepdive"
    assert db_context.source == "test"
    
    # 验证上下文节点关系
    query = select(ContextNode).where(
        ContextNode.context_id == context.id,
        ContextNode.node_id == test_data["root_node"].id
    )
    context_nodes = db_session.exec(query).all()
    assert len(context_nodes) == 1
    assert context_nodes[0].context_id == context.id
    assert context_nodes[0].node_id == test_data["root_node"].id
    assert context_nodes[0].relation_type == "root"

def test_create_context_invalid_session(db_session: Session):
    """测试创建上下文时使用无效的会话ID"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试创建上下文
    with pytest.raises(ValueError) as excinfo:
        context_service.create_context(
            session_id="invalid-session-id",
            context_root_node_id="root-node-id",
            mode="chat"
        )
    
    # 验证错误消息
    assert "Session with id invalid-session-id not found" in str(excinfo.value)

def test_create_context_invalid_root_node(db_session: Session, test_data):
    """测试创建上下文时使用无效的根节点ID"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试创建上下文
    with pytest.raises(ValueError) as excinfo:
        context_service.create_context(
            session_id=test_data["session"].id,
            context_root_node_id="invalid-root-node-id",
            mode="chat"
        )
    
    # 验证错误消息
    assert "Root node with id invalid-root-node-id not found" in str(excinfo.value)

def test_get_context(db_session: Session, test_data):
    """测试获取上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 获取上下文
    context = context_service.get_context(test_data["context"].id)
    
    # 验证结果
    assert context is not None
    assert context.id == test_data["context"].id
    assert context.session_id == test_data["session"].id
    assert context.context_root_node_id == test_data["root_node"].id
    assert context.active_node_id == test_data["root_node"].id
    assert context.mode == "chat"
    assert context.source == "test"

def test_get_context_not_found(db_session: Session):
    """测试获取不存在的上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 获取上下文
    context = context_service.get_context("invalid-context-id")
    
    # 验证结果
    assert context is None

def test_get_context_by_context_id(db_session: Session, test_data):
    """测试通过上下文ID字符串获取上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 获取上下文
    context = context_service.get_context_by_context_id(test_data["context"].context_id)
    
    # 验证结果
    assert context is not None
    assert context.id == test_data["context"].id
    assert context.context_id == test_data["context"].context_id
    assert context.session_id == test_data["session"].id
    assert context.context_root_node_id == test_data["root_node"].id
    assert context.active_node_id == test_data["root_node"].id
    assert context.mode == "chat"
    assert context.source == "test"

def test_get_context_with_nodes(db_session: Session, test_data):
    """测试获取上下文详情，包括关联的节点"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 获取上下文详情
    result = context_service.get_context_with_nodes(test_data["context"].id)
    
    # 验证结果
    assert result is not None
    assert result["id"] == test_data["context"].id
    assert result["context_id"] == test_data["context"].context_id
    assert result["mode"] == "chat"
    assert result["session_id"] == test_data["session"].id
    assert result["context_root_node_id"] == test_data["root_node"].id
    assert result["active_node_id"] == test_data["root_node"].id
    assert result["source"] == "test"
    assert len(result["nodes"]) == 1
    assert result["nodes"][0]["id"] == test_data["root_node"].id
    assert result["nodes"][0]["relation_type"] == "root"

def test_update_context(db_session: Session, test_data):
    """测试更新上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 更新上下文
    context = context_service.update_context(
        context_id=test_data["context"].id,
        active_node_id=test_data["child_node"].id
    )
    
    # 验证结果
    assert context is not None
    assert context.id == test_data["context"].id
    assert context.active_node_id == test_data["child_node"].id
    
    # 验证数据库中的记录
    db_context = db_session.get(Context, test_data["context"].id)
    assert db_context is not None
    assert db_context.active_node_id == test_data["child_node"].id

def test_update_context_not_found(db_session: Session, test_data):
    """测试更新不存在的上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 更新上下文
    context = context_service.update_context(
        context_id="invalid-context-id",
        active_node_id=test_data["child_node"].id
    )
    
    # 验证结果
    assert context is None

def test_update_context_invalid_node(db_session: Session, test_data):
    """测试更新上下文时使用无效的活动节点ID"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试更新上下文
    with pytest.raises(ValueError) as excinfo:
        context_service.update_context(
            context_id=test_data["context"].id,
            active_node_id="invalid-node-id"
        )
    
    # 验证错误消息
    assert "Node with id invalid-node-id not found" in str(excinfo.value)

def test_delete_context(db_session: Session, test_data):
    """测试删除上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 删除上下文
    success = context_service.delete_context(test_data["context"].id)
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    db_context = db_session.get(Context, test_data["context"].id)
    assert db_context is None
    
    # 验证上下文节点关系也被删除
    query = select(ContextNode).where(ContextNode.context_id == test_data["context"].id)
    context_nodes = db_session.exec(query).all()
    assert len(context_nodes) == 0

def test_delete_context_not_found(db_session: Session):
    """测试删除不存在的上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 删除上下文
    success = context_service.delete_context("invalid-context-id")
    
    # 验证结果
    assert success is False

def test_add_node_to_context(db_session: Session, test_data):
    """测试将节点添加到上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 添加节点到上下文
    context_node = context_service.add_node_to_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id,
        relation_type="member",
        node_metadata={"key": "value"}
    )
    
    # 验证结果
    assert context_node is not None
    assert context_node.context_id == test_data["context"].id
    assert context_node.node_id == test_data["child_node"].id
    assert context_node.relation_type == "member"
    assert context_node.node_metadata == {"key": "value"}
    
    # 验证数据库中的记录
    query = select(ContextNode).where(
        ContextNode.context_id == test_data["context"].id,
        ContextNode.node_id == test_data["child_node"].id
    )
    context_nodes = db_session.exec(query).all()
    assert len(context_nodes) == 1
    assert context_nodes[0].context_id == test_data["context"].id
    assert context_nodes[0].node_id == test_data["child_node"].id
    assert context_nodes[0].relation_type == "member"
    assert context_nodes[0].node_metadata == {"key": "value"}

def test_add_node_to_context_invalid_context(db_session: Session, test_data):
    """测试将节点添加到不存在的上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试添加节点到上下文
    with pytest.raises(ValueError) as excinfo:
        context_service.add_node_to_context(
            context_id="invalid-context-id",
            node_id=test_data["child_node"].id,
            relation_type="member"
        )
    
    # 验证错误消息
    assert "Context with id invalid-context-id not found" in str(excinfo.value)

def test_add_node_to_context_invalid_node(db_session: Session, test_data):
    """测试将不存在的节点添加到上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试添加节点到上下文
    with pytest.raises(ValueError) as excinfo:
        context_service.add_node_to_context(
            context_id=test_data["context"].id,
            node_id="invalid-node-id",
            relation_type="member"
        )
    
    # 验证错误消息
    assert "Node with id invalid-node-id not found" in str(excinfo.value)

def test_add_existing_node_to_context(db_session: Session, test_data):
    """测试将已存在的节点添加到上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 添加节点到上下文
    context_node1 = context_service.add_node_to_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id,
        relation_type="member"
    )
    
    # 再次添加同一节点
    context_node2 = context_service.add_node_to_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id,
        relation_type="updated"
    )
    
    # 验证结果
    assert context_node2 is not None
    assert context_node2.context_id == test_data["context"].id
    assert context_node2.node_id == test_data["child_node"].id
    assert context_node2.relation_type == "updated"
    
    # 验证数据库中的记录
    query = select(ContextNode).where(
        ContextNode.context_id == test_data["context"].id,
        ContextNode.node_id == test_data["child_node"].id
    )
    context_nodes = db_session.exec(query).all()
    assert len(context_nodes) == 1
    assert context_nodes[0].relation_type == "updated"

def test_remove_node_from_context(db_session: Session, test_data):
    """测试从上下文中移除节点"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 添加节点到上下文
    context_node = context_service.add_node_to_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id,
        relation_type="member"
    )
    
    # 从上下文中移除节点
    success = context_service.remove_node_from_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id
    )
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    query = select(ContextNode).where(
        ContextNode.context_id == test_data["context"].id,
        ContextNode.node_id == test_data["child_node"].id
    )
    context_nodes = db_session.exec(query).all()
    assert len(context_nodes) == 0

def test_remove_root_node_from_context(db_session: Session, test_data):
    """测试从上下文中移除根节点"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 尝试从上下文中移除根节点
    with pytest.raises(ValueError) as excinfo:
        context_service.remove_node_from_context(
            context_id=test_data["context"].id,
            node_id=test_data["root_node"].id
        )
    
    # 验证错误消息
    assert "Cannot remove root node from context" in str(excinfo.value)

def test_remove_node_from_context_not_found(db_session: Session, test_data):
    """测试从上下文中移除不存在的节点"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 从上下文中移除节点
    success = context_service.remove_node_from_context(
        context_id=test_data["context"].id,
        node_id="invalid-node-id"
    )
    
    # 验证结果
    assert success is False

def test_get_context_nodes(db_session: Session, test_data):
    """测试获取上下文中的所有节点"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 添加节点到上下文
    context_service.add_node_to_context(
        context_id=test_data["context"].id,
        node_id=test_data["child_node"].id,
        relation_type="member"
    )
    
    # 获取上下文中的节点
    nodes = context_service.get_context_nodes(test_data["context"].id)
    
    # 验证结果
    assert len(nodes) == 2
    assert nodes[0]["id"] == test_data["root_node"].id
    assert nodes[0]["relation_type"] == "root"
    assert nodes[1]["id"] == test_data["child_node"].id
    assert nodes[1]["relation_type"] == "member"

def test_get_session_contexts(db_session: Session, test_data):
    """测试获取会话的所有上下文"""
    # 创建ContextService
    context_service = ContextService(db_session)
    
    # 创建另一个上下文
    context = context_service.create_context(
        session_id=test_data["session"].id,
        context_root_node_id=test_data["root_node"].id,
        mode="deepdive",
        source="test"
    )
    
    # 获取会话的上下文
    contexts = context_service.get_session_contexts(test_data["session"].id)
    
    # 验证结果
    assert len(contexts) == 2
    assert contexts[0].id == test_data["context"].id
    assert contexts[0].mode == "chat"
    assert contexts[1].id == context.id
    assert contexts[1].mode == "deepdive"
