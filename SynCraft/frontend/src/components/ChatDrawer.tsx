/* ------------------------------------------------------------------
 * ChatDrawer.tsx – Day 9 加强版 (支持选中文本收藏)
 * 1. 监听 ⌘/Ctrl + V → parseClipboard() → clips[]
 * 2. Toast 提示 “已捕获 … 条剪贴内容”
 * 3. 显示 CardList；点击卡片 → 高亮对应文本
 * 4. 发送消息时调用 ask(nodeId, userMsg)
 * 5. 收藏按钮：如果在回复中选中文本，则收藏选区，否则收藏整条回复
 * -----------------------------------------------------------------*/

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { useChatStore }   from '../store/chatStore'
import { parseClipboard } from '../utils/clipboard'
import { ask }            from '../ask'
import CardList           from './CardList'
import { fetchEntities }  from '../utils/ner'
import { useCardStore }   from '../store/cardStore'  // ← 收藏接口封装

interface Props {
  nodeId: string | null
  onClose: () => void
}

export default function ChatDrawer({ nodeId, onClose }: Props) {
  /* ──────────────── Zustand store ──────────────── */
  const msgs     = useChatStore((s) => (nodeId ? s.getMsgs(nodeId) : []))
  const addMsg   = useChatStore((s) => s.addMsg)
  const addClip  = useChatStore((s) => s.addClip)
  const clips    = useChatStore((s) => s.clips)

  const star     = useCardStore(s => s.star) 

  /* ──────────────── 本地状态 ──────────────── */
  const [input, setInput]       = useState('')
  const [toast, setToast]       = useState<string | null>(null)
  const [hlText, setHighlight]  = useState<string | null>(null)

  const toastTimer = useRef<number | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)

  /* ──────────────── 自动滚到底部 ──────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  /* ──────────────── Toast 自动消失 ──────────────── */
  useEffect(() => {
    if (!toast) return
    toastTimer.current && clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [toast])

  /* ──────────────── Paste 监听 ──────────────── */
  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const list = parseClipboard(e.nativeEvent)
      if (list.length) {
        list.forEach(addClip)
        setToast(`已捕获 ${list.length} 条剪贴内容`)
        e.preventDefault()
      }
    },
    [addClip],
  )

  /* ──────────────── 无节点时不渲染 ──────────────── */
  if (!nodeId) return null

  /* ──────────────── 发送消息 ──────────────── */
  const send = async () => {
    if (!input.trim()) return
    addMsg(nodeId, { role: 'user', content: input })
    setInput('')
    try {
      const answer = await ask(nodeId, input)
      addMsg(nodeId, { role: 'assistant', content: answer })
    } catch (e: any) {
      addMsg(nodeId, { role: 'assistant', content: `❌ Error: ${e.message}` })
    }
  }

  /* ──────────────── 处理卡片选择 ──────────────── */
  const handleSelect = async (clip: any) => {
    setHighlight(clip.data)
    const ents = await fetchEntities(clip.data)
    console.log('NER entities', ents)
    const idx = msgs.findIndex(m => m.content.includes(clip.data.slice(0, 30)))
    if (idx >= 0) {
      document.querySelectorAll('[data-msg]')[idx]?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  /* ──────────────── UI ──────────────── */
  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 340,
        background: '#fff',
        borderLeft: '1px solid #ddd',
        boxShadow: '-2px 0 6px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
          fontWeight: 600,
        }}
      >
        Node {nodeId}
        <span style={{ float: 'right', cursor: 'pointer' }} onClick={onClose}>✖</span>
      </div>

      {/* Messages + CardList */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontSize: 14 }}>
        {/* CardList 区域 */}
        {clips.length > 0 && (
          <CardList clips={clips} onSelect={handleSelect} />
        )}

        {/* Message bubbles */}
        {msgs.map((m, i) => (
          <div
            key={i}
            data-msg
            style={{
              marginBottom: 10,
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '6px 10px',
                borderRadius: 6,
                background:
                  hlText && m.content.includes(hlText)
                    ? '#ffe08a'
                    : m.role === 'user'
                      ? '#cce5ff'
                      : '#f1f3f4',
              }}
            >
              {m.content}

              {/* 收藏 ⭐ */}
              <button
                style={{
                  marginLeft: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
                title="收藏到知识库"
                onClick={() => {
                  const sel = window.getSelection()?.toString().trim() || ''
                  const text = sel && m.content.includes(sel) ? sel : m.content
                  star(text.slice(0, 40), text)
                  setToast('已收藏 ⭐')
                  window.getSelection()?.removeAllRanges()
                }}
              >
                ⭐
              </button>
            </span>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 8, borderTop: '1px solid #eee', position: 'relative' }}>
        <input
          style={{
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '6px 8px',
          }}
          placeholder="Ask..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          onPaste={onPaste}
        />
        {/* Toast */}
        {toast && (
          <span
            style={{
              position: 'absolute',
              left: 12,
              bottom: 42,
              fontSize: 12,
              padding: '4px 8px',
              background: '#000',
              color: '#fff',
              borderRadius: 4,
              opacity: 0.85,
              pointerEvents: 'none',
            }}
          >
            {toast}
          </span>
        )}
      </div>
    </div>
  )
}
