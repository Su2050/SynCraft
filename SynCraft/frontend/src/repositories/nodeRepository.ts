// frontend/src/repositories/nodeRepository.ts

import { INodeRepository } from './types';
import { ChatNode } from '../types';
import { api } from '../api';
import { convertApiNodeToFrontend } from '../api/types';
import { getCached, invalidateCache, generateCacheKey } from '../utils/cache';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { nanoid } from 'nanoid';
import { Node } from 'react-flow-renderer';

/**
 * 节点仓储实现
 */
export class NodeRepository implements INodeRepository {
  /**
   * 获取节点详情
   * @param id 节点ID
   * @returns 节点详情
   */
  async getNode(id: string): Promise<ChatNode> {
    try {
      // 尝试从API获取
      const node = await getCached(generateCacheKey('node', id), async () => {
        return await api.nodes.getNode(id, false, 1, true);
      });
      
      // 提取问题和回答
      let question = '';
      let answer = null;
      
      if (node.qa_pairs && node.qa_pairs.length > 0) {
        question = node.qa_pairs[0].question || '';
        answer = node.qa_pairs[0].answer || null;
      }
      
      // 转换为前端格式
      const chatNode = convertApiNodeToFrontend(node, question, answer);
      
      return chatNode;
    } catch (error) {
      console.warn(`从API获取节点详情失败，回退到本地存储:`, error);
      
      // 回退到IndexedDB
      const nodes = (await idbGet('nodes')) as Node[] || [];
      const node = nodes.find(n => n.id === id);
      
      if (!node) {
        throw new Error(`节点不存在: ${id}`);
      }
      
      // 转换为ChatNode格式
      return {
        id: node.id,
        parentId: node.data.parentId || null,
        question: node.data.question || '',
        answer: node.data.answer || null,
        templateKey: node.data.templateKey,
        summaryUpToHere: node.data.summaryUpToHere
      };
    }
  }
  
  /**
   * 创建节点
   * @param sessionId 会话ID
   * @param parentId 父节点ID
   * @param question 问题内容
   * @param templateKey 模板键
   * @returns 创建的节点
   */
  async createNode(sessionId: string, parentId: string | null, question: string, templateKey?: string): Promise<ChatNode> {
    try {
      // 尝试通过API创建节点
      const node = await api.nodes.createNode({
        session_id: sessionId,
        parent_id: parentId,
        template_key: templateKey || null
      });
      
      // 向节点提问
      const qaPair = await api.nodes.askQuestion(node.id, question);
      
      // 转换为前端格式
      const chatNode = {
        id: node.id,
        parentId: node.parent_id || null,
        question: question,
        answer: qaPair.answer,
        templateKey: node.template_key || undefined,
        summaryUpToHere: node.summary_up_to_here || undefined
      };
      
      // 失效相关缓存
      invalidateCache(generateCacheKey('session', sessionId, 'tree'));
      if (parentId) {
        invalidateCache(generateCacheKey('node', parentId, 'children'));
      }
      
      return chatNode;
    } catch (error) {
      console.warn('通过API创建节点失败，使用本地创建:', error);
      
      // 回退到本地创建
      const chatNode = {
        id: nanoid(),
        parentId,
        question,
        answer: null,
        templateKey
      };
      
      // 更新本地缓存
      // 这里需要更复杂的逻辑来更新React Flow节点和边，但为了简化，我们只返回创建的节点
      
      return chatNode;
    }
  }
  
  /**
   * 更新节点
   * @param id 节点ID
   * @param data 节点更新数据
   * @returns 更新后的节点
   */
  async updateNode(id: string, data: Partial<ChatNode>): Promise<ChatNode> {
    try {
      // 转换为API格式
      const apiData: any = {};
      if (data.templateKey !== undefined) {
        apiData.template_key = data.templateKey;
      }
      if (data.summaryUpToHere !== undefined) {
        apiData.summary_up_to_here = data.summaryUpToHere;
      }
      
      // 尝试通过API更新
      const node = await api.nodes.updateNode(id, apiData);
      
      // 获取当前节点的QA对
      const qaPairsResponse = await api.nodes.getNodeQAPairs(id);
      
      // 提取问题和回答
      let question = '';
      let answer = null;
      
      if (qaPairsResponse.items && qaPairsResponse.items.length > 0) {
        const qaPair = qaPairsResponse.items[0];
        question = qaPair.question || '';
        answer = qaPair.answer || null;
      }
      
      // 转换为前端格式
      const chatNode = convertApiNodeToFrontend(node, question, answer);
      
      // 失效缓存
      invalidateCache(generateCacheKey('node', id));
      
      return chatNode;
    } catch (error) {
      console.warn('通过API更新节点失败，仅更新本地存储:', error);
      
      // 回退到本地更新
      // 这里需要更复杂的逻辑来更新React Flow节点，但为了简化，我们只返回更新的节点
      
      // 获取当前节点
      const currentNode = await this.getNode(id);
      
      // 更新节点
      const updatedNode = { ...currentNode, ...data };
      
      return updatedNode;
    }
  }
  
  /**
   * 获取节点的子节点
   * @param id 节点ID
   * @returns 子节点列表
   */
  async getNodeChildren(id: string): Promise<ChatNode[]> {
    try {
      // 尝试从API获取
      const response = await getCached(generateCacheKey('node', id, 'children'), async () => {
        return await api.nodes.getNodeChildren(id, true);
      });
      
      // 转换为ChatNode格式
      const chatNodes: ChatNode[] = [];
      
      for (const item of response.items) {
        // 提取问题和回答
        let question = '';
        let answer = null;
        
        if (item.qa_pairs && item.qa_pairs.length > 0) {
          const qaPair = item.qa_pairs[0];
          question = qaPair.question || '';
          answer = qaPair.answer || null;
        }
        
        chatNodes.push({
          id: item.id,
          parentId: id,
          question,
          answer,
          templateKey: item.template_key || undefined
        });
      }
      
      return chatNodes;
    } catch (error) {
      console.warn(`从API获取节点的子节点失败，回退到本地存储:`, error);
      
      // 回退到IndexedDB
      const nodes = (await idbGet('nodes')) as Node[] || [];
      const edges = (await idbGet('edges')) as any[] || [];
      
      // 找出以当前节点为源的所有边
      const childEdges = edges.filter(edge => edge.source === id);
      
      // 找出子节点
      const childNodes = nodes.filter(node => childEdges.some(edge => edge.target === node.id));
      
      // 转换为ChatNode格式
      return childNodes.map(node => ({
        id: node.id,
        parentId: id,
        question: node.data.question || '',
        answer: node.data.answer || null,
        templateKey: node.data.templateKey,
        summaryUpToHere: node.data.summaryUpToHere
      }));
    }
  }
  
  /**
   * 获取会话的所有节点
   * @param sessionId 会话ID
   * @returns 节点列表
   */
  async getNodesBySessionId(sessionId: string): Promise<ChatNode[]> {
    try {
      // 从API获取会话树
      const sessionTree = await getCached(generateCacheKey('session', sessionId, 'tree'), async () => {
        return await api.sessions.getSessionTree(sessionId, true);
      });
      
      // 转换为ChatNode格式
      const chatNodes: ChatNode[] = [];
      
      for (const node of sessionTree.nodes) {
        // 提取问题和回答
        let question = '';
        let answer = null;
        
        if (node.qa_summary) {
          question = node.qa_summary.question_preview || '';
          answer = node.qa_summary.answer_preview || null;
        }
        
        chatNodes.push({
          id: node.id,
          parentId: node.parent_id || null,
          question,
          answer,
          templateKey: node.template_key || undefined,
          summaryUpToHere: node.summary_up_to_here || undefined
        });
      }
      
      return chatNodes;
    } catch (error) {
      console.warn('从API获取会话节点失败，回退到本地存储:', error);
      
      // 回退到IndexedDB
      const allNodes = (await idbGet('nodes')) as Node[] || [];
      const sessionNodes = allNodes.filter(node => node.data.sessionId === sessionId);
      
      // 转换为ChatNode格式
      return sessionNodes.map(node => ({
        id: node.id,
        parentId: node.data.parentId || null,
        question: node.data.question || '',
        answer: node.data.answer || null,
        templateKey: node.data.templateKey,
        summaryUpToHere: node.data.summaryUpToHere
      }));
    }
  }
  
  /**
   * 向节点提问
   * @param id 节点ID
   * @param question 问题内容
   * @returns 节点详情
   */
  async askQuestion(id: string, question: string): Promise<ChatNode> {
    try {
      // 向节点提问
      const qaPair = await api.nodes.askQuestion(id, question);
      
      // 获取节点详情
      const node = await api.nodes.getNode(id);
      
      // 转换为前端格式
      const chatNode = convertApiNodeToFrontend(node, question, qaPair.answer);
      
      // 失效缓存
      invalidateCache(generateCacheKey('node', id));
      invalidateCache(generateCacheKey('node', id, 'qa_pairs'));
      
      return chatNode;
    } catch (error) {
      console.warn('通过API向节点提问失败:', error);
      throw error;
    }
  }
}

/**
 * 默认节点仓储实例
 */
export const nodeRepository = new NodeRepository();
