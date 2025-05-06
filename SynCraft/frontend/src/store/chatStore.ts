// src/store/chatStore.ts
//-----------------------------------------------
import { create }  from 'zustand'
import { persist } from 'zustand/middleware'
import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
} from 'idb-keyval'

// ────── types ──────
export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}
export interface Clip {
  id: string
  mime: string
  data: string
  created: number
}
interface ChatState {
  msgs:  Record<string, ChatMsg[]>
  clips: Clip[]

  /* ---------- selectors ---------- */
  getMsgs:  (id: string)                => ChatMsg[]
  /** 取最近 n 条 user+assistant 消息（默认 20） */
  lastMsgs: (id: string, n?: number)    => ChatMsg[]

  /* ---------- mutators ---------- */
  addMsg:      (id: string, msg: ChatMsg)  => void
  addClip:     (c: Clip)                   => void
  clearClips:  () => void

  /* ---------- persistence ---------- */
  load:        () => Promise<void>
  setAll:      (m: ChatState['msgs'], c: Clip[]) => void
}

const DB_KEY = 'syn_craft_chat'

// ────── store ──────
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      msgs:  {},
      clips: [],                                // ★ Day6

      /* ---------- selectors ---------- */
      getMsgs:  (id)       => get().msgs[id] ?? [],
      lastMsgs: (id, n=20) => (get().msgs[id] ?? []).slice(-n),

      /* ---------- msgs ---------- */
      addMsg: (id, msg) => {
        const next = { ...get().msgs, [id]: [...get().msgs[id] ?? [], msg] }
        set({ msgs: next })
        idbSet(DB_KEY, { msgs: next, clips: get().clips })   // ✔️ use idbSet
      },

      /* ---------- clips ---------- */
      addClip: (clip) => {
        const next = [...get().clips, clip]
        set({ clips: next })
        idbSet(DB_KEY, { msgs: get().msgs, clips: next })
      },
      clearClips: () => {
        set({ clips: [] })
        idbSet(DB_KEY, { msgs: get().msgs, clips: [] })
      },

      /* ---------- IndexedDB ---------- */
      load: async () => {
        const data = (await idbGet(DB_KEY)) as Partial<ChatState> | undefined
        if (data) set({ msgs: data.msgs ?? {}, clips: data.clips ?? [] })
      },
      setAll: (msgs, clips) => {
        set({ msgs, clips })
        idbSet(DB_KEY, { msgs, clips })
      },
    }),
    { name: 'chat-store-mem', skipHydration: true }
  )
)
