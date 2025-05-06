# backend/app/services/llm/mock_llm_service.py
from typing import List, Optional, Dict
from .llm_interface import LLMServiceInterface

class MockLLMService(LLMServiceInterface):
    """模拟LLM服务，用于测试环境"""
    
    def __init__(self):
        """初始化模拟LLM服务"""
        self.auth_key = "dev-secret"
    
    def call_llm(self, prompt: str) -> str:
        """模拟调用LLM获取回答"""
        return f"这是一个测试回答，针对问题：{prompt}"
    
    async def ask(self, msg: str, context: Optional[List[Dict]] = None) -> str:
        """模拟异步调用LLM获取回答"""
        # 如果有上下文，可以在回答中体现
        if context and len(context) > 0:
            return f"这是一个测试回答，针对问题：{msg}，考虑了{len(context)}条上下文信息"
        return f"这是一个测试回答，针对问题：{msg}"
