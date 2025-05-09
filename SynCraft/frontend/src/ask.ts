import axios from 'axios';
import { sliceHistory } from './utils/history';
import { useChatStore } from './store/chatStore';
import { apiClient } from './api/client';
import { ApiQAPairResponse } from './api/types';

// 为Vite环境变量声明类型
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

export async function ask(nodeId: string, userMsg: string): Promise<string> {
  try {
    // 首先尝试使用nodeEndpoints.askQuestion
    const { lastMsgs } = useChatStore.getState();
    
    // 确保nodeId有效
    if (!nodeId || nodeId === 'null') {
      console.error('无效的节点ID:', nodeId);
      throw new Error('无效的节点ID');
    }
    
    console.log(`[${new Date().toISOString()}] 向节点 ${nodeId} 提问:`, userMsg.substring(0, 50) + '...');
    
    // 使用apiClient直接调用
    const response = await apiClient.post<ApiQAPairResponse>(`/api/v1/nodes/${nodeId}/ask`, { 
      question: userMsg 
    });
    
    console.log(`[${new Date().toISOString()}] 收到回答:`, response.answer ? response.answer.substring(0, 50) + '...' : '无回答');
    
    return response.answer || '无法获取回答';
  } catch (error) {
    console.error('使用nodeEndpoints.askQuestion失败:', error);
    
    // 回退到原有实现
    try {
      const { lastMsgs } = useChatStore.getState();

      const context = sliceHistory(
        lastMsgs(nodeId, 20).map(({ role, content }: { role: string; content: string }) => ({ role, content }))
      );

      console.log(`[${new Date().toISOString()}] 回退到/api/v1/ask接口`);
      
      const { data } = await axios.post('/api/v1/ask', { msg: userMsg, context }, {
        headers: { 'X-API-Key': import.meta.env.VITE_BACKEND_KEY ?? 'dev-secret' },
      });

      return data.answer as string;
    } catch (fallbackError) {
      console.error('回退到/api/v1/ask也失败:', fallbackError);
      throw fallbackError;
    }
  }
}
