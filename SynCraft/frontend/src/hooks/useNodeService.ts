// hooks/useNodeService.ts
import { useCallback } from 'react';
import { useTreeStore } from '../store/treeStore';
import { useContextStore, ContextId } from '../store/contextStore';
import { Position } from 'react-flow-renderer';
import { NodeData } from '../types/node';
import { useLogger } from './useLogger';
import { useErrorService } from './useErrorService';
import { api } from '../api';

/**
 * 节点服务Hook，提供节点相关的操作
 * 使用React Hooks和Zustand的最佳实践
 */
export function useNodeService() {
  // 从store中获取必要的状态和方法
  const nodes = useTreeStore(state => state.nodes);
  const edges = useTreeStore(state => state.edges);
  const setAll = useTreeStore(state => state.setAll);
  const addChild = useTreeStore(state => state.addChild);
  
  const getCurrentContext = useContextStore(state => state.getCurrentContext);
  const setActive = useContextStore(state => state.setActive);
  
  // 使用日志和错误处理服务
  const logger = useLogger('NodeService');
  const { handleError, showErrorToUser } = useErrorService();
  
  /**
   * 创建根节点
   * @param question 用户问题
   * @param contextId 上下文ID
   * @returns 新创建的节点ID
   */
  const createRootNode = useCallback(async (question: string, contextId: ContextId): Promise<string> => {
    logger.info(`创建根节点 - 问题: ${question}, 上下文ID: ${contextId}`);
    
    try {
      // 验证参数
      if (!question.trim()) {
        throw new Error('问题不能为空');
      }
      
      // 获取当前上下文
      const currentContext = getCurrentContext();
      
      // 从上下文中获取rootNodeId
      let rootNodeId: string;
      
      // 从contextId中提取会话ID
      const sessionId = contextId.split('-')[1] || 'default';
      
      // 检查是否有与会话关联的根节点
      const sessionRootNode = nodes.find(node => 
        node.type === 'root' && 
        node.data && 
        node.data.sessionId === sessionId
      );
      
      if (sessionRootNode) {
        // 如果找到会话的根节点，使用它的ID
        rootNodeId = sessionRootNode.id;
        logger.debug(`使用会话 ${sessionId} 的现有根节点: ${rootNodeId}`);
      } else if (contextId.startsWith('chat-')) {
        // 如果是聊天上下文但没有找到会话根节点，创建一个新的根节点ID
        rootNodeId = `root-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        logger.debug(`为会话 ${sessionId} 创建新的根节点ID: ${rootNodeId}`);
      } else if (contextId.startsWith('deepdive-')) {
        // 如果是深挖上下文，从contextId中提取nodeId
        rootNodeId = contextId.split('-')[1];
        logger.debug(`从深挖上下文ID提取根节点ID: ${rootNodeId}`);
      } else {
        // 其他情况，生成一个新的唯一ID
        rootNodeId = `root-${Date.now()}`;
        logger.debug(`生成新的根节点ID: ${rootNodeId}`);
      }
      
      logger.debug(`创建根节点 - 根节点ID: ${rootNodeId}`);
      
      // 检查根节点是否已存在
      const rootNodeExists = nodes.some(node => node.id === rootNodeId);
      
      if (!rootNodeExists) {
        try {
          // 获取当前上下文ID
          const currentContextId = contextId || `chat-${sessionId}`;
          
          // 调用API创建节点
          const apiNode = await api.nodes.createNode({
            session_id: sessionId,
            parent_id: null,
            template_key: null,
            summary_up_to_here: question.substring(0, 100),
            context_id: currentContextId
          });
          
          // 使用API返回的节点ID
          rootNodeId = apiNode.id;
          
          logger.info(`通过API创建根节点成功 - ID: ${rootNodeId}`);
          
          // 在前端创建对应的节点对象
          const newRootNode = {
            id: rootNodeId,
            position: { x: 120, y: 80 },
            data: { 
              label: question.length > 20 ? question.substring(0, 20) + '...' : question,
              sessionId: sessionId // 添加会话ID到节点数据中
            },
            type: 'root',
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          };
          
          setAll([newRootNode], []);
          
          // 保存到localStorage，以便其他组件可以使用
          localStorage.setItem('currentContextId', currentContextId);
          
          logger.info(`创建根节点成功 - ID: ${rootNodeId}`);
        } catch (apiError) {
          logger.error(`通过API创建根节点失败:`, apiError);
          
          // 如果API调用失败，回退到仅在前端创建节点
          const newRootNode = {
            id: rootNodeId,
            position: { x: 120, y: 80 },
            data: { 
              label: question.length > 20 ? question.substring(0, 20) + '...' : question,
              sessionId: sessionId // 添加会话ID到节点数据中
            },
            type: 'root',
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          };
          
          setAll([newRootNode], []);
          
          logger.info(`仅在前端创建根节点 - ID: ${rootNodeId}`);
        }
      } else {
        // 如果根节点已存在，更新其标签
        const updatedNodes = nodes.map(n => {
          if (n.id === rootNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                label: question.length > 20 ? question.substring(0, 20) + '...' : question,
                sessionId: sessionId // 确保会话ID被更新
              }
            };
          }
          return n;
        });
        
        setAll(updatedNodes, edges);
        logger.info(`更新根节点标签 - ID: ${rootNodeId}`);
      }
      
      // 设置活动节点
      setActive(rootNodeId, 'NodeService-createRootNode', contextId);
      
      return rootNodeId;
    } catch (error) {
      const friendlyMessage = handleError(error as Error, { 
        operation: 'createRootNode', 
        question, 
        contextId 
      });
      showErrorToUser(friendlyMessage);
      throw error;
    }
  }, [nodes, edges, setAll, getCurrentContext, setActive, logger, handleError, showErrorToUser]);
  
  /**
   * 创建子节点
   * @param parentId 父节点ID
   * @param question 用户问题
   * @param contextId 上下文ID
   * @returns 新创建的节点ID
   */
  const createChildNode = useCallback(async (parentId: string, question: string, contextId: ContextId): Promise<string> => {
    logger.info(`创建子节点 - 父节点ID: ${parentId}, 问题: ${question}, 上下文ID: ${contextId}`);
    
    try {
      // 验证参数
      if (!parentId) {
        throw new Error('父节点ID不能为空');
      }
      
      if (!question.trim()) {
        throw new Error('问题不能为空');
      }
      
      // 检查父节点是否存在
      const parentNodeExists = nodes.some(node => node.id === parentId);
      
      if (!parentNodeExists) {
        throw new Error(`父节点 ${parentId} 不存在`);
      }
      
      // 从contextId中提取会话ID
      const sessionId = contextId.split('-')[1] || 'default';
      
      // 获取当前上下文ID
      const currentContextId = contextId || `chat-${sessionId}`;
      
      try {
        // 调用API创建节点
        const apiNode = await api.nodes.createNode({
          session_id: sessionId,
          parent_id: parentId,
          template_key: null,
          summary_up_to_here: question.substring(0, 100),
          context_id: currentContextId
        });
        
        // 使用API返回的节点ID
        const newNodeId = apiNode.id;
        
        logger.info(`通过API创建子节点成功 - ID: ${newNodeId}`);
        
        // 创建子节点
        await addChild(parentId, question, newNodeId);
        
        // 设置活动节点
        setActive(newNodeId, 'NodeService-createChildNode', contextId);
        
        // 保存到localStorage，以便其他组件可以使用
        localStorage.setItem('currentContextId', currentContextId);
        
        logger.info(`创建子节点成功 - ID: ${newNodeId}`);
        
        return newNodeId;
      } catch (apiError) {
        logger.error(`通过API创建子节点失败:`, apiError);
        
        // 如果API调用失败，回退到仅在前端创建节点
        const newNodeId = await addChild(parentId, question);
        
        // 设置活动节点
        setActive(newNodeId, 'NodeService-createChildNode-fallback', contextId);
        
        logger.info(`仅在前端创建子节点 - ID: ${newNodeId}`);
        
        return newNodeId;
      }
    } catch (error) {
      const friendlyMessage = handleError(error as Error, { 
        operation: 'createChildNode', 
        parentId, 
        question, 
        contextId 
      });
      showErrorToUser(friendlyMessage);
      throw error;
    }
  }, [nodes, addChild, setActive, logger, handleError, showErrorToUser]);
  
  /**
   * 创建分叉节点（用于深挖）
   * @param originalNodeId 原始节点ID
   * @param question 用户问题
   * @param contextId 上下文ID
   * @returns 新创建的节点ID
   */
  const createForkNode = useCallback(async (originalNodeId: string, question: string, contextId: ContextId): Promise<string> => {
    logger.info(`创建分叉节点 - 原始节点ID: ${originalNodeId}, 问题: ${question}, 上下文ID: ${contextId}`);
    
    try {
      // 验证参数
      if (!originalNodeId) {
        throw new Error('原始节点ID不能为空');
      }
      
      if (!question.trim()) {
        throw new Error('问题不能为空');
      }
      
      // 检查原始节点是否存在
      const originalNode = nodes.find(n => n.id === originalNodeId);
      
      if (!originalNode) {
        throw new Error(`原始节点 ${originalNodeId} 不存在`);
      }
      
      // 获取原始节点的上下文
      const originalContext = originalNode.data?.originalContext || originalNode.data?.label || '';
      
      // 从contextId中提取会话ID
      const sessionId = contextId.split('-')[1] || 'default';
      
      // 获取当前上下文ID
      const currentContextId = contextId || `chat-${sessionId}`;
      
      try {
        // 调用API创建节点
        const apiNode = await api.nodes.createNode({
          session_id: sessionId,
          parent_id: originalNodeId,
          template_key: null,
          summary_up_to_here: question.substring(0, 100),
          context_id: currentContextId
        });
        
        // 使用API返回的节点ID
        const newNodeId = apiNode.id;
        
        logger.info(`通过API创建分叉节点成功 - ID: ${newNodeId}`);
        
        // 创建分叉节点
        await addChild(originalNodeId, question, newNodeId, originalContext);
        
        // 设置活动节点
        setActive(newNodeId, 'NodeService-createForkNode', contextId);
        
        // 保存到localStorage，以便其他组件可以使用
        localStorage.setItem('currentContextId', currentContextId);
        
        logger.info(`创建分叉节点成功 - ID: ${newNodeId}`);
        
        return newNodeId;
      } catch (apiError) {
        logger.error(`通过API创建分叉节点失败:`, apiError);
        
        // 如果API调用失败，回退到仅在前端创建节点
        const newNodeId = await addChild(originalNodeId, question, undefined, originalContext);
        
        // 设置活动节点
        setActive(newNodeId, 'NodeService-createForkNode-fallback', contextId);
        
        logger.info(`仅在前端创建分叉节点 - ID: ${newNodeId}`);
        
        return newNodeId;
      }
    } catch (error) {
      const friendlyMessage = handleError(error as Error, { 
        operation: 'createForkNode', 
        originalNodeId, 
        question, 
        contextId 
      });
      showErrorToUser(friendlyMessage);
      throw error;
    }
  }, [nodes, addChild, setActive, logger, handleError, showErrorToUser]);
  
  /**
   * 更新节点
   * @param nodeId 节点ID
   * @param data 节点数据
   */
  const updateNode = useCallback(async (nodeId: string, data: Partial<NodeData>): Promise<void> => {
    logger.info(`更新节点 - 节点ID: ${nodeId}`);
    
    try {
      // 验证参数
      if (!nodeId) {
        throw new Error('节点ID不能为空');
      }
      
      // 检查节点是否存在
      const nodeExists = nodes.some(node => node.id === nodeId);
      
      if (!nodeExists) {
        throw new Error(`节点 ${nodeId} 不存在`);
      }
      
      // 更新节点
      const updatedNodes = nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...data
            }
          };
        }
        return n;
      });
      
      setAll(updatedNodes, edges);
      
      logger.info(`更新节点成功 - ID: ${nodeId}`);
    } catch (error) {
      const friendlyMessage = handleError(error as Error, { 
        operation: 'updateNode', 
        nodeId, 
        data 
      });
      showErrorToUser(friendlyMessage);
      throw error;
    }
  }, [nodes, edges, setAll, logger, handleError, showErrorToUser]);
  
  /**
   * 删除节点
   * @param nodeId 节点ID
   */
  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    logger.info(`删除节点 - 节点ID: ${nodeId}`);
    
    try {
      // 验证参数
      if (!nodeId) {
        throw new Error('节点ID不能为空');
      }
      
      // 检查节点是否存在
      const nodeExists = nodes.some(node => node.id === nodeId);
      
      if (!nodeExists) {
        throw new Error(`节点 ${nodeId} 不存在`);
      }
      
      // 删除节点及其子节点
      const nodesToDelete = new Set<string>([nodeId]);
      
      // 递归查找所有子节点
      const findChildren = (id: string) => {
        edges.forEach(edge => {
          if (edge.source === id) {
            nodesToDelete.add(edge.target);
            findChildren(edge.target);
          }
        });
      };
      
      findChildren(nodeId);
      
      // 过滤掉要删除的节点和边
      const updatedNodes = nodes.filter(node => !nodesToDelete.has(node.id));
      const updatedEdges = edges.filter(edge => 
        !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
      );
      
      setAll(updatedNodes, updatedEdges);
      
      logger.info(`删除节点成功 - ID: ${nodeId}`);
    } catch (error) {
      const friendlyMessage = handleError(error as Error, { 
        operation: 'deleteNode', 
        nodeId 
      });
      showErrorToUser(friendlyMessage);
      throw error;
    }
  }, [nodes, edges, setAll, logger, handleError, showErrorToUser]);
  
  return {
    createRootNode,
    createChildNode,
    createForkNode,
    updateNode,
    deleteNode
  };
}
