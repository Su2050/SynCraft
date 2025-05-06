# SynCraft本地启动指南

本文档提供了在本地环境中启动SynCraft项目的详细步骤。

## 前提条件

确保您的系统已安装以下软件：

- **Node.js** (v16.0.0或更高版本)
- **Python** (v3.9或更高版本)
- **PostgreSQL** (v13或更高版本)
- **Git**

您可以使用以下命令检查它们是否已安装：

```bash
node --version
python --version
psql --version
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
DATABASE_URL=postgresql://username:password@localhost:5432/syncraft
SECRET_KEY=your_secret_key_here
DEBUG=True
```

请将`username`、`password`替换为您的PostgreSQL用户名和密码。

### 2.4 创建数据库

在PostgreSQL中创建数据库：

```bash
psql -U postgres
```

在PostgreSQL命令行中执行：

```sql
CREATE DATABASE syncraft;
```

### 2.5 初始化数据库

```bash
python init_db.py
```

### 2.6 启动后端服务器

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务器将在`http://localhost:8000`上运行。您可以访问`http://localhost:8000/docs`查看API文档。

## 3. 前端设置

### 3.1 安装前端依赖

在新的终端窗口中，导航到项目的前端目录：

```bash
cd SynCraft/frontend
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

## 5. 常见问题解决

### 5.1 后端连接问题

如果前端无法连接到后端API，请检查：

1. 后端服务器是否正在运行
2. CORS设置是否正确
3. 前端环境变量中的API基础URL是否正确

### 5.2 数据库连接问题

如果后端无法连接到数据库，请检查：

1. PostgreSQL服务是否正在运行
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

## 6. 使用Docker启动（推荐方式）

SynCraft项目已经完全容器化，使用Docker是最简单、最一致的启动方式。这种方式不需要在本地安装Python、Node.js或PostgreSQL，只需要安装Docker和Docker Compose。

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
pytest
```

或者生成测试报告：

```bash
./run_tests_with_md_report.sh
```

### 7.2 前端开发

在开发前端时，您可以使用以下命令运行测试：

```bash
cd frontend
npm test
```

或者检查代码风格：

```bash
npm run lint
```

## 8. 生产环境构建

### 8.1 构建前端

```bash
cd frontend
npm run build
```

构建后的文件将位于`dist`目录中。

### 8.2 配置后端生产环境

修改`.env`文件：

```
DEBUG=False
```

### 8.3 启动生产服务器

```bash
cd backend
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000
```

## 9. 项目结构参考

请参考项目根目录下的`README.md`文件，了解项目的详细结构和架构设计。
