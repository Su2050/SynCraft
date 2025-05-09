// frontend/src/repositories/sessionRepository.ts

import { ISessionRepository } from './types';
import { Session } from '../store/sessionStore';
import { api } from '../api';
import { apiClient } from '../api/client';
import { convertApiSessionToFrontend } from '../api/types';
import { getCached, invalidateCache, generateCacheKey } from '../utils/cache';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { nanoid } from 'nanoid';
import { Node, Edge, Position, MarkerType } from 'react-flow-renderer';
import { nodeRepository } from './nodeRepository';
import { messageRepository } from './messageRepository';

/**
 * 事务接口
 */
interface Transaction {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * 简单事务实现
 */
class SimpleTransaction implements Transaction {
  private operations: Array<() => Promise<void>> = [];
  private rollbackOperations: Array<() => Promise<void>> = [];
  private committed = false;
  private rolledBack = false;

  /**
   * 添加操作到事务
   * @param operation 操作函数
   * @param rollbackOperation 回滚操作函数
   */
  addOperation(operation: () => Promise<void>, rollbackOperation: () => Promise<void>) {
    if (this.committed || this.rolledBack) {
      throw new Error('事务已提交或回滚，无法添加操作');
    }
    this.operations.push(operation);
    this.rollbackOperations.push(rollbackOperation);
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('事务已提交或回滚，无法再次提交');
    }

    try {
      for (const operation of this.operations) {
        await operation();
      }
      this.committed = true;
    } catch (error) {
      // 如果提交过程中出错，自动回滚
      await this.rollback();
      throw error;
    }
  }

  /**
   * 回滚事务
   */
  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('事务已提交或回滚，无法再次回滚');
    }

    // 反向执行回滚操作
    for (let i = this.rollbackOperations.length - 1; i >= 0; i--) {
      try {
        await this.rollbackOperations[i]();
      } catch (rollbackError) {
        console.error('事务回滚操作失败:', rollbackError);
        // 继续执行其他回滚操作
      }
    }
    this.rolledBack = true;
  }
}

/**
 * 会话仓储实现
 */
export class SessionRepository implements ISessionRepository {
  /**
   * 获取会话列表
   * @returns 会话列表
   */
  async listSessions(): Promise<Session[]> {
    try {
      // 尝试从API获取
      const response = await getCached(generateCacheKey('sessions'), async () => {
        return await api.sessions.listSessions();
      });
      
      // 转换为前端格式
      const sessions = response.items.map(convertApiSessionToFrontend);
      
      // 缓存到IndexedDB
      await idbSet('sessions', sessions);
      
      return sessions;
    } catch (error) {
      console.warn('从API获取会话列表失败，回退到本地存储:', error);
      
      // 回退到IndexedDB
      const sessions = (await idbGet('sessions')) as Session[] || [];
      return sessions;
    }
  }
  
  /**
   * 获取会话详情
   * @param id 会话ID
   * @returns 会话详情
   */
  async getSession(id: string): Promise<Session> {
    try {
      // 尝试从API获取
      const apiSession = await getCached(generateCacheKey('session', id), async () => {
        return await api.sessions.getSession(id);
      });
      
      // 转换为前端格式
      const session = convertApiSessionToFrontend(apiSession);
      
      return session;
    } catch (error) {
      console.warn(`从API获取会话详情失败，回退到本地存储:`, error);
      
      // 回退到IndexedDB
      const sessions = (await idbGet('sessions')) as Session[] || [];
      const session = sessions.find(s => s.id === id);
      
      if (!session) {
        throw new Error(`会话不存在: ${id}`);
      }
      
      return session;
    }
  }
  
  /**
   * 创建会话
   * @param name 会话名称
   * @returns 创建的会话
   */
  async createSession(name: string): Promise<Session> {
    try {
      // 尝试通过API创建
      const apiSession = await api.sessions.createSession(name);
      
      // 转换为前端格式
      const session = convertApiSessionToFrontend(apiSession);
      
      // 更新本地缓存
      const sessions = (await idbGet('sessions')) as Session[] || [];
      await idbSet('sessions', [...sessions, session]);
      
      // 失效缓存
      invalidateCache(generateCacheKey('sessions'));
      
      return session;
    } catch (error) {
      console.warn('通过API创建会话失败，使用本地创建:', error);
      
      // 回退到本地创建
      const session = {
        id: nanoid(),
        name,
        rootNodeId: `root-${nanoid(6)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // 更新本地缓存
      const sessions = (await idbGet('sessions')) as Session[] || [];
      await idbSet('sessions', [...sessions, session]);
      
      return session;
    }
  }
  
  /**
   * 更新会话
   * @param id 会话ID
   * @param name 新的会话名称
   * @returns 更新后的会话
   */
  async updateSession(id: string, name: string): Promise<Session> {
    try {
      // 尝试通过API更新
      const apiSession = await api.sessions.updateSession(id, name);
      
      // 转换为前端格式
      const session = convertApiSessionToFrontend(apiSession);
      
      // 更新本地缓存
      const sessions = (await idbGet('sessions')) as Session[] || [];
      const updatedSessions = sessions.map(s => 
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      );
      await idbSet('sessions', updatedSessions);
      
      // 失效缓存
      invalidateCache(generateCacheKey('session', id));
      invalidateCache(generateCacheKey('sessions'));
      
      return session;
    } catch (error) {
      console.warn('通过API更新会话失败，仅更新本地存储:', error);
      
      // 回退到本地更新
      const sessions = (await idbGet('sessions')) as Session[] || [];
      const session = sessions.find(s => s.id === id);
      
      if (!session) {
        throw new Error(`会话不存在: ${id}`);
      }
      
      const updatedSession = { ...session, name, updatedAt: Date.now() };
      const updatedSessions = sessions.map(s => s.id === id ? updatedSession : s);
      await idbSet('sessions', updatedSessions);
      
      return updatedSession;
    }
  }
  
  /**
   * 删除会话
   * @param id 会话ID
   * @returns 是否删除成功
   */
  async deleteSession(id: string): Promise<boolean> {
    // 创建事务
    const transaction = new SimpleTransaction();
    
    // 备份数据，用于回滚
    const sessions = (await idbGet('sessions')) as Session[] || [];
    const session = sessions.find(s => s.id === id);
    
    if (!session) {
      throw new Error(`会话不存在: ${id}`);
    }
    
    // 获取会话相关的节点和消息，用于回滚
    const { nodes, edges } = await this.getSessionTree(id);
    const messages = await messageRepository.getMessages(id);
    
    try {
      // 1. 添加API删除操作
      transaction.addOperation(
        async () => {
          try {
            await api.sessions.deleteSession(id);
          } catch (error) {
            console.warn('通过API删除会话失败:', error);
            // 不抛出错误，继续执行本地删除
          }
        },
        async () => {
          // API删除无法回滚，但可以尝试重新创建
          try {
            await api.sessions.createSession(session.name);
          } catch (error) {
            console.warn('回滚API删除会话失败:', error);
          }
        }
      );
      
      // 2. 添加删除会话相关节点的操作
      transaction.addOperation(
        async () => {
          try {
            // 删除会话相关的所有节点
            for (const node of nodes) {
              try {
                // 尝试通过API删除节点
                await apiClient.delete(`/nodes/${node.id}`);
              } catch (nodeError) {
                console.warn(`删除节点 ${node.id} 失败:`, nodeError);
                // 继续删除其他节点
              }
            }
          } catch (error) {
            console.warn('删除会话相关节点失败:', error);
            throw error;
          }
        },
        async () => {
          // 回滚：恢复节点
          try {
            for (const node of nodes) {
              // 这里简化处理，实际上应该调用nodeRepository.createNode
              await idbSet(`node-${node.id}`, node);
            }
            await idbSet(`nodes-${id}`, nodes);
            await idbSet(`edges-${id}`, edges);
          } catch (error) {
            console.warn('回滚删除节点失败:', error);
          }
        }
      );
      
      // 3. 添加删除会话相关消息的操作
      transaction.addOperation(
        async () => {
          try {
            // 删除会话相关的所有消息
            // 获取所有消息
            const allMessages = (await idbGet('msgs')) as any[] || [];
            // 过滤掉属于该会话的消息
            const messagesToKeep = allMessages.filter(msg => msg.sessionId !== id);
            // 更新消息列表
            await messageRepository.setMessages(messagesToKeep);
          } catch (error) {
            console.warn('删除会话相关消息失败:', error);
            throw error;
          }
        },
        async () => {
          // 回滚：恢复消息
          try {
            await messageRepository.setMessages(messages);
          } catch (error) {
            console.warn('回滚删除消息失败:', error);
          }
        }
      );
      
      // 4. 添加更新本地会话列表的操作
      transaction.addOperation(
        async () => {
          // 更新本地缓存
          const updatedSessions = sessions.filter(s => s.id !== id);
          await idbSet('sessions', updatedSessions);
        },
        async () => {
          // 回滚：恢复会话列表
          await idbSet('sessions', sessions);
        }
      );
      
      // 5. 添加清理缓存的操作
      transaction.addOperation(
        async () => {
          // 失效缓存
          invalidateCache(generateCacheKey('session', id));
          invalidateCache(generateCacheKey('sessions'));
          invalidateCache(generateCacheKey('session', id, 'tree'));
          
          // 删除会话相关的IndexedDB数据
          await idbDel(`nodes-${id}`);
          await idbDel(`edges-${id}`);
          await idbDel(`msgs-${id}`);
        },
        async () => {
          // 回滚：恢复缓存数据
          // 这里不需要做什么，因为缓存会在下次访问时重新生成
        }
      );
      
      // 提交事务
      await transaction.commit();
      
      return true;
    } catch (error) {
      // 如果出错，回滚事务
      console.error('删除会话事务失败，正在回滚:', error);
      await transaction.rollback();
      
      // 回退到简单的本地删除
      try {
        const updatedSessions = sessions.filter(s => s.id !== id);
        await idbSet('sessions', updatedSessions);
        return true;
      } catch (fallbackError) {
        console.error('回退到本地删除也失败:', fallbackError);
        throw fallbackError;
      }
    }
  }
  
  /**
   * 获取会话树
   * @param id 会话ID
   * @returns 会话树数据
   */
  async getSessionTree(id: string): Promise<{ nodes: Node[], edges: Edge[] }> {
    try {
      // 尝试从API获取
      const sessionTree = await getCached(generateCacheKey('session', id, 'tree'), async () => {
        return await api.sessions.getSessionTree(id, true);
      });
      
      // 转换为React Flow格式
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      
      // 处理节点
      for (const node of sessionTree.nodes) {
        // 构建React Flow节点
        const rfNode: Node = {
          id: node.id,
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          data: { 
            label: node.template_key || '节点',
            answer: '',
            sessionId: id
          },
          type: node.parent_id ? 'default' : 'root',
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
        
        // 如果有QA摘要，添加到节点数据中
        if (node.qa_summary) {
          rfNode.data.question = node.qa_summary.question_preview;
          rfNode.data.answer = node.qa_summary.answer_preview;
        }
        
        nodes.push(rfNode);
      }
      
      // 处理边
      for (const edge of sessionTree.edges) {
        const rfEdge: Edge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'custom',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        };
        
        edges.push(rfEdge);
      }
      
      // 缓存到IndexedDB
      await idbSet(`nodes-${id}`, nodes);
      await idbSet(`edges-${id}`, edges);
      
      return { nodes, edges };
    } catch (error) {
      console.warn('从API获取会话树数据失败，回退到本地存储:', error);
      
      // 回退到IndexedDB
      const nodes = (await idbGet(`nodes-${id}`)) as Node[] || [];
      const edges = (await idbGet(`edges-${id}`)) as Edge[] || [];
      
      // 如果本地存储中也没有数据，返回一个空的树结构
      if (nodes.length === 0) {
        console.warn(`本地存储中没有会话 ${id} 的树数据，返回空树结构`);
        
        // 检查会话是否存在
        try {
          const sessions = (await idbGet('sessions')) as Session[] || [];
          const session = sessions.find(s => s.id === id);
          
          // 如果会话存在，创建一个根节点
          if (session && session.rootNodeId) {
            const rootNode: Node = {
              id: session.rootNodeId,
              position: { x: 150, y: 150 },
              data: { 
                label: '根节点',
                answer: '',
                sessionId: id
              },
              type: 'root',
              sourcePosition: Position.Bottom,
              targetPosition: Position.Top,
            };
            
            // 缓存到IndexedDB
            await idbSet(`nodes-${id}`, [rootNode]);
            await idbSet(`edges-${id}`, []);
            
            return { nodes: [rootNode], edges: [] };
          }
        } catch (sessionError) {
          console.warn('检查会话失败:', sessionError);
        }
      }
      
      return { nodes, edges };
    }
  }
  
  /**
   * 获取会话的主聊天上下文
   * @param id 会话ID
   * @returns 主聊天上下文
   */
  async getMainContext(id: string): Promise<any> {
    try {
      // 尝试从API获取
      const context = await getCached(generateCacheKey('session', id, 'main_context'), async () => {
        return await api.sessions.getMainContext(id);
      });
      
      return context;
    } catch (error) {
      console.warn('从API获取主聊天上下文失败:', error);
      throw error;
    }
  }
}

/**
 * 默认会话仓储实例
 */
export const sessionRepository = new SessionRepository();
