// frontend-refactored/src/pages/admin/UserManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/store/authContext';
import { api } from '@/api';
import { User } from '@/types/auth';

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  
  // 加载用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.admin.getUsers();
        setUsers(response.items);
      } catch (err: any) {
        console.error('获取用户列表失败:', err);
        setError('获取用户列表失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // 创建用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername) return;
    
    try {
      setLoading(true);
      const response = await api.admin.createUser({
        username: newUsername,
        role: newUserRole
      });
      
      // 更新用户列表
      setUsers([...users, response]);
      
      // 清空表单
      setNewUsername('');
      setNewUserRole('user');
      
      // 显示初始密码
      alert(`用户创建成功！初始密码: ${response.initial_password}`);
    } catch (err: any) {
      console.error('创建用户失败:', err);
      setError('创建用户失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 重置用户密码
  const handleResetPassword = async (userId: string) => {
    if (!confirm('确定要重置该用户的密码吗？')) return;
    
    try {
      setLoading(true);
      const response = await api.admin.resetUserPassword(userId);
      
      // 显示新密码
      alert(`密码重置成功！新密码: ${response.new_password}`);
    } catch (err: any) {
      console.error('重置密码失败:', err);
      setError('重置密码失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可撤销！')) return;
    
    try {
      setLoading(true);
      await api.admin.deleteUser(userId);
      
      // 更新用户列表
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      console.error('删除用户失败:', err);
      setError('删除用户失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 如果不是管理员，显示无权限信息
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded">
          <h2 className="text-xl font-bold text-red-700">无权访问</h2>
          <p>您没有管理员权限，无法访问此页面。</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* 创建用户表单 */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">创建新用户</h2>
        <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">角色</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            创建用户
          </button>
        </form>
      </div>
      
      {/* 用户列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">用户列表</h2>
        
        {loading ? (
          <div className="text-center py-4">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">用户名</th>
                  <th className="py-2 px-4 border-b">角色</th>
                  <th className="py-2 px-4 border-b">状态</th>
                  <th className="py-2 px-4 border-b">创建时间</th>
                  <th className="py-2 px-4 border-b">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="py-2 px-4 border-b">{user.username}</td>
                    <td className="py-2 px-4 border-b">{user.role}</td>
                    <td className="py-2 px-4 border-b">{user.status}</td>
                    <td className="py-2 px-4 border-b">{new Date(user.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded text-sm"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
