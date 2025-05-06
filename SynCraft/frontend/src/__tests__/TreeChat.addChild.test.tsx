import { render, screen, fireEvent } from '@testing-library/react'
import TreeChat from '../components/TreeChat'

describe('TreeChat - Add child', () => {
  it('creates a new child node under ROOT', () => {
    render(<TreeChat />)

    // 右键 ROOT
    const root = screen.getByText('ROOT')
    fireEvent.contextMenu(root)

    // 点击 “Add child”
    fireEvent.click(screen.getByText('➕ Add child'))

    // 断言出现一个 “New” 节点
    expect(screen.getAllByText('New').length).toBe(1)
  })
})
