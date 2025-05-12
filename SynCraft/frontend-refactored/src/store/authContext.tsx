// frontend-refactored/src/store/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LoginRequest, ChangePasswordRequest } from '@/types/auth';
import { api } from '@/api';
import { useQueryClient } from '@tanstack/react-query';

// 认证上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (data: LoginRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 检查是否已认证
  const isAuthenticated = !!token && !!user;
  
  // 初始化时从本地存储加载认证状态
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // 获取当前用户信息
      api.auth.getCurrentUser()
        .then(response => {
          setUser(response);
          setLoading(false);
          
          // 清除会话缓存，确保获取当前用户的会话
          queryClient.invalidateQueries(['sessions']);
          console.log('[AuthContext] 初始化时已清除会话缓存，确保获取当前用户的会话');
          
          // 如果是首次登录，重定向到修改密码页面
          if (response.is_first_login) {
            navigate('/change-password');
          }
        })
        .catch(err => {
          console.error('获取用户信息失败:', err);
          // 如果获取用户信息失败，清除token
          localStorage.removeItem('token');
          setToken(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [navigate, queryClient]);
  
  // 登录
  const login = async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.auth.login(data);
      
      // 保存token到本地存储
      localStorage.setItem('token', response.access_token);
      setToken(response.access_token);
      
      // 获取用户信息
      const userInfo = await api.auth.getCurrentUser();
      setUser(userInfo);
      
      // 清除会话缓存，确保获取当前用户的会话
      queryClient.invalidateQueries(['sessions']);
      console.log('[AuthContext] 已清除会话缓存，确保获取当前用户的会话');
      
      // 如果是首次登录，重定向到修改密码页面
      if (userInfo.is_first_login) {
        navigate('/change-password');
      } else {
        // 否则跳转到会话列表页
        navigate('/sessions');
      }
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };
  
  // 修改密码
  const changePassword = async (data: ChangePasswordRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.auth.changePassword(data);
      
      // 更新用户信息
      const userInfo = await api.auth.getCurrentUser();
      setUser(userInfo);
      
      // 清除会话缓存，确保获取当前用户的会话
      queryClient.invalidateQueries(['sessions']);
      console.log('[AuthContext] 修改密码后已清除会话缓存，确保获取当前用户的会话');
      
      // 显示成功消息
      alert('密码修改成功！即将跳转到会话列表页面。');
      
      // 延迟跳转，给用户一些时间看到成功消息
      setTimeout(() => {
        // 跳转到会话列表页
        navigate('/sessions');
      }, 1500);
    } catch (err: any) {
      console.error('修改密码失败:', err);
      setError(err.message || '修改密码失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  // 登出
  const logout = () => {
    // 清除本地存储的token
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    
    // 清除会话缓存
    queryClient.invalidateQueries(['sessions']);
    console.log('[AuthContext] 登出时已清除会话缓存');
    
    // 跳转到登录页
    navigate('/login');
  };
  
  // 提供上下文值
  const value = {
    isAuthenticated,
    user,
    login,
    changePassword,
    logout,
    loading,
    error
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 认证上下文Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
