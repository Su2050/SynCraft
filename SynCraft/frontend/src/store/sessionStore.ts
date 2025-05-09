// frontend/src/store/sessionStore.ts

import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { nanoid } from 'nanoid';
import { Node, Position } from 'react-flow-renderer';
import { useTreeStore } from './treeStore';
import { useMsgStore } from './messageStore';
import { useContextStore } from './contextStore';
import { sessionRepository, nodeRepository, messageRepository } from '../repositories';

// 会话类型定义
export interface Session {
  id: string;
  name: string;
  rootNodeId: string;
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  load: () => Promise<void>;
  createSession: (name: string) => Promise<Session>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  // 加载会话数据
  load: async () => {
    try {
      // 使用仓储层获取会话列表
      const savedSessions = await sessionRepository.listSessions();
      
      // 不再自动创建默认会话，只设置已有的会话
      if (savedSessions.length > 0) {
        const activeSessionId = savedSessions[0].id;
        
        set({ 
          sessions: savedSessions,
          activeSessionId
        });
        
        // 保存活动会话ID到localStorage，供API客户端使用
        localStorage.setItem('activeSessionId', activeSessionId);
        
        // 如果有会话，设置活动节点为第一个会话的根节点，使用会话特定的主聊天上下文ID
        const activeSession = savedSessions[0];
        if (activeSession) {
          // 创建会话特定的主聊天上下文ID
          const mainContextId = useContextStore.getState().createContextId('chat', null, activeSession.id);
          useContextStore.getState().setActive(activeSession.rootNodeId, 'sessionStore-load', mainContextId);
          
          // 加载会话树
          const { nodes, edges } = await sessionRepository.getSessionTree(activeSessionId);
          useTreeStore.getState().setAll(nodes, edges);
        }
      } else {
        // 如果没有会话，设置空的会话列表和null的活动会话ID
        set({ 
          sessions: [],
          activeSessionId: null
        });
        
        // 清除localStorage中的会话ID和节点ID
        localStorage.removeItem('activeSessionId');
        localStorage.removeItem('activeNodeId');
      }
    } catch (error) {
      console.error('加载会话数据失败:', error);
      // 创建一个默认会话
      const defaultSession: Session = {
        id: nanoid(),
        name: '默认会话',
        rootNodeId: 'root',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      set({ 
        sessions: [defaultSession],
        activeSessionId: defaultSession.id
      });
      
      await idbSet('sessions', [defaultSession]);
      
      // 保存活动会话ID到localStorage，供API客户端使用
      localStorage.setItem('activeSessionId', defaultSession.id);
      
      // 设置当前活动节点为根节点
      const mainContextId = useContextStore.getState().createContextId('chat', null, defaultSession.id);
      useContextStore.getState().setActive('root', 'sessionStore-load-error', mainContextId);
    }
  },

  // 创建新会话
  createSession: async (name) => {
    try {
      const sessionName = name || `新会话 ${get().sessions.length + 1}`;
      
      // 使用仓储层创建会话
      const newSession = await sessionRepository.createSession(sessionName);
      
      // 创建会话特定的主聊天上下文ID
      const mainContextId = useContextStore.getState().createContextId('chat', null, newSession.id);
      
      // 创建根节点
      const rootNodeId = newSession.rootNodeId;
      
      // 创建根节点对象
      const rootNode: Node = {
        id: rootNodeId,
        position: { x: 120, y: 80 },
        data: { 
          label: '根节点', 
          answer: '',
          sessionId: newSession.id
        },
        type: 'root',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
      
      // 将新根节点添加到节点列表中，但不清空现有节点
      const treeStore = useTreeStore.getState();
      const nextNodes = [...treeStore.nodes, rootNode as any];
      treeStore.setAll(nextNodes, treeStore.edges);
      
      // 更新会话列表和活动会话ID
      set({ 
        sessions: [...get().sessions, newSession],
        activeSessionId: newSession.id
      });
      
      // 保存活动会话ID到localStorage，供API客户端使用
      localStorage.setItem('activeSessionId', newSession.id);
      
      // 将根节点与上下文关联（设置活动节点）
      useContextStore.getState().setActive(rootNodeId, 'sessionStore-createSession', mainContextId);
      
      return newSession;
    } catch (error) {
      console.error('创建会话失败:', error);
      
      // 回退到原有实现
      // 1. 创建会话ID
      const sessionId = nanoid();
      const sessionName = name || `新会话 ${get().sessions.length + 1}`;
      
      // 2. 创建会话特定的主聊天上下文ID
      const mainContextId = useContextStore.getState().createContextId('chat', null, sessionId);
      
      // 3. 创建根节点
      const rootNodeId = `root-${nanoid(6)}`;
      
      // 创建根节点对象
      const rootNode: Node = {
        id: rootNodeId,
        position: { x: 120, y: 80 },
        data: { 
          label: '根节点', 
          answer: '',
          sessionId: sessionId
        },
        type: 'root',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
      
      // 将新根节点添加到节点列表中，但不清空现有节点
      const treeStore = useTreeStore.getState();
      const nextNodes = [...treeStore.nodes, rootNode as any];
      treeStore.setAll(nextNodes, treeStore.edges);
      
      // 4. 创建新会话对象并与根节点关联
      const newSession: Session = {
        id: sessionId,
        name: sessionName,
        rootNodeId: rootNodeId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // 更新会话列表和活动会话ID
      const updatedSessions = [...get().sessions, newSession];
      set({ 
        sessions: updatedSessions,
        activeSessionId: sessionId
      });
      
      // 保存到IndexedDB
      await idbSet('sessions', updatedSessions);
      
      // 保存活动会话ID到localStorage，供API客户端使用
      localStorage.setItem('activeSessionId', sessionId);
      
      // 5. 将根节点与上下文关联（设置活动节点）
      useContextStore.getState().setActive(rootNodeId, 'sessionStore-createSession', mainContextId);
      
      return newSession;
    }
  },

  // 重命名会话
  renameSession: async (id, name) => {
    try {
      // 使用仓储层更新会话
      await sessionRepository.updateSession(id, name);
      
      // 更新本地状态
      const sessions = get().sessions;
      const updatedSessions = sessions.map(session => 
        session.id === id 
          ? { ...session, name, updatedAt: Date.now() } 
          : session
      );
      
      set({ sessions: updatedSessions });
    } catch (error) {
      console.error('重命名会话失败:', error);
      
      // 回退到原有实现
      const sessions = get().sessions;
      const updatedSessions = sessions.map(session => 
        session.id === id 
          ? { ...session, name, updatedAt: Date.now() } 
          : session
      );
      
      set({ sessions: updatedSessions });
      await idbSet('sessions', updatedSessions);
    }
  },

  // 删除会话
  deleteSession: async (id) => {
    try {
      const sessions = get().sessions;
      
      // 如果只有一个会话，不允许删除
      if (sessions.length <= 1) {
        throw new Error('至少需要保留一个会话');
      }
      
      // 获取要删除的会话
      const sessionToDelete = sessions.find(s => s.id === id);
      if (!sessionToDelete) {
        throw new Error('会话不存在');
      }
      
      // 使用仓储层删除会话
      await sessionRepository.deleteSession(id);
      
      // 更新本地状态
      const updatedSessions = sessions.filter(session => session.id !== id);
      
      // 如果删除的是当前活动会话，则切换到第一个会话
      const activeSessionId = get().activeSessionId;
      const newActiveId = activeSessionId === id ? updatedSessions[0].id : activeSessionId;
      const newActiveSession = updatedSessions.find(s => s.id === newActiveId);
      
      set({ 
        sessions: updatedSessions,
        activeSessionId: newActiveId
      });
      
      // 保存活动会话ID到localStorage，供API客户端使用
      if (newActiveId) {
        localStorage.setItem('activeSessionId', newActiveId);
      }
      
      // 删除会话相关的节点和消息
      const treeStore = useTreeStore.getState();
      const msgStore = useMsgStore.getState();
      
      // 获取要删除的根节点ID
      const rootNodeId = sessionToDelete.rootNodeId;
      
      // 获取所有与该根节点相关的节点ID
      const nodeIdsToDelete = new Set<string>([rootNodeId]);
      const nodesToKeep = [];
      const edgesToKeep = [];
      
      // 使用BFS算法找出根节点的所有子孙节点
      const queue = [rootNodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        // 找出以当前节点为源的所有边
        treeStore.edges.forEach(edge => {
          if (edge.source === currentId) {
            const targetId = edge.target;
            if (!nodeIdsToDelete.has(targetId)) {
              nodeIdsToDelete.add(targetId);
              queue.push(targetId);
            }
          }
        });
      }
      
      // 过滤出要保留的节点和边
      for (const node of treeStore.nodes) {
        if (!nodeIdsToDelete.has(node.id)) {
          nodesToKeep.push(node);
        }
      }
      
      for (const edge of treeStore.edges) {
        if (!nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)) {
          edgesToKeep.push(edge);
        }
      }
      
      // 更新节点和边
      treeStore.setAll(nodesToKeep, edgesToKeep);
      
      // 过滤出要保留的消息
      const msgsToKeep = msgStore.msgs.filter(msg => !nodeIdsToDelete.has(msg.nodeId));
      msgStore.setAll(msgsToKeep);
      await idbSet('msgs', msgsToKeep);
      
      // 如果切换了会话，设置当前活动节点为新会话的根节点
      if (activeSessionId === id && newActiveSession) {
        // 创建新会话特定的主聊天上下文ID
        const mainContextId = useContextStore.getState().createContextId('chat', null, newActiveSession.id);
        useContextStore.getState().setActive(newActiveSession.rootNodeId, 'sessionStore-deleteSession-switchSession', mainContextId);
        
        // 加载新会话的树
        const { nodes, edges } = await sessionRepository.getSessionTree(newActiveSession.id);
        treeStore.setAll(nodes, edges);
      }
      
      // 确保在删除会话后，如果没有节点，则创建一个默认的根节点
      if (nodesToKeep.length === 0) {
        // 创建一个默认的根节点
        const defaultRootNode = {
          id: 'root',
          position: { x: 120, y: 80 },
          data: { 
            label: '根节点', 
            answer: ''
          },
          type: 'root',
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
        
        // 更新节点列表
        treeStore.setAll([defaultRootNode], []);
        
        // 如果有活动会话，创建会话特定的主聊天上下文ID
        const activeSessionId = get().activeSessionId;
        if (activeSessionId) {
          const activeSession = get().sessions.find(s => s.id === activeSessionId);
          if (activeSession) {
            // 创建会话特定的主聊天上下文ID
            const mainContextId = useContextStore.getState().createContextId('chat', null, activeSession.id);
            // 设置当前活动节点为根节点，使用会话特定的主聊天上下文ID
            useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot', mainContextId);
          } else {
            // 如果找不到活动会话，使用默认contextId
            useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot');
          }
        } else {
          // 如果没有活动会话，使用默认contextId
          useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot');
        }
        
        console.log('已创建默认根节点');
      }
      
      // 确保在删除会话后，如果没有会话，则创建一个默认会话
      if (updatedSessions.length === 0) {
        // 创建一个默认会话
        const defaultSession = await sessionRepository.createSession('默认会话');
        
        updatedSessions.push(defaultSession);
        
        set({ 
          sessions: updatedSessions,
          activeSessionId: defaultSession.id
        });
        
        // 保存活动会话ID到localStorage，供API客户端使用
        localStorage.setItem('activeSessionId', defaultSession.id);
        
        // 创建默认会话特定的主聊天上下文ID
        const mainContextId = useContextStore.getState().createContextId('chat', null, defaultSession.id);
        // 设置当前活动节点为根节点，使用会话特定的主聊天上下文ID
        useContextStore.getState().setActive(defaultSession.rootNodeId, 'sessionStore-deleteSession-createDefaultSession', mainContextId);
        
        console.log('已创建默认会话');
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      
      // 回退到原有实现
      const sessions = get().sessions;
      
      // 如果只有一个会话，不允许删除
      if (sessions.length <= 1) {
        throw new Error('至少需要保留一个会话');
      }
      
      // 获取要删除的会话
      const sessionToDelete = sessions.find(s => s.id === id);
      if (!sessionToDelete) {
        throw new Error('会话不存在');
      }
      
      const updatedSessions = sessions.filter(session => session.id !== id);
      
      // 如果删除的是当前活动会话，则切换到第一个会话
      const activeSessionId = get().activeSessionId;
      const newActiveId = activeSessionId === id ? updatedSessions[0].id : activeSessionId;
      const newActiveSession = updatedSessions.find(s => s.id === newActiveId);
      
      set({ 
        sessions: updatedSessions,
        activeSessionId: newActiveId
      });
      
      await idbSet('sessions', updatedSessions);
      
      // 保存活动会话ID到localStorage，供API客户端使用
      if (newActiveId) {
        localStorage.setItem('activeSessionId', newActiveId);
      }
      
      // 删除会话相关的节点和消息
      const treeStore = useTreeStore.getState();
      const msgStore = useMsgStore.getState();
      
      // 获取要删除的根节点ID
      const rootNodeId = sessionToDelete.rootNodeId;
      
      // 获取所有与该根节点相关的节点ID
      const nodeIdsToDelete = new Set<string>([rootNodeId]);
      const nodesToKeep = [];
      const edgesToKeep = [];
      
      // 使用BFS算法找出根节点的所有子孙节点
      const queue = [rootNodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        // 找出以当前节点为源的所有边
        treeStore.edges.forEach(edge => {
          if (edge.source === currentId) {
            const targetId = edge.target;
            if (!nodeIdsToDelete.has(targetId)) {
              nodeIdsToDelete.add(targetId);
              queue.push(targetId);
            }
          }
        });
      }
      
      // 过滤出要保留的节点和边
      for (const node of treeStore.nodes) {
        if (!nodeIdsToDelete.has(node.id)) {
          nodesToKeep.push(node);
        }
      }
      
      for (const edge of treeStore.edges) {
        if (!nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)) {
          edgesToKeep.push(edge);
        }
      }
      
      // 更新节点和边
      treeStore.setAll(nodesToKeep, edgesToKeep);
      
      // 过滤出要保留的消息
      const msgsToKeep = msgStore.msgs.filter(msg => !nodeIdsToDelete.has(msg.nodeId));
      msgStore.setAll(msgsToKeep);
      await idbSet('msgs', msgsToKeep);
      
      // 如果切换了会话，设置当前活动节点为新会话的根节点
      if (activeSessionId === id && newActiveSession) {
        // 创建新会话特定的主聊天上下文ID
        const mainContextId = useContextStore.getState().createContextId('chat', null, newActiveSession.id);
        useContextStore.getState().setActive(newActiveSession.rootNodeId, 'sessionStore-deleteSession-switchSession', mainContextId);
      }
      
      // 确保在删除会话后，如果没有节点，则创建一个默认的根节点
      if (nodesToKeep.length === 0) {
        // 创建一个默认的根节点
        const defaultRootNode = {
          id: 'root',
          position: { x: 120, y: 80 },
          data: { 
            label: '根节点', 
            answer: ''
          },
          type: 'root',
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
        
        // 更新节点列表
        treeStore.setAll([defaultRootNode], []);
        
        // 如果有活动会话，创建会话特定的主聊天上下文ID
        const activeSessionId = get().activeSessionId;
        if (activeSessionId) {
          const activeSession = get().sessions.find(s => s.id === activeSessionId);
          if (activeSession) {
            // 创建会话特定的主聊天上下文ID
            const mainContextId = useContextStore.getState().createContextId('chat', null, activeSession.id);
            // 设置当前活动节点为根节点，使用会话特定的主聊天上下文ID
            useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot', mainContextId);
          } else {
            // 如果找不到活动会话，使用默认contextId
            useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot');
          }
        } else {
          // 如果没有活动会话，使用默认contextId
          useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultRoot');
        }
        
        console.log('已创建默认根节点');
      }
      
      // 确保在删除会话后，如果没有会话，则创建一个默认会话
      if (updatedSessions.length === 0) {
        // 创建一个默认会话
        const defaultSession: Session = {
          id: nanoid(),
          name: '默认会话',
          rootNodeId: 'root', // 使用默认的根节点ID
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        updatedSessions.push(defaultSession);
        
        set({ 
          sessions: updatedSessions,
          activeSessionId: defaultSession.id
        });
        
        await idbSet('sessions', updatedSessions);
        
        // 保存活动会话ID到localStorage，供API客户端使用
        localStorage.setItem('activeSessionId', defaultSession.id);
        
        // 创建默认会话特定的主聊天上下文ID
        const mainContextId = useContextStore.getState().createContextId('chat', null, defaultSession.id);
        // 设置当前活动节点为根节点，使用会话特定的主聊天上下文ID
        useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultSession', mainContextId);
        
        console.log('已创建默认会话');
      }
    }
  },

  // 设置当前活动会话
  setActiveSession: async (id) => {
    const session = get().sessions.find(s => s.id === id);
    if (!session) return;
    
    // 获取当前活动会话ID
    const currentSessionId = get().activeSessionId;
    
    // 如果当前已经是活动会话，不需要切换
    if (currentSessionId === id) return;
    
    // 更新活动会话ID
    set({ activeSessionId: id });
    
    // 保存活动会话ID到localStorage，供API客户端使用
    localStorage.setItem('activeSessionId', id);
    
    // 获取Store实例
    const treeStore = useTreeStore.getState();
    const msgStore = useMsgStore.getState();
    
    try {
      console.log(`[${new Date().toISOString()}] 切换会话: ${id}`);
      
      // 1. 清理当前会话的数据
      console.log(`[${new Date().toISOString()}] 清理当前会话数据`);
      
      // 清空当前会话的节点和边缓存
      const currentSessionNodes = currentSessionId ? treeStore.getNodesBySessionId(currentSessionId) : [];
      const currentSessionEdges = currentSessionId ? treeStore.getEdgesBySessionId(currentSessionId) : [];
      
      // 将当前会话的节点和边保存到IndexedDB，以便后续可以恢复
      if (currentSessionNodes.length > 0 || currentSessionEdges.length > 0) {
        try {
          // 使用会话ID作为键，保存当前会话的节点和边
          await idbSet(`nodes_${currentSessionId}`, currentSessionNodes);
          await idbSet(`edges_${currentSessionId}`, currentSessionEdges);
          console.log(`[${new Date().toISOString()}] 已保存当前会话(${currentSessionId})的节点和边到IndexedDB`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 保存当前会话数据到IndexedDB失败:`, error);
        }
      }
      
      // 清空当前会话的消息缓存
      const currentSessionMsgs = msgStore.msgs.filter(msg => msg.sessionId === currentSessionId);
      if (currentSessionMsgs.length > 0) {
        try {
          // 使用会话ID作为键，保存当前会话的消息
          await idbSet(`msgs_${currentSessionId}`, currentSessionMsgs);
          console.log(`[${new Date().toISOString()}] 已保存当前会话(${currentSessionId})的消息到IndexedDB`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 保存当前会话消息到IndexedDB失败:`, error);
        }
      }
      
      // 清空内存中的数据，只保留根节点
      // 注意：这里不直接清空所有节点和边，而是在加载新会话数据时覆盖
      
      // 2. 加载新会话的数据
      console.log(`[${new Date().toISOString()}] 加载新会话数据`);
      
      // 2.1 加载会话树
      const { nodes, edges } = await sessionRepository.getSessionTree(id);
      
      // 2.2 更新节点和边
      treeStore.setAll(nodes, edges);
      
      // 2.3 加载会话消息
      const messages = await messageRepository.getMessages(id);
      msgStore.setAll(messages);
      
      // 3. 创建会话特定的主聊天上下文ID
      const mainContextId = useContextStore.getState().createContextId('chat', null, session.id);
      
      // 4. 设置当前活动节点为该会话的根节点
      useContextStore.getState().setActive(session.rootNodeId, 'sessionStore-setActiveSession', mainContextId);
      
      console.log(`[${new Date().toISOString()}] 会话切换完成: ${id}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 切换会话失败:`, error);
      
      // 回退到原有实现
      // 确保节点存在于节点列表中
      const rootNodeExists = treeStore.nodes.some(node => node.id === session.rootNodeId);
      
      // 创建会话特定的主聊天上下文ID
      const mainContextId = useContextStore.getState().createContextId('chat', null, session.id);
      
      if (rootNodeExists) {
        // 如果根节点存在，直接设置为活动节点，使用会话特定的主聊天上下文ID
        useContextStore.getState().setActive(session.rootNodeId, 'sessionStore-setActiveSession', mainContextId);
      } else {
        console.warn(`Root node ${session.rootNodeId} not found in nodes list. Attempting to load session data.`);
        
        // 尝试加载会话树
        sessionRepository.getSessionTree(id).then(({ nodes, edges }) => {
          // 更新节点和边
          treeStore.setAll(nodes, edges);
          
          // 设置当前活动节点为该会话的根节点
          useContextStore.getState().setActive(session.rootNodeId, 'sessionStore-setActiveSession-loaded', mainContextId);
        }).catch(error => {
          console.error(`Failed to load session tree for session ${id}:`, error);
          
          // 尝试重新加载会话数据
          setTimeout(() => {
            // 重新检查节点是否存在
            const updatedRootNodeExists = useTreeStore.getState().nodes.some(node => node.id === session.rootNodeId);
            
            if (updatedRootNodeExists) {
              // 使用会话特定的主聊天上下文ID
              useContextStore.getState().setActive(session.rootNodeId, 'sessionStore-setActiveSession-delayed', mainContextId);
            } else {
              console.error(`Failed to find root node ${session.rootNodeId} after reload attempt.`);
            }
          }, 100);
        });
      }
    }
  },
}));
