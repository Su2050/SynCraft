import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SessionProvider } from '@store/sessionContext';

// 懒加载页面组件
const SessionList = lazy(() => import('@pages/SessionList'));
const ChatPage = lazy(() => import('@pages/ChatPage'));
const NotFound = lazy(() => import('@pages/NotFound'));

// 加载中组件
const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="text-xl">加载中...</div>
  </div>
);

function App() {
  return (
    <SessionProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<SessionList />} />
          <Route path="/sessions/:id" element={<ChatPage />} />
          <Route path="/sessions/:id/nodes/:nodeId" element={<ChatPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </SessionProvider>
  );
}

export default App;
