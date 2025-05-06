export type MsgRole = "user" | "assistant"

export interface Message {
  id: string          // nanoid()
  nodeId: string      // 对应树节点 → 用来跳定位
  role: MsgRole
  content: string
  ts: number          // Date.now()，用于排序
  sessionId: string   // 添加sessionId字段，用于标识消息属于哪个会话
}
