// frontend/src/api/index.ts

import type { ChatNode } from "../types"

/** 创建子节点（或根节点） */
export async function createNode(
  parentId: string | null,
  question: string,
  templateId?: string
): Promise<ChatNode> {
  // 使用环境变量获取后端URL，如果不存在则使用默认值
  // 在Vite项目中，环境变量通过import.meta.env访问，但为了兼容性，我们直接使用默认值
  const backendUrl = "http://localhost:8000";
  const res = await fetch(`${backendUrl}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent_id: parentId,  // 将父节点的 ID 传递给后端
      question,
      template_id: templateId ?? null,
    }),
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }
  return res.json() as Promise<ChatNode>
}

/** 根据 id 拉完整节点（可选，用在深挖侧窗刷新） */
export async function fetchNode(id: string): Promise<ChatNode> {
  // 使用相同的后端URL
  const backendUrl = "http://localhost:8000";
  const res = await fetch(`${backendUrl}/nodes/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ChatNode>
}

// 新增：获取大模型的回答
export const getAssistantAnswer = async (userMessage: string): Promise<string> => {
  // 使用相同的后端URL
  const backendUrl = "http://localhost:8000";
  // 调用后端 API 获取大模型的回答
  const response = await fetch(`${backendUrl}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "dev-secret",  // 需要根据实际情况修改 auth key
    },
    body: JSON.stringify({ msg: userMessage, context: [] }),  // 传递用户消息和上下文
  });

  if (!response.ok) {
    throw new Error("Failed to fetch assistant's answer");
  }

  const data = await response.json();
  return data.answer;  // 返回大模型的回答
};
