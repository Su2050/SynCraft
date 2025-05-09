// frontend/src/App.tsx
import { useEffect, useState } from 'react';
// @ts-ignore
import SplitPane from 'react-split-pane';
import TreeChat from './components/TreeChat';
import ChatPanel from './components/ChatPanel';
import TabPanel from './components/TabPanel'; // 新增Tab面板
import LogPanel from './components/LogPanel'; // 新增日志面板
import { useMsgStore } from './store/messageStore';
import { useTreeStore } from './store/treeStore';
import { useSessionStore } from './store/sessionStore';
import { clear } from 'idb-keyval';

// 拖拽条样式
import './splitpane.css';

// 创建一个自定义hook来管理TreePanel的可见性
const useTreePanelVisibility = () => {
  const [isTreePanelVisible, setTreePanelVisible] = useState(true);
  
  const toggleTreePanel = () => {
    setTreePanelVisible(!isTreePanelVisible);
  };
  
  return { isTreePanelVisible, toggleTreePanel };
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isTreePanelVisible, toggleTreePanel } = useTreePanelVisibility();

  // 初始化应用，加载会话数据
  useEffect(() => {
    // 清除localStorage中的会话ID和节点ID
    localStorage.removeItem('activeSessionId');
    localStorage.removeItem('activeNodeId');
    console.log('已清除localStorage中的会话ID和节点ID');
    
    // 从服务器获取会话列表
    useSessionStore.getState().load()
      .then(() => {
        console.log('已从服务器获取会话列表');
        setIsLoading(false);
      })
      .catch(error => {
        console.error('获取会话列表失败:', error);
        setIsLoading(false);
      });
  }, []);
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  // 清除所有数据并重新加载
  const clearAllData = async () => {
    if (confirm('确定要清除所有数据并重新加载吗？这将删除所有节点和消息。')) {
      try {
        await clear();
        alert('数据已清除，页面将重新加载');
        window.location.reload();
      } catch (error) {
        console.error('清除数据时出错:', error);
        alert('清除数据时出错');
      }
    }
  };
  
  // 只清除除根节点外的所有节点
  const clearAllExceptRoot = async () => {
    if (confirm('确定要清空除根节点外的所有节点吗？')) {
      try {
        await useTreeStore.getState().clearAllExceptRoot();
        alert('已清空除根节点外的所有节点');
      } catch (error) {
        console.error('清空节点时出错:', error);
        alert('清空节点时出错');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 顶部工具栏 - 添加更明显的样式 */}
      <div className="bg-gray-800 p-4 flex justify-between" style={{ zIndex: 9999 }}>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleTreePanel}
            className="bg-blue-500 text-white px-4 py-2 rounded text-lg font-bold hover:bg-blue-600"
            style={{ border: '2px solid white' }}
          >
            {isTreePanelVisible ? '隐藏树面板' : '显示树面板'}
          </button>
          <button 
            onClick={clearAllExceptRoot}
            className="bg-yellow-500 text-white px-4 py-2 rounded text-lg font-bold hover:bg-yellow-600"
            style={{ border: '2px solid white' }}
          >
            清空节点
          </button>
        </div>
        <button 
          onClick={clearAllData}
          className="bg-red-500 text-white px-4 py-2 rounded text-lg font-bold hover:bg-red-600"
          style={{ border: '2px solid white' }}
        >
          重置数据
        </button>
      </div>
      
      {/* 日志面板 */}
      <div className="px-4 py-2">
        <LogPanel />
      </div>
      
      {/* 主内容区域 - 使用SplitPane实现可调节宽度 */}
      <div className="flex-1 overflow-hidden">
        {/* @ts-ignore */}
        <SplitPane 
          split="vertical" 
          minSize={isTreePanelVisible ? 300 : 0} 
          defaultSize={isTreePanelVisible ? "25%" : 0}
          primary="first"
          pane1Style={{ display: isTreePanelVisible ? 'block' : 'none' }}
        >
          {/* 左栏：TreePanel */}
          <div className="h-full overflow-hidden">
            <TreeChat />
          </div>
          
          {/* @ts-ignore */}
          <SplitPane 
            split="vertical" 
            minSize={300} 
            defaultSize="50%"
          >
            {/* 中栏：ChatPanel */}
            <div className="h-full overflow-hidden">
              <ChatPanel />
            </div>
            
            {/* 右栏：TabPanel */}
            <div className="h-full overflow-hidden">
              <TabPanel />
            </div>
          </SplitPane>
        </SplitPane>
      </div>
    </div>
  );
}
