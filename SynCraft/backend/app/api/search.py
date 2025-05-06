# backend/app/api/search.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from app.database import get_session
from app.models.node import Node
from app.models.context import Context
from app.models.context_node import ContextNode
from app.models.qapair import QAPair
from app.models.message import Message
from app.services.qa_pair_service import QAPairService
from app.services.context_service import ContextService

router = APIRouter()

# 请求和响应模型
class QAPairSearchResult(BaseModel):
    id: str
    node_id: str
    session_id: str
    created_at: datetime
    question: str
    answer: Optional[str] = None

class QAPairSearchResponse(BaseModel):
    total: int
    items: List[QAPairSearchResult]

# API路由
@router.get("/search/qa_pairs", response_model=QAPairSearchResponse)
def search_qa_pairs(
    query: Optional[str] = None,
    session_id: Optional[str] = None,
    context_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_session)
):
    """搜索QA对"""
    # 使用QAPairService和ContextService
    qa_pair_service = QAPairService(db)
    context_service = ContextService(db)
    
    # 如果提供了context_id，获取上下文中的节点ID列表
    node_ids = None
    if context_id:
        # 检查上下文是否存在
        context = context_service.get_context(context_id)
        if not context:
            raise HTTPException(status_code=404, detail="Context not found")
        
        # 获取上下文中的节点
        nodes_data = context_service.get_context_nodes(context_id)
        
        # 获取节点ID列表
        node_ids = [node["id"] for node in nodes_data]
        
        if not node_ids:
            # 如果上下文没有关联的节点，返回空结果
            return QAPairSearchResponse(total=0, items=[])
    
    # 使用QAPairService搜索QA对
    search_result = qa_pair_service.search_qa_pairs(
        query=query,
        session_id=session_id,
        limit=limit,
        offset=offset
    )
    
    # 如果提供了node_ids，过滤结果
    if node_ids:
        filtered_items = [item for item in search_result["items"] if item["node_id"] in node_ids]
        search_result["items"] = filtered_items
        search_result["total"] = len(filtered_items)
    
    # 如果提供了日期范围，过滤结果
    if date_from or date_to:
        filtered_items = []
        for item in search_result["items"]:
            created_at = item["created_at"]
            
            if date_from and created_at < datetime.combine(date_from, datetime.min.time()):
                continue
            
            if date_to and created_at > datetime.combine(date_to, datetime.max.time()):
                continue
            
            filtered_items.append(item)
        
        search_result["items"] = filtered_items
        search_result["total"] = len(filtered_items)
    
    # 构建响应
    items = []
    for item in search_result["items"]:
        items.append(QAPairSearchResult(
            id=item["id"],
            node_id=item["node_id"],
            session_id=item["session_id"],
            created_at=item["created_at"],
            question=item.get("question", ""),
            answer=item.get("answer")
        ))
    
    return QAPairSearchResponse(
        total=search_result["total"],
        items=items
    )
