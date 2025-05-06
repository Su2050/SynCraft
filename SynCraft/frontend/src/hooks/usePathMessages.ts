// hooks/usePathMessages.ts
import { useMemo } from 'react';
import { useTreeStore } from '../store/treeStore';
import { useMsgStore } from '../store/messageStore';

/**
 * 获取从起始节点到终止节点路径上的所有消息
 * @param startNodeId 起始节点ID
 * @param endNodeId 终止节点ID
 * @returns 路径上的消息列表，按路径顺序和时间戳排序
 */
export function usePathMessages(startNodeId: string, endNodeId: string | null) {
  const edges = useTreeStore(state => state.edges);
  const messages = useMsgStore(state => Array.isArray(state.msgs) ? state.msgs : []);
  
  return useMemo(() => {
    if (!startNodeId || !endNodeId) {
      // 如果没有终止节点，只返回起始节点的消息
      return messages
        .filter(m => m.nodeId === startNodeId)
        .sort((a, b) => a.ts - b.ts);
    }
    
    // 计算从endNodeId到startNodeId的路径
    const path = new Set<string>([endNodeId]);
    let currentId = endNodeId;
    
    // 向上查找父节点直到起始节点
    while (currentId !== startNodeId) {
      const parentEdge = edges.find(e => e.target === currentId);
      if (!parentEdge) break;
      
      currentId = parentEdge.source;
      path.add(currentId);
      
      if (currentId === startNodeId) {
        break;
      }
    }
    
    // 如果路径中不包含起始节点，添加起始节点的消息
    if (!path.has(startNodeId)) {
      const startNodeMsgs = messages
        .filter(m => m.nodeId === startNodeId)
        .sort((a, b) => a.ts - b.ts);
      
      // 获取路径上的所有消息
      const pathMsgs = messages
        .filter(m => path.has(m.nodeId))
        .sort((a, b) => {
          // 获取节点a和节点b在路径中的位置
          const aIndex = Array.from(path).indexOf(a.nodeId);
          const bIndex = Array.from(path).indexOf(b.nodeId);
          
          // 如果节点a和节点b是同一个节点，按时间戳排序
          if (aIndex === bIndex) {
            return a.ts - b.ts;
          }
          
          // 否则，按节点在路径中的位置排序（从终止节点到起始节点）
          return bIndex - aIndex;
        });
      
      return [...startNodeMsgs, ...pathMsgs];
    }
    
    // 获取路径上的所有消息
    return messages
      .filter(m => path.has(m.nodeId))
      .sort((a, b) => {
        // 获取节点a和节点b在路径中的位置
        const aIndex = Array.from(path).indexOf(a.nodeId);
        const bIndex = Array.from(path).indexOf(b.nodeId);
        
        // 如果节点a和节点b是同一个节点，按时间戳排序
        if (aIndex === bIndex) {
          return a.ts - b.ts;
        }
        
        // 否则，按节点在路径中的位置排序（从起始节点到终止节点）
        return aIndex - bIndex;
      });
  }, [startNodeId, endNodeId, edges, messages]);
}
