// frontend/src/store/tabStore.ts
import { create } from 'zustand'

import { ContextId } from './contextStore'

/* ---------- 类型 ---------- */
export interface SideTab {
  nodeId: string           // 关联的树节点 ID
  range: any | null        // 回答中选区，可后续用作高亮
  contextId?: ContextId    // 上下文ID，用于确保嵌套深挖使用正确的上下文
}

interface TabState {
  /** 所有侧窗 Tab，最近打开的排最前 */
  sideTabs: SideTab[]

  /** 当前激活的 Tab（渲染时可用） */
  activeTabId: string | null

  /** 打开 / 激活一个侧窗；若已存在则置顶 */
  openSideTab: (nodeId: string, range: any | null, contextId?: ContextId) => void

  /** 关闭一个侧窗 */
  closeSideTab: (nodeId: string) => void
}

export const useSideTabStore = create<TabState>((set, get) => ({
  sideTabs: [],
  activeTabId: null,

  openSideTab: (nodeId, range, contextId) =>
    set(state => {
      // 若已存在，先过滤掉再插到开头
      const filtered = state.sideTabs.filter(t => t.nodeId !== nodeId)
      const newTab: SideTab = { nodeId, range, contextId }
      return {
        sideTabs: [newTab, ...filtered],
        activeTabId: nodeId,
      }
    }),

  closeSideTab: (nodeId) =>
    set(state => {
      const rest = state.sideTabs.filter(t => t.nodeId !== nodeId)
      const newActive = state.activeTabId === nodeId
        ? rest.length ? rest[0].nodeId : null
        : state.activeTabId
      return {
        sideTabs: rest,
        activeTabId: newActive,
      }
    }),
}))
