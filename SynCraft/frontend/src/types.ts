/**
 * 统一前端公共类型
 */

export interface ChatNode {
    id: string
    parentId: string | null
    question: string
    answer: string | null
    templateKey?: string
    summaryUpToHere?: string
    ext?: Record<string, any>
  }
  