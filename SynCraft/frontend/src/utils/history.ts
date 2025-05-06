export interface HistoryItem { role: 'assistant' | 'user'; content: string }

/** 最近消息 → 反向累加，直到总长度 ≤ maxLen (默认 800 UTF-8 字符) */
export function sliceHistory(
  history: HistoryItem[],
  maxLen = 800
): HistoryItem[] {
  const kept: HistoryItem[] = []
  let total = 0
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const len = [...history[i].content].length
    if (total + len > maxLen) break
    kept.unshift(history[i])
    total += len
  }
  return kept
}
