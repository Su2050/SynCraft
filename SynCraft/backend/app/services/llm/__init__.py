# backend/app/services/llm/__init__.py
from .llm_factory import LLMServiceFactory

# 导出工厂方法，方便其他模块使用
get_llm_service = LLMServiceFactory.get_instance
