# backend/app/services/llm/real_llm_service.py
from os import getenv, path
import json
import httpx
from fastapi import HTTPException
from typing import List, Optional, Dict

from .llm_interface import LLMServiceInterface

class RealLLMService(LLMServiceInterface):
    """真实LLM服务，调用OpenRouter API获取回答"""
    
    def __init__(self):
        """初始化真实LLM服务"""
        # 加载配置
        self._load_config()
        
        # 获取API密钥
        self.api_key = getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY missing")
            
        self.auth_key = getenv("BACKEND_AUTH_KEY", "dev-secret")
    
    def _load_config(self):
        """加载配置文件"""
        # 获取当前文件所在目录
        current_dir = path.dirname(path.abspath(__file__))
        # 配置文件路径
        config_path = path.join(path.dirname(path.dirname(path.dirname(current_dir))), "config.json")
        
        # 加载配置文件
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            self.llm_config = config["llm"]
        except Exception as e:
            print(f"加载配置文件失败: {e}")
            # 使用默认配置
            self.llm_config = {
                "provider": "openrouter",
                "api_url": "https://openrouter.ai/api/v1/chat/completions",
                "models": {
                    "default": "anthropic/claude-3.7-sonnet"
                },
                "parameters": {
                    "temperature": 0.7,
                    "max_tokens": 1024
                },
                "headers": {
                    "HTTP-Referer": "https://syncraft.app",
                    "X-Title": "SynCraft"
                }
            }
    
    def call_llm(self, prompt: str) -> str:
        """调用LLM获取回答"""
        # 从配置文件获取模型和参数
        model = self.llm_config["models"]["default"]
        temperature = self.llm_config["parameters"]["temperature"]
        max_tokens = self.llm_config["parameters"]["max_tokens"]
        api_url = self.llm_config["api_url"]
        
        # 构建请求负载
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        # 添加配置文件中的自定义请求头
        for key, value in self.llm_config["headers"].items():
            headers[key] = value

        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            # HTTP状态错误（如401、403、500等）
            error_message = f"LLM服务返回错误 (状态码: {e.response.status_code}): {e.response.text}"
            print(error_message)  # 在实际应用中应该使用日志记录
            raise ValueError(error_message)
        except httpx.RequestError as e:
            # 请求错误（如连接超时、DNS解析失败等）
            error_message = f"LLM服务请求失败: {str(e)}"
            print(error_message)  # 在实际应用中应该使用日志记录
            raise ValueError(error_message)
        except KeyError as e:
            # 响应格式错误
            error_message = f"LLM服务响应格式错误: {str(e)}"
            print(error_message)  # 在实际应用中应该使用日志记录
            raise ValueError(error_message)
        except Exception as e:
            # 其他未预期的错误
            error_message = f"LLM服务调用过程中发生未知错误: {str(e)}"
            print(error_message)  # 在实际应用中应该使用日志记录
            raise ValueError(error_message)
    
    async def ask(self, msg: str, context: Optional[List[Dict]] = None) -> str:
        """异步调用LLM获取回答"""
        messages = context or []
        messages.append({"role": "user", "content": msg})

        # 从配置文件获取模型和参数
        model = self.llm_config["models"]["default"]
        temperature = self.llm_config["parameters"]["temperature"]
        max_tokens = self.llm_config["parameters"]["max_tokens"]
        api_url = self.llm_config["api_url"]
        
        # 构建请求负载
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        # 添加配置文件中的自定义请求头
        for key, value in self.llm_config["headers"].items():
            headers[key] = value

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenRouter error: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Request error: {e}")
