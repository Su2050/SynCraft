import { expect, describe, it } from 'vitest'
import { sliceHistory } from '../utils/history'

describe('sliceHistory', () => {
  it('keeps total length ≤ 800 and preserves order', () => {
    const big = 'x'.repeat(400)
    const history = [
      { role: 'user',      content: big },
      { role: 'assistant', content: big },
      { role: 'user',      content: 'end' },
    ]
    const cut = sliceHistory(history, 800)
    expect(cut.length).toBe(2)
    expect(cut[1].content).toBe('end')
  })
})
