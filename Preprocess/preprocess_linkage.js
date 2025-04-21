const fs = require('fs');

const inputPath = './public/linkage.csv'; // 修改成你的 linkage CSV 路径
const outputPath = './neuron_linkage.js';

const raw = fs.readFileSync(inputPath, 'utf-8');
const lines = raw.trim().split('\n');

// const linkage = lines.map(line => line.trim().split(/\s+/).map(Number));
const linkage = lines.map(line => line.trim().split(',').map(Number));


const arrayString = linkage.map(row => `[${row.join(', ')}]`).join(',\n');
const output = `export const linkage = [\n${arrayString}\n];\n`;
// const output = `export const linkage = ${JSON.stringify(linkage, null, 2)};\n`;

fs.writeFileSync(outputPath, output);
console.log('✅ neuron_linkage.js 已生成');
