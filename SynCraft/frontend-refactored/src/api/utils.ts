// frontend-refactored/src/api/utils.ts
import { isLocalMode } from '@/utils/backendHealth';
import { parseApiResponse } from '@/utils/apiResponse';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_BACKEND ? `${import.meta.env.VITE_BACKEND}/api/v1` : 'http://localhost:8000/api/v1';

// 通用请求函数
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 检查是否使用本地模式
  if (isLocalMode()) {
    console.log(`[${new Date().toISOString()}] 使用本地模式，跳过API请求: ${endpoint}`);
    return {} as T;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[${new Date().toISOString()}] 发送API请求: ${url}`);
  
  // 获取认证令牌
  const token = localStorage.getItem('token');
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  
  // 如果有令牌，添加到请求头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // 添加跨域请求凭证
      credentials: 'include',
      // 添加模式
      mode: 'cors',
    });
    
    // 如果返回 401 未授权，并且不是 token 接口，则可能是令牌过期
    if (response.status === 401 && !endpoint.includes('/token')) {
      console.error(`[${new Date().toISOString()}] 请求未授权，可能需要重新登录: ${url}`);
      
      // 清除令牌
      localStorage.removeItem('token');
      
      // 重定向到登录页面
      window.location.href = '/login';
      
      throw new Error('未授权，请重新登录');
    }
    
    console.log(`[${new Date().toISOString()}] API响应状态: ${response.status} for ${url}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[${new Date().toISOString()}] API请求失败:`, errorData);
      throw new Error(errorData.error || `请求失败: ${response.status}`);
    }
    
    // 直接使用response.json()获取数据
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] API响应数据:`, data);
    
    // 使用通用解析函数处理响应
    const parsedData = parseApiResponse<T>(data);
    console.log(`[${new Date().toISOString()}] 解析后的API响应数据:`, parsedData);
    return parsedData;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API请求异常:`, error);
    throw error;
  }
}
