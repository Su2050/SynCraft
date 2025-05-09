/**
 * 通用API响应解析函数
 * 处理不同格式的API响应，统一返回数据部分
 * 
 * 解决后端API返回格式不一致的问题：
 * 1. 有时返回: { "success": true, "data": { ... } }
 * 2. 有时直接返回: { ... }
 * 3. 有时直接返回数组: [ ... ]
 */

/**
 * 解析API响应，统一处理不同格式
 * @param resp 任意格式的API响应
 * @returns 提取的数据部分
 */
export function parseApiResponse<T>(resp: any): T {
  // 如果响应是null或undefined，返回原值
  if (resp === null || resp === undefined) {
    return resp as T;
  }
  
  // 如果响应是ApiResponse格式（包含success和data字段）
  if (resp && typeof resp === 'object' && 'success' in resp && 'data' in resp) {
    return resp.data as T;
  }
  
  // 如果是数组或其他格式，直接返回
  return resp as T;
}

/**
 * 安全解析API响应，带有类型检查
 * 如果需要更严格的类型检查，可以使用此函数
 * 需要配合类型验证库如Zod使用
 * 
 * @param resp API响应
 * @param validator 类型验证函数
 * @returns 验证后的数据或null
 */
export function safeParseApiResponse<T>(
  resp: any, 
  validator: (data: any) => { success: boolean; data?: T; error?: any }
): { success: boolean; data?: T; error?: any } {
  // 先使用通用解析函数提取数据
  const data = parseApiResponse<any>(resp);
  
  // 使用验证器验证数据
  return validator(data);
}

export default parseApiResponse;
