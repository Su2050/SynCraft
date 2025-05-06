// hooks/useLogger.ts
import { useCallback } from 'react';
import { useLogStore, LogLevel } from '../store/logStore';

/**
 * 日志Hook，提供更方便的日志记录功能
 * @param module 模块名称，用于标识日志来源
 * @returns 日志记录方法
 */
export function useLogger(module: string) {
  const addLog = useLogStore(state => state.addLog);
  
  /**
   * 记录调试级别的日志
   * @param message 日志消息
   * @param details 日志详情
   */
  const debug = useCallback((message: string, details?: any) => {
    addLog('debug', message, details, module);
  }, [addLog, module]);
  
  /**
   * 记录信息级别的日志
   * @param message 日志消息
   * @param details 日志详情
   */
  const info = useCallback((message: string, details?: any) => {
    addLog('info', message, details, module);
  }, [addLog, module]);
  
  /**
   * 记录警告级别的日志
   * @param message 日志消息
   * @param details 日志详情
   */
  const warning = useCallback((message: string, details?: any) => {
    addLog('warning', message, details, module);
  }, [addLog, module]);
  
  /**
   * 记录错误级别的日志
   * @param message 日志消息
   * @param details 日志详情
   */
  const error = useCallback((message: string, details?: any) => {
    addLog('error', message, details, module);
  }, [addLog, module]);
  
  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param details 日志详情
   */
  const log = useCallback((level: LogLevel, message: string, details?: any) => {
    addLog(level, message, details, module);
  }, [addLog, module]);
  
  return {
    debug,
    info,
    warning,
    error,
    log
  };
}
