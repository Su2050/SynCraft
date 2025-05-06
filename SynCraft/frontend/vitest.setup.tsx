/**
 * Vitest 全局前置脚本
 * ----------------------------------------------------------
 * 1. 给 JSDOM 打补丁：scrollIntoView / ResizeObserver / IndexedDB
 * 2. 把 idb-keyval 替换成内存 Map，避免 DataCloneError
 * 3. 极简 mock react-flow-renderer，只渲染 label，供测试查询
 */

import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import React from 'react'
import { vi } from 'vitest'

/* ─────────────── scrollIntoView mock ─────────────── */
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: () => {},
})

/* ─────────────── ResizeObserver mock ─────────────── */
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver,
})

/* ─────────────── idb-keyval → 内存 Map ─────────────── */
vi.mock('idb-keyval', () => {
  const db = new Map<string, unknown>()
  return {
    get: vi.fn(async k        => db.get(k)),
    set: vi.fn(async (k, v)   => db.set(k, v)),
    del: vi.fn(async k        => db.delete(k)),
    clear: vi.fn(async ()     => db.clear()),
  }
})

/* ─────────────── react-flow-renderer mock ─────────────── */
vi.mock('react-flow-renderer', () => {
  type RFNode = { id: string; position: { x: number; y: number }; data: { label: string } }
  type RFEdge = { id: string; source: string; target: string }

  /* ---------- 极简组件：仅渲染 label ---------- */
  function MockFlow({
    nodes = [],
    onNodeContextMenu,
  }: {
    nodes: RFNode[]
    onNodeContextMenu?: (e: any, n: RFNode) => void
  }) {
    /* ★ 只渲染未隐藏节点 --------------------------------- */
    const visible = nodes.filter((n: any) => !n.hidden)
    return (
      <div data-testid="mock-flow">
        {visible.map(n => (
          <div
            key={n.id}
            data-testid={n.id}
            onContextMenu={e => onNodeContextMenu?.(e, n)}
          >
            {n.data.label}
          </div>
        ))}
      </div>
    )
  }

  /* ---------- stub hooks ---------- */
  const ROOT_NODE: RFNode = {
    id: 'root',
    position: { x: 0, y: 0 },               // ★ 加上默认坐标
    data: { label: 'ROOT' },
  }

  const useNodesState = (init: RFNode[] = []) => {
    const start = init.length ? init : [ROOT_NODE]
    const [nodes, setNodes] = React.useState<RFNode[]>(start)
    return [nodes, setNodes, vi.fn()] as any
  }

  const useEdgesState = (init: RFEdge[] = []) => {
    const [edges, setEdges] = React.useState<RFEdge[]>(init)
    return [edges, setEdges, vi.fn()] as any
  }

  const addEdge = (edge: RFEdge, edges: RFEdge[]) => [...edges, edge]

  return {
    __esModule: true,
    default: MockFlow,
    Background: () => null,
    Controls:  () => null,
    MiniMap:   () => null,
    MarkerType: {},

    useNodesState,
    useEdgesState,
    addEdge,
  }
})
