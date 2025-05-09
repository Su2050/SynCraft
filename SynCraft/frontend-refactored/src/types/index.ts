// 消息角色类型
export type MessageRole = 'user' | 'assistant';

// 消息类型 - 与后端保持一致的字段名
export interface Message {
  id: string;
  qa_pair_id?: string;
  session_id?: string;
  parent_id?: string | null; // 父消息ID，用于构建树形结构
  role: MessageRole;
  content: string;
  timestamp: string;
  tags?: string[]; // 用于深挖功能的标签，可选
}

// 会话类型 - 与后端保持一致的字段名
export interface Session {
  id: string;
  name: string;
  root_node_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  main_context?: Context; // 主聊天上下文，可选
}

// 树节点类型 - 与后端保持一致的字段名
export interface TreeNode {
  id: string;
  parent_id: string | null;
  session_id: string;
  label: string;
  type: 'root' | 'normal' | 'fork';
  template_key?: string | null; // 模板键，可选
  position?: {
    x: number;
    y: number;
  };
  children?: TreeNode[]; // 子节点列表，可选
}

// QA对类型 - 与后端保持一致的字段名
export interface QAPair {
  id: string;
  node_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_favorite: boolean;
  question: string;
  answer: string;
  status?: string | null;
  rating?: number | null;
  view_count?: number;
  messages?: {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    meta_info: Record<string, any>;
    qa_pair_id: string;
  }[];
}

// 上下文类型 - 与后端保持一致的字段名
export interface Context {
  id: string;
  context_id: string;
  mode: string;
  session_id: string;
  context_root_node_id: string;
  active_node_id: string;
  created_at: string;
  updated_at: string;
  source: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
