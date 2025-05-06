import { render, screen, fireEvent } from '@testing-library/react'
import TreeChat from '../components/TreeChat'

function addChild() {
  const root = screen.getByText('ROOT')
  fireEvent.contextMenu(root)
  fireEvent.click(screen.getByText('➕ Add child'))
}

describe('TreeChat - Collapse / Expand', () => {
  it('hides and shows descendants', () => {
    render(<TreeChat />)

    // 生成 2 个子节点
    addChild()
    addChild()
    expect(screen.getAllByText('New').length).toBe(2)

    // 折叠
    const root = screen.getByText('ROOT')
    fireEvent.contextMenu(root)
    fireEvent.click(screen.getByText(/Collapse/))

    // 折叠后应看不到
    expect(screen.queryByText('New')).toBeNull()

    // 再次展开
    fireEvent.contextMenu(root)
    fireEvent.click(screen.getByText(/Collapse/))

    // 节点重新可见
    expect(screen.getAllByText('New').length).toBe(2)
  })
})
