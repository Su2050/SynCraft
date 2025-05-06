/* ------------------------------------------------------------------
 * utils/clipboard.ts – Day 9 修正版
 * 把剪贴板解析为 Clip[]：
 *   { id, mime, data, created }
 * -----------------------------------------------------------------*/

import { nanoid } from 'nanoid'          // ✨ npm i nanoid -D  (已非常小)

export interface Clip {
  id: string
  mime: string      // e.g. text/plain, text/url, image/png
  data: string
  created: number
}

/** nativeEvent = ClipboardEvent */
export function parseClipboard(e: ClipboardEvent): Clip[] {
  const dt = e.clipboardData
  if (!dt) return []

  /* 尝试纯文本 */
  const raw = dt.getData('text/plain')
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(/\r?\n+/)
      .map(str => str.trim())
      .filter(Boolean)
      .slice(0, 20)                         // 最多 20 条
      .map<Clip>(txt => ({
        id: nanoid(8),
        mime: 'text/plain',
        data: txt,
        created: Date.now(),
      }))
  }

  /* TODO: html / image / uri-list 分支 */

  return []
}
