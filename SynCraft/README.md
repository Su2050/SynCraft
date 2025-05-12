# SynCraft

SynCraft是一个智能对话系统，支持会话管理、上下文感知和知识图谱构建。

## 项目概述

SynCraft系统由前端和后端两部分组成，提供了丰富的功能，包括：

- 会话管理：创建、查询、更新和删除会话
- 节点管理：构建会话树结构
- QA对管理：存储和管理问答对
- 上下文管理：维护对话上下文
- 搜索功能：全文搜索会话、节点和QA对
- LLM服务：集成大型语言模型
- 用户认证：JWT认证和授权
- WebSocket支持：实时通信

## 系统架构

### 前端

前端使用React + TypeScript + Vite构建，主要组件包括：

- 会话列表页面
- 聊天页面
- 用户管理页面
- 树状视图组件
- 深度探索面板

### 后端

后端使用Python + FastAPI构建，主要模块包括：

- API接口层：处理HTTP请求和响应
- 服务层：实现业务逻辑
- 模型层：定义数据结构和关系
- 数据库层：数据存储和查询
- LLM服务层：集成大语言模型
- 缓存层：提高性能

#### 核心概念

- **会话 (Session)**: 用户与系统交互的顶层容器，包含多个节点和上下文
- **节点 (Node)**: 对话的基本单位，可以包含多个问答对，形成树状结构
- **边 (Edge)**: 表示节点之间的关系，通常是从父节点到子节点的有向边
- **上下文 (Context)**: 定义当前对话的范围和焦点
- **上下文节点关系 (ContextNode)**: 定义上下文中包含的节点及其关系类型
- **问答对 (QAPair)**: 用户提问和系统回答的组合，属于特定节点
- **消息 (Message)**: 问答对中的具体内容，包括用户消息和系统消息
- **LLM服务 (LLM Service)**: 提供与大语言模型的集成
- **用户 (User)**: 系统的使用者，拥有自己的身份认证和权限

## 快速开始

### 本地开发环境设置

请参考[LOCAL_SETUP.md](./LOCAL_SETUP.md)文件了解如何设置本地开发环境。

### 使用Docker部署

1. 复制环境变量文件并根据需要修改：

```bash
cp .env.example .env
```

2. 使用Docker Compose启动服务：

```bash
docker-compose up -d
```

## API文档

详细的API文档请参考[SynCraft API规范文档](./backend/docs/SynCraft%20API规范文档.md)。

## 项目结构

```
SynCraft/
├── frontend-refactored/     # 前端代码
│   ├── src/                 # 源代码
│   │   ├── api/             # API调用
│   │   ├── components/      # 组件
│   │   ├── hooks/           # 自定义钩子
│   │   ├── pages/           # 页面
│   │   ├── store/           # 状态管理
│   │   ├── types/           # 类型定义
│   │   └── utils/           # 工具函数
│   └── public/              # 静态资源
└── backend/                 # 后端代码
    ├── app/                 # 应用代码
    │   ├── api/             # API接口
    │   ├── cache/           # 缓存管理
    │   ├── core/            # 核心功能
    │   ├── database/        # 数据库连接
    │   ├── di/              # 依赖注入
    │   ├── models/          # 数据模型
    │   ├── scripts/         # 脚本
    │   ├── services/        # 服务层
    │   ├── testAPI/         # 单元测试
    │   └── utils/           # 工具函数
    └── docs/                # 文档
        ├── architecture.md  # 架构文档
        ├── SynCraft API规范文档.md # API规范文档
        └── testing_guide.md # 测试指南
```

## 功能特点

### 会话管理

- 创建、查询、更新和删除会话
- 会话树结构可视化
- 会话上下文管理

### 节点和QA对

- 树状结构的节点管理
- 问答对存储和检索
- 标签和收藏功能

### 上下文感知

- 多种上下文模式：聊天、搜索、引用、摘要
- 上下文节点关系管理
- 活动节点跟踪

### 搜索功能

- 全文搜索QA对、节点和会话
- 高亮显示匹配内容
- 按标签和收藏筛选

### LLM服务

- 文本生成
- 流式响应
- 文本嵌入

### 用户认证

- JWT认证
- 用户管理
- 权限控制

### WebSocket支持

- 实时通信
- 事件订阅
- 流式生成回答

## 架构特点

### 分层架构
- **API层**: 处理HTTP请求和响应
- **服务层**: 实现业务逻辑
- **模型层**: 定义数据结构和关系

### 依赖注入
使用自定义依赖注入容器管理服务实例，提高可测试性和可维护性。

### 缓存机制
使用内存缓存提高性能，减少数据库查询。

### 单元测试
使用pytest进行单元测试，确保代码质量和功能正确性。

### LLM服务抽象
使用接口和工厂模式抽象LLM服务，支持多种大语言模型，并便于测试。

### 认证与授权
使用JWT令牌进行用户认证，基于角色的访问控制确保数据安全。

## 测试

SynCraft项目有完善的测试套件，包括单元测试和集成测试。

### 运行测试

项目提供了一个便捷的测试脚本，可以一键运行所有测试并生成多种格式的报告：

```bash
# 在项目根目录下运行
bash SynCraft/backend/run_tests_with_md_report.sh
```

或者手动运行测试：

```bash
# 运行所有测试
pytest SynCraft/backend/app/testAPI

# 运行特定测试文件
pytest SynCraft/backend/app/testAPI/test_session_service.py

# 生成测试覆盖率报告
pytest SynCraft/backend/app/testAPI --cov=SynCraft/backend/app
```

### 测试覆盖率

当前项目的测试覆盖率为80%，主要服务层模块的覆盖率超过90%。

详细的测试指南请参考[testing_guide.md](./backend/docs/testing_guide.md)。

## 安全性

### 输入验证
- 使用Pydantic模型验证请求数据
- 使用FastAPI的依赖项验证请求参数

### 错误处理
- 使用全局异常处理器处理异常
- 返回适当的HTTP状态码和错误消息

### API密钥验证
- 使用API密钥验证LLM服务请求
- 在请求头中传递API密钥

### JWT认证
- 使用JWT令牌进行用户认证
- 令牌包含用户ID和权限信息
- 令牌有过期时间，提高安全性

### 密码安全
- 使用Bcrypt算法加密存储密码
- 密码策略强制要求复杂性
- 支持密码重置功能

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议。请遵循以下步骤：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详情请参见[LICENSE](LICENSE)文件。
