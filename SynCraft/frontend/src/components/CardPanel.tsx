// frontend/src/components/CardPanel.tsx
import React, { useEffect } from 'react'
import { useCardStore } from '../store/cardStore'

/**
 * 右侧收藏栏（宽 320px）
 */
export default function CardPanel() {
  const { cards, fetchCards, deleteCard } = useCardStore()

  useEffect(() => { fetchCards() }, [])

  return (
    <div className="p-4 w-full h-full overflow-y-auto">
      <h3 className="font-bold mb-3">⭐ 收藏</h3>

      {cards.length === 0 && (
        <p className="text-sm text-zinc-400">暂无收藏，点击卡片右上 ⭐ 可添加</p>
      )}

      {cards.map(c => (
        <div key={c.id}
             className="relative mb-3 rounded border p-3 bg-zinc-50 dark:bg-zinc-800">
          <p className="text-sm break-words whitespace-pre-wrap">{c.concept}</p>
          <span className="text-xs text-zinc-400">
            {new Date(c.created_at).toLocaleDateString()}
          </span>

          <button
            className="absolute top-1 right-2 text-xs text-red-500"
            title="删除收藏"
            onClick={() => deleteCard(c.id)}
          >✕</button>
        </div>
      ))}
    </div>
  )
}
