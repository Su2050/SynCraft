# SynCraft 前端实现说明文档

本文档详细介绍SynCraft前端的实现逻辑，帮助接手项目的开发者快速理解系统架构和核心功能。

## 系统架构

SynCraft前端采用React框架开发，使用Zustand进行状态管理，主要由以下几个部分组成：

1. **组件层**：包含UI组件，如TreeChat（树形结构）、ChatPanel（聊天面板）、Conversation（对话历史）等
2. **状态管理层**：使用Zustand创建多个store，如messageStore、treeStore、sessionStore、contextStore等
3. **服务层**：包含各种服务，如nodeService等
4. **仓储层**：包含数据访问逻辑，如messageRepository、nodeRepository等
5. **API层**：处理与后端的通信

## 数据流

数据流向遵循以下模式：

1. 用户交互 → 组件层
2. 组件层 → 状态管理层/服务层
3. 服务层 → 仓储层
4. 仓储层 → API层
5. API层 → 后端

数据获取策略采用多层回退机制：
- 首先尝试从API获取数据
- 如果API调用失败，回退到本地存储（IndexedDB）
- 如果本地存储也失败，使用内存中的数据

## 核心用户场景

### 1. 创建会话

**流程**：
1. 用户点击"创建新会话"按钮
2. 弹出创建会话对话框，用户输入会话名称
3. 系统调用`createSession`函数创建会话
4. 创建会话的根节点
5. 更新会话列表和活动会话ID
6. 设置根节点为活动节点

**关键代码**：
- `sessionStore.ts`中的`createSession`函数
- `ChatPanel.tsx`中的会话创建逻辑

**数据流**：
1. 用户输入 → ChatPanel组件
2. ChatPanel组件 → useSessionStore
3. useSessionStore → sessionRepository
4. sessionRepository → API
5. API创建会话并返回会话ID
6. 更新前端状态

### 2. 进行多轮对话

**流程**：
1. 用户在输入框中输入消息并发送
2. 系统调用`handleSend`函数处理消息
3. 根据当前状态（是否是第一条消息、是否有活动节点等）决定如何创建节点
4. 创建用户消息并添加到消息存储
5. 获取AI回复并添加到消息存储
6. 更新UI显示新消息

**关键代码**：
- `useChatLogic.ts`中的`handleSend`函数
- `ChatPanel.tsx`中的消息发送逻辑
- `Conversation.tsx`中的消息显示逻辑

**数据流**：
1. 用户输入 → ChatPanel组件
2. ChatPanel组件 → useChatLogic
3. useChatLogic → nodeService/messageRepository
4. nodeService/messageRepository → API
5. API处理消息并返回AI回复
6. 更新前端状态并显示消息

**多轮对话的节点管理**：
- 第一条消息：创建根节点或使用现有根节点
- 后续消息：创建子节点或使用现有节点
- 每个节点包含用户消息和AI回复

### 3. 深挖探索

**流程**：
1. 用户选择文本或点击消息气泡中的"深挖一下"按钮
2. 系统创建深挖上下文ID
3. 打开右侧Tab进行深挖
4. 创建分叉节点
5. 获取AI回复并显示

**关键代码**：
- `Conversation.tsx`中的`handleDeepDive`函数
- `useChatLogic.ts`中的深挖模式逻辑

**数据流**：
1. 用户交互 → Conversation组件
2. Conversation组件 → useSideTabStore
3. 深挖Tab → useChatLogic（深挖模式）
4. useChatLogic → nodeService
5. nodeService → API
6. API处理深挖请求并返回结果
7. 更新前端状态并显示深挖结果

### 4. 切换会话

**流程**：
1. 用户点击会话列表中的会话
2. 系统调用`setActiveSession`函数切换会话
3. 更新活动会话ID
4. 清理当前会话的数据，并保存到IndexedDB
5. 加载新会话的数据，包括树形结构和消息
6. 设置当前活动节点为该会话的根节点

**关键代码**：
- `sessionStore.ts`中的`setActiveSession`函数
- `ChatPanel.tsx`中的会话切换逻辑

**数据流**：
1. 用户点击 → ChatPanel组件
2. ChatPanel组件 → useSessionStore
3. useSessionStore → sessionRepository
4. sessionRepository → API
5. API返回会话数据
6. 更新前端状态

## 关键组件和功能

### TreeChat组件

TreeChat组件使用ReactFlow库实现树形结构的可视化，支持以下功能：
- 显示节点和边
- 右键菜单：添加子节点、折叠/展开、删除
- 自动布局：根据节点层级自动排列节点位置

### ChatPanel组件

ChatPanel组件是聊天界面的主要组件，包含以下功能：
- 会话管理：创建、重命名、删除、切换会话
- 聊天功能：显示聊天历史、发送消息
- 节点管理：设置活动节点

### Conversation组件

Conversation组件负责显示聊天历史，支持以下功能：
- 显示聊天历史
- 支持深挖功能
- 自动滚动到最新消息

### useChatLogic Hook

useChatLogic Hook是聊天逻辑的核心，提供以下功能：
- 处理消息发送
- 创建节点
- 获取AI回复
- 管理聊天状态

## 状态管理

### messageStore

messageStore管理消息状态，提供以下功能：
- 加载消息数据
- 添加新消息
- 设置所有消息

### treeStore

treeStore管理节点和边的状态，提供以下功能：
- 加载节点和边数据
- 添加子节点
- 设置所有节点和边
- 获取节点路径

### sessionStore

sessionStore管理会话状态，提供以下功能：
- 加载会话数据
- 创建会话
- 重命名会话
- 删除会话
- 设置活动会话

### contextStore

contextStore管理上下文状态，提供以下功能：
- 创建上下文ID
- 设置活动节点
- 获取活动节点ID
- 获取当前上下文

## 数据存储

前端使用多种数据存储方式：
- IndexedDB：使用idb-keyval库存储消息、节点、边等数据
- localStorage：存储会话ID、节点ID等简单数据
- 内存：使用Zustand store存储运行时状态

## 可能存在的问题

1. **数据同步问题**：
   - 前端和后端数据可能不同步，特别是在网络不稳定的情况下
   - 解决方案：实现更强大的数据同步机制，如使用WebSocket实时同步

2. **节点管理复杂性**：
   - 节点创建和管理逻辑较为复杂，可能导致节点状态不一致
   - 解决方案：简化节点管理逻辑，增强错误处理和状态验证

3. **会话切换问题**：
   - 会话切换时可能出现数据加载不完整或活动节点设置错误的情况
   - 解决方案：优化会话切换流程，确保数据完整性和状态一致性

4. **深挖功能的上下文管理**：
   - 深挖功能的上下文管理较为复杂，可能导致上下文混乱
   - 解决方案：简化上下文管理，明确上下文边界和生命周期

5. **错误处理和回退机制**：
   - 虽然实现了多层回退机制，但错误处理仍可能不够健壮
   - 解决方案：增强错误处理，提供更友好的用户反馈

6. **性能问题**：
   - 随着节点和消息数量增加，可能出现性能问题
   - 解决方案：实现数据分页加载，优化渲染性能

7. **用户体验问题**：
   - 界面可能不够直观，用户可能难以理解树形结构和深挖功能
   - 解决方案：优化UI设计，提供更清晰的用户引导

## 改进建议

1. **简化数据流**：
   - 减少数据流的层级，简化状态管理
   - 使用更现代的状态管理方案，如React Query或SWR

2. **增强错误处理**：
   - 实现更全面的错误处理机制
   - 提供更友好的错误提示

3. **优化性能**：
   - 实现虚拟滚动，优化大量消息的渲染性能
   - 实现数据分页加载，减少内存占用

4. **改进UI/UX**：
   - 优化树形结构的可视化，使其更直观
   - 简化深挖功能的使用方式

5. **增强数据同步**：
   - 实现WebSocket实时同步
   - 增强离线支持和数据恢复机制

6. **增加测试覆盖率**：
   - 增加单元测试和集成测试
   - 实现端到端测试

7. **文档完善**：
   - 完善代码注释和文档
   - 提供更详细的开发指南和API文档
