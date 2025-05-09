import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { TreeNode } from '@/types';

/**
 * 获取会话的树状结构
 * @param sessionId 会话ID
 * @returns 树状结构数据
 */
export function useSessionTree(sessionId: string) {
  const { 
    data: sessionTree, 
    isLoading, 
    error,
    refetch 
  } = useQuery(
    ['sessionTree', sessionId],
    async () => {
      try {
        // 尝试获取会话树
        const response = await api.session.getTree(sessionId);
        return response;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 获取会话树失败:`, error);
        // 返回一个默认的空树结构，而不是抛出错误
        return {
          data: {
            nodes: [{
              id: 'default-root',
              parent_id: null,
              session_id: sessionId,
              label: '根节点',
              type: 'root' as 'root',
              template_key: 'root',
              created_at: new Date().toISOString()
            }],
            edges: []
          }
        };
      }
    },
    { 
      enabled: !!sessionId,
      staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
      retry: 1 // 减少重试次数
    }
  );

  // 构建树状结构
  const buildTree = (nodes: TreeNode[], edges: any[]) => {
    // 如果没有节点，返回一个默认的根节点
    if (!nodes || nodes.length === 0) {
      console.log(`[${new Date().toISOString()}] 没有节点数据，返回默认根节点`);
      return [{
        id: 'default-root',
        parent_id: null,
        session_id: sessionId,
        label: '根节点',
        type: 'root' as 'root',
        children: []
      }];
    }
    
    // 创建节点映射
    const nodeMap = new Map<string, TreeNode & { children: any[] }>();
    
    // 初始化节点映射，为节点添加默认值
    nodes.forEach(node => {
      // 为节点添加默认值
      const enhancedNode = {
        ...node,
        label: node.label || (node.template_key === 'root' ? '根节点' : `节点 ${node.id.substring(0, 4)}`),
        type: node.type || (node.template_key === 'root' ? 'root' : 'normal'),
        session_id: node.session_id || sessionId,
        children: []
      };
      nodeMap.set(node.id, enhancedNode);
    });
    
    // 记录处理前的节点数量
    console.log(`[${new Date().toISOString()}] 处理前的节点数量: ${nodes.length}`);
    console.log(`[${new Date().toISOString()}] 处理前的边数量: ${edges.length}`);
    
    // 打印所有节点的ID
    console.log(`[${new Date().toISOString()}] 所有节点ID:`, nodes.map(node => node.id));
    
    // 打印所有边的source和target
    console.log(`[${new Date().toISOString()}] 所有边:`, edges.map(edge => `${edge.source} -> ${edge.target}`));
    
    // 根据边构建树
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        // 检查是否已经添加过这个子节点，避免重复
        const alreadyAdded = sourceNode.children.some(child => child.id === targetNode.id);
        if (!alreadyAdded) {
          sourceNode.children.push(targetNode);
          console.log(`[${new Date().toISOString()}] 添加子节点: ${sourceNode.id} -> ${targetNode.id}`);
        }
      } else {
        console.warn(`[${new Date().toISOString()}] 无法找到节点: source=${edge.source}, target=${edge.target}`);
      }
    });
    
    // 找到根节点
    const rootNodes = nodes.filter(node => !node.parent_id);
    console.log(`[${new Date().toISOString()}] 找到根节点数量: ${rootNodes.length}`);
    
    // 如果没有边，但有节点，则所有节点都是根节点
    if (edges.length === 0 && nodes.length > 0) {
      console.log(`[${new Date().toISOString()}] 没有边，但有节点，将所有节点视为根节点`);
      return nodes.map(node => nodeMap.get(node.id)).filter(Boolean);
    }
    
    // 返回根节点，如果没有找到根节点，返回所有节点
    const result = rootNodes.map(node => nodeMap.get(node.id)).filter(Boolean);
    if (result.length === 0 && nodes.length > 0) {
      console.log(`[${new Date().toISOString()}] 没有找到根节点，返回所有节点`);
      return nodes.map(node => nodeMap.get(node.id)).filter(Boolean);
    }
    
    // 记录处理后的树结构
    console.log(`[${new Date().toISOString()}] 处理后的根节点数量: ${result.length}`);
    if (result.length > 0 && result[0]) {
      const rootNode = result[0];
      console.log(`[${new Date().toISOString()}] 第一个根节点的子节点数量: ${rootNode.children?.length || 0}`);
      if (rootNode.children && rootNode.children.length > 0) {
        console.log(`[${new Date().toISOString()}] 第一个根节点的子节点ID:`, rootNode.children.map(child => child.id));
      } else {
        console.log(`[${new Date().toISOString()}] 第一个根节点没有子节点`);
      }
    }
    
    return result;
  };

  // 处理树数据
  // 检查sessionTree的格式，兼容两种可能的返回格式
  const treeData = sessionTree ? (
    // 如果sessionTree有data字段，使用data字段中的nodes和edges
    sessionTree.data ? 
      buildTree(sessionTree.data.nodes, sessionTree.data.edges) : 
      // 如果sessionTree直接包含nodes和edges字段，直接使用
      ((sessionTree as any).nodes && (sessionTree as any).edges ? 
        buildTree((sessionTree as any).nodes, (sessionTree as any).edges) : 
        [])
  ) : [];

  return {
    treeData,
    isLoading,
    error,
    refetch
  };
}
