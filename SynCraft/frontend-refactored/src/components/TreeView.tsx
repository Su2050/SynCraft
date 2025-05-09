import React, { useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/sessionContext';
import { useSessionTree } from '@/hooks/useSessionTree';
import type { TreeNode } from '@/types';

// 自定义节点组件
const CustomNode = ({ nodeDatum, toggleNode }: any) => (
  <g>
    <circle 
      r={15} 
      fill={nodeDatum.active ? '#3b82f6' : '#e5e7eb'} 
      onClick={toggleNode}
    />
    <text
      fill={nodeDatum.active ? 'white' : 'black'}
      x="25"
      y="5"
      style={{ fontSize: '0.8rem' }}
    >
      {nodeDatum.name}
    </text>
  </g>
);

/**
 * 树形结构可视化组件
 */
export default function TreeView() {
  const { activeSessionId } = useSession();
  const { treeData, isLoading, error } = useSessionTree(activeSessionId || '');
  const navigate = useNavigate();
  
// 将树数据转换为react-d3-tree所需的格式
const d3TreeData = useMemo(() => {
  console.log(`[${new Date().toISOString()}] TreeView: 转换树数据，treeData:`, treeData);
  
  if (!treeData || treeData.length === 0) {
    // 如果没有树数据，返回一个空的根节点
    console.log(`[${new Date().toISOString()}] TreeView: 没有树数据，返回空根节点`);
    return { name: '根节点', children: [] };
  }
  
  // 递归转换函数
  const convertToD3TreeData = (nodes: any[]): any[] => {
    if (!nodes || !Array.isArray(nodes)) {
      console.warn(`[${new Date().toISOString()}] TreeView: 节点不是数组:`, nodes);
      return [];
    }
    
    return nodes.map(node => {
      if (!node) {
        console.warn(`[${new Date().toISOString()}] TreeView: 节点为空`);
        return null;
      }
      
      // 使用QA问题作为节点名称，如果存在的话
      let nodeName = '节点';
      
      // 使用类型断言，因为node类型定义中可能没有qa_summary属性
      const nodeAny = node as any;
      
      // 如果节点是根节点，也尝试使用QA摘要，如果没有则使用"根节点"作为名称
      if (node.template_key === 'root') {
        if (nodeAny.qa_summary && nodeAny.qa_summary.question_preview) {
          // 截取前10个字符，不添加省略号
          nodeName = nodeAny.qa_summary.question_preview.substring(0, 10);
        } else {
          nodeName = '根节点';
        }
      } 
      // 如果节点有QA摘要，使用问题预览作为名称
      else if (nodeAny.qa_summary && nodeAny.qa_summary.question_preview) {
        // 截取前10个字符，不添加省略号
        nodeName = nodeAny.qa_summary.question_preview.substring(0, 10);
      }
      // 否则使用节点标签或模板键
      else if (node.label) {
        nodeName = node.label;
      } else if (node.template_key) {
        nodeName = node.template_key;
      }
      
      const result = {
        name: nodeName,
        id: node.id,
        active: false,
        children: node.children ? convertToD3TreeData(node.children) : []
      };
      
      console.log(`[${new Date().toISOString()}] TreeView: 转换节点 ${node.id}, 子节点数量: ${node.children?.length || 0}`);
      
      return result;
    }).filter(Boolean); // 过滤掉null值
  };
  
  // 如果treeData是数组且只有一个元素，直接使用该元素作为根节点
  if (Array.isArray(treeData) && treeData.length === 1) {
    const rootNode = treeData[0];
    if (rootNode) {
      console.log(`[${new Date().toISOString()}] TreeView: 使用单个根节点 ${rootNode.id}, 子节点数量: ${rootNode.children?.length || 0}`);
      
      // 确定根节点的名称
      let rootNodeName = '根节点';
      // 使用类型断言，因为TreeNode类型定义中可能没有qa_summary属性
      const rootNodeAny = rootNode as any;
      if (rootNodeAny.qa_summary && rootNodeAny.qa_summary.question_preview) {
        // 截取前10个字符，不添加省略号
        rootNodeName = rootNodeAny.qa_summary.question_preview.substring(0, 10);
      } else if (rootNode.template_key) {
        rootNodeName = rootNode.template_key;
      } else if (rootNode.label) {
        rootNodeName = rootNode.label;
      }
      
      return {
        name: rootNodeName,
        id: rootNode.id,
        active: false,
        children: rootNode.children ? convertToD3TreeData(rootNode.children) : []
      };
    }
  }
  
  console.log(`[${new Date().toISOString()}] TreeView: 使用多个根节点，数量: ${treeData.length}`);
  
  return {
    name: '根节点',
    children: convertToD3TreeData(treeData)
  };
}, [treeData]);
  
  // 处理节点点击
  const handleNodeClick = (nodeData: any) => {
    if (nodeData.id) {
      navigate(`/sessions/${activeSessionId}/nodes/${nodeData.id}`);
    }
  };
  
  // 树形图配置
  const treeConfig = {
    orientation: 'vertical' as const,
    pathFunc: 'step' as const,
    nodeSize: { x: 150, y: 80 },
    separation: { siblings: 1, nonSiblings: 2 },
  };
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>加载中...</p>
      </div>
    );
  }
  
  // 显示错误信息
  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        <p>加载失败: {(error as Error).message}</p>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      {/* 无论treeData是否为空，都显示树形图 */}
      <Tree
        data={d3TreeData}
        {...treeConfig}
        renderCustomNodeElement={CustomNode}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
