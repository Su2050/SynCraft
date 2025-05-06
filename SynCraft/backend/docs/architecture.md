# SynCraft 项目架构文档

## 1. 项目概述

SynCraft 是一个基于对话的知识管理系统，允许用户创建会话、提问问题、深入挖掘特定主题，并在多个节点之间建立关联。系统采用树状结构组织对话，支持上下文切换和深度探索。

## 2. 技术栈

### 后端
- **语言**: Python
- **Web框架**: FastAPI
- **数据库**: SQLite (通过SQLModel)
- **ORM**: SQLModel
- **依赖注入**: 自定义DI容器
- **缓存**: 内存缓存
- **LLM集成**: 支持多种大语言模型服务

### 前端
- **语言**: TypeScript
- **框架**: React
- **状态管理**: 自定义Store
- **样式**: TailwindCSS

## 3. 项目结构

```
backend/app/
├── __init__.py           # 初始化应用
├── main.py               # 应用入口
├── api/                  # API路由和控制器
│   ├── __init__.py
│   ├── sessions.py       # 会话相关API
│   ├── nodes.py          # 节点相关API
│   ├── qa_pairs.py       # 问答对相关API
│   ├── contexts.py       # 上下文相关API
│   ├── context_nodes.py  # 上下文节点关系相关API
│   ├── search.py         # 搜索相关API
│   └── llm.py            # LLM服务相关API
├── models/               # 数据模型定义
│   ├── __init__.py
│   ├── session.py        # 会话模型
│   ├── node.py           # 节点模型
│   ├── edge.py           # 边模型
│   ├── context.py        # 上下文模型
│   ├── context_node.py   # 上下文节点关系模型
│   ├── qapair.py         # 问答对模型
│   └── message.py        # 消息模型
├── services/             # 业务逻辑
│   ├── __init__.py
│   ├── session_service.py # 会话服务
│   ├── node_service.py    # 节点服务
│   ├── context_service.py # 上下文服务
│   ├── qa_pair_service.py # 问答对服务
│   └── llm/              # LLM服务
│       ├── __init__.py
│       ├── llm_interface.py  # LLM服务接口
│       ├── llm_factory.py    # LLM服务工厂
│       ├── mock_llm_service.py # 模拟LLM服务（用于测试）
│       └── real_llm_service.py # 真实LLM服务
├── database/             # 数据库相关
│   ├── __init__.py
│   └── database.py       # 数据库连接和初始化
├── utils/                # 工具函数和辅助类
│   ├── __init__.py
│   ├── ner.py            # 命名实体识别
│   └── prompt.py         # 提示词构建
├── di/                   # 依赖注入
│   ├── __init__.py
│   └── container.py      # 依赖注入容器
├── cache/                # 缓存
│   ├── __init__.py
│   └── cache_manager.py  # 缓存管理器
└── testAPI/              # 单元测试
    ├── __init__.py
    ├── conftest.py       # 测试配置
    ├── test_session_service.py # 会话服务测试
    ├── test_api_sessions.py    # 会话API测试
    ├── test_node_service.py    # 节点服务测试
    ├── test_api_qa_pairs.py    # 问答对API测试
    ├── test_qa_pair_service.py # 问答对服务测试
    ├── test_context_service.py # 上下文服务测试
    └── test_api_contexts.py    # 上下文API测试
```

## 4. 核心概念

### 4.1 会话 (Session)
会话是用户与系统交互的顶层容器，包含多个节点和上下文。每个会话有一个根节点，作为对话的起点。

### 4.2 节点 (Node)
节点是对话的基本单位，可以包含多个问答对。节点之间通过父子关系形成树状结构。

### 4.3 边 (Edge)
边表示节点之间的关系，通常是从父节点到子节点的有向边。

### 4.4 上下文 (Context)
上下文定义了当前对话的范围和焦点。每个会话有一个主聊天上下文，用户还可以创建深挖上下文，专注于特定主题。

### 4.5 上下文节点关系 (ContextNode)
上下文节点关系定义了上下文中包含的节点及其关系类型（如根节点、成员节点等）。

### 4.6 问答对 (QAPair)
问答对是用户提问和系统回答的组合，属于特定节点。

### 4.7 消息 (Message)
消息是问答对中的具体内容，包括用户消息和系统消息。

### 4.8 LLM服务 (LLM Service)
LLM服务提供与大语言模型的集成，用于生成回答、摘要和其他AI生成内容。

## 5. 数据流

1. 用户创建会话
2. 系统自动创建根节点和主聊天上下文
3. 用户在会话中提问
4. 系统通过LLM服务生成回答
5. 系统创建问答对和消息
6. 用户可以在现有节点上继续提问，或创建子节点深入探讨
7. 用户可以切换上下文，专注于特定主题

## 6. 架构特点

### 6.1 分层架构
- **API层**: 处理HTTP请求和响应
- **服务层**: 实现业务逻辑
- **模型层**: 定义数据结构和关系

### 6.2 依赖注入
使用自定义依赖注入容器管理服务实例，提高可测试性和可维护性。

### 6.3 缓存机制
使用内存缓存提高性能，减少数据库查询。

### 6.4 单元测试
使用pytest进行单元测试，确保代码质量和功能正确性。

### 6.5 LLM服务抽象
使用接口和工厂模式抽象LLM服务，支持多种大语言模型，并便于测试。

## 7. API文档

### 7.1 会话API

#### 创建会话
- **URL**: `/sessions`
- **方法**: POST
- **请求体**:
  ```json
  {
    "name": "会话名称",
    "user_id": "用户ID"
  }
  ```
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "会话名称",
    "user_id": "用户ID",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间"
  }
  ```

#### 获取会话列表
- **URL**: `/sessions`
- **方法**: GET
- **查询参数**:
  - `user_id`: 用户ID
  - `limit`: 每页数量
  - `offset`: 偏移量
  - `sort_by`: 排序字段
  - `sort_order`: 排序方向
- **响应**:
  ```json
  {
    "total": 总数,
    "items": [
      {
        "id": "会话ID",
        "name": "会话名称",
        "user_id": "用户ID",
        "root_node_id": "根节点ID",
        "created_at": "创建时间",
        "updated_at": "更新时间"
      }
    ]
  }
  ```

#### 获取会话详情
- **URL**: `/sessions/{session_id}`
- **方法**: GET
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "会话名称",
    "user_id": "用户ID",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "contexts": [
      {
        "id": "上下文ID",
        "context_id": "上下文ID字符串",
        "mode": "上下文模式",
        "context_root_node_id": "上下文根节点ID",
        "active_node_id": "活动节点ID"
      }
    ]
  }
  ```

#### 更新会话
- **URL**: `/sessions/{session_id}`
- **方法**: PUT
- **请求体**:
  ```json
  {
    "name": "新会话名称"
  }
  ```
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "新会话名称",
    "user_id": "用户ID",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间"
  }
  ```

#### 删除会话
- **URL**: `/sessions/{session_id}`
- **方法**: DELETE
- **响应**:
  ```json
  {
    "success": true,
    "message": "会话已删除"
  }
  ```

### 7.2 节点API

#### 创建节点
- **URL**: `/nodes`
- **方法**: POST
- **请求体**:
  ```json
  {
    "parent_id": "父节点ID",
    "session_id": "会话ID",
    "template_key": "模板键",
    "summary_up_to_here": "摘要",
    "context_id": "上下文ID"
  }
  ```
- **响应**:
  ```json
  {
    "id": "节点ID",
    "session_id": "会话ID",
    "template_key": "模板键",
    "summary_up_to_here": "摘要",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "parent_id": "父节点ID"
  }
  ```

#### 获取节点详情
- **URL**: `/nodes/{node_id}`
- **方法**: GET
- **查询参数**:
  - `include_children`: 是否包含子节点
  - `children_depth`: 子节点深度
  - `include_qa`: 是否包含问答对
- **响应**:
  ```json
  {
    "id": "节点ID",
    "session_id": "会话ID",
    "template_key": "模板键",
    "summary_up_to_here": "摘要",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "parent_id": "父节点ID",
    "qa_pairs": [
      {
        "id": "问答对ID",
        "question": "问题",
        "answer": "回答",
        "created_at": "创建时间",
        "tags": ["标签"],
        "is_favorite": false
      }
    ],
    "children": [
      {
        "id": "子节点ID",
        "template_key": "模板键",
        "created_at": "创建时间"
      }
    ],
    "contexts": [
      {
        "id": "上下文ID",
        "context_id": "上下文ID字符串",
        "mode": "上下文模式"
      }
    ]
  }
  ```

### 7.3 问答对API

#### 创建问答对
- **URL**: `/qa_pairs`
- **方法**: POST
- **请求体**:
  ```json
  {
    "node_id": "节点ID",
    "session_id": "会话ID",
    "question": "问题",
    "answer": "回答",
    "tags": ["标签"]
  }
  ```
- **响应**:
  ```json
  {
    "id": "问答对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "tags": ["标签"],
    "is_favorite": false,
    "question": "问题",
    "answer": "回答"
  }
  ```

#### 向节点提问
- **URL**: `/nodes/{node_id}/ask`
- **方法**: POST
- **查询参数**:
  - `question`: 问题
- **响应**:
  ```json
  {
    "id": "问答对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "tags": ["标签"],
    "is_favorite": false,
    "question": "问题",
    "answer": "回答"
  }
  ```

### 7.4 上下文API

#### 创建上下文
- **URL**: `/contexts`
- **方法**: POST
- **请求体**:
  ```json
  {
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID",
    "source": "来源"
  }
  ```
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文ID字符串",
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源"
  }
  ```

### 7.5 LLM API

#### 调用LLM获取回答
- **URL**: `/api/v1/ask`
- **方法**: POST
- **请求头**:
  - `X-API-Key`: API密钥
- **请求体**:
  ```json
  {
    "msg": "用户消息",
    "context": [
      {
        "role": "user",
        "content": "历史消息1"
      },
      {
        "role": "assistant",
        "content": "历史回答1"
      }
    ]
  }
  ```
- **响应**:
  ```json
  {
    "answer": "LLM生成的回答"
  }
  ```

## 8. 性能优化

### 8.1 缓存
- 使用内存缓存减少数据库查询
- 缓存会话列表、会话详情等频繁访问的数据
- 使用装饰器简化缓存应用

### 8.2 数据库优化
- 使用索引提高查询性能
- 使用批量操作减少数据库交互

### 8.3 API优化
- 使用分页减少数据传输量
- 使用条件查询减少不必要的数据获取

## 9. 安全性

### 9.1 输入验证
- 使用Pydantic模型验证请求数据
- 使用FastAPI的依赖项验证请求参数

### 9.2 错误处理
- 使用全局异常处理器处理异常
- 返回适当的HTTP状态码和错误消息

### 9.3 API密钥验证
- 使用API密钥验证LLM服务请求
- 在请求头中传递API密钥

## 10. 可扩展性

### 10.1 模块化设计
- 使用分层架构和模块化设计
- 使用依赖注入解耦组件

### 10.2 服务抽象
- 使用服务层抽象业务逻辑
- 使用接口定义服务契约

### 10.3 LLM服务抽象
- 使用接口抽象LLM服务
- 使用工厂模式创建LLM服务实例
- 支持多种LLM服务提供商

## 11. 测试策略

### 11.1 单元测试
- 使用pytest进行单元测试
- 测试服务层和API层

### 11.2 集成测试
- 使用TestClient进行API测试
- 使用内存数据库进行测试

### 11.3 LLM服务测试
- 使用模拟LLM服务进行测试
- 在测试环境中设置TESTING=true启用模拟服务

## 12. 部署

### 12.1 Docker
- 使用Docker容器化应用
- 使用docker-compose管理多个容器

### 12.2 环境配置
- 使用环境变量配置应用
- 使用配置文件管理不同环境的配置
- 使用.env文件存储敏感配置
