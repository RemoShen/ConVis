import * as THREE from "three";

/**
 * 神经元简化算法与滚动条控制
 * 基于neuron_mst的分支持久性算法实现
 */

// 存储原始SWC数据和简化后的模型
const neuronSimplificationState = {
  originalNodes: new Map(), // 存储原始SWC节点数据: key=filePath, value=nodes
  simplifiedModels: new Map(), // 存储不同简化级别的模型: key=filePath_level, value=model
  currentSimplificationLevel: new Map(), // 当前显示的简化级别: key=filePath, value=level(0-100)
};

/**
 * 解析SWC文件并构建神经元树结构
 * @param {Array} nodes SWC节点数组
 * @returns {Object} 包含节点映射和根节点ID的对象
 */
function buildNeuronTree(nodes) {
  const nodeMap = new Map();
  let rootId = null;
  
  // 创建节点映射
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      ...node,
      children: []
    });
    
    if (node.parentId === -1) {
      rootId = node.id;
    }
  });
  
  // 构建父子关系
  nodes.forEach(node => {
    if (node.parentId !== -1 && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(node.id);
    }
  });
  
  return { nodeMap, rootId };
}

/**
 * 计算节点到根节点的距离
 * @param {Map} nodeMap 节点映射
 * @param {Number} rootId 根节点ID
 * @returns {Map} 节点到根的距离映射
 */
function computeDistances(nodeMap, rootId) {
  const distances = new Map();
  distances.set(rootId, 0);
  
  const stack = [rootId];
  while (stack.length > 0) {
    const nodeId = stack.pop();
    const node = nodeMap.get(nodeId);
    const parentDist = distances.get(nodeId);
    
    node.children.forEach(childId => {
      const child = nodeMap.get(childId);
      const dx = node.x - child.x;
      const dy = node.y - child.y;
      const dz = node.z - child.z;
      const dist = parentDist + Math.sqrt(dx*dx + dy*dy + dz*dz);
      distances.set(childId, dist);
      stack.push(childId);
    });
  }
  
  return distances;
}

/**
 * 计算每个节点子树的最大距离
 * @param {Map} nodeMap 节点映射
 * @param {Number} rootId 根节点ID
 * @param {Map} distances 节点到根的距离映射
 * @returns {Map} 子树最大距离映射
 */
function computeMaxSubtreeDistances(nodeMap, rootId, distances) {
  const maxDistances = new Map();
  
  function dfs(nodeId) {
    const node = nodeMap.get(nodeId);
    let maxDist = distances.get(nodeId);
    
    node.children.forEach(childId => {
      maxDist = Math.max(maxDist, dfs(childId));
    });
    
    maxDistances.set(nodeId, maxDist);
    return maxDist;
  }
  
  dfs(rootId);
  return maxDistances;
}

/**
 * 计算叶分支的持久性值
 * @param {Map} nodeMap 节点映射
 * @param {Number} rootId 根节点ID
 * @param {Map} distances 节点到根的距离映射
 * @param {Map} maxDistances 子树最大距离映射
 * @returns {Array} 分支持久性数组，每项包含[叶节点ID, 分支点ID, 持久性值]
 */
function computeBranchPersistence(nodeMap, rootId, distances, maxDistances) {
  const branches = [];
  
  // 找出所有叶节点
  for (const [nodeId, node] of nodeMap.entries()) {
    if (node.children.length === 0) { // 叶节点
      const leafId = nodeId;
      let currentId = leafId;
      
      // 向上查找分支点
      while (true) {
        const node = nodeMap.get(currentId);
        const parentId = node.parentId;
        
        if (parentId === -1) {
          // 到达根节点
          branches.push([leafId, parentId, distances.get(leafId)]);
          break;
        }
        
        const parent = nodeMap.get(parentId);
        const siblings = parent.children.filter(id => id !== currentId);
        
        if (siblings.some(id => maxDistances.get(id) > distances.get(leafId))) {
          // 找到分支点
          branches.push([leafId, parentId, distances.get(leafId) - distances.get(parentId)]);
          break;
        }
        
        currentId = parentId;
      }
    }
  }
  
  // 按持久性值降序排序
  branches.sort((a, b) => b[2] - a[2]);
  return branches;
}

/**
 * 根据简化级别剪枝神经元树
 * @param {Array} nodes 原始SWC节点数组
 * @param {Number} simplificationLevel 简化级别(0-100)，0表示最简化，100表示原始复杂度
 * @returns {Array} 简化后的节点数组
 */
function simplifyNeuron(nodes, simplificationLevel) {
  // 构建神经元树
  const { nodeMap, rootId } = buildNeuronTree(nodes);
  if (!rootId) return nodes; // 如果没有根节点，返回原始数据
  
  // 计算距离和持久性
  const distances = computeDistances(nodeMap, rootId);
  const maxDistances = computeMaxSubtreeDistances(nodeMap, rootId, distances);
  const branches = computeBranchPersistence(nodeMap, rootId, distances, maxDistances);
  
  // 根据简化级别确定保留的分支数量
  const keepRatio = simplificationLevel / 100;
  const keepCount = Math.max(1, Math.floor(branches.length * keepRatio));
  const keptBranches = branches.slice(0, keepCount);
  
  // 确定要保留的节点
  const keepSet = new Set();
  keepSet.add(rootId); // 始终保留根节点
  
  keptBranches.forEach(([leafId, branchPointId]) => {
    // 保留从叶节点到分支点的路径
    let currentId = leafId;
    while (currentId !== branchPointId && currentId !== -1) {
      keepSet.add(currentId);
      currentId = nodeMap.get(currentId).parentId;
    }
    if (branchPointId !== -1) {
      keepSet.add(branchPointId);
    }
  });
  
  // 创建简化后的节点数组
  const simplifiedNodes = nodes.filter(node => keepSet.has(node.id));
  
  return simplifiedNodes;
}

/**
 * 创建简化后的神经元模型
 * @param {Array} nodes 简化后的SWC节点数组
 * @param {Object} materials 材质对象
 * @param {THREE.Group} originalModel 原始模型，用于复制材质和其他属性
 * @returns {THREE.Group} 简化后的THREE.js模型
 */
function createSimplifiedModel(nodes, materials, originalModel) {
  // 这里复用MainScene.js中的createSWCModel函数逻辑
  const group = new THREE.Group();
  
  // 复制原始模型的userData
  if (originalModel && originalModel.userData) {
    group.userData = { ...originalModel.userData };
  }
  
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  
  nodes.forEach((node) => {
    if (node.parentId !== -1) {
      const parent = nodeMap.get(node.parentId);
      if (!parent) return;
      
      const start = new THREE.Vector3(node.x, node.y, node.z);
      const end = new THREE.Vector3(parent.x, parent.y, parent.z);
      
      // 创建曲线
      const direction = end.clone().sub(start);
      const distance = start.distanceTo(end);
      const numPoints = 4;
      const points = [start];
      
      for (let i = 1; i < numPoints - 1; i++) {
        const t = i / (numPoints - 1);
        const basePoint = start.clone().lerp(end, t);
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
        const upVector = new THREE.Vector3(0, 1, 0);
        const sideOffset = perpendicular.multiplyScalar(distance * 0.15 * (Math.random() - 0.5));
        const upOffset = upVector.multiplyScalar(distance * 0.15 * (Math.random() - 0.5));
        basePoint.add(sideOffset).add(upOffset);
        points.push(basePoint);
      }
      
      points.push(end);
      
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
      const tubeGeometry = new THREE.TubeGeometry(curve, 16, node.radius * 0.2, 8, false);
      const tube = new THREE.Mesh(tubeGeometry, materials.line);
      group.add(tube);
      
      const sphereGeometry = new THREE.SphereGeometry(node.radius * 0.5, 12, 12);
      const sphere = new THREE.Mesh(sphereGeometry, materials.point);
      sphere.position.copy(start);
      group.add(sphere);
    }
  });
  
  return group;
}

/**
 * 更新神经元显示，应用简化效果
 * @param {String} filePath 神经元文件路径
 * @param {Number} simplificationLevel 简化级别(0-100)
 * @param {Map} allModelMap 所有模型的映射
 * @param {THREE.Scene} scene THREE.js场景
 * @param {Array} colorSchemes 颜色方案数组
 */
function updateNeuronSimplification(filePath, simplificationLevel, allModelMap, scene, colorSchemes) {
  // 确保有原始数据
  if (!neuronSimplificationState.originalNodes.has(filePath)) {
    console.warn(`No original data for ${filePath}`);
    return;
  }
  
  // 更新当前简化级别
  neuronSimplificationState.currentSimplificationLevel.set(filePath, simplificationLevel);
  
  // 检查是否已有此简化级别的缓存模型
  const cacheKey = `${filePath}_${simplificationLevel}`;
  if (neuronSimplificationState.simplifiedModels.has(cacheKey)) {
    // 使用缓存的模型
    const originalModel = allModelMap.get(filePath);
    const simplifiedModel = neuronSimplificationState.simplifiedModels.get(cacheKey);
    
    // 隐藏原始模型，显示简化模型
    if (originalModel) originalModel.visible = false;
    if (simplifiedModel) {
      simplifiedModel.visible = true;
      // 确保简化模型位置与原始模型一致
      if (originalModel) {
        simplifiedModel.position.copy(originalModel.position);
        simplifiedModel.rotation.copy(originalModel.rotation);
        simplifiedModel.scale.copy(originalModel.scale);
      }
    }
    
    return;
  }
  
  // 创建新的简化模型
  const originalNodes = neuronSimplificationState.originalNodes.get(filePath);
  const simplifiedNodes = simplifyNeuron(originalNodes, simplificationLevel);
  
  // 获取原始模型的材质和其他属性
  const originalModel = allModelMap.get(filePath);
  if (!originalModel) {
    console.warn(`Original model not found for ${filePath}`);
    return;
  }
  
  // 确定使用的颜色方案
  const fileIndex = Array.from(allModelMap.keys()).indexOf(filePath);
  const colorScheme = colorSchemes[fileIndex % colorSchemes.length];
  
  // 创建简化模型
  const simplifiedModel = createSimplifiedModel(simplifiedNodes, colorScheme, originalModel);
  simplifiedModel.visible = true;
  
  // 确保简化模型位置与原始模型一致
  simplifiedModel.position.copy(originalModel.position);
  simplifiedModel.rotation.copy(originalModel.rotation);
  simplifiedModel.scale.copy(originalModel.scale);
  
  // 缓存简化模型
  neuronSimplificationState.simplifiedModels.set(cacheKey, simplifiedModel);
  
  // 隐藏原始模型，添加简化模型到场景
  originalModel.visible = false;
  scene.add(simplifiedModel);
}

/**
 * 重置神经元简化，恢复原始显示
 * @param {String} filePath 神经元文件路径
 * @param {Map} allModelMap 所有模型的映射
 * @param {THREE.Scene} scene THREE.js场景
 */
function resetNeuronSimplification(filePath, allModelMap, scene) {
  // 移除所有简化模型
  for (const [cacheKey, model] of neuronSimplificationState.simplifiedModels.entries()) {
    if (cacheKey.startsWith(filePath + '_')) {
      scene.remove(model);
      model.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      neuronSimplificationState.simplifiedModels.delete(cacheKey);
    }
  }
  
  // 恢复原始模型显示
  const originalModel = allModelMap.get(filePath);
  if (originalModel) {
    originalModel.visible = true;
  }
  
  // 清除当前简化级别
  neuronSimplificationState.currentSimplificationLevel.delete(filePath);
}

/**
 * 存储原始SWC节点数据
 * @param {String} filePath 神经元文件路径
 * @param {Array} nodes SWC节点数组
 */
function storeOriginalNodes(filePath, nodes) {
  neuronSimplificationState.originalNodes.set(filePath, nodes);
}

export {
  storeOriginalNodes,
  updateNeuronSimplification,
  resetNeuronSimplification,
  neuronSimplificationState
};
