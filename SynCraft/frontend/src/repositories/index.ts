// frontend/src/repositories/index.ts

import { sessionRepository } from './sessionRepository';
import { nodeRepository } from './nodeRepository';
import { messageRepository } from './messageRepository';

/**
 * 导出所有仓储
 */
export {
  sessionRepository,
  nodeRepository,
  messageRepository
};

/**
 * 导出仓储接口
 */
export type {
  ISessionRepository,
  INodeRepository,
  IMessageRepository
} from './types';
