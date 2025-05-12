// frontend-refactored/src/api/auth.ts
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  ChangePasswordRequest, 
  ChangePasswordResponse,
  CreateUserRequest,
  CreateUserResponse,
  ResetPasswordResponse,
  UserListResponse
} from '@/types/auth';
import { request } from './utils';

// 认证相关API
export const authApi = {
  // 登录
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // 使用表单数据格式发送请求
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('grant_type', 'password');

    // 使用完整的后端URL
    const backendUrl = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
    const url = `${backendUrl}/api/v1/token`;
    
    console.log(`[${new Date().toISOString()}] 发送登录请求: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `登录失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 保存令牌到本地存储
      localStorage.setItem('token', data.access_token);
      
      return data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<User>('/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 修改密码
  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<ChangePasswordResponse>('/users/me/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
  },

  // 登出
  logout: () => {
    localStorage.removeItem('token');
  }
};

// 管理员相关API
export const adminApi = {
  // 获取用户列表
  getUsers: async (skip: number = 0, limit: number = 100): Promise<UserListResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<UserListResponse>(`/admin/users?skip=${skip}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 创建用户
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<CreateUserResponse>('/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
  },

  // 更新用户
  updateUser: async (userId: string, data: { role?: string, status?: string }): Promise<User> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
  },

  // 删除用户
  deleteUser: async (userId: string): Promise<{ success: boolean, message: string }> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<{ success: boolean, message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 重置用户密码
  resetUserPassword: async (userId: string): Promise<ResetPasswordResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    return request<ResetPasswordResponse>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};
