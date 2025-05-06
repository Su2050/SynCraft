// frontend/src/utils/cache.ts

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  ttl: number; // 缓存过期时间（毫秒）
  maxSize?: number; // 最大缓存项数量
}

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 60 * 1000, // 默认1分钟过期
  maxSize: 100 // 默认最多缓存100项
};

/**
 * 缓存管理类
 */
export class Cache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;

  /**
   * 构造函数
   * @param config 缓存配置
   */
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.delete(key);
      return undefined;
    }

    return item.data as T;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 缓存数据
   */
  set<T>(key: string, data: T): void {
    // 如果达到最大缓存项数量，删除最早的缓存项
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 删除以特定前缀开头的所有缓存项
   * @param prefix 前缀
   */
  deleteByPrefix(prefix: string): void {
    Array.from(this.cache.keys()).forEach(key => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns 缓存项数量
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * 默认缓存实例
 */
export const cache = new Cache();

/**
 * 从缓存获取数据，如果缓存不存在或过期，则调用fetcher获取数据并缓存
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @returns 获取的数据
 */
export async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cachedValue = cache.get<T>(key);
  if (cachedValue !== undefined) {
    console.log(`[Cache] 命中缓存: ${key}`);
    return cachedValue;
  }

  console.log(`[Cache] 缓存未命中: ${key}`);
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

/**
 * 失效缓存
 * @param key 缓存键
 */
export function invalidateCache(key: string): void {
  console.log(`[Cache] 失效缓存: ${key}`);
  cache.delete(key);
}

/**
 * 生成缓存键
 * @param resourceType 资源类型
 * @param id 资源ID
 * @param subResource 子资源
 * @returns 缓存键
 */
export function generateCacheKey(resourceType: string, id?: string, subResource?: string): string {
  if (id && subResource) {
    return `${resourceType}:${id}:${subResource}`;
  } else if (id) {
    return `${resourceType}:${id}`;
  } else {
    return `${resourceType}:list`;
  }
}
