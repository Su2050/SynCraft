import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/store/sessionContext';
import { useMessages } from '@/hooks/useMessages';
import ReactMarkdown from 'react-markdown';
import TreeView from '@/components/TreeView';
import { api } from '@/api';
import toast from 'react-hot-toast'; // 导入toast组件，如果项目中没有，需要安装

/**
 * 聊天页面
 */
export default function ChatPage() {
  const { id: sessionId, nodeId } = useParams<{ id: string; nodeId?: string }>();
  const { activeSession, rootNodeId, mainContextId } = useSession();
  const { messages, isLoading, error, sendMessage } = useMessages(sessionId || '');
  
  // 状态
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 深挖相关状态
  const [deepDiveTabs, setDeepDiveTabs] = useState([{
    id: 'default-tab',
    title: '默认标签页',
    tag: null,
    content: null,
    messages: []
  }]);
  const [activeDeepDiveTab, setActiveDeepDiveTab] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  
  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 处理发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || isSending) return;
    
    setIsSending(true);
    
    try {
      await sendMessage(inputText, nodeId);
      setInputText('');
      
      // 聚焦输入框
      inputRef.current?.focus();
      
      // 清除之前的错误信息
      setErrorMessage(null);
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 设置错误信息
      const errorMsg = '发送消息失败，请稍后重试';
      setErrorMessage(errorMsg);
      
      // 显示错误提示
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };
  
  // 处理输入框按键事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  // 不再在这里显示全局加载状态，而是在各个组件中显示加载状态
  // 显示错误信息
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">加载失败: {error.message}</div>
      </div>
    );
  }
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      setSelectedText(selection.toString());
    }
  };
  
  // 处理深挖
  const handleDeepDive = async () => {
    if (!selectedText) return;
    
    try {
      // 清除之前的错误信息
      setErrorMessage(null);
      
      // 创建深挖上下文
      const response = await api.node.createDeepDive(nodeId || rootNodeId || '', {
        session_id: sessionId || '',
        source: `深挖：${selectedText}`
      });
      
      if (!response || !response.data) {
        throw new Error('创建深挖上下文失败');
      }
      
      const deepDiveContext = response.data;
      
      // 创建新标签页
      const newTab = {
        id: deepDiveContext.id,
        title: selectedText.substring(0, 15) + (selectedText.length > 15 ? '...' : ''),
        context_id: deepDiveContext.context_id,
        active_node_id: deepDiveContext.active_node_id,
        messages: []
      };
      
      setDeepDiveTabs(prev => [...prev, newTab]);
      setActiveDeepDiveTab(deepDiveTabs.length);
      
      // 向深挖上下文发送问题
      const qaResponse = await api.node.askQuestion(deepDiveContext.active_node_id, selectedText);
      
      if (qaResponse && qaResponse.data) {
        // 创建消息对象
        const message = {
          id: `deepdive-${Date.now()}`,
          role: 'assistant',
          content: qaResponse.data.answer,
          timestamp: Date.now()
        };
        
        // 更新标签页内容
        setDeepDiveTabs(prev => {
          const updated = [...prev];
          const index = updated.findIndex(t => t.id === deepDiveContext.id);
          if (index !== -1) {
            updated[index].messages = [
              {
                id: `user-${Date.now()}`,
                role: 'user',
                content: selectedText,
                timestamp: Date.now() - 1000
              },
              message
            ];
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('创建深挖上下文失败:', error);
      
      // 设置错误信息
      const errorMsg = '创建深挖上下文失败，请稍后重试';
      setErrorMessage(errorMsg);
      
      // 显示错误提示
      toast.error(errorMsg);
      
      // 回退到本地实现
      const tag = `deepdive-${Date.now()}`;
      const tabId = `tab-${Date.now()}`;
      
      // 创建新标签页
      const newTab = {
        id: tabId,
        title: selectedText.substring(0, 15) + (selectedText.length > 15 ? '...' : ''),
        tag: tag,
        content: null,
        messages: []
      };
      
      setDeepDiveTabs(prev => [...prev, newTab]);
      setActiveDeepDiveTab(deepDiveTabs.length);
      
      // 发送带有标签的消息
      sendMessage(`深挖：${selectedText}`, nodeId, [tag])
        .then(message => {
          // 更新标签页内容
          setDeepDiveTabs(prev => {
            const updated = [...prev];
            const index = updated.findIndex(t => t.id === tabId);
            if (index !== -1) {
              updated[index].messages = [message];
            }
            return updated;
          });
        });
    }
    
    // 清除选择
    setSelectedText('');
  };
  
  // 标签页管理函数
  const addNewDeepDiveTab = () => {
    const newTab = {
      id: `tab-${Date.now()}`,
      title: '新标签页',
      tag: null,
      content: null,
      messages: []
    };
    
    setDeepDiveTabs(prev => [...prev, newTab]);
    setActiveDeepDiveTab(deepDiveTabs.length);
  };
  
  const closeDeepDiveTab = (index) => {
    if (deepDiveTabs.length <= 1) return;
    
    setDeepDiveTabs(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    // 如果关闭的是当前活动标签页，则切换到前一个标签页
    if (activeDeepDiveTab === index) {
      setActiveDeepDiveTab(Math.max(0, index - 1));
    } else if (activeDeepDiveTab > index) {
      // 如果关闭的标签页在当前活动标签页之前，则需要调整活动标签页索引
      setActiveDeepDiveTab(activeDeepDiveTab - 1);
    }
  };
  
  return (
    <div className="h-screen flex flex-col">
      {/* 头部 */}
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">
            {activeSession?.name || '聊天'}
          </h1>
          {nodeId && (
            <div className="text-sm text-gray-500">
              当前节点: {nodeId}
            </div>
          )}
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowTree(prev => !prev)}
        >
          {showTree ? '隐藏树形图' : '显示树形图'}
        </button>
      </header>
      
      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：树形结构 */}
        <div className="w-1/5 border-r overflow-auto p-2">
          <TreeView />
        </div>
        
        {/* 中间：主对话区域 */}
        <div className="w-2/5 overflow-y-auto p-4 space-y-4 border-r">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">开始新的对话</p>
                <p>在下方输入框中输入消息，开始与AI助手对话</p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'message-user' : 'message-assistant'}
                onMouseUp={handleTextSelection}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                  <button 
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                    }}
                  >
                    复制
                  </button>
                </div>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 右侧：深挖对话区域 */}
        <div className="w-2/5 overflow-hidden flex flex-col">
          {/* 标签页头部 */}
          <div className="flex border-b">
            {deepDiveTabs.map((tab, index) => (
              <button
                key={tab.id}
                className={`px-4 py-2 ${activeDeepDiveTab === index ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveDeepDiveTab(index)}
              >
                {tab.title}
                <span 
                  className="ml-2 text-gray-500" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    closeDeepDiveTab(index); 
                  }}
                >
                  ×
                </span>
              </button>
            ))}
            <button 
              className="px-2 py-2 text-gray-500" 
              onClick={addNewDeepDiveTab}
            >
              +
            </button>
          </div>
          
          {/* 标签页内容 */}
          <div className="flex-1 overflow-y-auto p-4">
            {deepDiveTabs[activeDeepDiveTab]?.messages?.map(message => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'message-user' : 'message-assistant'}
                onMouseUp={handleTextSelection}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                  <button 
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                    }}
                  >
                    复制
                  </button>
                </div>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 深挖按钮 */}
      {selectedText && (
        <div className="fixed bottom-20 right-4 bg-white shadow-lg rounded-lg p-2 z-10">
          <button
            className="btn btn-primary"
            onClick={handleDeepDive}
          >
            深挖选中内容
          </button>
        </div>
      )}
      
      {/* 错误提示 */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4">
          <span className="block sm:inline">{errorMessage}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setErrorMessage(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>关闭</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
      
      {/* 输入框 */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="input flex-1 resize-none h-20"
            disabled={isSending}
          />
          <button
            type="submit"
            className="btn btn-primary self-end"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                发送中...
              </>
            ) : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}
