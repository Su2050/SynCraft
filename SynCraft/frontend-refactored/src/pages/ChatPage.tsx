import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/store/sessionContext';
import { useMessages } from '@/hooks/useMessages';
import { useSessionTree } from '@/hooks/useSessionTree';
import ReactMarkdown from 'react-markdown';
import TreeView from '@/components/TreeView';
import DeepDivePanel from '@/components/DeepDivePanel';
import { api } from '@/api';
import toast from 'react-hot-toast';
import { Message, MessageRole } from '@/types';

/**
 * 聊天页面
 */
export default function ChatPage() {
  const { id: sessionId, nodeId = undefined } = useParams<{ id: string; nodeId?: string }>();
  const { activeSession, rootNodeId, mainContextId, setActiveSessionId } = useSession();
  
  // 确保在组件加载时正确设置activeSessionId
  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);
  const { messages, isLoading, error, sendMessage } = useMessages(sessionId || '');
  const { refetch: refetchSessionTree } = useSessionTree(sessionId || '');
  
  // 状态
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 文本选择相关状态
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number; isFullDeepDive?: boolean; messageId?: string; nodeId?: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  
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
        <div className="text-xl text-red-500">加载失败: {(error as Error).message || '未知错误'}</div>
      </div>
    );
  }
  
  /**
   * 处理用户在消息中选择文本
   * @param nodeId 选中文本所属消息对应的节点 ID
   */
  const handleTextSelection = (nodeId?: string) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      setSelectedText(selection.toString());
      
      // 获取选中文本的位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 记录位置信息及 nodeId，方便 DeepDivePanel 定位上下文
      setSelectionPosition({
        x: rect.right,
        y: rect.top + window.scrollY,
        nodeId: nodeId
      } as any);
    } else {
      // 如果没有选中文本，清除位置信息
      setSelectionPosition(null);
    }
  };
  
  // 处理文本选择回调
  const handleDeepDiveTextSelection = (text: string, position: { x: number, y: number }) => {
    setSelectedText(text);
    setSelectionPosition(position);
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
                onMouseUp={() => handleTextSelection(message.parent_id || undefined)}
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{ position: 'relative' }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    {message.role === 'assistant' && hoveredMessageId === message.id && (
                      <button 
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded flex items-center"
                        onClick={() => {
                          // 这里我们需要调用DeepDivePanel组件的handleFullDeepDive方法
                          // 但由于组件封装，我们不能直接调用
                          // 所以我们可以通过设置selectedText和触发点击深挖按钮来实现
                          setSelectedText(message.content);
                          // 设置一个特殊的位置，表示这是整体深挖
                          setSelectionPosition({
                            x: 0,
                            y: 0,
                            isFullDeepDive: true,
                            messageId: message.id,
                            nodeId: message.parent_id || undefined
                          } as any);
                        }}
                        aria-label="深挖整体内容"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        深挖整体
                      </button>
                    )}
                    <button 
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                      }}
                    >
                      复制
                    </button>
                  </div>
                </div>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 右侧：深挖对话区域 */}
        <DeepDivePanel
          sessionId={sessionId || ''}
          nodeId={nodeId}
          rootNodeId={rootNodeId}
          onTextSelection={handleDeepDiveTextSelection}
          sendMessage={sendMessage}
          selectedText={selectedText}
          selectionPosition={selectionPosition}
          onDeepDive={(text) => {
            setSelectedText('');
            // 刷新会话树，以显示新创建的节点
            refetchSessionTree();
          }}
        />
      </div>
      
      {/* 深挖按钮 - 选中文本时显示 */}
      {selectedText && selectionPosition && !(selectionPosition as any).isFullDeepDive && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg p-1 z-20"
          style={{ 
            top: `${selectionPosition.y - 40}px`, 
            left: `${selectionPosition.x + 10}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <button
            className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            onClick={() => {
              // 这里我们需要调用DeepDivePanel组件的handleDeepDive方法
              // 但由于组件封装，我们不能直接调用
              // 所以我们可以通过设置selectedText来触发
              // 实际上，这里应该通过一个回调函数来实现，但为了简单起见，我们先这样处理
              // 清除选择，让DeepDivePanel组件自己处理
              const textToDeepDive = selectedText;
              setSelectedText('');
              setSelectionPosition(null);
              
              // 这里应该有一个回调函数来通知DeepDivePanel组件处理深挖
              // 但由于我们没有实现这个回调，所以暂时不处理
              // 在实际应用中，应该通过props传递一个回调函数给DeepDivePanel组件
            }}
            aria-label="深挖选中内容"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>深挖选中内容</span>
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
