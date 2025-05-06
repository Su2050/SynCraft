# SynCraft 测试指南

本文档提供了如何测试 SynCraft 项目的详细说明，包括单元测试和集成测试。

## 1. 测试环境设置

### 1.1 安装测试依赖

首先，确保已安装所有测试依赖：

```bash
pip install pytest pytest-cov pytest-md pytest-json-report httpx python-dotenv
```

### 1.2 测试配置

测试配置在 `app/testAPI/conftest.py` 文件中定义，包括：

- 内存数据库设置
- 测试客户端创建
- 测试数据准备

## 2. 运行测试

### 2.1 使用测试脚本

项目提供了一个便捷的测试脚本 `run_tests_with_md_report.sh`，可以一键运行所有测试并生成多种格式的报告：

```bash
# 在项目根目录下运行
bash SynCraft/backend/run_tests_with_md_report.sh
```

该脚本会：
- 安装必要的测试依赖
- 加载环境变量
- 运行所有测试
- 生成HTML格式的覆盖率报告
- 生成Markdown格式的测试结果报告
- 生成失败测试报告
- 生成Markdown格式的覆盖率报告

### 2.2 手动运行测试

#### 2.2.1 运行所有测试

在项目根目录下运行以下命令：

```bash
pytest SynCraft/backend/app/testAPI
```

#### 2.2.2 运行特定测试文件

```bash
pytest SynCraft/backend/app/testAPI/test_session_service.py
```

#### 2.2.3 运行特定测试函数

```bash
pytest SynCraft/backend/app/testAPI/test_session_service.py::test_create_session
```

#### 2.2.4 生成测试覆盖率报告

```bash
pytest SynCraft/backend/app/testAPI --cov=SynCraft/backend/app
```

生成HTML格式的覆盖率报告：

```bash
pytest SynCraft/backend/app/testAPI --cov=SynCraft/backend/app --cov-report=html
```

## 3. 测试类型

### 3.1 单元测试

单元测试主要测试各个服务类的功能，位于 `app/testAPI/test_*_service.py` 文件中。

#### 3.1.1 服务层测试

服务层测试直接测试服务类的方法，例如 `test_session_service.py` 测试 `SessionService` 类：

```python
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
    # ...
```

#### 3.1.2 如何编写服务层测试

1. 使用 `db_session` 固件创建测试数据库会话
2. 创建服务类实例
3. 调用服务类方法
4. 验证结果

### 3.2 API测试

API测试主要测试API端点的功能，位于 `app/testAPI/test_api_*.py` 文件中。

#### 3.2.1 API测试示例

```python
def test_create_session(client: TestClient):
    """测试创建会话API"""
    # 创建会话
    response = client.post(
        "/sessions",
        json={"name": "测试会话"}
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "测试会话"
    assert data["user_id"] == "local"
    assert data["root_node_id"] is not None
```

#### 3.2.2 如何编写API测试

1. 使用 `client` 固件创建测试客户端
2. 发送HTTP请求
3. 验证响应状态码和内容

### 3.3 集成测试

集成测试测试多个组件的交互，例如测试创建会话后获取会话列表：

```python
def test_create_and_get_session(client: TestClient):
    """测试创建会话后获取会话列表"""
    # 创建会话
    response = client.post(
        "/sessions",
        json={"name": "测试会话"}
    )
    assert response.status_code == 200
    session_id = response.json()["id"]
    
    # 获取会话列表
    response = client.get("/sessions")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    
    # 验证创建的会话在列表中
    session_ids = [session["id"] for session in data["items"]]
    assert session_id in session_ids
```

## 4. 已实现的测试用例

### 4.1 会话服务测试 (SessionService)

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_session | 测试创建会话 | test_session_service.py |
| test_get_sessions | 测试获取会话列表 | test_session_service.py |
| test_get_session | 测试获取会话详情 | test_session_service.py |
| test_update_session | 测试更新会话 | test_session_service.py |
| test_delete_session | 测试删除会话 | test_session_service.py |
| test_get_main_context | 测试获取主聊天上下文 | test_session_service.py |

### 4.2 会话API测试

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_session | 测试创建会话API | test_api_sessions.py |
| test_get_sessions | 测试获取会话列表API | test_api_sessions.py |
| test_get_session | 测试获取会话详情API | test_api_sessions.py |
| test_update_session | 测试更新会话API | test_api_sessions.py |
| test_delete_session | 测试删除会话API | test_api_sessions.py |
| test_get_session_tree | 测试获取会话树API | test_api_sessions.py |
| test_get_main_context | 测试获取主聊天上下文API | test_api_sessions.py |

### 4.3 节点服务测试 (NodeService)

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_node | 测试创建节点 | test_node_service.py |
| test_create_node_without_parent | 测试创建无父节点的节点 | test_node_service.py |
| test_create_node_invalid_session | 测试创建节点时会话无效 | test_node_service.py |
| test_create_node_invalid_parent | 测试创建节点时父节点无效 | test_node_service.py |
| test_get_node | 测试获取节点详情 | test_node_service.py |
| test_get_node_not_found | 测试获取不存在的节点 | test_node_service.py |
| test_get_node_with_qa | 测试获取节点及其问答对 | test_node_service.py |
| test_update_node | 测试更新节点 | test_node_service.py |
| test_update_node_not_found | 测试更新不存在的节点 | test_node_service.py |
| test_delete_node | 测试删除节点 | test_node_service.py |
| test_delete_node_with_children | 测试删除有子节点的节点 | test_node_service.py |
| test_delete_node_not_found | 测试删除不存在的节点 | test_node_service.py |
| test_get_node_path | 测试获取节点路径 | test_node_service.py |
| test_get_node_children | 测试获取节点子节点 | test_node_service.py |
| test_get_node_descendants | 测试获取节点后代节点 | test_node_service.py |

### 4.4 上下文服务测试 (ContextService)

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_context | 测试创建上下文 | test_context_service.py |
| test_create_context_invalid_session | 测试创建上下文时会话无效 | test_context_service.py |
| test_create_context_invalid_root_node | 测试创建上下文时根节点无效 | test_context_service.py |
| test_get_context | 测试获取上下文详情 | test_context_service.py |
| test_get_context_not_found | 测试获取不存在的上下文 | test_context_service.py |
| test_get_context_by_context_id | 测试通过context_id获取上下文 | test_context_service.py |
| test_get_context_with_nodes | 测试获取上下文及其节点 | test_context_service.py |
| test_update_context | 测试更新上下文 | test_context_service.py |
| test_update_context_not_found | 测试更新不存在的上下文 | test_context_service.py |
| test_update_context_invalid_node | 测试更新上下文时节点无效 | test_context_service.py |
| test_delete_context | 测试删除上下文 | test_context_service.py |
| test_delete_context_not_found | 测试删除不存在的上下文 | test_context_service.py |
| test_add_node_to_context | 测试添加节点到上下文 | test_context_service.py |
| test_add_node_to_context_invalid_context | 测试添加节点到无效上下文 | test_context_service.py |
| test_add_node_to_context_invalid_node | 测试添加无效节点到上下文 | test_context_service.py |
| test_add_existing_node_to_context | 测试添加已存在的节点到上下文 | test_context_service.py |
| test_remove_node_from_context | 测试从上下文中移除节点 | test_context_service.py |
| test_remove_root_node_from_context | 测试从上下文中移除根节点 | test_context_service.py |
| test_remove_node_from_context_not_found | 测试从上下文中移除不存在的节点 | test_context_service.py |
| test_get_context_nodes | 测试获取上下文节点 | test_context_service.py |
| test_get_session_contexts | 测试获取会话上下文 | test_context_service.py |

### 4.5 问答对服务测试 (QAPairService)

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_qa_pair | 测试创建问答对 | test_qa_pair_service.py |
| test_create_qa_pair_without_answer | 测试创建无回答的问答对 | test_qa_pair_service.py |
| test_create_qa_pair_invalid_node | 测试创建问答对时节点无效 | test_qa_pair_service.py |
| test_get_qa_pair | 测试获取问答对详情 | test_qa_pair_service.py |
| test_get_qa_pair_not_found | 测试获取不存在的问答对 | test_qa_pair_service.py |
| test_get_qa_pair_with_messages | 测试获取问答对及其消息 | test_qa_pair_service.py |
| test_get_qa_pair_with_messages_not_found | 测试获取不存在的问答对及其消息 | test_qa_pair_service.py |
| test_update_qa_pair | 测试更新问答对 | test_qa_pair_service.py |
| test_update_qa_pair_partial | 测试部分更新问答对 | test_qa_pair_service.py |
| test_update_qa_pair_not_found | 测试更新不存在的问答对 | test_qa_pair_service.py |
| test_delete_qa_pair | 测试删除问答对 | test_qa_pair_service.py |
| test_delete_qa_pair_not_found | 测试删除不存在的问答对 | test_qa_pair_service.py |
| test_add_message | 测试添加消息 | test_qa_pair_service.py |
| test_add_message_invalid_qa_pair | 测试添加消息到无效问答对 | test_qa_pair_service.py |
| test_get_node_qa_pairs | 测试获取节点问答对 | test_qa_pair_service.py |
| test_get_node_qa_pairs_empty | 测试获取空节点问答对 | test_qa_pair_service.py |
| test_increment_view_count | 测试增加查看次数 | test_qa_pair_service.py |
| test_increment_view_count_not_found | 测试增加不存在问答对的查看次数 | test_qa_pair_service.py |
| test_ask_question | 测试提问 | test_qa_pair_service.py |
| test_ask_question_invalid_node | 测试向无效节点提问 | test_qa_pair_service.py |
| test_search_qa_pairs | 测试搜索问答对 | test_qa_pair_service.py |
| test_search_qa_pairs_no_results | 测试搜索无结果的问答对 | test_qa_pair_service.py |
| test_search_qa_pairs_pagination | 测试搜索问答对分页 | test_qa_pair_service.py |

### 4.6 问答对API测试

| 测试用例 | 描述 | 文件 |
|---------|------|------|
| test_create_qa_pair | 测试创建问答对API | test_api_qa_pairs.py |
| test_create_qa_pair_without_answer | 测试创建无回答的问答对API | test_api_qa_pairs.py |
| test_create_qa_pair_invalid_node | 测试创建问答对时节点无效API | test_api_qa_pairs.py |
| test_get_qa_pair | 测试获取问答对详情API | test_api_qa_pairs.py |
| test_get_qa_pair_not_found | 测试获取不存在的问答对API | test_api_qa_pairs.py |
| test_update_qa_pair | 测试更新问答对API | test_api_qa_pairs.py |
| test_update_qa_pair_partial | 测试部分更新问答对API | test_api_qa_pairs.py |
| test_update_qa_pair_not_found | 测试更新不存在的问答对API | test_api_qa_pairs.py |
| test_delete_qa_pair | 测试删除问答对API | test_api_qa_pairs.py |
| test_delete_qa_pair_not_found | 测试删除不存在的问答对API | test_api_qa_pairs.py |
| test_add_message | 测试添加消息API | test_api_qa_pairs.py |
| test_add_message_invalid_qa_pair | 测试添加消息到无效问答对API | test_api_qa_pairs.py |
| test_get_node_qa_pairs | 测试获取节点问答对API | test_api_qa_pairs.py |
| test_get_node_qa_pairs_empty | 测试获取空节点问答对API | test_api_qa_pairs.py |
| test_increment_view_count | 测试增加查看次数API | test_api_qa_pairs.py |
| test_increment_view_count_not_found | 测试增加不存在问答对的查看次数API | test_api_qa_pairs.py |
| test_ask_question | 测试提问API | test_api_qa_pairs.py |
| test_ask_question_invalid_node | 测试向无效节点提问API | test_api_qa_pairs.py |
| test_search_qa_pairs | 测试搜索问答对API | test_api_qa_pairs.py |
| test_search_qa_pairs_no_results | 测试搜索无结果的问答对API | test_api_qa_pairs.py |
| test_search_qa_pairs_pagination | 测试搜索问答对分页API | test_api_qa_pairs.py |

## 5. 测试覆盖率

当前项目的测试覆盖率为80%，这是一个相对较好的覆盖率水平。以下是各模块的覆盖率情况：

### 5.1 高覆盖率模块 (>90%)

- session_service.py: 92%
- node_service.py: 97%
- context_service.py: 94%
- 所有测试文件: 100%

### 5.2 中等覆盖率模块 (70%-90%)

- qa_pair_service.py: 82%
- sessions.py: 67%
- qa_pairs.py: 85%
- cache_manager.py: 73%
- container.py: 86%
- main.py: 86%

### 5.3 低覆盖率模块 (<50%)

- nodes.py: 36%
- contexts.py: 45%
- context_nodes.py: 47%
- search.py: 46%
- real_llm_service.py: 15%

低覆盖率模块通常是因为：
1. 复杂的错误处理路径难以测试
2. 依赖外部服务的代码（如real_llm_service.py依赖实际的LLM服务）
3. 某些API端点的复杂逻辑或边缘情况未被测试

## 6. 测试数据

### 6.1 测试数据准备

测试数据在 `app/testAPI/conftest.py` 文件中的 `test_data` 固件中准备：

```python
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
```

### 6.2 使用测试数据

在测试函数中使用 `test_data` 固件：

```python
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
```

## 7. 模拟和打桩

### 7.1 模拟数据库

测试使用内存数据库（SQLite）代替实际数据库，提高测试速度和隔离性。

### 7.2 模拟大模型调用

在测试环境中，使用 `TESTING=true` 环境变量启用模拟LLM服务，避免实际调用大模型API：

```python
# 在run_tests_with_md_report.sh中设置
export TESTING=true
```

这会使用 `mock_llm_service.py` 代替 `real_llm_service.py`，返回预定义的回答而不是实际调用大模型。

## 8. 前端开发者指南

如果你是前端开发者，以下信息将帮助你了解后端API的测试状态：

### 8.1 已完全测试的API

以下API已经有全面的测试覆盖，可以放心使用：

- 会话管理API (`/sessions`)
- 问答对管理API (`/qa_pairs`)
- 会话服务和问答对服务的所有功能

### 8.2 部分测试的API

以下API有部分测试覆盖，使用时需要注意可能存在的边缘情况：

- 节点管理API (`/nodes`)
- 上下文管理API (`/contexts`)
- 上下文节点关系API (`/contexts/{context_id}/nodes`)
- 搜索API (`/search`)

### 8.3 如何验证API行为

1. 查看测试文件了解API的预期行为
2. 参考 `SynCraft API规范文档.md` 了解API的详细规范
3. 运行测试并查看测试报告，了解API的测试覆盖情况

### 8.4 报告API问题

如果你在使用API时发现问题，请提供以下信息：

1. API端点和HTTP方法
2. 请求参数和请求体
3. 实际响应和预期响应
4. 错误消息和堆栈跟踪（如果有）

## 9. 测试命令

以下是一些常用的测试命令：

```bash
# 运行所有测试
pytest SynCraft/backend/app/testAPI

# 运行特定测试文件
pytest SynCraft/backend/app/testAPI/test_session_service.py

# 运行特定测试函数
pytest SynCraft/backend/app/testAPI/test_session_service.py::test_create_session

# 生成测试覆盖率报告
pytest SynCraft/backend/app/testAPI --cov=SynCraft/backend/app

# 生成HTML格式的覆盖率报告
pytest SynCraft/backend/app/testAPI --cov=SynCraft/backend/app --cov-report=html

# 详细输出
pytest SynCraft/backend/app/testAPI -v

# 显示print输出
pytest SynCraft/backend/app/testAPI -v -s

# 并行运行测试
pytest SynCraft/backend/app/testAPI -xvs -n auto

# 一键运行测试并生成报告
bash SynCraft/backend/run_tests_with_md_report.sh
```

## 10. 持续集成

### 10.1 GitHub Actions

在 `.github/workflows/test.yml` 文件中配置 GitHub Actions：

```yaml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r backend/requirements.txt
        pip install pytest pytest-cov
    - name: Test
      run: |
        cd backend
        pytest app/testAPI --cov=app
```

### 10.2 GitLab CI

在 `.gitlab-ci.yml` 文件中配置 GitLab CI：

```yaml
stages:
  - test

test:
  stage: test
  image: python:3.9
  script:
    - pip install -r backend/requirements.txt
    - pip install pytest pytest-cov
    - cd backend
    - pytest app/testAPI --cov=app
```

## 11. 测试最佳实践

1. **测试隔离**：每个测试应该独立运行，不依赖其他测试的状态
2. **测试覆盖率**：尽量覆盖所有代码路径，包括正常路径和错误路径
3. **测试命名**：使用描述性的测试名称，清晰表达测试的目的
4. **测试数据**：使用固件创建测试数据，避免在测试函数中重复创建
5. **测试断言**：使用具体的断言，而不是笼统的 `assert True`
6. **测试文档**：为测试函数添加文档字符串，说明测试的目的和步骤
7. **测试清理**：使用 `teardown` 函数清理测试数据和状态
