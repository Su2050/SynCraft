// frontend/src/store/messageStore.ts

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Message } from "../types/message";
import { nanoid } from "nanoid";

interface MsgState {
  msgs: Message[];
  load: () => Promise<void>;
  push: (m: Omit<Message, "id" | "ts">, isAssistant?: boolean) => Promise<void>;
  setAll: (msgs: Message[]) => void; // 新增：设置所有消息
}

export const useMsgStore = create<MsgState>((set, get) => ({
  msgs: [],  // 初始消息数组为空

  load: async () => {
    const saved = ((await idbGet("msgs")) ?? []) as Message[];
    set({ msgs: saved });  // 设置加载的消息
  },
  
  setAll: (msgs) => {
    set({ msgs });  // 设置所有消息
  },

  push: async ({ nodeId, role, content }, isAssistant = false) => {
    // 确保 get().msgs 是一个数组，如果不是则初始化为空数组
    const msgs = Array.isArray(get().msgs) ? get().msgs : [];

    const newMsg: Message = {
      id: nanoid(),
      nodeId,
      role: isAssistant ? "assistant" : role,  // 如果是大模型的回答，设置角色为 "assistant"
      content,
      ts: Date.now(),  // 使用当前时间戳作为时间戳
    };

    const next = [...msgs, newMsg];  // 将新消息添加到现有的消息数组中
    set({ msgs: next });  // 更新消息状态
    await idbSet("msgs", next);  // 将新消息保存到 IndexedDB
  },
}));
