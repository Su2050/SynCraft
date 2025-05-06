import { render, screen, fireEvent } from '@testing-library/react'
import ChatDrawer from '../components/ChatDrawer'
import { useChatStore } from '../store/chatStore'
import { vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { answer: 'pong' } }),
  },
}))

describe('ChatDrawer - ask', async () => {
  it('shows GPT reply', async () => {
    const { findByText } = render(<ChatDrawer nodeId="n1" onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Ask...'), {
      target: { value: 'ping' },
    })
    fireEvent.keyDown(screen.getByPlaceholderText('Ask...'), {
      key: 'Enter',
    })

    // 等待异步回答出现
    expect(await findByText('pong')).toBeInTheDocument()

    // IndexedDB（store）写入
    const msgs = useChatStore.getState().getMsgs('n1')
    expect(msgs.map((m) => m.content)).toEqual(['ping', 'pong'])
  })
})
