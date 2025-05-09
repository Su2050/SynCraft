FROM python:3.10-slim

# 1) 复制并安装依赖
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2) 复制代码
COPY backend/app ./app

# 3) 创建数据库目录并设置权限
RUN mkdir -p /app/db && chmod 777 /app/db

# 4) 默认启动命令（可调）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
