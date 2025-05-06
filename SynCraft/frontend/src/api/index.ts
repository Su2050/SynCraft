// frontend/src/api/index.ts

import type { ChatNode } from "../types";
import { apiClient } from './client';
import { sessionEndpoints, nodeEndpoints, qaPairEndpoints } from './endpoints';
import { convertApiNodeToFrontend } from './types';

// 导出所有API端点
export const api = {
  sessions: sessionEndpoints,
  nodes: nodeEndpoints,
  qaPairs: qaPairEndpoints
};

/** 创建子节点（或根节点） */
export async function createNode(
  parentId: string | null,
  question: string,
  templateId?: string
): Promise<ChatNode> {
  try {
    // 获取当前活动会话ID（这里需要从sessionStore获取）
    // 为了避免循环依赖，这里使用一个临时的方式获取会话ID
    // 实际实现时应该通过参数传入或其他方式获取
    const sessionId = localStorage.getItem('activeSessionId') || 'default';
    
    // 使用新的API客户端创建节点
    const node = await nodeEndpoints.createNode({
      session_id: sessionId,
      parent_id: parentId,
      template_key: templateId || null
    });
    
    // 向节点提问
    const qaPair = await nodeEndpoints.askQuestion(node.id, question);
    
    // 返回前端格式的节点
    return {
      id: node.id,
      parentId: node.parent_id || null,
      question: question,
      answer: qaPair.answer,
      templateKey: node.template_key || undefined
    };
  } catch (error) {
    console.error('创建节点失败:', error);
    
    // 回退到原有实现
    const backendUrl = "http://localhost:8000";
    const res = await fetch(`${backendUrl}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_id: parentId,
        question,
        template_id: templateId ?? null,
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json() as Promise<ChatNode>;
  }
}

/** 根据 id 拉完整节点（可选，用在深挖侧窗刷新） */
export async function fetchNode(id: string): Promise<ChatNode> {
  try {
    // 使用新的API客户端获取节点
    const node = await nodeEndpoints.getNode(id);
    
    // 提取问题和回答
    let question = '';
    let answer = null;
    
    if (node.qa_pairs && node.qa_pairs.length > 0) {
      question = node.qa_pairs[0].question || '';
      answer = node.qa_pairs[0].answer || null;
    }
    
    // 返回前端格式的节点
    return convertApiNodeToFrontend(node, question, answer);
  } catch (error) {
    console.error('获取节点失败:', error);
    
    // 回退到原有实现
    const backendUrl = "http://localhost:8000";
    const res = await fetch(`${backendUrl}/nodes/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ChatNode>;
  }
}

// 获取大模型的回答
export const getAssistantAnswer = async (userMessage: string): Promise<string> => {
  try {
    // 获取当前活动节点ID（这里需要从contextStore获取）
    // 为了避免循环依赖，这里使用一个临时的方式获取节点ID
    // 实际实现时应该通过参数传入或其他方式获取
    const nodeId = localStorage.getItem('activeNodeId') || 'root';
    
    // 使用新的API客户端向节点提问
    const qaPair = await nodeEndpoints.askQuestion(nodeId, userMessage);
    
    return qaPair.answer || '无法获取回答';
  } catch (error) {
    console.error('获取大模型回答失败:', error);
    
    // 回退到原有实现
    const backendUrl = "http://localhost:8000";
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "dev-secret",
      },
      body: JSON.stringify({ msg: userMessage, context: [] }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch assistant's answer");
    }

    const data = await response.json();
    return data.answer;
  }
};
