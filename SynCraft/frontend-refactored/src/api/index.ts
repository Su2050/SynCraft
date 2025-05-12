import type { 
  Session, 
  Message, 
  TreeNode, 
  Context,
  QAPair,
  ApiResponse, 
  PaginatedResponse
} from '@/types';
import { isLocalMode } from '@/utils/backendHealth';
import { parseApiResponse } from '@/utils/apiResponse';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_BACKEND ? `${import.meta.env.VITE_BACKEND}/api/v1` : '/api/v1';

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 检查是否使用本地模式
  if (isLocalMode()) {
    console.log(`[${new Date().toISOString()}] 使用本地模式，跳过API请求: ${endpoint}`);
    
    // 根据不同的端点返回不同的模拟数据
    if (endpoint.includes('/sessions') && !endpoint.includes('/tree')) {
      // 如果是获取会话列表或会话详情
      if (endpoint === '/sessions') {
        // 返回空会话列表
        return { items: [], total: 0 } as unknown as T;
      } else {
        // 返回会话详情
        const sessionId = endpoint.split('/')[2];
        return {
          id: sessionId,
          name: '本地会话',
          root_node_id: `root-${sessionId}`,
          main_context: {
            id: `context-${sessionId}`,
            context_root_node_id: `root-${sessionId}`,
            active_node_id: `root-${sessionId}`
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as unknown as T;
      }
    } else if (endpoint.includes('/tree')) {
      // 如果是获取会话树
      const sessionId = endpoint.split('/')[2];
      
      // 根据会话ID生成不同的树形图数据
      if (sessionId.includes('CdBMO0rl8gk2eUDH7ycyD')) {
        // 第一个会话 - AI新世纪
        return {
          nodes: [
            {
              id: `root-${sessionId}`,
              parent_id: null,
              label: 'AI新世纪根节点',
              type: 'root',
              template_key: 'root'
            },
            {
              id: `node-1-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: 'AI发展历史',
              type: 'normal'
            },
            {
              id: `node-2-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: '未来展望',
              type: 'normal'
            }
          ],
          edges: [
            {
              source: `root-${sessionId}`,
              target: `node-1-${sessionId}`
            },
            {
              source: `root-${sessionId}`,
              target: `node-2-${sessionId}`
            }
          ]
        } as unknown as T;
      } else if (sessionId.includes('Ey7Jm0rl8gk2eUDH7ycyF')) {
        // 第二个会话 - AI新时代
        return {
          nodes: [
            {
              id: `root-${sessionId}`,
              parent_id: null,
              label: 'AI新时代根节点',
              type: 'root',
              template_key: 'root'
            },
            {
              id: `node-1-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: '当前技术',
              type: 'normal'
            },
            {
              id: `node-2-${sessionId}`,
              parent_id: `node-1-${sessionId}`,
              label: '应用场景',
              type: 'normal'
            }
          ],
          edges: [
            {
              source: `root-${sessionId}`,
              target: `node-1-${sessionId}`
            },
            {
              source: `node-1-${sessionId}`,
              target: `node-2-${sessionId}`
            }
          ]
        } as unknown as T;
      } else if (sessionId.includes('Fy8Km0rl8gk2eUDH7ycyG')) {
        // 第三个会话 - AI新世界
        return {
          nodes: [
            {
              id: `root-${sessionId}`,
              parent_id: null,
              label: 'AI新世界根节点',
              type: 'root',
              template_key: 'root'
            },
            {
              id: `node-1-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: '全球影响',
              type: 'normal'
            },
            {
              id: `node-2-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: '伦理问题',
              type: 'normal'
            },
            {
              id: `node-3-${sessionId}`,
              parent_id: `node-2-${sessionId}`,
              label: '监管框架',
              type: 'normal'
            }
          ],
          edges: [
            {
              source: `root-${sessionId}`,
              target: `node-1-${sessionId}`
            },
            {
              source: `root-${sessionId}`,
              target: `node-2-${sessionId}`
            },
            {
              source: `node-2-${sessionId}`,
              target: `node-3-${sessionId}`
            }
          ]
        } as unknown as T;
      } else {
        // 默认树形图数据
        return {
          nodes: [
            {
              id: `root-${sessionId}`,
              parent_id: null,
              label: '根节点',
              type: 'root',
              template_key: 'root'
            },
            {
              id: `node-1-${sessionId}`,
              parent_id: `root-${sessionId}`,
              label: '子节点1',
              type: 'normal'
            }
          ],
          edges: [
            {
              source: `root-${sessionId}`,
              target: `node-1-${sessionId}`
            }
          ]
        } as unknown as T;
      }
    } else if (endpoint.includes('/qa_pairs')) {
      // 如果是获取QA对
      return {
        items: [],
        total: 0
      } as unknown as T;
    } else if (endpoint.includes('/contexts')) {
      // 如果是获取上下文
      if (endpoint.includes('/contexts/')) {
        // 获取单个上下文
        const contextId = endpoint.split('/')[3];
        return {
          id: contextId,
          context_id: contextId,
          mode: 'chat',
          context_root_node_id: `root-${contextId.split('-')[1]}`,
          active_node_id: `root-${contextId.split('-')[1]}`
        } as unknown as T;
      } else {
        // 获取上下文列表
        const sessionId = endpoint.split('/')[2];
        return [
          {
            id: `context-${sessionId}`,
            context_id: `context-${sessionId}`,
            mode: 'chat',
            context_root_node_id: `root-${sessionId}`,
            active_node_id: `root-${sessionId}`
          }
        ] as unknown as T;
      }
    }
    
    // 对于其他端点，返回空对象
    return {} as T;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[${new Date().toISOString()}] 发送API请求: ${url}`);
  console.log(`[${new Date().toISOString()}] 本地模式状态:`, isLocalMode());
  console.log(`[${new Date().toISOString()}] API基础URL:`, API_BASE_URL);
  
  // 获取认证令牌
  const token = localStorage.getItem('token');
  
  // 创建请求头对象，确保类型为 Record<string, string>
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  
  // 如果有令牌，添加到请求头
  if (token && !(options.headers as Record<string, string>)?.['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // 添加跨域请求凭证
      credentials: 'include',
      // 添加模式
      mode: 'cors',
    });
    
    console.log(`[${new Date().toISOString()}] API响应状态: ${response.status} for ${url}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[${new Date().toISOString()}] API请求失败:`, errorData);
      throw new Error(errorData.error || `请求失败: ${response.status}`);
    }
    
    // 直接使用response.json()获取数据
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] API响应数据:`, data);
    
    // 使用通用解析函数处理响应
    const parsedData = parseApiResponse<T>(data);
    console.log(`[${new Date().toISOString()}] 解析后的API响应数据:`, parsedData);
    return parsedData;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API请求异常:`, error);
    throw error;
  }
}

// 会话相关API
export const sessionApi = {
  // 获取所有会话
  getAll: async () => {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      console.log(`[${new Date().toISOString()}] 获取会话列表失败：未找到认证令牌`);
      return [];
    }
    
    const response = await request<{ total: number, items: Session[] }>('/sessions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.items;
  },
  
  // 获取单个会话
  getById: async (id: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 获取会话详情，ID:`, id);
      const response = await request<ApiResponse<Session>>(`/sessions/${id}`);
      console.log(`[${new Date().toISOString()}] 获取会话详情成功:`, response);
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 获取会话详情失败:`, error);
      throw error;
    }
  },
  
  // 创建会话
  create: (data: { name: string }) => 
    request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 更新会话
  update: (id: string, data: { name: string }) => 
    request<ApiResponse<Session>>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 删除会话
  delete: (id: string) => 
    request<ApiResponse<void>>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
    
  // 获取会话树
  getTree: (id: string, includeQA: boolean = true) => 
    request<ApiResponse<{ nodes: TreeNode[], edges: any[] }>>(`/sessions/${id}/tree?include_qa=${includeQA}`),
};

// 消息相关API
export const messageApi = {
  // 获取会话的所有消息（新API）
  getSessionMessages: async (sessionId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 尝试获取会话 ${sessionId} 的所有消息`);
      
      // 使用新的API端点
      const response = await request<ApiResponse<{ items: Message[], total: number }>>(`/sessions/${sessionId}/messages`);
      console.log(`[${new Date().toISOString()}] 获取会话所有消息成功:`, response);
      
      return {
        data: {
          items: response.data?.items || [],
          total: response.data?.total || 0
        }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 获取会话所有消息失败:`, error);
      // 回退到原来的方法
      return messageApi.getBySession(sessionId);
    }
  },
  
  // 获取会话的所有消息（原方法）
  getBySession: async (sessionId: string, retryCount = 3, retryDelay = 1000) => {
    try {
      // 首先获取会话详情，获取根节点ID
      console.log(`[${new Date().toISOString()}] 尝试获取会话详情，ID:`, sessionId);
      console.log(`[${new Date().toISOString()}] 当前URL:`, window.location.href);
      console.log(`[${new Date().toISOString()}] API基础URL:`, API_BASE_URL);
      
      // 检查是否使用本地模式
      if (isLocalMode()) {
        console.log(`[${new Date().toISOString()}] 使用本地模式，跳过API请求，返回空消息列表`);
        return { data: { items: [], total: 0 } };
      }
      
      // 尝试获取会话详情，如果失败则重试
      let sessionResponse;
      let lastError;
      let requestUrl = `${API_BASE_URL}/sessions/${sessionId}`;
      console.log(`[${new Date().toISOString()}] 完整请求URL:`, requestUrl);
      
      // 尝试多种方法获取根节点ID
      let rootNodeId = null;
      let mainContextId = null;
      
      // 方法1: 尝试获取会话详情
      for (let i = 0; i < retryCount; i++) {
        try {
          console.log(`[${new Date().toISOString()}] 尝试获取会话详情，尝试次数: ${i + 1}, URL: ${requestUrl}`);
          
          // 直接使用fetch进行调试，记录更多细节
          if (i === retryCount - 1) { // 最后一次尝试时使用直接fetch
            try {
              console.log(`[${new Date().toISOString()}] 最后一次尝试使用直接fetch`);
              const directResponse = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                mode: 'cors',
              });
              
              console.log(`[${new Date().toISOString()}] 直接fetch状态:`, directResponse.status);
              console.log(`[${new Date().toISOString()}] 直接fetch状态文本:`, directResponse.statusText);
              
              if (directResponse.ok) {
                const directData = await directResponse.json();
                console.log(`[${new Date().toISOString()}] 直接fetch成功，数据:`, directData);
                // 如果直接fetch成功，使用这个结果
                sessionResponse = { data: directData };
                break;
              } else {
                console.error(`[${new Date().toISOString()}] 直接fetch失败:`, directResponse.status, directResponse.statusText);
              }
            } catch (directError) {
              console.error(`[${new Date().toISOString()}] 直接fetch异常:`, directError);
            }
          }
          
          // 使用封装的API调用
          sessionResponse = await sessionApi.getById(sessionId);
          console.log(`[${new Date().toISOString()}] 获取会话详情成功:`, sessionResponse);
          
          // 如果成功获取会话详情，跳出循环
          if (sessionResponse && sessionResponse.data) {
            console.log(`[${new Date().toISOString()}] 成功获取会话详情，跳出循环`);
            break;
          } else {
            console.warn(`[${new Date().toISOString()}] 会话响应存在但数据为空:`, sessionResponse);
          }
        } catch (error: any) {
          console.error(`[${new Date().toISOString()}] 获取会话详情失败，尝试次数: ${i + 1}:`, error);
          console.error(`[${new Date().toISOString()}] 错误详情:`, error.message);
          console.error(`[${new Date().toISOString()}] 错误堆栈:`, error.stack);
          lastError = error;
          
          // 如果不是最后一次尝试，等待一段时间后重试
          if (i < retryCount - 1) {
            console.log(`[${new Date().toISOString()}] 等待 ${retryDelay}ms 后重试`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // 每次重试增加延迟时间
            retryDelay *= 2;
          }
        }
      }
      
      // 如果成功获取会话详情，尝试从中获取根节点ID
      if (sessionResponse && sessionResponse.data) {
        // 详细记录会话响应数据，帮助调试
        console.log(`[${new Date().toISOString()}] 会话详情数据:`, JSON.stringify(sessionResponse.data, null, 2));
        
        // 尝试从root_node_id或main_context获取根节点ID
        rootNodeId = sessionResponse.data.root_node_id;
        console.log(`[${new Date().toISOString()}] 从会话详情中获取root_node_id:`, rootNodeId);
        
        // 如果没有root_node_id但有main_context，则使用main_context中的context_root_node_id
        if (!rootNodeId && sessionResponse.data.main_context) {
          rootNodeId = sessionResponse.data.main_context.context_root_node_id;
          mainContextId = sessionResponse.data.main_context.id;
          console.log(`[${new Date().toISOString()}] 使用main_context中的context_root_node_id:`, rootNodeId);
          console.log(`[${new Date().toISOString()}] 使用main_context中的id:`, mainContextId);
        }
      }
      
      // 方法2: 如果方法1失败，尝试获取会话的上下文列表
      if (!rootNodeId) {
        console.log(`[${new Date().toISOString()}] 无法从会话详情获取根节点ID，尝试获取会话的上下文列表`);
        try {
          const contextsResponse = await api.context.getBySession(sessionId);
          const contextList = parseApiResponse<any[]>(contextsResponse);
          
          // 找到主聊天上下文（mode === 'chat'）
          const mainContext = contextList.find(ctx => ctx.mode === 'chat');
          if (mainContext) {
            rootNodeId = mainContext.context_root_node_id;
            mainContextId = mainContext.id;
            console.log(`[${new Date().toISOString()}] 从上下文列表中找到主上下文，context_root_node_id:`, rootNodeId);
            console.log(`[${new Date().toISOString()}] 从上下文列表中找到主上下文，id:`, mainContextId);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 获取会话的上下文列表失败:`, error);
        }
      }
      
      // 方法3: 如果方法1和方法2都失败，尝试获取会话树
      if (!rootNodeId) {
        console.log(`[${new Date().toISOString()}] 无法从上下文列表获取根节点ID，尝试获取会话树`);
        try {
          const treeResponse = await api.session.getTree(sessionId, true);
          const tree = parseApiResponse<any>(treeResponse);
          
          if (tree && tree.nodes && tree.nodes.length > 0) {
            // 找到根节点（parent_id为null的节点）
            const rootNode = tree.nodes.find((node: any) => !node.parent_id);
            if (rootNode) {
              rootNodeId = rootNode.id;
              console.log(`[${new Date().toISOString()}] 从会话树中找到根节点ID:`, rootNodeId);
            }
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 获取会话树失败:`, error);
        }
      }
      
      // 如果所有方法都失败，返回空消息列表
      if (!rootNodeId) {
        console.error(`[${new Date().toISOString()}] 所有方法都无法获取会话的根节点ID，返回空消息列表`);
        return { data: { items: [], total: 0 } };
      }
      
      // 使用根节点ID获取QA对
      try {
        console.log(`[${new Date().toISOString()}] 使用根节点ID ${rootNodeId} 获取QA对`);
        
        // 记录更多调试信息
        console.log(`[${new Date().toISOString()}] 调用nodeApi.getQAPairs前的参数检查:`);
        console.log(`[${new Date().toISOString()}] rootNodeId类型: ${typeof rootNodeId}, 值: ${rootNodeId}`);
        
        // 确保rootNodeId是字符串
        if (typeof rootNodeId !== 'string') {
          console.error(`[${new Date().toISOString()}] rootNodeId不是字符串，尝试转换`);
          rootNodeId = String(rootNodeId);
        }
        
        const response = await nodeApi.getQAPairs(rootNodeId);
        console.log(`[${new Date().toISOString()}] nodeApi.getQAPairs响应:`, response);
        
        // 将QA对转换为消息格式
        let messages: Message[] = [];
        
        // 检查response的结构
        if (response) {
          console.log(`[${new Date().toISOString()}] response存在，检查其结构`);
          console.log(`[${new Date().toISOString()}] response.data: ${typeof response.data}, 是否存在: ${!!response.data}`);
          
          if (response.data) {
            console.log(`[${new Date().toISOString()}] response.data.items: ${typeof response.data.items}, 是否存在: ${!!response.data.items}`);
            
            if (response.data.items) {
              console.log(`[${new Date().toISOString()}] response.data.items是否为数组: ${Array.isArray(response.data.items)}`);
              console.log(`[${new Date().toISOString()}] response.data.items长度: ${response.data.items.length}`);
            }
          }
        }
        
        // 尝试多种可能的数据结构路径
        let qaItems: any[] = [];
        
        if (response && response.data && (response.data as any).items) {
          qaItems = (response.data as any).items;
        } else if (response && (response as any).items) {
          qaItems = (response as any).items;
        } else if (response && Array.isArray(response)) {
          qaItems = response;
        } else if (response && typeof response === 'object') {
          // 尝试从对象中提取items字段
          const possibleItems = Object.values(response).find(val => Array.isArray(val));
          if (possibleItems) {
            qaItems = possibleItems;
          }
        }
        
        console.log(`[${new Date().toISOString()}] 最终提取的QA对数量: ${qaItems.length}`);
        
        // 处理QA对
        for (const qa of qaItems) {
          console.log(`[${new Date().toISOString()}] 处理QA对:`, qa);
          
          // 如果QA对包含消息数组，直接使用这些消息
          if (qa.messages && qa.messages.length > 0) {
            console.log(`[${new Date().toISOString()}] QA对包含消息数组，长度: ${qa.messages.length}`);
            
            for (const msg of qa.messages) {
              messages.push({
                id: msg.id || `msg-${Math.random().toString(36).substring(2, 10)}`,
                qa_pair_id: qa.id,
                session_id: sessionId,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date().toISOString(),
                parent_id: qa.node_id
              });
            }
          } else {
            console.log(`[${new Date().toISOString()}] QA对不包含消息数组，创建消息`);
            console.log(`[${new Date().toISOString()}] qa.question: ${qa.question}, qa.answer: ${qa.answer}`);
            
            // 如果没有消息数组，则创建消息（兼容旧版API）
            // 添加用户消息
            if (qa.question) {
              messages.push({
                id: `user-${qa.id}-${Math.random().toString(36).substring(2, 10)}`, // 添加随机字符串确保唯一性
                qa_pair_id: qa.id,
                session_id: sessionId,
                role: 'user',
                content: qa.question,
                timestamp: qa.created_at || new Date().toISOString(),
                parent_id: qa.node_id
              });
              
              // 添加助手消息
              if (qa.answer) {
                messages.push({
                  id: `assistant-${qa.id}-${Math.random().toString(36).substring(2, 10)}`, // 添加随机字符串确保唯一性
                  qa_pair_id: qa.id,
                  session_id: sessionId,
                  role: 'assistant',
                  content: qa.answer,
                  timestamp: qa.updated_at || new Date().toISOString(),
                  parent_id: qa.node_id
                });
              }
            }
          }
        }
        
        // 尝试获取主对话context的消息
        console.log(`[${new Date().toISOString()}] 尝试获取主对话context的消息`);
        try {
          // 首先获取会话的所有上下文
          const contextsResponse = await api.context.getBySession(sessionId);
          const contextList = parseApiResponse<any[]>(contextsResponse);
          
          // 找到主聊天上下文（mode === 'chat'）
          const mainContext = contextList.find(ctx => ctx.mode === 'chat');
          
          if (mainContext) {
            console.log(`[${new Date().toISOString()}] 找到主对话context: ${mainContext.id}`);
            
            // 获取主对话context的活动节点
            const activeNodeId = mainContext.active_node_id;
            console.log(`[${new Date().toISOString()}] 主对话context的活动节点: ${activeNodeId}`);
            
            if (activeNodeId) {
              // 获取活动节点的QA对
              console.log(`[${new Date().toISOString()}] 尝试获取活动节点 ${activeNodeId} 的QA对`);
              const nodeResponse = await nodeApi.getQAPairs(activeNodeId);
              
              // 尝试多种可能的数据结构路径
              let nodeQaItems: any[] = [];
              
              if (nodeResponse && nodeResponse.data && (nodeResponse.data as any).items) {
                nodeQaItems = (nodeResponse.data as any).items;
              } else if (nodeResponse && (nodeResponse as any).items) {
                nodeQaItems = (nodeResponse as any).items;
              } else if (nodeResponse && Array.isArray(nodeResponse)) {
                nodeQaItems = nodeResponse;
              }
              
              if (nodeQaItems.length > 0) {
                console.log(`[${new Date().toISOString()}] 从活动节点 ${activeNodeId} 获取到 ${nodeQaItems.length} 个QA对`);
                
                // 处理QA对
                for (const qa of nodeQaItems) {
                  // 处理QA对，与上面的逻辑相同
                  if (qa.messages && qa.messages.length > 0) {
                    for (const msg of qa.messages) {
                      messages.push({
                        id: msg.id || `msg-${Math.random().toString(36).substring(2, 10)}`,
                        qa_pair_id: qa.id,
                        session_id: sessionId,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString(),
                        parent_id: qa.node_id || activeNodeId
                      });
                    }
                  } else if (qa.question) {
                    // 添加用户消息
                    messages.push({
                      id: `user-${qa.id}-${Math.random().toString(36).substring(2, 10)}`,
                      qa_pair_id: qa.id,
                      session_id: sessionId,
                      role: 'user',
                      content: qa.question,
                      timestamp: qa.created_at || new Date().toISOString(),
                      parent_id: qa.node_id || activeNodeId
                    });
                    
                    // 添加助手消息
                    if (qa.answer) {
                      messages.push({
                        id: `assistant-${qa.id}-${Math.random().toString(36).substring(2, 10)}`,
                        qa_pair_id: qa.id,
                        session_id: sessionId,
                        role: 'assistant',
                        content: qa.answer,
                        timestamp: qa.updated_at || new Date().toISOString(),
                        parent_id: qa.node_id || activeNodeId
                      });
                    }
                  }
                }
              }
            }
            
            // 获取主对话context的根节点
            const contextRootNodeId = mainContext.context_root_node_id;
            console.log(`[${new Date().toISOString()}] 主对话context的根节点: ${contextRootNodeId}`);
            
            if (contextRootNodeId && contextRootNodeId !== activeNodeId) {
              // 获取根节点的QA对
              console.log(`[${new Date().toISOString()}] 尝试获取根节点 ${contextRootNodeId} 的QA对`);
              const rootNodeResponse = await nodeApi.getQAPairs(contextRootNodeId);
              
              // 尝试多种可能的数据结构路径
              let rootNodeQaItems: any[] = [];
              
              if (rootNodeResponse && rootNodeResponse.data && (rootNodeResponse.data as any).items) {
                rootNodeQaItems = (rootNodeResponse.data as any).items;
              } else if (rootNodeResponse && (rootNodeResponse as any).items) {
                rootNodeQaItems = (rootNodeResponse as any).items;
              } else if (rootNodeResponse && Array.isArray(rootNodeResponse)) {
                rootNodeQaItems = rootNodeResponse;
              }
              
              if (rootNodeQaItems.length > 0) {
                console.log(`[${new Date().toISOString()}] 从根节点 ${contextRootNodeId} 获取到 ${rootNodeQaItems.length} 个QA对`);
                
                // 处理QA对
                for (const qa of rootNodeQaItems) {
                  // 处理QA对，与上面的逻辑相同
                  if (qa.messages && qa.messages.length > 0) {
                    for (const msg of qa.messages) {
                      messages.push({
                        id: msg.id || `msg-${Math.random().toString(36).substring(2, 10)}`,
                        qa_pair_id: qa.id,
                        session_id: sessionId,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString(),
                        parent_id: qa.node_id || contextRootNodeId
                      });
                    }
                  } else if (qa.question) {
                    // 添加用户消息
                    messages.push({
                      id: `user-${qa.id}-${Math.random().toString(36).substring(2, 10)}`,
                      qa_pair_id: qa.id,
                      session_id: sessionId,
                      role: 'user',
                      content: qa.question,
                      timestamp: qa.created_at || new Date().toISOString(),
                      parent_id: qa.node_id || contextRootNodeId
                    });
                    
                    // 添加助手消息
                    if (qa.answer) {
                      messages.push({
                        id: `assistant-${qa.id}-${Math.random().toString(36).substring(2, 10)}`,
                        qa_pair_id: qa.id,
                        session_id: sessionId,
                        role: 'assistant',
                        content: qa.answer,
                        timestamp: qa.updated_at || new Date().toISOString(),
                        parent_id: qa.node_id || contextRootNodeId
                      });
                    }
                  }
                }
              }
            }
            
            // 按时间戳排序消息
            messages.sort((a, b) => {
              const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
              const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
              return timeA - timeB;
            });
            
            console.log(`[${new Date().toISOString()}] 最终获取到 ${messages.length} 条主对话消息`);
          } else {
            console.log(`[${new Date().toISOString()}] 未找到主对话context`);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 获取主对话context的消息失败:`, error);
        }
        
        console.log(`[${new Date().toISOString()}] 最终获取到 ${messages.length} 条消息`);
        return {
          data: {
            items: messages,
            total: messages.length
          }
        };
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 获取QA对失败:`, error);
        return { data: { items: [], total: 0 } };
      }
      
    } catch (error) {
      console.error('获取会话消息失败:', error);
      return { data: { items: [], total: 0 } };
    }
  },
  
  // 获取节点的消息
  getByNode: async (nodeId: string | null) => {
    // 确保nodeId不为null
    if (!nodeId) {
      console.error(`[${new Date().toISOString()}] 节点ID为空，无法获取消息`);
      return { data: [] };
    }
    try {
      // 使用节点ID获取QA对
      const response = await nodeApi.getQAPairs(nodeId);
      
      // 将QA对转换为消息格式
      const messages: Message[] = [];
      if (response && response.data && response.data.items) {
        for (const qa of response.data.items) {
          // 如果QA对包含消息数组，直接使用这些消息
          if (qa.messages && qa.messages.length > 0) {
            for (const msg of qa.messages) {
              messages.push({
                id: msg.id,
                qa_pair_id: qa.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                parent_id: qa.node_id
              });
            }
          } else {
            // 如果没有消息数组，则创建消息（兼容旧版API）
            // 添加用户消息
            messages.push({
              id: `user-${qa.id}-${Math.random().toString(36).substring(2, 10)}`, // 添加随机字符串确保唯一性
              qa_pair_id: qa.id,
              role: 'user',
              content: qa.question,
              timestamp: qa.created_at,
              parent_id: qa.node_id
            });
            
            // 添加助手消息
            if (qa.answer) {
              messages.push({
                id: `assistant-${qa.id}-${Math.random().toString(36).substring(2, 10)}`, // 添加随机字符串确保唯一性
                qa_pair_id: qa.id,
                role: 'assistant',
                content: qa.answer,
                timestamp: qa.updated_at,
                parent_id: qa.node_id
              });
            }
          }
        }
      }
      
      return { data: messages };
    } catch (error) {
      console.error('获取节点消息失败:', error);
      return { data: [] };
    }
  },
  
  // 发送消息
  send: (sessionId: string, data: { content: string; parent_id?: string; tags?: string[] }) => 
    request<ApiResponse<Message>>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 节点相关API
export const nodeApi = {
  // 获取节点
  getById: (id: string) => 
    request<ApiResponse<TreeNode>>(`/nodes/${id}`),
  
  // 创建节点
  create: (data: { session_id: string; parent_id?: string | null; label: string; type: string }) => {
    // 确保data.parent_id不为null，如果为null则删除该字段
    const requestData = { ...data };
    if (requestData.parent_id === null || requestData.parent_id === undefined) {
      delete requestData.parent_id;
    }
    
    return request<ApiResponse<TreeNode>>('/nodes', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },
  
  // 创建节点并更新上下文的活动节点，在一个事务中完成
  createWithContextUpdate: (data: { 
    session_id: string; 
    parent_id?: string | null; 
    label?: string; 
    type?: string;
    context_id: string; // 必须提供上下文ID
  }) => {
    // 确保data.parent_id不为null，如果为null则删除该字段
    const requestData = { ...data };
    if (requestData.parent_id === null || requestData.parent_id === undefined) {
      delete requestData.parent_id;
    }
    
    console.log(`[${new Date().toISOString()}] 创建节点并更新上下文，session_id=${data.session_id}, parent_id=${data.parent_id}, context_id=${data.context_id}`);
    
    return request<ApiResponse<TreeNode>>('/nodes/with_context_update', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },
  
  // 更新节点
  update: (id: string, data: { label?: string; position?: { x: number; y: number } }) => 
    request<ApiResponse<TreeNode>>(`/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 删除节点
  delete: (id: string) => 
    request<ApiResponse<void>>(`/nodes/${id}`, {
      method: 'DELETE',
    }),
    
  // 向节点提问
  askQuestion: async (id: string | null, question: string) => {
    // 确保id不为null
    if (!id) {
      throw new Error('节点ID为空，无法提问');
    }
    try {
      console.log(`[${new Date().toISOString()}] 向节点 ${id} 提问:`, question.substring(0, 50) + (question.length > 50 ? '...' : ''));
      
      // 直接使用fetch进行请求，以便处理不同的响应格式
      const url = `${API_BASE_URL}/nodes/${id}/ask`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        credentials: 'include',
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[${new Date().toISOString()}] API请求失败:`, errorData);
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      // 解析响应数据
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] 节点回答原始数据:`, data);
      
      // 处理不同的响应格式
      let answer = '';
      
      // 使用通用解析函数处理响应
      const parsedData = parseApiResponse<any>(data);
      
      // 提取answer字段
      if (parsedData && typeof parsedData.answer === 'string') {
        answer = parsedData.answer;
      } else if (parsedData && typeof parsedData.question === 'string' && typeof parsedData.answer === 'string') {
        answer = parsedData.answer;
      }
      // 如果都不是，抛出错误
      else {
        console.error(`[${new Date().toISOString()}] 节点回答格式错误:`, data);
        throw new Error('节点回答格式错误');
      }
      
      // 检查answer是否为空
      if (!answer.trim()) {
        console.error(`[${new Date().toISOString()}] 节点回答为空`);
        throw new Error('节点回答为空');
      }
      
      console.log(`[${new Date().toISOString()}] 节点回答成功:`, answer.substring(0, 50) + (answer.length > 50 ? '...' : ''));
      
      // 返回标准格式的响应
      return {
        data: {
          answer: answer
        }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 向节点提问失败:`, error);
      throw error;
    }
  },
    
  // 获取节点的QA对
  getQAPairs: (nodeId: string | null) => {
    // 确保nodeId不为null
    if (!nodeId) {
      throw new Error('节点ID为空，无法获取QA对');
    }
    return request<ApiResponse<{ items: QAPair[], total: number }>>(`/nodes/${nodeId}/qa_pairs`);
  },
    
  // 创建深挖上下文
  createDeepDive: async (nodeId: string, data: { session_id: string; source?: string }) => {
    // 创建深挖上下文
    const contextResponse = await request<ApiResponse<Context>>(`/contexts`, {
      method: 'POST',
      body: JSON.stringify({
        mode: 'deepdive',
        session_id: data.session_id,
        context_root_node_id: nodeId,
        active_node_id: nodeId,  // 初始时活动节点就是根节点
        source: data.source || `深挖: ${nodeId}`
      }),
    });
    
    // 解析响应
    const context = parseApiResponse<Context>(contextResponse);
    
    // 不再自动创建子节点和发送初始问题
    // 等待用户主动发送问题时再创建子节点
    
    return contextResponse;
  },
};

// 深挖相关API
export const deepDiveApi = {
  // 创建深挖
  create: (data: { text: string; nodeId: string }) => 
    request<ApiResponse<{ id: string }>>('/deepdive', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取深挖结果
  getResult: (id: string) => 
    request<ApiResponse<{ content: string }>>(`/deepdive/${id}`),
};

// 获取大模型的回答
// 注意：此方法目前未被使用，但已修改为接受rootNodeId作为参数，以便将来使用
// 如果需要使用此方法，请确保传入rootNodeId，而不是依赖localStorage中的activeNodeId
export const getAssistantAnswer = async (userMessage: string, rootNodeId?: string | null): Promise<string> => {
  try {
    // 使用传入的rootNodeId，如果没有则尝试从localStorage获取
    const nodeId = rootNodeId || localStorage.getItem('activeNodeId');
    
    // 检查节点ID是否有效
    if (!nodeId || nodeId === 'null' || nodeId === 'root') {
      console.warn(`[${new Date().toISOString()}] getAssistantAnswer - 无效的节点ID: ${nodeId}，回退到直接调用LLM API`);
      // 直接回退到调用LLM API
      return await fallbackToDirectLLMCall(userMessage);
    }
    
    console.log(`[${new Date().toISOString()}] getAssistantAnswer - 向节点 ${nodeId} 提问:`, userMessage.substring(0, 50) + '...');
    
    // 使用nodeApi向节点提问
    try {
      const response = await nodeApi.askQuestion(nodeId, userMessage);
      if (response && response.data) {
        console.log(`[${new Date().toISOString()}] getAssistantAnswer - 收到回答:`, response.data.answer ? response.data.answer.substring(0, 50) + '...' : '无回答');
        return response.data.answer || '无法获取回答';
      } else {
        console.warn(`[${new Date().toISOString()}] getAssistantAnswer - 响应为空或无数据`);
        return '无法获取回答';
      }
    } catch (apiError) {
      console.error(`[${new Date().toISOString()}] getAssistantAnswer - 使用nodeApi.askQuestion失败:`, apiError);
      // 不抛出错误，而是回退到直接调用LLM API
      return await fallbackToDirectLLMCall(userMessage);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getAssistantAnswer - 获取大模型回答失败:`, error);
    // 回退到直接调用LLM API
    return await fallbackToDirectLLMCall(userMessage);
  }
};

// 回退函数：直接调用LLM API
async function fallbackToDirectLLMCall(userMessage: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] fallbackToDirectLLMCall - 尝试直接调用LLM API`);
  
  // 首先尝试/api/v1/ask接口
  try {
    console.log(`[${new Date().toISOString()}] fallbackToDirectLLMCall - 尝试/api/v1/ask接口`);
    
    const backendUrl = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "dev-secret",
      },
      body: JSON.stringify({ msg: userMessage, context: [] }),
    });

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] fallbackToDirectLLMCall - /api/v1/ask请求失败:`, response.status, response.statusText);
      throw new Error(`Failed to fetch assistant's answer: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] fallbackToDirectLLMCall - /api/v1/ask请求成功:`, data.answer ? data.answer.substring(0, 50) + '...' : '无回答');
    return data.answer;
  } catch (fallbackError) {
    console.error(`[${new Date().toISOString()}] fallbackToDirectLLMCall - /api/v1/ask失败:`, fallbackError);
    
      // 最后尝试直接调用/ask接口
      try {
        console.log(`[${new Date().toISOString()}] fallbackToDirectLLMCall - 尝试/ask接口`);
        
        const directBackendUrl = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
      const response = await fetch(`${directBackendUrl}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "dev-secret",
        },
        body: JSON.stringify({ msg: userMessage, context: [] }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assistant's answer: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[${new Date().toISOString()}] fallbackToDirectLLMCall - /ask请求成功:`, data.answer ? data.answer.substring(0, 50) + '...' : '无回答');
      return data.answer;
    } catch (directError) {
      console.error(`[${new Date().toISOString()}] fallbackToDirectLLMCall - 所有尝试都失败:`, directError);
      return "抱歉，无法获取回答。请稍后再试。";
    }
  }
}

// 上下文相关API
export const contextApi = {
  // 获取上下文
  getById: (id: string) => 
    request<ApiResponse<Context>>(`/contexts/${id}`),
  
  // 更新上下文
  update: (id: string, data: { active_node_id: string | null }) => {
    // 确保data.active_node_id不为null，如果为null则抛出错误
    if (data.active_node_id === null) {
      throw new Error('active_node_id不能为null');
    }
    
    console.log(`[${new Date().toISOString()}] 更新上下文，ID: ${id}, active_node_id: ${data.active_node_id}`);
    
    // 直接使用fetch进行请求，以便更好地调试
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}/contexts/${id}`;
      console.log(`[${new Date().toISOString()}] 更新上下文请求URL: ${url}`);
      console.log(`[${new Date().toISOString()}] 更新上下文请求数据: ${JSON.stringify(data)}`);
      
      fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
        mode: 'cors',
      })
      .then(response => {
        console.log(`[${new Date().toISOString()}] 更新上下文响应状态: ${response.status}`);
        if (!response.ok) {
          return response.json().then(errorData => {
            console.error(`[${new Date().toISOString()}] 更新上下文失败:`, errorData);
            reject(new Error(errorData.detail || `请求失败: ${response.status}`));
          }).catch(() => {
            reject(new Error(`请求失败: ${response.status}`));
          });
        }
        return response.json();
      })
      .then(data => {
        console.log(`[${new Date().toISOString()}] 更新上下文成功:`, data);
        resolve(data);
      })
      .catch(error => {
        console.error(`[${new Date().toISOString()}] 更新上下文异常:`, error);
        reject(error);
      });
    });
  },
  
  // 通过上下文ID字符串获取上下文
  getByContextId: (contextIdStr: string) => 
    request<ApiResponse<Context>>(`/contexts/by-context-id/${contextIdStr}`),
  
  // 获取会话的所有上下文
  getBySession: (sessionId: string) => 
    request<ApiResponse<Context[]>>(`/sessions/${sessionId}/contexts`),
};

// 实验性API - 不影响现有功能
export const experimentalApi = {
  // 完全独立的新函数，不修改任何现有代码
  getAllSessionMessages: async (sessionId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] [实验性功能] 尝试获取会话 ${sessionId} 的所有消息`);
      
      // 使用request函数，它会自动添加认证令牌
      const endpoint = `/sessions/${sessionId}/messages`;
      
      // 使用新的API端点
      const data = await request<{ items: Message[], total: number }>(endpoint);
      console.log(`[${new Date().toISOString()}] [实验性功能] 获取会话所有消息成功:`, data);
      
      return {
        data: {
          items: data?.items || [],
          total: data?.total || 0
        }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [实验性功能] 获取会话所有消息失败:`, error);
      throw error;
    }
  },
  
  // 获取特定上下文的消息
  getSessionContextMessages: async (sessionId: string, contextId?: string) => {
    try {
      console.log(`[${new Date().toISOString()}] [实验性功能] 尝试获取会话 ${sessionId} 的上下文消息，contextId=${contextId || '未指定'}`);
      
      // 使用request函数，它会自动添加认证令牌
      const endpoint = `/sessions/${sessionId}/context_messages${contextId ? `?context_id=${contextId}` : ''}`;
      
      // 使用新的API端点
      const data = await request<{ items: Message[], total: number }>(endpoint);
      console.log(`[${new Date().toISOString()}] [实验性功能] 获取会话上下文消息成功:`, data);
      
      return {
        data: {
          items: data?.items || [],
          total: data?.total || 0
        }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [实验性功能] 获取会话上下文消息失败:`, error);
      throw error;
    }
  }
};

// 导入认证相关API
import { authApi, adminApi } from './auth';

// 导出所有API
export const api = {
  session: sessionApi,
  message: messageApi,
  node: nodeApi,
  deepDive: deepDiveApi,
  context: contextApi,
  auth: authApi,
  admin: adminApi,
};

export default api;
