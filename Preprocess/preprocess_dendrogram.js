import fs from 'fs';
import { labels } from './neuron_labels.js';
import { linkage } from './neuron_linkage.js';

const nodes = {};
const positions = {};
const leafSpacing = 3.0;

// 初始化叶子节点
const leafIds = Object.keys(labels).map(Number);
leafIds.forEach((id, i) => {
  const x = i * leafSpacing;
  const y = 0;
  positions[id] = { x, y };
  nodes[id] = { id, name: labels[id], x, y };
});

// 构建聚类树（按递增 id 分配新 cluster id）
let clusterId = Math.max(...leafIds) + 1;
const clusterMap = new Map(); // linkage 中可能有乱序 id，用 map 追踪新分配的 id

linkage.forEach(([i, j, dist]) => {
  const ni = clusterMap.get(i) ?? i;
  const nj = clusterMap.get(j) ?? j;

  const p1 = positions[ni];
  const p2 = positions[nj];
  const x = (p1.x + p2.x) / 2;
  const y = dist;

  positions[clusterId] = { x, y };
  nodes[clusterId] = {
    id: clusterId,
    name: `cluster_${clusterId}`,
    x,
    y,
    children: [nodes[ni], nodes[nj]]
  };

  clusterMap.set(i, clusterId);
  clusterMap.set(j, clusterId);
  clusterId++;
});

const dendrogram = nodes[clusterId - 1];

const output = `export const dendrogram = ${JSON.stringify(dendrogram, null, 2)};\n`;
fs.writeFileSync('neuron_dendrogram.js', output);
console.log('✅ neuron_dendrogram.js 已生成');
