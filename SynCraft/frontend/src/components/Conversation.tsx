import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMsgStore } from "../store/messageStore";
import { useTreeStore } from "../store/treeStore";
import { useContextStore, MAIN_CHAT_CONTEXT_ID, ContextId } from "../store/contextStore";
import { useSideTabStore } from "../store/tabStore";
import { useSessionStore } from "../store/sessionStore";

interface Props {
  rootNodeId: string;
  // 添加contextId参数，用于指定当前上下文
  contextId?: ContextId;
}

// 使用React.memo包装组件，避免不必要的重新渲染
const Conversation = React.memo(({ rootNodeId, contextId = MAIN_CHAT_CONTEXT_ID }: Props) => {
  // 获取当前会话
  const { activeSessionId, sessions } = useSessionStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  // 获取所有消息
  const msgs = useMsgStore((s) => {
    const messages = Array.isArray(s.msgs) ? s.msgs : [];
    return messages;
  });
  
  // 获取当前上下文的活动节点ID和getNodePath函数以及上下文管理函数
  const { nodes, edges, getNodePath } = useTreeStore(state => ({
    nodes: state.nodes,
    edges: state.edges,
    getNodePath: state.getNodePath
  }));
  
  const { getActiveNodeId, lastActiveNodeUpdate, createContextId, getCurrentContext } = useContextStore(state => ({
    getActiveNodeId: state.getActiveNodeId,
    lastActiveNodeUpdate: state.lastActiveNodeUpdate,
    createContextId: state.createContextId,
    getCurrentContext: state.getCurrentContext
  }));
  
  // 获取当前上下文的活动节点ID
  const activeNodeId = getActiveNodeId(contextId);
  
  // 获取当前会话的所有节点ID
  const getSessionNodeIds = (sessionRootId: string): Set<string> => {
    if (!sessionRootId) return new Set<string>();
    
    const sessionNodeIds = new Set<string>([sessionRootId]);
    
    // 使用BFS算法找出根节点的所有子孙节点
    const queue = [sessionRootId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      // 找出以当前节点为源的所有边
      edges.forEach(edge => {
        if (edge.source === currentId) {
          const targetId = edge.target;
          if (!sessionNodeIds.has(targetId)) {
            sessionNodeIds.add(targetId);
            queue.push(targetId);
          }
        }
      });
    }
    
    return sessionNodeIds;
  };
  
  // 使用useMemo缓存过滤后的消息
  const filteredMsgs = React.useMemo(() => {
    // 如果没有活动会话或根节点ID，返回空数组
    if (!rootNodeId) {
      console.log(`[${new Date().toISOString()}] 没有根节点ID，返回空消息数组`);
      return [];
    }
    
    // 获取当前会话的所有节点ID
    const sessionNodeIds = getSessionNodeIds(rootNodeId);
    
    // 获取当前上下文信息
    const currentContext = getCurrentContext();
    
    // 调试日志
    console.log(`[${new Date().toISOString()}] Conversation - 根节点ID:`, rootNodeId);
    console.log(`[${new Date().toISOString()}] Conversation - 当前上下文 ${contextId} 的活动节点ID:`, activeNodeId);
    console.log(`[${new Date().toISOString()}] Conversation - 当前上下文信息:`, currentContext);
    console.log(`[${new Date().toISOString()}] Conversation - 当前会话节点数:`, sessionNodeIds.size);
    console.log(`[${new Date().toISOString()}] Conversation - 最后活动节点更新:`, 
      `${new Date(lastActiveNodeUpdate.timestamp).toLocaleTimeString()} - ${lastActiveNodeUpdate.source} - ${lastActiveNodeUpdate.nodeId || '无'} - ${lastActiveNodeUpdate.contextId}`);
    
    // 获取从活动节点到根节点的路径
    const nodePath = getNodePath(activeNodeId);
    console.log(`[${new Date().toISOString()}] Conversation - 从活动节点到根节点的路径:`, nodePath);
    
    // 创建一个Set，方便快速查找
    const nodePathSet = new Set(nodePath);
    
    // 检查活动节点是否有效，但不要自动重置活动节点
    // 这可能会导致活动节点被错误地重置为根节点
    if (activeNodeId && !nodes.some(node => node.id === activeNodeId)) {
      console.warn(`[${new Date().toISOString()}] 活动节点 ${activeNodeId} 不存在于节点列表中，但不会自动重置`);
      // 不再自动将活动节点重置为根节点
    }
    
    // 过滤消息：只显示从活动节点到根节点的路径上的节点的消息
    // 如果活动节点为空或无效，则显示所有会话节点的消息
    const result = msgs
      .filter(m => {
        // 首先检查消息是否属于当前会话
        if (!sessionNodeIds.has(m.nodeId)) return false;
        
        // 获取消息对应的节点
        const node = nodes.find(n => n.id === m.nodeId);
        if (!node) return false;
        
        // 如果活动节点为空或无效，显示所有会话节点的消息
        if (!activeNodeId || !nodePathSet.size) {
          // 如果节点没有上下文ID，或者节点的上下文ID与当前上下文ID相同，则保留
          return !node.data.contextId || node.data.contextId === contextId;
        }
        
        // 检查节点是否在从活动节点到根节点的路径上
        if (!nodePathSet.has(m.nodeId)) return false;
        
        // 如果节点没有上下文ID，或者节点的上下文ID与当前上下文ID相同，则保留
        // 这样可以兼容旧数据，同时确保只显示当前上下文的消息
        return !node.data.contextId || node.data.contextId === contextId;
      })
      .sort((a, b) => {
        // 获取节点a和节点b在路径中的位置
        const aIndex = nodePath.indexOf(a.nodeId);
        const bIndex = nodePath.indexOf(b.nodeId);
        
        // 如果节点a和节点b是同一个节点，按时间戳排序
        if (aIndex === bIndex) {
          return a.ts - b.ts;
        }
        
        // 否则，按照节点在路径中的位置排序（从根节点到活动节点）
        return aIndex - bIndex;
      });
    
    console.log(`[${new Date().toISOString()}] 过滤后的消息数量: ${result.length}`);
    
    // 如果过滤后没有消息，但活动节点有效，检查是否有活动节点的消息
    if (result.length === 0 && activeNodeId) {
      const activeNodeMsgs = msgs.filter(m => m.nodeId === activeNodeId);
      if (activeNodeMsgs.length > 0) {
        console.log(`[${new Date().toISOString()}] 活动节点 ${activeNodeId} 有 ${activeNodeMsgs.length} 条消息，但过滤后没有消息`);
        // 如果活动节点有消息，但过滤后没有消息，可能是路径计算错误，尝试直接返回活动节点的消息
        return activeNodeMsgs.sort((a, b) => a.ts - b.ts);
      }
    }
    
    return result;
  }, [msgs, activeNodeId, rootNodeId, activeSessionId, lastActiveNodeUpdate, edges, contextId, nodes]);

  // 引用，用于滚动到最新消息
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // 添加状态来跟踪用户是否手动滚动
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [prevMsgsLength, setPrevMsgsLength] = useState(0);
  
  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.conversation-container');
      if (!container) return;
      
      // 检查是否滚动到底部
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      
      // 如果不在底部，标记用户已滚动
      if (!isAtBottom) {
        setUserHasScrolled(true);
      } else {
        // 如果滚动到底部，重置标记
        setUserHasScrolled(false);
      }
    };
    
    const container = document.querySelector('.conversation-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // 只在新消息到达且用户未手动滚动时，自动滚动到底部
  useEffect(() => {
    // 检查是否有新消息
    const hasNewMessages = filteredMsgs.length > prevMsgsLength;
    setPrevMsgsLength(filteredMsgs.length);
    
    // 只有在有新消息且用户未手动滚动时，才自动滚动到底部
    if (hasNewMessages && !userHasScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMsgs, userHasScrolled, prevMsgsLength]);

  // 文本选择状态
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    range: Range;
    position: { x: number; y: number };
  } | null>(null);

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        // 显示一个小弹出菜单，包含"深挖一下"选项
        setSelectionMenu({
          text: selectedText,
          range: range,
          position: {
            x: range.getBoundingClientRect().right,
            y: range.getBoundingClientRect().bottom
          }
        });
      }
    }
  };

  // 处理"深挖一下"
  const handleDeepDive = (nodeId: string, selectedText: string | null) => {
    // 为新的深挖创建上下文ID
    const deepDiveContextId = createContextId('deepdive', nodeId);
    console.log(`[${new Date().toISOString()}] Conversation - handleDeepDive - 新的深挖上下文ID:`, deepDiveContextId);
    
    // 打开右侧Tab
    useSideTabStore.getState().openSideTab(nodeId, selectedText);
    // 清除选择菜单
    setSelectionMenu(null);
  };

  // 准备消息列表
  const prepareMessages = () => {
    // 按照节点ID分组消息
    const messagesByNode = filteredMsgs.reduce((acc, msg) => {
      if (!acc[msg.nodeId]) {
        acc[msg.nodeId] = [];
      }
      acc[msg.nodeId].push(msg);
      return acc;
    }, {} as Record<string, typeof filteredMsgs>);
    
    // 对每个节点的消息按时间戳排序（确保Q在A之前）
    Object.values(messagesByNode).forEach(nodeMsgs => {
      nodeMsgs.sort((a, b) => a.ts - b.ts);
    });
    
    // 获取节点路径（从根节点到活动节点）
    const nodePath = getNodePath(activeNodeId);
    console.log(`[${new Date().toISOString()}] 节点路径:`, nodePath);
    
    // 按照节点路径排序节点（从根节点到活动节点）
    const sortedNodeIds = Object.keys(messagesByNode).sort((a, b) => {
      const aIndex = nodePath.indexOf(a);
      const bIndex = nodePath.indexOf(b);
      
      // 如果节点不在路径中，放在最后
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      // 按照节点在路径中的位置排序（从根节点到活动节点）
      // 根节点在路径的最后，但我们希望它显示在最前面
      // 所以我们反转排序逻辑，使根节点显示在最前面
      return bIndex - aIndex;
    });
    
    console.log(`[${new Date().toISOString()}] 排序后的节点IDs:`, sortedNodeIds);
    
    // 将所有消息展平为一个数组
    return sortedNodeIds.flatMap(nodeId => messagesByNode[nodeId]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 relative conversation-container">
      {/* 显示活动节点信息 */}
      <div className="bg-gray-100 p-2 mb-4 rounded text-xs">
        <div><strong>上下文ID:</strong> {contextId}</div>
        <div><strong>活动节点ID:</strong> {activeNodeId || '无'}</div>
        <div><strong>活动节点内容:</strong> {
          (() => {
            if (!activeNodeId) return '无';
            
            // 获取活动节点的用户消息
            const activeNodeMsgs = msgs.filter(m => m.nodeId === activeNodeId && m.role === 'user');
            if (activeNodeMsgs.length > 0) {
              // 截取前50个字符，如果超过50个字符，则添加省略号
              const content = activeNodeMsgs[0].content;
              return content.length > 50 ? content.substring(0, 50) + '...' : content;
            }
            return '无用户消息';
          })()
        }</div>
        <div><strong>根节点ID:</strong> {rootNodeId}</div>
        <div><strong>会话根节点ID:</strong> {activeSession?.rootNodeId || '无'}</div>
        <div><strong>显示的节点IDs及内容:</strong></div>
        <div className="pl-4">
          {getNodePath(activeNodeId).map(nodeId => {
            // 获取节点的用户消息
            const nodeMsgs = msgs.filter(m => m.nodeId === nodeId && m.role === 'user');
            const content = nodeMsgs.length > 0 
              ? (nodeMsgs[0].content.length > 30 ? nodeMsgs[0].content.substring(0, 30) + '...' : nodeMsgs[0].content)
              : '无用户消息';
            
            return (
              <div key={nodeId}>
                <strong>{nodeId}:</strong> {content}
              </div>
            );
          })}
        </div>
        <div><strong>当前会话节点数:</strong> {getSessionNodeIds(rootNodeId).size}</div>
        <div><strong>消息总数:</strong> {msgs.length}</div>
        <div><strong>过滤后消息数:</strong> {filteredMsgs.length}</div>
        <div><strong>最后活动节点更新:</strong> {
          `${new Date(lastActiveNodeUpdate.timestamp).toLocaleTimeString()} - ${lastActiveNodeUpdate.source} - ${lastActiveNodeUpdate.nodeId || '无'} - ${lastActiveNodeUpdate.contextId}`
        }</div>
      </div>
      
      {/* 消息列表 - 按照QA对分组并排序 */}
      <div className="space-y-4">
        {prepareMessages().map((m) => (
          <div
            key={m.id}
            id={`msg-${m.nodeId}`}  // 为每个消息气泡添加 id，方便定位
            className={
              m.role === "user"
                ? "self-end bg-blue-50 px-3 py-2 rounded-lg max-w-[75%] relative"
                : "self-start bg-gray-100 px-3 py-2 rounded-lg max-w-[75%] relative"
            }
          >
            {/* 添加点击事件，点击消息气泡时定位到该消息 */}
            <div onMouseUp={m.role === "assistant" ? handleTextSelection : undefined}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>

            {/* 消息操作按钮 */}
            {m.role === "assistant" && (
              <div className="message-actions opacity-0 hover:opacity-100 absolute right-2 bottom-2 transition-opacity duration-200">
                <button 
                  onClick={() => handleDeepDive(m.nodeId, m.content)}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 shadow-sm"
                >
                  深挖一下 👉
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 文本选择菜单 */}
      {selectionMenu && (
        <div 
          className="absolute bg-white shadow-lg rounded p-2 z-10"
          style={{
            left: selectionMenu.position.x + 'px',
            top: selectionMenu.position.y + 'px',
          }}
        >
          <button 
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            onClick={() => {
              const nodeId = filteredMsgs.find(m => 
                m.role === "assistant" && 
                m.content.includes(selectionMenu.text)
              )?.nodeId;
              
              if (nodeId) {
                handleDeepDive(nodeId, selectionMenu.text);
              }
            }}
          >
            深挖选中内容
          </button>
        </div>
      )}
      
      <div ref={bottomRef} />  {/* 用于滚动到最新消息 */}
    </div>
  );
});

export default Conversation;
