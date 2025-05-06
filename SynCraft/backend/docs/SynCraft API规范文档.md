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
3. [WebSocket API](#3-websocket-api)
4. [SDK与代码示例](#4-sdk与代码示例)
5. [附录](#5-附录)

## 1. 数据库设计

### 1.1 实体关系图

```
+------------+       +------------+       +------------+
|   Session  |------>|    Node    |<------|  Context   |
+------------+       +------------+       +------------+
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

#### 1.2.1 Session表

存储会话信息。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 会话ID | 主键 |
| name | string | 会话名称 | 非空 |
| root_node_id | string | 根节点ID | 外键，可空 |
| created_at | datetime | 创建时间 | 非空 |
| updated_at | datetime | 更新时间 | 非空 |
| user_id | string | 用户ID | 非空 |

#### 1.2.2 Node表

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

#### 1.2.3 Edge表

存储节点之间的边关系。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 边ID | 主键 |
| source | string | 源节点ID | 外键，非空 |
| target | string | 目标节点ID | 外键，非空 |
| session_id | string | 会话ID | 外键，非空 |
| created_at | datetime | 创建时间 | 非空 |

#### 1.2.4 Context表

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

#### 1.2.5 ContextNode表

存储上下文和节点的关系。

| 字段名 | 类型 | 说明 | 约束 |
|-------|------|------|------|
| id | string | 关系ID | 主键 |
| context_id | string | 上下文ID | 外键，非空 |
| node_id | string | 节点ID | 外键，非空 |
| relation_type | string | 关系类型 | 非空 |
| created_at | datetime | 创建时间 | 非空 |
| metadata | json | 元数据 | 可空 |

#### 1.2.6 QAPair表

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

#### 1.2.7 Message表

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

目前API不需要认证，但未来可能会添加基于JWT的认证机制。LLM服务API需要通过X-API-Key头部进行认证。

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
| UNAUTHORIZED | 401 | 未授权（API密钥无效） |

### 2.4 会话管理API

#### 2.4.1 创建会话

- **URL**: `/sessions`
- **方法**: `POST`
- **描述**: 创建一个新的会话，同时创建根节点和主聊天上下文。
- **请求体**:
  ```json
  {
    "name": "会话名称",
    "user_id": "用户ID（可选，默认为'local'）"
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

#### 2.4.2 获取会话列表

- **URL**: `/sessions`
- **方法**: `GET`
- **描述**: 获取会话列表，支持分页和排序。
- **查询参数**:
  - `user_id`: 用户ID（可选，默认为'local'）
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

#### 2.4.3 获取会话详情

- **URL**: `/sessions/{session_id}`
- **方法**: `GET`
- **描述**: 获取会话的详细信息，包括关联的上下文。
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

#### 2.4.4 更新会话

- **URL**: `/sessions/{session_id}`
- **方法**: `PUT`
- **描述**: 更新会话信息。
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

#### 2.4.5 删除会话

- **URL**: `/sessions/{session_id}`
- **方法**: `DELETE`
- **描述**: 删除会话及其关联的所有记录。
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

#### 2.4.6 获取会话树

- **URL**: `/sessions/{session_id}/tree`
- **方法**: `GET`
- **描述**: 获取会话的树状结构，包括所有节点和边。
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

#### 2.4.7 获取会话主聊天上下文

- **URL**: `/sessions/{session_id}/main_context`
- **方法**: `GET`
- **描述**: 获取会话的主聊天上下文。
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

### 2.5 节点管理API

#### 2.5.1 创建节点

- **URL**: `/nodes`
- **方法**: `POST`
- **描述**: 创建一个新的节点（不包含QA内容）。
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

#### 2.5.2 创建节点和QA对

- **URL**: `/nodes/with_qa`
- **方法**: `POST`
- **描述**: 一次性创建节点和QA对。
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

#### 2.5.3 获取节点详情

- **URL**: `/nodes/{node_id}`
- **方法**: `GET`
- **描述**: 获取节点的详细信息，包括QA对、子节点和上下文。
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

#### 2.5.4 获取节点的子节点

- **URL**: `/nodes/{node_id}/children`
- **方法**: `GET`
- **描述**: 获取节点的所有子节点。
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

#### 2.5.5 更新节点

- **URL**: `/nodes/{node_id}`
- **方法**: `PUT`
- **描述**: 更新节点信息。
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

#### 2.5.6 合并节点

- **URL**: `/nodes/merge`
- **方法**: `POST`
- **描述**: 将多个节点合并为一个新的分支。
- **请求体**:
  ```json
  {
    "node_ids": ["节点ID1", "节点ID2", "节点ID3"],
    "session_id": "会话ID",
    "new_parent_id": "新的父节点ID",
    "merge_strategy": "sequential"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "节点已合并",
    "nodes": [
      {
        "id": "新节点ID1",
        "parent_id": "新的父节点ID"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点或会话不存在
  - `VALIDATION_ERROR`: 参数验证失败

#### 2.5.7 拆分节点

- **URL**: `/nodes/split`
- **方法**: `POST`
- **描述**: 将一个节点拆分为多个节点。
- **请求体**:
  ```json
  {
    "node_id": "节点ID",
    "split_points": ["QA对ID1", "QA对ID2"],
    "session_id": "会话ID",
    "new_parent_id": "新的父节点ID"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "节点已拆分",
    "nodes": [
      {
        "id": "新节点ID1",
        "parent_id": "新的父节点ID"
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点或QA对不存在
  - `VALIDATION_ERROR`: 参数验证失败

### 2.6 QA对管理API

#### 2.6.1 创建QA对

- **URL**: `/qa_pairs`
- **方法**: `POST`
- **描述**: 创建一个新的QA对。
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

#### 2.6.2 获取QA对详情

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `GET`
- **描述**: 获取QA对的详细信息，包括消息内容。
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

#### 2.6.3 更新QA对

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `PUT`
- **描述**: 更新QA对信息。
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **请求体**:
  ```json
  {
    "answer": "新的回答",
    "tags": ["新标签1", "新标签2"],
    "is_favorite": true,
    "create_version": true
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
    "answer": "新的回答"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对不存在
  - `VALIDATION_ERROR`: 参数验证失败

#### 2.6.4 删除QA对

- **URL**: `/qa_pairs/{qa_pair_id}`
- **方法**: `DELETE`
- **描述**: 删除QA对及其关联的消息。
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

#### 2.6.5 批量更新QA对

- **URL**: `/qa_pairs/batch_update`
- **方法**: `POST`
- **描述**: 批量更新多个QA对的信息。
- **请求体**:
  ```json
  {
    "qa_pair_ids": ["qa_pair_id_1", "qa_pair_id_2", "qa_pair_id_3"],
    "tags": ["标签1", "标签2"],
    "is_favorite": true
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "QA对已批量更新",
    "updated_count": 3
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 部分QA对不存在
  - `VALIDATION_ERROR`: 参数验证失败

#### 2.6.6 获取QA对历史版本

- **URL**: `/qa_pairs/{qa_pair_id}/versions`
- **方法**: `GET`
- **描述**: 获取QA对的历史版本。
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **响应**:
  ```json
  {
    "versions": [
      {
        "id": "版本ID1",
        "qa_pair_id": "QA对ID",
        "answer": "旧的回答1",
        "created_at": "创建时间1",
        "created_by": "用户ID1"
      },
      {
        "id": "版本ID2",
        "qa_pair_id": "QA对ID",
        "answer": "旧的回答2",
        "created_at": "创建时间2",
        "created_by": "用户ID2"
      }
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对不存在

#### 2.6.7 恢复QA对到历史版本

- **URL**: `/qa_pairs/{qa_pair_id}/restore`
- **方法**: `POST`
- **描述**: 将QA对恢复到指定的历史版本。
- **路径参数**:
  - `qa_pair_id`: QA对ID
- **请求体**:
  ```json
  {
    "version_id": "版本ID"
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
    "answer": "恢复的回答"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: QA对或版本不存在
  - `VALIDATION_ERROR`: 参数验证失败

### 2.7 上下文管理API

#### 2.7.1 创建上下文

- **URL**: `/contexts`
- **方法**: `POST`
- **描述**: 创建一个新的上下文。
- **请求体**:
  ```json
  {
    "mode": "chat或deepdive",
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
  - `RESOURCE_NOT_FOUND`: 根节点或活动节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `INVALID_REQUEST`: 无效的模式

#### 2.7.2 获取上下文详情

- **URL**: `/contexts/{context_id}`
- **方法**: `GET`
- **描述**: 获取上下文的详细信息，包括关联的节点。
- **路径参数**:
  - `context_id`: 上下文ID
- **查询参数**:
  - `include_nodes`: 是否包含上下文下的节点信息（可选，默认为false）
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

#### 2.7.3 更新上下文

- **URL**: `/contexts/{context_id}`
- **方法**: `PUT`
- **描述**: 更新上下文信息，如活动节点。
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
  - `RESOURCE_NOT_FOUND`: 上下文或活动节点不存在
  - `VALIDATION_ERROR`: 参数验证失败

#### 2.7.4 删除上下文

- **URL**: `/contexts/{context_id}`
- **方法**: `DELETE`
- **描述**: 删除上下文及其关联的ContextNode记录。
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

#### 2.7.5 创建深挖上下文

- **URL**: `/nodes/{node_id}/deepdive`
- **方法**: `POST`
- **描述**: 创建一个以指定节点为根的深挖上下文。
- **路径参数**:
  - `node_id`: 节点ID
- **请求体**:
  ```json
  {
    "session_id": "会话ID",
    "source": "来源（可选）"
  }
  ```
- **响应**:
  ```json
  {
    "id": "上下文ID",
    "context_id": "上下文标识符",
    "mode": "deepdive",
    "session_id": "会话ID",
    "context_root_node_id": "节点ID",
    "active_node_id": "节点ID",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "source": "来源"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 节点不存在
  - `VALIDATION_ERROR`: 参数验证失败

### 2.8 上下文节点关系API

#### 2.8.1 添加节点到上下文

- **URL**: `/contexts/{context_id}/nodes`
- **方法**: `POST`
- **描述**: 将节点添加到上下文中。
- **路径参数**:
  - `context_id`: 上下文ID
- **请求体**:
  ```json
  {
    "node_id": "节点ID",
    "relation_type": "关系类型（可选，默认为'member'）"
  }
  ```
- **响应**:
  ```json
  {
    "id": "关系ID",
    "context_id": "上下文ID",
    "node_id": "节点ID",
    "relation_type": "关系类型",
    "created_at": "创建时间"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文或节点不存在
  - `VALIDATION_ERROR`: 参数验证失败
  - `INVALID_REQUEST`: 节点已在上下文中

#### 2.8.2 获取上下文下的所有节点

- **URL**: `/contexts/{context_id}/nodes`
- **方法**: `GET`
- **描述**: 获取上下文下的所有节点。
- **路径参数**:
  - `context_id`: 上下文ID
- **查询参数**:
  - `relation_type`: 关系类型（可选）
  - `include_qa`: 是否包含QA对信息（可选，默认为false）
- **响应**:
  ```json
  {
    "items": [
      {
        "id": "关系ID",
        "context_id": "上下文ID",
        "node_id": "节点ID",
        "relation_type": "关系类型",
        "created_at": "创建时间",
        "node": {
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
          ]
        }
      },
      ...
    ]
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文不存在

#### 2.8.3 从上下文中移除节点

- **URL**: `/contexts/{context_id}/nodes/{node_id}`
- **方法**: `DELETE`
- **描述**: 从上下文中移除节点。
- **路径参数**:
  - `context_id`: 上下文ID
  - `node_id`: 节点ID
- **响应**:
  ```json
  {
    "success": true,
    "message": "节点已从上下文中移除"
  }
  ```
- **错误**:
  - `RESOURCE_NOT_FOUND`: 上下文、节点或关系不存在
  - `INVALID_REQUEST`: 无法移除根节点或活动节点

### 2.9 搜索API

#### 2.9.1 搜索QA对

- **URL**: `/search/qa_pairs`
- **方法**: `GET`
- **描述**: 搜索QA对。
- **查询参数**:
  - `query`: 搜索关键词
  - `search_type`: 搜索类型（可选，默认为'keyword'，可选值：'keyword'、'full_text'、'semantic'）
  - `session_id`: 会话ID（可选）
  - `context_id`: 上下文ID（可选）
  - `tags`: 标签列表，逗号分隔（可选）
  - `is_favorite`: 是否收藏（可选）
  - `date_from`: 开始日期（可选）
  - `date_to`: 结束日期（可选）
  - `sort_by`: 排序字段（可选，默认为'created_at'）
  - `sort_order`: 排序顺序（可选，默认为'desc'）
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
        "answer": "回答"
      },
      ...
    ]
  }
  ```

#### 2.9.2 搜索建议

- **URL**: `/search/suggestions`
- **方法**: `GET`
- **描述**: 获取搜索建议。
- **查询参数**:
  - `query`: 部分关键词
  - `limit`: 建议数量（可选，默认为5）
- **响应**:
  ```json
  {
    "suggestions": [
      "建议1",
      "建议2",
      "建议3",
      ...
    ]
  }
  ```

### 2.10 LLM服务API

#### 2.10.1 调用LLM获取回答

- **URL**: `/ask`
- **方法**: `POST`
- **描述**: 调用LLM获取回答。
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
- **错误**:
  - `UNAUTHORIZED`: API密钥无效
  - `VALIDATION_ERROR`: 参数验证失败
  - `INTERNAL_ERROR`: LLM服务调用失败

## 3. WebSocket API

### 3.1 连接WebSocket

- **URL**: `ws://api.example.com/ws`
- **查询参数**:
  - `session_id`: 会话ID（可选）
  - `event_types`: 事件类型，逗号分隔（可选）

### 3.2 事件类型

#### 3.2.1 节点创建事件

```json
{
  "type": "node_created",
  "data": {
    "node_id": "节点ID",
    "parent_id": "父节点ID",
    "session_id": "会话ID",
    "context_id": "上下文ID",
    "created_at": "创建时间"
  }
}
```

#### 3.2.2 QA对创建事件

```json
{
  "type": "qa_pair_created",
  "data": {
    "qa_pair_id": "QA对ID",
    "node_id": "节点ID",
    "session_id": "会话ID",
    "created_at": "创建时间"
  }
}
```

#### 3.2.3 上下文更新事件

```json
{
  "type": "context_updated",
  "data": {
    "context_id": "上下文ID",
    "active_node_id": "新的活动节点ID",
    "updated_at": "更新时间"
  }
}
```

### 3.3 获取事件历史记录

- **URL**: `/events`
- **方法**: `GET`
- **描述**: 获取历史事件。
- **查询参数**:
  - `session_id`: 会话ID（可选）
  - `after`: 事件ID（可选）
  - `limit`: 每页数量（可选，默认为100）
- **响应**:
  ```json
  {
    "events": [
      {
        "id": "事件ID1",
        "type": "node_created",
        "data": {
          "node_id": "节点ID",
          "parent_id": "父节点ID",
          "session_id": "会话ID",
          "context_id": "上下文ID",
          "created_at": "创建时间"
        },
        "timestamp": "事件时间1"
      },
      ...
    ]
  }
  ```

## 4. SDK与代码示例

### 4.1 JavaScript/TypeScript SDK

```typescript
// 创建客户端
const client = new SynCraftClient({
  baseUrl: 'https://api.example.com',
  apiVersion: 'v1'
});

// 创建会话
const session = await client.sessions.create({
  name: '新会话',
  user_id: 'local'
});

// 创建节点和QA对
const { node, qa_pair } = await client.nodes.createWithQA({
  parent_id: session.root_node_id,
  session_id: session.id,
  context_id: session.main_context.id,
  question: '用户的问题',
  answer: 'AI的回答'
});

// 更新上下文活动节点
const context = await client.contexts.update(session.main_context.id, {
  active_node_id: node.id
});

// 搜索QA对
const searchResults = await client.search.qa_pairs({
  query: '关键词',
  session_id: session.id
});
```

### 4.2 Python SDK

```python
# 创建客户端
client = SynCraftClient(
    base_url='https://api.example.com',
    api_version='v1'
)

# 创建会话
session = client.sessions.create(
    name='新会话',
    user_id='local'
)

# 创建节点和QA对
result = client.nodes.create_with_qa(
    parent_id=session.root_node_id,
    session_id=session.id,
    context_id=session.main_context.id,
    question='用户的问题',
    answer='AI的回答'
)
node = result.node
qa_pair = result.qa_pair

# 更新上下文活动节点
context = client.contexts.update(
    context_id=session.main_context.id,
    active_node_id=node.id
)

# 搜索QA对
search_results = client.search.qa_pairs(
    query='关键词',
    session_id=session.id
)
```

## 5. 附录

### 5.1 错误码列表

| 错误码 | HTTP状态码 | 说明 |
|-------|-----------|------|
| INVALID_REQUEST | 400 | 请求格式错误 |
| RESOURCE_NOT_FOUND | 404 | 资源不存在 |
| PERMISSION_DENIED | 403 | 权限不足 |
| VALIDATION_ERROR | 422 | 参数验证失败 |
| INTERNAL_ERROR | 500 | 内部服务器错误 |
| UNAUTHORIZED | 401 | 未授权（API密钥无效） |

### 5.2 关系类型列表

| 关系类型 | 说明 |
|---------|------|
| root | 根节点 |
| active | 活动节点 |
| member | 普通成员 |
| root,active | 既是根节点又是活动节点 |

### 5.3 上下文模式列表

| 模式 | 说明 |
|------|------|
| chat | 主聊天上下文 |
| deepdive | 深挖上下文 |

### 5.4 OpenAPI规范

完整的OpenAPI规范文档可以通过以下URL访问：

```
https://api.example.com/docs/openapi.json
```

### 5.5 API文档

交互式API文档可以通过以下URL访问：

```
https://api.example.com/docs
```
