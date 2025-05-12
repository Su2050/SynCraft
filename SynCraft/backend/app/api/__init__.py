# backend/app/api/__init__.py
from fastapi import APIRouter

from .sessions import router as sessions_router
from .nodes import router as nodes_router
from .qa_pairs import router as qa_pairs_router
from .contexts import router as contexts_router
from .context_nodes import router as context_nodes_router
from .search import router as search_router
from .llm import router as llm_router
from .auth import router as auth_router
from .admin import router as admin_router

# 创建主路由
api_router = APIRouter(prefix="/api/v1")

# 注册子路由
api_router.include_router(sessions_router, tags=["sessions"])
api_router.include_router(nodes_router, tags=["nodes"])
api_router.include_router(qa_pairs_router, prefix="/qa_pairs", tags=["qa_pairs"])
api_router.include_router(contexts_router, tags=["contexts"])
api_router.include_router(context_nodes_router, tags=["context_nodes"])
api_router.include_router(search_router, tags=["search"])
api_router.include_router(llm_router, tags=["llm"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
