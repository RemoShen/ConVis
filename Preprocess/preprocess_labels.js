// const fs = require('fs'); 
import fs from 'fs';

const raw = fs.readFileSync('./public/labels.csv', 'utf-8');
const lines = raw.trim().split('\n');

const labelObj = {};

lines.forEach(line => {
  const [id, value] = line.trim().split(/\s+/);
  // labelObj[id] = value;
  labelObj[Number(id)] = value;
});

const output = `export const labels = ${JSON.stringify(labelObj, null, 2)};\n`;

fs.writeFileSync('./neuron_labels.js', output);
console.log('✅ neuron_labels.js 已生成');
