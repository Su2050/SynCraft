// frontend/src/store/contextStore.ts
import { create } from 'zustand';
import { useLogStore } from './logStore';

/**
 * 上下文模式类型定义
 * - 'chat': 主聊天面板模式
 * - 'deepdive': 深挖标签页模式
 */
export type ContextMode = 'chat' | 'deepdive';

/**
 * 上下文ID类型定义
 * - `chat-${string}`: 会话特定的主聊天面板上下文ID，格式为"chat-"加上会话ID
 * - `deepdive-${string}-${string}`: 会话特定的深挖标签页上下文ID，格式为"deepdive-"加上节点ID和会话ID
 */
export type ContextId = `chat-${string}` | `deepdive-${string}-${string}`;

/**
 * 上下文信息接口
 * 包含上下文的模式、节点ID和上下文ID
 */
export interface ContextInfo {
  /** 上下文模式：'chat'或'deepdive' */
  mode: ContextMode;
  /** 关联的节点ID，可以为null */
  nodeId: string | null;
  /** 上下文ID */
  contextId: ContextId;
}

/**
 * 活动节点更新信息接口
 * 用于记录活动节点变化的详细信息，方便调试和追踪
 */
export interface ActiveNodeUpdateInfo {
  /** 更新时间戳 */
  timestamp: number;
  /** 更新来源，用于标识是哪个组件或函数触发的更新 */
  source: string;
  /** 新的活动节点ID */
  nodeId: string | null;
  /** 上下文ID */
  contextId: ContextId;
}

/**
 * 主聊天面板的上下文ID常量
 * 使用默认会话ID 'default' 创建的主聊天上下文ID
 * 在没有明确指定会话ID的情况下使用
 */
export const MAIN_CHAT_CONTEXT_ID: ContextId = 'chat-default';

/**
 * 上下文管理Store类型
 * 定义了上下文管理相关的状态和方法
 */
interface ContextState {
  /**
   * 使用Map存储不同上下文的活动节点ID
   * - 键：上下文ID
   * - 值：活动节点ID或null
   */
  activeNodeIds: Map<ContextId, string | null>;
  
  /**
   * 当前输入上下文
   * 表示用户当前正在哪个上下文中输入
   */
  inputContext: ContextInfo;
  
  /**
   * 最后一次活动节点更新信息
   * 用于记录和调试活动节点的变化
   */
  lastActiveNodeUpdate: ActiveNodeUpdateInfo;
  
  /**
   * 创建上下文ID
   * 根据上下文模式、节点ID和会话ID创建上下文ID
   * 
   * @param mode 上下文模式
   * - 'chat': 返回会话特定的主聊天上下文ID
   * - 'deepdive': 返回会话特定的深挖上下文ID
   * @param nodeId 节点ID（仅在deepdive模式下需要）
   * @param sessionId 会话ID（必需）
   * @returns 上下文ID
   * - 'chat'模式: 返回`chat-${sessionId}`
   * - 'deepdive'模式: 返回`deepdive-${nodeId}-${sessionId}`
   * - 参数无效：返回MAIN_CHAT_CONTEXT_ID常量并记录错误
   */
  createContextId: (mode: ContextMode, nodeId: string | null, sessionId: string) => ContextId;
  
  /**
   * 获取当前上下文信息
   * 返回当前输入上下文的副本
   * 
   * @returns 当前上下文信息的副本
   */
  getCurrentContext: () => ContextInfo;
  
  /**
   * 设置活动节点
   * 更新指定上下文的活动节点ID
   * 
   * @param id 节点ID
   * @param source 来源（用于日志）
   * @param contextId 上下文ID（可选，默认使用当前上下文ID）
   */
  setActive: (id: string | null, source: string, contextId?: ContextId) => void;
  
  /**
   * 获取指定上下文的活动节点ID
   * 
   * @param contextId 上下文ID
   * @returns 活动节点ID或null（如果上下文不存在或没有活动节点）
   */
  getActiveNodeId: (contextId: ContextId) => string | null;
  
  /**
   * 设置当前输入上下文
   * 更新inputContext状态，并确保activeNodeIds Map中有该上下文的记录
   * 
   * @param mode 上下文模式
   * @param nodeId 节点ID
   * @param sessionId 会话ID（必需，用于生成上下文ID）
   * @param contextId 上下文ID（可选，如果不提供则自动生成）
   */
  setCurrentInputContext: (mode: ContextMode, nodeId: string | null, sessionId: string, contextId?: ContextId) => void;
  
  /**
   * 初始化上下文状态
   * 重置整个上下文管理系统的状态
   * 
   * @param initialActiveNodeId 初始活动节点ID
   * @param sessionId 会话ID（必需，用于生成上下文ID）
   */
  initializeContextState: (initialActiveNodeId: string | null, sessionId: string) => void;
}

/**
 * 上下文管理Store
 * 使用zustand创建的状态管理store
 */
export const useContextStore = create<ContextState>((set, get) => ({
  // 初始化activeNodeIds Map
  // 只包含主聊天上下文，活动节点ID为null
  activeNodeIds: new Map<ContextId, string | null>([[MAIN_CHAT_CONTEXT_ID, null]]),
  
  // 初始化输入上下文为聊天模式
  inputContext: {
    mode: 'chat',
    nodeId: null,
    contextId: MAIN_CHAT_CONTEXT_ID
  },
  
  // 初始化最后一次活动节点更新信息
  lastActiveNodeUpdate: {
    timestamp: Date.now(),
    source: 'init',
    nodeId: null,
    contextId: MAIN_CHAT_CONTEXT_ID
  },
  
  /**
   * 创建上下文ID
   * 根据上下文模式、节点ID和会话ID创建上下文ID
   * 
   * @param mode 上下文模式
   * @param nodeId 节点ID（仅在deepdive模式下需要）
   * @param sessionId 会话ID（可选，如果提供则创建会话特定的上下文ID）
   * @returns 上下文ID
   */
  createContextId: (mode, nodeId, sessionId) => {
    // 验证参数
    if (mode !== 'chat' && mode !== 'deepdive') {
      console.error(`[${new Date().toISOString()}] 创建上下文ID失败: 无效的模式`, { mode });
      return MAIN_CHAT_CONTEXT_ID;
    }
    
    // 验证sessionId
    if (!sessionId) {
      console.error(`[${new Date().toISOString()}] 创建上下文ID失败: 缺少会话ID`);
      return MAIN_CHAT_CONTEXT_ID;
    }
    
    if (mode === 'chat') {
      // 聊天模式，返回会话特定的主聊天上下文ID
      return `chat-${sessionId}` as ContextId;
    } else if (mode === 'deepdive') {
      // 深挖模式需要节点ID
      if (!nodeId) {
        console.error(`[${new Date().toISOString()}] 创建深挖上下文ID失败: 缺少节点ID`);
        return MAIN_CHAT_CONTEXT_ID;
      }
      
      // 返回会话特定的深挖上下文ID
      return `deepdive-${nodeId}-${sessionId}` as ContextId;
    } else {
      // 这里实际上不会执行，因为前面已经验证了mode，但TypeScript需要这个分支
      console.error(`[${new Date().toISOString()}] 创建上下文ID失败: 无效的参数`, { mode, nodeId, sessionId });
      return MAIN_CHAT_CONTEXT_ID;
    }
  },
  
  /**
   * 获取当前上下文信息
   * 返回当前输入上下文的副本
   * 
   * @returns 当前上下文信息的副本
   */
  getCurrentContext: () => {
    return { ...get().inputContext };
  },
  
  /**
   * 设置活动节点
   * 更新指定上下文的活动节点ID
   * 
   * @param id 节点ID
   * @param source 来源（用于日志）
   * @param contextId 上下文ID（可选，默认使用当前上下文ID）
   */
  setActive: (id, source, contextId) => {
    const timestamp = Date.now();
    
    // 验证参数
    if (source.trim() === '') {
      console.warn(`[${new Date().toISOString()}] 设置活动节点时未提供有效的来源`);
      source = 'unknown';
    }
    
    // 如果没有指定contextId，则使用当前上下文ID
    const currentContextId = contextId || get().inputContext.contextId;
    
    // 获取之前的活动节点ID，用于日志记录
    const previousNodeId = get().getActiveNodeId(currentContextId);
    
    console.log(`[${new Date(timestamp).toISOString()}] 设置上下文 ${currentContextId} 的活动节点ID: ${id}, 来源: ${source}, 之前的活动节点: ${previousNodeId}`);
    
    // 检查节点是否存在 - 这部分需要在treeStore中实现，因为contextStore不知道节点列表
    // 这里我们假设节点存在，实际使用时需要在treeStore中进行检查
    
    // 创建一个新的Map对象，而不是修改现有的Map对象
    // 这样可以确保状态更新被正确触发
    const newActiveNodeIds = new Map(get().activeNodeIds);
    newActiveNodeIds.set(currentContextId, id);
    
    // 使用同步方式设置状态，确保状态立即更新
    set({ 
      activeNodeIds: newActiveNodeIds,
      lastActiveNodeUpdate: {
        timestamp,
        source,
        nodeId: id,
        contextId: currentContextId
      }
    });
    
    // 记录活动节点变化日志
    useLogStore.getState().addLog('info', `活动节点变化: ${previousNodeId || 'null'} -> ${id || 'null'}`, {
      source,
      contextId: currentContextId,
      previousNodeId,
      newNodeId: id,
      timestamp,
      stack: new Error().stack // 添加调用栈信息，帮助定位调用位置
    });
  },
  
  /**
   * 获取指定上下文的活动节点ID
   * 
   * @param contextId 上下文ID
   * @returns 活动节点ID或null（如果上下文不存在或没有活动节点）
   */
  getActiveNodeId: (contextId) => {
    // 如果Map中没有该上下文的活动节点ID，则返回null
    return get().activeNodeIds.get(contextId as ContextId) || null;
  },
  
  /**
   * 设置当前输入上下文
   * 更新inputContext状态，并确保activeNodeIds Map中有该上下文的记录
   * 
   * @param mode 上下文模式
   * @param nodeId 节点ID
   * @param sessionId 会话ID（必需，用于生成上下文ID）
   * @param contextId 上下文ID（可选，如果不提供则自动生成）
   */
  setCurrentInputContext: (mode, nodeId, sessionId, contextId) => {
    // 验证参数
    if (mode !== 'chat' && mode !== 'deepdive') {
      console.error(`[${new Date().toISOString()}] 设置输入上下文失败: 无效的模式`, { mode });
      return;
    }
    
    if (mode === 'deepdive' && !nodeId) {
      console.error(`[${new Date().toISOString()}] 设置深挖输入上下文失败: 缺少节点ID`);
      return;
    }
    
    if (!sessionId) {
      console.error(`[${new Date().toISOString()}] 设置输入上下文失败: 缺少会话ID`);
      return;
    }
    
    // 如果没有指定contextId，则使用createContextId生成
    const newContextId = contextId || get().createContextId(mode, nodeId, sessionId);
    
    console.log(`[${new Date().toISOString()}] 设置输入上下文 - 模式: ${mode}, 节点ID: ${nodeId}, 会话ID: ${sessionId}, 上下文ID: ${newContextId}`);
    
    // 如果activeNodeIds Map中没有该上下文的活动节点ID，则初始化为nodeId
    if (!get().activeNodeIds.has(newContextId)) {
      const activeNodeIds = new Map(get().activeNodeIds);
      activeNodeIds.set(newContextId, nodeId);
      set({ activeNodeIds });
    }
    
    set({ inputContext: { mode, nodeId, contextId: newContextId } });
  },
  
  /**
   * 初始化上下文状态
   * 重置整个上下文管理系统的状态
   * 
   * @param initialActiveNodeId 初始活动节点ID
   * @param sessionId 会话ID（必需，用于生成上下文ID）
   */
  initializeContextState: (initialActiveNodeId, sessionId) => {
    // 验证参数
    if (initialActiveNodeId === '') {
      console.warn(`[${new Date().toISOString()}] 初始化上下文时提供了空字符串作为活动节点ID，将使用null代替`);
      initialActiveNodeId = null;
    }
    
    if (!sessionId) {
      console.error(`[${new Date().toISOString()}] 初始化上下文失败: 缺少会话ID`);
      return;
    }
    
    // 创建会话特定的主聊天上下文ID
    const mainContextId = get().createContextId('chat', null, sessionId);
    
    // 创建只包含主聊天上下文的Map
    const activeNodeIds = new Map<ContextId, string | null>([[mainContextId, initialActiveNodeId]]);
    
    // 重置所有状态
    set({
      activeNodeIds,
      inputContext: {
        mode: 'chat',
        nodeId: initialActiveNodeId,
        contextId: mainContextId
      },
      lastActiveNodeUpdate: {
        timestamp: Date.now(),
        source: 'init',
        nodeId: initialActiveNodeId,
        contextId: mainContextId
      }
    });
    
    console.log(`[${new Date().toISOString()}] 初始化上下文 - 活动节点ID: ${initialActiveNodeId}, 会话ID: ${sessionId}, 上下文ID: ${mainContextId}`);
  }
}));
