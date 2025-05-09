# backend/app/api/nodes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.api.qa_pairs import MessageResponse, QAPairResponse, QAPairDetailResponse, SearchResponse, QuestionRequest

from app.database import get_session
from app.models.node import Node
from app.models.context import Context
from app.services.node_service import NodeService
from app.services.qa_pair_service import QAPairService
from app.services.context_service import ContextService
from app.services.qa_pair_service import QAPairService

router = APIRouter()

# 请求和响应模型
class NodeCreate(BaseModel):
    parent_id: Optional[str] = None
    session_id: str
    template_key: Optional[str] = None
    summary_up_to_here: Optional[str] = None
    context_id: Optional[str] = None

class NodeCreateWithContextUpdate(BaseModel):
    parent_id: Optional[str] = None
    session_id: str
    template_key: Optional[str] = None
    label: Optional[str] = None
    type: str = "normal"
    context_id: str  # 必须提供上下文ID

class NodeResponse(BaseModel):
    id: str
    session_id: str
    template_key: Optional[str] = None
    summary_up_to_here: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    parent_id: Optional[str] = None

class NodeUpdate(BaseModel):
    template_key: Optional[str] = None
    summary_up_to_here: Optional[str] = None

class QAPairBrief(BaseModel):
    id: str
    question: str
    answer: Optional[str] = None
    created_at: datetime

class ContextBrief(BaseModel):
    id: str
    context_id: str
    mode: str

class NodeDetailResponse(NodeResponse):
    qa_pairs: List[QAPairBrief] = []
    children: List[Dict[str, Any]] = []
    contexts: List[ContextBrief] = []

class NodeChildrenResponse(BaseModel):
    items: List[Dict[str, Any]]

# API路由
@router.post("/nodes", response_model=NodeResponse)
def create_node(
    node_data: NodeCreate,
    db: Session = Depends(get_session)
):
    """创建新节点（不包含QA内容）"""
    # 使用NodeService创建节点
    node_service = NodeService(db)
    context_service = ContextService(db)
    
    try:
        # 创建节点
        node = node_service.create_node(
            session_id=node_data.session_id,
            parent_id=node_data.parent_id,
            template_key=node_data.template_key
        )
        
        # 如果提供了summary_up_to_here，更新节点
        if node_data.summary_up_to_here:
            node = node_service.update_node(
                node_id=node.id,
                summary_up_to_here=node_data.summary_up_to_here
            )
        
        # 如果提供了context_id，将节点添加到上下文
        if node_data.context_id:
            try:
                context_service.add_node_to_context(
                    context_id=node_data.context_id,
                    node_id=node.id,
                    relation_type="member"
                )
            except ValueError as e:
                # 如果添加到上下文失败，删除节点并抛出异常
                node_service.delete_node(node.id)
                raise HTTPException(status_code=404, detail=str(e))
        
        # 构建响应
        response = NodeResponse(
            id=node.id,
            session_id=node.session_id,
            template_key=node.template_key,
            summary_up_to_here=node.summary_up_to_here,
            created_at=node.created_at,
            updated_at=node.updated_at,
            parent_id=node.parent_id
        )
        
        return response
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/nodes/{node_id}", response_model=NodeDetailResponse)
def get_node(
    node_id: str,
    include_children: bool = False,
    children_depth: int = 1,
    include_qa: bool = True,
    db: Session = Depends(get_session)
):
    """获取节点详情"""
    # 使用NodeService获取节点
    node_service = NodeService(db)
    qa_pair_service = QAPairService(db)
    context_service = ContextService(db)
    
    # 获取节点
    node = node_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 构建基本响应
    response = NodeDetailResponse(
        id=node.id,
        session_id=node.session_id,
        template_key=node.template_key,
        summary_up_to_here=node.summary_up_to_here,
        created_at=node.created_at,
        updated_at=node.updated_at,
        parent_id=node.parent_id
    )
    
    # 如果需要包含QA对信息
    if include_qa:
        # 获取节点的QA对
        qa_pairs_data = qa_pair_service.get_node_qa_pairs(node_id)
        
        qa_pair_briefs = []
        for qa_pair in qa_pairs_data:
            # 提取问题和回答
            question = None
            answer = None
            
            for message in qa_pair["messages"]:
                if message["role"] == "user":
                    question = message["content"]
                elif message["role"] == "assistant":
                    answer = message["content"]
            
            qa_pair_briefs.append(QAPairBrief(
                id=qa_pair["id"],
                question=question or "",
                answer=answer,
                created_at=qa_pair["created_at"]
            ))
        
        response.qa_pairs = qa_pair_briefs
    
    # 如果需要包含子节点信息
    if include_children and children_depth > 0:
        # 获取子节点
        children = node_service.get_node_children(node_id)
        
        child_nodes = []
        for child in children:
            child_info = {
                "id": child.id,
                "template_key": child.template_key,
                "created_at": child.created_at.isoformat()
            }
            
            # 如果需要包含QA对信息
            if include_qa:
                # 获取节点的QA对
                qa_pairs_data = qa_pair_service.get_node_qa_pairs(child.id)
                
                if qa_pairs_data:
                    # 提取问题和回答
                    qa_pairs_info = []
                    for qa_pair in qa_pairs_data:
                        question = None
                        answer = None
                        
                        for message in qa_pair["messages"]:
                            if message["role"] == "user":
                                question = message["content"]
                            elif message["role"] == "assistant":
                                answer = message["content"]
                        
                        qa_pairs_info.append({
                            "id": qa_pair["id"],
                            "question": question or "",
                            "answer": answer
                        })
                    
                    child_info["qa_pairs"] = qa_pairs_info
            
            # 如果需要递归获取子节点的子节点
            if children_depth > 1:
                # 递归调用获取子节点的子节点
                child_info["children"] = get_node_children_recursive(child.id, include_qa, children_depth - 1, node_service, qa_pair_service)
            
            child_nodes.append(child_info)
        
        response.children = child_nodes
    
    # 查询节点所属的上下文
    # 这里需要实现一个方法来获取节点所属的上下文
    # 暂时留空，等待实现
    
    return response

def get_node_children_recursive(node_id: str, include_qa: bool, depth: int, node_service: NodeService, qa_pair_service: QAPairService):
    """递归获取节点的子节点"""
    # 获取子节点
    children = node_service.get_node_children(node_id)
    
    child_nodes = []
    for child in children:
        child_info = {
            "id": child.id,
            "template_key": child.template_key,
            "created_at": child.created_at.isoformat()
        }
        
        # 如果需要包含QA对信息
        if include_qa:
            # 获取节点的QA对
            qa_pairs_data = qa_pair_service.get_node_qa_pairs(child.id)
            
            if qa_pairs_data:
                # 提取问题和回答
                qa_pairs_info = []
                for qa_pair in qa_pairs_data:
                    question = None
                    answer = None
                    
                    for message in qa_pair["messages"]:
                        if message["role"] == "user":
                            question = message["content"]
                        elif message["role"] == "assistant":
                            answer = message["content"]
                    
                    qa_pairs_info.append({
                        "id": qa_pair["id"],
                        "question": question or "",
                        "answer": answer
                    })
                
                child_info["qa_pairs"] = qa_pairs_info
        
        # 如果需要递归获取子节点的子节点
        if depth > 1:
            # 递归调用获取子节点的子节点
            child_info["children"] = get_node_children_recursive(child.id, include_qa, depth - 1, node_service, qa_pair_service)
        
        child_nodes.append(child_info)
    
    return child_nodes

@router.get("/nodes/{node_id}/qa_pairs", response_model=SearchResponse)
def get_node_qa_pairs(
    node_id: str,
    db: Session = Depends(get_session)
):
    """获取节点的所有QA对"""
    # 使用QAPairService获取节点的QA对
    qa_pair_service = QAPairService(db)
    node_service = NodeService(db)
    
    # 检查节点是否存在
    node = node_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 获取节点的QA对
    qa_pairs_data = qa_pair_service.get_node_qa_pairs(node_id)
    
    # 构建响应
    items = []
    for qa_pair in qa_pairs_data:
        # 提取问题和回答
        question = None
        answer = None
        message_responses = []
        
        for message in qa_pair["messages"]:
            message_responses.append(MessageResponse(
                id=message["id"],
                role=message["role"],
                content=message["content"],
                timestamp=message["timestamp"],
                meta_info=message.get("meta_info", {}),
                qa_pair_id=qa_pair["id"]
            ))
            
            if message["role"] == "user":
                question = message["content"]
            elif message["role"] == "assistant":
                answer = message["content"]
        
        items.append(QAPairDetailResponse(
            id=qa_pair["id"],
            node_id=node_id,
            session_id=node.session_id,
            created_at=qa_pair["created_at"],
            updated_at=qa_pair["updated_at"],
            tags=qa_pair.get("tags", []),
            is_favorite=qa_pair.get("is_favorite", False),
            status=qa_pair.get("status"),
            rating=qa_pair.get("rating"),
            view_count=qa_pair.get("view_count", 0),
            question=question or "",
            answer=answer,
            messages=message_responses
        ))
    
    return SearchResponse(
        total=len(items),
        items=items
    )

@router.post("/nodes/{node_id}/ask", response_model=QAPairResponse)
def ask_question(
    node_id: str,
    question_data: QuestionRequest,
    db: Session = Depends(get_session)
):
    """向节点提问并获取回答"""
    # 使用QAPairService提问
    qa_pair_service = QAPairService(db)
    node_service = NodeService(db)
    
    # 检查节点是否存在
    node = node_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    try:
        # 提问并获取回答
        result = qa_pair_service.ask_question(
            node_id=node_id,
            question=question_data.question
        )
        
        # 提取问题和回答
        question = None
        answer = None
        
        for message in result["messages"]:
            if message["role"] == "user":
                question = message["content"]
            elif message["role"] == "assistant":
                answer = message["content"]
        
        # 构建消息响应
        message_responses = []
        for message in result["messages"]:
            message_responses.append(MessageResponse(
                id=message["id"],
                role=message["role"],
                content=message["content"],
                timestamp=message["timestamp"],
                meta_info=message.get("meta_info", {}),
                qa_pair_id=result["id"]
            ))
        
        return QAPairResponse(
            id=result["id"],
            node_id=result["node_id"],
            session_id=result["session_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            tags=result.get("tags", []),
            is_favorite=result.get("is_favorite", False),
            question=question or "",
            answer=answer,
            messages=message_responses
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/nodes/{node_id}/children", response_model=NodeChildrenResponse)
def get_node_children_api(
    node_id: str,
    include_qa: bool = True,
    db: Session = Depends(get_session)
):
    """获取节点的子节点"""
    # 使用NodeService获取节点
    node_service = NodeService(db)
    qa_pair_service = QAPairService(db)
    
    # 获取节点
    node = node_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 获取子节点
    children = node_service.get_node_children(node_id)
    
    child_nodes = []
    for child in children:
        child_info = {
            "id": child.id,
            "session_id": child.session_id,
            "template_key": child.template_key,
            "created_at": child.created_at.isoformat()
        }
        
        # 如果需要包含QA对信息
        if include_qa:
            # 获取节点的QA对
            qa_pairs_data = qa_pair_service.get_node_qa_pairs(child.id)
            
            if qa_pairs_data:
                # 提取问题和回答
                qa_pairs_info = []
                for qa_pair in qa_pairs_data:
                    question = None
                    answer = None
                    
                    for message in qa_pair["messages"]:
                        if message["role"] == "user":
                            question = message["content"]
                        elif message["role"] == "assistant":
                            answer = message["content"]
                    
                    qa_pairs_info.append({
                        "id": qa_pair["id"],
                        "question": question or "",
                        "answer": answer
                    })
                
                child_info["qa_pairs"] = qa_pairs_info
        
        child_nodes.append(child_info)
    
    return NodeChildrenResponse(items=child_nodes)

@router.post("/nodes/with_context_update", response_model=NodeResponse)
def create_node_with_context_update(
    node_data: NodeCreateWithContextUpdate,
    db: Session = Depends(get_session)
):
    """创建节点并更新上下文的活动节点，在一个事务中完成"""
    # 使用NodeService和ContextService
    node_service = NodeService(db)
    context_service = ContextService(db)
    
    print(f"开始创建节点并更新上下文，session_id={node_data.session_id}, parent_id={node_data.parent_id}, context_id={node_data.context_id}")
    
    try:
        # 开始事务
        db.begin()
        
        # 创建节点（不提交）
        node = node_service.create_node_without_commit(
            session_id=node_data.session_id,
            parent_id=node_data.parent_id,
            template_key=node_data.template_key,
            label=node_data.label,
            type=node_data.type
        )
        
        print(f"节点创建成功（未提交），id={node.id}")
        
        # 更新上下文的活动节点（不提交）
        context = context_service.update_context_without_commit(
            context_id=node_data.context_id,
            active_node_id=node.id
        )
        
        if not context:
            # 如果上下文不存在，回滚事务并抛出异常
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Context with id {node_data.context_id} not found")
        
        print(f"上下文更新成功（未提交），context_id={context.id}, active_node_id={context.active_node_id}")
        
        # 提交事务
        db.commit()
        db.refresh(node)
        
        print(f"事务提交成功，节点id={node.id}, 上下文active_node_id={context.active_node_id}")
        
        # 构建响应
        response = NodeResponse(
            id=node.id,
            session_id=node.session_id,
            template_key=node.template_key,
            summary_up_to_here=node.summary_up_to_here,
            created_at=node.created_at,
            updated_at=node.updated_at,
            parent_id=node.parent_id
        )
        
        return response
    except Exception as e:
        # 回滚事务
        db.rollback()
        print(f"创建节点并更新上下文失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/nodes/{node_id}", response_model=NodeResponse)
def update_node(
    node_id: str,
    node_data: NodeUpdate,
    db: Session = Depends(get_session)
):
    """更新节点"""
    # 使用NodeService更新节点
    node_service = NodeService(db)
    
    # 更新节点
    node = node_service.update_node(
        node_id=node_id,
        template_key=node_data.template_key,
        summary_up_to_here=node_data.summary_up_to_here
    )
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 构建响应
    response = NodeResponse(
        id=node.id,
        session_id=node.session_id,
        template_key=node.template_key,
        summary_up_to_here=node.summary_up_to_here,
        created_at=node.created_at,
        updated_at=node.updated_at,
        parent_id=node.parent_id
    )
    
    return response
