# backend/app/scripts/init_users.py
from sqlmodel import Session, select
from app.database.database import engine
from app.models.user import User
import os
import sys
import argparse
import secrets
import string

def generate_random_password(length=12):
    """生成随机密码"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    # 确保密码包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isupper() for c in password) and
            any(c.islower() for c in password) and
            any(c.isdigit() for c in password) and
            any(c in string.punctuation for c in password)):
            return password

def init_admin_user(admin_username="admin", admin_password=None):
    """初始化管理员用户"""
    print("开始初始化管理员用户...")
    
    # 如果没有提供密码，生成随机密码
    if not admin_password:
        admin_password = generate_random_password()
    
    # 创建数据库会话
    with Session(engine) as db:
        # 检查是否已有管理员用户
        query = select(User).where(User.role == "admin")
        existing_admin = db.exec(query).first()
        
        if existing_admin:
            print(f"已存在管理员用户: {existing_admin.username}")
            return
        
        # 创建管理员用户
        admin_user = User(username=admin_username, role="admin")
        admin_user.set_password(admin_password)
        
        db.add(admin_user)
        db.commit()
        
        print(f"管理员用户创建成功!")
        print(f"用户名: {admin_username}")
        print(f"密码: {admin_password}")
        print("请妥善保管以上信息，并在首次登录后修改密码。")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="初始化用户")
    parser.add_argument("--admin-username", default="admin", help="管理员用户名")
    parser.add_argument("--admin-password", help="管理员密码（如不提供则自动生成）")
    
    args = parser.parse_args()
    init_admin_user(args.admin_username, args.admin_password)
