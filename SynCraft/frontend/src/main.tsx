// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'          // ⬅️ 这一行一定要有！

// 导入idb-keyval的clear函数，用于清理数据
// 只在开发环境和URL包含clearData=true时激活
// 在生产环境中，这个功能将被禁用
import { clear } from 'idb-keyval';

// 强制清除localStorage中的会话ID和节点ID
// 这是为了解决前端仍然使用旧的会话ID的问题
localStorage.removeItem('activeSessionId');
localStorage.removeItem('activeNodeId');
console.log('已清除localStorage中的会话ID和节点ID');

// 强制清除IndexedDB中的数据
// 这是为了解决前端仍然保留旧的IndexedDB数据的问题
clear().then(() => {
  console.log('已强制清除IndexedDB中的所有数据');
}).catch(error => {
  console.error('清除IndexedDB数据失败:', error);
});

// 强制清理数据（开发环境）
if (process.env.NODE_ENV === 'development') {
  // 检查是否需要清理数据
  const forceClear = window.location.search.includes('clearData=true');
  
  // 如果URL包含clearData=true参数或者是新的数据库配置，强制清理
  if (forceClear) {
    clear().then(() => {
      console.log('数据已清理，将刷新页面');
      
      // 清除localStorage中的会话ID和节点ID
      localStorage.removeItem('activeSessionId');
      localStorage.removeItem('activeNodeId');
      console.log('已清除localStorage中的会话ID和节点ID');
      
      alert('数据已清理，将刷新页面');
      // 清理URL参数
      const url = new URL(window.location.href);
      url.searchParams.delete('clearData');
      window.location.href = url.toString(); // 使用location.href强制刷新
    }).catch(error => {
      console.error('清理数据失败:', error);
      alert('清理数据失败，请查看控制台');
    });
  } else {
    // 检查是否有会话数据，如果有，提示用户清理
    import('idb-keyval').then(({ get }) => {
      get('sessions').then((sessions) => {
        if (sessions && Array.isArray(sessions) && sessions.length > 0) {
          console.log('检测到旧的会话数据，建议清理数据');
          const shouldClear = confirm('检测到旧的会话数据，可能会导致错误。是否清理数据？');
          if (shouldClear) {
            clear().then(() => {
              console.log('数据已清理，将刷新页面');
              
              // 清除localStorage中的会话ID和节点ID
              localStorage.removeItem('activeSessionId');
              localStorage.removeItem('activeNodeId');
              console.log('已清除localStorage中的会话ID和节点ID');
              
              window.location.reload();
            }).catch(error => {
              console.error('清理数据失败:', error);
            });
          }
        }
      });
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
