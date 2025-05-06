# backend/app/testAPI/test_api_sessions.py
import pytest
from fastapi.testclient import TestClient

def test_create_session(client: TestClient):
    """测试创建会话API"""
    # 创建会话
    response = client.post("/api/v1/sessions",
        json={"name": "测试会话"}
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "测试会话"
    assert data["user_id"] == "local"
    assert data["root_node_id"] is not None

def test_get_sessions(client: TestClient, test_data):
    """测试获取会话列表API"""
    # 获取会话列表
    response = client.get("/api/v1/sessions")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == test_data["session"].id
    assert data["items"][0]["name"] == test_data["session"].name

def test_get_session(client: TestClient, test_data):
    """测试获取会话详情API"""
    # 获取会话详情
    response = client.get(f"/api/v1/sessions/{test_data['session'].id}")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["session"].id
    assert data["name"] == test_data["session"].name
    assert data["root_node_id"] == test_data["root_node"].id
    assert len(data["contexts"]) == 1
    assert data["contexts"][0]["id"] == test_data["context"].id

def test_update_session(client: TestClient, test_data):
    """测试更新会话API"""
    # 更新会话
    response = client.put(
        f"/api/v1/sessions/{test_data['session'].id}",
        json={"name": "更新后的会话名称"}
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "更新后的会话名称"
    
    # 验证更新后的会话
    response = client.get(f"/api/v1/sessions/{test_data['session'].id}")
    data = response.json()
    assert data["name"] == "更新后的会话名称"

def test_delete_session(client: TestClient, test_data):
    """测试删除会话API"""
    # 删除会话
    response = client.delete(f"/api/v1/sessions/{test_data['session'].id}")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "会话已删除"
    
    # 验证会话已删除
    response = client.get(f"/api/v1/sessions/{test_data['session'].id}")
    assert response.status_code == 404

def test_get_session_tree(client: TestClient, test_data):
    """测试获取会话树API"""
    # 获取会话树
    response = client.get(f"/api/v1/sessions/{test_data['session'].id}/tree")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) == 2  # 根节点和子节点
    assert len(data["edges"]) == 1  # 根节点到子节点的边
    
    # 验证节点
    root_node = None
    child_node = None
    for node in data["nodes"]:
        if node["id"] == test_data["root_node"].id:
            root_node = node
        elif node["id"] == test_data["child_node"].id:
            child_node = node
    
    assert root_node is not None
    assert child_node is not None
    assert child_node["parent_id"] == root_node["id"]
    
    # 验证边
    edge = data["edges"][0]
    assert edge["source"] == test_data["root_node"].id
    assert edge["target"] == test_data["child_node"].id

def test_get_main_context(client: TestClient, test_data):
    """测试获取会话的主聊天上下文API"""
    # 获取会话的主聊天上下文
    response = client.get(f"/api/v1/sessions/{test_data['session'].id}/main_context")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["context"].id
    assert data["mode"] == "chat"
    assert data["context_root_node_id"] == test_data["root_node"].id
