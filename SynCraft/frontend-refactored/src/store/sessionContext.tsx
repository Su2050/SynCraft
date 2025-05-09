import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/types';
import { api } from '@/api';
import db from '@/utils/db';
import toast from 'react-hot-toast'; // 导入toast组件，如果项目中没有，需要安装

// 会话上下文类型
interface SessionContextType {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  activeSessionId: string | null;
  rootNodeId: string | null;
  mainContextId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createSession: (name: string) => Promise<Session>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  activeSession: Session | undefined;
}

// 创建会话上下文
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// 会话提供者组件
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [mainContextId, setMainContextId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // 获取所有会话
  const { 
    data: sessions = [], 
    isLoading, 
    error 
  } = useQuery<Session[], Error>(
    ['sessions'],
    async () => {
      try {
        // 尝试从API获取会话
        const response = await api.session.getAll();
        return response;
      } catch (apiError) {
        console.error('从API获取会话失败，回退到本地数据库:', apiError);
        
        try {
          // 从本地数据库获取会话
          const localSessions = await db.sessions.toArray();
          return localSessions;
        } catch (dbError) {
          console.error('从本地数据库获取会话失败:', dbError);
          // 返回空数组作为默认值
          return [];
        }
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
      onSuccess: (data) => {
        // 如果没有活动会话但有会话数据，设置第一个会话为活动会话
        if (!activeSessionId && data.length > 0) {
          setActiveSessionId(data[0].id);
        }
      }
    }
  );
  
  // 创建会话
  const createSessionMutation = useMutation(
    async (name: string) => {
      try {
        // 尝试通过API创建会话，后端会自动创建根节点和主聊天上下文
        console.log(`[${new Date().toISOString()}] 开始创建会话: ${name}`);
        const response = await api.session.create({ name });
        const session = response;
        console.log(`[${new Date().toISOString()}] 会话创建成功:`, session);

        // 保存根节点ID和主聊天上下文ID
        setRootNodeId(session.root_node_id);
        if (session.main_context) {
          setMainContextId(session.main_context.id);
        }

        // 等待一段时间，确保后端数据库已更新
        console.log(`[${new Date().toISOString()}] 等待后端数据库更新...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 再次获取会话详情，确保数据已更新
        try {
          console.log(`[${new Date().toISOString()}] 再次获取会话详情，确保数据已更新`);
          const refreshedSession = await api.session.getById(session.id);
          console.log(`[${new Date().toISOString()}] 刷新会话详情成功:`, refreshedSession);
          
          // 如果获取成功，使用刷新后的会话数据
          if (refreshedSession && refreshedSession.data) {
            return refreshedSession.data;
          }
        } catch (refreshError) {
          console.error(`[${new Date().toISOString()}] 刷新会话详情失败:`, refreshError);
          // 如果刷新失败，仍然使用原始会话数据
        }

        return session;
      } catch (apiError) {
        console.error('通过API创建会话失败:', apiError);
        toast.error('通过API创建会话失败，请检查后端服务是否正常运行');
        // 直接抛出错误，不再 fallback 到本地
        throw apiError;
      }
    },
    {
      onSuccess: (newSession) => {
        // 更新缓存
        queryClient.setQueryData<Session[]>(['sessions'], (old = []) => [...old, newSession]);
        
        // 设置新会话为活动会话
        setActiveSessionId(newSession.id);
        
        // 导航到新会话
        navigate(`/sessions/${newSession.id}`);
      }
    }
  );
  
  // 重命名会话
  const renameSessionMutation = useMutation(
    async ({ id, name }: { id: string; name: string }) => {
      try {
        // 尝试通过API更新会话
        await api.session.update(id, { name });
      } catch (apiError) {
        console.error('通过API更新会话失败，回退到本地更新:', apiError);
        
        // 显示错误提示
        toast.error('通过API更新会话失败，已回退到本地更新');
        
        try {
          // 在本地更新会话
          await db.sessions.update(id, { 
            name, 
            updated_at: new Date().toISOString() 
          });
        } catch (dbError) {
          console.error('在本地更新会话失败:', dbError);
          
          // 显示错误提示
          toast.error('在本地更新会话失败');
          // 不做任何操作，让UI层通过缓存更新
        }
      }
    },
    {
      onSuccess: (_, variables) => {
        // 更新缓存
        queryClient.setQueryData<Session[]>(['sessions'], (old = []) => 
          old.map(session => 
            session.id === variables.id 
              ? { ...session, name: variables.name, updated_at: new Date().toISOString() } 
              : session
          )
        );
      }
    }
  );
  
  // 删除会话
  const deleteSessionMutation = useMutation(
    async (id: string) => {
      try {
        // 尝试通过API删除会话
        await api.session.delete(id);
      } catch (apiError) {
        console.error('通过API删除会话失败，回退到本地删除:', apiError);
        
        // 显示错误提示
        toast.error('通过API删除会话失败，已回退到本地删除');
        
        try {
          // 在本地删除会话
          await db.sessions.delete(id);
          
          // 删除相关的消息和节点
          await db.messages.where('session_id').equals(id).delete();
          await db.nodes.where('session_id').equals(id).delete();
        } catch (dbError) {
          console.error('在本地删除会话失败:', dbError);
          
          // 显示错误提示
          toast.error('在本地删除会话失败');
          // 不做任何操作，让UI层通过缓存更新
        }
      }
    },
    {
      onSuccess: (_, id) => {
        // 更新缓存
        queryClient.setQueryData<Session[]>(['sessions'], (old = []) => 
          old.filter(session => session.id !== id)
        );
        
        // 如果删除的是当前活动会话，设置新的活动会话
        if (activeSessionId === id) {
          const remainingSessions = sessions.filter(session => session.id !== id);
          if (remainingSessions.length > 0) {
            setActiveSessionId(remainingSessions[0].id);
            navigate(`/sessions/${remainingSessions[0].id}`);
          } else {
            setActiveSessionId(null);
            navigate('/sessions');
          }
        }
      }
    }
  );
  
  // 获取当前活动会话
  const activeSession = sessions.find(session => session.id === activeSessionId);
  
  // 当活动会话变化时，更新rootNodeId和mainContextId
  useEffect(() => {
    if (activeSession) {
      console.log(`[${new Date().toISOString()}] 活动会话变化，更新rootNodeId:`, activeSession.root_node_id);
      setRootNodeId(activeSession.root_node_id);
      if (activeSession.main_context) {
        setMainContextId(activeSession.main_context.id);
      }
    } else {
      // 如果没有活动会话，清空rootNodeId和mainContextId
      setRootNodeId(null);
      setMainContextId(null);
    }
  }, [activeSession]);
  
  // 提供上下文值
  const value = {
    sessions,
    isLoading,
    error,
    activeSessionId,
    rootNodeId,
    mainContextId,
    setActiveSessionId,
    createSession: (name: string) => createSessionMutation.mutateAsync(name),
    renameSession: (id: string, name: string) => renameSessionMutation.mutateAsync({ id, name }),
    deleteSession: (id: string) => deleteSessionMutation.mutateAsync(id),
    activeSession
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// 会话上下文Hook
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
