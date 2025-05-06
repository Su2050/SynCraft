import React from 'react'
import { useCardStore } from '../store/cardStore'
import type { Clip } from '../store/chatStore'

interface Props { clip: Clip; selected: boolean; onClick: () => void }

export default function Card({ clip, selected, onClick }: Props) {
  const star = useCardStore(s => s.star)

  return (
    <div
      className={`relative cursor-pointer rounded-md border px-3 py-2 mb-2 shadow-sm
                  dark:border-zinc-700 dark:bg-zinc-800
                  ${selected ? 'border-blue-500 bg-blue-50 dark:bg-zinc-700'
                              : 'hover:border-blue-400'}`}
      onClick={onClick}
    >
      {/* ⭐ 收藏 */}
      <button
        className="absolute top-1 right-1 text-sm"
        onClick={(e) => {
          e.stopPropagation()
          star(clip.data.slice(0, 40), clip.data)   // concept = 前 40 字
        }}
        title="收藏到知识库"
      >⭐</button>

      <p className="text-sm break-words whitespace-pre-wrap">{clip.data.slice(0, 120)}</p>
      <span className="text-xs text-zinc-400">
        {new Date(clip.created).toLocaleTimeString()}
      </span>
    </div>
  )
}
