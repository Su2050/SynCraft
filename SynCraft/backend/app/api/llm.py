# backend/app/api/llm.py
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.di.container import get_llm_service_instance
from app.services.llm.llm_interface import LLMServiceInterface

# ──────────────────────── #
#  Schema
# ──────────────────────── #
class AskRequest(BaseModel):
    msg: str
    context: Optional[List[Dict]] = None  # same format as OpenAI messages

class AskResponse(BaseModel):
    answer: str

# ──────────────────────── #
#  Router
# ──────────────────────── #
router = APIRouter(prefix="/ask", tags=["ask"])

def verify_key(llm_service: LLMServiceInterface = Depends(get_llm_service_instance),
               x_api_key: str = Header(..., alias="X-API-Key")):
    """简单 Header 校验；失败返回 401"""
    if x_api_key != llm_service.auth_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-API-Key"
        )
    return x_api_key

@router.post("", response_model=AskResponse, dependencies=[Depends(verify_key)])
async def ask(body: AskRequest, llm_service: LLMServiceInterface = Depends(get_llm_service_instance)):
    """调用LLM获取回答"""
    answer = await llm_service.ask(body.msg, body.context)
    return AskResponse(answer=answer)
