# backend/app/api/admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import secrets
import string

from app.database.database import get_session
from app.models.user import User
from app.core.security import admin_required

router = APIRouter()

# 请求和响应模型
class UserCreate(BaseModel):
    username: str
    role: str = "user"

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime
    status: str
    is_first_login: bool

class UserResponseWithPassword(UserResponse):
    initial_password: str

class UserList(BaseModel):
    total: int
    items: List[UserResponse]

class UserUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

# 辅助函数：生成随机密码
def generate_random_password(length=10):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# API路由
@router.post("/users", response_model=UserResponseWithPassword)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_session),
    admin: User = Depends(admin_required)
):
    """创建新用户（仅管理员）"""
    # 检查用户名是否已存在
    query = select(User).where(User.username == user_data.username)
    existing_user = db.exec(query).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 生成随机初始密码
    initial_password = generate_random_password()
    
    # 创建新用户
    new_user = User(
        username=user_data.username,
        role=user_data.role,
        is_first_login=True
    )
    new_user.set_password(initial_password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 返回用户信息和初始密码
    return UserResponseWithPassword(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        created_at=new_user.created_at,
        status=new_user.status,
        is_first_login=new_user.is_first_login,
        initial_password=initial_password
    )

@router.get("/users", response_model=UserList)
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_session),
    admin: User = Depends(admin_required)
):
    """获取用户列表（仅管理员）"""
    query = select(User).offset(skip).limit(limit)
    users = db.exec(query).all()
    
    return {
        "total": len(users),
        "items": users
    }

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_session),
    admin: User = Depends(admin_required)
):
    """更新用户信息（仅管理员）"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新用户信息
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.status is not None:
        user.status = user_data.status
    
    user.updated_at = datetime.utcnow()
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_session),
    admin: User = Depends(admin_required)
):
    """删除用户（仅管理员）"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 防止删除自己
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "用户已删除"}

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    db: Session = Depends(get_session),
    admin: User = Depends(admin_required)
):
    """重置用户密码（仅管理员）"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 生成新的随机密码
    new_password = generate_random_password()
    
    # 更新用户密码
    user.set_password(new_password)
    user.is_first_login = True
    user.updated_at = datetime.utcnow()
    
    db.add(user)
    db.commit()
    
    return {
        "success": True,
        "message": "密码已重置",
        "new_password": new_password
    }
