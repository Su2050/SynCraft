# SynCraft

SynCraft是一个知识图谱构建和问答系统，通过可视化的方式帮助用户构建、管理和查询知识图谱。系统支持多会话管理、节点树形结构、上下文感知的问答等功能。

## 项目架构

SynCraft采用前后端分离的架构：

### 后端架构

- **技术栈**：Python + FastAPI
- **数据库**：PostgreSQL
- **主要模块**：
  - 会话管理（Session Management）
  - 节点管理（Node Management）
  - 问答对管理（QA Pair Management）
  - 上下文管理（Context Management）
  - 搜索服务（Search Service）
  - LLM集成（LLM Integration）

### 前端架构

- **技术栈**：TypeScript + React
- **状态管理**：Zustand
- **UI组件**：React Flow（节点可视化）
- **主要模块**：
  - API客户端层（API Client Layer）
  - 仓储层（Repository Layer）
  - 状态管理层（Store Layer）
  - UI组件层（UI Component Layer）

## 数据流架构

SynCraft采用分层架构，数据流如下：

1. **UI层**（React组件）：用户界面，处理用户交互
2. **Store层**（Zustand状态管理）：管理应用状态
3. **仓储层**（Repository）：处理数据持久化和缓存
4. **API客户端层**（API Client）：与后端API通信
5. **后端API**：处理业务逻辑和数据存储

## 特性

- **多会话管理**：支持创建、切换、删除多个会话
- **节点树形结构**：以树形结构组织知识节点
- **上下文感知的问答**：基于节点上下文进行问答
- **离线支持**：支持在离线状态下工作，网络恢复后自动同步
- **数据一致性**：使用事务机制确保数据一致性
- **错误处理**：完善的错误处理和恢复机制
- **缓存策略**：多级缓存策略，提高性能

## 安装指南

### 环境要求

- Node.js 16+
- Python 3.9+
- PostgreSQL 13+

### 后端安装

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/SynCraft.git
   cd SynCraft
   ```

2. 创建并激活Python虚拟环境
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # 或
   venv\Scripts\activate  # Windows
   ```

3. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

4. 配置环境变量
   ```bash
   cp .env.example .env
   # 编辑.env文件，设置数据库连接等配置
   ```

5. 初始化数据库
   ```bash
   python init_db.py
   ```

6. 启动后端服务
   ```bash
   uvicorn app.main:app --reload
   ```

### 前端安装

1. 进入前端目录
   ```bash
   cd frontend
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

## 使用指南

### 创建会话

1. 点击左侧边栏的"+"按钮
2. 输入会话名称
3. 点击"创建"按钮

### 添加节点

1. 选择一个会话
2. 点击节点上的"+"按钮
3. 输入问题
4. 系统会自动生成回答并创建新节点

### 查看节点详情

1. 点击节点
2. 右侧面板会显示节点详情，包括问题和回答

### 搜索

1. 在顶部搜索框输入关键词
2. 系统会搜索相关节点和问答对
3. 点击搜索结果可以跳转到对应节点

## 项目结构

```
SynCraft/
├── backend/                # 后端代码
│   ├── app/                # 应用代码
│   │   ├── api/            # API端点
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   ├── database/       # 数据库连接
│   │   ├── utils/          # 工具函数
│   │   └── main.py         # 应用入口
│   ├── docs/               # 文档
│   └── requirements.txt    # 依赖列表
│
├── frontend/               # 前端代码
│   ├── src/                # 源代码
│   │   ├── api/            # API客户端
│   │   ├── components/     # React组件
│   │   ├── hooks/          # React钩子
│   │   ├── repositories/   # 数据仓储
│   │   ├── store/          # 状态管理
│   │   ├── types/          # TypeScript类型
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── package.json        # 依赖配置
│
├── docker-compose.yml      # Docker配置
└── README.md               # 项目说明
```

## 架构设计

### 前端架构

前端采用分层架构，主要包括：

1. **API客户端层**：封装对后端API的调用，处理请求、响应和错误
2. **仓储层**：处理数据持久化和缓存，提供数据访问接口
3. **状态管理层**：使用Zustand管理应用状态
4. **UI组件层**：React组件，处理用户交互和界面渲染

### 数据流

1. 用户在UI上进行操作
2. UI组件调用Store层的方法
3. Store层调用仓储层的方法
4. 仓储层调用API客户端层的方法
5. API客户端层向后端发送请求
6. 后端处理请求并返回响应
7. 响应沿着相反的路径返回到UI

### 错误处理

系统实现了完善的错误处理机制：

1. **API错误**：区分网络错误、超时错误、服务器错误、认证错误等
2. **重试机制**：对于临时性网络问题，自动重试
3. **回退机制**：API调用失败时，回退到本地存储
4. **用户提示**：提供用户友好的错误提示

### 缓存策略

系统实现了多级缓存策略：

1. **内存缓存**：使用Zustand存储当前会话的数据
2. **IndexedDB**：使用IndexedDB存储所有会话的数据
3. **API缓存**：缓存API响应，减少网络请求

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

项目维护者 - 您的名字 - 您的邮箱

项目链接: [https://github.com/yourusername/SynCraft](https://github.com/yourusername/SynCraft)
