import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404页面
 */
export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">页面不存在</p>
      <Link to="/" className="btn btn-primary">
        返回首页
      </Link>
    </div>
  );
}
