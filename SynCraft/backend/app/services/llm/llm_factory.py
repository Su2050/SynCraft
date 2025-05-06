# backend/app/services/llm/llm_factory.py
from os import getenv
from typing import Optional

from .llm_interface import LLMServiceInterface
from .mock_llm_service import MockLLMService
from .real_llm_service import RealLLMService

class LLMServiceFactory:
    """LLM服务工厂，用于创建LLM服务实例"""
    
    _instance: Optional[LLMServiceInterface] = None
    
    @classmethod
    def get_instance(cls) -> LLMServiceInterface:
        """获取LLM服务实例（单例模式）"""
        if cls._instance is None:
            # 检查是否处于测试环境
            testing = getenv("TESTING", "false").lower() == "true"
            
            if testing:
                print("使用模拟LLM服务（测试环境）")
                cls._instance = MockLLMService()
            else:
                print("使用真实LLM服务（生产环境）")
                cls._instance = RealLLMService()
        
        return cls._instance
