# SynCraft 前端重构项目

## 项目概述

SynCraft是一个基于React和TypeScript的前端项目，用于与SynCraft后端API进行交互。该项目使用了React Query、React Router等现代前端技术，实现了会话管理、消息交互、深挖分析等功能。

## 功能缺陷和整改建议

### 1. API请求格式不匹配

#### 问题描述

前端和后端之间的API响应格式不匹配，导致前端无法正确处理后端返回的数据。

#### 解决方案

已修改`api/index.ts`文件中的请求处理函数，使其能够正确处理后端返回的数据格式。具体修改如下：

1. 修改`request`函数，使其能够处理后端返回的原始数据格式
2. 修改`sessionApi.getAll`方法，使其能够处理后端返回的`SessionListResponse`格式
3. 修改`sessionApi.create`方法，使其能够处理后端返回的`SessionResponse`格式

### 2. 消息API接口不存在

#### 问题描述

前端的`messageApi.getBySession`方法请求的是`/sessions/${sessionId}/messages`，但是后端没有这个API接口。这导致在创建会话后，前端尝试获取消息时会收到404错误。

通过分析后端API规范文档和代码，我们确认后端没有提供`/sessions/${sessionId}/messages`这个API接口。相反，后端提供了通过节点ID获取QA对的API接口：`/nodes/{node_id}/qa_pairs`。

#### 解决方案

需要修改前端的消息API请求，使其与后端的API接口匹配。有两种可能的解决方案：

1. 修改前端，使用节点ID来获取消息，而不是会话ID
   ```typescript
   // 修改前
   getBySession: (sessionId: string, params?: { page?: number; pageSize?: number }) => {
     const queryParams = params
       ? `?page=${params.page || 1}&pageSize=${params.pageSize || 50}`
       : '';
     return request<ApiResponse<PaginatedResponse<Message>>>(`/sessions/${sessionId}/messages${queryParams}`);
   }
   
   // 修改后
   getBySession: async (sessionId: string) => {
     // 首先获取会话详情，获取根节点ID
     const session = await sessionApi.getById(sessionId);
     const rootNodeId = session.root_node_id;
     
     // 使用根节点ID获取QA对
     const response = await nodeApi.getQAPairs(rootNodeId);
     
     // 将QA对转换为消息格式
     const messages = [];
     for (const qa of response.items) {
       // 添加用户消息
       messages.push({
         id: `user-${qa.id}`,
         qa_pair_id: qa.id,
         session_id: sessionId,
         role: 'user',
         content: qa.question,
         timestamp: qa.created_at
       });
       
       // 添加助手消息
       if (qa.answer) {
         messages.push({
           id: `assistant-${qa.id}`,
           qa_pair_id: qa.id,
           session_id: sessionId,
           role: 'assistant',
           content: qa.answer,
           timestamp: qa.updated_at
         });
       }
     }
     
     return {
       data: {
         items: messages,
         total: messages.length
       }
     };
   }
   ```

2. 在后端添加`/sessions/${sessionId}/messages`接口，将会话ID转换为节点ID，然后调用现有的API

### 3. 会话创建后的消息加载

#### 问题描述

在创建会话后，前端会自动导航到会话页面，但是由于消息API接口不存在，导致无法加载消息。

#### 解决方案

1. 修改前端的消息加载逻辑，使用正确的API接口
2. 在会话创建成功后，获取会话的根节点ID，然后使用根节点ID来获取消息
3. 修改`useMessages`钩子，使其能够处理根节点ID的变化：

```typescript
// 在useMessages.ts中
useEffect(() => {
  if (rootNodeId) {
    // 当根节点ID变化时，重新获取消息
    refetch();
  }
}, [rootNodeId, refetch]);
```

### 4. 类型定义不完整

#### 问题描述

前端的`Session`类型定义中缺少`main_context`字段，导致在访问`session.main_context`时出现TypeScript错误。

#### 解决方案

已修改`types/index.ts`文件，添加`main_context`字段：

```typescript
export interface Session {
  id: string;
  name: string;
  root_node_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  main_context?: Context; // 主聊天上下文，可选
}
```

### 5. 错误处理不完善

#### 问题描述

在API请求失败时，前端的错误处理不够完善，导致用户体验不佳。

#### 解决方案

1. 添加更详细的错误信息，包括错误码和错误描述
2. 使用toast组件显示错误信息，提高用户体验
3. 添加重试机制，在API请求失败时自动重试

```typescript
// 在api/index.ts中
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 检查响应是否是ApiResponse格式
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data as T;
      }
      
      // 如果不是ApiResponse格式，直接返回数据
      return data as T;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('请求失败，已达到最大重试次数');
}
```

### 6. 深挖功能实现不完整

#### 问题描述

深挖功能的实现不完整，在选择文本进行深挖时，前端会尝试调用`api.node.createDeepDive`方法，但是这个方法的实现不完整。

#### 解决方案

1. 完善`api.node.createDeepDive`方法的实现
2. 添加错误处理和回退机制
3. 优化用户体验，添加加载状态和错误提示

```typescript
// 在api/index.ts中
createDeepDive: async (nodeId: string, data: { session_id: string; source?: string }) => {
  try {
    // 尝试通过API创建深挖上下文
    const response = await request<ApiResponse<Context>>(`/nodes/${nodeId}/deepdive`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    return response;
  } catch (error) {
    console.error('创建深挖上下文失败:', error);
    
    // 显示错误提示
    toast.error('创建深挖上下文失败，已回退到本地创建');
    
    // 回退到本地创建
    const context = {
      id: `local-${Date.now()}`,
      context_id: `context-${Date.now()}`,
      mode: 'deepdive',
      session_id: data.session_id,
      context_root_node_id: nodeId,
      active_node_id: nodeId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: data.source
    };
    
    return {
      data: context
    };
  }
}
```

## 用例测试

### 创建会话

1. 点击"新建会话"按钮
2. 输入会话名称
3. 点击"创建"按钮
4. 会话创建成功，但是由于消息API接口不存在，导致无法加载消息

**问题**：会话创建成功后，前端尝试获取消息，但是由于消息API接口不存在，导致404错误。

**解决方案**：修改前端的消息API请求，使其与后端的API接口匹配。

### 切换会话

1. 创建多个会话
2. 点击不同的会话
3. 会话切换成功，但是由于消息API接口不存在，导致无法加载消息

**问题**：会话切换成功后，前端尝试获取消息，但是由于消息API接口不存在，导致404错误。

**解决方案**：修改前端的消息API请求，使其与后端的API接口匹配。

### 删除会话

1. 创建会话
2. 点击删除按钮
3. 确认删除
4. 会话删除成功

**问题**：会话删除成功后，前端会自动导航到第一个会话，但是由于消息API接口不存在，导致无法加载消息。

**解决方案**：修改前端的消息API请求，使其与后端的API接口匹配。

### 主对话窗口多轮QA

1. 创建会话
2. 在输入框中输入消息
3. 点击发送按钮
4. 前端尝试调用`api.node.askQuestion`方法，但是由于节点ID不正确，导致404错误

**问题**：前端尝试使用`rootNodeId`作为节点ID来调用`api.node.askQuestion`方法，但是`rootNodeId`可能为空或者不正确。

**解决方案**：修改前端的消息发送逻辑，确保使用正确的节点ID。

### 选择消息进行深挖

1. 创建会话
2. 在主对话窗口中选择文本
3. 点击"深挖选中内容"按钮
4. 前端尝试调用`api.node.createDeepDive`方法，但是由于节点ID不正确，导致404错误

**问题**：前端尝试使用`nodeId || rootNodeId || ''`作为节点ID来调用`api.node.createDeepDive`方法，但是这些ID可能为空或者不正确。

**解决方案**：修改前端的深挖逻辑，确保使用正确的节点ID。

### 管理标签

1. 创建会话
2. 在主对话窗口中发送消息
3. 尝试为消息添加标签
4. 由于消息API接口不存在，无法添加标签

**问题**：前端没有实现标签管理功能，或者实现不完整。

**解决方案**：实现标签管理功能，包括添加、删除、修改标签。

### 不同窗口加载QA记录

1. 创建会话
2. 在主对话窗口中发送消息
3. 切换到深挖窗口
4. 由于消息API接口不存在，无法加载QA记录

**问题**：前端尝试使用`api.message.getBySession`方法来获取消息，但是后端没有这个API接口。

**解决方案**：修改前端的消息API请求，使其与后端的API接口匹配。

## 总结

SynCraft前端重构项目存在一些API接口不匹配的问题，主要是消息API接口不存在。这导致了会话创建、切换、删除等功能虽然能够成功执行，但是无法正确加载消息。此外，深挖功能的实现也不完整，需要进一步完善。

建议修改前端的消息API请求，使其与后端的API接口匹配，或者在后端添加相应的API接口。同时，完善错误处理和回退机制，提高用户体验。
