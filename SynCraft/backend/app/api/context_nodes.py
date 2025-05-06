# backend/app/api/context_nodes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.database import get_session
from app.models.node import Node
from app.models.context import Context
from app.models.context_node import ContextNode
from app.di.container import get_context_service, get_node_service, get_qa_pair_service

router = APIRouter()

# 请求和响应模型
class ContextNodeCreate(BaseModel):
    node_id: str
    relation_type: Optional[str] = "member"

class ContextNodeResponse(BaseModel):
    id: str
    context_id: str
    node_id: str
    relation_type: str
    created_at: datetime

class NodeBrief(BaseModel):
    id: str
    session_id: str
    template_key: Optional[str] = None
    created_at: datetime

class QAPairBrief(BaseModel):
    id: str
    question: str
    answer: Optional[str] = None

class ContextNodeWithNodeResponse(ContextNodeResponse):
    node: NodeBrief
    qa_pairs: List[QAPairBrief] = []

class ContextBrief(BaseModel):
    id: str
    context_id: str
    mode: str
    session_id: str
    context_root_node_id: str
    active_node_id: str

class ContextNodeWithContextResponse(ContextNodeResponse):
    context: ContextBrief

class ContextNodesResponse(BaseModel):
    items: List[ContextNodeWithNodeResponse]

class NodeContextsResponse(BaseModel):
    items: List[ContextNodeWithContextResponse]

class SuccessResponse(BaseModel):
    success: bool
    message: str

# API路由
@router.post("/contexts/{context_id}/nodes", response_model=ContextNodeResponse)
def add_node_to_context(
    context_id: str,
    context_node_data: ContextNodeCreate,
    context_service = Depends(get_context_service),
    node_service = Depends(get_node_service)
):
    """添加节点到上下文"""
    
    # 检查上下文是否存在
    context = context_service.get_context(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    # 检查节点是否存在
    node = node_service.get_node(context_node_data.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    try:
        # 添加节点到上下文
        context_node = context_service.add_node_to_context(
            context_id=context_id,
            node_id=context_node_data.node_id,
            relation_type=context_node_data.relation_type
        )
        
        return ContextNodeResponse(
            id=context_node.id,
            context_id=context_node.context_id,
            node_id=context_node.node_id,
            relation_type=context_node.relation_type,
            created_at=context_node.created_at
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/contexts/{context_id}/nodes", response_model=ContextNodesResponse)
def get_context_nodes(
    context_id: str,
    relation_type: Optional[str] = None,
    include_qa: bool = False,
    context_service = Depends(get_context_service),
    node_service = Depends(get_node_service),
    qa_pair_service = Depends(get_qa_pair_service),
    db: Session = Depends(get_session)
):
    """获取上下文下的所有节点"""
    
    # 检查上下文是否存在
    context = context_service.get_context(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    # 获取上下文中的节点
    nodes_data = context_service.get_context_nodes(context_id)
    
    # 过滤指定关系类型的节点
    if relation_type:
        nodes_data = [node for node in nodes_data if relation_type in node.get("relation_type", "")]
    
    # 构建响应
    items = []
    for node_data in nodes_data:
        # 获取节点详情
        node = node_service.get_node(node_data["id"])
        if not node:
            continue
        
        node_brief = NodeBrief(
            id=node.id,
            session_id=node.session_id,
            template_key=node.template_key,
            created_at=node.created_at
        )
        
        qa_pairs = []
        # 如果需要包含QA对信息
        if include_qa:
            # 获取节点的QA对
            qa_pairs_data = qa_pair_service.get_node_qa_pairs(node.id)
            
            for qa_pair in qa_pairs_data:
                # 提取问题和回答
                question = None
                answer = None
                
                for message in qa_pair["messages"]:
                    if message["role"] == "user":
                        question = message["content"]
                    elif message["role"] == "assistant":
                        answer = message["content"]
                
                qa_pairs.append(QAPairBrief(
                    id=qa_pair["id"],
                    question=question or "",
                    answer=answer
                ))
        
        # 查找对应的ContextNode记录
        query = select(ContextNode).where(
            ContextNode.context_id == context_id,
            ContextNode.node_id == node.id
        )
        context_node = None
        result = db.exec(query).first()
        if result:
            context_node = result
        
        if not context_node:
            continue
        
        items.append(ContextNodeWithNodeResponse(
            id=context_node.id,
            context_id=context_node.context_id,
            node_id=context_node.node_id,
            relation_type=context_node.relation_type,
            created_at=context_node.created_at,
            node=node_brief,
            qa_pairs=qa_pairs
        ))
    
    return ContextNodesResponse(items=items)

@router.get("/nodes/{node_id}/contexts", response_model=NodeContextsResponse)
def get_node_contexts(
    node_id: str,
    node_service = Depends(get_node_service),
    db: Session = Depends(get_session)
):
    """获取节点所属的所有上下文"""
    # 检查节点是否存在
    node = node_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 查询关联的ContextNode记录
    query = select(ContextNode).where(ContextNode.node_id == node_id)
    context_nodes = db.exec(query).all()
    
    # 构建响应
    items = []
    for context_node in context_nodes:
        # 查询上下文
        context = db.get(Context, context_node.context_id)
        if not context:
            continue
        
        context_brief = ContextBrief(
            id=context.id,
            context_id=context.context_id,
            mode=context.mode,
            session_id=context.session_id,
            context_root_node_id=context.context_root_node_id,
            active_node_id=context.active_node_id
        )
        
        items.append(ContextNodeWithContextResponse(
            id=context_node.id,
            context_id=context_node.context_id,
            node_id=context_node.node_id,
            relation_type=context_node.relation_type,
            created_at=context_node.created_at,
            context=context_brief
        ))
    
    return NodeContextsResponse(items=items)

@router.delete("/contexts/{context_id}/nodes/{node_id}", response_model=SuccessResponse)
def remove_node_from_context(
    context_id: str,
    node_id: str,
    context_service = Depends(get_context_service)
):
    """从上下文中移除节点"""
    
    try:
        # 从上下文中移除节点
        success = context_service.remove_node_from_context(
            context_id=context_id,
            node_id=node_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Node not in context")
        
        return SuccessResponse(
            success=True,
            message="节点已从上下文中移除"
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
