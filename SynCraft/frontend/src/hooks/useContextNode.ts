// hooks/useContextNode.ts
import { useContextStore, ContextId } from '../store/contextStore';

/**
 * 获取指定上下文的活动节点
 * @param contextId 上下文ID
 * @returns 活动节点ID和设置活动节点的方法
 */
export function useContextNode(contextId: ContextId) {
  const activeNodeId = useContextStore(state => state.getActiveNodeId(contextId));
  const setActiveNode = useContextStore(state => 
    (nodeId: string | null, source: string) => 
      state.setActive(nodeId, source, contextId)
  );
  
  return { activeNodeId, setActiveNode };
}
