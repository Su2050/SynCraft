# backend/app/di/container.py
from typing import Dict, Type, TypeVar, Generic, Optional, Callable, Any
from sqlmodel import Session

from app.database import get_session
from app.services.session_service import SessionService
from app.services.node_service import NodeService
from app.services.context_service import ContextService
from app.services.qa_pair_service import QAPairService
from app.services.llm import get_llm_service
from app.services.llm.llm_interface import LLMServiceInterface

T = TypeVar('T')

class Container:
    """
    依赖注入容器，用于管理服务实例
    """
    def __init__(self):
        self._services: Dict[Type[T], Callable[[], T]] = {}
        self._instances: Dict[Type[T], T] = {}
    
    def register(self, service_type: Type[T], factory: Callable[[], T]) -> None:
        """
        注册服务工厂函数
        """
        self._services[service_type] = factory
    
    def resolve(self, service_type: Type[T]) -> T:
        """
        解析服务实例
        """
        # 如果已经有实例，直接返回
        if service_type in self._instances:
            return self._instances[service_type]
        
        # 如果没有注册工厂函数，抛出异常
        if service_type not in self._services:
            raise ValueError(f"Service {service_type.__name__} not registered")
        
        # 创建实例
        instance = self._services[service_type]()
        self._instances[service_type] = instance
        
        return instance
    
    def reset(self) -> None:
        """
        重置容器
        """
        self._instances.clear()

# 创建全局容器
container = Container()

# 注册服务
def register_services(db_session: Optional[Session] = None) -> None:
    """
    注册服务
    """
    # 获取数据库会话
    session = db_session or next(get_session())
    
    # 注册服务
    container.register(SessionService, lambda: SessionService(session))
    container.register(NodeService, lambda: NodeService(session))
    container.register(ContextService, lambda: ContextService(session))
    container.register(QAPairService, lambda: QAPairService(session))
    container.register(LLMServiceInterface, get_llm_service)

# 服务依赖项
def get_session_service() -> SessionService:
    """
    获取会话服务
    """
    return container.resolve(SessionService)

def get_node_service() -> NodeService:
    """
    获取节点服务
    """
    return container.resolve(NodeService)

def get_context_service() -> ContextService:
    """
    获取上下文服务
    """
    return container.resolve(ContextService)

def get_qa_pair_service() -> QAPairService:
    """
    获取问答对服务
    """
    return container.resolve(QAPairService)

def get_llm_service_instance() -> LLMServiceInterface:
    """
    获取LLM服务
    """
    return container.resolve(LLMServiceInterface)
