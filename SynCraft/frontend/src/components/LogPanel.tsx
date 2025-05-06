// frontend/src/components/LogPanel.tsx
import React, { useState, useEffect } from 'react';
import { useLogStore, LogEntry } from '../store/logStore';

// 日志面板组件
const LogPanel: React.FC = () => {
  // 获取日志
  const logs = useLogStore((state) => state.logs);
  const clearLogs = useLogStore((state) => state.clearLogs);
  
  // 过滤器状态
  const [filter, setFilter] = useState<'all' | 'debug' | 'info' | 'warning' | 'error'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  // 获取所有唯一的来源
  const sources = React.useMemo(() => {
    const sourceSet = new Set<string>();
    logs.forEach(log => {
      if (log.details?.source) {
        sourceSet.add(log.details.source);
      }
    });
    return Array.from(sourceSet);
  }, [logs]);
  
  // 过滤日志
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      // 类型过滤
      if (filter !== 'all' && log.type !== filter) {
        return false;
      }
      
      // 来源过滤
      if (sourceFilter && log.details?.source) {
        return log.details.source.includes(sourceFilter);
      }
      
      return true;
    });
  }, [logs, filter, sourceFilter]);
  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };
  
  // 格式化调用栈
  const formatStack = (stack: string) => {
    if (!stack) return '';
    
    // 移除第一行（Error对象本身）
    const lines = stack.split('\n').slice(1);
    
    // 格式化每一行
    return lines.map(line => {
      // 提取函数名和位置
      const match = line.match(/at\s+([^\s]+)\s+\(([^)]+)\)/);
      if (match) {
        const [_, funcName, location] = match;
        // 简化位置信息，只保留文件名和行号
        const simplifiedLocation = location.split('/').pop();
        return `${funcName} (${simplifiedLocation})`;
      }
      return line.trim();
    }).join('\n');
  };
  
  // 渲染单个日志项
  const renderLogItem = (log: LogEntry) => {
    // 根据日志类型设置样式
    const typeStyles = {
      debug: 'bg-gray-50 border-gray-200',
      info: 'bg-blue-50 border-blue-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200'
    };
    
    // 获取节点变化信息
    const previousNodeId = log.details?.previousNodeId || 'null';
    const newNodeId = log.details?.newNodeId || 'null';
    const source = log.details?.source || '';
    const contextId = log.details?.contextId || '';
    
    return (
      <div 
        key={log.id} 
        className={`p-2 mb-1 border rounded ${typeStyles[log.type]}`}
      >
        <div className="flex justify-between items-start">
          <div className="font-mono text-xs text-gray-500">{formatTime(log.timestamp)}</div>
          <div className="ml-2 flex-1">{log.message}</div>
        </div>
        
        {/* 来源和上下文信息 */}
        <div className="mt-1 text-xs text-gray-600">
          <span className="font-semibold">来源:</span> {source}, 
          <span className="font-semibold ml-2">上下文:</span> {contextId}
        </div>
        
        {/* 节点变化信息 */}
        {log.details?.previousNodeId && (
          <div className="mt-1 text-xs">
            <span className="font-semibold">节点变化:</span> 
            <span className="font-mono">{previousNodeId}</span> → 
            <span className="font-mono">{newNodeId}</span>
          </div>
        )}
        
        {/* 详细信息（调用栈等） */}
        {showDetails && log.details?.stack && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap">
            {formatStack(log.details.stack)}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="border rounded shadow-sm bg-white">
      {/* 标题栏 */}
      <div 
        className="p-2 bg-gray-100 border-b flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-medium flex items-center">
          <span className="mr-2">
            {expanded ? '▼' : '►'}
          </span>
          活动节点变化日志
          <span className="ml-2 text-xs bg-gray-200 px-1 rounded">
            {filteredLogs.length}
          </span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
          >
            {showDetails ? '隐藏详情' : '显示详情'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
          >
            清空日志
          </button>
        </div>
      </div>
      
      {/* 日志内容 */}
      {expanded && (
        <div>
          {/* 过滤器 */}
          <div className="p-2 border-b bg-gray-50 flex flex-wrap gap-2">
            <div>
              <label className="text-xs mr-1">类型:</label>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs border rounded p-1"
              >
                <option value="all">全部</option>
                <option value="debug">调试</option>
                <option value="info">信息</option>
                <option value="warning">警告</option>
                <option value="error">错误</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs mr-1">来源:</label>
              <select 
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-xs border rounded p-1"
              >
                <option value="">全部</option>
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 日志列表 */}
          <div className="p-2 max-h-60 overflow-y-auto">
            {filteredLogs.length > 0 ? (
              filteredLogs.map(renderLogItem).reverse()
            ) : (
              <div className="text-center text-gray-500 py-4">
                没有符合条件的日志
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogPanel;
