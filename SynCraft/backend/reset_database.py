# reset_database.py
import os
import sys
from pathlib import Path

# 获取项目根目录和后端目录
current_dir = Path(__file__).parent
project_root = current_dir.parent

# 数据库文件路径
db_path = project_root / "data.db"
backend_db_path = current_dir / "data.db"

def reset_database():
    """删除数据库文件并重新初始化数据库"""
    # 删除根目录下的数据库文件（如果存在）
    if db_path.exists():
        print(f"删除数据库文件: {db_path}")
        os.remove(db_path)
    
    # 删除backend目录下的数据库文件（如果存在）
    if backend_db_path.exists():
        print(f"删除数据库文件: {backend_db_path}")
        os.remove(backend_db_path)
    
    # 导入初始化数据库的函数
    from init_db import init_db
    
    # 初始化数据库
    print("初始化数据库...")
    init_db()
    print("数据库重置完成！")

if __name__ == "__main__":
    reset_database()
