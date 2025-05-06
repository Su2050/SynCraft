// frontend/src/store/messageStore.ts

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Message, MsgRole } from "../types/message";
import { nanoid } from "nanoid";
import { messageRepository } from "../repositories";

interface MsgState {
  msgs: Message[];
  load: () => Promise<void>;
  push: (m: Omit<Message, "id" | "ts">, isAssistant?: boolean) => Promise<void>;
  setAll: (msgs: Message[]) => void; // 新增：设置所有消息
}

export const useMsgStore = create<MsgState>((set, get) => ({
  msgs: [],  // 初始消息数组为空

  load: async () => {
    try {
      // 获取当前活动会话ID
      const activeSessionId = localStorage.getItem('activeSessionId') || 'default';
      
      if (activeSessionId && activeSessionId !== 'default') {
        // 使用仓储层获取会话的消息
        const messages = await messageRepository.getMessages(activeSessionId);
        
        // 更新状态
        set({ msgs: messages });
        
        // 缓存到IndexedDB
        await idbSet("msgs", messages);
      } else {
        // 回退到原有实现
        const saved = ((await idbGet("msgs")) ?? []) as Message[];
        set({ msgs: saved });  // 设置加载的消息
      }
    } catch (error) {
      console.error('加载消息数据失败:', error);
      
      // 回退到原有实现
      const saved = ((await idbGet("msgs")) ?? []) as Message[];
      set({ msgs: saved });  // 设置加载的消息
    }
  },
  
  setAll: (msgs) => {
    try {
      // 更新状态
      set({ msgs });
      
      // 使用仓储层批量设置消息
      messageRepository.setMessages(msgs).catch(error => {
        console.error('批量设置消息失败:', error);
        
        // 回退到原有实现
        idbSet("msgs", msgs);
      });
    } catch (error) {
      console.error('批量设置消息失败:', error);
      
      // 回退到原有实现
      set({ msgs });
      idbSet("msgs", msgs);
    }
  },

  push: async ({ nodeId, role, content, sessionId }, isAssistant = false) => {
    try {
      // 确保 get().msgs 是一个数组，如果不是则初始化为空数组
      const msgs = Array.isArray(get().msgs) ? get().msgs : [];
      
      // 确定消息角色
      const msgRole: MsgRole = isAssistant ? "assistant" : (role === "user" ? "user" : "assistant");
      
      // 获取当前活动会话ID
      const currentSessionId = sessionId || localStorage.getItem('activeSessionId') || 'default';
      
      // 使用仓储层创建消息
      const newMsg = await messageRepository.createMessage(nodeId, msgRole, content, currentSessionId);
      
      // 更新状态
      const next = [...msgs, newMsg];
      set({ msgs: next });
    } catch (error) {
      console.error('创建消息失败:', error);
      
      // 回退到原有实现
      const msgs = Array.isArray(get().msgs) ? get().msgs : [];
      
      // 获取当前活动会话ID
      const currentSessionId = sessionId || localStorage.getItem('activeSessionId') || 'default';
      
      const newMsg: Message = {
        id: nanoid(),
        nodeId,
        role: isAssistant ? "assistant" : role as MsgRole,
        content,
        ts: Date.now(),
        sessionId: currentSessionId
      };
      
      const next = [...msgs, newMsg];
      set({ msgs: next });
      await idbSet("msgs", next);
    }
  },
}));
