// frontend/src/store/treeStore.ts
import { create } from 'zustand'
import { useMsgStore } from "./messageStore"
import { useLogStore } from "./logStore"  // 引入日志存储
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { Node, Edge, MarkerType, Position } from 'react-flow-renderer'
import type { ChatNode } from '../types'
import { useContextStore } from './contextStore'
import { nodeRepository, sessionRepository } from '../repositories'

/* ---------- 画布里的 ROOT 占位 ---------- */
const ROOT_NODE: Node = {
  id: 'root',
  position: { x: 120, y: 80 },
  data: { 
    label: '根节点', 
    answer: '',
    sessionId: 'default' // 添加默认会话ID
  },
  type: 'root', // 确保根节点使用正确的类型
  sourcePosition: Position.Bottom,
  targetPosition: Position.Top,
}

/* ---------- Store 类型 ---------- */
interface TreeState {
  nodes: Node[]
  edges: Edge[]
  // 保留activeNodeId作为计算属性，向后兼容
  activeNodeId: string | null
  inputText: string
  // 添加自动排列触发器
  autoLayoutTrigger: number
  // 添加触发自动排列的函数
  triggerAutoLayout: () => void
  setAll: (nodes: Node[], edges: Edge[]) => void
  load: () => Promise<void>
  addChild: (parentId: string, q: string, tplId?: string, originalContext?: string) => Promise<string>
  setInputText: (text: string) => void
  clearAllExceptRoot: () => Promise<void> // 新增：清空除根节点外的所有节点
  getNodePath: (nodeId: string | null) => string[] // 新增：获取从节点到根节点的路径
  // 添加按会话ID过滤节点和边的方法
  getNodesBySessionId: (sessionId: string) => Node[]
  getEdgesBySessionId: (sessionId: string) => Edge[]
}

/* ---------- 实现 ---------- */
export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  edges: [],
  // 计算属性activeNodeId，根据当前上下文返回相应的活动节点ID
  get activeNodeId() {
    const { contextId } = useContextStore.getState().inputContext;
    return useContextStore.getState().getActiveNodeId(contextId);
  },
  inputText: '',
  // 初始化自动排列触发器
  autoLayoutTrigger: 0,
  
  /* 按会话ID过滤节点 */
  getNodesBySessionId: (sessionId) => {
    return get().nodes.filter(node => node.data.sessionId === sessionId);
  },
  
  /* 按会话ID过滤边 */
  getEdgesBySessionId: (sessionId) => {
    const sessionNodes = get().getNodesBySessionId(sessionId);
    const sessionNodeIds = new Set(sessionNodes.map(node => node.id));
    return get().edges.filter(edge => 
      sessionNodeIds.has(edge.source) && sessionNodeIds.has(edge.target)
    );
  },

  /* 同步到 IndexedDB */
  setAll: (n, e) => {
    set({ nodes: n, edges: e })
    idbSet('nodes', n)
    idbSet('edges', e)
  },

  /* 初次加载 */
  load: () =>
    new Promise<void>(async (resolve) => {
      try {
        // 清空现有数据
        set({ 
          nodes: [], 
          edges: []
        });
        
        // 清除IndexedDB中的数据
        await idbSet('nodes', []);
        await idbSet('edges', []);
        
        // 不再尝试加载会话树或创建根节点
        // 用户需要点击创建会话按钮才会创建会话和根节点
        
        resolve();
      } catch (error) {
        console.error('Error initializing tree store:', error);
        resolve();
      }
    }),

  /* 创建子节点 */
  addChild: async (parentId, question, templateId, originalContext) => {
    try {
      console.log(`[${new Date().toISOString()}] 创建子节点 - 父节点ID: ${parentId}, 问题: ${question.substring(0, 30)}...`);
      
      // 检查父节点是否存在
      const parentExists = get().nodes.some(node => node.id === parentId);
      if (!parentExists) {
        console.error(`[${new Date().toISOString()}] 父节点 ${parentId} 不存在`);
        throw new Error(`父节点 ${parentId} 不存在`);
      }
      
      // 获取当前活动会话ID
      const sessionId = localStorage.getItem('activeSessionId') || 'default';
      
      // 检查parentId是否是根节点（以'root'开头）
      const isRootNode = parentId === 'root' || parentId.startsWith('root-');
      const backendParent = isRootNode ? null : parentId;
      
      // 使用仓储层创建节点
      console.log(`[${new Date().toISOString()}] 调用仓储层创建节点 - 后端父节点ID: ${backendParent || 'null'}`);
      const newChat = await nodeRepository.createNode(sessionId, backendParent, question, templateId);
      console.log(`[${new Date().toISOString()}] 仓储层返回新节点 - ID: ${newChat.id}`);

      /* —— 2. 转成 React-Flow 节点 —— */
      const rfNode: Node = {
        id: newChat.id,
        position: { x: Math.random() * 120 + 120, y: Math.random() * 120 + 200 },
        data: {
          label: newChat.question,
          answer: newChat.answer,
          templateKey: newChat.templateKey,
          isFork: !isRootNode, // 标记是否为分叉节点，使用isRootNode变量
          originalContext: originalContext || '', // 保存原始上下文，用于深挖时保持上下文
          contextId: useContextStore.getState().inputContext.contextId, // 保存创建节点时的上下文ID
          sessionId // 添加会话ID
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
      
      // 如果是创建根节点，则使用已有的根节点ID
      const sourceId = parentId === 'root' ? 'root' : parentId;
      
      const rfEdge: Edge = {
        id: `${sourceId}-${newChat.id}`,
        source: sourceId,
        target: newChat.id,
        type: 'custom', // 使用自定义边类型
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      };

      /* —— 3. 更新本地 & IndexedDB —— */
      const nextNodes = [...get().nodes, rfNode];
      const nextEdges = [...get().edges, rfEdge];
      
      // 获取当前上下文ID
      const { contextId } = useContextStore.getState().inputContext;
      
      // 更新状态
      set({ 
        nodes: nextNodes, 
        edges: nextEdges
      });
      
      // 设置活动节点
      useContextStore.getState().setActive(newChat.id, 'addChild', contextId);
      
      // 保存活动节点ID到localStorage，供API客户端使用
      localStorage.setItem('activeNodeId', newChat.id);
      
      console.log(`[${new Date().toISOString()}] 更新上下文 ${contextId} 的活动节点ID为: ${newChat.id}`);
      
      // 保存到IndexedDB
      await idbSet('nodes', nextNodes);
      await idbSet('edges', nextEdges);
      console.log(`[${new Date().toISOString()}] 节点和边已保存到IndexedDB`);
      
      // 确保节点已成功添加到节点列表中
      const nodeExists = get().nodes.some(node => node.id === newChat.id);
      if (!nodeExists) {
        console.warn(`[${new Date().toISOString()}] 警告：新节点 ${newChat.id} 可能未添加到节点列表中`);
      } else {
        console.log(`[${new Date().toISOString()}] 确认：新节点 ${newChat.id} 已成功添加到节点列表中`);
      }
      
      // 用户消息应该与新节点关联，而不是父节点
      const msgStore = useMsgStore.getState();
      await msgStore.push({ nodeId: newChat.id, role: "user", content: question, sessionId });
      
      // 确保活动节点已正确设置为新节点
      const currentActiveNodeId = useContextStore.getState().getActiveNodeId(contextId);
      if (currentActiveNodeId !== newChat.id) {
        console.log(`[${new Date().toISOString()}] 确保活动节点设置为新节点:`, newChat.id);
        // 直接调用contextStore的setActive方法
        useContextStore.getState().setActive(newChat.id, 'addChild-ensure', contextId);
      }
      
      // 触发自动排列
      get().triggerAutoLayout();
      console.log(`[${new Date().toISOString()}] 创建节点后触发自动排列`);
      
      // 返回新创建的节点ID
      return newChat.id;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 创建子节点失败:`, error);
      
      // 回退到原有实现
      try {
        console.log(`[${new Date().toISOString()}] 回退到原有实现创建子节点`);
        
        // 检查父节点是否存在
        const parentExists = get().nodes.some(node => node.id === parentId);
        if (!parentExists) {
          console.error(`[${new Date().toISOString()}] 父节点 ${parentId} 不存在`);
          throw new Error(`父节点 ${parentId} 不存在`);
        }
        
        // 获取当前活动会话ID
        const parentNode = get().nodes.find(node => node.id === parentId);
        const sessionId = parentNode && parentNode.data.sessionId ? parentNode.data.sessionId : 'default';
        
        // 检查parentId是否是根节点（以'root'开头）
        const isRootNode = parentId === 'root' || parentId.startsWith('root-');
        
        // 创建新节点ID
        const newNodeId = `node-${Date.now()}`;
        
        // 创建React-Flow节点
        const rfNode: Node = {
          id: newNodeId,
          position: { x: Math.random() * 120 + 120, y: Math.random() * 120 + 200 },
          data: {
            label: question,
            answer: null,
            templateKey: templateId,
            isFork: !isRootNode,
            originalContext: originalContext || '',
            contextId: useContextStore.getState().inputContext.contextId,
            sessionId
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
        
        // 如果是创建根节点，则使用已有的根节点ID
        const sourceId = parentId === 'root' ? 'root' : parentId;
        
        const rfEdge: Edge = {
          id: `${sourceId}-${newNodeId}`,
          source: sourceId,
          target: newNodeId,
          type: 'custom',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        };
        
        // 更新本地状态
        const nextNodes = [...get().nodes, rfNode];
        const nextEdges = [...get().edges, rfEdge];
        
        // 获取当前上下文ID
        const { contextId } = useContextStore.getState().inputContext;
        
        // 更新状态
        set({ 
          nodes: nextNodes, 
          edges: nextEdges
        });
        
        // 设置活动节点
        useContextStore.getState().setActive(newNodeId, 'addChild-fallback', contextId);
        
        // 保存活动节点ID到localStorage，供API客户端使用
        localStorage.setItem('activeNodeId', newNodeId);
        
        // 保存到IndexedDB
        await idbSet('nodes', nextNodes);
        await idbSet('edges', nextEdges);
        
        // 用户消息应该与新节点关联
        const msgStore = useMsgStore.getState();
        await msgStore.push({ nodeId: newNodeId, role: "user", content: question, sessionId });
        
        // 触发自动排列
        get().triggerAutoLayout();
        
        // 返回新创建的节点ID
        return newNodeId;
      } catch (fallbackError) {
        console.error(`[${new Date().toISOString()}] 回退创建子节点也失败:`, fallbackError);
        throw fallbackError;
      }
    }
  },

  /* 设置输入文本 */
  setInputText: (text) => set({ inputText: text }),
  
  /* 触发自动排列 */
  triggerAutoLayout: () => {
    // 增加自动排列触发器的值，使TreeChat.tsx可以监听这个值的变化
    set(state => ({ autoLayoutTrigger: state.autoLayoutTrigger + 1 }));
    console.log(`[${new Date().toISOString()}] 触发自动排列，触发器值: ${get().autoLayoutTrigger + 1}`);
  },
  
  /* 获取从节点到根节点的路径 */
  getNodePath: (nodeId) => {
    if (!nodeId) return ['root'];
    
    // 如果当前节点就是根节点，只返回根节点ID
    if (nodeId === 'root') {
      return ['root'];
    }
    
    const path: string[] = [nodeId];
    const { edges } = get();
    
    let currentId = nodeId;
    const visited = new Set<string>();
    
    // 向上查找父节点直到根节点
    while (currentId !== 'root' && !visited.has(currentId)) {
      visited.add(currentId);
      
      // 查找指向当前节点的边
      const edge = edges.find(e => e.target === currentId);
      if (!edge) break;
      
      currentId = edge.source;
      path.push(currentId);
      
      // 如果找到了根节点，确保它被包含在路径中
      if (currentId === 'root') {
        break;
      }
    }
    
    // 确保路径中包含根节点
    if (!path.includes('root')) {
      path.push('root');
    }
    
    console.log(`[${new Date().toISOString()}] 节点 ${nodeId} 到根节点的路径:`, path);
    return path;
  },
  
  /* 清空除根节点外的所有节点 */
  clearAllExceptRoot: async () => {
    try {
      // 获取当前活动会话ID
      const activeSessionId = localStorage.getItem('activeSessionId');
      
      if (activeSessionId && activeSessionId !== 'default') {
        // 创建一个新的会话，替换当前会话
        // 这里我们不直接删除会话，而是创建一个新的会话，因为删除会话可能会导致其他问题
        // 实际实现时，可以根据需要调整这个逻辑
        
        // 保留根节点
        const rootNode = get().nodes.find(node => node.id === 'root') || ROOT_NODE;
        
        // 设置新的节点和边数组
        const newNodes = [rootNode];
        const newEdges: Edge[] = [];
        
        // 重置上下文
        useContextStore.getState().initializeContextState('root', activeSessionId);
        
        // 更新状态
        set({ 
          nodes: newNodes, 
          edges: newEdges
        });
        
        // 保存到 IndexedDB
        await idbSet('nodes', newNodes);
        await idbSet('edges', newEdges);
        
        // 清除消息存储中除根节点外的所有消息
        const msgStore = useMsgStore.getState();
        const rootMsgs = msgStore.msgs.filter(msg => msg.nodeId === 'root');
        await idbSet('msgs', rootMsgs);
        msgStore.setAll(rootMsgs);
        
        console.log(`[${new Date().toISOString()}] 已清空除根节点外的所有节点和消息`);
      } else {
        // 回退到原有实现
        // 保留根节点
        const rootNode = get().nodes.find(node => node.id === 'root') || ROOT_NODE;
        
        // 设置新的节点和边数组
        const newNodes = [rootNode];
        const newEdges: Edge[] = [];
        
        // 重置上下文
        useContextStore.getState().initializeContextState('root', 'default');
        
        // 更新状态
        set({ 
          nodes: newNodes, 
          edges: newEdges
        });
        
        // 保存到 IndexedDB
        await idbSet('nodes', newNodes);
        await idbSet('edges', newEdges);
        
        // 清除消息存储中除根节点外的所有消息
        const msgStore = useMsgStore.getState();
        const rootMsgs = msgStore.msgs.filter(msg => msg.nodeId === 'root');
        await idbSet('msgs', rootMsgs);
        msgStore.setAll(rootMsgs);
        
        console.log(`[${new Date().toISOString()}] 已清空除根节点外的所有节点和消息`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 清空节点失败:`, error);
      
      // 回退到原有实现
      // 保留根节点
      const rootNode = get().nodes.find(node => node.id === 'root') || ROOT_NODE;
      
      // 设置新的节点和边数组
      const newNodes = [rootNode];
      const newEdges: Edge[] = [];
      
      // 重置上下文
      useContextStore.getState().initializeContextState('root', 'default');
      
      // 更新状态
      set({ 
        nodes: newNodes, 
        edges: newEdges
      });
      
      // 保存到 IndexedDB
      await idbSet('nodes', newNodes);
      await idbSet('edges', newEdges);
      
      // 清除消息存储中除根节点外的所有消息
      const msgStore = useMsgStore.getState();
      const rootMsgs = msgStore.msgs.filter(msg => msg.nodeId === 'root');
      await idbSet('msgs', rootMsgs);
      msgStore.setAll(rootMsgs);
      
      console.log(`[${new Date().toISOString()}] 已清空除根节点外的所有节点和消息`);
    }
  },
}))
