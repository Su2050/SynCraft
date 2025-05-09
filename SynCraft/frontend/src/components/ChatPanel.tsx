// frontend/src/components/ChatPanel.tsx

import { useState, useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTreeStore } from '../store/treeStore'
import { useSideTabStore } from '../store/tabStore'
import { useSessionStore, Session } from '../store/sessionStore' // 引入会话存储
import Conversation from "./Conversation" // 引入 Conversation 组件
import { useMsgStore } from "../store/messageStore"; // 引入消息存储
import { set as idbSet } from 'idb-keyval'; // 引入 idbSet 函数
import { useContextStore } from '../store/contextStore';
import { useChatLogic } from '../hooks/useChatLogic'; // 导入useChatLogic Hook

export default function ChatPanel() {
  /* ----- 全局 store ----- */
  const { nodes } = useTreeStore()
  const { getCurrentContext } = useContextStore()
  const openSideTab = useSideTabStore(s => s.openSideTab)
  
  /* ----- 会话管理 ----- */
  const { 
    sessions, 
    activeSessionId, 
    createSession, 
    renameSession, 
    deleteSession, 
    setActiveSession 
  } = useSessionStore()
  
  /* ----- 会话状态 ----- */
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [isRenamingSession, setIsRenamingSession] = useState(false)
  const [sessionToRename, setSessionToRename] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  
  /* 获取当前活动会话 */
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { name: '默认会话', rootNodeId: 'root' };

  // 为当前会话生成专属 chat contextId
  const { createContextId } = useContextStore();
  const chatContextId = useMemo(() => {
    return createContextId('chat', null, activeSession?.id || 'default');
  }, [createContextId, activeSession?.id]);

  /* 使用useChatLogic Hook */
  const {
    inputText,
    setInputText,
    isLoading,
    error,
    activeNodeId: chatActiveNodeId,
    handleSend,
    setActiveNode
  } = useChatLogic({
    mode: 'chat',
    rootNodeId: activeSession?.rootNodeId || 'root',
    contextId: chatContextId
  });

  /* 使用 useEffect 处理节点选择逻辑 - 只在初始加载和会话切换时执行 */
  const initialLoadRef = useRef(true);
  useEffect(() => {
    // 只在初始加载或会话切换时设置活动节点
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      
      // 获取当前会话的根节点ID
      const sessionRootNodeId = activeSession?.rootNodeId;
      if (sessionRootNodeId) {
        // 检查节点是否存在
        const nodeExists = nodes.some(node => node.id === sessionRootNodeId);
        if (nodeExists) {
          console.log(`[${new Date().toISOString()}] 初始加载或会话切换，设置活动节点为会话根节点:`, sessionRootNodeId);
          // 如果找到会话根节点，自动设置为当前节点
          setActiveNode(sessionRootNodeId, 'ChatPanel-initialLoad');
        }
      }
    }
  }, [activeSession, nodes, setActiveNode]);
  
  /* 监听会话切换，设置活动节点ID */
  const prevActiveSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    // 只有当会话ID真正变化时才设置活动节点
    if (activeSessionId !== prevActiveSessionIdRef.current) {
      prevActiveSessionIdRef.current = activeSessionId;
      
      // 当会话切换时，设置聊天上下文的活动节点ID为会话根节点ID
      const sessionRootNodeId = activeSession?.rootNodeId || 'root';
      
      // 检查节点是否存在
      const nodeExists = nodes.some(node => node.id === sessionRootNodeId);
      if (nodeExists) {
        console.log(`[${new Date().toISOString()}] 会话真正切换，设置活动节点为会话根节点:`, sessionRootNodeId);
        // 设置聊天上下文的活动节点ID为会话根节点ID
        setActiveNode(sessionRootNodeId, 'ChatPanel-sessionChanged');
      }
    }
  }, [activeSessionId, activeSession, setActiveNode, nodes]);

  /* 创建新会话 */
  const handleCreateSession = async () => {
    try {
      const name = newSessionName.trim() || `新会话 ${sessions.length + 1}`;
      await createSession(name);
      setNewSessionName('');
      setIsCreatingSession(false);
    } catch (error) {
      console.error("创建会话失败:", error);
      alert("创建会话失败");
    }
  }

  /* 获取当前选中节点或根节点 */
  let currentNode = nodes.find(n => n.id === chatActiveNodeId);
  
  // 如果没有会话，显示创建会话按钮
  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-xl text-gray-600 mb-6">没有可用的会话</div>
        <button 
          onClick={() => setIsCreatingSession(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
          style={{ border: '2px solid #3b82f6' }}
        >
          创建新会话
        </button>
        
        {/* 创建会话对话框 */}
        {isCreatingSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full">
              <h3 className="text-lg font-medium mb-4">创建新会话</h3>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="会话名称"
                className="w-full border rounded px-3 py-2 mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsCreatingSession(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSession}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // 如果没有选中节点或找不到当前节点，显示加载提示
  if (!currentNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        正在初始化对话...
      </div>
    );
  }
  
  /* 重命名会话 */
  const handleRenameSession = async () => {
    if (!sessionToRename) return;
    
    try {
      const name = newName.trim();
      if (!name) return;
      
      await renameSession(sessionToRename, name);
      setSessionToRename(null);
      setNewName('');
      setIsRenamingSession(false);
    } catch (error) {
      console.error("重命名会话失败:", error);
      alert("重命名会话失败");
    }
  }
  
  /* 删除会话 */
  const handleDeleteSession = async (id: string) => {
    try {
      if (confirm('确定要删除这个会话吗？')) {
        await deleteSession(id);
      }
    } catch (error) {
      console.error("删除会话失败:", error);
      alert(error instanceof Error ? error.message : "删除会话失败");
    }
  }
  
  /* 切换会话 */
  const handleSwitchSession = (id: string) => {
    setActiveSession(id);
    setIsSessionListOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ===== 会话管理 ===== */}
      <div className="border-b p-2 flex items-center justify-between" style={{ backgroundColor: '#f0f0f0' }}>
        <div className="relative">
          <button 
            onClick={() => setIsSessionListOpen(!isSessionListOpen)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded"
            style={{ border: '2px solid #3b82f6', padding: '8px 12px' }}
          >
            <span className="truncate max-w-[150px]">{activeSession?.name || '默认会话'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* 会话列表下拉菜单 */}
          {isSessionListOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded shadow-lg z-10">
              <div className="p-2 border-b">
                <button 
                  onClick={() => {
                    setIsCreatingSession(true);
                    setIsSessionListOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新建会话
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {sessions.map(session => (
                  <div 
                    key={session.id} 
                    className={`p-2 flex items-center justify-between hover:bg-gray-50 ${session.id === activeSessionId ? 'bg-blue-50' : ''}`}
                  >
                    <button 
                      onClick={() => handleSwitchSession(session.id)}
                      className="flex-1 text-left truncate px-2"
                    >
                      {session.name}
                    </button>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => {
                          setSessionToRename(session.id);
                          setNewName(session.name);
                          setIsRenamingSession(true);
                          setIsSessionListOpen(false);
                        }}
                        className="text-gray-500 hover:text-blue-500 p-1"
                        title="重命名"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {sessions.length > 1 && (
                        <button 
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-gray-500 hover:text-red-500 p-1"
                          title="删除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          {activeSession?.name || '默认会话'}
        </div>
      </div>
      
      {/* ===== 创建会话对话框 ===== */}
      {isCreatingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium mb-4">创建新会话</h3>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="会话名称"
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingSession(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateSession}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ===== 重命名会话对话框 ===== */}
      {isRenamingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium mb-4">重命名会话</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="会话名称"
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsRenamingSession(false);
                  setSessionToRename(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleRenameSession}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ===== 历史 Q&A（活动节点） ===== */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 调试信息 */}
        <div className="bg-yellow-50 p-2 mb-4 rounded text-xs">
          <div><strong>ChatPanel - 上下文ID:</strong> {chatContextId}</div>
          <div><strong>ChatPanel - 当前活动节点ID:</strong> {chatActiveNodeId || '无'}</div>
          <div><strong>ChatPanel - 当前活动节点内容:</strong> {
            (() => {
              // 获取活动节点的用户消息
              const activeNodeMsgs = useMsgStore.getState().msgs.filter(m => m.nodeId === chatActiveNodeId && m.role === 'user');
              if (activeNodeMsgs.length > 0) {
                // 截取前50个字符，如果超过50个字符，则添加省略号
                const content = activeNodeMsgs[0].content;
                return content.length > 50 ? content.substring(0, 50) + '...' : content;
              }
              return '无用户消息';
            })()
          }</div>
          <div><strong>ChatPanel - 当前会话ID:</strong> {activeSessionId || '无'}</div>
          <div><strong>ChatPanel - 当前会话根节点ID:</strong> {activeSession?.rootNodeId || '无'}</div>
          <div><strong>ChatPanel - 当前节点总数:</strong> {nodes.length}</div>
          <div><strong>ChatPanel - 最后活动节点更新:</strong> {
            (() => {
              const lastUpdate = useContextStore.getState().lastActiveNodeUpdate;
              return `${new Date(lastUpdate.timestamp).toLocaleTimeString()} - ${lastUpdate.source} - ${lastUpdate.nodeId || '无'} - ${lastUpdate.contextId}`;
            })()
          }</div>
        </div>
        
        {/* 使用当前会话的根节点作为 Conversation 组件的 rootNodeId，并传递聊天上下文ID */}
        <Conversation rootNodeId={activeSession?.rootNodeId || 'root'} contextId={chatContextId} />
      </div>

      {/* ===== 输入框 ===== */}
      <form
        onSubmit={e => {
          e.preventDefault()
          handleSend()
        }}
        className="border-t p-3 flex gap-2"
      >
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="继续提问…"
          className="flex-1 border rounded resize-none h-20 px-2 py-1"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={`px-4 rounded flex items-center justify-center ${isLoading ? 'bg-blue-400' : 'bg-blue-600'} text-white`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              处理中...
            </>
          ) : '发送'}
        </button>
      </form>
      
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 mx-3 mb-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
