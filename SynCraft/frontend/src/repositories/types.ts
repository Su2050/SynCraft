// frontend/src/repositories/types.ts

import { Session } from '../store/sessionStore';
import { Node, Edge } from 'react-flow-renderer';
import { Message, MsgRole } from '../types/message';
import { ChatNode } from '../types';

/**
 * 会话仓储接口
 */
export interface ISessionRepository {
  /**
   * 获取会话列表
   * @returns 会话列表
   */
  listSessions(): Promise<Session[]>;
  
  /**
   * 获取会话详情
   * @param id 会话ID
   * @returns 会话详情
   */
  getSession(id: string): Promise<Session>;
  
  /**
   * 创建会话
   * @param name 会话名称
   * @returns 创建的会话
   */
  createSession(name: string): Promise<Session>;
  
  /**
   * 更新会话
   * @param id 会话ID
   * @param name 新的会话名称
   * @returns 更新后的会话
   */
  updateSession(id: string, name: string): Promise<Session>;
  
  /**
   * 删除会话
   * @param id 会话ID
   * @returns 是否删除成功
   */
  deleteSession(id: string): Promise<boolean>;
  
  /**
   * 获取会话树
   * @param id 会话ID
   * @returns 会话树数据
   */
  getSessionTree(id: string): Promise<{ nodes: Node[], edges: Edge[] }>;
  
  /**
   * 获取会话的主聊天上下文
   * @param id 会话ID
   * @returns 主聊天上下文
   */
  getMainContext(id: string): Promise<any>;
}

/**
 * 节点仓储接口
 */
export interface INodeRepository {
  /**
   * 获取节点详情
   * @param id 节点ID
   * @returns 节点详情
   */
  getNode(id: string): Promise<ChatNode>;
  
  /**
   * 创建节点
   * @param sessionId 会话ID
   * @param parentId 父节点ID
   * @param question 问题内容
   * @param templateKey 模板键
   * @returns 创建的节点
   */
  createNode(sessionId: string, parentId: string | null, question: string, templateKey?: string): Promise<ChatNode>;
  
  /**
   * 更新节点
   * @param id 节点ID
   * @param data 节点更新数据
   * @returns 更新后的节点
   */
  updateNode(id: string, data: Partial<ChatNode>): Promise<ChatNode>;
  
  /**
   * 获取节点的子节点
   * @param id 节点ID
   * @returns 子节点列表
   */
  getNodeChildren(id: string): Promise<ChatNode[]>;
  
  /**
   * 获取会话的所有节点
   * @param sessionId 会话ID
   * @returns 节点列表
   */
  getNodesBySessionId(sessionId: string): Promise<ChatNode[]>;
  
  /**
   * 向节点提问
   * @param id 节点ID
   * @param question 问题内容
   * @returns 节点详情
   */
  askQuestion(id: string, question: string): Promise<ChatNode>;
}

/**
 * 消息仓储接口
 */
export interface IMessageRepository {
  /**
   * 获取会话的所有消息
   * @param sessionId 会话ID
   * @returns 消息列表
   */
  getMessages(sessionId: string): Promise<Message[]>;
  
  /**
   * 获取节点的消息
   * @param nodeId 节点ID
   * @returns 消息列表
   */
  getNodeMessages(nodeId: string): Promise<Message[]>;
  
  /**
   * 创建消息
   * @param nodeId 节点ID
   * @param role 角色
   * @param content 内容
   * @param sessionId 会话ID
   * @returns 创建的消息
   */
  createMessage(nodeId: string, role: MsgRole, content: string, sessionId: string): Promise<Message>;
  
  /**
   * 批量设置消息
   * @param messages 消息列表
   * @returns 是否设置成功
   */
  setMessages(messages: Message[]): Promise<boolean>;
}
