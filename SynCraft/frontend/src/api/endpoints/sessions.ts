// frontend/src/api/endpoints/sessions.ts

import { apiClient } from '../client';
import { 
  ApiSession, 
  ApiSessionListResponse, 
  ApiSessionDetailResponse, 
  ApiSuccessResponse 
} from '../types';

/**
 * 会话相关API端点
 */
export const sessionEndpoints = {
  /**
   * 获取会话列表
   * @param userId 用户ID，默认为'local'
   * @returns 会话列表响应
   */
  async listSessions(userId: string = 'local'): Promise<ApiSessionListResponse> {
    return apiClient.get<ApiSessionListResponse>(`/api/v1/sessions?user_id=${userId}`);
  },
  
  /**
   * 创建会话
   * @param name 会话名称
   * @param userId 用户ID，默认为'local'
   * @returns 创建的会话
   */
  async createSession(name: string, userId: string = 'local'): Promise<ApiSession> {
    return apiClient.post<ApiSession>('/api/v1/sessions', { name, user_id: userId });
  },
  
  /**
   * 获取会话详情
   * @param id 会话ID
   * @returns 会话详情
   */
  async getSession(id: string): Promise<ApiSessionDetailResponse> {
    return apiClient.get<ApiSessionDetailResponse>(`/api/v1/sessions/${id}`);
  },
  
  /**
   * 更新会话
   * @param id 会话ID
   * @param name 新的会话名称
   * @returns 更新后的会话
   */
  async updateSession(id: string, name: string): Promise<ApiSession> {
    return apiClient.put<ApiSession>(`/api/v1/sessions/${id}`, { name });
  },
  
  /**
   * 删除会话
   * @param id 会话ID
   * @returns 成功响应
   */
  async deleteSession(id: string): Promise<ApiSuccessResponse> {
    return apiClient.delete<ApiSuccessResponse>(`/api/v1/sessions/${id}`);
  },
  
  /**
   * 获取会话树
   * @param id 会话ID
   * @param includeQA 是否包含QA对信息，默认为false
   * @returns 会话树数据
   */
  async getSessionTree(id: string, includeQA: boolean = false): Promise<{nodes: any[], edges: any[]}> {
    return apiClient.get<{nodes: any[], edges: any[]}>(`/api/v1/sessions/${id}/tree?include_qa=${includeQA}`);
  },
  
  /**
   * 获取会话的主聊天上下文
   * @param id 会话ID
   * @returns 主聊天上下文
   */
  async getMainContext(id: string): Promise<any> {
    return apiClient.get<any>(`/api/v1/sessions/${id}/main_context`);
  }
};
