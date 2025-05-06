# backend/app/testAPI/test_qa_pair_service.py
import pytest
from sqlmodel import Session, select
from unittest.mock import patch, MagicMock

from app.services.qa_pair_service import QAPairService
from app.models.qapair import QAPair
from app.models.message import Message
from app.models.node import Node
from app.models.session import Session as SessionModel

def test_create_qa_pair(db_session: Session, test_data):
    """测试创建QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 创建QA对
    result = qa_pair_service.create_qa_pair(
        node_id=test_data["root_node"].id,
        question="新的测试问题",
        answer="新的测试回答"
    )
    
    # 验证结果
    assert result is not None
    assert result["node_id"] == test_data["root_node"].id
    assert result["session_id"] == test_data["session"].id
    assert len(result["messages"]) == 2
    assert result["messages"][0]["role"] == "user"
    assert result["messages"][0]["content"] == "新的测试问题"
    assert result["messages"][1]["role"] == "assistant"
    assert result["messages"][1]["content"] == "新的测试回答"
    
    # 验证数据库中的记录
    qa_pair_id = result["id"]
    db_qa_pair = db_session.get(QAPair, qa_pair_id)
    assert db_qa_pair is not None
    assert db_qa_pair.node_id == test_data["root_node"].id
    assert db_qa_pair.session_id == test_data["session"].id
    
    # 验证消息
    query = select(Message).where(Message.qa_pair_id == qa_pair_id)
    messages = db_session.exec(query).all()
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[0].content == "新的测试问题"
    assert messages[1].role == "assistant"
    assert messages[1].content == "新的测试回答"

def test_create_qa_pair_without_answer(db_session: Session, test_data):
    """测试创建没有回答的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 创建QA对
    result = qa_pair_service.create_qa_pair(
        node_id=test_data["root_node"].id,
        question="只有问题的测试"
    )
    
    # 验证结果
    assert result is not None
    assert result["node_id"] == test_data["root_node"].id
    assert len(result["messages"]) == 1
    assert result["messages"][0]["role"] == "user"
    assert result["messages"][0]["content"] == "只有问题的测试"
    
    # 验证数据库中的记录
    qa_pair_id = result["id"]
    query = select(Message).where(Message.qa_pair_id == qa_pair_id)
    messages = db_session.exec(query).all()
    assert len(messages) == 1
    assert messages[0].role == "user"
    assert messages[0].content == "只有问题的测试"

def test_create_qa_pair_invalid_node(db_session: Session):
    """测试创建QA对时使用无效的节点ID"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 尝试创建QA对
    with pytest.raises(ValueError) as excinfo:
        qa_pair_service.create_qa_pair(
            node_id="invalid-node-id",
            question="测试问题"
        )
    
    # 验证错误消息
    assert "Node with id invalid-node-id not found" in str(excinfo.value)

def test_get_qa_pair(db_session: Session, test_data):
    """测试获取QA对详情"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取QA对
    qa_pair = qa_pair_service.get_qa_pair(test_data["qa_pair"].id)
    
    # 验证结果
    assert qa_pair is not None
    assert qa_pair.id == test_data["qa_pair"].id
    assert qa_pair.node_id == test_data["root_node"].id
    assert qa_pair.session_id == test_data["session"].id

def test_get_qa_pair_not_found(db_session: Session):
    """测试获取不存在的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取QA对
    qa_pair = qa_pair_service.get_qa_pair("invalid-qa-pair-id")
    
    # 验证结果
    assert qa_pair is None

def test_get_qa_pair_with_messages(db_session: Session, test_data):
    """测试获取QA对详情，包括消息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取QA对详情
    result = qa_pair_service.get_qa_pair_with_messages(test_data["qa_pair"].id)
    
    # 验证结果
    assert result is not None
    assert result["id"] == test_data["qa_pair"].id
    assert result["node_id"] == test_data["root_node"].id
    assert result["session_id"] == test_data["session"].id
    assert len(result["messages"]) == 2
    assert result["messages"][0]["role"] == "user"
    assert result["messages"][0]["content"] == "测试问题"
    assert result["messages"][1]["role"] == "assistant"
    assert result["messages"][1]["content"] == "测试回答"

def test_get_qa_pair_with_messages_not_found(db_session: Session):
    """测试获取不存在的QA对详情"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取QA对详情
    result = qa_pair_service.get_qa_pair_with_messages("invalid-qa-pair-id")
    
    # 验证结果
    assert result is None

def test_update_qa_pair(db_session: Session, test_data):
    """测试更新QA对信息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 更新QA对
    qa_pair = qa_pair_service.update_qa_pair(
        qa_pair_id=test_data["qa_pair"].id,
        status="completed",
        rating=5
    )
    
    # 验证结果
    assert qa_pair is not None
    assert qa_pair.id == test_data["qa_pair"].id
    assert qa_pair.status == "completed"
    assert qa_pair.rating == 5
    
    # 验证数据库中的记录
    db_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    assert db_qa_pair is not None
    assert db_qa_pair.status == "completed"
    assert db_qa_pair.rating == 5

def test_update_qa_pair_partial(db_session: Session, test_data):
    """测试部分更新QA对信息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 更新QA对
    qa_pair = qa_pair_service.update_qa_pair(
        qa_pair_id=test_data["qa_pair"].id,
        status="in_progress"
    )
    
    # 验证结果
    assert qa_pair is not None
    assert qa_pair.id == test_data["qa_pair"].id
    assert qa_pair.status == "in_progress"
    
    # 验证数据库中的记录
    db_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    assert db_qa_pair is not None
    assert db_qa_pair.status == "in_progress"

def test_update_qa_pair_not_found(db_session: Session):
    """测试更新不存在的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 更新QA对
    qa_pair = qa_pair_service.update_qa_pair(
        qa_pair_id="invalid-qa-pair-id",
        status="completed"
    )
    
    # 验证结果
    assert qa_pair is None

def test_delete_qa_pair(db_session: Session, test_data):
    """测试删除QA对及其消息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 删除QA对
    success = qa_pair_service.delete_qa_pair(test_data["qa_pair"].id)
    
    # 验证结果
    assert success is True
    
    # 验证数据库中的记录
    db_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    assert db_qa_pair is None
    
    # 验证消息也被删除
    query = select(Message).where(Message.qa_pair_id == test_data["qa_pair"].id)
    messages = db_session.exec(query).all()
    assert len(messages) == 0

def test_delete_qa_pair_not_found(db_session: Session):
    """测试删除不存在的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 删除QA对
    success = qa_pair_service.delete_qa_pair("invalid-qa-pair-id")
    
    # 验证结果
    assert success is False

def test_add_message(db_session: Session, test_data):
    """测试向QA对添加消息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取原始QA对
    original_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    original_updated_at = original_qa_pair.updated_at
    
    # 添加消息
    message = qa_pair_service.add_message(
        qa_pair_id=test_data["qa_pair"].id,
        role="user",
        content="新的用户消息",
        meta_info={"source": "test"}
    )
    
    # 验证结果
    assert message is not None
    assert message.qa_pair_id == test_data["qa_pair"].id
    assert message.role == "user"
    assert message.content == "新的用户消息"
    assert message.meta_info == {"source": "test"}
    
    # 验证数据库中的记录
    db_message = db_session.get(Message, message.id)
    assert db_message is not None
    assert db_message.qa_pair_id == test_data["qa_pair"].id
    assert db_message.role == "user"
    assert db_message.content == "新的用户消息"
    assert db_message.meta_info == {"source": "test"}
    
    # 验证QA对的更新时间被更新
    db_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    assert db_qa_pair.updated_at > original_updated_at

def test_add_message_invalid_qa_pair(db_session: Session):
    """测试向不存在的QA对添加消息"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 尝试添加消息
    with pytest.raises(ValueError) as excinfo:
        qa_pair_service.add_message(
            qa_pair_id="invalid-qa-pair-id",
            role="user",
            content="测试消息"
        )
    
    # 验证错误消息
    assert "QA pair with id invalid-qa-pair-id not found" in str(excinfo.value)

def test_get_node_qa_pairs(db_session: Session, test_data):
    """测试获取节点的所有QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取节点的QA对
    result = qa_pair_service.get_node_qa_pairs(test_data["root_node"].id)
    
    # 验证结果
    assert len(result) == 1
    assert result[0]["id"] == test_data["qa_pair"].id
    assert len(result[0]["messages"]) == 2
    assert result[0]["messages"][0]["role"] == "user"
    assert result[0]["messages"][0]["content"] == "测试问题"
    assert result[0]["messages"][1]["role"] == "assistant"
    assert result[0]["messages"][1]["content"] == "测试回答"

def test_get_node_qa_pairs_empty(db_session: Session, test_data):
    """测试获取没有QA对的节点的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取节点的QA对
    result = qa_pair_service.get_node_qa_pairs(test_data["child_node"].id)
    
    # 验证结果
    assert len(result) == 0

def test_increment_view_count(db_session: Session, test_data):
    """测试增加QA对的查看次数"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 获取初始查看次数
    initial_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    initial_view_count = initial_qa_pair.view_count
    
    # 增加查看次数
    qa_pair = qa_pair_service.increment_view_count(test_data["qa_pair"].id)
    
    # 验证结果
    assert qa_pair is not None
    assert qa_pair.id == test_data["qa_pair"].id
    assert qa_pair.view_count == initial_view_count + 1
    
    # 验证数据库中的记录
    db_qa_pair = db_session.get(QAPair, test_data["qa_pair"].id)
    assert db_qa_pair is not None
    assert db_qa_pair.view_count == initial_view_count + 1

def test_increment_view_count_not_found(db_session: Session):
    """测试增加不存在的QA对的查看次数"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 增加查看次数
    qa_pair = qa_pair_service.increment_view_count("invalid-qa-pair-id")
    
    # 验证结果
    assert qa_pair is None

@patch('app.services.qa_pair_service.get_llm_service')
def test_ask_question(mock_get_llm_service, db_session: Session, test_data):
    """测试提问并获取回答"""
    # 模拟LLM服务
    mock_llm = MagicMock()
    mock_llm.call_llm.return_value = "模拟的LLM回答"
    mock_get_llm_service.return_value = mock_llm
    
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 提问
    result = qa_pair_service.ask_question(
        node_id=test_data["root_node"].id,
        question="新的测试问题"
    )
    
    # 验证结果
    assert result is not None
    assert result["node_id"] == test_data["root_node"].id
    assert result["session_id"] == test_data["session"].id
    assert len(result["messages"]) == 2
    assert result["messages"][0]["role"] == "user"
    assert result["messages"][0]["content"] == "新的测试问题"
    assert result["messages"][1]["role"] == "assistant"
    assert result["messages"][1]["content"] == "模拟的LLM回答"
    
    # 验证LLM服务被调用
    mock_llm.call_llm.assert_called_once()

def test_ask_question_invalid_node(db_session: Session):
    """测试使用无效的节点ID提问"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 尝试提问
    with pytest.raises(ValueError) as excinfo:
        qa_pair_service.ask_question(
            node_id="invalid-node-id",
            question="测试问题"
        )
    
    # 验证错误消息
    assert "Node with id invalid-node-id not found" in str(excinfo.value)

def test_search_qa_pairs(db_session: Session, test_data):
    """测试搜索QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 搜索QA对
    result = qa_pair_service.search_qa_pairs(
        query="测试",
        session_id=test_data["session"].id
    )
    
    # 验证结果
    assert result is not None
    assert result["total"] >= 1
    assert len(result["items"]) >= 1
    assert result["items"][0]["id"] == test_data["qa_pair"].id
    assert result["items"][0]["node_id"] == test_data["root_node"].id
    assert result["items"][0]["session_id"] == test_data["session"].id
    assert "question" in result["items"][0]
    assert "answer" in result["items"][0]

# 移除与 tags 和 is_favorite 相关的测试用例

def test_search_qa_pairs_no_results(db_session: Session, test_data):
    """测试搜索没有结果的QA对"""
    # 创建QAPairService
    qa_pair_service = QAPairService(db_session)
    
    # 搜索QA对
    result = qa_pair_service.search_qa_pairs(
        query="不存在的查询",
        session_id=test_data["session"].id
    )
    
    # 验证结果
    assert result is not None
    assert result["total"] == 0
    assert len(result["items"]) == 0

def test_search_qa_pairs_pagination(db_session: Session, test_data):
    """测试搜索QA对的分页功能"""
    # 创建多个QA对
    qa_pair_service = QAPairService(db_session)
    for i in range(5):
        qa_pair_service.create_qa_pair(
            node_id=test_data["root_node"].id,
            question=f"分页测试问题 {i}",
            answer=f"分页测试回答 {i}"
        )
    
    # 搜索QA对，第一页
    result1 = qa_pair_service.search_qa_pairs(
        query="分页",
        session_id=test_data["session"].id,
        limit=2,
        offset=0
    )
    
    # 搜索QA对，第二页
    result2 = qa_pair_service.search_qa_pairs(
        query="分页",
        session_id=test_data["session"].id,
        limit=2,
        offset=2
    )
    
    # 验证结果
    assert result1["total"] == result2["total"]
    assert len(result1["items"]) == 2
    assert len(result2["items"]) == 2
    assert result1["items"][0]["id"] != result2["items"][0]["id"]
    assert result1["items"][1]["id"] != result2["items"][0]["id"]
