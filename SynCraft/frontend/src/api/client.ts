// frontend/src/api/client.ts

/**
 * API客户端配置
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟（毫秒）
}

/**
 * API错误类型
 */
export enum ApiErrorType {
  NETWORK = 'NETWORK',       // 网络错误
  TIMEOUT = 'TIMEOUT',       // 超时错误
  SERVER = 'SERVER',         // 服务器错误 (5xx)
  CLIENT = 'CLIENT',         // 客户端错误 (4xx)
  AUTH = 'AUTH',             // 认证错误 (401, 403)
  NOT_FOUND = 'NOT_FOUND',   // 资源不存在 (404)
  VALIDATION = 'VALIDATION', // 验证错误 (400)
  UNKNOWN = 'UNKNOWN'        // 未知错误
}

/**
 * API错误
 */
export interface ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  data?: any;
  endpoint?: string;
  retryable: boolean; // 是否可重试
  userMessage: string; // 用户友好的错误消息
}

/**
 * 默认API配置
 */
export const defaultConfig: ApiConfig = {
  baseUrl: "",  // 使用相对路径，让代理配置生效
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  },
  maxRetries: 3,
  retryDelay: 1000
};

/**
 * 创建API错误
 */
function createApiError(
  message: string,
  type: ApiErrorType,
  status?: number,
  data?: any,
  endpoint?: string,
  retryable: boolean = false
): ApiError {
  const error = new Error(message) as ApiError;
  error.type = type;
  error.status = status;
  error.data = data;
  error.endpoint = endpoint;
  error.retryable = retryable;
  
  // 生成用户友好的错误消息
  switch (type) {
    case ApiErrorType.NETWORK:
      error.userMessage = '网络连接错误，请检查您的网络连接并重试。';
      break;
    case ApiErrorType.TIMEOUT:
      error.userMessage = '请求超时，服务器响应时间过长。';
      break;
    case ApiErrorType.SERVER:
      error.userMessage = '服务器错误，请稍后重试。';
      break;
    case ApiErrorType.AUTH:
      error.userMessage = '认证失败，请重新登录。';
      break;
    case ApiErrorType.NOT_FOUND:
      error.userMessage = '请求的资源不存在。';
      break;
    case ApiErrorType.VALIDATION:
      error.userMessage = '请求数据验证失败，请检查输入。';
      break;
    case ApiErrorType.CLIENT:
      error.userMessage = '请求错误，请检查输入并重试。';
      break;
    default:
      error.userMessage = '发生未知错误，请重试。';
  }
  
  return error;
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: any): boolean {
  // 网络错误通常是可重试的
  if (error instanceof TypeError && error.message.includes('Network')) {
    return true;
  }
  
  // 超时错误是可重试的
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  
  // 某些服务器错误是可重试的
  const apiError = error as ApiError;
  if (apiError.status !== undefined && apiError.status >= 500) {
    return true;
  }
  
  // 特定的HTTP状态码是可重试的
  const retryableStatusCodes = [408, 429, 502, 503, 504];
  if (apiError.status !== undefined && retryableStatusCodes.includes(apiError.status)) {
    return true;
  }
  
  return false;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建API客户端
 */
export function createApiClient(config: ApiConfig = defaultConfig) {
  /**
   * 通用请求函数
   */
  async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 0
  ): Promise<T> {
    const url = `${config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...config.headers,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }
        
        // 根据状态码确定错误类型
        let errorType: ApiErrorType;
        let retryable = false;
        
        if (response.status === 401 || response.status === 403) {
          errorType = ApiErrorType.AUTH;
        } else if (response.status === 404) {
          errorType = ApiErrorType.NOT_FOUND;
        } else if (response.status === 400) {
          errorType = ApiErrorType.VALIDATION;
        } else if (response.status >= 400 && response.status < 500) {
          errorType = ApiErrorType.CLIENT;
        } else if (response.status >= 500) {
          errorType = ApiErrorType.SERVER;
          retryable = true; // 服务器错误通常是可重试的
        } else {
          errorType = ApiErrorType.UNKNOWN;
        }
        
        const error = createApiError(
          `API错误 (${response.status}): ${errorText}`,
          errorType,
          response.status,
          errorData,
          endpoint,
          retryable
        );
        
        throw error;
      }

      // 检查响应是否为空
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // 非JSON响应
        const text = await response.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      // 处理超时错误
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = createApiError(
          `请求超时: ${url}`,
          ApiErrorType.TIMEOUT,
          undefined,
          undefined,
          endpoint,
          true // 超时错误是可重试的
        );
        
        // 如果还有重试次数，则重试
        if (retries < config.maxRetries) {
          console.log(`请求超时，正在重试 (${retries + 1}/${config.maxRetries}): ${endpoint}`);
          await delay(config.retryDelay * Math.pow(2, retries)); // 指数退避
          return request<T>(endpoint, options, retries + 1);
        }
        
        throw timeoutError;
      }

      // 处理网络错误
      if (error instanceof TypeError && error.message.includes('Network')) {
        const networkError = createApiError(
          `网络错误: ${error.message}`,
          ApiErrorType.NETWORK,
          undefined,
          undefined,
          endpoint,
          true // 网络错误是可重试的
        );
        
        // 如果还有重试次数，则重试
        if (retries < config.maxRetries) {
          console.log(`网络错误，正在重试 (${retries + 1}/${config.maxRetries}): ${endpoint}`);
          await delay(config.retryDelay * Math.pow(2, retries)); // 指数退避
          return request<T>(endpoint, options, retries + 1);
        }
        
        throw networkError;
      }

      // 处理API错误
      if ((error as ApiError).type && (error as ApiError).retryable) {
        // 如果是可重试的API错误，并且还有重试次数，则重试
        if (retries < config.maxRetries) {
          console.log(`API错误，正在重试 (${retries + 1}/${config.maxRetries}): ${endpoint}`);
          await delay(config.retryDelay * Math.pow(2, retries)); // 指数退避
          return request<T>(endpoint, options, retries + 1);
        }
      }

      // 如果不是已知的错误类型，则包装为未知错误
      if (!(error as ApiError).type) {
        const unknownError = createApiError(
          `未知错误: ${error.message || '无错误信息'}`,
          ApiErrorType.UNKNOWN,
          undefined,
          undefined,
          endpoint,
          isRetryableError(error) // 根据错误判断是否可重试
        );
        
        // 如果是可重试的错误，并且还有重试次数，则重试
        if (unknownError.retryable && retries < config.maxRetries) {
          console.log(`未知错误，正在重试 (${retries + 1}/${config.maxRetries}): ${endpoint}`);
          await delay(config.retryDelay * Math.pow(2, retries)); // 指数退避
          return request<T>(endpoint, options, retries + 1);
        }
        
        throw unknownError;
      }

      throw error;
    }
  }

  // 返回API客户端方法
  return {
    get: <T>(endpoint: string, options?: RequestInit) => 
      request<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
      request<T>(endpoint, { 
        ...options, 
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      }),
    
    put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
      request<T>(endpoint, { 
        ...options, 
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      }),
    
    delete: <T>(endpoint: string, options?: RequestInit) => 
      request<T>(endpoint, { ...options, method: 'DELETE' }),
    
    // 获取错误类型
    getErrorType: (error: any): ApiErrorType => {
      if ((error as ApiError).type) {
        return (error as ApiError).type;
      }
      return ApiErrorType.UNKNOWN;
    },
    
    // 获取用户友好的错误消息
    getUserErrorMessage: (error: any): string => {
      if ((error as ApiError).userMessage) {
        return (error as ApiError).userMessage;
      }
      return '发生未知错误，请重试。';
    },
    
    // 判断错误是否可重试
    isRetryableError: (error: any): boolean => {
      if ((error as ApiError).retryable !== undefined) {
        return (error as ApiError).retryable;
      }
      return isRetryableError(error);
    }
  };
}

/**
 * 默认API客户端实例
 */
export const apiClient = createApiClient();
