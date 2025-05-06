# backend/app/api/contexts.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.database import get_session
from app.models.node import Node
from app.models.context import Context
from app.models.context_node import ContextNode
from app.services.context_service import ContextService
from app.services.node_service import NodeService

router = APIRouter()

# 请求和响应模型
class ContextCreate(BaseModel):
    mode: str
    session_id: str
    context_root_node_id: str
    active_node_id: Optional[str] = None
    source: Optional[str] = None

class ContextResponse(BaseModel):
    id: str
    context_id: str
    mode: str
    session_id: str
    context_root_node_id: str
    active_node_id: str
    created_at: datetime
    updated_at: datetime
    source: Optional[str] = None

class ContextUpdate(BaseModel):
    active_node_id: str

class ContextNodeBrief(BaseModel):
    id: str
    relation_type: str

class ContextDetailResponse(ContextResponse):
    nodes: List[ContextNodeBrief] = []

class SuccessResponse(BaseModel):
    success: bool
    message: str

# API路由
@router.post("/contexts", response_model=ContextResponse)
def create_context(
    context_data: ContextCreate,
    db: Session = Depends(get_session)
):
    """创建上下文"""
    # 使用ContextService创建上下文
    context_service = ContextService(db)
    node_service = NodeService(db)
    
    # 检查根节点是否存在
    root_node = node_service.get_node(context_data.context_root_node_id)
    if not root_node:
        raise HTTPException(status_code=404, detail="Root node not found")
    
    # 如果未提供active_node_id，使用context_root_node_id
    active_node_id = context_data.active_node_id or context_data.context_root_node_id
    
    # 检查活动节点是否存在
    active_node = node_service.get_node(active_node_id)
    if not active_node:
        raise HTTPException(status_code=404, detail="Active node not found")
    
    try:
        # 创建上下文
        context = context_service.create_context(
            session_id=context_data.session_id,
            context_root_node_id=context_data.context_root_node_id,
            mode=context_data.mode,
            source=context_data.source
        )
        
        # 如果活动节点不是根节点，更新活动节点
        if active_node_id != context_data.context_root_node_id:
            context = context_service.update_context(
                context_id=context.id,
                active_node_id=active_node_id
            )
        
        return context
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/contexts/{context_id}", response_model=ContextDetailResponse)
def get_context(
    context_id: str,
    include_nodes: bool = False,
    db: Session = Depends(get_session)
):
    """获取上下文详情"""
    # 使用ContextService获取上下文
    context_service = ContextService(db)
    
    # 获取上下文
    context = context_service.get_context(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    # 构建基本响应
    response = ContextDetailResponse(
        id=context.id,
        context_id=context.context_id,
        mode=context.mode,
        session_id=context.session_id,
        context_root_node_id=context.context_root_node_id,
        active_node_id=context.active_node_id,
        created_at=context.created_at,
        updated_at=context.updated_at,
        source=context.source
    )
    
    # 如果需要包含节点信息
    if include_nodes:
        # 获取上下文中的节点
        nodes_data = context_service.get_context_nodes(context_id)
        
        node_briefs = []
        for node_data in nodes_data:
            node_briefs.append(ContextNodeBrief(
                id=node_data["id"],
                relation_type=node_data["relation_type"]
            ))
        
        response.nodes = node_briefs
    
    return response

@router.put("/contexts/{context_id}", response_model=ContextResponse)
def update_context(
    context_id: str,
    context_data: ContextUpdate,
    db: Session = Depends(get_session)
):
    """更新上下文"""
    # 使用ContextService更新上下文
    context_service = ContextService(db)
    node_service = NodeService(db)
    
    # 检查活动节点是否存在
    active_node = node_service.get_node(context_data.active_node_id)
    if not active_node:
        raise HTTPException(status_code=404, detail="Active node not found")
    
    try:
        # 更新上下文
        context = context_service.update_context(
            context_id=context_id,
            active_node_id=context_data.active_node_id
        )
        
        if not context:
            raise HTTPException(status_code=404, detail="Context not found")
        
        return context
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/contexts/{context_id}", response_model=SuccessResponse)
def delete_context(
    context_id: str,
    db: Session = Depends(get_session)
):
    """删除上下文"""
    # 使用ContextService删除上下文
    context_service = ContextService(db)
    
    # 删除上下文
    success = context_service.delete_context(context_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Context not found")
    
    return SuccessResponse(
        success=True,
        message="上下文已删除"
    )

@router.get("/contexts/by-context-id/{context_id_str}", response_model=ContextResponse)
def get_context_by_context_id(
    context_id_str: str,
    db: Session = Depends(get_session)
):
    """通过上下文ID字符串获取上下文"""
    # 使用ContextService获取上下文
    context_service = ContextService(db)
    
    # 获取上下文
    context = context_service.get_context_by_context_id(context_id_str)
    
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    return context

@router.post("/contexts/{context_id}/nodes/{node_id}", response_model=ContextNodeBrief)
def add_node_to_context(
    context_id: str,
    node_id: str,
    relation_type: str = "member",
    db: Session = Depends(get_session)
):
    """将节点添加到上下文"""
    # 使用ContextService将节点添加到上下文
    context_service = ContextService(db)
    
    try:
        # 添加节点到上下文
        context_node = context_service.add_node_to_context(
            context_id=context_id,
            node_id=node_id,
            relation_type=relation_type
        )
        
        return ContextNodeBrief(
            id=context_node.node_id,
            relation_type=context_node.relation_type
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/contexts/{context_id}/nodes/{node_id}", response_model=SuccessResponse)
def remove_node_from_context(
    context_id: str,
    node_id: str,
    db: Session = Depends(get_session)
):
    """从上下文中移除节点"""
    # 使用ContextService从上下文中移除节点
    context_service = ContextService(db)
    
    try:
        # 从上下文中移除节点
        success = context_service.remove_node_from_context(
            context_id=context_id,
            node_id=node_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Node not found in context")
        
        return SuccessResponse(
            success=True,
            message="节点已从上下文中移除"
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}/contexts", response_model=List[ContextResponse])
def get_session_contexts(
    session_id: str,
    db: Session = Depends(get_session)
):
    """获取会话的所有上下文"""
    # 使用ContextService获取会话的上下文
    context_service = ContextService(db)
    
    # 获取会话的上下文
    contexts = context_service.get_session_contexts(session_id)
    
    return contexts
