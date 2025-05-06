// hooks/useErrorService.ts
import { useCallback } from 'react';
import { useLogger } from './useLogger';

/**
 * 错误处理Hook，提供统一的错误处理功能
 * @returns 错误处理方法
 */
export function useErrorService() {
  const logger = useLogger('ErrorService');
  
  /**
   * 处理错误，包括记录日志、显示用户友好的错误提示、尝试恢复等
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 用户友好的错误消息
   */
  const handleError = useCallback((error: Error, context?: any) => {
    // 记录错误日志
    logger.error(error.message, { ...context, stack: error.stack });
    
    // 返回用户友好的错误消息
    return getUserFriendlyErrorMessage(error);
  }, [logger]);
  
  /**
   * 向用户显示错误消息
   * @param message 错误消息
   */
  const showErrorToUser = useCallback((message: string) => {
    // 实现显示错误消息的逻辑，例如使用toast通知
    // 这里可以集成第三方库如react-toastify
    console.error(`[用户错误提示] ${message}`);
    
    // 如果项目中有全局的错误提示组件，可以在这里调用
    // 例如：errorStore.setError(message);
  }, []);
  
  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 错误上下文
   */
  const logError = useCallback((error: Error, context?: any) => {
    // 记录错误日志
    logger.error(error.message, { ...context, stack: error.stack });
  }, [logger]);
  
  /**
   * 根据错误类型返回用户友好的错误消息
   * @param error 错误对象
   * @returns 用户友好的错误消息
   */
  const getUserFriendlyErrorMessage = (error: Error): string => {
    // 根据错误类型或消息内容返回不同的用户友好消息
    if (error.message.includes('网络')) {
      return '网络连接出现问题，请检查您的网络连接并重试。';
    }
    
    if (error.message.includes('节点')) {
      return '操作节点时出现问题，请刷新页面后重试。';
    }
    
    if (error.message.includes('不能为空')) {
      return '请填写所有必填字段后重试。';
    }
    
    if (error.message.includes('不存在')) {
      return '您尝试操作的对象不存在，请刷新页面后重试。';
    }
    
    // 默认错误消息
    return '操作失败，请稍后重试。';
  };
  
  return {
    handleError,
    showErrorToUser,
    logError
  };
}
