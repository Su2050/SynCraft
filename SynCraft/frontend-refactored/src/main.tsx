import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster, toast } from 'react-hot-toast';
import App from './App';
import './index.css';
import { checkBackendConnection } from './utils/backendHealth';

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    },
  },
});

// 在应用启动时检查后端连接状态
console.log(`[${new Date().toISOString()}] 应用启动，开始检查后端连接状态`);

// 先渲染应用，然后异步检查后端连接状态
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// 异步检查后端连接状态
checkBackendConnection()
  .then(isConnected => {
    console.log(`[${new Date().toISOString()}] 后端连接状态: ${isConnected ? '正常' : '异常'}`);
    if (!isConnected) {
      // 显示提示
      toast.error('无法连接到后端服务，已切换到本地模式', {
        duration: 5000,
        position: 'top-right',
      });
    }
  })
  .catch(error => {
    console.error(`[${new Date().toISOString()}] 检查后端连接失败:`, error);
    // 显示提示
    toast.error('检查后端连接失败，已切换到本地模式', {
      duration: 5000,
      position: 'top-right',
    });
  });
