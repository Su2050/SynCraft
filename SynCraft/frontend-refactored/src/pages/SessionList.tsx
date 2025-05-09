import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/sessionContext';

/**
 * 会话列表页面
 */
export default function SessionList() {
  const { 
    sessions, 
    isLoading, 
    error, 
    createSession, 
    renameSession, 
    deleteSession 
  } = useSession();
  const navigate = useNavigate();
  
  // 状态
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // 处理创建会话
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    
    try {
      const newSession = await createSession(newSessionName);
      setNewSessionName('');
      setIsCreating(false);
      navigate(`/sessions/${newSession.id}`);
    } catch (error) {
      console.error('创建会话失败:', error);
    }
  };
  
  // 处理重命名会话
  const handleRenameSession = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editingName.trim()) return;
    
    try {
      await renameSession(id, editingName);
      setEditingSessionId(null);
      setEditingName('');
    } catch (error) {
      console.error('重命名会话失败:', error);
    }
  };
  
  // 处理删除会话
  const handleDeleteSession = async (id: string) => {
    if (!confirm('确定要删除这个会话吗？')) return;
    
    try {
      await deleteSession(id);
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  };
  
  // 处理点击会话
  const handleSessionClick = (id: string) => {
    navigate(`/sessions/${id}`);
  };
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }
  
  // 显示错误信息
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">加载失败: {error.message}</div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">会话列表</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setIsCreating(true)}
        >
          新建会话
        </button>
      </div>
      
      {/* 创建会话表单 */}
      {isCreating && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">新建会话</h2>
          <form onSubmit={handleCreateSession} className="flex gap-2">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="会话名称"
              className="input flex-1"
              autoFocus
            />
            <button type="submit" className="btn btn-primary">创建</button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setIsCreating(false);
                setNewSessionName('');
              }}
            >
              取消
            </button>
          </form>
        </div>
      )}
      
      {/* 会话列表 */}
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>没有会话</p>
          <p className="mt-2">点击"新建会话"按钮创建一个新的会话</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              {editingSessionId === session.id ? (
                <form onSubmit={(e) => handleRenameSession(e, session.id)} className="flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="input flex-1"
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary">保存</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingSessionId(null);
                      setEditingName('');
                    }}
                  >
                    取消
                  </button>
                </form>
              ) : (
                <>
                  <div 
                    className="mb-2 font-semibold"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    {session.name}
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    创建于 {new Date(session.createdAt).toLocaleString()}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      className="btn btn-secondary text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(session.id);
                        setEditingName(session.name);
                      }}
                    >
                      重命名
                    </button>
                    <button 
                      className="btn btn-danger text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
