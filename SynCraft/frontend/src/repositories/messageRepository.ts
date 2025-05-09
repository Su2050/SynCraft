// frontend/src/repositories/messageRepository.ts

import { IMessageRepository } from './types';
import { Message, MsgRole } from '../types/message';
import { api } from '../api';
import { getCached, invalidateCache, generateCacheKey } from '../utils/cache';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { nanoid } from 'nanoid';
import { useTreeStore } from '../store/treeStore';
import { nodeRepository } from './nodeRepository';

/**
 * 消息仓储实现
 */
export class MessageRepository implements IMessageRepository {
  /**
   * 获取会话的所有消息
   * @param sessionId 会话ID
   * @returns 消息列表
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      // 尝试从API获取会话的QA对
      const sessionTree = await getCached(generateCacheKey('session', sessionId, 'tree'), async () => {
        return await api.sessions.getSessionTree(sessionId, true);
      });
      
      // 将后端返回的QA对转换为消息格式
      const messages: Message[] = [];
      
      // 处理节点
      for (const node of sessionTree.nodes) {
        // 如果有QA摘要，创建消息
        if (node.qa_summary) {
          // 用户消息
          if (node.qa_summary.question_preview) {
            messages.push({
              id: nanoid(),
              nodeId: node.id,
              role: "user",
              content: node.qa_summary.question_preview,
              ts: new Date(node.created_at).getTime(),
              sessionId
            });
          }
          
          // 助手消息
          if (node.qa_summary.answer_preview) {
            messages.push({
              id: nanoid(),
              nodeId: node.id,
              role: "assistant",
              content: node.qa_summary.answer_preview,
              ts: new Date(node.created_at).getTime() + 1, // 确保在用户消息之后
              sessionId
            });
          }
        }
      }
      
      // 按时间戳排序
      messages.sort((a, b) => a.ts - b.ts);
      
      // 缓存到IndexedDB
      await idbSet(`msgs-${sessionId}`, messages);
      
      return messages;
    } catch (error) {
      console.warn('从API获取消息数据失败，回退到本地存储:', error);
      
      // 回退到IndexedDB
      const allMessages = (await idbGet('msgs')) as Message[] || [];
      const sessionMessages = allMessages.filter(msg => msg.sessionId === sessionId);
      
      // 按时间戳排序
      sessionMessages.sort((a, b) => a.ts - b.ts);
      
      return sessionMessages;
    }
  }
  
  /**
   * 获取节点的消息
   * @param nodeId 节点ID
   * @returns 消息列表
   */
  async getNodeMessages(nodeId: string): Promise<Message[]> {
    try {
      // 尝试从API获取节点的QA对
      const qaPairsResponse = await getCached(generateCacheKey('node', nodeId, 'qa_pairs'), async () => {
        return await api.nodes.getNodeQAPairs(nodeId);
      });
      
      // 将后端返回的QA对转换为消息格式
      const messages: Message[] = [];
      
      if (qaPairsResponse.items && qaPairsResponse.items.length > 0) {
        const qaPair = qaPairsResponse.items[0];
        
        // 用户消息
        if (qaPair.question) {
          messages.push({
            id: nanoid(),
            nodeId,
            role: "user",
            content: qaPair.question,
            ts: new Date(qaPair.created_at).getTime(),
            sessionId: qaPair.session_id
          });
        }
        
        // 助手消息
        if (qaPair.answer) {
          messages.push({
            id: nanoid(),
            nodeId,
            role: "assistant",
            content: qaPair.answer,
            ts: new Date(qaPair.created_at).getTime() + 1, // 确保在用户消息之后
            sessionId: qaPair.session_id
          });
        }
        
        // 如果有详细消息，添加到列表中
        if (qaPair.messages && qaPair.messages.length > 0) {
          for (const msg of qaPair.messages) {
            // 确保role是有效的MsgRole
            const role: MsgRole = msg.role === "user" || msg.role === "assistant" 
              ? msg.role 
              : "assistant"; // 默认为assistant
            
            messages.push({
              id: msg.id,
              nodeId,
              role,
              content: msg.content,
              ts: new Date(msg.timestamp).getTime(),
              sessionId: qaPair.session_id
            });
          }
        }
      }
      
      // 按时间戳排序
      messages.sort((a, b) => a.ts - b.ts);
      
      return messages;
    } catch (error) {
      console.warn(`从API获取节点消息失败，回退到本地存储:`, error);
      
      // 回退到IndexedDB
      const allMessages = (await idbGet('msgs')) as Message[] || [];
      const nodeMessages = allMessages.filter(msg => msg.nodeId === nodeId);
      
      // 按时间戳排序
      nodeMessages.sort((a, b) => a.ts - b.ts);
      
      return nodeMessages;
    }
  }
  
  /**
   * 创建消息
   * @param nodeId 节点ID
   * @param role 角色
   * @param content 内容
   * @param sessionId 会话ID
   * @returns 创建的消息
   */
  async createMessage(nodeId: string, role: MsgRole, content: string, sessionId: string): Promise<Message> {
    try {
      // 检查节点ID是否为'root'占位符或无效值
      if (nodeId === 'root' || !nodeId) {
        console.log(`[${new Date().toISOString()}] MessageRepository - 节点ID是'root'占位符或无效值，创建真实节点`);
        
        // 创建一个新的根节点
        try {
          const treeStore = useTreeStore.getState();
          const existingRootNode = treeStore.nodes.find(node => 
            node.type === 'root' && 
            node.data && 
            node.data.sessionId === sessionId
          );
          
          if (existingRootNode) {
            // 如果会话已有根节点，使用它
            console.log(`[${new Date().toISOString()}] MessageRepository - 使用会话的现有根节点:`, existingRootNode.id);
            nodeId = existingRootNode.id;
          } else {
            // 否则，创建新的根节点
            try {
              // 尝试创建一个带有默认问题的根节点
              const newRootNode = await nodeRepository.createNode(sessionId, null, content || "新的对话");
              console.log(`[${new Date().toISOString()}] MessageRepository - 创建新根节点:`, newRootNode.id);
              nodeId = newRootNode.id;
            } catch (nodeError) {
              console.error(`[${new Date().toISOString()}] MessageRepository - 创建根节点失败，尝试使用API直接创建:`, nodeError);
              
              // 尝试直接使用API创建节点
              try {
                // 获取当前上下文ID
                const contextId = localStorage.getItem('currentContextId') || `chat-${sessionId}`;
                
                // 使用API客户端创建节点
                const apiNode = await api.nodes.createNode({
                  session_id: sessionId,
                  parent_id: null,
                  template_key: null,
                  summary_up_to_here: content ? content.substring(0, 100) : "新的对话",
                  context_id: contextId
                });
                
                // 使用API返回的节点ID
                nodeId = apiNode.id;
                console.log(`[${new Date().toISOString()}] MessageRepository - 通过API直接创建根节点成功:`, nodeId);
              } catch (apiError) {
                console.error(`[${new Date().toISOString()}] MessageRepository - API创建节点也失败:`, apiError);
                // 生成一个临时ID作为最后的回退
                nodeId = `temp-${nanoid()}`;
                console.log(`[${new Date().toISOString()}] MessageRepository - 使用临时节点ID:`, nodeId);
              }
            }
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] MessageRepository - 获取树存储失败:`, error);
          // 生成一个临时ID作为最后的回退
          nodeId = `temp-${nanoid()}`;
          console.log(`[${new Date().toISOString()}] MessageRepository - 使用临时节点ID:`, nodeId);
        }
      }
      
      // 如果是用户消息，向节点提问
      if (role === 'user') {
        // 再次检查nodeId是否为'root'或无效值
        if (nodeId === 'root' || !nodeId) {
          console.error(`[${new Date().toISOString()}] MessageRepository - 节点ID仍然是'root'占位符或无效值，尝试最后一次创建真实节点`);
          
          try {
            // 最后一次尝试创建节点
            // 获取当前上下文ID
            const contextId = localStorage.getItem('currentContextId') || `chat-${sessionId}`;
            
            // 使用API客户端创建节点
            const apiNode = await api.nodes.createNode({
              session_id: sessionId,
              parent_id: null,
              template_key: null,
              summary_up_to_here: content ? content.substring(0, 100) : "新的对话",
              context_id: contextId
            });
            
            // 使用API返回的节点ID
            nodeId = apiNode.id;
            console.log(`[${new Date().toISOString()}] MessageRepository - 最后尝试创建节点成功:`, nodeId);
          } catch (error) {
            // 如果出错，使用临时ID
            nodeId = `temp-${nanoid()}`;
            console.log(`[${new Date().toISOString()}] MessageRepository - 最后尝试创建节点出错，使用临时ID:`, nodeId);
            
            // 创建一个本地消息并返回
            const message: Message = {
              id: nanoid(),
              nodeId,
              role,
              content,
              ts: Date.now(),
              sessionId
            };
            
            // 更新本地缓存
            const allMessages = (await idbGet('msgs')) as Message[] || [];
            await idbSet('msgs', [...allMessages, message]);
            
            // 更新会话特定的消息缓存
            const sessionMessages = (await idbGet(`msgs-${sessionId}`)) as Message[] || [];
            await idbSet(`msgs-${sessionId}`, [...sessionMessages, message]);
            
            return message;
          }
        }
        
        // 日志记录
        console.log(`[${new Date().toISOString()}] MessageRepository - 向节点提问，节点ID: ${nodeId}`);
        
        try {
          // 确保nodeId不是'root'
          if (nodeId !== 'root') {
            await api.nodes.askQuestion(nodeId, content);
            
            // 失效相关缓存
            invalidateCache(generateCacheKey('node', nodeId));
            invalidateCache(generateCacheKey('node', nodeId, 'qa_pairs'));
          } else {
            console.error(`[${new Date().toISOString()}] MessageRepository - 节点ID仍然是'root'占位符，跳过API请求`);
          }
        } catch (askError) {
          console.error(`[${new Date().toISOString()}] MessageRepository - 向节点提问失败:`, askError);
          // 不抛出错误，继续创建本地消息
        }
      }
      
      // 创建消息对象
      const message: Message = {
        id: nanoid(),
        nodeId,
        role,
        content,
        ts: Date.now(),
        sessionId
      };
      
      // 更新本地缓存
      const allMessages = (await idbGet('msgs')) as Message[] || [];
      await idbSet('msgs', [...allMessages, message]);
      
      // 更新会话特定的消息缓存
      const sessionMessages = (await idbGet(`msgs-${sessionId}`)) as Message[] || [];
      await idbSet(`msgs-${sessionId}`, [...sessionMessages, message]);
      
      return message;
    } catch (error) {
      console.warn('创建消息失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量设置消息
   * @param messages 消息列表
   * @returns 是否设置成功
   */
  async setMessages(messages: Message[]): Promise<boolean> {
    try {
      // 更新本地缓存
      await idbSet('msgs', messages);
      
      // 按会话ID分组
      const sessionGroups = messages.reduce((groups, message) => {
        const sessionId = message.sessionId;
        if (!groups[sessionId]) {
          groups[sessionId] = [];
        }
        groups[sessionId].push(message);
        return groups;
      }, {} as Record<string, Message[]>);
      
      // 更新每个会话的消息缓存
      for (const [sessionId, sessionMessages] of Object.entries(sessionGroups)) {
        await idbSet(`msgs-${sessionId}`, sessionMessages);
      }
      
      return true;
    } catch (error) {
      console.warn('批量设置消息失败:', error);
      return false;
    }
  }
}

/**
 * 默认消息仓储实例
 */
export const messageRepository = new MessageRepository();
