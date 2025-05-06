// frontend/src/api/endpoints/qaPairs.ts

import { apiClient } from '../client';
import { 
  ApiQAPairDetailResponse, 
  ApiQAPairResponse, 
  ApiSuccessResponse 
} from '../types';

/**
 * QA对相关API端点
 */
export const qaPairEndpoints = {
  /**
   * 获取QA对详情
   * @param id QA对ID
   * @returns QA对详情
   */
  async getQAPair(id: string): Promise<ApiQAPairDetailResponse> {
    return apiClient.get<ApiQAPairDetailResponse>(`/qa_pairs/${id}`);
  },
  
  /**
   * 更新QA对
   * @param id QA对ID
   * @param data QA对更新数据
   * @returns 更新后的QA对
   */
  async updateQAPair(id: string, data: {
    tags?: string[];
    is_favorite?: boolean;
    status?: string | null;
    rating?: number | null;
  }): Promise<ApiQAPairResponse> {
    return apiClient.put<ApiQAPairResponse>(`/qa_pairs/${id}`, data);
  },
  
  /**
   * 删除QA对
   * @param id QA对ID
   * @returns 成功响应
   */
  async deleteQAPair(id: string): Promise<ApiSuccessResponse> {
    return apiClient.delete<ApiSuccessResponse>(`/qa_pairs/${id}`);
  },
  
  /**
   * 搜索QA对
   * @param query 搜索查询
   * @param sessionId 会话ID，可选
   * @param limit 限制数量，默认为10
   * @param offset 偏移量，默认为0
   * @returns 搜索结果
   */
  async searchQAPairs(
    query: string,
    sessionId?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ total: number; items: ApiQAPairDetailResponse[] }> {
    let url = `/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    if (sessionId) {
      url += `&session_id=${sessionId}`;
    }
    return apiClient.get<{ total: number; items: ApiQAPairDetailResponse[] }>(url);
  }
};
