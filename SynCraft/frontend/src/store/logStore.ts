// frontend/src/store/logStore.ts
import { create } from 'zustand'

// 日志级别类型
export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

// 日志类型定义
export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogLevel;
  message: string;
  details?: any;
  module?: string; // 添加模块字段，用于标识日志来源
}

// 日志存储类型定义
interface LogState {
  logs: LogEntry[];
  maxLogs: number;
  logLevel: LogLevel; // 添加日志级别
  addLog: (type: LogLevel, message: string, details?: any, module?: string) => void;
  clearLogs: () => void;
  getRecentLogs: (count: number) => LogEntry[]; // 添加获取最近日志的方法
  setLogLevel: (level: LogLevel) => void; // 添加设置日志级别的方法
}

// 日志级别顺序，用于过滤
const logLevelOrder: Record<LogLevel, number> = { 
  debug: 0, 
  info: 1, 
  warning: 2, 
  error: 3 
};

// 创建日志存储
export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  maxLogs: 100, // 最多保存100条日志
  logLevel: 'info', // 默认日志级别

  // 添加日志
  addLog: (type, message, details, module) => {
    // 根据日志级别过滤
    if (logLevelOrder[type] < logLevelOrder[get().logLevel]) {
      return;
    }
    
    const newLog: LogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      type,
      message,
      details,
      module
    };

    set((state) => {
      // 如果日志数量超过最大值，则移除最旧的日志
      const logs = state.logs.length >= state.maxLogs
        ? [...state.logs.slice(1), newLog]
        : [...state.logs, newLog];
      
      return { logs };
    });
  },

  // 清空日志
  clearLogs: () => set({ logs: [] }),
  
  // 获取最近的日志
  getRecentLogs: (count) => {
    const logs = get().logs;
    return logs.slice(Math.max(0, logs.length - count));
  },
  
  // 设置日志级别
  setLogLevel: (level) => set({ logLevel: level })
}));
