import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SessionProvider } from '@store/sessionContext';
import { AuthProvider } from '@store/authContext';
import ProtectedRoute from '@components/ProtectedRoute';
import Navbar from '@components/Navbar';
import PasswordLayout from '@components/PasswordLayout';

// 懒加载页面组件
const SessionList = lazy(() => import('@pages/SessionList'));
const ChatPage = lazy(() => import('@pages/ChatPage'));
const NotFound = lazy(() => import('@pages/NotFound'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('@pages/ChangePasswordPage'));
const UserManagementPage = lazy(() => import('@pages/admin/UserManagementPage'));

// 加载中组件
const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="text-xl">加载中...</div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* 公共路由 */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* 受保护路由 */}
            <Route path="/change-password" element={
              <ProtectedRoute>
                <PasswordLayout>
                  <ChangePasswordPage />
                </PasswordLayout>
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <SessionList />
                </>
              </ProtectedRoute>
            } />
            <Route path="/sessions/:id" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ChatPage />
                </>
              </ProtectedRoute>
            } />
            <Route path="/sessions/:id/nodes/:nodeId" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ChatPage />
                </>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <UserManagementPage />
                </>
              </ProtectedRoute>
            } />
            
            {/* 默认重定向 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
