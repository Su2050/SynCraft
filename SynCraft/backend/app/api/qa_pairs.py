# backend/app/api/qa_pairs.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_session
from app.models.node import Node
from app.models.qapair import QAPair
from app.models.message import Message
from app.services.qa_pair_service import QAPairService
from app.services.node_service import NodeService
from app.services.context_service import ContextService

router = APIRouter()

# 请求和响应模型
class QAPairCreate(BaseModel):
    node_id: str
    session_id: str
    question: str
    answer: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime
    meta_info: Optional[dict] = None
    qa_pair_id: Optional[str] = None

class QAPairResponse(BaseModel):
    id: str
    node_id: str
    session_id: str
    created_at: datetime
    updated_at: datetime
    tags: Optional[List[str]] = None
    is_favorite: bool = False
    status: Optional[str] = None
    rating: Optional[int] = None
    view_count: int = 0
    question: str
    answer: Optional[str] = None
    messages: List[MessageResponse] = []

class QAPairUpdate(BaseModel):
    answer: Optional[str] = None
    status: Optional[str] = None
    rating: Optional[int] = None

# 保持向后兼容
class QAPairDetailResponse(QAPairResponse):
    pass

class SuccessResponse(BaseModel):
    success: bool
    message: str

# 搜索QA对API
class SearchResponse(BaseModel):
    total: int
    items: List[QAPairResponse]

# 搜索QA对API
@router.get("/search", response_model=SearchResponse)
def search_qa_pairs(
    query: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_session)
):
    """搜索QA对"""
    # 使用QAPairService搜索QA对
    qa_pair_service = QAPairService(db)
    
    # 搜索QA对
    result = qa_pair_service.search_qa_pairs(
        query=query,
        session_id=session_id,
        limit=limit,
        offset=offset
    )
    
    # 构建响应
    items = []
    for item in result["items"]:
        items.append(QAPairResponse(
            id=item["id"],
            node_id=item["node_id"],
            session_id=item["session_id"],
            created_at=item["created_at"],
            updated_at=item["updated_at"],
            tags=item.get("tags", []),
            is_favorite=item.get("is_favorite", False),
            status=item.get("status"),
            rating=item.get("rating"),
            view_count=item.get("view_count", 0),
            question=item.get("question", ""),
            answer=item.get("answer"),
            messages=[]  # 搜索结果不包含消息详情
        ))
    
    return SearchResponse(
        total=result["total"],
        items=items
    )

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

# API路由
@router.post("", response_model=QAPairResponse)
def create_qa_pair(
    qa_pair_data: QAPairCreate,
    db: Session = Depends(get_session)
):
    """创建QA对"""
    # 使用QAPairService创建QA对
    qa_pair_service = QAPairService(db)
    node_service = NodeService(db)
    context_service = ContextService(db)
    
    # 检查节点是否存在
    node = node_service.get_node(qa_pair_data.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    try:
        # 创建QA对
        result = qa_pair_service.create_qa_pair(
            node_id=qa_pair_data.node_id,
            question=qa_pair_data.question,
            answer=qa_pair_data.answer
        )
        
        # 更新上下文的活动节点
        try:
            # 获取会话的主上下文（聊天模式的上下文）
            from sqlmodel import select
            from app.models.context import Context
            
            # 构建上下文ID
            context_id = f"chat-{node.session_id}"
            
            # 查询上下文
            query = select(Context).where(Context.context_id == context_id)
            context = db.exec(query).first()
            
            if context:
                print(f"更新上下文活动节点，上下文ID: {context.id}, 节点ID: {qa_pair_data.node_id}")
                # 更新活动节点
                context_service.update_context(context.id, qa_pair_data.node_id)
            else:
                print(f"未找到会话 {node.session_id} 的主上下文")
        except Exception as e:
            # 记录错误但不中断流程
            print(f"更新上下文活动节点失败: {e}")
        
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
            status=result.get("status"),
            rating=result.get("rating"),
            view_count=result.get("view_count", 0),
            question=question or "",
            answer=answer,
            messages=message_responses
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{qa_pair_id}", response_model=QAPairDetailResponse)
def get_qa_pair(
    qa_pair_id: str,
    db: Session = Depends(get_session)
):
    """获取QA对详情"""
    # 使用QAPairService获取QA对
    qa_pair_service = QAPairService(db)
    
    # 获取QA对
    result = qa_pair_service.get_qa_pair_with_messages(qa_pair_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="QA pair not found")
    
    # 构建消息响应
    message_responses = []
    question = None
    answer = None
    
    for message in result["messages"]:
        message_responses.append(MessageResponse(
            id=message["id"],
            role=message["role"],
            content=message["content"],
            timestamp=message["timestamp"],
            meta_info=message.get("meta_info", {}),
            qa_pair_id=qa_pair_id
        ))
        
        if message["role"] == "user":
            question = message["content"]
        elif message["role"] == "assistant":
            answer = message["content"]
    
    # 构建QA对响应
    return QAPairDetailResponse(
        id=result["id"],
        node_id=result["node_id"],
        session_id=result["session_id"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        tags=result.get("tags", []),
        is_favorite=result.get("is_favorite", False),
        status=result.get("status"),
        rating=result.get("rating"),
        view_count=result.get("view_count", 0),
        question=question or "",
        answer=answer,
        messages=message_responses
    )

@router.put("/{qa_pair_id}", response_model=QAPairResponse)
def update_qa_pair(
    qa_pair_id: str,
    qa_pair_data: QAPairUpdate,
    db: Session = Depends(get_session)
):
    """更新QA对"""
    # 使用QAPairService更新QA对
    qa_pair_service = QAPairService(db)
    
    try:
        # 更新QA对
        qa_pair = qa_pair_service.update_qa_pair(
            qa_pair_id=qa_pair_id,
            status=qa_pair_data.status,
            rating=qa_pair_data.rating
        )
        
        if not qa_pair:
            raise HTTPException(status_code=404, detail="QA pair not found")
        
        # 如果提供了answer，添加或更新回答消息
        if qa_pair_data.answer is not None:
            # 获取QA对详情
            result = qa_pair_service.get_qa_pair_with_messages(qa_pair_id)
            
            # 检查是否已有回答消息
            has_answer = False
            for message in result["messages"]:
                if message["role"] == "assistant":
                    has_answer = True
                    # 如果已有回答消息，删除它并创建新的
                    # 这里简化处理，直接添加新消息
            
            # 添加回答消息
            qa_pair_service.add_message(
                qa_pair_id=qa_pair_id,
                role="assistant",
                content=qa_pair_data.answer
            )
        
        # 获取更新后的QA对详情
        result = qa_pair_service.get_qa_pair_with_messages(qa_pair_id)
        
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
            status=result.get("status"),
            rating=result.get("rating"),
            view_count=result.get("view_count", 0),
            question=question or "",
            answer=answer,
            messages=message_responses
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{qa_pair_id}", response_model=SuccessResponse)
def delete_qa_pair(
    qa_pair_id: str,
    db: Session = Depends(get_session)
):
    """删除QA对"""
    # 使用QAPairService删除QA对
    qa_pair_service = QAPairService(db)
    
    # 删除QA对
    success = qa_pair_service.delete_qa_pair(qa_pair_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="QA pair not found")
    
    return SuccessResponse(
        success=True,
        message="QA pair deleted successfully"
    )

class QuestionRequest(BaseModel):
    question: str

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

# 消息请求模型
class MessageRequest(BaseModel):
    role: str
    content: str
    meta_info: Optional[dict] = None

# 添加消息API
@router.post("/{qa_pair_id}/messages", response_model=MessageResponse)
def add_message(
    qa_pair_id: str,
    message_data: MessageRequest,
    db: Session = Depends(get_session)
):
    """向QA对添加消息"""
    # 使用QAPairService添加消息
    qa_pair_service = QAPairService(db)
    
    try:
        # 添加消息
        message = qa_pair_service.add_message(
            qa_pair_id=qa_pair_id,
            role=message_data.role,
            content=message_data.content,
            meta_info=message_data.meta_info or {}
        )
        
        # 返回消息
        return MessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            timestamp=message.timestamp,
            meta_info=message.meta_info or {},
            qa_pair_id=qa_pair_id
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# 增加查看次数API
@router.post("/{qa_pair_id}/view", response_model=QAPairResponse)
def increment_view_count(
    qa_pair_id: str,
    db: Session = Depends(get_session)
):
    """增加QA对的查看次数"""
    # 使用QAPairService增加查看次数
    qa_pair_service = QAPairService(db)
    
    # 增加查看次数
    qa_pair = qa_pair_service.increment_view_count(qa_pair_id)
    
    if not qa_pair:
        raise HTTPException(status_code=404, detail="QA pair not found")
    
    # 获取QA对详情
    result = qa_pair_service.get_qa_pair_with_messages(qa_pair_id)
    
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
    
    # 返回QA对
    return QAPairResponse(
        id=result["id"],
        node_id=result["node_id"],
        session_id=result["session_id"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        tags=result.get("tags", []),
        is_favorite=result.get("is_favorite", False),
        status=result.get("status"),
        rating=result.get("rating"),
        view_count=result.get("view_count", 0),
        question=question or "",
        answer=answer,
        messages=message_responses
    )
