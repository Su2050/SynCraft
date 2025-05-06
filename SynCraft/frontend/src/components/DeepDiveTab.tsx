import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTreeStore } from '../store/treeStore';
import { useSideTabStore, SideTab } from '../store/tabStore';
import { useContextStore, ContextId } from '../store/contextStore';
import { useChatLogic } from '../hooks/useChatLogic';
import { useContextNode } from '../hooks/useContextNode';
import { usePathMessages } from '../hooks/usePathMessages';
import { useNodeService } from '../hooks/useNodeService';
import { Message } from '../types/message';

interface Props {
  nodeId: string;
  selectedRange: any | null;
  contextId?: ContextId;
}

const DeepDiveTab = ({ nodeId, selectedRange, contextId: initialContextId }: Props) => {
  // 使用useChatLogic Hook
  const {
    inputText,
    setInputText,
    isLoading,
    error,
    activeNodeId,
    contextId,
    handleSend
  } = useChatLogic({
    mode: 'deepdive',
    rootNodeId: nodeId,
    initialInputText: selectedRange || '',
    // 只有当selectedRange不为null时，才自动创建初始节点
    autoCreateInitialNode: selectedRange !== null,
    // 如果selectedRange很长，截取前20个字符
    initialQuestion: selectedRange 
      ? (selectedRange.length > 20 ? selectedRange.substring(0, 20) + '...' : selectedRange) 
      : "深挖探索",
    // 使用传入的上下文ID（如果有）
    contextId: initialContextId
  });
  
  // 文本选择菜单状态
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    range: Range;
    position: { x: number; y: number };
    nodeId: string;
  } | null>(null);
  
  const { nodes } = useTreeStore();
  const { createContextId } = useContextStore();
  const nodeService = useNodeService();
  const openSideTab = useSideTabStore(state => state.openSideTab);
  
  // 获取深挖对话的完整上下文
  const deepDiveMsgs = usePathMessages(nodeId, activeNodeId || nodeId);
  
  // 当selectedRange变化时，更新输入文本
  useEffect(() => {
    if (selectedRange) {
      setInputText(selectedRange);
    }
  }, [selectedRange, setInputText]);
  
  // 处理文本选择
  const handleTextSelection = (e: React.MouseEvent, nodeId: string) => {
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
            x: e.clientX,
            y: e.clientY
          },
          nodeId: nodeId
        });
      }
    }
  };
  
  // 处理嵌套深挖
  const handleNestedDeepDive = useCallback(async (messageNodeId: string, selectedText: string | null = null) => {
    console.log(`[${new Date().toISOString()}] DeepDiveTab - handleNestedDeepDive - Starting with nodeId:`, messageNodeId);
    
    try {
      // 为新的深挖创建上下文ID
      const nestedContextId = createContextId('deepdive', messageNodeId);
      console.log(`[${new Date().toISOString()}] DeepDiveTab - handleNestedDeepDive - 新的深挖上下文ID:`, nestedContextId);
      
      // 如果有选中的文本，使用NodeService创建分叉节点
      // 注意：这里我们不需要立即创建节点，因为DeepDiveTab组件初始化时会自动创建
      // 我们只需要将selectedText传递给openSideTab方法
      if (selectedText) {
        console.log(`[${new Date().toISOString()}] DeepDiveTab - handleNestedDeepDive - 选中文本:`, selectedText);
      }
      
      // 打开一个新的深挖标签页
      // openSideTab方法会创建一个新的DeepDiveTab组件，并传递messageNodeId、selectedText和nestedContextId
      // DeepDiveTab组件初始化时会使用这些参数自动创建节点
      openSideTab(messageNodeId, selectedText, nestedContextId);
      
      // 清除选择菜单
      setSelectionMenu(null);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] DeepDiveTab - handleNestedDeepDive - 失败:`, error);
    }
  }, [createContextId, openSideTab, setSelectionMenu]);
  
  return (
    <div className="flex flex-col h-full">
      {/* 深挖对话区 */}
      <div className="flex-1 overflow-auto p-3 border rounded mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">深挖对话</h3>
          <div className="text-xs text-gray-500">
            <div>上下文ID: {contextId}</div>
            <div>节点ID: {activeNodeId || nodeId}</div>
          </div>
        </div>
        
        {/* 加载状态指示器 */}
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-blue-500">处理中...</span>
          </div>
        )}
        
        {deepDiveMsgs.length > 0 ? (
          <div className="space-y-3">
            {deepDiveMsgs.map((m: Message) => (
              <div 
                key={m.id} 
                className={`p-2 rounded ${
                  m.role === 'user' 
                    ? 'bg-blue-50 border-blue-100 border ml-auto max-w-[80%]' 
                    : 'bg-gray-50 border-gray-100 border max-w-[80%]'
                }`}
                onMouseUp={m.role === 'assistant' ? (e) => handleTextSelection(e, m.nodeId) : undefined}
              >
                <div className="font-semibold text-xs text-gray-500 mb-1">
                  {m.role === 'user' ? '您的问题:' : '回答:'}
                </div>
                <ReactMarkdown>{m.content}</ReactMarkdown>
                
                {/* 深挖按钮 - 仅在助手消息上显示 */}
                {m.role === 'assistant' && (
                  <div className="message-actions opacity-0 hover:opacity-100 text-right mt-1 transition-opacity duration-200">
                    <button 
                      onClick={() => handleNestedDeepDive(m.nodeId)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 shadow-sm"
                    >
                      继续深挖 👉
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-4">
            发送您的第一个深挖问题，开始探索...
          </div>
        )}
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
            onClick={() => handleNestedDeepDive(selectionMenu.nodeId, selectionMenu.text)}
          >
            深挖选中内容
          </button>
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 mb-3 rounded">
          {error}
        </div>
      )}
      
      {/* 输入框 */}
      <div className="border-t p-3">
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入您的深挖问题..."
          className="w-full border rounded p-2 mb-2"
          rows={3}
          disabled={isLoading}
        />
        <div className="flex justify-between">
          <div className="text-xs text-gray-500">
            按Enter发送，Shift+Enter换行
          </div>
          <button 
            onClick={handleSend}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeepDiveTab;
