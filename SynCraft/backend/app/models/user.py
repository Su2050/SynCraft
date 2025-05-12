# backend/app/models/user.py
from datetime import datetime
from sqlmodel import SQLModel, Field
from nanoid import generate
from passlib.hash import bcrypt

class User(SQLModel, table=True):
    # 用户唯一标识符
    id: str = Field(default_factory=generate, primary_key=True, index=True)
    
    # 用户名，唯一
    username: str = Field(unique=True, index=True)
    
    # 密码哈希
    password_hash: str
    
    # 用户角色：admin, user
    role: str = "user"
    
    # 用户创建时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 用户更新时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 用户状态：active, inactive, suspended
    status: str = "active"
    
    # 是否是首次登录（首次登录需要修改密码）
    is_first_login: bool = True
    
    # 设置密码
    def set_password(self, password: str):
        self.password_hash = bcrypt.hash(password)
    
    # 验证密码
    def verify_password(self, password: str) -> bool:
        return bcrypt.verify(password, self.password_hash)
