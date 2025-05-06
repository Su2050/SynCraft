import React, { useState } from 'react';
import { useSideTabStore, SideTab } from '../store/tabStore';
import { useTreeStore } from '../store/treeStore';
import { useContextStore, ContextMode } from '../store/contextStore';
import DeepDiveTab from './DeepDiveTab';



const TabPanel = () => {
  const { sideTabs, activeTabId, closeSideTab } = useSideTabStore();
  const { createContextId } = useContextStore();
  
  if (sideTabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        点击消息中的"深挖一下"开始深度探索
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Tab标题栏 */}
      <div className="flex border-b overflow-x-auto">
        {sideTabs.map(tab => (
          <div 
            key={tab.nodeId}
            className={`px-3 py-2 cursor-pointer flex items-center ${
              tab.nodeId === activeTabId ? 'bg-blue-100 border-b-2 border-blue-500' : ''
            }`}
            onClick={() => {
              // 创建深挖上下文ID
              const deepDiveContextId = createContextId('deepdive', tab.nodeId);
              console.log(`[${new Date().toISOString()}] TabPanel - 打开标签页 - 节点ID: ${tab.nodeId}, 上下文ID: ${deepDiveContextId}`);
              
              // 打开标签页
              useSideTabStore.getState().openSideTab(tab.nodeId, tab.range);
            }}
          >
            <span className="truncate max-w-[100px]">
              {getTabTitle(tab)}
            </span>
            <button 
              className="ml-2 text-gray-500 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                closeSideTab(tab.nodeId);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Tab内容 */}
      <div className="flex-1 overflow-auto">
        {sideTabs.map(tab => (
          <div 
            key={tab.nodeId}
            className={`h-full ${tab.nodeId === activeTabId ? '' : 'hidden'}`}
          >
            <DeepDiveTab nodeId={tab.nodeId} selectedRange={tab.range} />
          </div>
        ))}
      </div>
      
    </div>
  );
};

// 获取Tab标题
const getTabTitle = (tab: SideTab) => {
  const { nodes } = useTreeStore.getState();
  const node = nodes.find(n => n.id === tab.nodeId);
  return node?.data?.label || `Tab ${tab.nodeId.slice(0, 4)}`;
};

export default TabPanel;
