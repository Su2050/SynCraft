// hooks/useNodeMessages.ts
import { useMemo } from 'react';
import { useMsgStore } from '../store/messageStore';

/**
 * 获取指定节点的消息
 * @param nodeId 节点ID
 * @returns 节点的消息列表，按时间戳排序
 */
export function useNodeMessages(nodeId: string | null) {
  const messages = useMsgStore(state => Array.isArray(state.msgs) ? state.msgs : []);
  
  return useMemo(() => {
    if (!nodeId) return [];
    return messages
      .filter(m => m.nodeId === nodeId)
      .sort((a, b) => a.ts - b.ts);
  }, [messages, nodeId]);
}
