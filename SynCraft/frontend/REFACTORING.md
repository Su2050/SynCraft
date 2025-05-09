# SynCraft前端架构精简方案

本文档提出了一个全面的SynCraft前端架构精简方案，旨在保留核心功能的前提下，大幅简化实现方式，提高代码可维护性和开发效率。

## 当前架构的复杂性来源

1. **多层数据流**：组件层→状态管理层→服务层→仓储层→API层
2. **多个状态管理store**：messageStore、treeStore、sessionStore、contextStore等
3. **复杂的节点管理逻辑**：创建、更新、删除节点，以及节点之间的关系管理
4. **多层回退机制**：API→本地存储→内存
5. **复杂的上下文管理**：主聊天上下文、深挖上下文等
6. **数据存储分散**：IndexedDB、localStorage、内存
7. **复杂的组件交互**：TreeChat、ChatPanel、Conversation等组件之间的交互

## 核心功能需求

1. **会话管理**：创建、重命名、删除、切换会话
2. **多轮对话**：发送消息、接收AI回复、显示对话历史
3. **树形结构**：可视化对话的树形结构，支持节点操作
4. **深挖功能**：对特定内容进行深入探讨
5. **数据持久化**：保存会话、节点和消息数据

## 精简方案

### 1. 状态管理简化

#### 使用React Query替代多层数据流

- 将API调用和数据缓存统一由React Query管理
- 减少自定义store的数量，只保留必要的全局状态
- 利用React Query的缓存机制替代复杂的回退逻辑
- 使用React Query的mutation功能处理数据修改

```javascript
// 示例：使用React Query获取会话列表
const { data: sessions, isLoading, error } = useQuery(
  'sessions',
  fetchSessions,
  {
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    onError: (error) => console.error('获取会话失败:', error)
  }
);

// 示例：使用React Query创建会话
const createSessionMutation = useMutation(createSession, {
  onSuccess: (newSession) => {
    // 更新缓存
    queryClient.setQueryData('sessions', (old) => [...old, newSession]);
    // 设置活动会话
    setActiveSessionId(newSession.id);
  }
});
```

#### 合并状态管理store

- 将messageStore和treeStore合并为单一的chatStore
- 将sessionStore和contextStore合并为单一的appStore
- 减少store之间的依赖和交互

```javascript
// 示例：合并后的chatStore
const useChatStore = create((set, get) => ({
  messages: [],
  nodes: [],
  edges: [],
  
  // 加载消息和节点
  load: async (sessionId) => {
    const data = await fetchSessionData(sessionId);
    set({
      messages: data.messages,
      nodes: data.nodes,
      edges: data.edges
    });
  },
  
  // 添加消息
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  
  // 添加节点
  addNode: (node, parentId) => {
    // 添加节点和边的逻辑
  }
}));
```

### 2. 数据存储简化

#### 统一数据存储策略

- 使用单一的存储方案，如IndexedDB或localStorage
- 使用成熟的库如Dexie.js简化IndexedDB操作
- 实现简单的数据同步机制，确保前后端数据一致性

```javascript
// 示例：使用Dexie.js简化IndexedDB操作
const db = new Dexie('SynCraftDB');

db.version(1).stores({
  sessions: '++id, name, createdAt',
  messages: '++id, sessionId, nodeId, role, content, timestamp',
  nodes: '++id, sessionId, parentId, type, label'
});

// 简化的数据访问函数
export const sessionRepository = {
  async getAll() {
    return await db.sessions.toArray();
  },
  
  async getById(id) {
    return await db.sessions.get(id);
  },
  
  async create(data) {
    const id = await db.sessions.add({
      ...data,
      createdAt: Date.now()
    });
    return await this.getById(id);
  },
  
  // 其他方法...
};
```

#### 简化数据模型

- 重新设计数据模型，减少实体之间的复杂关系
- 将节点和消息合并为单一的消息模型，每条消息包含必要的节点信息
- 使用扁平化的数据结构，减少嵌套和引用

```javascript
// 示例：简化的消息模型
interface Message {
  id: string;
  sessionId: string;
  parentId: string | null; // 父消息ID，用于构建树形结构
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tags: string[]; // 用于深挖功能的标签
}

// 示例：简化的会话模型
interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
```

### 3. 组件结构简化

#### 组件重构

- 使用React Context API替代部分Zustand store
- 采用组合模式而非继承，减少组件间的耦合
- 使用React.memo和useMemo优化渲染性能

```javascript
// 示例：使用React Context API管理会话状态
const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const { data: sessions } = useQuery('sessions', fetchSessions);
  
  const value = {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession: sessions?.find(s => s.id === activeSessionId)
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
```

#### 简化组件交互

- 减少组件之间的直接交互，通过状态管理或事件总线进行通信
- 使用自定义Hook封装复杂逻辑，保持组件简洁
- 将useChatLogic拆分为更小的专用Hook，如useMessages、useSession等

```javascript
// 示例：拆分useChatLogic为更小的专用Hook
export function useMessages(sessionId) {
  const { data: messages, isLoading } = useQuery(
    ['messages', sessionId],
    () => fetchMessages(sessionId)
  );
  
  const sendMessageMutation = useMutation(sendMessage, {
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', sessionId], (old) => [...old, newMessage]);
    }
  });
  
  return {
    messages,
    isLoading,
    sendMessage: (content) => sendMessageMutation.mutate({ sessionId, content })
  };
}
```

### 4. API和后端交互简化

#### API层简化

- 使用React Query的useQuery和useMutation替代手动API调用
- 统一API错误处理和加载状态管理
- 实现简单的API缓存策略，减少不必要的请求

```javascript
// 示例：API层简化
const api = {
  // 会话相关
  sessions: {
    getAll: () => fetch('/api/sessions').then(res => res.json()),
    create: (data) => fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    // 其他方法...
  },
  
  // 消息相关
  messages: {
    getBySession: (sessionId) => fetch(`/api/sessions/${sessionId}/messages`).then(res => res.json()),
    send: (sessionId, content) => fetch(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    }).then(res => res.json()),
    // 其他方法...
  }
};

// 在组件中使用
function ChatPanel() {
  const { id: sessionId } = useParams();
  const { data: messages, isLoading } = useQuery(
    ['messages', sessionId],
    () => api.messages.getBySession(sessionId)
  );
  // ...
}
```

#### 后端交互优化

- 考虑使用GraphQL替代REST API，减少请求次数和数据过度获取
- 实现基本的实时更新功能，如使用WebSocket或Server-Sent Events
- 将复杂的业务逻辑移至后端，前端专注于UI渲染和用户交互

```javascript
// 示例：使用GraphQL查询
const GET_SESSION_WITH_MESSAGES = gql`
  query GetSessionWithMessages($id: ID!) {
    session(id: $id) {
      id
      name
      messages {
        id
        content
        role
        timestamp
      }
    }
  }
`;

function ChatPanel() {
  const { id: sessionId } = useParams();
  const { data, loading, error } = useQuery(GET_SESSION_WITH_MESSAGES, {
    variables: { id: sessionId }
  });
  // ...
}
```

### 5. 核心功能实现简化

#### 会话管理简化

- 使用React Router管理会话切换，每个会话对应一个路由
- 简化会话创建和切换逻辑，减少状态更新和数据加载的复杂性
- 使用URL参数存储当前会话ID和活动节点ID

```javascript
// 示例：使用React Router管理会话
function App() {
  return (
    <Router>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<SessionList />} />
          <Route path="/sessions/:id" element={<ChatPanel />} />
          <Route path="/sessions/:id/nodes/:nodeId" element={<ChatPanel />} />
        </Routes>
      </SessionProvider>
    </Router>
  );
}

// 在ChatPanel中使用URL参数
function ChatPanel() {
  const { id: sessionId, nodeId } = useParams();
  // ...
}
```

#### 树形结构简化

- 使用更简单的树形结构库，如react-d3-tree
- 减少树形结构的交互复杂性，专注于可视化和基本操作
- 将树形结构作为可选功能，不作为核心交互方式

```javascript
// 示例：使用react-d3-tree简化树形结构
function MessageTree({ messages }) {
  // 将消息转换为树形结构
  const treeData = useMemo(() => convertMessagesToTree(messages), [messages]);
  
  return (
    <div className="message-tree">
      <Tree
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        collapsible={true}
        onNodeClick={(node) => {
          // 处理节点点击
          navigate(`/sessions/${sessionId}/nodes/${node.data.id}`);
        }}
      />
    </div>
  );
}
```

### 6. 深挖功能简化

#### 深挖功能重新设计

- 将深挖功能简化为基于标签的过滤系统，而非复杂的上下文管理
- 使用简单的标记和引用机制，而非创建新的节点和上下文
- 深挖结果显示在同一界面中，使用标签或分组区分不同的深挖内容

```javascript
// 示例：基于标签的深挖功能
function handleDeepDive(text) {
  // 创建一个新的标签
  const tag = `deepdive-${Date.now()}`;
  
  // 发送带有标签的消息
  sendMessage({
    content: `深挖：${text}`,
    tags: [tag]
  });
  
  // 更新UI状态，显示带有该标签的消息
  setActiveTag(tag);
}

// 在消息列表中过滤显示
function MessageList({ messages, activeTag }) {
  // 如果有活动标签，只显示带有该标签的消息
  const filteredMessages = activeTag
    ? messages.filter(m => m.tags?.includes(activeTag))
    : messages;
  
  return (
    <div className="message-list">
      {filteredMessages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
```

#### 上下文管理简化

- 减少上下文类型，只保留主聊天上下文
- 使用简单的标记系统替代复杂的上下文ID和关联
- 将上下文切换简化为UI状态切换，而非复杂的数据结构变更

```javascript
// 示例：简化的上下文管理
function ChatContainer() {
  const [activeView, setActiveView] = useState('main'); // 'main' 或 'deepdive'
  const [deepDiveQuery, setDeepDiveQuery] = useState('');
  
  // 根据当前视图显示不同内容
  return (
    <div className="chat-container">
      {activeView === 'main' ? (
        <MainChat onDeepDive={(text) => {
          setDeepDiveQuery(text);
          setActiveView('deepdive');
        }} />
      ) : (
        <DeepDiveView
          query={deepDiveQuery}
          onBack={() => setActiveView('main')}
        />
      )}
    </div>
  );
}
```

## 实施路径

为了平稳过渡到新架构，建议采用以下实施路径：

1. **准备阶段**：
   - 评估当前代码库，识别可以重用的部分
   - 设计新的数据模型和API接口
   - 创建新的项目结构和构建配置

2. **核心功能重构**：
   - 实现新的数据存储层和API层
   - 创建基本的UI组件和状态管理
   - 实现会话管理和消息功能

3. **高级功能重构**：
   - 实现树形结构可视化
   - 实现简化的深挖功能
   - 添加其他辅助功能

4. **测试和优化**：
   - 进行功能测试和性能测试
   - 优化用户体验和性能
   - 修复问题和改进代码

5. **部署和迁移**：
   - 部署新版本
   - 提供数据迁移工具
   - 收集用户反馈并持续改进

## 总结

本精简方案通过以下方式大幅降低代码复杂性，提高可维护性：

1. 使用React Query简化数据获取和状态管理
2. 统一数据存储策略，简化数据模型
3. 重构组件结构，减少组件间的耦合
4. 简化API和后端交互
5. 重新设计核心功能实现方式
6. 简化深挖功能和上下文管理

这个方案保留了SynCraft的核心功能和用户体验，同时大幅降低了代码复杂性和维护成本。通过采用现代前端开发最佳实践，新架构将更加灵活、可扩展和易于维护。
