// frontend-refactored/src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/authContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/sessions" className="text-xl font-bold">SynCraft</Link>
        
        {user && (
          <div className="relative">
            <button
              className="flex items-center space-x-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span>{user.username}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded shadow-lg z-10">
                <div className="py-1">
                  <Link
                    to="/change-password"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    修改密码
                  </Link>
                  
                  {user.role === 'admin' && (
                    <Link
                      to="/admin/users"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      用户管理
                    </Link>
                  )}
                  
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={handleLogout}
                  >
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
