const fs = require('fs');
const path = require('path');

const src = path.join(
  'C:',
  'Users',
  '82104',
  'Documents',
  '카카오톡 받은 파일',
  'SimpleSynthTree-web-fork_V2',
  'SimpleSynthTree-web-fork',
  'src',
  'main.js'
);
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const body = lines.slice(984, 1546).join('\n');

let fixed = body
  .replace(/function createTreePointCloud/, 'export function createTreePointCloud')
  .replace(/\s*latestRenderPointCount = finalRenderPoints\.length;\s*\n/, '\n')
  .replace(/\s*treeStartTarget\.set\(0, 0, 0\);\s*\n/, '\n');

const header = `import * as THREE from 'three';

/**
 * Fork: SimpleSynthTree main.js — createTreePointCloud (outline/skeleton/original).
 * colorState: { trunkFill, trunkLine } (hex strings)
 */
`;

const wrapped = `${header}
${fixed}
`;

const outDir = path.join(__dirname, '..', 'components', 'wall', 'synthTree');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'treePointCloud.js'), wrapped);
console.log('written', path.join(outDir, 'treePointCloud.js'));
