import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { Message } from '@/types';
import { api, experimentalApi } from '@/api';
import toast from 'react-hot-toast';
import { parseApiResponse } from '@/utils/apiResponse';
import { useSessionTree } from '@/hooks/useSessionTree';

// 特性标志 - 启用实验性功能
// 设置为true可启用实验性功能，获取会话的所有消息，该功能已经被验证是可行的
const USE_EXPERIMENTAL_API = true;

// 特性标志 - 启用上下文过滤功能
// 设置为true可启用上下文过滤功能，只获取特定context的消息
const USE_CONTEXT_FILTER_API = true;

/**
 * 深挖消息Hook，用于管理深挖标签页的消息状态和发送消息
 * @param sessionId 会话ID
 * @param contextId 上下文ID
 * @param activeNodeId 活动节点ID
 * @param contextRootNodeId 上下文根节点ID
 * @returns 消息状态和操作
 */
export function useDeepDiveMessages(
  sessionId: string,
  contextId?: string,
  activeNodeId?: string | null,
  contextRootNodeId?: string | null
) {
  // 添加状态来存储所有深挖上下文
  const [deepDiveContexts, setDeepDiveContexts] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { refetch: refetchSessionTree } = useSessionTree(sessionId || '');
  
  // 规范化时间戳，避免时区问题
  const normalizeTimestamp = (ts: number | string): number | string => {
    if (typeof ts === 'number' || !ts) return ts;
    if (/Z$|[+-]\d{2}:\d{2}$/.test(ts)) return ts;
    if (ts.includes('T')) return `${ts}Z`;
    return ts;
  };
  
  // 将QA对转换为消息数组
  const convertQAPairsToMessages = (qaPairs: any[], nodeId: string) => {
    console.log(`[useDeepDiveMessages] 开始转换节点 ${nodeId} 的 ${qaPairs?.length || 0} 个QA对`);
    
    const msgs: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: number | string;
      node_id?: string;
      qa_id?: string;
    }> = [];

    // 确保qaPairs是数组
    if (!Array.isArray(qaPairs)) {
      console.warn(`[useDeepDiveMessages] qaPairs不是数组，尝试转换`, qaPairs);
      if (qaPairs && typeof qaPairs === 'object') {
        // 如果是单个QA对象
        const qaObj: any = qaPairs;
        if (qaObj.question) {
          qaPairs = [qaObj];
        } else if (qaObj.items && Array.isArray(qaObj.items)) {
          qaPairs = qaObj.items;
        } else {
          console.error(`[useDeepDiveMessages] 无法将qaPairs转换为数组:`, qaPairs);
          return msgs;
        }
      } else {
        console.error(`[useDeepDiveMessages] qaPairs既不是数组也不是对象:`, qaPairs);
        return msgs;
      }
    }

    qaPairs.forEach((qa: any, index: number) => {
      // 确保qa是有效的对象
      if (!qa || typeof qa !== 'object') {
        console.warn(`[useDeepDiveMessages] 无效的QA对`, qa);
        return;
      }
      
      // 生成一个更可靠的QA对ID，用于去重
      const qaId = qa.id || `${nodeId}-${qa.question?.substring(0, 50)}-${index}`;
      
      // 处理问题
      if (qa.question) {
        const userMsgId = qa.id ? `user-${qa.id}` : `user-${nodeId}-${index}`;
        const timestamp = qa.created_at || qa.timestamp || new Date().toISOString();
        
        msgs.push({
          id: userMsgId,
          role: 'user',
          content: qa.question,
          timestamp: timestamp,
          node_id: nodeId,
          qa_id: qaId
        });
      }
      
      // 处理回答
      if (qa.answer) {
        const assistantMsgId = qa.id ? `assistant-${qa.id}` : `assistant-${nodeId}-${index}`;
        const timestamp = qa.updated_at || qa.answer_timestamp || qa.timestamp || new Date().toISOString();
        
        msgs.push({
          id: assistantMsgId,
          role: 'assistant',
          content: qa.answer,
          timestamp: timestamp,
          node_id: nodeId,
          qa_id: qaId
        });
      }
      
      // 处理messages数组（如果有）
      if (qa.messages && Array.isArray(qa.messages) && qa.messages.length > 0) {
        qa.messages.forEach((msg: any, msgIndex: number) => {
          if (msg && msg.role && msg.content) {
            const msgId = msg.id || `${msg.role}-${nodeId}-${index}-${msgIndex}`;
            const timestamp = msg.timestamp || msg.created_at || new Date().toISOString();
            
            msgs.push({
              id: msgId,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: timestamp,
              node_id: nodeId,
              qa_id: qaId
            });
          }
        });
      }
    });

    console.log(`[useDeepDiveMessages] 节点 ${nodeId} 的QA对转换完成，共生成 ${msgs.length} 条消息`);
    return msgs;
  };
  
  // 获取会话的所有深挖上下文
  const { 
    data: allDeepDiveContexts = [], 
    isLoading: isLoadingContexts 
  } = useQuery<any[]>(
    ['deepdive-contexts', sessionId],
    async () => {
      try {
        // 检查会话ID
        if (!sessionId) {
          console.log('[useDeepDiveMessages] 会话ID为空，返回空上下文列表');
          return [];
        }
        
        console.log(`[useDeepDiveMessages] 尝试获取会话 ${sessionId} 的所有上下文`);
        
        // 获取会话的所有上下文
        const contextsResponse = await api.context.getBySession(sessionId);
        const contextList = parseApiResponse<any[]>(contextsResponse);
        
        // 过滤出深挖上下文（mode === 'deepdive'）
        const deepDiveContexts = contextList.filter(ctx => ctx.mode === 'deepdive');
        console.log(`[useDeepDiveMessages] 找到 ${deepDiveContexts.length} 个深挖上下文`);
        
        // 更新深挖上下文状态
        setDeepDiveContexts(deepDiveContexts);
        
        return deepDiveContexts;
      } catch (error) {
        console.error('[useDeepDiveMessages] 获取会话的所有上下文失败:', error);
        return [];
      }
    },
    {
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    }
  );
  
  // 获取深挖上下文的消息
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages, 
    error,
    refetch 
  } = useQuery<Message[]>(
    ['deepdive-messages', sessionId, contextId, activeNodeId, contextRootNodeId],
    async () => {
      try {
        // 检查会话ID
        if (!sessionId) {
          console.log('[useDeepDiveMessages] 会话ID为空，返回空消息列表');
          return [];
        }
        
        // 如果启用了实验性API和上下文过滤功能，并且有contextId，则使用新的API
        if (USE_EXPERIMENTAL_API && USE_CONTEXT_FILTER_API && contextId) {
          try {
            console.log(`[useDeepDiveMessages] 使用实验性API获取深挖context的消息，contextId=${contextId}`);
            
            // 如果contextId以"deepdive-"开头，先获取真实的上下文ID
            let realContextId = contextId;
            if (contextId.startsWith('deepdive-')) {
              try {
                console.log(`[useDeepDiveMessages] contextId包含deepdive-前缀，尝试获取真实的上下文ID`);
                const contextResponse = await api.context.getByContextId(contextId);
                const contextData = parseApiResponse<any>(contextResponse);
                if (contextData && contextData.id) {
                  realContextId = contextData.id;
                  console.log(`[useDeepDiveMessages] 获取到真实的上下文ID: ${realContextId}`);
                }
              } catch (contextIdError) {
                console.error(`[useDeepDiveMessages] 获取真实上下文ID失败:`, contextIdError);
                // 如果获取真实上下文ID失败，继续使用原始contextId
              }
            }
            
            const response = await experimentalApi.getSessionContextMessages(sessionId, realContextId);
            console.log(`[useDeepDiveMessages] 获取深挖context消息成功:`, response);
            return response.data?.items || [];
          } catch (contextError) {
            console.error(`[useDeepDiveMessages] 获取深挖context消息失败:`, contextError);
            // 如果获取深挖context消息失败，回退到原来的方法
            console.log(`[useDeepDiveMessages] 回退到原来的方法获取深挖消息`);
          }
        }
        
        // 如果其他参数都为空，尝试从会话中获取根节点ID或主上下文
        if (!contextId && !activeNodeId && !contextRootNodeId) {
          console.log('[useDeepDiveMessages] 参数不足，尝试从会话中获取根节点ID或主上下文');
          
          try {
            // 尝试获取会话详情
            const sessionResponse = await api.session.getById(sessionId);
            const sessionData = parseApiResponse<any>(sessionResponse);
            
            if (sessionData) {
              // 尝试获取根节点ID
              if (sessionData.root_node_id) {
                contextRootNodeId = sessionData.root_node_id;
                console.log(`[useDeepDiveMessages] 从会话详情中获取到根节点ID: ${contextRootNodeId}`);
              }
              
              // 尝试获取主上下文
              if (sessionData.main_context) {
                if (!contextRootNodeId && sessionData.main_context.context_root_node_id) {
                  contextRootNodeId = sessionData.main_context.context_root_node_id;
                  console.log(`[useDeepDiveMessages] 从会话详情的主上下文中获取到根节点ID: ${contextRootNodeId}`);
                }
                
                if (sessionData.main_context.id) {
                  contextId = sessionData.main_context.id;
                  console.log(`[useDeepDiveMessages] 从会话详情中获取到主上下文ID: ${contextId}`);
                }
                
                if (sessionData.main_context.active_node_id) {
                  activeNodeId = sessionData.main_context.active_node_id;
                  console.log(`[useDeepDiveMessages] 从会话详情的主上下文中获取到活动节点ID: ${activeNodeId}`);
                }
              }
            }
          } catch (error) {
            console.error('[useDeepDiveMessages] 获取会话详情失败:', error);
            
            // 尝试获取会话的上下文列表
            try {
              const contextsResponse = await api.context.getBySession(sessionId);
              const contextList = parseApiResponse<any[]>(contextsResponse);
              
              // 找到主聊天上下文（mode === 'chat'）
              const mainContext = contextList.find(ctx => ctx.mode === 'chat');
              if (mainContext) {
                contextId = mainContext.id;
                contextRootNodeId = mainContext.context_root_node_id;
                activeNodeId = mainContext.active_node_id;
                console.log(`[useDeepDiveMessages] 从上下文列表中找到主上下文，id: ${contextId}, context_root_node_id: ${contextRootNodeId}, active_node_id: ${activeNodeId}`);
              }
            } catch (contextError) {
              console.error('[useDeepDiveMessages] 获取会话的上下文列表失败:', contextError);
            }
          }
          
          // 如果仍然没有获取到任何参数，尝试获取会话树
          if (!contextId && !activeNodeId && !contextRootNodeId) {
            try {
              const treeResponse = await api.session.getTree(sessionId, true);
              const tree = parseApiResponse<any>(treeResponse);
              
              if (tree && tree.nodes && tree.nodes.length > 0) {
                // 找到根节点（parent_id为null的节点）
                const rootNode = tree.nodes.find((node: any) => !node.parent_id);
                if (rootNode) {
                  contextRootNodeId = rootNode.id;
                  console.log(`[useDeepDiveMessages] 从会话树中找到根节点ID: ${contextRootNodeId}`);
                }
              }
            } catch (treeError) {
              console.error('[useDeepDiveMessages] 获取会话树失败:', treeError);
            }
          }
          
          // 如果仍然没有获取到任何参数，返回空消息列表
          if (!contextId && !activeNodeId && !contextRootNodeId) {
            console.log('[useDeepDiveMessages] 无法获取任何参数，返回空消息列表');
            return [];
          }
        }
        
        console.log(`[useDeepDiveMessages] 开始获取深挖消息，sessionId=${sessionId}, contextId=${contextId}, activeNodeId=${activeNodeId}, contextRootNodeId=${contextRootNodeId}`);
        
        // 创建单一消息数组，用于收集所有方法获取的消息
        let allMessages: any[] = [];
        
        // 保存已处理过的消息ID，用于去重
        const processedMsgIds = new Set<string>();
        
        // 方法1：尝试直接获取活动节点的QA对
        if (activeNodeId) {
          try {
            console.log(`[useDeepDiveMessages] 方法1: 直接从活动节点获取QA对: ${activeNodeId}`);
            const res = await api.node.getQAPairs(activeNodeId);
            const parsed = parseApiResponse<any>(res);
            const qaPairs = parsed?.items || parsed?.data?.items || [];
            
            console.log(`[useDeepDiveMessages] 方法1: 获取到 ${qaPairs?.length || 0} 个QA对`);
            
            if (qaPairs && qaPairs.length > 0) {
              const nodeMessages = convertQAPairsToMessages(qaPairs, activeNodeId);
              
              // 添加消息到总集合，但不立即更新状态
              nodeMessages.forEach(msg => {
                // 使用更精确的去重标识符，包含qa_id
                const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${msg.node_id}:${msg.content.substring(0, 50)}`;
                if (!processedMsgIds.has(msgId)) {
                  processedMsgIds.add(msgId);
                  allMessages.push(msg);
                }
              });
            } else {
              console.log(`[useDeepDiveMessages] 方法1: 活动节点没有QA对，尝试直接获取节点信息`);
              
              // 如果活动节点没有QA对，尝试直接获取节点信息
              try {
                const nodeRes = await api.node.getById(activeNodeId);
                const nodeData = parseApiResponse<any>(nodeRes);
                
                // 检查节点是否有QA对
                if (nodeData && nodeData.qa_pairs && nodeData.qa_pairs.length > 0) {
                  const nodeMessages = convertQAPairsToMessages(nodeData.qa_pairs, activeNodeId);
                  
                  nodeMessages.forEach(msg => {
                    const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${msg.node_id}:${msg.content.substring(0, 50)}`;
                    if (!processedMsgIds.has(msgId)) {
                      processedMsgIds.add(msgId);
                      allMessages.push(msg);
                    }
                  });
                }
              } catch (nodeErr) {
                console.error('[useDeepDiveMessages] 方法1: 获取节点信息失败:', nodeErr);
              }
            }
          } catch (err) {
            console.error('[useDeepDiveMessages] 方法1: 获取活动节点QA对失败:', err);
            // 继续尝试其他方法，不中断流程
          }
        }
        
        // 方法2：直接获取根节点的QA对
        if (contextRootNodeId && contextRootNodeId !== activeNodeId) {
          try {
            console.log(`[useDeepDiveMessages] 方法2: 直接从根节点获取QA对: ${contextRootNodeId}`);
            const res = await api.node.getQAPairs(contextRootNodeId);
            const parsed = parseApiResponse<any>(res);
            const qaPairs = parsed?.items || parsed?.data?.items || [];
            
            console.log(`[useDeepDiveMessages] 方法2: 获取到 ${qaPairs?.length || 0} 个QA对`);
            
            if (qaPairs && qaPairs.length > 0) {
              const nodeMessages = convertQAPairsToMessages(qaPairs, contextRootNodeId);
              
              // 添加消息到总集合，但不立即更新状态
              nodeMessages.forEach(msg => {
                const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${msg.node_id}:${msg.content.substring(0, 50)}`;
                if (!processedMsgIds.has(msgId)) {
                  processedMsgIds.add(msgId);
                  allMessages.push(msg);
                }
              });
            }
          } catch (err) {
            console.error('[useDeepDiveMessages] 方法2: 获取根节点QA对失败:', err);
            // 继续尝试其他方法，不中断流程
          }
        }
        
        // 方法3：通过会话树路径获取QA对
        try {
          console.log(`[useDeepDiveMessages] 方法3: 使用会话树路径方法获取QA对`);
          // 获取会话树
          const sessionTreeResponse = await api.session.getTree(sessionId, true);
          const sessionTree = parseApiResponse<any>(sessionTreeResponse);
          
          if (sessionTree && sessionTree.nodes) {
            console.log(`[useDeepDiveMessages] 方法3: 会话树节点数量: ${sessionTree.nodes.length}`);
            
            // 获取从根节点到活动节点的路径
            const pathNodeIds = buildPathNodeIds(
              sessionTree.nodes,
              contextRootNodeId || '',
              activeNodeId || null
            );
            
            console.log(`[useDeepDiveMessages] 方法3: 路径节点IDs: ${pathNodeIds.join(', ')}`);
            
            if (pathNodeIds.length > 0) {
              // 从路径节点获取QA对
              const pathMessages = await buildMessagesByNodeIds(pathNodeIds);
              
              // 添加消息到总集合
              pathMessages.forEach(msg => {
                const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${msg.node_id}:${msg.content.substring(0, 50)}`;
                if (!processedMsgIds.has(msgId)) {
                  processedMsgIds.add(msgId);
                  allMessages.push(msg);
                }
              });
            }
            
            // 如果仍然没有消息，尝试查找可能被发送问题的节点
            if (allMessages.length === 0 && contextRootNodeId) {
              console.log(`[useDeepDiveMessages] 方法3: 尝试查找最近被问答的节点`);
              
              const potentialQANodes = sessionTree.nodes.filter((n: any) => 
                n.parent_id === contextRootNodeId || n.id === activeNodeId
              );
              
              if (potentialQANodes.length > 0) {
                const potentialNodeIds = potentialQANodes.map((n: any) => n.id);
                
                const potentialMessages = await buildMessagesByNodeIds(potentialNodeIds);
                
                potentialMessages.forEach(msg => {
                  const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${msg.node_id}:${msg.content.substring(0, 50)}`;
                  if (!processedMsgIds.has(msgId)) {
                    processedMsgIds.add(msgId);
                    allMessages.push(msg);
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error('[useDeepDiveMessages] 方法3: 通过会话树获取消息失败:', err);
        }
        
        // 所有方法尝试完毕，对消息进行排序
        if (allMessages.length > 0) {
          console.log(`[useDeepDiveMessages] 总共获取到 ${allMessages.length} 条非重复消息，开始排序`);
          
          // 按时间排序消息
          allMessages.sort((a, b) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(normalizeTimestamp(a.timestamp)).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(normalizeTimestamp(b.timestamp)).getTime();
            return timeA - timeB;
          });
          
          return allMessages;
        }
        
        console.log(`[useDeepDiveMessages] 所有方法都尝试完毕，但未获取到任何消息`);
        return [];
      } catch (err) {
        console.error('[useDeepDiveMessages] 获取深挖消息失败:', err);
        toast.error('获取深挖消息失败，请稍后重试');
        return [];
      }
    },
    {
      // 只有在会话ID存在时才启用查询
      enabled: !!sessionId,
      staleTime: 1 * 60 * 1000, // 1分钟内不重新获取
      retry: 2, // 增加重试次数
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  );
  
  // 构造从根节点到活动节点的"路径"节点ID数组
  const buildPathNodeIds = (nodes: any[], rootId: string, activeId: string | null) => {
    const parentMap: Record<string, string | null | undefined> = {};
    nodes.forEach((n: any) => {
      parentMap[n.id] = n.parent_id;
    });

    const path: string[] = [];
    let currentId: string | null = activeId || rootId;
    const safeguard = new Set<string>();
    while (currentId) {
      path.push(currentId);
      if (currentId === rootId) break;
      if (safeguard.has(currentId)) {
        console.warn('[useDeepDiveMessages] buildPathNodeIds 检测到循环引用');
        break;
      }
      safeguard.add(currentId);
      currentId = parentMap[currentId] ?? null;
    }
    return path.reverse(); // 从根到活动节点
  };
  
  // 根据节点ID列表批量拉取QA对，生成message数组
  const buildMessagesByNodeIds = async (nodeIds: string[]) => {
    // 保存已处理过的消息ID，用于去重
    const processedMsgIds = new Set<string>();
    const allMsgs: ReturnType<typeof convertQAPairsToMessages>[number][] = [];

    console.log(`[useDeepDiveMessages] 开始为 ${nodeIds.length} 个节点获取QA对`, nodeIds);

    // 并发拉取所有节点的QA对
    await Promise.all(
      nodeIds.map(async (nid) => {
        try {
          console.log(`[useDeepDiveMessages] 获取节点 ${nid} 的QA对`);
          const res = await api.node.getQAPairs(nid);
          
          const parsed = parseApiResponse<any>(res);
          
          // 尝试多种可能的数据结构路径
          let qaPairs = parsed?.items || parsed?.data?.items || [];
          
          // 如果是单个QA对象
          if (!Array.isArray(qaPairs) && qaPairs && typeof qaPairs === 'object') {
            if (qaPairs.question) {
              qaPairs = [qaPairs];
            } else {
              console.warn(`[useDeepDiveMessages] 无法解析QA数据:`, qaPairs);
              return;
            }
          }
          
          if (qaPairs && qaPairs.length > 0) {
            console.log(`[useDeepDiveMessages] 节点 ${nid} 有 ${qaPairs.length} 个QA对`);
            const nodeMsgs = convertQAPairsToMessages(qaPairs, nid);
            
            // 去重添加消息
            nodeMsgs.forEach(msg => {
              // 使用更完整的消息标识：角色+QA ID或节点ID+内容前缀
              const msgId = msg.qa_id ? `${msg.role}:${msg.qa_id}` : `${msg.role}:${nid}:${msg.content.substring(0, 50)}`;
              
              if (!processedMsgIds.has(msgId)) {
                processedMsgIds.add(msgId);
                allMsgs.push({
                  ...msg,
                  node_id: nid // 确保节点ID存在
                });
              }
            });
          } else {
            console.log(`[useDeepDiveMessages] 节点 ${nid} 没有找到有效的QA对`);
          }
        } catch (err) {
          console.error(`[useDeepDiveMessages] 获取节点 ${nid} 的QA对失败:`, err);
        }
      })
    );

    console.log(`[useDeepDiveMessages] 获取到 ${allMsgs.length} 条有效消息 (去重后)，开始排序`);
    
    // 按时间排序消息
    allMsgs.sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(normalizeTimestamp(a.timestamp)).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(normalizeTimestamp(b.timestamp)).getTime();
      return timeA - timeB;
    });

    console.log(`[useDeepDiveMessages] 排序完成，返回 ${allMsgs.length} 条消息`);
    return allMsgs;
  };
  
  // 发送深挖消息
  const sendMessageMutation = useMutation<Message, Error, { content: string; nodeId?: string; tags?: string[] }>(
    async ({ content, nodeId, tags = [] }) => {
      try {
        // 检查节点ID
        let targetNodeId = nodeId || activeNodeId;
        
        if (!targetNodeId) {
          console.error('[useDeepDiveMessages] 节点ID为空，无法发送消息');
          toast.error('节点ID为空，无法发送消息');
          throw new Error('节点ID为空，无法发送消息');
        }
        
        // 创建新的子节点，并将其设置为深挖上下文的活动节点
        console.log('[useDeepDiveMessages] 准备创建新节点，parent_id=', targetNodeId, 'session_id=', sessionId);
        const newNodeResponse = await api.node.create({
          session_id: sessionId,
          parent_id: targetNodeId, // 使用当前活动节点作为父节点
          label: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
          type: 'normal'
        });
        
        // 解析响应获取新节点ID
        const newNodeData = parseApiResponse<any>(newNodeResponse);
        console.log('[useDeepDiveMessages] 创建节点成功，data=', newNodeData);
        const newNodeId = newNodeData?.id;
        
        if (!newNodeId) {
          throw new Error('创建新节点失败');
        }
        
        // 如果有上下文ID，尝试更新上下文的活动节点为新创建的节点
        if (contextId) {
          try {
            // 检查contextId是否包含"deepdive-"前缀，如果是，则需要通过getByContextId获取上下文详情
            if (contextId.startsWith('deepdive-')) {
              console.log(`[useDeepDiveMessages] contextId包含deepdive-前缀，尝试通过getByContextId获取上下文详情: ${contextId}`);
              
              // 先通过context_id获取上下文详情
              const contextResponse = await api.context.getByContextId(contextId);
              const contextData = parseApiResponse<any>(contextResponse);
              
              if (contextData && contextData.id) {
                console.log(`[useDeepDiveMessages] 获取到上下文详情，id=${contextData.id}`);
                // 使用上下文的id字段更新上下文
                await api.context.update(contextData.id, { active_node_id: newNodeId });
              } else {
                console.error(`[useDeepDiveMessages] 无法获取上下文详情:`, contextData);
                throw new Error('无法获取上下文详情');
              }
            } else {
              // 如果contextId不包含"deepdive-"前缀，则直接使用它更新上下文
              console.log(`[useDeepDiveMessages] 直接使用contextId更新上下文: ${contextId}`);
              await api.context.update(contextId, { active_node_id: newNodeId });
            }
          } catch (contextError) {
            console.error(`[useDeepDiveMessages] 获取或更新上下文失败:`, contextError);
            // 继续执行，不中断流程
          }
        }
        
        // 向新创建的节点发送问题并等待后端生成 QA 对
        console.log('[useDeepDiveMessages] 向节点发送问题:', content);
        const response = await api.node.askQuestion(newNodeId, content);
        
        // 解析响应获取回答
        const answerResp = parseApiResponse<any>(response);
        
        // 兼容不同的响应格式
        let answer = '';
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
          console.error('[useDeepDiveMessages] 无法从响应中提取answer字段:', response, answerResp);
          throw new Error('无法从响应中提取answer字段');
        }
        
        if (typeof answer !== 'string' || answer.trim() === '') {
          console.error('[useDeepDiveMessages] API返回的answer不是有效字符串:', answer);
          throw new Error('AI回复内容为空');
        }
        
        // 构造消息对象
        const timestamp = Date.now();
        const userMessage: Message = {
          id: `user-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          session_id: sessionId,
          parent_id: newNodeId,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          tags,
          qa_pair_id: newNodeId // 使用qa_pair_id存储节点ID
        };
        
        const assistantMessage: Message = {
          id: `assistant-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          session_id: sessionId,
          parent_id: newNodeId,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
          tags,
          qa_pair_id: newNodeId // 使用qa_pair_id存储节点ID
        };
        
        // 将用户消息和AI回复添加到缓存
        queryClient.setQueryData<Message[]>(['deepdive-messages', sessionId, contextId, activeNodeId, contextRootNodeId], (old = []) => {
          return [...old, userMessage, assistantMessage];
        });
        
        // 更新活动节点ID
        if (contextId) {
          queryClient.setQueryData(['deepdive-context', contextId], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              active_node_id: newNodeId
            };
          });
        }
        
        return userMessage;
      } catch (error) {
        console.error('[useDeepDiveMessages] 发送深挖消息失败:', error);
        toast.error('发送深挖消息失败，请稍后重试');
        throw error;
      }
    },
    {
      onSuccess: () => {
        // 刷新会话树，以显示新创建的节点
        setTimeout(() => {
          console.log(`[useDeepDiveMessages] 刷新会话树，显示新创建的节点`);
          refetchSessionTree();
          
          // 再次刷新，确保树数据完全更新
          setTimeout(() => {
            console.log(`[useDeepDiveMessages] 再次刷新会话树，确保数据更新`);
            refetchSessionTree();
          }, 2000);
        }, 2000);
      }
    }
  );
  
  // 合并加载状态
  const isLoading = isLoadingContexts || isLoadingMessages;

  return {
    messages,
    isLoading,
    error,
    sendMessage: (content: string, nodeId?: string, tags?: string[]) => 
      sendMessageMutation.mutateAsync({ content, nodeId, tags }),
    refetch
  };
}
