import Dexie from 'dexie';
import type { Message, Session, TreeNode } from '@/types';

/**
 * SynCraft数据库类
 * 使用Dexie.js简化IndexedDB操作
 */
class SynCraftDatabase extends Dexie {
  sessions!: Dexie.Table<Session, string>;
  messages!: Dexie.Table<Message, string>;
  nodes!: Dexie.Table<TreeNode, string>;

  constructor() {
    super('SynCraftDB');
    
    // 定义数据库结构
    this.version(1).stores({
      sessions: 'id, created_at, updated_at',
      messages: 'id, session_id, parent_id, role, timestamp, [session_id+timestamp]',
      nodes: 'id, parent_id, session_id, type'
    });
    
    // 类型绑定
    this.sessions = this.table('sessions');
    this.messages = this.table('messages');
    this.nodes = this.table('nodes');
  }
  
  /**
   * 清空数据库
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', [this.sessions, this.messages, this.nodes], async () => {
      await this.sessions.clear();
      await this.messages.clear();
      await this.nodes.clear();
    });
  }
  
  /**
   * 导出数据库内容
   */
  async exportData(): Promise<{ sessions: Session[]; messages: Message[]; nodes: TreeNode[] }> {
    return {
      sessions: await this.sessions.toArray(),
      messages: await this.messages.toArray(),
      nodes: await this.nodes.toArray()
    };
  }
  
  /**
   * 导入数据
   */
  async importData(data: { sessions: Session[]; messages: Message[]; nodes: TreeNode[] }): Promise<void> {
    await this.transaction('rw', [this.sessions, this.messages, this.nodes], async () => {
      // 先清空数据库
      await this.sessions.clear();
      await this.messages.clear();
      await this.nodes.clear();
      
      // 导入数据
      if (data.sessions?.length) await this.sessions.bulkAdd(data.sessions);
      if (data.messages?.length) await this.messages.bulkAdd(data.messages);
      if (data.nodes?.length) await this.nodes.bulkAdd(data.nodes);
    });
  }
}

// 创建数据库实例
export const db = new SynCraftDatabase();

// 导出数据库服务
export default db;
