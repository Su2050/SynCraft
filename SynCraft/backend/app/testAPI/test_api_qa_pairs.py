# backend/app/testAPI/test_api_qa_pairs.py
import pytest
from fastapi.testclient import TestClient
import os

# 设置环境变量，使用模拟LLM服务而不是真实服务
os.environ["TESTING"] = "true"
# 确保环境变量设置正确，避免使用真实LLM服务


from pydantic import BaseModel
from typing import List, Optional

class QAPairCreate(BaseModel):
    node_id: str
    question: str
    answer: Optional[str] = None
def test_create_qa_pair(client: TestClient, test_data):
    """测试创建QA对API"""
    # 创建QA对
    response = client.post("/api/v1/qa_pairs",
        json={
            "node_id": test_data["root_node"].id,
            "session_id": test_data["session"].id,
            "question": "API测试问题",
            "answer": "API测试回答",
            "tags": ["测试", "API"],
            "is_favorite": True
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["node_id"] == test_data["root_node"].id
    assert data["session_id"] == test_data["session"].id
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "API测试问题"
    assert data["messages"][1]["role"] == "assistant"
    assert data["messages"][1]["content"] == "API测试回答"

def test_create_qa_pair_without_answer(client: TestClient, test_data):
    """测试创建没有回答的QA对API"""
    # 创建QA对
    response = client.post("/api/v1/qa_pairs",
        json={
            "node_id": test_data["root_node"].id,
            "session_id": test_data["session"].id,
            "question": "只有问题的API测试"
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["node_id"] == test_data["root_node"].id
    assert len(data["messages"]) == 1
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "只有问题的API测试"

def test_create_qa_pair_invalid_node(client: TestClient):
    """测试创建QA对时使用无效的节点ID API"""
    # 创建QA对
    response = client.post("/api/v1/qa_pairs",
        json={
            "node_id": "invalid-node-id",
            "session_id": "invalid-session-id",
            "question": "API测试问题",
            "answer": "API测试回答"
        }
    )
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_get_qa_pair(client: TestClient, test_data):
    """测试获取QA对详情API"""
    # 获取QA对详情
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["qa_pair"].id
    assert data["node_id"] == test_data["root_node"].id
    assert data["session_id"] == test_data["session"].id
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "测试问题"
    assert data["messages"][1]["role"] == "assistant"
    assert data["messages"][1]["content"] == "测试回答"

def test_get_qa_pair_not_found(client: TestClient):
    """测试获取不存在的QA对详情API"""
    # 获取QA对详情
    response = client.get("/api/v1/qa_pairs/invalid-qa-pair-id")
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_update_qa_pair(client: TestClient, test_data):
    """测试更新QA对API"""
    # 更新QA对
    response = client.put(
        f"/api/v1/qa_pairs/{test_data['qa_pair'].id}",
        json={
            "status": "completed",
            "rating": 5
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["qa_pair"].id
    assert data["status"] == "completed"
    assert data["rating"] == 5
    
    # 验证更新后的QA对
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    data = response.json()
    assert data["status"] == "completed"
    assert data["rating"] == 5

def test_update_qa_pair_partial(client: TestClient, test_data):
    """测试部分更新QA对API"""
    # 更新QA对
    response = client.put(
        f"/api/v1/qa_pairs/{test_data['qa_pair'].id}",
        json={
            "status": "in_progress"
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["qa_pair"].id
    assert data["status"] == "in_progress"
    
    # 验证更新后的QA对
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    data = response.json()
    assert data["status"] == "in_progress"

def test_update_qa_pair_not_found(client: TestClient):
    """测试更新不存在的QA对API"""
    # 更新QA对
    response = client.put("/api/v1/qa_pairs/invalid-qa-pair-id",
        json={
            "is_favorite": True
        }
    )
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_delete_qa_pair(client: TestClient, test_data):
    """测试删除QA对API"""
    # 创建一个新的QA对用于删除测试
    response = client.post("/api/v1/qa_pairs",
        json={
            "node_id": test_data["root_node"].id,
            "session_id": test_data["session"].id,
            "question": "要删除的QA对",
            "answer": "要删除的回答"
        }
    )
    data = response.json()
    qa_pair_id = data["id"]
    
    # 删除QA对
    response = client.delete(f"/api/v1/qa_pairs/{qa_pair_id}")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "deleted" in data["message"]
    
    # 验证QA对已删除
    response = client.get(f"/api/v1/qa_pairs/{qa_pair_id}")
    assert response.status_code == 404

def test_delete_qa_pair_not_found(client: TestClient):
    """测试删除不存在的QA对API"""
    # 删除QA对
    response = client.delete("/api/v1/qa_pairs/invalid-qa-pair-id")
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_add_message(client: TestClient, test_data):
    """测试向QA对添加消息API"""
    # 添加消息
    response = client.post(
        f"/api/v1/qa_pairs/{test_data['qa_pair'].id}/messages",
        json={
            "role": "user",
            "content": "新的API测试消息",
            "meta_info": {"source": "API测试"}
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["qa_pair_id"] == test_data["qa_pair"].id
    assert data["role"] == "user"
    assert data["content"] == "新的API测试消息"
    assert data["meta_info"] == {"source": "API测试"}
    
    # 验证消息已添加
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    data = response.json()
    messages = data["messages"]
    assert len(messages) == 3
    assert messages[2]["role"] == "user"
    assert messages[2]["content"] == "新的API测试消息"
    assert messages[2]["meta_info"] == {"source": "API测试"}

def test_add_message_invalid_qa_pair(client: TestClient):
    """测试向不存在的QA对添加消息API"""
    # 添加消息
    response = client.post("/api/v1/qa_pairs/invalid-qa-pair-id/messages",
        json={
            "role": "user",
            "content": "新的API测试消息"
        }
    )
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_get_node_qa_pairs(client: TestClient, test_data):
    """测试获取节点的所有QA对API"""
    # 获取节点的QA对
    response = client.get(f"/api/v1/qa_pairs/nodes/{test_data['root_node'].id}/qa_pairs")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert data["items"][0]["id"] == test_data["qa_pair"].id
    assert data["items"][0]["node_id"] == test_data["root_node"].id

def test_get_node_qa_pairs_empty(client: TestClient, test_data):
    """测试获取没有QA对的节点的QA对API"""
    # 获取节点的QA对
    response = client.get(f"/api/v1/qa_pairs/nodes/{test_data['child_node'].id}/qa_pairs")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0

def test_increment_view_count(client: TestClient, test_data):
    """测试增加QA对的查看次数API"""
    # 获取初始查看次数
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    initial_view_count = response.json()["view_count"]
    
    # 增加查看次数
    response = client.post(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}/view")
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_data["qa_pair"].id
    assert data["view_count"] == initial_view_count + 1
    
    # 验证查看次数已增加
    response = client.get(f"/api/v1/qa_pairs/{test_data['qa_pair'].id}")
    data = response.json()
    assert data["view_count"] == initial_view_count + 1

def test_increment_view_count_not_found(client: TestClient):
    """测试增加不存在的QA对的查看次数API"""
    # 增加查看次数
    response = client.post("/api/v1/qa_pairs/invalid-qa-pair-id/view")
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_ask_question(client: TestClient, test_data):
    """测试提问API"""
    # 提问
    response = client.post(
        f"/api/v1/nodes/{test_data['root_node'].id}/ask",
        json={
            "question": "API测试提问"
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["node_id"] == test_data["root_node"].id
    assert data["session_id"] == test_data["session"].id
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "API测试提问"
    assert data["messages"][1]["role"] == "assistant"
    assert data["messages"][1]["content"] is not None

def test_ask_question_invalid_node(client: TestClient):
    """测试使用无效的节点ID提问API"""
    # 提问
    response = client.post("/api/v1/nodes/invalid-node-id/ask",
        json={
            "question": "API测试提问"
        }
    )
    
    # 验证响应
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Not Found" in data["detail"] or "not found" in data["detail"]

def test_search_qa_pairs(client: TestClient, test_data):
    """测试搜索QA对API"""
    # 搜索QA对
    response = client.get("/api/v1/qa_pairs/search",
        params={
            "query": "测试",
            "session_id": test_data["session"].id
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert data["items"][0]["id"] == test_data["qa_pair"].id
    assert data["items"][0]["node_id"] == test_data["root_node"].id
    assert data["items"][0]["session_id"] == test_data["session"].id

# 移除与 tags 和 is_favorite 相关的测试用例

def test_search_qa_pairs_no_results(client: TestClient, test_data):
    """测试搜索没有结果的QA对API"""
    # 搜索QA对
    response = client.get("/api/v1/qa_pairs/search",
        params={
            "query": "不存在的查询",
            "session_id": test_data["session"].id
        }
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0

def test_search_qa_pairs_pagination(client: TestClient, test_data):
    """测试搜索QA对的分页功能API"""
    # 创建多个QA对
    for i in range(5):
        client.post("/api/v1/qa_pairs",
            json={
                "node_id": test_data["root_node"].id,
                "session_id": test_data["session"].id,
                "question": f"分页测试问题 {i}",
                "answer": f"分页测试回答 {i}"
            }
        )
    
    # 搜索QA对，第一页
    response1 = client.get("/api/v1/qa_pairs/search",
        params={
            "query": "分页",
            "session_id": test_data["session"].id,
            "limit": "2",
            "offset": "0"
        }
    )
    
    # 搜索QA对，第二页
    response2 = client.get("/api/v1/qa_pairs/search",
        params={
            "query": "分页",
            "session_id": test_data["session"].id,
            "limit": "2",
            "offset": "2"
        }
    )
    
    # 验证响应
    assert response1.status_code == 200
    assert response2.status_code == 200
    data1 = response1.json()
    data2 = response2.json()
    assert data1["total"] == data2["total"]
    assert len(data1["items"]) == 2
    assert len(data2["items"]) == 2
    assert data1["items"][0]["id"] != data2["items"][0]["id"]
    assert data1["items"][1]["id"] != data2["items"][0]["id"]
