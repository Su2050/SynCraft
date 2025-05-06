from sqlalchemy import text
# backend/app/testAPI/test_node_service.py
import pytest
from sqlmodel import Session

from app.services.node_service import NodeService
from app.models.node import Node
from app.models.edge import Edge
from app.models.qapair import QAPair
from app.models.message import Message
from app.models.session import Session as SessionModel

def test_create_node(db_session: Session, test_data):
    """测试创建节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 创建节点
    node = node_service.create_node(
        session_id=test_data["session"].id,
        parent_id=test_data["root_node"].id,
        template_key="test"
    )
    
    # 验证结果
    assert node is not None
    assert node.session_id == test_data["session"].id
    assert node.parent_id == test_data["root_node"].id
    assert node.template_key == "test"
    
    # 验证数据库中的记录
    db_node = db_session.get(Node, node.id)
    assert db_node is not None
    assert db_node.session_id == test_data["session"].id
    assert db_node.parent_id == test_data["root_node"].id
    assert db_node.template_key == "test"
    
    # 验证边
    query = text(f"SELECT * FROM edge WHERE source = '{test_data['root_node'].id}' AND target = '{node.id}'")
    edges = db_session.exec(query).all()
    assert len(edges) == 1
    assert edges[0].source == test_data["root_node"].id
    assert edges[0].target == node.id
    assert edges[0].session_id == test_data["session"].id

def test_create_node_without_parent(db_session: Session, test_data):
    """测试创建没有父节点的节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 创建节点
    node = node_service.create_node(
        session_id=test_data["session"].id,
        template_key="root2"
    )
    
    # 验证结果
    assert node is not None
    assert node.session_id == test_data["session"].id
    assert node.parent_id is None
    assert node.template_key == "root2"
    
    # 验证数据库中的记录
    db_node = db_session.get(Node, node.id)
    assert db_node is not None
    assert db_node.session_id == test_data["session"].id
    assert db_node.parent_id is None
    assert db_node.template_key == "root2"
    
    # 验证没有创建边
    query = text(f"SELECT * FROM edge WHERE target = '{node.id}'")
    edges = db_session.exec(query).all()
    assert len(edges) == 0

def test_create_node_invalid_session(db_session: Session):
    """测试创建节点时使用无效的会话ID"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 尝试创建节点
    with pytest.raises(ValueError) as excinfo:
        node_service.create_node(
            session_id="invalid-session-id",
            template_key="test"
        )
    
    # 验证错误消息
    assert "Session with id invalid-session-id not found" in str(excinfo.value)

def test_create_node_invalid_parent(db_session: Session, test_data):
    """测试创建节点时使用无效的父节点ID"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 尝试创建节点
    with pytest.raises(ValueError) as excinfo:
        node_service.create_node(
            session_id=test_data["session"].id,
            parent_id="invalid-parent-id",
            template_key="test"
        )
    
    # 验证错误消息
    assert "Parent node with id invalid-parent-id not found" in str(excinfo.value)

def test_get_node(db_session: Session, test_data):
    """测试获取节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 获取节点
    node = node_service.get_node(test_data["root_node"].id)
    
    # 验证结果
    assert node is not None
    assert node.id == test_data["root_node"].id
    assert node.session_id == test_data["session"].id
    assert node.template_key == "root"

def test_get_node_not_found(db_session: Session):
    """测试获取不存在的节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 获取节点
    node = node_service.get_node("invalid-node-id")
    
    # 验证结果
    assert node is None

def test_get_node_with_qa(db_session: Session, test_data):
    """测试获取节点详情，包括关联的QA对"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 获取节点详情
    result = node_service.get_node_with_qa(test_data["root_node"].id)
    
    # 验证结果
    assert result is not None
    assert result["id"] == test_data["root_node"].id
    assert result["session_id"] == test_data["session"].id
    assert result["template_key"] == "root"
    assert len(result["qa_pairs"]) == 1
    assert result["qa_pairs"][0]["id"] == test_data["qa_pair"].id
    assert len(result["qa_pairs"][0]["messages"]) == 2
    assert result["qa_pairs"][0]["messages"][0]["role"] == "user"
    assert result["qa_pairs"][0]["messages"][0]["content"] == "测试问题"
    assert result["qa_pairs"][0]["messages"][1]["role"] == "assistant"
    assert result["qa_pairs"][0]["messages"][1]["content"] == "测试回答"
    assert len(result["children"]) == 1
    assert result["children"][0]["id"] == test_data["child_node"].id
    assert result["children"][0]["template_key"] == "child"

def test_update_node(db_session: Session, test_data):
    """测试更新节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 更新节点
    node = node_service.update_node(
        node_id=test_data["root_node"].id,
        summary_up_to_here="测试摘要",
        template_key="updated-root"
    )
    
    # 验证结果
    assert node is not None
    assert node.id == test_data["root_node"].id
    assert node.summary_up_to_here == "测试摘要"
    assert node.template_key == "updated-root"
    
    # 验证数据库中的记录
    db_node = db_session.get(Node, test_data["root_node"].id)
    assert db_node is not None
    assert db_node.summary_up_to_here == "测试摘要"
    assert db_node.template_key == "updated-root"

def test_update_node_not_found(db_session: Session):
    """测试更新不存在的节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 更新节点
    node = node_service.update_node(
        node_id="invalid-node-id",
        summary_up_to_here="测试摘要"
    )
    
    # 验证结果
    assert node is None

def test_delete_node(db_session: Session, test_data):
    """测试删除节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 删除节点
    success = node_service.delete_node(test_data["child_node"].id)
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    db_node = db_session.get(Node, test_data["child_node"].id)
    assert db_node is None
    
    # 验证边也被删除
    query = text(f"SELECT * FROM edge WHERE target = '{test_data['child_node'].id}'")
    edges = db_session.exec(query).all()
    assert len(edges) == 0

def test_delete_node_with_children(db_session: Session, test_data):
    """测试删除有子节点的节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 删除根节点
    success = node_service.delete_node(test_data["root_node"].id)
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    db_node = db_session.get(Node, test_data["root_node"].id)
    assert db_node is None
    
    # 验证子节点也被删除
    db_child = db_session.get(Node, test_data["child_node"].id)
    assert db_child is None
    
    # 验证边也被删除
    query = text(f"SELECT * FROM edge WHERE source = '{test_data['root_node'].id}'")
    edges = db_session.exec(query).all()
    assert len(edges) == 0

def test_delete_node_not_found(db_session: Session):
    """测试删除不存在的节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 删除节点
    success = node_service.delete_node("invalid-node-id")
    
    # 验证结果
    assert success is False

def test_get_node_path(db_session: Session, test_data):
    """测试获取从根节点到指定节点的路径"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 获取路径
    path = node_service.get_node_path(test_data["child_node"].id)
    
    # 验证结果
    assert len(path) == 2
    assert path[0].id == test_data["root_node"].id
    assert path[1].id == test_data["child_node"].id

def test_get_node_children(db_session: Session, test_data):
    """测试获取节点的直接子节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 获取子节点
    children = node_service.get_node_children(test_data["root_node"].id)
    
    # 验证结果
    assert len(children) == 1
    assert children[0].id == test_data["child_node"].id
    assert children[0].parent_id == test_data["root_node"].id
    assert children[0].session_id == test_data["session"].id
    assert children[0].template_key == "child"

def test_get_node_descendants(db_session: Session, test_data):
    """测试获取节点的所有后代节点"""
    # 创建NodeService
    node_service = NodeService(db_session)
    
    # 创建孙节点
    grandchild = Node(
        id="grandchild-node-id",
        parent_id=test_data["child_node"].id,
        session_id=test_data["session"].id,
        template_key="grandchild"
    )
    db_session.add(grandchild)
    db_session.commit()
    db_session.refresh(grandchild)
    
    # 创建边
    edge = Edge(
        source=test_data["child_node"].id,
        target=grandchild.id,
        session_id=test_data["session"].id
    )
    db_session.add(edge)
    db_session.commit()
    
    # 获取后代节点
    descendants = node_service.get_node_descendants(test_data["root_node"].id)
    
    # 验证结果
    assert len(descendants) == 2
    assert descendants[0].id == test_data["child_node"].id
    assert descendants[1].id == grandchild.id
