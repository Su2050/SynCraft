// SynCarft/frontend/src/hooks/useChatLogic.ts
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTreeStore } from '../store/treeStore';
import { useMsgStore } from '../store/messageStore';
import { useContextStore, ContextMode, ContextId } from '../store/contextStore';
import { getAssistantAnswer } from '../api';
import { useNodeService } from './useNodeService';
import { nodeRepository } from '../repositories/nodeRepository';
import { useSessionStore } from '../store/sessionStore';
import { Message } from '../types/message';
import type { Edge, Node } from 'react-flow-renderer';

// 定义Hook的参数接口
export interface UseChatLogicParams {
  // 上下文模式：'chat'或'deepdive'
  mode: ContextMode;
  // 根节点ID（对于chat模式是会话根节点，对于deepdive模式是深挖节点）
  rootNodeId: string;
  // 上下文ID（可选，如果不提供则自动生成）
  contextId?: ContextId;
  // 初始输入文本（可选）
  initialInputText?: string;
  // 是否自动创建初始节点（仅用于deepdive模式）
  autoCreateInitialNode?: boolean;
  // 初始节点的问题（仅用于deepdive模式且autoCreateInitialNode为true时）
  initialQuestion?: string;
}

// 定义Hook的返回值接口
export interface UseChatLogicResult {
  // 输入文本
  inputText: string;
  // 设置输入文本
  setInputText: (text: string) => void;
  // 加载状态
  isLoading: boolean;
  // 错误信息
  error: string | null;
  // 当前上下文的活动节点ID
  activeNodeId: string | null;
  // 当前上下文ID
  contextId: ContextId;
  // 发送消息
  handleSend: () => Promise<void>;
  // 创建子节点
  createChildNode: (parentId: string, question: string) => Promise<string>;
  // 设置活动节点
  setActiveNode: (nodeId: string | null, source: string) => void;
}

// 生成在树面板显示的简短标签：
// - 若包含中文字符，则取前10个字符
// - 否则按空格切成单词，取前10个单词
// 超长则在末尾追加"..."
const getShortLabel = (content: string): string => {
  const hasChinese = /[\u4e00-\u9fa5]/.test(content);
  if (hasChinese) {
    return content.length > 10 ? content.slice(0, 10) + '…' : content;
  }
  const words = content.split(/\s+/).filter(Boolean);
  if (words.length > 10) return words.slice(0, 10).join(' ') + '…';
  return words.join(' ');
};

/**
 * 聊天逻辑Hook，提取ChatPanel和DeepDiveTab的共同逻辑
 */
export const useChatLogic = ({
  mode,
  rootNodeId,
  contextId: initialContextId,
  initialInputText = '',
  autoCreateInitialNode = false,
  initialQuestion = '深挖探索'
}: UseChatLogicParams): UseChatLogicResult => {
  // 状态
  const [inputText, setInputText] = useState(initialInputText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store
  const { addChild, nodes } = useTreeStore();
  const { 
    setActive, 
    setCurrentInputContext, 
    getActiveNodeId, 
    createContextId, 
    getCurrentContext 
  } = useContextStore();
  
  // 创建上下文ID
  const [contextId] = useState<ContextId>(() => 
    initialContextId || createContextId(mode, rootNodeId)
  );
  
  // 获取当前上下文的活动节点ID
  const activeNodeId = getActiveNodeId(contextId);
  
  // 使用节点服务
  const nodeService = useNodeService();
  
  // 初始化上下文
  useEffect(() => {
    // 解析 sessionId
    const contextPartsInit = contextId.split('-');
    const sessionIdInit =
      mode === 'chat' && contextPartsInit.length > 1
        ? contextPartsInit[1]
        : useSessionStore.getState().activeSessionId || 'default';

    // 设置输入上下文 (mode, nodeId, sessionId, contextId)
    setCurrentInputContext(mode, rootNodeId, sessionIdInit, contextId);
    console.log(`[${new Date().toISOString()}] useChatLogic - 设置输入上下文 - 模式: ${mode}, 节点ID: ${rootNodeId}, 上下文ID: ${contextId}`);
    
    // 记录当前上下文信息
    const currentContext = getCurrentContext();
    console.log(`[${new Date().toISOString()}] useChatLogic - 当前上下文信息:`, currentContext);
    
    // 如果是深挖模式且需要自动创建初始节点
    if (mode === 'deepdive' && autoCreateInitialNode) {
      // 检查是否已经有子节点
      const { edges } = useTreeStore.getState();
      const existingFork = edges.find((edge: Edge) => edge.source === rootNodeId);
      
      // 如果已经有子节点，设置活动节点为该子节点
      if (existingFork) {
        console.log(`[${new Date().toISOString()}] useChatLogic - 设置活动节点为已存在的子节点:`, existingFork.target);
        setActive(existingFork.target, 'useChatLogic-existingFork', contextId);
        return;
      }
      
      // 自动创建一个新的子节点
      const createInitialNode = async () => {
        try {
          console.log(`[${new Date().toISOString()}] useChatLogic - 自动创建子节点 - 原始节点:`, rootNodeId);
          
          // 使用NodeService创建分叉节点
          const newNodeId = await nodeService.createForkNode(rootNodeId, initialQuestion, contextId);
          console.log(`[${new Date().toISOString()}] useChatLogic - 自动创建子节点成功:`, newNodeId);
          
          // 获取大模型的回答
          try {
            console.log(`[${new Date().toISOString()}] useChatLogic - 获取AI回复...`);
            const assistantResponse = await getAssistantAnswer(initialQuestion);
            console.log(`[${new Date().toISOString()}] useChatLogic - 收到AI回复:`, assistantResponse.substring(0, 50) + '...');
            
            // 将大模型的回答添加到消息存储中
            await useMsgStore.getState().push({
              nodeId: newNodeId,
              role: "assistant",
              content: assistantResponse
            }, true);
            
            console.log(`[${new Date().toISOString()}] useChatLogic - 添加AI回复到消息存储`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] useChatLogic - 获取AI回复失败:`, error);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] useChatLogic - 自动创建子节点失败:`, error);
        }
      };
      
      // 执行自动创建子节点
      createInitialNode();
    }
  }, [mode, rootNodeId, contextId, setCurrentInputContext, setActive, autoCreateInitialNode, initialQuestion, nodes, addChild, getCurrentContext]);
  
  // 创建子节点
  const createChildNode = useCallback(async (parentId: string, question: string) => {
    console.log(`[${new Date().toISOString()}] useChatLogic - 创建子节点，父节点ID:`, parentId);
    
    try {
      // 使用NodeService创建子节点
      const newNodeId = await nodeService.createChildNode(parentId, question, contextId);
      console.log(`[${new Date().toISOString()}] useChatLogic - 创建子节点成功，ID:`, newNodeId);
      
      return newNodeId;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] useChatLogic - 创建子节点失败:`, error);
      throw error;
    }
  }, [contextId]);
  
  // 设置活动节点
  const setActiveNode = useCallback((nodeId: string | null, source: string) => {
    console.log(`[${new Date().toISOString()}] useChatLogic - 设置活动节点ID:`, nodeId);
    setActive(nodeId, `useChatLogic-${source}`, contextId);
  }, [setActive, contextId]);
  
  // 处理发送消息
  const handleSend = useCallback(async () => {
    // 验证输入和状态
    const text = inputText.trim();
    if (!text || isLoading) return;
    
    // 立即清空输入框并显示加载状态
    setInputText('');
    setIsLoading(true);
    setError(null);
    console.log(`[${new Date().toISOString()}] useChatLogic - 发送用户消息:`, text);

    let newSessionNodeId: string | null = null; // 用于跟踪是否创建了新节点或使用了现有节点
    
    try {
      // 每次发送时实时获取当前活动节点，避免闭包中的旧值
      const currentActiveNodeId = getActiveNodeId(contextId);
      // 获取会话ID (从contextId派生，假设格式如 'chat-sessionId')
      const contextParts = contextId.split('-');
      const sessionId = mode === 'chat' && contextParts.length > 1 ? contextParts[1] : useSessionStore.getState().activeSessionId || 'default';
      
      // 使用当前活动节点（如无则退回根节点）作为 nodeId，避免把活动节点重置到根节点
      setCurrentInputContext(mode, currentActiveNodeId || rootNodeId, sessionId, contextId);
      
      // 检查根节点ID是否为'root'占位符
      const isRootPlaceholder = rootNodeId === 'root';
      
      // 消息是否为第一次发送的判断 - 完善逻辑
      const rootNodeHasUserMsg = useMsgStore.getState().msgs.some(
        (m: Message) => m.nodeId === rootNodeId && m.role === 'user' && m.sessionId === sessionId
      );
      
      const isFirstMessage = mode === 'chat' && 
                            (isRootPlaceholder || !currentActiveNodeId || 
                             (currentActiveNodeId === rootNodeId && !rootNodeHasUserMsg));
      
      console.log(`[${new Date().toISOString()}] useChatLogic - isFirstMessage=${isFirstMessage}, mode=${mode}, activeNodeId=${currentActiveNodeId}, rootNodeId=${rootNodeId}, isRootPlaceholder=${isRootPlaceholder}, rootNodeHasUserMsg=${rootNodeHasUserMsg}`);
      
      // 根据模式和活动节点状态决定如何创建节点
      if (isFirstMessage) {
        // 聊天模式下的第一条消息，使用或创建根节点
        console.log(`[${new Date().toISOString()}] useChatLogic - 聊天模式 - 第一条消息，使用或创建根节点`);
        
        // 如果rootNodeId是'root'占位符，我们必须创建新节点
        if (isRootPlaceholder) {
          console.log(`[${new Date().toISOString()}] useChatLogic - 根节点ID是占位符'root'，创建真实根节点`);
          newSessionNodeId = await nodeService.createRootNode(text, contextId, sessionId);
          
          // 确保返回的nodeId不是'root'
          if (newSessionNodeId === 'root') {
            console.warn(`[${new Date().toISOString()}] useChatLogic - createRootNode返回了'root'占位符，生成临时ID`);
            newSessionNodeId = `temp-root-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          }
          
          console.log(`[${new Date().toISOString()}] useChatLogic - 创建新根节点ID:`, newSessionNodeId);
          
          // 保存到localStorage，以便其他组件可以使用
          localStorage.setItem('currentContextId', contextId);
        } else {
          const existingRoot = nodes.find((n: Node) => n.id === rootNodeId && n.type === 'root');

          if (existingRoot) {
            // 如果找到会话根节点，直接使用它
            newSessionNodeId = existingRoot.id;
            console.log(`[${new Date().toISOString()}] useChatLogic - 使用现有根节点ID:`, newSessionNodeId);
            
            // 更新根节点在 TreePanel 的显示名称
            const shortLabel = getShortLabel(text);
            useTreeStore.setState((state: any) => ({
              nodes: state.nodes.map((n: Node) =>
                n.id === rootNodeId ? { ...n, data: { ...n.data, label: shortLabel } } : n
              )
            }));
          } else {
            // 如果没有找到与rootNodeId匹配的根节点，创建一个新的根节点
            newSessionNodeId = await nodeService.createRootNode(text, contextId, sessionId, rootNodeId);
            console.log(`[${new Date().toISOString()}] useChatLogic - 创建新根节点ID:`, newSessionNodeId);
          }
        }
        
        // 将用户消息添加到根节点
        await useMsgStore.getState().push({
          nodeId: newSessionNodeId,
          role: "user",
          content: text,
          sessionId
        });
        
        // 设置活动节点为根节点
        setActive(newSessionNodeId, 'useChatLogic-firstMessage', contextId);
        
        // 直接调用nodeRepository.askQuestion方法向根节点提问
        try {
          console.log(`[${new Date().toISOString()}] useChatLogic - 向根节点 ${newSessionNodeId} 提问...`);
          // 确保newSessionNodeId不为null且不为'root'
          if (newSessionNodeId && newSessionNodeId !== 'root') {
            try {
              const chatNode = await nodeRepository.askQuestion(newSessionNodeId, text);
              console.log(`[${new Date().toISOString()}] useChatLogic - 收到根节点回答:`, chatNode.answer ? chatNode.answer.substring(0, 50) + '...' : '无回答');
              
              // 添加AI回复消息
              await useMsgStore.getState().push({
                nodeId: newSessionNodeId,
                role: "assistant",
                content: chatNode.answer || '无法获取回答',
                sessionId
              }, true);
              
              setActive(newSessionNodeId, 'useChatLogic-afterAskQuestionToRoot', contextId);
              return; // 完成对此根节点的消息处理
            } catch (askError) {
              console.error(`[${new Date().toISOString()}] useChatLogic - 向根节点 ${newSessionNodeId} 提问失败, 回退到 getAssistantAnswer:`, askError);
              // 不抛出错误，继续使用回退机制
            }
          } else {
            console.warn(`[${new Date().toISOString()}] useChatLogic - 根节点ID无效或为默认占位符: ${newSessionNodeId}，回退到 getAssistantAnswer`);
            // 不抛出错误，继续使用回退机制
          }
          
          // 回退机制：使用getAssistantAnswer
          try {
            // 临时设置activeNodeId为newSessionNodeId，以便getAssistantAnswer能够使用它
            localStorage.setItem('activeNodeId', newSessionNodeId || '');
            
            const assistantResponse = await getAssistantAnswer(text);
            await useMsgStore.getState().push({
              nodeId: newSessionNodeId || `temp-${Date.now()}`, // 如果newSessionNodeId为null，使用临时ID
              role: "assistant",
              content: assistantResponse,
              sessionId
            }, true);
            
            if (newSessionNodeId) {
              setActive(newSessionNodeId, 'useChatLogic-afterGetAssistantAnswerForRoot', contextId);
            }
            return; // 完成对此根节点的消息处理 (via fallback)
          } catch (fallbackError) {
            console.error(`[${new Date().toISOString()}] useChatLogic - getAssistantAnswer也失败:`, fallbackError);
            // 创建一个默认回复
            await useMsgStore.getState().push({
              nodeId: newSessionNodeId || `temp-${Date.now()}`,
              role: "assistant",
              content: "抱歉，我无法处理您的请求。请稍后再试。",
              sessionId
            }, true);
            
            if (newSessionNodeId) {
              setActive(newSessionNodeId, 'useChatLogic-afterFallbackError', contextId);
            }
            return;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] useChatLogic - 处理根节点消息时出现严重错误:`, error);
          // 创建一个默认回复
          await useMsgStore.getState().push({
            nodeId: newSessionNodeId || `temp-${Date.now()}`,
            role: "assistant",
            content: "抱歉，系统遇到了问题。请稍后再试。",
            sessionId
          }, true);
          
          if (newSessionNodeId) {
            setActive(newSessionNodeId, 'useChatLogic-afterCriticalError', contextId);
          }
          return;
        }
      } else if (mode === 'deepdive' && (!currentActiveNodeId || currentActiveNodeId === rootNodeId)) {
        // 深挖模式下，如果没有活动节点或活动节点就是根节点，创建一个分叉节点
        // 确保rootNodeId不是'root'占位符
        const actualRootNodeId = isRootPlaceholder 
          ? await nodeService.createRootNode('Deep dive root', contextId, sessionId)
          : rootNodeId;
          
        console.log(`[${new Date().toISOString()}] useChatLogic - 深挖模式 - 创建分叉节点 from ${actualRootNodeId}`);
        newSessionNodeId = await nodeService.createForkNode(actualRootNodeId, text, contextId);
        // User message added by createForkNode (via addChild). AI response will be fetched later.
      } else if (currentActiveNodeId) {
        // 活动节点存在

        // 如果活动节点是'root'占位符，我们需要创建一个真实的根节点
        if (currentActiveNodeId === 'root') {
          console.log(`[${new Date().toISOString()}] useChatLogic - 活动节点是'root'占位符，创建真实根节点`);
          newSessionNodeId = await nodeService.createRootNode(text, contextId, sessionId);
          
          // 将用户消息添加到根节点
          await useMsgStore.getState().push({
            nodeId: newSessionNodeId,
            role: "user",
            content: text,
            sessionId
          });
          
          // 设置活动节点为根节点
          setActive(newSessionNodeId, 'useChatLogic-replaceRootPlaceholder', contextId);
          
          // 获取大模型回答在公共逻辑中处理
        } else if (mode === 'chat' && currentActiveNodeId === rootNodeId) {
          // 聊天模式下，活动节点是根节点但不是第一次发送消息
          // 创建子节点
          console.log(`[${new Date().toISOString()}] useChatLogic - 根节点已有内容，创建子节点.`);
          newSessionNodeId = await nodeService.createChildNode(rootNodeId, text, contextId);
          // 用户消息已由 createChildNode 写入
          // AI 回复稍后在公共逻辑统一获取
        } else {
          // 其他情况：
          // - 聊天模式，活动节点不是根节点 (子节点或分支)
          // - 深挖模式，活动节点是深挖的延续
          console.log(`[${new Date().toISOString()}] useChatLogic - 向当前活动节点 (${currentActiveNodeId}) 提问`);
            
          // 检查当前节点是否已经有相同的用户消息，避免重复
          const { msgs: currentMessagesForActive } = useMsgStore.getState();
          const lastUserMessageOnActiveNode = currentMessagesForActive.filter(
            (m: Message) => m.nodeId === currentActiveNodeId && m.role === 'user' && m.sessionId === sessionId
          ).pop();
          
          if (!lastUserMessageOnActiveNode || lastUserMessageOnActiveNode.content !== text) {
            await useMsgStore.getState().push({
              nodeId: currentActiveNodeId,
              role: "user",
              content: text,
              sessionId
            });
          }

          try {
            const chatNode = await nodeRepository.askQuestion(currentActiveNodeId, text);
            await useMsgStore.getState().push({
              nodeId: currentActiveNodeId,
              role: "assistant",
              content: chatNode.answer || '无法获取回答',
              sessionId
            }, true);
            newSessionNodeId = currentActiveNodeId;
            setActive(currentActiveNodeId, 'useChatLogic-afterAskExistingNode', contextId);
            return;
          } catch (error) {
            console.warn(`[${new Date().toISOString()}] useChatLogic - 向节点 ${currentActiveNodeId} 提问失败, 将创建子节点:`, error);
            newSessionNodeId = await nodeService.createChildNode(currentActiveNodeId, text, contextId);
          }
        }
      } else {
        // 异常情况处理：没有活动节点，但不是第一条消息
        console.warn(`[${new Date().toISOString()}] useChatLogic - 意外状态: mode=${mode}, 无活动节点，且非初始消息.`);
        if (mode === 'chat') {
          newSessionNodeId = await nodeService.createRootNode(text, contextId, sessionId);
          await useMsgStore.getState().push({ nodeId: newSessionNodeId, role: "user", content: text, sessionId });
          setActive(newSessionNodeId, 'useChatLogic-unexpectedStateNewRoot', contextId);
        } else {
          console.error(`深挖模式遇到意外状态：无活动节点且非初始分叉创建.`);
          setError('深挖模式遇到意外状态');
          throw new Error('Unexpected state in deepdive handleSend');
        }
      }
      
      // 公共逻辑：如果创建了新节点且尚未写入助手回复，获取并写入回答
      if (newSessionNodeId) {
        // 检查此节点是否已有助手回复
        const existingAssistantMessages = useMsgStore.getState().msgs.filter(
          (m: Message) => m.nodeId === newSessionNodeId && m.role === 'assistant' && m.sessionId === sessionId
        );

        if (existingAssistantMessages.length === 0) {
          console.log(`[${new Date().toISOString()}] useChatLogic - 为新创建的节点 ${newSessionNodeId} 获取AI回复`);
              
          // 确保新节点处于活动状态
          if (getActiveNodeId(contextId) !== newSessionNodeId) {
            setActive(newSessionNodeId, 'useChatLogic-activateNewNodeForAI', contextId);
          }
              
          const assistantResponse = await getAssistantAnswer(text);
          await useMsgStore.getState().push({
            nodeId: newSessionNodeId,
            role: "assistant",
            content: assistantResponse,
            sessionId
          }, true);
          setActive(newSessionNodeId, 'useChatLogic-afterAIResponseForNewNode', contextId);
        } else {
          console.log(`[${new Date().toISOString()}] useChatLogic - 新节点 ${newSessionNodeId} 已有助手回复，跳过获取。`);
        }
      }
      
      console.log(`[${new Date().toISOString()}] useChatLogic - 消息处理完成，当前活动节点:`, getActiveNodeId(contextId));
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] useChatLogic - 发送消息时出错:`, error);
      setError(error instanceof Error ? error.message : '发送消息失败');
      
      // 恢复用户输入，以便用户可以重试
      setInputText(text);
    } finally {
      // 无论成功还是失败，都关闭加载状态
      setIsLoading(false);
    }
  }, [inputText, isLoading, mode, rootNodeId, contextId, nodes, createChildNode, setActive, setCurrentInputContext, getActiveNodeId]);
  
  return {
    inputText,
    setInputText,
    isLoading,
    error,
    activeNodeId,
    contextId,
    handleSend,
    createChildNode,
    setActiveNode
  };
};
