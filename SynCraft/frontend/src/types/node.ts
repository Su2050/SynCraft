import { ContextId } from '../store/contextStore';

export interface NodeData {
  label: string;
  originalContext?: string;
  sessionId: string;  // 添加sessionId字段，用于标识节点属于哪个会话
  // 其他节点数据字段
}

export interface NodeCreationResult {
  nodeId: string;
  success: boolean;
  error?: Error;
}
