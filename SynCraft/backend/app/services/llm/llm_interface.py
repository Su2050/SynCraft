# backend/app/services/llm/llm_interface.py
from abc import ABC, abstractmethod
from typing import List, Optional, Dict

class LLMServiceInterface(ABC):
    """LLM服务接口，定义了与大语言模型交互的方法"""
    
    @abstractmethod
    def call_llm(self, prompt: str) -> str:
        """调用LLM获取回答"""
        pass
    
    @abstractmethod
    async def ask(self, msg: str, context: Optional[List[Dict]] = None) -> str:
        """异步调用LLM获取回答"""
        pass
