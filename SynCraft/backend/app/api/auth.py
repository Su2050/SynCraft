# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

from app.database.database import get_session
from app.models.user import User
from app.core.security import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

# 请求和响应模型
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str
    is_first_login: bool

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime
    status: str
    is_first_login: bool

# API路由
@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_session)):
    """用户登录获取令牌"""
    # 查询用户
    query = select(User).where(User.username == form_data.username)
    user = db.exec(query).first()
    
    # 验证用户和密码
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查用户状态
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "is_first_login": user.is_first_login
    }

@router.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user

@router.post("/users/me/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """修改密码"""
    # 验证当前密码
    if not current_user.verify_password(password_data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    # 设置新密码
    current_user.set_password(password_data.new_password)
    current_user.is_first_login = False
    current_user.updated_at = datetime.utcnow()
    
    db.add(current_user)
    db.commit()
    
    return {"success": True, "message": "密码已修改"}
