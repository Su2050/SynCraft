// SynCarft/frontend/src/hooks/useChatLogic.ts
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTreeStore } from '../store/treeStore';
import { useMsgStore } from '../store/messageStore';
import { useContextStore, ContextMode, ContextId } from '../store/contextStore';
import { getAssistantAnswer } from '../api';
import { useNodeService } from './useNodeService';

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
    // 设置输入上下文
    setCurrentInputContext(mode, rootNodeId, contextId);
    console.log(`[${new Date().toISOString()}] useChatLogic - 设置输入上下文 - 模式: ${mode}, 节点ID: ${rootNodeId}, 上下文ID: ${contextId}`);
    
    // 记录当前上下文信息
    const currentContext = getCurrentContext();
    console.log(`[${new Date().toISOString()}] useChatLogic - 当前上下文信息:`, currentContext);
    
    // 如果是深挖模式且需要自动创建初始节点
    if (mode === 'deepdive' && autoCreateInitialNode) {
      // 检查是否已经有子节点
      const { edges } = useTreeStore.getState();
      const existingFork = edges.find(edge => edge.source === rootNodeId);
      
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
    
    try {
      // 确保上下文设置正确
      setCurrentInputContext(mode, rootNodeId, contextId);
      
      let newNodeId: string;
      
      // 根据模式和活动节点状态决定如何创建节点
      if (mode === 'chat' && !activeNodeId) {
        // 聊天模式下，如果没有活动节点，使用或创建根节点
        console.log(`[${new Date().toISOString()}] useChatLogic - 聊天模式 - 使用或创建根节点`);
        
        // 使用NodeService创建或更新根节点
        newNodeId = await nodeService.createRootNode(text, contextId);
        
        // 将用户消息添加到根节点
        await useMsgStore.getState().push({
          nodeId: newNodeId,
          role: "user",
          content: text
        });
      } else if (mode === 'deepdive' && (!activeNodeId || activeNodeId === rootNodeId)) {
        // 深挖模式下，如果没有活动节点或活动节点就是根节点，创建一个分叉节点
        console.log(`[${new Date().toISOString()}] useChatLogic - 深挖模式 - 创建分叉节点`);
        
        // 使用NodeService创建分叉节点
        newNodeId = await nodeService.createForkNode(rootNodeId, text, contextId);
      } else {
        // 其他情况，在活动节点下创建新的子节点
        console.log(`[${new Date().toISOString()}] useChatLogic - 在活动节点下创建新的子节点，活动节点ID:`, activeNodeId);
        
        // 使用NodeService创建子节点
        newNodeId = await nodeService.createChildNode(activeNodeId!, text, contextId);
      }
      
      // 确保活动节点已正确设置
      const updatedActiveNodeId = getActiveNodeId(contextId);
      if (updatedActiveNodeId !== newNodeId) {
        console.log(`[${new Date().toISOString()}] useChatLogic - 再次确认活动节点设置为:`, newNodeId);
        setActive(newNodeId, 'useChatLogic-afterNodeCreation', contextId);
      }
      
      // 调用API获取AI回复
      console.log(`[${new Date().toISOString()}] useChatLogic - 获取AI回复...`);
      const assistantResponse = await getAssistantAnswer(text);
      console.log(`[${new Date().toISOString()}] useChatLogic - 收到AI回复:`, assistantResponse.substring(0, 50) + '...');
      
      // 添加AI回复消息
      await useMsgStore.getState().push({
        nodeId: newNodeId,
        role: "assistant",
        content: assistantResponse
      }, true);
      
      // 确保活动节点仍然是新创建的节点
      setActive(newNodeId, 'useChatLogic-afterAIResponse', contextId);
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
  }, [inputText, isLoading, mode, rootNodeId, contextId, activeNodeId, nodes, createChildNode, setActive, setCurrentInputContext, getActiveNodeId]);
  
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
