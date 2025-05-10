import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '@/api';
import toast from 'react-hot-toast';
import { MessageRole } from '@/types';
import { parseApiResponse } from '@/utils/apiResponse';
import { nanoid } from 'nanoid';
import { useDeepDiveMessages } from '@/hooks/useDeepDiveMessages';

// 定义深挖标签页类型
export interface DeepDiveTab {
  id: string;
  title: string;
  tag?: string | null;
  content?: string | null;
  context_id?: string;
  context_root_node_id?: string | null;
  active_node_id?: string;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number | string;
    [key: string]: any;
  }>;
}

// 定义深挖上下文类型，确保包含所需属性
export interface DeepDiveContext {
  id: string;
  context_id: string;
  active_node_id: string;
  context_root_node_id: string;
  [key: string]: any;
}

interface DeepDivePanelProps {
  sessionId: string;
  nodeId?: string;
  rootNodeId?: string | null;
  onTextSelection?: (text: string, position: { x: number, y: number }) => void;
  sendMessage?: (text: string, nodeId?: string, tags?: string[]) => Promise<any>;
  selectedText?: string;
  selectionPosition?: { x: number, y: number, isFullDeepDive?: boolean, messageId?: string, nodeId?: string } | null;
  onDeepDive?: (text: string) => void;
  onFullDeepDive?: (text: string, messageId: string) => void;
}

const DeepDivePanel: React.FC<DeepDivePanelProps> = ({
  sessionId,
  nodeId,
  rootNodeId,
  onTextSelection,
  sendMessage,
  selectedText,
  selectionPosition,
  onDeepDive,
  onFullDeepDive
}) => {
  // 深挖相关状态
  const [deepDiveTabs, setDeepDiveTabs] = useState<DeepDiveTab[]>([]);
  const [activeDeepDiveTab, setActiveDeepDiveTab] = useState(-1);
  const [deepDiveInputText, setDeepDiveInputText] = useState('');
  const [isDeepDiveSending, setIsDeepDiveSending] = useState(false);
  
  // 额外的发送锁，避免同一问题被提交两次（Enter + 按钮或双触发）
  const sendingRef = useRef(false);
  
  // 用于跟踪是否已经处理过当前的selectedText
  const [processedText, setProcessedText] = useState<string | null>(null);
  
  // 使用useDeepDiveMessages hook获取当前活动标签页的消息，不再需要重试获取消息的函数
  
  // 添加一个工具函数，用于规范化后端返回的日期字符串，避免缺少时区信息导致的 8 小时时差
  const normalizeTimestamp = (ts: number | string): number | string => {
    // 如果本身就是数字或者为空，直接返回
    if (typeof ts === 'number' || !ts) return ts;

    // 如果已经包含时区标识（Z / +hh:mm / -hh:mm），无需处理
    if (/Z$|[+-]\d{2}:\d{2}$/.test(ts)) {
      return ts;
    }

    // 如果看起来是 ISO 字符串但缺少 Z，默认按 UTC 处理，在末尾补 Z
    if (ts.includes('T')) {
      return `${ts}Z`;
    }

    // 其他情况直接返回原值
    return ts;
  };
  
  // 监听selectedText属性的变化
  React.useEffect(() => {
    console.log('[DeepDivePanel] useEffect triggered selectedText:', selectedText, 'selectionPosition:', selectionPosition);
    
    // 如果selectedText为空或者与已处理的文本相同，则不处理
    if (!selectedText || selectedText === processedText || !onDeepDive) {
      return;
    }
    
    // 检查是否是整体深挖
    const isFullDeepDive = selectionPosition && (selectionPosition as any).isFullDeepDive;
    const messageId = selectionPosition && (selectionPosition as any).messageId;
    
    // 记录当前处理的文本，防止重复处理
    setProcessedText(selectedText);
    
    if (isFullDeepDive) {
      // 如果是整体深挖，使用 selectionPosition?.nodeId（如果有）作为根节点
      const targetNodeId = selectionPosition && (selectionPosition as any).nodeId;
      handleFullDeepDive(selectedText, targetNodeId);
      if (onFullDeepDive) {
        onFullDeepDive(selectedText, (selectionPosition as any)?.messageId);
      }
    } else {
      // 否则，调用handleDeepDive方法
      handleDeepDive(selectedText, selectionPosition && (selectionPosition as any).nodeId);
    }
    
    // 调用onDeepDive回调函数
    onDeepDive(selectedText);
  }, [selectedText, onDeepDive, onFullDeepDive, processedText]);
  
  // 处理文本选择
  const handleTextSelection = () => {
    if (!onTextSelection) return;
    
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selectedText = selection.toString();
      
      // 获取选中文本的位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 设置选中文本的位置，用于显示深挖按钮
      onTextSelection(selectedText, {
        x: rect.right,
        y: rect.top + window.scrollY
      });
    }
  };
  
  /**
   * 创建深挖上下文
   * @param text 用于生成上下文标题的文本
   * @param source 可选的来源描述
   * @param overrideNodeId 如果提供，作为深挖上下文的根节点 ID；否则回退到当前组件的 nodeId / rootNodeId
   */
  const createDeepDiveContext = async (
    text: string,
    source?: string,
    overrideNodeId?: string
  ) => {
    // 如果提供了 overrideNodeId，则优先使用；否则使用 props 中的 nodeId 或 rootNodeId
    const contextRootNodeId = overrideNodeId || nodeId || rootNodeId || '';

    // 创建深挖上下文
    const response = await api.node.createDeepDive(contextRootNodeId, {
      session_id: sessionId || '',
      source: source || `深挖：${text}`
    });
    
    // 确保response有效
    if (!response) {
      throw new Error('创建深挖上下文失败：响应为空');
    }
    
    // 使用parseApiResponse解析响应，并断言为DeepDiveContext类型
    const deepDiveContext = parseApiResponse<any>(response) as DeepDiveContext;
    
    if (!deepDiveContext || !deepDiveContext.id) {
      throw new Error('创建深挖上下文失败：响应数据为空或格式不正确');
    }
    
    return deepDiveContext;
  };
  
  // 处理选中文本深挖
  const handleDeepDive = async (selectedText: string, targetNodeId?: string) => {
    if (!selectedText) return;
    
    try {
      // 创建深挖上下文（无 overrideNodeId）
      const deepDiveContext = await createDeepDiveContext(selectedText, undefined, targetNodeId);
      
      // 创建新标签页
      const newTab = {
        id: deepDiveContext.id,
        title: selectedText.substring(0, 15) + (selectedText.length > 15 ? '...' : ''),
        tag: null,
        content: null,
        context_id: deepDiveContext.context_id,
        context_root_node_id: deepDiveContext.context_root_node_id,
        active_node_id: deepDiveContext.active_node_id || targetNodeId || nodeId || rootNodeId || null,
        messages: []
      } as DeepDiveTab;
      
      setDeepDiveTabs(prev => {
        // 如果已存在相同 context_id 的标签（或相同 id / tag）则复用
        const existedIdx = prev.findIndex(t =>
          (newTab.context_id && t.context_id === newTab.context_id) ||
          t.id === newTab.id ||
          (newTab.tag && t.tag === newTab.tag)
        );
        if (existedIdx !== -1) {
          setActiveDeepDiveTab(existedIdx);
          return prev;
        }
        const newTabs = [...prev, newTab];
        setActiveDeepDiveTab(newTabs.length - 1);
        return newTabs;
      });
      
      // 将选中的文本填充到输入框中，让用户可以编辑
      setDeepDiveInputText(selectedText);
      
      // 不再自动获取QA对，因为我们不再自动创建子节点和发送初始问题
      // 等待用户主动发送问题
    } catch (error) {
      console.error('创建深挖上下文失败:', error);
      
      // 显示错误提示
      toast.error('创建深挖上下文失败，请稍后重试');
      
      // 回退到本地实现
      if (sendMessage) {
        const tag = `deepdive-${nanoid()}`;
        const tabId = `tab-${nanoid()}`;
        
        // 创建新标签页
        const newTab = {
          id: tabId,
          title: selectedText.substring(0, 15) + (selectedText.length > 15 ? '...' : ''),
          tag: tag,
          content: null,
          messages: []
        };
        
        setDeepDiveTabs(prev => {
          const existedIdx = prev.findIndex(t => (newTab.tag && t.tag === newTab.tag));
          if (existedIdx !== -1) {
            setActiveDeepDiveTab(existedIdx);
            return prev;
          }
          const newTabs = [...prev, newTab];
          setActiveDeepDiveTab(newTabs.length - 1);
          return newTabs;
        });
        
        // 将选中的文本填充到输入框中，让用户可以编辑
        setDeepDiveInputText(selectedText);
      }
    }
  };
  
  // 处理整体深挖
  const handleFullDeepDive = async (messageContent: string, targetNodeId: string | undefined) => {
    try {
      // 创建深挖上下文，使用选中消息所在的节点作为根节点（如果提供）
      const deepDiveContext = await createDeepDiveContext(
        messageContent,
        `深挖整体：${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
        targetNodeId
      );
      
      // 创建新标签页
      const newTab = {
        id: deepDiveContext.id,
        title: messageContent.substring(0, 5) + (messageContent.length > 5 ? '...' : ''),
        tag: null,
        content: null,
        context_id: deepDiveContext.context_id,
        context_root_node_id: deepDiveContext.context_root_node_id,
        active_node_id: deepDiveContext.active_node_id || targetNodeId || nodeId || rootNodeId || null,
        messages: []
      } as DeepDiveTab;
      
      setDeepDiveTabs(prev => {
        const existedIdx = prev.findIndex(t =>
          (newTab.context_id && t.context_id === newTab.context_id) ||
          t.id === newTab.id
        );
        if (existedIdx !== -1) {
          setActiveDeepDiveTab(existedIdx);
          return prev;
        }
        const newTabs = [...prev, newTab];
        setActiveDeepDiveTab(newTabs.length - 1);
        return newTabs;
      });
      
      // 将消息内容填充到输入框中，让用户可以编辑
      const userPrompt = `请深入分析并解释以下内容：\n\n${messageContent}`;
      setDeepDiveInputText(userPrompt);
      
      // 不再自动获取QA对，因为我们不再自动创建子节点和发送初始问题
      // 等待用户主动发送问题
    } catch (error) {
      console.error('创建整体深挖上下文失败:', error);
      
      // 显示错误提示
      toast.error('创建整体深挖上下文失败，请稍后重试');
      
      // 回退到本地实现
      if (sendMessage) {
        const tag = `deepdive-full-${nanoid()}`;
        const tabId = `tab-full-${nanoid()}`;
        
        // 创建新标签页
        const newTab = {
          id: tabId,
          title: messageContent.substring(0, 5) + (messageContent.length > 5 ? '...' : ''),
          tag: tag,
          content: null,
          messages: []
        };
        
        setDeepDiveTabs(prev => {
          const existedIdx = prev.findIndex(t => (newTab.tag && t.tag === newTab.tag));
          if (existedIdx !== -1) {
            setActiveDeepDiveTab(existedIdx);
            return prev;
          }
          const newTabs = [...prev, newTab];
          setActiveDeepDiveTab(newTabs.length - 1);
          return newTabs;
        });
        
        // 将消息内容填充到输入框中，让用户可以编辑
        const userPrompt = `请深入分析并解释以下内容：\n\n${messageContent}`;
        setDeepDiveInputText(userPrompt);
      }
    }
  };
  
  // 标签页管理函数
  const addNewDeepDiveTab = () => {
    const newTab = {
      id: `tab-${nanoid()}`,
      title: '新标签页',
      tag: null,
      content: null,
      messages: []
    };
    
    setDeepDiveTabs(prev => {
      const newTabs = [...prev, newTab];
      setActiveDeepDiveTab(newTabs.length - 1);
      return newTabs;
    });
  };
  
  const closeDeepDiveTab = (index: number) => {
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
  
  // 不再需要findAllChildNodes、convertQAPairsToMessages和buildPathNodeIds函数，
  // 因为我们现在使用useDeepDiveMessages hook来获取和管理消息

  // 不再需要fetchContextMessages和buildMessagesByNodeIds函数，
  // 因为我们现在使用useDeepDiveMessages hook来获取和管理消息

  // 使用useDeepDiveMessages hook获取当前活动标签页的消息
  const activeTab = deepDiveTabs[activeDeepDiveTab];
  const {
    messages: deepDiveMessages,
    isLoading: isLoadingMessages,
    sendMessage: sendDeepDiveMessage
  } = useDeepDiveMessages(
    sessionId,
    activeTab?.context_id,
    activeTab?.active_node_id,
    activeTab?.context_root_node_id
  );
  
  // 当获取到新消息时，更新标签页的消息和活动节点ID
  React.useEffect(() => {
    if (activeDeepDiveTab >= 0 && deepDiveMessages.length > 0) {
      console.log(`[DeepDivePanel] 使用useDeepDiveMessages获取到 ${deepDiveMessages.length} 条消息，更新标签页`);
      
      // 获取最后一条消息的节点ID，用于更新活动节点ID
      const lastMessage = deepDiveMessages[deepDiveMessages.length - 1];
      const lastNodeId = lastMessage?.qa_pair_id || lastMessage?.parent_id;
      
      console.log(`[DeepDivePanel] 最后一条消息的节点ID: ${lastNodeId}`);
      
      setDeepDiveTabs(prev => {
        const updated = [...prev];
        if (activeDeepDiveTab >= 0 && activeDeepDiveTab < updated.length) {
          updated[activeDeepDiveTab] = {
            ...updated[activeDeepDiveTab],
            // 更新消息列表
            messages: deepDiveMessages.map(msg => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toISOString()
            })),
            // 更新活动节点ID为最后一条消息的节点ID
            active_node_id: lastNodeId || updated[activeDeepDiveTab].active_node_id
          } as DeepDiveTab;
          
          console.log(`[DeepDivePanel] 更新标签页活动节点ID: ${updated[activeDeepDiveTab].active_node_id} -> ${lastNodeId || updated[activeDeepDiveTab].active_node_id}`);
        }
        return updated;
      });
    }
  }, [activeDeepDiveTab, deepDiveMessages]);
  
  return (
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {deepDiveTabs[activeDeepDiveTab]?.messages?.map((message, idx) => (
          <div
            key={`${message.id}-${idx}`}
            className={`${message.role === 'user' ? 'message-user' : 'message-assistant'} ${(message as any).isError ? 'bg-red-50 border border-red-200 rounded p-2' : ''}`}
            onMouseUp={handleTextSelection}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs text-gray-500">
                {new Date(normalizeTimestamp(message.timestamp)).toLocaleString()}
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
      
      {/* 深挖标签页的输入框 */}
      <div className="border-t p-4 bg-blue-50">
        <div className="text-xs text-blue-600 mb-2 font-semibold">深挖对话输入框</div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!deepDiveInputText.trim() || isDeepDiveSending || sendingRef.current) return;
          sendingRef.current = true;
          
          const currentTabIndex = activeDeepDiveTab;
          const activeTab = deepDiveTabs[currentTabIndex];
          if (!activeTab) return;
          
          setIsDeepDiveSending(true);
          
          try {
            console.log('[DeepDivePanel] 使用useDeepDiveMessages发送消息');
            
            // 使用useDeepDiveMessages hook的sendMessage方法发送消息
            await sendDeepDiveMessage(deepDiveInputText, activeTab.active_node_id);
            
            // 清空输入框
            setDeepDiveInputText('');
            
            // 刷新会话树，以显示新创建的节点
            if (onDeepDive) {
              onDeepDive(''); // 触发刷新
            }
          } catch (error) {
            console.error('发送深挖问题失败:', error);
            
            // 更详细的错误提示
            let errorMessage = '发送深挖问题失败，请稍后重试';
            
            // 分析错误类型，提供更具体的错误信息
            if (error instanceof Error) {
              const errorMsg = error.message.toLowerCase();
              if (errorMsg.includes('ssl') || errorMsg.includes('eof') || errorMsg.includes('连接')) {
                errorMessage = 'AI服务连接失败，可能是网络问题，请稍后重试';
              } else if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
                errorMessage = '请求超时，服务器可能繁忙，请稍后重试';
              } else if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
                errorMessage = '请求参数错误，请检查输入内容';
              } else if (errorMsg.includes('500') || errorMsg.includes('server error')) {
                errorMessage = '服务器内部错误，请联系管理员';
              }
            }
            
            toast.error(errorMessage);
            
            // 如果发送消息失败，添加一个本地错误消息到UI
            if (activeTab) {
              const currentTime = new Date().toISOString();
              setDeepDiveTabs(prev => {
                const updated = [...prev];
                const index = updated.findIndex(t => t.id === activeTab.id);
                if (index !== -1) {
                  // 添加用户问题到消息列表中，即使后端调用失败
                  const userMessage = {
                    id: `user-local-${Date.now()}`,
                    role: 'user' as MessageRole,
                    content: deepDiveInputText,
                    timestamp: currentTime
                  };
                  
                  // 添加一个错误提示消息
                  const errorSystemMessage = {
                    id: `system-error-${Date.now()}`,
                    role: 'assistant' as MessageRole,
                    content: `系统提示：${errorMessage}`,
                    timestamp: currentTime,
                    isError: true
                  };
                  
                  // 更新消息列表，这样用户至少能看到自己的问题
                  updated[index] = {
                    ...updated[index],
                    messages: [...(updated[index].messages || []), userMessage, errorSystemMessage]
                  } as DeepDiveTab;
                }
                return updated;
              });
            }
          } finally {
            setIsDeepDiveSending(false);
            sendingRef.current = false;
          }
        }} className="flex gap-2">
          <textarea
            value={deepDiveInputText}
            onChange={(e) => setDeepDiveInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="在此输入深挖问题..."
            className="input flex-1 resize-none h-16 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={isDeepDiveSending}
          />
          <button
            type="submit"
            className="btn bg-blue-500 hover:bg-blue-600 text-white self-end"
            disabled={isDeepDiveSending}
          >
            {isDeepDiveSending ? (
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
};

export default DeepDivePanel;
