import React, { useState } from 'react'
import { Clip } from '../store/chatStore'
import Card from './Card'

interface Props {
  clips: Clip[]
  onSelect: (clip: Clip) => void
}

export default function CardList({ clips, onSelect }: Props) {
  const [activeId, setActive] = useState<string | null>(null)
  return (
    <div>
      {clips.map((c) => (
        <Card
          key={c.id}
          clip={c}
          selected={c.id === activeId}
          onClick={() => {
            setActive(c.id)
            onSelect(c)
          }}
        />
      ))}
    </div>
  )
}
