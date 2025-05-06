// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'          // ⬅️ 这一行一定要有！

// 导入清理数据脚本，但只在开发环境和URL包含clearData=true时激活
// 在生产环境中，这个功能将被禁用
import { clearAllData } from './clearData'

// 检查是否需要清理数据（仅在开发环境中）
if (process.env.NODE_ENV === 'development' && window.location.search.includes('clearData=true')) {
  clearAllData().then(success => {
    if (success) {
      alert('数据已清理，请刷新页面');
      // 清理URL参数
      const url = new URL(window.location.href);
      url.searchParams.delete('clearData');
      window.history.replaceState({}, document.title, url.toString());
    } else {
      alert('清理数据失败，请查看控制台');
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
