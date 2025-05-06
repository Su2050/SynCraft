// frontend/src/store/sessionStore.ts

import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { nanoid } from 'nanoid';
import { Node, Position } from 'react-flow-renderer';
import { useTreeStore } from './treeStore';
import { useMsgStore } from './messageStore';
import { useContextStore } from './contextStore';

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
      const savedSessions = (await idbGet('sessions')) as Session[] || [];
      
      // 如果没有会话，创建一个默认会话
      if (savedSessions.length === 0) {
        const defaultSession: Session = {
          id: nanoid(),
          name: '默认会话',
          rootNodeId: 'root', // 使用默认的根节点ID
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        savedSessions.push(defaultSession);
        await idbSet('sessions', savedSessions);
      }
      
      const activeSessionId = savedSessions.length > 0 ? savedSessions[0].id : null;
      
      set({ 
        sessions: savedSessions,
        activeSessionId
      });
      
      // 如果有会话，设置活动节点为第一个会话的根节点，使用会话特定的主聊天上下文ID
      if (activeSessionId) {
        const activeSession = savedSessions[0];
        // 创建会话特定的主聊天上下文ID
        // 这是会话的主要contextId，用于显示会话的主聊天面板
        const mainContextId = useContextStore.getState().createContextId('chat', null, activeSession.id);
        useContextStore.getState().setActive(activeSession.rootNodeId, 'sessionStore-load', mainContextId);
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
      
      // 设置当前活动节点为根节点
      // 注意：此时我们使用的是会话的主聊天上下文ID（chat-{sessionId}）
      // 这是会话的主要contextId，用于显示会话的主聊天面板
      const mainContextId = useContextStore.getState().createContextId('chat', null, defaultSession.id);
      useContextStore.getState().setActive('root', 'sessionStore-load-error', mainContextId);
    }
  },

  // 创建新会话
  createSession: async (name) => {
    // 1. 创建会话ID
    const sessionId = nanoid();
    const sessionName = name || `新会话 ${get().sessions.length + 1}`;
    
    // 2. 创建会话特定的主聊天上下文ID
    // 为每个会话创建独立的主聊天上下文ID，格式为'chat-{sessionId}'
    // 这是会话的主要contextId，用于显示会话的主聊天面板
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
        sessionId: sessionId // 将会话ID存储在节点数据中，便于后续识别属于哪个会话
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
    
    // 5. 将根节点与上下文关联（设置活动节点）
    useContextStore.getState().setActive(rootNodeId, 'sessionStore-createSession', mainContextId);
    
    return newSession;
  },

  // 重命名会话
  renameSession: async (id, name) => {
    const sessions = get().sessions;
    const updatedSessions = sessions.map(session => 
      session.id === id 
        ? { ...session, name, updatedAt: Date.now() } 
        : session
    );
    
    set({ sessions: updatedSessions });
    await idbSet('sessions', updatedSessions);
  },

  // 删除会话
  deleteSession: async (id) => {
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
        // 这是会话的主要contextId，用于显示会话的主聊天面板
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
      
      // 不再为根节点创建初始QA消息
      
      // 如果有活动会话，创建会话特定的主聊天上下文ID
      const activeSessionId = get().activeSessionId;
      if (activeSessionId) {
        const activeSession = get().sessions.find(s => s.id === activeSessionId);
        if (activeSession) {
          // 创建会话特定的主聊天上下文ID
          // 这是会话的主要contextId，用于显示会话的主聊天面板
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
      
      // 创建默认会话特定的主聊天上下文ID
      // 这是会话的主要contextId，用于显示会话的主聊天面板
      const mainContextId = useContextStore.getState().createContextId('chat', null, defaultSession.id);
      // 设置当前活动节点为根节点，使用会话特定的主聊天上下文ID
      useContextStore.getState().setActive('root', 'sessionStore-deleteSession-createDefaultSession', mainContextId);
      
      console.log('已创建默认会话');
    }
  },

  // 设置当前活动会话
  setActiveSession: (id) => {
    const session = get().sessions.find(s => s.id === id);
    if (!session) return;
    
    set({ activeSessionId: id });
    
    // 设置当前活动节点为该会话的根节点
    const treeStore = useTreeStore.getState();
    
    // 确保节点存在于节点列表中
    const rootNodeExists = treeStore.nodes.some(node => node.id === session.rootNodeId);
    
    // 创建会话特定的主聊天上下文ID
    // 这是会话的主要contextId，用于显示会话的主聊天面板
    const mainContextId = useContextStore.getState().createContextId('chat', null, session.id);
    
    if (rootNodeExists) {
      // 如果根节点存在，直接设置为活动节点，使用会话特定的主聊天上下文ID
      useContextStore.getState().setActive(session.rootNodeId, 'sessionStore-setActiveSession', mainContextId);
    } else {
      console.warn(`Root node ${session.rootNodeId} not found in nodes list. Attempting to load session data.`);
      
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
    }
  },
}));
