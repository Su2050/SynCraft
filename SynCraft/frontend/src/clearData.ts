// 清除IndexedDB数据的脚本
import { clear } from 'idb-keyval';

/**
 * 清理所有IndexedDB数据
 * 在应用重大版本升级后使用
 * @returns 清理是否成功
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await clear();
    console.log('所有数据已清理');
    return true;
  } catch (error) {
    console.error('清理数据失败:', error);
    return false;
  }
}
