import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { nanoid } from 'nanoid';
import type { Message } from '@/types';
import { api } from '@/api';
import db from '@/utils/db';
import { useSession } from '@/store/sessionContext';
import { useSessionTree } from '@/hooks/useSessionTree';
import toast from 'react-hot-toast'; // 导入toast组件，如果项目中没有，需要安装
import { parseApiResponse } from '@/utils/apiResponse';

/**
 * 消息Hook，用于管理消息状态和发送消息
 * @param sessionId 会话ID
 * @returns 消息状态和操作
 */
export function useMessages(sessionId: string) {
  const queryClient = useQueryClient();
  const { rootNodeId, mainContextId } = useSession();
  const { refetch: refetchSessionTree } = useSessionTree(sessionId || '');
  
  // 获取会话的所有消息
  const { 
    data: messages = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<Message[]>(
    ['messages', sessionId],
    async () => {
      try {
        // 检查会话ID是否有效
        if (!sessionId) {
          console.log('会话ID为空，返回空消息列表');
          return [];
        }
        
        console.log(`[${new Date().toISOString()}] 尝试获取会话 ${sessionId} 的消息`);
        
        // 尝试从API获取消息，使用内置的重试机制
        try {
          const response = await api.message.getBySession(sessionId);
          console.log(`[${new Date().toISOString()}] 获取会话消息成功:`, response);
          return response.data?.items || [];
        } catch (apiError) {
          console.error(`[${new Date().toISOString()}] 从API获取消息失败:`, apiError);
          
          // 显示更友好的错误提示
          toast.error('正在初始化新会话，请稍候...', {
            duration: 3000,
          });
          
          // 新会话可能需要一些时间来初始化，等待一段时间后重试一次
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            console.log(`[${new Date().toISOString()}] 重试获取会话 ${sessionId} 的消息`);
            const retryResponse = await api.message.getBySession(sessionId);
            console.log(`[${new Date().toISOString()}] 重试获取会话消息成功:`, retryResponse);
            return retryResponse.data?.items || [];
          } catch (retryError) {
            console.error(`[${new Date().toISOString()}] 重试获取消息失败，回退到本地数据库:`, retryError);
            throw retryError; // 继续抛出错误，进入下面的catch块
          }
        }
      } catch (error) {
        console.error('从API获取消息失败，回退到本地数据库:', error);
        
        try {
          // 从本地数据库获取消息
          const localMessages = await db.messages
            .where('session_id')
            .equals(sessionId)
            .toArray();
          
          console.log(`[${new Date().toISOString()}] 从本地数据库获取到 ${localMessages.length} 条消息`);
          return localMessages;
        } catch (dbError) {
          console.error('从本地数据库获取消息失败:', dbError);
          toast.error('无法获取消息，请刷新页面重试');
          return [];
        }
      }
    },
    {
      enabled: !!sessionId,
      staleTime: 1 * 60 * 1000, // 1分钟内不重新获取
      retry: 1, // 减少重试次数，因为我们已经在函数内部实现了重试
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // 指数退避，最大10秒
    }
  );
  
  // 发送消息
  const sendMessageMutation = useMutation<Message, Error, { content: string; nodeId?: string; tags?: string[] }>(
    async ({ content, nodeId, tags = [] }) => {
      try {
        // 检查根节点ID
        let targetNodeId = nodeId || rootNodeId;
        
        // 如果没有nodeId和rootNodeId，尝试获取会话详情
        if (!targetNodeId) {
          console.log(`[${new Date().toISOString()}] 尝试获取会话详情来获取根节点ID`);
          try {
            const sessionResponse = await api.session.getById(sessionId);
            console.log(`[${new Date().toISOString()}] 获取会话详情:`, sessionResponse);
            
            // 使用通用解析函数处理响应
            const sessionData = parseApiResponse<any>(sessionResponse);

            if (sessionData) {
              // 尝试从root_node_id或main_context获取根节点ID
              targetNodeId = sessionData.root_node_id;

              // 如果没有root_node_id但有main_context，则使用main_context中的context_root_node_id
              if (!targetNodeId && sessionData.main_context) {
                targetNodeId = sessionData.main_context.context_root_node_id;
                console.log(`[${new Date().toISOString()}] 使用main_context中的context_root_node_id:`, targetNodeId);
              }
            }
          } catch (error) {
            console.error(`[${new Date().toISOString()}] 获取会话详情失败:`, error);
          }
        }
        
        // 再次检查根节点ID
        if (!targetNodeId) {
          toast.error('无法获取会话的根节点ID，无法发送消息');
          throw new Error('无法获取会话的根节点ID');
        }
        
        // 如果不是第一条消息，且没有指定nodeId，则创建新节点
        if (messages.length > 0 && !nodeId) {
          try {
            // 获取会话的主上下文
            console.log(`[${new Date().toISOString()}] 尝试获取会话的主上下文`);
            let mainContext;
            try {
              const contextsResponse = await api.context.getBySession(sessionId);
              // 使用通用解析函数处理响应
              const contextList = parseApiResponse<any[]>(contextsResponse);

              // 找到主聊天上下文（mode === 'chat'）
              mainContext = contextList.find(ctx => ctx.mode === 'chat');
            } catch (error) {
              console.error(`[${new Date().toISOString()}] 获取会话的主上下文失败:`, error);
            }
            
            // 如果找到主上下文，使用其active_node_id作为父节点
            let parentNodeId = targetNodeId; // 默认使用根节点ID
            if (mainContext && mainContext.active_node_id) {
              parentNodeId = mainContext.active_node_id;
              console.log(`[${new Date().toISOString()}] 使用主上下文的active_node_id作为父节点ID: ${parentNodeId}`);
            } else {
              console.log(`[${new Date().toISOString()}] 没有找到主上下文或active_node_id，使用根节点ID: ${parentNodeId}`);
            }
            
            // 使用新的API端点，在一个事务中同时创建节点和更新上下文
            if (mainContext) {
              console.log(`[${new Date().toISOString()}] 使用新的API端点，在一个事务中同时创建节点和更新上下文`);
              console.log(`[${new Date().toISOString()}] 主上下文ID: ${mainContext.id}`);
              console.log(`[${new Date().toISOString()}] 主上下文当前active_node_id: ${mainContext.active_node_id}`);
              console.log(`[${new Date().toISOString()}] 父节点ID (parentNodeId): ${parentNodeId}`);
              
              try {
                // 使用新的API端点
                const newNodeWithContextResponse = await api.node.createWithContextUpdate({
                  session_id: sessionId,
                  parent_id: parentNodeId,
                  label: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
                  type: 'normal',
                  context_id: mainContext.id
                });
                
                // 检查API响应 - 使用parseApiResponse确保一致性
                const parsedResponse = parseApiResponse<any>(newNodeWithContextResponse);
                const createdNodeId = parsedResponse?.id;
                if (createdNodeId) {
                  targetNodeId = createdNodeId;
                  console.log(`[${new Date().toISOString()}] 创建节点并更新上下文成功，节点ID:`, targetNodeId);
                  
                  // 验证更新是否成功
                  let verifySuccess = false;
                  let retryCount = 3;
                  
                  while (retryCount > 0 && !verifySuccess) {
                    try {
                      console.log(`[${new Date().toISOString()}] 验证上下文更新，尝试次数: ${4 - retryCount}`);
                      
                      const verifyContextResponse = await api.context.getById(mainContext.id);
                      const verifyContext = parseApiResponse<any>(verifyContextResponse);
                      
                      if (verifyContext && verifyContext.active_node_id === targetNodeId) {
                        console.log(`[${new Date().toISOString()}] ✅ 验证更新成功，active_node_id已更新为: ${targetNodeId}`);
                        verifySuccess = true;
                        break;
                      } else {
                        console.error(`[${new Date().toISOString()}] ❌ 验证更新失败，active_node_id未更新为: ${targetNodeId}`);
                        console.error(`[${new Date().toISOString()}] 当前active_node_id: ${verifyContext ? verifyContext.active_node_id : 'undefined'}`);
                        
                        // 如果不是最后一次尝试，等待一段时间后重试
                        if (retryCount > 1) {
                          console.log(`[${new Date().toISOString()}] 等待500ms后重试验证...`);
                          await new Promise(resolve => setTimeout(resolve, 500));
                        }
                      }
                    } catch (verifyError) {
                      console.error(`[${new Date().toISOString()}] 验证上下文更新失败:`, verifyError);
                    }
                    
                    retryCount--;
                  }
                  
                  // 如果验证失败，回退到分开创建节点和更新上下文的方式
                  if (!verifySuccess) {
                    console.error(`[${new Date().toISOString()}] 验证上下文更新失败，回退到分开创建节点和更新上下文的方式`);
                    toast.error('验证上下文更新失败，正在尝试备用方法');
                    
                    // 回退到原来的方式
                    throw new Error('验证上下文更新失败，回退到分开创建节点和更新上下文的方式');
                  }
                }
              } catch (error) {
                console.error(`[${new Date().toISOString()}] 创建节点并更新上下文失败:`, error);
                
                // 如果使用新API端点失败，回退到原来的方式
                console.log(`[${new Date().toISOString()}] 回退到分开创建节点和更新上下文`);
                
                // 创建新节点作为父节点的子节点
                console.log(`[${new Date().toISOString()}] 创建新节点作为节点 ${parentNodeId} 的子节点`);
                const newNodeResponse = await api.node.create({
                  session_id: sessionId,
                  parent_id: parentNodeId,
                  label: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
                  type: 'normal'
                });
                
                // 检查API响应 - 使用parseApiResponse确保一致性
                const parsedNodeResponse = parseApiResponse<any>(newNodeResponse);
                const fallbackNodeId = parsedNodeResponse?.id;
                if (fallbackNodeId) {
                  targetNodeId = fallbackNodeId;
                  console.log(`[${new Date().toISOString()}] 创建新节点成功，ID:`, targetNodeId);
                  
                  // 更新主上下文的active_node_id
                  let retryCount = 3;
                  let success = false;
                  
                  while (retryCount > 0 && !success) {
                    try {
                      console.log(`[${new Date().toISOString()}] 尝试更新主上下文的active_node_id: ${targetNodeId}，剩余重试次数: ${retryCount}`);
                      
                      const updateResult = await api.context.update(mainContext.id, { active_node_id: targetNodeId });
                      console.log(`[${new Date().toISOString()}] 更新主上下文的active_node_id成功:`, updateResult);
                      
                      // 验证更新是否成功
                      const verifyContextResponse = await api.context.getById(mainContext.id);
                      const verifyContext = parseApiResponse<any>(verifyContextResponse);
                      
                      if (verifyContext && verifyContext.active_node_id === targetNodeId) {
                        console.log(`[${new Date().toISOString()}] 验证更新成功，active_node_id已更新为: ${targetNodeId}`);
                        success = true;
                        break;
                      } else {
                        console.error(`[${new Date().toISOString()}] 验证更新失败，active_node_id未更新为: ${targetNodeId}`);
                        console.error(`[${new Date().toISOString()}] 当前active_node_id: ${verifyContext ? verifyContext.active_node_id : 'undefined'}`);
                      }
                    } catch (updateError) {
                      console.error(`[${new Date().toISOString()}] 更新主上下文的active_node_id失败:`, updateError);
                    }
                    
                    retryCount--;
                    if (retryCount > 0) {
                      console.log(`[${new Date().toISOString()}] 等待1秒后重试...`);
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }
                  
                  if (!success) {
                    console.error(`[${new Date().toISOString()}] 多次尝试更新主上下文的active_node_id失败`);
                    toast.error('更新主上下文失败，可能导致节点结构不正确');
                  }
                }
              }
            } else {
              // 如果没有找到主上下文，使用原来的方式创建节点
              console.warn(`[${new Date().toISOString()}] 没有找到主上下文，使用原来的方式创建节点`);
              
              // 创建新节点作为父节点的子节点
              console.log(`[${new Date().toISOString()}] 创建新节点作为节点 ${parentNodeId} 的子节点`);
              const newNodeResponse = await api.node.create({
                session_id: sessionId,
                parent_id: parentNodeId,
                label: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
                type: 'normal'
              });
              
              // 检查API响应 - 使用parseApiResponse确保一致性
              const parsedSimpleResponse = parseApiResponse<any>(newNodeResponse);
              const simpleNodeId = parsedSimpleResponse?.id;
              if (simpleNodeId) {
                targetNodeId = simpleNodeId;
                console.log(`[${new Date().toISOString()}] 创建新节点成功，ID:`, targetNodeId);
              }
            }
          } catch (error) {
            console.error(`[${new Date().toISOString()}] 创建新节点失败:`, error);
            // 如果创建节点失败，继续使用根节点
          }
        }
        
        console.log(`[${new Date().toISOString()}] 使用节点ID发送消息:`, targetNodeId);
        
        let answer = '';
        try {
          // 尝试通过API向节点提问
          // 确保targetNodeId是字符串且不为null
          if (!targetNodeId) {
            throw new Error('节点ID为空，无法提问');
          }
          // 直接调用askQuestion方法，它现在接受string | null类型的参数
          const response = await api.node.askQuestion(targetNodeId, content);

          // 使用通用解析函数处理响应
          const answerResp = parseApiResponse<any>(response);
          
          // 兼容不同的响应格式
          if (answerResp && typeof answerResp.answer === 'string') {
            answer = answerResp.answer;
          } else if (answerResp && typeof answerResp.question === 'string' && typeof answerResp.answer === 'string') {
            answer = answerResp.answer;
          } else if (response && typeof (response as any).data?.answer === 'string') {
            // 兼容原始响应格式
            answer = (response as any).data.answer;
          } else if (response && typeof (response as any).answer === 'string') {
            // 直接从原始响应中获取
            answer = (response as any).answer;
          } else {
            console.error('无法从响应中提取answer字段:', response, answerResp);
            throw new Error('无法从响应中提取answer字段');
          }
          if (typeof answer !== 'string' || answer.trim() === '') {
            console.error('API返回的answer不是有效字符串:', answer);
            throw new Error('AI回复内容为空');
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 向节点提问失败，使用默认回复:`, error);
          // 使用默认回复
          answer = "抱歉，我暂时无法回答这个问题。可能是因为服务器负载过高或者网络问题。请稍后再试。";
          // 显示错误提示
          toast.error('AI回复出错，已使用默认回复');
        }

        // 构造消息对象 - 使用时间戳+随机数确保ID唯一
        const timestamp = Date.now();
        const userMessage: Message = {
          id: `user-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          session_id: sessionId,
          parent_id: nodeId || null,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          tags
        };

        const assistantMessage: Message = {
          id: `assistant-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          session_id: sessionId,
          parent_id: nodeId || null,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
          tags
        };

        // 将用户消息和AI回复添加到缓存
        queryClient.setQueryData<Message[]>(['messages', sessionId], (old = []) => {
          return [...old, userMessage, assistantMessage];
        });

        return userMessage;
      } catch (apiError) {
        console.error('通过API向节点提问失败，回退到本地创建:', apiError);

        // 显示错误提示
        toast.error('通过API向节点提问失败，已回退到本地创建');
        
        try {
          // 在本地创建消息
          const newMessage: Message = {
            id: nanoid(),
            session_id: sessionId,
            parent_id: nodeId || null,
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
            tags
          };
          
          await db.messages.add(newMessage);
          
          // 模拟AI回复（但不作为返回值）
          const assistantMessage: Message = {
            id: nanoid(),
            session_id: sessionId,
            parent_id: newMessage.id,
            role: 'assistant',
            content: '抱歉，我无法连接到服务器。这是一个离线回复。',
            timestamp: new Date().toISOString(),
            tags
          };
          
          await db.messages.add(assistantMessage);
          
          // 只返回用户消息，保持与API返回类型一致
          return newMessage;
        } catch (dbError) {
          console.error('在本地创建消息失败:', dbError);
          
          // 显示错误提示
          toast.error('在本地创建消息失败，已回退到内存创建');
          // 创建一个内存中的消息对象并返回
          return {
            id: `memory-${Date.now()}`,
            session_id: sessionId,
            parent_id: nodeId || null,
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
            tags
          };
        }
      }
    },
    {
      onSuccess: (userMessage: Message) => {
        // 只有在本地创建的消息才需要更新缓存，因为API创建的消息已经在前面添加到缓存了
        if (userMessage.id.startsWith('local-') || userMessage.id.startsWith('memory-')) {
          // 更新缓存，添加用户消息
          queryClient.setQueryData<Message[]>(['messages', sessionId], (old = []) => {
            return [...old, userMessage];
          });
          
          // 延迟一点时间再刷新，确保AI回复已经添加到数据库
          setTimeout(() => {
            queryClient.invalidateQueries(['messages', sessionId]);
          }, 500);
        }
        
        // 刷新会话树，以显示新创建的节点
        // 增加延迟时间，确保在树数据完全更新后再渲染树
        setTimeout(() => {
          console.log(`[${new Date().toISOString()}] 刷新会话树，显示新创建的节点`);
          refetchSessionTree();
          
          // 再次刷新，确保树数据完全更新
          setTimeout(() => {
            console.log(`[${new Date().toISOString()}] 再次刷新会话树，确保数据更新`);
            refetchSessionTree();
          }, 2000);
        }, 2000);
      }
    }
  );
  
  // 获取节点的消息
  const getNodeMessages = async (nodeId: string | null) => {
    // 如果nodeId为null，返回空数组
    if (!nodeId) {
      console.error(`[${new Date().toISOString()}] 节点ID为空，无法获取消息`);
      return [];
    }
    
    try {
      // 尝试从API获取节点消息
      const response = await api.message.getByNode(nodeId);
      return response.data || [];
    } catch (error) {
      console.error('从API获取节点消息失败，回退到本地数据库:', error);
      
      // 显示错误提示
      toast.error('从API获取节点消息失败，已回退到本地数据库');
      
      // 从本地数据库获取节点消息
      const localMessages = await db.messages
        .where('parent_id')
        .equals(nodeId)
        .toArray();
      
      return localMessages;
    }
  };
  
  // 按父子关系组织消息
  const messageTree = useMemo(() => {
    const messageMap = new Map<string | null, Message[]>();
    
    // 按parent_id分组
    messages.forEach(message => {
      const parentId = message.parent_id || null;
      if (!messageMap.has(parentId)) {
        messageMap.set(parentId, []);
      }
      messageMap.get(parentId)!.push(message);
    });
    
    // 递归构建树
    const buildTree = (parentId: string | null): any[] => {
      const children = messageMap.get(parentId) || [];
      return children.map(message => ({
        ...message,
        children: buildTree(message.id || null)
      }));
    };
    
    return buildTree(null);
  }, [messages]);
  
  // 按标签过滤消息
  const filterMessagesByTag = (tag: string) => {
    return messages.filter(message => message.tags?.includes(tag));
  };
  
  return {
    messages,
    messageTree,
    isLoading,
    error,
    sendMessage: (content: string, nodeId?: string, tags?: string[]) => 
      sendMessageMutation.mutateAsync({ content, nodeId, tags }),
    getNodeMessages,
    filterMessagesByTag,
    refetch
  };
}
