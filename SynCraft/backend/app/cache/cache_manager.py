# backend/app/cache/cache_manager.py
from typing import Dict, Any, Optional, Callable, TypeVar, Generic, Tuple
from datetime import datetime, timedelta
import threading
import time
import logging

T = TypeVar('T')

class CacheEntry(Generic[T]):
    """
    缓存条目
    """
    def __init__(self, value: T, ttl: int = 300):
        """
        初始化缓存条目
        
        Args:
            value: 缓存值
            ttl: 过期时间（秒）
        """
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl)
    
    def is_expired(self) -> bool:
        """
        检查缓存是否过期
        """
        return datetime.now() > self.expires_at

class CacheManager:
    """
    缓存管理器
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """
        单例模式
        """
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(CacheManager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """
        初始化缓存管理器
        """
        if self._initialized:
            return
        
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._cleanup_thread = threading.Thread(target=self._cleanup_expired, daemon=True)
        self._cleanup_thread.start()
        self._initialized = True
        
        logging.info("Cache manager initialized")
    
    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值
        
        Args:
            key: 缓存键
        
        Returns:
            缓存值，如果不存在或已过期则返回None
        """
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if entry.is_expired():
                del self._cache[key]
                return None
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）
        """
        with self._lock:
            self._cache[key] = CacheEntry(value, ttl)
    
    def delete(self, key: str) -> None:
        """
        删除缓存值
        
        Args:
            key: 缓存键
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self) -> None:
        """
        清空缓存
        """
        with self._lock:
            self._cache.clear()
    
    def _cleanup_expired(self) -> None:
        """
        清理过期缓存
        """
        while True:
            time.sleep(60)  # 每分钟清理一次
            with self._lock:
                expired_keys = [key for key, entry in self._cache.items() if entry.is_expired()]
                for key in expired_keys:
                    del self._cache[key]
                
                if expired_keys:
                    logging.info(f"Cleaned up {len(expired_keys)} expired cache entries")

# 创建全局缓存管理器
cache_manager = CacheManager()

def cached(ttl: int = 300):
    """
    缓存装饰器
    
    Args:
        ttl: 过期时间（秒）
    
    Returns:
        装饰器函数
    """
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            # 生成缓存键
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # 尝试从缓存获取
            cached_value = cache_manager.get(key)
            if cached_value is not None:
                return cached_value
            
            # 调用原函数
            result = func(*args, **kwargs)
            
            # 缓存结果
            cache_manager.set(key, result, ttl)
            
            return result
        return wrapper
    return decorator
