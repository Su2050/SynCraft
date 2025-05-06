// frontend/src/store/treeStore.ts
import { create } from 'zustand'
import { useMsgStore } from "./messageStore"
import { useLogStore } from "./logStore"  // 引入日志存储
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { Node, Edge, MarkerType, Position } from 'react-flow-renderer'
import { createNode } from '../api'          // 调后端 /nodes
import type { ChatNode } from '../types'
import { useContextStore } from './contextStore'

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
        // 尝试从 IndexedDB 加载数据
        const savedNodes = await idbGet('nodes') as Node[] | undefined;
        const savedEdges = await idbGet('edges') as Edge[] | undefined;
        
        // 如果 IndexedDB 中没有数据，则创建根节点
        if (!savedNodes || savedNodes.length === 0) {
          // 只创建根节点
          const nodes: Node[] = [ROOT_NODE];
          
          // 没有测试节点，所以没有边
          const edges: Edge[] = [];
          
          // 保存到 IndexedDB
          await idbSet('nodes', nodes);
          await idbSet('edges', edges);
          
          // 初始化上下文
          useContextStore.getState().initializeContextState('root', 'default');
          
          set({ 
            nodes, 
            edges
          });
        } else {
          // 如果 IndexedDB 中有数据，则使用它
          // 确保所有边都有正确的样式
          const formattedEdges = (savedEdges || []).map(edge => ({
            ...edge,
            type: 'custom', // 使用自定义边类型
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#3b82f6', strokeWidth: 2 }
          }));
          
          // 检查是否有节点但没有边，如果是这种情况，可能需要重建边
          if (savedNodes.length > 1 && (!savedEdges || savedEdges.length === 0)) {
            console.log("检测到节点但没有边，尝试重建边...");
            // 假设第一个节点是根节点，其他节点都连接到根节点
            // 这是一个简单的修复方案，实际情况可能需要更复杂的逻辑
            const newEdges: Edge[] = [];
            const rootId = savedNodes[0].id;
            
            for (let i = 1; i < savedNodes.length; i++) {
              const node = savedNodes[i];
              newEdges.push({
                id: `${rootId}-${node.id}`,
                source: rootId,
                target: node.id,
                type: 'custom', // 使用自定义边类型
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: '#3b82f6', strokeWidth: 2 }
              });
            }
            
            // 保存新创建的边
            await idbSet('edges', newEdges);
            
            // 初始化上下文
            const initialActiveNodeId = savedNodes.length > 0 ? savedNodes[0].id : null;
            // 获取第一个节点的会话ID，如果没有则使用默认会话ID
            const sessionId = savedNodes.length > 0 && savedNodes[0].data.sessionId ? savedNodes[0].data.sessionId : 'default';
            useContextStore.getState().initializeContextState(initialActiveNodeId, sessionId);
            
            set({ 
              nodes: savedNodes, 
              edges: newEdges
            });
          } else {
            // 初始化上下文
            const initialActiveNodeId = savedNodes.length > 0 ? savedNodes[0].id : null;
            // 获取第一个节点的会话ID，如果没有则使用默认会话ID
            const sessionId = savedNodes.length > 0 && savedNodes[0].data.sessionId ? savedNodes[0].data.sessionId : 'default';
            useContextStore.getState().initializeContextState(initialActiveNodeId, sessionId);
            
            set({ 
              nodes: savedNodes, 
              edges: formattedEdges
            });
          }
        }
        
        resolve();
      } catch (error) {
        console.error('Error initializing tree store:', error);
        
        // 出错时，创建根节点
        const nodes: Node[] = [ROOT_NODE];
        const edges: Edge[] = [];
        
        await idbSet('nodes', nodes);
        await idbSet('edges', edges);
        
        // 初始化上下文
        useContextStore.getState().initializeContextState('root', 'default');
        
        set({ 
          nodes, 
          edges
        });
        
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
      
      /* —— 1. 调后端 —— */
      // 检查parentId是否是根节点（以'root'开头）
      const isRootNode = parentId === 'root' || parentId.startsWith('root-');
      const backendParent = isRootNode ? null : parentId;
      
      console.log(`[${new Date().toISOString()}] 调用后端API创建节点 - 后端父节点ID: ${backendParent || 'null'}`);
      const newChat: ChatNode = await createNode(backendParent, question, templateId);
      console.log(`[${new Date().toISOString()}] 后端API返回新节点 - ID: ${newChat.id}`);

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
          contextId: useContextStore.getState().inputContext.contextId // 保存创建节点时的上下文ID
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
      // 获取父节点的会话ID，如果没有则使用默认会话ID
      const parentNode = get().nodes.find(node => node.id === parentId);
      const sessionId = parentNode && parentNode.data.sessionId ? parentNode.data.sessionId : 'default';
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
      throw error;
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
  },
}))
