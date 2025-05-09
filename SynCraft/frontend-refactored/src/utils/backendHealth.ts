/**
 * 后端健康检查工具
 * 用于检测后端服务是否可用，并设置相应的本地存储标志
 */

// 后端URL
const BACKEND_URL = import.meta.env.VITE_BACKEND || 'http://localhost:8000';

// 调试信息
console.log(`[${new Date().toISOString()}] 环境变量VITE_BACKEND:`, import.meta.env.VITE_BACKEND);
console.log(`[${new Date().toISOString()}] 使用的后端URL:`, BACKEND_URL);

/**
 * 检查后端连接状态
 * @returns 后端是否可用
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    console.log(`[${new Date().toISOString()}] 尝试连接后端: ${BACKEND_URL}/health`);
    
    // 尝试访问后端健康检查端点
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 设置较短的超时时间
      signal: AbortSignal.timeout(5000),
      // 添加跨域请求凭证
      credentials: 'include',
      // 添加模式
      mode: 'cors',
    });
    
    console.log(`[${new Date().toISOString()}] 后端响应状态:`, response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] 后端连接正常，响应数据:`, data);
      // 设置本地存储标志，表示使用API模式
      localStorage.setItem('useLocalMode', 'false');
      return true;
    }
    
    throw new Error(`后端健康检查失败: ${response.status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 后端连接失败，将使用本地模式:`, error);
    
    // 尝试直接访问根路径
    try {
      console.log(`[${new Date().toISOString()}] 尝试连接后端根路径: ${BACKEND_URL}/`);
      const rootResponse = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
        credentials: 'include',
        mode: 'cors',
      });
      
      console.log(`[${new Date().toISOString()}] 后端根路径响应状态:`, rootResponse.status);
      
      if (rootResponse.ok) {
        const data = await rootResponse.json();
        console.log(`[${new Date().toISOString()}] 后端根路径连接正常，响应数据:`, data);
        // 设置本地存储标志，表示使用API模式
        localStorage.setItem('useLocalMode', 'false');
        return true;
      }
    } catch (rootError) {
      console.error(`[${new Date().toISOString()}] 后端根路径连接失败:`, rootError);
    }
    
    // 设置本地存储标志，表示使用本地模式
    localStorage.setItem('useLocalMode', 'true');
    return false;
  }
}

/**
 * 获取当前模式
 * @returns 是否使用本地模式
 */
export function isLocalMode(): boolean {
  // 检查localStorage中的标志
  const localModeFlag = localStorage.getItem('useLocalMode');
  
  // 如果标志不存在，默认为false（使用API模式）
  if (localModeFlag === null) {
    console.log(`[${new Date().toISOString()}] useLocalMode标志不存在，默认使用API模式`);
    localStorage.setItem('useLocalMode', 'false');
    return false;
  }
  
  const isLocal = localModeFlag === 'true';
  console.log(`[${new Date().toISOString()}] 当前模式: ${isLocal ? '本地模式' : 'API模式'}`);
  return isLocal;
}

/**
 * 设置本地模式
 * @param useLocal 是否使用本地模式
 */
export function setLocalMode(useLocal: boolean): void {
  console.log(`[${new Date().toISOString()}] 设置模式为: ${useLocal ? '本地模式' : 'API模式'}`);
  localStorage.setItem('useLocalMode', useLocal ? 'true' : 'false');
}
