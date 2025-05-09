// frontend/src/api/endpoints/nodes.ts

import { apiClient } from '../client';
import { 
  ApiNode, 
  ApiNodeResponse, 
  ApiNodeCreate, 
  ApiNodeChildrenResponse, 
  ApiQAPairResponse, 
  ApiSearchResponse 
} from '../types';

/**
 * 节点相关API端点
 */
export const nodeEndpoints = {
  /**
   * 创建节点
   * @param data 节点创建数据
   * @returns 创建的节点
   */
  async createNode(data: ApiNodeCreate): Promise<ApiNode> {
    return apiClient.post<ApiNode>('/api/v1/nodes', data);
  },
  
  /**
   * 获取节点详情
   * @param id 节点ID
   * @param includeChildren 是否包含子节点，默认为false
   * @param childrenDepth 子节点深度，默认为1
   * @param includeQA 是否包含QA对信息，默认为true
   * @returns 节点详情
   */
  async getNode(
    id: string, 
    includeChildren: boolean = false, 
    childrenDepth: number = 1, 
    includeQA: boolean = true
  ): Promise<ApiNodeResponse> {
    return apiClient.get<ApiNodeResponse>(
      `/api/v1/nodes/${id}?include_children=${includeChildren}&children_depth=${childrenDepth}&include_qa=${includeQA}`
    );
  },
  
  /**
   * 获取节点的QA对
   * @param id 节点ID
   * @returns QA对搜索响应
   */
  async getNodeQAPairs(id: string): Promise<ApiSearchResponse> {
    return apiClient.get<ApiSearchResponse>(`/api/v1/nodes/${id}/qa_pairs`);
  },
  
  /**
   * 向节点提问
   * @param id 节点ID
   * @param question 问题内容
   * @returns QA对响应
   */
  async askQuestion(id: string, question: string): Promise<ApiQAPairResponse> {
    return apiClient.post<ApiQAPairResponse>(`/api/v1/nodes/${id}/ask`, { question });
  },
  
  /**
   * 获取节点的子节点
   * @param id 节点ID
   * @param includeQA 是否包含QA对信息，默认为true
   * @returns 子节点响应
   */
  async getNodeChildren(id: string, includeQA: boolean = true): Promise<ApiNodeChildrenResponse> {
    return apiClient.get<ApiNodeChildrenResponse>(`/api/v1/nodes/${id}/children?include_qa=${includeQA}`);
  },
  
  /**
   * 更新节点
   * @param id 节点ID
   * @param data 节点更新数据
   * @returns 更新后的节点
   */
  async updateNode(id: string, data: Partial<ApiNodeCreate>): Promise<ApiNode> {
    return apiClient.put<ApiNode>(`/api/v1/nodes/${id}`, data);
  }
};
