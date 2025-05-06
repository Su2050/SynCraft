// frontend/src/api/types.ts

import { ChatNode } from "../types";

/**
 * 通用响应类型
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * 会话相关类型
 */
export interface ApiSession {
  id: string;
  name: string;
  root_node_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ApiSessionListResponse {
  total: number;
  items: ApiSession[];
}

export interface ApiSessionDetailResponse extends ApiSession {
  contexts: ApiContextBrief[];
}

export interface ApiContextBrief {
  id: string;
  context_id: string;
  mode: string;
  context_root_node_id: string;
  active_node_id: string;
}

/**
 * 节点相关类型
 */
export interface ApiNode {
  id: string;
  session_id: string;
  template_key: string | null;
  summary_up_to_here: string | null;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

export interface ApiNodeCreate {
  session_id: string;
  parent_id: string | null;
  template_key?: string | null;
  summary_up_to_here?: string | null;
  context_id?: string | null;
}

export interface ApiNodeResponse extends ApiNode {
  qa_pairs: ApiQAPairBrief[];
  children: any[];
  contexts: ApiContextBrief[];
}

export interface ApiNodeChildrenResponse {
  items: any[];
}

export interface ApiQAPairBrief {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

/**
 * QA对相关类型
 */
export interface ApiQAPair {
  id: string;
  node_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_favorite: boolean;
  question: string;
  answer: string | null;
  messages: ApiMessage[];
}

export interface ApiQAPairResponse {
  id: string;
  node_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_favorite: boolean;
  question: string;
  answer: string | null;
  messages: ApiMessage[];
}

export interface ApiQAPairDetailResponse extends ApiQAPairResponse {
  status?: string | null;
  rating?: number | null;
  view_count: number;
}

export interface ApiMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  meta_info: any;
  qa_pair_id: string;
}

export interface ApiSearchResponse {
  total: number;
  items: ApiQAPairDetailResponse[];
}

export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

/**
 * 类型转换函数
 */

// 将API会话转换为前端会话
export function convertApiSessionToFrontend(apiSession: ApiSession): any {
  return {
    id: apiSession.id,
    name: apiSession.name,
    rootNodeId: apiSession.root_node_id || 'root',
    createdAt: new Date(apiSession.created_at).getTime(),
    updatedAt: new Date(apiSession.updated_at).getTime()
  };
}

// 将API节点转换为前端节点
export function convertApiNodeToFrontend(apiNode: ApiNode, question: string = '', answer: string | null = null): ChatNode {
  return {
    id: apiNode.id,
    parentId: apiNode.parent_id || null,
    question,
    answer,
    templateKey: apiNode.template_key || undefined,
    summaryUpToHere: apiNode.summary_up_to_here || undefined
  };
}

// 将snake_case转换为camelCase
export function toCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = value;
    return acc;
  }, {} as Record<string, any>);
}

// 将camelCase转换为snake_case
export function toSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    acc[snakeKey] = value;
    return acc;
  }, {} as Record<string, any>);
}
