// frontend-refactored/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }
  
  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 如果已认证，显示子组件
  return <>{children}</>;
}
