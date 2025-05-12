# SynCraft本地启动指南

本文档提供了在本地环境中启动SynCraft项目的详细步骤。

## 前提条件

确保您的系统已安装以下软件：

- **Node.js** (v16.0.0或更高版本)
- **Python** (v3.9或更高版本)
- **SQLite** (用于开发环境)或 **PostgreSQL** (v13或更高版本，用于生产环境)
- **Git**

您可以使用以下命令检查它们是否已安装：

```bash
node --version
python --version
sqlite3 --version  # 或 psql --version
git --version
```

## 1. 克隆项目

首先，克隆项目仓库到本地：

```bash
git clone https://github.com/yourusername/SynCraft.git
cd SynCraft
```

## 2. 后端设置

### 2.1 设置Python虚拟环境

```bash
cd backend
python -m venv venv

# 在Linux/macOS上激活虚拟环境
source venv/bin/activate

# 在Windows上激活虚拟环境
# venv\Scripts\activate
```

### 2.2 安装后端依赖

```bash
pip install -r requirements.txt
```

### 2.3 配置环境变量

```bash
cp .env.example .env
```

使用您喜欢的文本编辑器打开`.env`文件，并根据您的本地环境设置以下变量：

```
# 开发环境使用SQLite
DATABASE_URL=sqlite:///./syncraft.db
# 生产环境使用PostgreSQL
# DATABASE_URL=postgresql://username:password@localhost:5432/syncraft
SECRET_KEY=your_secret_key_here
DEBUG=True
LLM_API_KEY=your_llm_api_key_here  # 如果使用真实LLM服务
TESTING=false  # 设置为true使用模拟LLM服务
```

请将`username`、`password`替换为您的PostgreSQL用户名和密码（如果使用PostgreSQL）。

### 2.4 初始化数据库

对于SQLite（开发环境）：

```bash
python init_db.py
```

对于PostgreSQL（生产环境）：

```bash
# 在PostgreSQL中创建数据库
psql -U postgres -c "CREATE DATABASE syncraft;"

# 初始化数据库
python init_db.py
```

### 2.5 初始化用户

```bash
python -m app.scripts.init_users
```

这将创建默认的管理员用户（用户名：admin，密码：admin）。

### 2.6 启动后端服务器

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务器将在`http://localhost:8000`上运行。您可以访问`http://localhost:8000/docs`查看API文档。

## 3. 前端设置

### 3.1 安装前端依赖

在新的终端窗口中，导航到项目的前端目录：

```bash
cd SynCraft/frontend-refactored
npm install
```

### 3.2 配置前端环境

如果需要，创建或修改`.env.local`文件：

```bash
touch .env.local
```

添加以下内容：

```
VITE_API_BASE_URL=http://localhost:8000
```

### 3.3 启动前端开发服务器

```bash
npm run dev
```

前端开发服务器将在`http://localhost:5173`上运行。

## 4. 访问应用

打开浏览器，访问`http://localhost:5173`即可使用SynCraft应用。

默认登录凭据：
- 用户名：admin
- 密码：admin

## 5. 常见问题解决

### 5.1 后端连接问题

如果前端无法连接到后端API，请检查：

1. 后端服务器是否正在运行
2. CORS设置是否正确
3. 前端环境变量中的API基础URL是否正确

### 5.2 数据库连接问题

如果后端无法连接到数据库，请检查：

1. 数据库文件（SQLite）或服务（PostgreSQL）是否存在和正常
2. `.env`文件中的数据库URL是否正确
3. 数据库用户是否有足够的权限

### 5.3 依赖安装问题

如果遇到依赖安装问题，可以尝试：

```bash
# 后端
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir

# 前端
npm cache clean --force
npm install
```

### 5.4 LLM服务问题

如果LLM服务无法正常工作，请检查：

1. `.env`文件中的LLM_API_KEY是否正确
2. 网络连接是否正常
3. 如果只是测试，可以设置TESTING=true使用模拟LLM服务

## 6. 使用Docker启动（推荐方式）

SynCraft项目已经完全容器化，使用Docker是最简单、最一致的启动方式。这种方式不需要在本地安装Python、Node.js或数据库，只需要安装Docker和Docker Compose。

### 6.1 安装Docker和Docker Compose

如果您尚未安装Docker和Docker Compose，请按照以下链接的指南进行安装：
- [安装Docker](https://docs.docker.com/get-docker/)
- [安装Docker Compose](https://docs.docker.com/compose/install/)

### 6.2 配置环境变量

在项目根目录下创建`.env`文件：

```bash
cp .env.example .env
```

编辑`.env`文件，设置必要的环境变量。

### 6.3 启动服务

在项目根目录下运行以下命令启动所有服务：

```bash
docker-compose up
```

这将启动以下服务：
- **前端服务**：运行在Node.js容器中，端口映射为`3000:5173`
- **后端服务**：使用自定义Dockerfile构建，端口映射为`8000:8000`
- **数据库服务**：使用SQLite或PostgreSQL，取决于配置

首次启动可能需要一些时间来构建镜像和安装依赖。

### 6.4 在后台运行服务

如果您想在后台运行服务，可以使用`-d`选项：

```bash
docker-compose up -d
```

### 6.5 查看日志

要查看所有服务的日志：

```bash
docker-compose logs
```

要查看特定服务的日志：

```bash
docker-compose logs frontend
# 或
docker-compose logs backend
```

要实时查看日志：

```bash
docker-compose logs -f
```

### 6.6 停止服务

要停止所有服务：

```bash
docker-compose down
```

如果您想同时删除所有创建的卷（这将删除所有数据）：

```bash
docker-compose down -v
```

### 6.7 重建服务

如果您修改了Dockerfile或依赖，需要重建服务：

```bash
docker-compose build
# 或者直接重建并启动
docker-compose up --build
```

### 6.8 访问应用

启动服务后，您可以通过以下URL访问应用：
- 前端：http://localhost:3000
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

## 7. 开发模式

### 7.1 后端开发

在开发后端时，您可以使用以下命令运行测试：

```bash
cd backend
pytest app/testAPI
```

或者生成测试覆盖率报告：

```bash
pytest app/testAPI --cov=app --cov-report=html
```

或者使用提供的测试脚本：

```bash
./run_tests_with_md_report.sh
```

这将运行所有测试并生成多种格式的报告，包括HTML格式的覆盖率报告和Markdown格式的测试结果报告。

### 7.2 前端开发

在开发前端时，您可以使用以下命令运行测试：

```bash
cd frontend-refactored
npm test
```

或者检查代码风格：

```bash
npm run lint
```

### 7.3 调试模式

#### 后端调试

在VSCode中，您可以使用以下配置进行后端调试：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000"
      ],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

#### 前端调试

在浏览器中使用开发者工具进行前端调试。在VSCode中，您可以使用以下配置进行前端调试：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend-refactored"
    }
  ]
}
```

## 8. 生产环境构建

### 8.1 构建前端

```bash
cd frontend-refactored
npm run build
```

构建后的文件将位于`dist`目录中。

### 8.2 配置后端生产环境

修改`.env`文件：

```
DEBUG=False
DATABASE_URL=postgresql://username:password@localhost:5432/syncraft
```

### 8.3 启动生产服务器

```bash
cd backend
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000
```

## 9. 项目结构参考

请参考项目根目录下的`README.md`文件，了解项目的详细结构和架构设计。

## 10. 系统架构

SynCraft系统由前端和后端两部分组成：

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

详细的架构文档请参考[architecture.md](./backend/docs/architecture.md)。

## 11. API文档

详细的API文档请参考[SynCraft API规范文档](./backend/docs/SynCraft%20API规范文档.md)。

## 12. 测试指南

详细的测试指南请参考[testing_guide.md](./backend/docs/testing_guide.md)。
