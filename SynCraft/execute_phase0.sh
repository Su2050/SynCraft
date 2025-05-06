#!/bin/bash
# 执行阶段0：清除历史数据

# 设置工作目录
cd "$(dirname "$0")"

echo "开始执行阶段0：清除历史数据"

# 步骤1：备份现有数据（可选）
echo "步骤1：备份现有数据"
if [ -f "backend/data.db" ]; then
    echo "备份数据库..."
    sqlite3 backend/data.db .dump > backend/backup_$(date +%Y%m%d%H%M%S).sql
    echo "数据库已备份"
else
    echo "数据库文件不存在，跳过备份"
fi

# 步骤2：清除后端数据库
echo "步骤2：清除后端数据库"
cd backend
python clear_database.py
cd ..

# 步骤3：清除前端IndexedDB数据
echo "步骤3：清除前端IndexedDB数据"
echo "请在浏览器中访问应用，并在URL中添加参数：?clearData=true"
echo "例如：http://localhost:3000/?clearData=true"

# 步骤4：重置数据库模式（可选）
echo "步骤4：重置数据库模式（可选）"
read -p "是否要完全重置数据库结构？(y/n) " reset_db
if [ "$reset_db" = "y" ]; then
    echo "删除数据库文件..."
    rm -f backend/data.db
    echo "重新创建数据库..."
    cd backend
    python -c "from app.database import init_db; init_db()"
    cd ..
    echo "数据库结构已重置"
else
    echo "跳过重置数据库结构"
fi

echo "阶段0执行完成"
echo "请验证："
echo "1. 数据库表是否为空"
echo "2. 前端IndexedDB存储是否已清空"
echo "3. 应用是否可以正常启动并创建新数据"
