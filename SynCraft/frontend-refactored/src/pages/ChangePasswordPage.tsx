// frontend-refactored/src/pages/ChangePasswordPage.tsx
import React, { useState } from 'react';
import { useAuth } from '@/store/authContext';

export default function ChangePasswordPage() {
  const { changePassword, loading, error, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('所有字段都是必填的');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('新密码长度至少为8个字符');
      return;
    }
    
    setPasswordError('');
    
    // 提交修改密码请求
    await changePassword({
      current_password: currentPassword,
      new_password: newPassword
    });
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {user?.is_first_login ? '首次登录，请修改密码' : '修改密码'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {passwordError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {passwordError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="currentPassword">
              当前密码
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="请输入当前密码"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="newPassword">
              新密码
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="请输入新密码"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
              确认新密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="请再次输入新密码"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? '提交中...' : '修改密码'}
          </button>
        </form>
      </div>
    </div>
  );
}
