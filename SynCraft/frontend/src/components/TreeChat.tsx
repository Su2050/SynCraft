import React, { useEffect, useState, memo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  ConnectionLineType,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  NodeProps,
  NodeTypes,
  EdgeProps,
  EdgeTypes,
  Position,
  getBezierPath,
  Handle,
} from 'react-flow-renderer'

import { useTreeStore } from '../store/treeStore'
import { useMsgStore } from '../store/messageStore'  // 引入消息存储
import { useSessionStore } from '../store/sessionStore'  // 引入会话存储
import { useContextStore, MAIN_CHAT_CONTEXT_ID } from '../store/contextStore'  // 引入上下文管理

// 自定义节点组件
const CustomNode = memo(({ id, data }: NodeProps) => {
  // 从contextStore中获取活动节点ID
  const isActive = id === useContextStore.getState().getActiveNodeId(MAIN_CHAT_CONTEXT_ID);
  const isFork = data?.isFork;
  
  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        border: isFork ? '2px dashed #3b82f6' : '1px solid #ddd',
        backgroundColor: isActive ? '#3b82f6' : isFork ? '#ebf5ff' : 'white', // 蓝色填充或浅蓝色背景
        color: isActive ? 'white' : 'black',
        width: '150px',
        textAlign: 'center',
        position: 'relative', // 添加相对定位
      }}
      title={isFork ? "分叉节点" : "普通节点"}
    >
      {/* 分叉标记 */}
      {isFork && (
        <div 
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⑂
        </div>
      )}
      {/* 添加源句柄 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-source`}
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />
      
      {/* 添加目标句柄 */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />
      
      {data.label}
    </div>
  );
});

// 根节点组件
const RootNode = memo(({ id, data }: NodeProps) => {
  // 从contextStore中获取活动节点ID
  const isActive = id === useContextStore.getState().getActiveNodeId(MAIN_CHAT_CONTEXT_ID);
  
  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        border: '2px solid #4b5563',
        backgroundColor: isActive ? '#3b82f6' : '#f3f4f6',
        color: isActive ? 'white' : 'black',
        width: '150px',
        textAlign: 'center',
        fontWeight: 'bold',
        position: 'relative', // 添加相对定位
      }}
    >
      {/* 添加源句柄 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-source`}
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />
      
      {/* 添加目标句柄 */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />
      
      {data.label}
    </div>
  );
});

// 自定义边组件
const CustomEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={{ ...style, strokeWidth: 2, stroke: '#3b82f6' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
};

// 节点类型映射
const nodeTypes: NodeTypes = {
  custom: CustomNode,
  root: RootNode,
};

// 边类型映射
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

/* 仅本地布局用的临时 id */
const makeId = () =>
  'n-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)

export default function TreeChat() {
  /* —— store —— */
  const {
    nodes: savedN,
    edges: savedE,
    load,
    setAll,
    addChild,
    autoLayoutTrigger, // 自动排列触发器
  } = useTreeStore()
  
  const { setActive, getActiveNodeId } = useContextStore()
  
  /* —— 会话管理 —— */
  const { activeSessionId, sessions } = useSessionStore()

  /* —— React-Flow runtime —— */
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [loaded, setLoaded] = useState(false)
  const [menu, setMenu] =
    useState<{ x: number; y: number; nodeId: string } | null>(null)
  
  /* —— 对话框状态 —— */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogNodeId, setDialogNodeId] = useState<string | null>(null)
  const [dialogInput, setDialogInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // 使用useRef缓存push函数，避免不必要的重新渲染
  const pushRef = useRef(useMsgStore.getState().push);

  /* 加载 IndexedDB */
  useEffect(() => {
    load().then(() => setLoaded(true))
  }, [load])

  // 使用useMemo缓存节点处理结果，并根据当前会话过滤节点
  const customNodes = React.useMemo(() => {
    if (!savedN) return [];
    
    // 获取当前会话
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return [];
    
    // 获取当前会话的根节点ID
    const rootNodeId = activeSession.rootNodeId;
    
    // 获取当前会话的所有节点ID（包括根节点及其所有子孙节点）
    const sessionNodeIds = new Set<string>([rootNodeId]);
    
    // 使用BFS算法找出根节点的所有子孙节点
    const queue = [rootNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      // 找出以当前节点为源的所有边
      savedE.forEach(edge => {
        if (edge.source === currentId) {
          const targetId = edge.target;
          if (!sessionNodeIds.has(targetId)) {
            sessionNodeIds.add(targetId);
            queue.push(targetId);
          }
        }
      });
    }
    
    // 过滤出当前会话的节点
    const filteredNodes = savedN.filter(node => sessionNodeIds.has(node.id));
    
    // 处理节点类型
    return filteredNodes.map(node => {
      if (node.id === 'root') {
        return {
          ...node,
          type: 'root', // 使用根节点类型
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
      }
      return {
        ...node,
        type: 'custom', // 使用自定义节点类型
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });
  }, [savedN, savedE, activeSessionId]);
  
  // 使用useMemo缓存边处理结果，并根据当前会话过滤边
  const customEdges = React.useMemo(() => {
    if (!savedE) return [];
    
    // 获取当前会话
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return [];
    
    // 获取当前会话的根节点ID
    const rootNodeId = activeSession.rootNodeId;
    
    // 获取当前会话的所有节点ID（包括根节点及其所有子孙节点）
    const sessionNodeIds = new Set<string>([rootNodeId]);
    
    // 使用BFS算法找出根节点的所有子孙节点
    const queue = [rootNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      // 找出以当前节点为源的所有边
      savedE.forEach(edge => {
        if (edge.source === currentId) {
          const targetId = edge.target;
          if (!sessionNodeIds.has(targetId)) {
            sessionNodeIds.add(targetId);
            queue.push(targetId);
          }
        }
      });
    }
    
    // 过滤出当前会话的边
    const filteredEdges = savedE.filter(edge => 
      sessionNodeIds.has(edge.source) && sessionNodeIds.has(edge.target)
    );
    
    // 确保所有边都有正确的样式
    return filteredEdges.map(edge => ({
      ...edge,
      type: 'custom', // 使用自定义边类型
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    }));
  }, [savedE, activeSessionId]);

  /* 初始加载标志 */
  const initialLoadRef = useRef(true);
  
  /* 把 store 数据灌进画布 */
  useEffect(() => {
    if (!loaded) return
    
    console.log('Setting nodes:', customNodes);
    setNodes(customNodes)
    
    console.log('Setting edges:', customEdges);
    setEdges(customEdges)
    
    // 只在真正的初始加载时设置根节点为活动节点
    if (initialLoadRef.current && customNodes.length > 0) {
      initialLoadRef.current = false; // 标记初始加载已完成
      
      // 只有在没有活动节点时才设置
      if (!getActiveNodeId(MAIN_CHAT_CONTEXT_ID)) {
        const rootNode = customNodes.find(node => node.id === 'root');
        if (rootNode) {
          console.log(`[${new Date().toISOString()}] 初始加载 - 设置根节点为活动节点:`, rootNode.id);
          setActive(rootNode.id, 'TreeChat-initialLoad', MAIN_CHAT_CONTEXT_ID);
        } else if (customNodes[0]) {
          // 如果没有找到根节点，则设置第一个节点为活动节点
          console.log(`[${new Date().toISOString()}] 初始加载 - 设置第一个节点为活动节点:`, customNodes[0].id);
          setActive(customNodes[0].id, 'TreeChat-initialLoad-firstNode', MAIN_CHAT_CONTEXT_ID);
        }
      }
    }
  }, [loaded, customNodes, customEdges, setActive])

  /* 会话切换时重新加载节点和边 */
  useEffect(() => {
    if (!loaded) return
    
    // 获取当前会话
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;
    
    console.log('Session changed, reloading nodes and edges for session:', activeSession.name);
    
    // 设置当前活动节点为该会话的根节点
    const rootNodeId = activeSession.rootNodeId;
    
    // 检查根节点是否存在于节点列表中
    const rootNodeExists = savedN.some(node => node.id === rootNodeId);
    
    if (!rootNodeExists) {
      console.warn(`Root node ${rootNodeId} not found in nodes list. Creating a new root node.`);
      
      // 创建一个新的根节点
      const newRootNode: Node = {
        id: rootNodeId,
        position: { x: 120, y: 80 },
        data: { 
          label: '根节点', 
          answer: ''
        },
        type: 'root',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
      
      // 将新根节点添加到节点列表中
      const nextNodes = [...savedN, newRootNode as any];
      setAll(nextNodes, savedE);
      
      // 重新计算customNodes和customEdges
      setTimeout(() => {
        console.log('Setting nodes after creating root node:', customNodes);
        setNodes(customNodes);
        
        console.log('Setting edges after creating root node:', customEdges);
        setEdges(customEdges);
      }, 100);
    } else {
      // 重新设置节点和边
      console.log('Setting nodes for session:', customNodes);
      setNodes(customNodes);
      
      console.log('Setting edges for session:', customEdges);
      setEdges(customEdges);
    }
    
    // 注意：不在这里设置活动节点，让ChatPanel.tsx处理活动节点的设置
    console.log(`[${new Date().toISOString()}] 会话切换，不自动设置活动节点，当前活动节点: ${getActiveNodeId(MAIN_CHAT_CONTEXT_ID)}`);
  }, [activeSessionId, loaded, savedN, savedE, customNodes, customEdges, setAll])

  /* 任何拖动 / 新增后写回 IndexedDB */
  useEffect(() => {
    if (loaded) {
      // 使用防抖函数减少写入频率
      const timeoutId = setTimeout(() => {
        setAll(nodes, edges);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, loaded, setAll])
  
  /* 监听自动排列触发器，当触发器变化时自动调用自动排列函数 */
  useEffect(() => {
    if (loaded && autoLayoutTrigger > 0) {
      console.log(`[${new Date().toISOString()}] 自动排列触发器变化，触发自动排列，当前值: ${autoLayoutTrigger}`);
      autoLayout();
    }
  }, [autoLayoutTrigger, loaded])

  /* —— 收集后代 —— */
  const collectDescendants = (parentId: string): Set<string> => {
    const desc = new Set<string>()
    const stack = edges.filter(e => e.source === parentId).map(e => e.target)
    while (stack.length) {
      const id = stack.pop()!
      if (!desc.has(id)) {
        desc.add(id)
        edges.forEach(e => e.source === id && stack.push(e.target))
      }
    }
    return desc
  }

  /* —— 显示添加子节点对话框 —— */
  const showAddChildDialog = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId)
    if (!parent) return

    setDialogNodeId(parentId)
    setDialogInput('')
    setDialogOpen(true)
  }

  /* —— 确认添加子节点 —— */
  const confirmAddChild = async () => {
    if (!dialogNodeId) return
    
    setIsLoading(true)
    setErrorMsg('')
    
    try {
      // 使用对话框中的输入作为问题
      const question = dialogInput.trim() || 'New'
      // 调用后端创建节点
      await addChild(dialogNodeId, question)
      
      // 关闭对话框
      setDialogOpen(false)
      setDialogNodeId(null)
      setDialogInput('')
    } catch (error) {
      console.error('创建子节点失败:', error)
      setErrorMsg(error instanceof Error ? error.message : '创建子节点失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNode = (id: string) => {
    const del = collectDescendants(id); del.add(id)
    setNodes(n => n.filter(x => !del.has(x.id)))
    setEdges(e => e.filter(x => !del.has(x.source) && !del.has(x.target)))
  }

  const toggleCollapse = (parentId: string) => {
    const desc = collectDescendants(parentId)
    const hide = !nodes.some(n => desc.has(n.id) && n.hidden)
    setNodes(n => n.map(x => (desc.has(x.id) ? { ...x, hidden: hide } : x)))
    setEdges(e => e.map(x => (desc.has(x.source) || desc.has(x.target)) ? { ...x, hidden: hide } : x))
  }

  /* —— 右键菜单 —— */
  const onContext: NodeMouseHandler = (e, node) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }

  /* —— 自动布局函数 —— */
  const autoLayout = () => {
    if (nodes.length === 0) return;
    
    // 创建一个新的节点数组，以便进行布局
    const newNodes = [...nodes];
    
    // 使用简单的树形布局算法
    const nodeMap = new Map();
    newNodes.forEach(node => nodeMap.set(node.id, node));
    
    // 找出根节点
    const rootNode = newNodes.find(node => node.id === 'root' || node.id.startsWith('root-'));
    if (!rootNode) return;
    
    // 设置根节点位置
    rootNode.position = { x: 250, y: 50 };
    
    // 使用BFS算法遍历树并设置节点位置
    const queue = [rootNode.id];
    const visited = new Set([rootNode.id]);
    const levels = new Map();
    levels.set(rootNode.id, 0);
    
    // 每个级别的节点数量
    const nodesPerLevel = new Map();
    nodesPerLevel.set(0, 1);
    
    // 计算每个节点的级别
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentLevel = levels.get(currentId);
      
      // 获取当前节点的所有子节点
      const childEdges = edges.filter(edge => edge.source === currentId);
      let childCount = 0;
      
      for (const edge of childEdges) {
        const childId = edge.target;
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
          
          // 设置子节点的级别
          const childLevel = currentLevel + 1;
          levels.set(childId, childLevel);
          
          // 更新每个级别的节点数量
          nodesPerLevel.set(childLevel, (nodesPerLevel.get(childLevel) || 0) + 1);
          
          childCount++;
        }
      }
    }
    
    // 计算每个级别的垂直位置
    const levelHeight = 120; // 每个级别的高度
    
    // 计算每个级别的水平位置
    const levelWidth = 500; // 画布宽度
    const levelPositions = new Map();
    
    for (const [level, count] of nodesPerLevel.entries()) {
      const positions = [];
      const spacing = levelWidth / (count + 1);
      
      for (let i = 1; i <= count; i++) {
        positions.push(i * spacing);
      }
      
      levelPositions.set(level, positions);
    }
    
    // 重置每个级别的节点计数器
    const levelCounters = new Map();
    
    // 再次使用BFS算法设置节点位置
    const positionQueue = [rootNode.id];
    const positionVisited = new Set([rootNode.id]);
    
    while (positionQueue.length > 0) {
      const currentId = positionQueue.shift()!;
      const currentLevel = levels.get(currentId);
      
      // 获取当前节点的所有子节点
      const childEdges = edges.filter(edge => edge.source === currentId);
      
      for (const edge of childEdges) {
        const childId = edge.target;
        if (!positionVisited.has(childId)) {
          positionVisited.add(childId);
          positionQueue.push(childId);
          
          // 获取子节点的级别
          const childLevel = levels.get(childId);
          
          // 获取该级别的当前计数器值
          const counter = levelCounters.get(childLevel) || 0;
          
          // 获取该级别的水平位置
          const positions = levelPositions.get(childLevel);
          
          // 设置子节点的位置
          const node = nodeMap.get(childId);
          if (node) {
            node.position = {
              x: positions[counter],
              y: childLevel * levelHeight + 50
            };
          }
          
          // 更新计数器
          levelCounters.set(childLevel, counter + 1);
        }
      }
    }
    
    // 更新节点
    setNodes([...newNodes]);
  };

  /* —— 渲染 —— */
  return (
    <div style={{ height: 500, position: 'relative' }}>
      {/* 添加自动布局按钮 */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 10 
      }}>
        <button 
          onClick={autoLayout}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '14px' }}>🔄</span>
          自动排列
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes} // 添加边类型
        // 点击节点时不再设置活动节点，避免影响ChatPanel中的内容
        onNodeClick={(_, node) => {
          // 只显示节点信息，不设置为活动节点
          console.log('Node clicked:', node.id, node.data?.label);
          // 不再调用setActive(node.id)
        }}
        onNodeContextMenu={onContext}
        fitView
        onPaneClick={() => { 
          // 只关闭菜单，不再清除活动节点
          setMenu(null); 
          // 不再设置setActive(null)，保持当前选中的节点
        }}
        // 添加边的默认样式
        defaultEdgeOptions={{
          type: 'custom', // 使用自定义边类型
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        }}
        // 确保连线可见
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.Bezier}
        elementsSelectable={true}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      {/* 右键菜单 */}
      {menu && (
        <ul
          style={{
            position: 'absolute',
            top: menu.y,
            left: menu.x,
            listStyle: 'none',
            margin: 0,
            padding: 8,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          <li style={{ cursor: 'pointer' }} onClick={() => { showAddChildDialog(menu.nodeId); setMenu(null) }}>➕ Add child</li>
          <li style={{ cursor: 'pointer' }} onClick={() => { toggleCollapse(menu.nodeId); setMenu(null) }}>🡻 Collapse / Expand</li>
          <li style={{ cursor: 'pointer' }} onClick={() => { deleteNode(menu.nodeId); setMenu(null) }}>🗑 Delete</li>
        </ul>
      )}
      {/* 添加子节点对话框 */}
      {dialogOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90%',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>添加子节点</h3>
            <p style={{ marginBottom: '15px' }}>请输入您的问题：</p>
            <textarea
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault(); // 阻止默认的换行行为
                  confirmAddChild();
                }
              }}
              style={{
                width: '100%',
                height: '100px',
                padding: '8px',
                marginBottom: '15px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
              placeholder="输入您的问题...(按Enter确认，Shift+Enter换行)"
            />
            {errorMsg && (
              <div style={{ 
                color: 'red', 
                marginBottom: '15px', 
                padding: '8px', 
                backgroundColor: '#ffeeee', 
                borderRadius: '4px' 
              }}>
                {errorMsg}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDialogOpen(false)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                取消
              </button>
              <button
                onClick={confirmAddChild}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px'
                    }}></span>
                    处理中...
                  </>
                ) : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
