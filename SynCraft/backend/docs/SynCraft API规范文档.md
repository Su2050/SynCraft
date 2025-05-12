# SynCraft API规范文档

## 文档概述

本文档是SynCraft系统的API规范文档（API Specification Document），详细描述了后端数据库设计和API接口规范。在专业的前后端开发中，这类文档通常被称为"API规范文档"或"API参考文档"，如果使用OpenAPI（Swagger）格式，则称为"OpenAPI规范文档"。

## 目录

1. [数据库设计](#1-数据库设计)
   1. [实体关系图](#11-实体关系图)
   2. [数据表结构](#12-数据表结构)
2. [API接口规范](#2-api接口规范)
   1. [基本信息](#21-基本信息)
   2. [认证与授权](#22-认证与授权)
   3. [错误处理](#23-错误处理)
   4. [会话管理API](#24-会话管理api)
   5. [节点管理API](#25-节点管理api)
   6. [QA对管理API](#26-qa对管理api)
   7. [上下文管理API](#27-上下文管理api)
   8. [上下文节点关系API](#28-上下文节点关系api)
   9. [搜索API](#29-搜索api)
   10. [LLM服务API](#210-llm服务api)
   11. [用户认证API](#211-用户认证api)
   12. [用户管理API](#212-用户管理api)
3. [WebSocket API](#3-websocket-api)
4. [SDK与代码示例](#4-sdk与代码示例)
5. [附录](#5-附录)

## 1. 数据库设计

### 1.1 实体关系图

```
+------------+       +------------+       +------------+
|   User     |------>|   Session  |------>|    Node    |<------|  Context   |
+------------+       +------------+       +------------+       +------------+
                           |                    |                    |
                           |                    |                    |
                           v                    v                    v
                     +------------+       +------------+       +------------+
                     |  QAPair    |       |   Edge     |       | ContextNode|
                     +------------+       +------------+       +------------+
                           |
                           |
                           v
                     +------------+
                     |  Message   |
                     +------------+
```

### 1.2 数据表结构

#### 1.2.1 User表

存储用户信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 用户ID | 主键 |
| username | string | 用户名 | 非空，唯一 |
| email | string | 邮箱 | 非空，唯一 |
| hashed_password | string | 哈希密码 | 非空 |
| is_active | boolean | 是否激活 | 非空，默认true |
| is_admin | boolean | 是否管理员 | 非空，默认false |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |

#### 1.2.2 Session表

存储会话信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 会话ID | 主键 |
| name | string | 会话名称 | 非空 |
| root_node_id | string | 根节点ID | 外键，可空 |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |
| user_id | string | 用户ID | 外键，非空 |

#### 1.2.3 Node表

存储节点信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 节点ID | 主键 |
| parent_id | string | 父节点ID | 外键，可空 |
| session_id | string | 会话ID | 外键，非空 |
| template_key | string | 模板键 | 可空 |
| summary_up_to_here | string | 摘要 | 可空 |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |

#### 1.2.4 Edge表

存储节点之间的边关系。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 边ID | 主键 |
| source | string | 源节点ID | 外键，非空 |
| target | string | 目标节点ID | 外键，非空 |
| session_id | string | 会话ID | 外键，非空 |
| created_at | datetime | 创建时间 | 非空 |

#### 1.2.5 Context表

存储上下文信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 上下文ID | 主键 |
| context_id | string | 上下文标识符 | 非空，唯一 |
| mode | string | 上下文模式 | 非空 |
| session_id | string | 会话ID | 外键，非空 |
| context_root_node_id | string | 上下文根节点ID | 外键，非空 |
| active_node_id | string | 活动节点ID | 外键，非空 |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |
| source | string | 来源 | 可空 |

#### 1.2.6 ContextNode表

存储上下文和节点的关系。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 关系ID | 主键 |
| context_id | string | 上下文ID | 外键，非空 |
| node_id | string | 节点ID | 外键，非空 |
| relation_type | string | 关系类型 | 非空 |
| created_at | datetime | 创建时间 | 非空 |
| metadata | json | 元数据 | 可空 |

#### 1.2.7 QAPair表

存储问答对信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | QA对ID | 主键 |
| node_id | string | 节点ID | 外键，非空 |
| session_id | string | 会话ID | 外键，非空 |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |
| tags | json | 标签列表 | 可空 |
| is_favorite | boolean | 是否收藏 | 非空，默认false |
| status | string | 状态 | 可空 |
| rating | integer | 评分 | 可空 |
| view_count | integer | 查看次数 | 可空，默认0 |

#### 1.2.8 Message表

存储消息内容。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 消息ID | 主键 |
| qa_pair_id | string | QA对ID | 外键，非空 |
| role | string | 角色 | 非空 |
| content | text | 内容 | 非空 |
| timestamp | datetime | 时间戳 | 非空 |

## 2. API接口规范

### 2.1 基本信息

- **基础URL**: `/api/v1`
- **内容类型**: `application/json`
- **字符编码**: UTF-8

### 2.2 认证与授权

系统使用JWT（JSON Web Token）进行认证。大多数API端点需要在请求头中包含有效的JWT令牌。

认证流程：
1. 用户通过`/auth/login`端点提交用户名和密码
2. 服务器验证凭据并返回JWT令牌
3. 客户端在后续请求中将JWT令牌包含在Authorization头中

```
Authorization: Bearer {token}
```

LLM服务API需要通过X-API-Key头部进行认证。

### 2.3 错误处理

所有API在发生错误时，将返回标准的错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": {
      "field": "字段名",
      "reason": "错误原因"
    }
  }
}
```

常见错误码：

| 错误码 | HTTP状态码 | 说明 |
|-------|-----------|------|
| INVALID_REQUEST | 400 | 请求格式错误 |
| RESOURCE_NOT_FOUND | 404 | 资源不存在 |
| PERMISSION_DENIED | 403 | 权限不足 |
| VALIDATION_ERROR | 422 | 参数验证失败 |
| INTERNAL_ERROR | 500 | 内部服务器错误 |
| UNAUTHORIZED | 401 | 未授权（API密钥无效或JWT令牌无效） |

### 2.4 会话管理API

#### 2.4.1 创建会话

- **URL**: `/sessions`
- **方法**: `POST`
- **描述**: 创建一个新的会话，同时创建根节点和主聊天上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "name": "会话名称"
  }
  ```
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "会话名称",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "user_id": "用户ID",
    "main_context": {
      "id": "主聊天上下文ID",
      "context_id": "上下文标识符",
      "mode": "chat",
      "context_root_node_id": "上下文根节点ID",
      "active_node_id": "活动节点ID"
    }
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权

#### 2.4.2 获取会话列表

- **URL**: `/sessions`
- **方法**: `GET`
- **描述**: 获取当前用户的会话列表，支持分页和排序。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
  - `sort_by`: 排序字段（可选，默认为'created_at'）
  - `sort_order`: 排序顺序（可选，默认为'desc'）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "会话ID",
        "name": "会话名称",
        "root_node_id": "根节点ID",
        "created_at": "创建时间",
        "updated_at": "更新时间",
        "user_id": "用户ID"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 未授权

#### 2.4.3 获取会话详情

- **URL**: `/sessions/{session_id}`
- **方法**: `GET`
- **描述**: 获取会话的详细信息，包括关联的上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `session_id`: 会话ID
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "会话名称",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "user_id": "用户ID",
    "contexts": [
      {
        "id": "上下文ID",
        "context_id": "上下文标识符",
        "mode": "上下文模式",
        "context_root_node_id": "上下文根节点ID",
        "active_node_id": "活动节点ID"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 会话不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的会话）

#### 2.4.4 更新会话

- **URL**: `/sessions/{session_id}`
- **方法**: `PUT`
- **描述**: 更新会话信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `session_id`: 会话ID
- **请求体**:
  ```json
  {
    "name": "新的会话名称"
  }
  ```
- **响应**:
  ```json
  {
    "id": "会话ID",
    "name": "新的会话名称",
    "root_node_id": "根节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "user_id": "用户ID"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 会话不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试更新其他用户的会话）

#### 2.4.5 删除会话

- **URL**: `/sessions/{session_id}`
- **方法**: `DELETE`
- **描述**: 删除会话及其关联的所有记录。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `session_id`: 会话ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "会话已删除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 会话不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试删除其他用户的会话）

#### 2.4.6 获取会话树

- **URL**: `/sessions/{session_id}/tree`
- **方法**: `GET`
- **描述**: 获取会话的树状结构，包括所有节点和边。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `session_id`: 会话ID
- **查询参数**:
  - `include_qa`: 是否包含QA对信息（可选，默认为false）
- **响应**:
  ```json
  {
    "nodes": [
      {
        "id": "节点ID",
        "parent_id": "父节点ID（如果有）",
        "template_key": "模板键",
        "created_at": "创建时间",
        "qa_summary": {
          "question_preview": "问题预览（前100个字符）",
          "answer_preview": "回答预览（前100个字符）"
        }
      },
      ...
    ],
    "edges": [
      {
        "id": "边ID",
        "source": "源节点ID",
        "target": "目标节点ID"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 会话不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的会话）

#### 2.4.7 获取会话主聊天上下文

- **URL**: `/sessions/{session_id}/main_context`
- **方法**: `GET`
- **描述**: 获取会话的主聊天上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `session_id`: 会话ID
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文标识符",
    "mode": "chat",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 会话不存在或主聊天上下文不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的会话）

### 2.5 节点管理API

#### 2.5.1 创建节点

- **URL**: `/nodes`
- **方法**: `POST`
- **描述**: 创建一个新的节点（不包含QA内容）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "parent_id": "父节点ID（可选）",
    "session_id": "会话ID",
    "template_key": "模板键（可选）",
    "summary_up_to_here": "摘要（可选）",
    "context_id": "上下文ID（可选）"
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
    "parent_id": "父节点ID（如果有）"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 父节点或上下文不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试在其他用户的会话中创建节点）

#### 2.5.2 创建节点和QA对

- **URL**: `/nodes/with_qa`
- **方法**: `POST`
- **描述**: 一次性创建节点和QA对。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "parent_id": "父节点ID（可选）",
    "session_id": "会话ID",
    "context_id": "上下文ID（可选）",
    "template_key": "模板键（可选）",
    "summary_up_to_here": "摘要（可选）",
    "question": "问题",
    "answer": "回答（可选）",
    "tags": ["标签1", "标签2"]（可选）
  }
  ```
- **响应**:
  ```json
  {
    "node": {
      "id": "节点ID",
      "session_id": "会话ID",
      "template_key": "模板键",
      "summary_up_to_here": "摘要",
      "created_at": "创建时间",
      "updated_at": "更新时间",
      "parent_id": "父节点ID（如果有）"
    },
    "qa_pair": {
      "id": "QA对ID",
      "node_id": "节点ID",
      "session_id": "会话ID",
      "created_at": "创建时间",
      "updated_at": "更新时间",
      "tags": ["标签1", "标签2"],
      "is_favorite": false,
      "question": "问题",
      "answer": "回答"
    }
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 父节点或上下文不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试在其他用户的会话中创建节点）

#### 2.5.3 获取节点详情

- **URL**: `/nodes/{node_id}`
- **方法**: `GET`
- **描述**: 获取节点的详细信息，包括QA对、子节点和上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `node_id`: 节点ID
- **查询参数**:
  - `include_children`: 是否包含子节点信息（可选，默认为false）
  - `children_depth`: 子节点深度（可选，默认为1）
  - `include_qa`: 是否包含QA对信息（可选，默认为true）
- **响应**:
  ```json
  {
    "id": "节点ID",
    "session_id": "会话ID",
    "template_key": "模板键",
    "summary_up_to_here": "摘要",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "parent_id": "父节点ID（如果有）",
    "qa_pairs": [
      {
        "id": "QA对ID",
        "question": "问题",
        "answer": "回答",
        "created_at": "创建时间",
        "tags": ["标签1", "标签2"],
        "is_favorite": false
      },
      ...
    ],
    "children": [
      {
        "id": "子节点ID",
        "qa_pairs": [
          {
            "id": "QA对ID",
            "question": "问题",
            "answer": "回答"
          }
        ]
      },
      ...
    ],
    "contexts": [
      {
        "id": "上下文ID",
        "context_id": "上下文标识符",
        "mode": "上下文模式"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的节点）

#### 2.5.4 获取节点的子节点

- **URL**: `/nodes/{node_id}/children`
- **方法**: `GET`
- **描述**: 获取节点的所有子节点。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `node_id`: 节点ID
- **查询参数**:
  - `include_qa`: 是否包含QA对信息（可选，默认为true）
- **响应**:
  ```json
  {
    "items": [
      {
        "id": "子节点ID",
        "session_id": "会话ID",
        "template_key": "模板键",
        "created_at": "创建时间",
        "qa_pairs": [
          {
            "id": "QA对ID",
            "question": "问题",
            "answer": "回答"
          }
        ]
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的节点）

#### 2.5.5 更新节点

- **URL**: `/nodes/{node_id}`
- **方法**: `PUT`
- **描述**: 更新节点信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `node_id`: 节点ID
- **请求体**:
  ```json
  {
    "template_key": "新的模板键",
    "summary_up_to_here": "新的摘要"
  }
  ```
- **响应**:
  ```json
  {
    "id": "节点ID",
    "session_id": "会话ID",
    "template_key": "新的模板键",
    "summary_up_to_here": "新的摘要",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "parent_id": "父节点ID（如果有）"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试更新其他用户的节点）

### 2.6 QA对管理API

#### 2.6.1 创建QA对

- **URL**: `/qa_pairs`
- **方法**: `POST`
- **描述**: 创建一个新的QA对。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "node_id": "节点ID",
    "session_id": "会话ID",
    "question": "问题",
    "answer": "回答（可选）",
    "tags": ["标签1", "标签2"]（可选）
  }
  ```
- **响应**:
  ```json
  {
    "id": "QA对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "tags": ["标签1", "标签2"],
    "is_favorite": false,
    "question": "问题",
    "answer": "回答"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试在其他用户的会话中创建QA对）

#### 2.6.2 获取QA对详情

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `GET`
- **描述**: 获取QA对的详细信息，包括消息内容。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **响应**:
  ```json
  {
    "id": "QA对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "tags": ["标签1", "标签2"],
    "is_favorite": false,
    "status": "状态",
    "rating": 评分,
    "view_count": 查看次数,
    "messages": [
      {
        "id": "消息ID",
        "role": "user",
        "content": "问题",
        "timestamp": "时间戳"
      },
      {
        "id": "消息ID",
        "role": "assistant",
        "content": "回答",
        "timestamp": "时间戳"
      }
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的QA对）

#### 2.6.3 更新QA对

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `PUT`
- **描述**: 更新QA对信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **请求体**:
  ```json
  {
    "tags": ["新标签1", "新标签2"],
    "is_favorite": true
  }
  ```
- **响应**:
  ```json
  {
    "id": "QA对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "tags": ["新标签1", "新标签2"],
    "is_favorite": true,
    "question": "问题",
    "answer": "回答"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试更新其他用户的QA对）

#### 2.6.4 删除QA对

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `DELETE`
- **描述**: 删除QA对。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "QA对已删除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试删除其他用户的QA对）

### 2.7 上下文管理API

#### 2.7.1 创建上下文

- **URL**: `/contexts`
- **方法**: `POST`
- **描述**: 创建一个新的上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID（可选）",
    "source": "来源（可选）"
  }
  ```
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文标识符",
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试在其他用户的会话中创建上下文）

#### 2.7.2 获取上下文详情

- **URL**: `/contexts/{context_id}`
- **方法**: `GET`
- **描述**: 获取上下文的详细信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `context_id`: 上下文ID
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文标识符",
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "活动节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源",
    "nodes": [
      {
        "id": "节点ID",
        "relation_type": "关系类型"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的上下文）

#### 2.7.3 更新上下文

- **URL**: `/contexts/{context_id}`
- **方法**: `PUT`
- **描述**: 更新上下文信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `context_id`: 上下文ID
- **请求体**:
  ```json
  {
    "active_node_id": "新的活动节点ID"
  }
  ```
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文标识符",
    "mode": "上下文模式",
    "session_id": "会话ID",
    "context_root_node_id": "上下文根节点ID",
    "active_node_id": "新的活动节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文不存在或节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试更新其他用户的上下文）

#### 2.7.4 删除上下文

- **URL**: `/contexts/{context_id}`
- **方法**: `DELETE`
- **描述**: 删除上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `context_id`: 上下文ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "上下文已删除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试删除其他用户的上下文）

### 2.8 上下文节点关系API

#### 2.8.1 添加节点到上下文

- **URL**: `/context_nodes`
- **方法**: `POST`
- **描述**: 将节点添加到上下文中。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "context_id": "上下文ID",
    "node_id": "节点ID",
    "relation_type": "关系类型",
    "metadata": {
      "key": "value"
    }（可选）
  }
  ```
- **响应**:
  ```json
  {
    "id": "关系ID",
    "context_id": "上下文ID",
    "node_id": "节点ID",
    "relation_type": "关系类型",
    "created_at": "创建时间",
    "metadata": {
      "key": "value"
    }
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文或节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试操作其他用户的上下文或节点）

#### 2.8.2 获取上下文中的节点

- **URL**: `/contexts/{context_id}/nodes`
- **方法**: `GET`
- **描述**: 获取上下文中的所有节点。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `context_id`: 上下文ID
- **查询参数**:
  - `relation_type`: 关系类型（可选，用于筛选）
- **响应**:
  ```json
  {
    "items": [
      {
        "id": "关系ID",
        "node_id": "节点ID",
        "relation_type": "关系类型",
        "created_at": "创建时间",
        "metadata": {
          "key": "value"
        },
        "node": {
          "id": "节点ID",
          "template_key": "模板键",
          "created_at": "创建时间"
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的上下文）

#### 2.8.3 获取节点所属的上下文

- **URL**: `/nodes/{node_id}/contexts`
- **方法**: `GET`
- **描述**: 获取节点所属的所有上下文。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `node_id`: 节点ID
- **响应**:
  ```json
  {
    "items": [
      {
        "id": "关系ID",
        "context_id": "上下文ID",
        "relation_type": "关系类型",
        "created_at": "创建时间",
        "metadata": {
          "key": "value"
        },
        "context": {
          "id": "上下文ID",
          "context_id": "上下文标识符",
          "mode": "上下文模式"
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试访问其他用户的节点）

#### 2.8.4 更新上下文节点关系

- **URL**: `/context_nodes/{relation_id}`
- **方法**: `PUT`
- **描述**: 更新上下文和节点的关系信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `relation_id`: 关系ID
- **请求体**:
  ```json
  {
    "relation_type": "新的关系类型",
    "metadata": {
      "key": "新值"
    }
  }
  ```
- **响应**:
  ```json
  {
    "id": "关系ID",
    "context_id": "上下文ID",
    "node_id": "节点ID",
    "relation_type": "新的关系类型",
    "created_at": "创建时间",
    "metadata": {
      "key": "新值"
    }
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 关系不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试更新其他用户的关系）

#### 2.8.5 删除上下文节点关系

- **URL**: `/context_nodes/{relation_id}`
- **方法**: `DELETE`
- **描述**: 删除上下文和节点的关系。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `relation_id`: 关系ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "关系已删除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 关系不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 权限不足（尝试删除其他用户的关系）

### 2.9 搜索API

#### 2.9.1 搜索QA对

- **URL**: `/search/qa_pairs`
- **方法**: `GET`
- **描述**: 搜索QA对。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `query`: 搜索关键词（必填）
  - `session_id`: 会话ID（可选，限定搜索范围）
  - `tags`: 标签列表，逗号分隔（可选，用于筛选）
  - `is_favorite`: 是否收藏（可选，用于筛选）
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "QA对ID",
        "node_id": "节点ID",
        "session_id": "会话ID",
        "created_at": "创建时间",
        "tags": ["标签1", "标签2"],
        "is_favorite": false,
        "question": "问题",
        "answer": "回答",
        "score": 相关性得分,
        "highlights": {
          "question": "高亮的问题片段",
          "answer": "高亮的回答片段"
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权

#### 2.9.2 搜索节点

- **URL**: `/search/nodes`
- **方法**: `GET`
- **描述**: 搜索节点。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `query`: 搜索关键词（必填）
  - `session_id`: 会话ID（可选，限定搜索范围）
  - `template_key`: 模板键（可选，用于筛选）
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "节点ID",
        "session_id": "会话ID",
        "template_key": "模板键",
        "created_at": "创建时间",
        "qa_pairs": [
          {
            "id": "QA对ID",
            "question": "问题",
            "answer": "回答"
          }
        ],
        "score": 相关性得分,
        "highlights": {
          "summary": "高亮的摘要片段"
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权

#### 2.9.3 搜索会话

- **URL**: `/search/sessions`
- **方法**: `GET`
- **描述**: 搜索会话。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `query`: 搜索关键词（必填）
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "会话ID",
        "name": "会话名称",
        "created_at": "创建时间",
        "updated_at": "更新时间",
        "qa_count": QA对数量,
        "score": 相关性得分,
        "highlights": {
          "name": "高亮的名称片段"
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权

#### 2.9.4 全局搜索

- **URL**: `/search`
- **方法**: `GET`
- **描述**: 在所有资源中搜索。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `query`: 搜索关键词（必填）
  - `types`: 资源类型列表，逗号分隔（可选，默认为所有类型）
  - `limit`: 每种类型的数量（可选，默认为5）
- **响应**:
  ```json
  {
    "qa_pairs": {
      "total": 总数量,
      "items": [
        {
          "id": "QA对ID",
          "question": "问题",
          "answer": "回答",
          "score": 相关性得分
        },
        ...
      ]
    },
    "nodes": {
      "total": 总数量,
      "items": [
        {
          "id": "节点ID",
          "template_key": "模板键",
          "qa_pairs": [
            {
              "id": "QA对ID",
              "question": "问题"
            }
          ],
          "score": 相关性得分
        },
        ...
      ]
    },
    "sessions": {
      "total": 总数量,
      "items": [
        {
          "id": "会话ID",
          "name": "会话名称",
          "score": 相关性得分
        },
        ...
      ]
    }
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权

### 2.10 LLM服务API

#### 2.10.1 生成回答

- **URL**: `/llm/generate`
- **方法**: `POST`
- **描述**: 使用LLM生成回答。
- **请求头**:
  - `Authorization`: Bearer {token}
  - `X-API-Key`: API密钥（可选，如果不使用JWT认证）
- **请求体**:
  ```json
  {
    "prompt": "提示文本",
    "context": "上下文（可选）",
    "max_tokens": 最大生成令牌数（可选，默认为1000）,
    "temperature": 温度参数（可选，默认为0.7）,
    "model": "模型名称（可选，默认为系统配置的模型）"
  }
  ```
- **响应**:
  ```json
  {
    "response": "生成的回答",
    "tokens_used": 使用的令牌数,
    "model": "使用的模型名称"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `INTERNAL_ERROR`: LLM服务错误

#### 2.10.2 流式生成回答

- **URL**: `/llm/generate/stream`
- **方法**: `POST`
- **描述**: 使用LLM流式生成回答。
- **请求头**:
  - `Authorization`: Bearer {token}
  - `X-API-Key`: API密钥（可选，如果不使用JWT认证）
- **请求体**:
  ```json
  {
    "prompt": "提示文本",
    "context": "上下文（可选）",
    "max_tokens": 最大生成令牌数（可选，默认为1000）,
    "temperature": 温度参数（可选，默认为0.7）,
    "model": "模型名称（可选，默认为系统配置的模型）"
  }
  ```
- **响应**:
  Server-Sent Events (SSE) 流，每个事件包含：
  ```json
  {
    "chunk": "生成的文本片段",
    "is_final": 是否为最后一个片段
  }
  ```
  最后一个事件还包含：
  ```json
  {
    "tokens_used": 使用的令牌数,
    "model": "使用的模型名称"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `INTERNAL_ERROR`: LLM服务错误

#### 2.10.3 获取可用模型

- **URL**: `/llm/models`
- **方法**: `GET`
- **描述**: 获取系统中可用的LLM模型列表。
- **请求头**:
  - `Authorization`: Bearer {token}
  - `X-API-Key`: API密钥（可选，如果不使用JWT认证）
- **响应**:
  ```json
  {
    "models": [
      {
        "id": "模型ID",
        "name": "模型名称",
        "description": "模型描述",
        "max_tokens": 最大支持的令牌数,
        "is_default": 是否为默认模型
      },
      ...
    ]
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 未授权

#### 2.10.4 嵌入文本

- **URL**: `/llm/embed`
- **方法**: `POST`
- **描述**: 将文本转换为向量嵌入。
- **请求头**:
  - `Authorization`: Bearer {token}
  - `X-API-Key`: API密钥（可选，如果不使用JWT认证）
- **请求体**:
  ```json
  {
    "text": "要嵌入的文本",
    "model": "嵌入模型名称（可选，默认为系统配置的嵌入模型）"
  }
  ```
- **响应**:
  ```json
  {
    "embedding": [0.1, 0.2, ...],
    "dimensions": 嵌入维度,
    "model": "使用的嵌入模型名称"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `INTERNAL_ERROR`: 嵌入服务错误

#### 2.10.5 批量嵌入文本

- **URL**: `/llm/embed/batch`
- **方法**: `POST`
- **描述**: 批量将多个文本转换为向量嵌入。
- **请求头**:
  - `Authorization`: Bearer {token}
  - `X-API-Key`: API密钥（可选，如果不使用JWT认证）
- **请求体**:
  ```json
  {
    "texts": ["文本1", "文本2", ...],
    "model": "嵌入模型名称（可选，默认为系统配置的嵌入模型）"
  }
  ```
- **响应**:
  ```json
  {
    "embeddings": [
      [0.1, 0.2, ...],
      [0.3, 0.4, ...],
      ...
    ],
    "dimensions": 嵌入维度,
    "model": "使用的嵌入模型名称"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `INTERNAL_ERROR`: 嵌入服务错误

### 2.11 用户认证API

#### 2.11.1 用户登录

- **URL**: `/auth/login`
- **方法**: `POST`
- **描述**: 用户登录并获取JWT令牌。
- **请求体**:
  ```json
  {
    "username": "用户名",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "access_token": "JWT令牌",
    "token_type": "bearer",
    "expires_in": 令牌有效期（秒）,
    "user": {
      "id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "is_active": true,
      "is_admin": false
    }
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 用户名或密码错误

#### 2.11.2 刷新令牌

- **URL**: `/auth/refresh`
- **方法**: `POST`
- **描述**: 使用有效的JWT令牌获取新的令牌。
- **请求头**:
  - `Authorization`: Bearer {token}
- **响应**:
  ```json
  {
    "access_token": "新的JWT令牌",
    "token_type": "bearer",
    "expires_in": 令牌有效期（秒）
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 令牌无效或已过期

#### 2.11.3 获取当前用户信息

- **URL**: `/auth/me`
- **方法**: `GET`
- **描述**: 获取当前登录用户的信息。
- **请求头**:
  - `Authorization`: Bearer {token}
- **响应**:
  ```json
  {
    "id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "is_active": true,
    "is_admin": false,
    "created_at": "创建时间",
    "updated_at": "更新时间"
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 令牌无效或已过期

#### 2.11.4 修改密码

- **URL**: `/auth/change-password`
- **方法**: `POST`
- **描述**: 修改当前用户的密码。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "current_password": "当前密码",
    "new_password": "新密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码已修改"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 当前密码错误
  - `PERMISSION_DENIED`: 令牌无效或已过期

#### 2.11.5 重置密码请求

- **URL**: `/auth/reset-password-request`
- **方法**: `POST`
- **描述**: 请求重置密码，系统将发送重置链接到用户邮箱。
- **请求体**:
  ```json
  {
    "email": "用户邮箱"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "重置密码链接已发送到邮箱"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `RESOURCE_NOT_FOUND`: 邮箱不存在

#### 2.11.6 重置密码

- **URL**: `/auth/reset-password`
- **方法**: `POST`
- **描述**: 使用重置令牌重置密码。
- **请求体**:
  ```json
  {
    "token": "重置令牌",
    "new_password": "新密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码已重置"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 重置令牌无效或已过期

#### 2.11.7 登出

- **URL**: `/auth/logout`
- **方法**: `POST`
- **描述**: 使当前JWT令牌失效。
- **请求头**:
  - `Authorization`: Bearer {token}
- **响应**:
  ```json
  {
    "success": true,
    "message": "已登出"
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 令牌无效或已过期

### 2.12 用户管理API

#### 2.12.1 创建用户

- **URL**: `/admin/users`
- **方法**: `POST`
- **描述**: 创建一个新用户（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "邮箱",
    "password": "密码",
    "is_active": true（可选，默认为true）,
    "is_admin": false（可选，默认为false）
  }
  ```
- **响应**:
  ```json
  {
    "id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "is_active": true,
    "is_admin": false,
    "created_at": "创建时间",
    "updated_at": "更新时间"
  }
  ```
- **错误**:
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.2 获取用户列表

- **URL**: `/admin/users`
- **方法**: `GET`
- **描述**: 获取所有用户的列表（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **查询参数**:
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
  - `sort_by`: 排序字段（可选，默认为'created_at'）
  - `sort_order`: 排序顺序（可选，默认为'desc'）
  - `username`: 用户名过滤（可选）
  - `email`: 邮箱过滤（可选）
  - `is_active`: 是否激活过滤（可选）
  - `is_admin`: 是否管理员过滤（可选）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "用户ID",
        "username": "用户名",
        "email": "邮箱",
        "is_active": true,
        "is_admin": false,
        "created_at": "创建时间",
        "updated_at": "更新时间"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.3 获取用户详情

- **URL**: `/admin/users/{user_id}`
- **方法**: `GET`
- **描述**: 获取指定用户的详细信息（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `user_id`: 用户ID
- **响应**:
  ```json
  {
    "id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "is_active": true,
    "is_admin": false,
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "sessions_count": 会话数量,
    "last_login": "最后登录时间"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 用户不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.4 更新用户

- **URL**: `/admin/users/{user_id}`
- **方法**: `PUT`
- **描述**: 更新指定用户的信息（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `user_id`: 用户ID
- **请求体**:
  ```json
  {
    "username": "新用户名（可选）",
    "email": "新邮箱（可选）",
    "is_active": true或false（可选）,
    "is_admin": true或false（可选）
  }
  ```
- **响应**:
  ```json
  {
    "id": "用户ID",
    "username": "新用户名",
    "email": "新邮箱",
    "is_active": true或false,
    "is_admin": true或false,
    "created_at": "创建时间",
    "updated_at": "更新时间"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 用户不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.5 删除用户

- **URL**: `/admin/users/{user_id}`
- **方法**: `DELETE`
- **描述**: 删除指定用户（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `user_id`: 用户ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "用户已删除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 用户不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.6 重置用户密码

- **URL**: `/admin/users/{user_id}/reset-password`
- **方法**: `POST`
- **描述**: 重置指定用户的密码（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `user_id`: 用户ID
- **请求体**:
  ```json
  {
    "new_password": "新密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码已重置"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 用户不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

#### 2.12.7 获取用户会话列表

- **URL**: `/admin/users/{user_id}/sessions`
- **方法**: `GET`
- **描述**: 获取指定用户的会话列表（仅管理员可用）。
- **请求头**:
  - `Authorization`: Bearer {token}
- **路径参数**:
  - `user_id`: 用户ID
- **查询参数**:
  - `limit`: 每页数量（可选，默认为10）
  - `offset`: 偏移量（可选，默认为0）
- **响应**:
  ```json
  {
    "total": 总数量,
    "items": [
      {
        "id": "会话ID",
        "name": "会话名称",
        "created_at": "创建时间",
        "updated_at": "更新时间",
        "qa_count": QA对数量
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 用户不存在
  - `UNAUTHORIZED`: 未授权
  - `PERMISSION_DENIED`: 非管理员用户

## 3. WebSocket API

### 3.1 连接

- **URL**: `/ws`
- **协议**: WebSocket
- **描述**: 建立WebSocket连接。
- **查询参数**:
  - `token`: JWT令牌（必填）
- **示例**:
  ```
  ws://example.com/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

### 3.2 消息格式

#### 3.2.1 客户端发送的消息

```json
{
  "type": "消息类型",
  "payload": {
    // 消息内容，根据类型不同而不同
  }
}
```

#### 3.2.2 服务器发送的消息

```json
{
  "type": "消息类型",
  "payload": {
    // 消息内容，根据类型不同而不同
  },
  "timestamp": "时间戳"
}
```

### 3.3 消息类型

#### 3.3.1 ping/pong

- **类型**: `ping`/`pong`
- **描述**: 心跳消息，用于保持连接活跃。
- **客户端发送**:
  ```json
  {
    "type": "ping"
  }
  ```
- **服务器响应**:
  ```json
  {
    "type": "pong",
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.2 订阅会话更新

- **类型**: `subscribe_session`
- **描述**: 订阅指定会话的更新。
- **客户端发送**:
  ```json
  {
    "type": "subscribe_session",
    "payload": {
      "session_id": "会话ID"
    }
  }
  ```
- **服务器响应**:
  ```json
  {
    "type": "subscription_confirmed",
    "payload": {
      "session_id": "会话ID",
      "event_types": ["node_created", "node_updated", "qa_pair_created", "qa_pair_updated"]
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.3 取消订阅

- **类型**: `unsubscribe`
- **描述**: 取消订阅。
- **客户端发送**:
  ```json
  {
    "type": "unsubscribe",
    "payload": {
      "session_id": "会话ID"
    }
  }
  ```
- **服务器响应**:
  ```json
  {
    "type": "unsubscription_confirmed",
    "payload": {
      "session_id": "会话ID"
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.4 节点创建事件

- **类型**: `node_created`
- **描述**: 当订阅的会话中创建了新节点时，服务器发送此消息。
- **服务器发送**:
  ```json
  {
    "type": "node_created",
    "payload": {
      "session_id": "会话ID",
      "node": {
        "id": "节点ID",
        "parent_id": "父节点ID（如果有）",
        "template_key": "模板键",
        "created_at": "创建时间"
      }
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.5 节点更新事件

- **类型**: `node_updated`
- **描述**: 当订阅的会话中的节点被更新时，服务器发送此消息。
- **服务器发送**:
  ```json
  {
    "type": "node_updated",
    "payload": {
      "session_id": "会话ID",
      "node": {
        "id": "节点ID",
        "template_key": "新的模板键",
        "updated_at": "更新时间"
      }
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.6 QA对创建事件

- **类型**: `qa_pair_created`
- **描述**: 当订阅的会话中创建了新QA对时，服务器发送此消息。
- **服务器发送**:
  ```json
  {
    "type": "qa_pair_created",
    "payload": {
      "session_id": "会话ID",
      "node_id": "节点ID",
      "qa_pair": {
        "id": "QA对ID",
        "question": "问题",
        "answer": "回答",
        "created_at": "创建时间"
      }
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.7 QA对更新事件

- **类型**: `qa_pair_updated`
- **描述**: 当订阅的会话中的QA对被更新时，服务器发送此消息。
- **服务器发送**:
  ```json
  {
    "type": "qa_pair_updated",
    "payload": {
      "session_id": "会话ID",
      "node_id": "节点ID",
      "qa_pair": {
        "id": "QA对ID",
        "tags": ["新标签1", "新标签2"],
        "is_favorite": true,
        "updated_at": "更新时间"
      }
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.8 流式生成回答

- **类型**: `stream_response`
- **描述**: 当使用LLM流式生成回答时，服务器发送此消息。
- **客户端发送**:
  ```json
  {
    "type": "generate_stream",
    "payload": {
      "prompt": "提示文本",
      "context": "上下文（可选）",
      "max_tokens": 1000,
      "temperature": 0.7,
      "model": "模型名称（可选）"
    }
  }
  ```
- **服务器响应**（多条）:
  ```json
  {
    "type": "stream_response",
    "payload": {
      "chunk": "生成的文本片段",
      "is_final": false
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```
  最后一条消息：
  ```json
  {
    "type": "stream_response",
    "payload": {
      "chunk": "最后的文本片段",
      "is_final": true,
      "tokens_used": 使用的令牌数,
      "model": "使用的模型名称"
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

#### 3.3.9 错误消息

- **类型**: `error`
- **描述**: 当发生错误时，服务器发送此消息。
- **服务器发送**:
  ```json
  {
    "type": "error",
    "payload": {
      "code": "错误码",
      "message": "错误消息"
    },
    "timestamp": "2023-01-01T12:00:00Z"
  }
  ```

## 4. SDK与代码示例

### 4.1 JavaScript SDK

#### 4.1.1 安装

```bash
npm install syncraft-sdk
```

#### 4.1.2 初始化

```javascript
import { SynCraftClient } from 'syncraft-sdk';

const client = new SynCraftClient({
  baseUrl: 'https://api.example.com',
  token: 'your-jwt-token'
});
```

#### 4.1.3 会话管理

```javascript
// 创建会话
const session = await client.sessions.create({ name: '新会话' });

// 获取会话列表
const sessions = await client.sessions.list({ limit: 10, offset: 0 });

// 获取会话详情
const sessionDetail = await client.sessions.get(sessionId);

// 更新会话
await client.sessions.update(sessionId, { name: '新的会话名称' });

// 删除会话
await client.sessions.delete(sessionId);

// 获取会话树
const sessionTree = await client.sessions.getTree(sessionId);
```

#### 4.1.4 节点和QA对管理

```javascript
// 创建节点和QA对
const result = await client.nodes.createWithQA({
  session_id: sessionId,
  parent_id: parentNodeId,
  question: '问题',
  answer: '回答'
});

// 获取节点详情
const node = await client.nodes.get(nodeId);

// 更新QA对
await client.qaPairs.update(qaPairId, {
  tags: ['标签1', '标签2'],
  is_favorite: true
});
```

#### 4.1.5 WebSocket连接

```javascript
// 建立WebSocket连接
const ws = client.connectWebSocket();

// 订阅会话更新
ws.subscribe(sessionId);

// 监听事件
ws.on('node_created', (data) => {
  console.log('新节点创建:', data);
});

ws.on('qa_pair_created', (data) => {
  console.log('新QA对创建:', data);
});

// 流式生成回答
ws.generateStream({
  prompt: '提示文本',
  context: '上下文'
}).on('chunk', (chunk) => {
  console.log('收到文本片段:', chunk);
}).on('end', (result) => {
  console.log('生成完成:', result);
});

// 关闭连接
ws.close();
```

### 4.2 Python SDK

#### 4.2.1 安装

```bash
pip install syncraft-sdk
```

#### 4.2.2 初始化

```python
from syncraft_sdk import SynCraftClient

client = SynCraftClient(
    base_url='https://api.example.com',
    token='your-jwt-token'
)
```

#### 4.2.3 会话管理

```python
# 创建会话
session = client.sessions.create(name='新会话')

# 获取会话列表
sessions = client.sessions.list(limit=10, offset=0)

# 获取会话详情
session_detail = client.sessions.get(session_id)

# 更新会话
client.sessions.update(session_id, name='新的会话名称')

# 删除会话
client.sessions.delete(session_id)

# 获取会话树
session_tree = client.sessions.get_tree(session_id)
```

#### 4.2.4 节点和QA对管理

```python
# 创建节点和QA对
result = client.nodes.create_with_qa(
    session_id=session_id,
    parent_id=parent_node_id,
    question='问题',
    answer='回答'
)

# 获取节点详情
node = client.nodes.get(node_id)

# 更新QA对
client.qa_pairs.update(
    qa_pair_id,
    tags=['标签1', '标签2'],
    is_favorite=True
)
```

#### 4.2.5 WebSocket连接

```python
# 建立WebSocket连接
ws = client.connect_websocket()

# 订阅会话更新
ws.subscribe(session_id)

# 监听事件
@ws.on('node_created')
def on_node_created(data):
    print('新节点创建:', data)

@ws.on('qa_pair_created')
def on_qa_pair_created(data):
    print('新QA对创建:', data)

# 流式生成回答
for chunk in ws.generate_stream(prompt='提示文本', context='上下文'):
    if chunk.is_final:
        print('生成完成:', chunk)
    else:
        print('收到文本片段:', chunk.text)

# 关闭连接
ws.close()
```

## 5. 附录

### 5.1 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功 |
| 400 | 请求格式错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 参数验证失败 |
| 500 | 内部服务器错误 |

### 5.2 错误码

| 错误码 | 说明 |
|-------|------|
| INVALID_REQUEST | 请求格式错误 |
| RESOURCE_NOT_FOUND | 资源不存在 |
| PERMISSION_DENIED | 权限不足 |
| VALIDATION_ERROR | 参数验证失败 |
| INTERNAL_ERROR | 内部服务器错误 |
| UNAUTHORIZED | 未授权 |

### 5.3 模板键

| 模板键 | 说明 |
|-------|------|
| chat | 聊天模板 |
| summary | 摘要模板 |
| question | 问题模板 |
| answer | 回答模板 |
| code | 代码模板 |
| image | 图片模板 |

### 5.4 关系类型

| 关系类型 | 说明 |
|---------|------|
| root | 根节点关系 |
| child | 子节点关系 |
| reference | 引用关系 |
| similar | 相似关系 |
| context | 上下文关系 |

### 5.5 上下文模式

| 模式 | 说明 |
|------|------|
| chat | 聊天模式 |
| search | 搜索模式 |
| reference | 引用模式 |
| summary | 摘要模式 |
