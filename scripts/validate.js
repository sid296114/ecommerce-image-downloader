/**
 * validate.js —— 校验扩展文件（纯 Node，无第三方依赖）
 *
 * 1. 解析并检查 manifest.json
 * 2. 用 node --check 校验所有 JS 语法
 * 3. 检查 manifest 引用的图标文件是否存在
 *
 * 用法：node scripts/validate.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const extDir = path.join(root, 'extension');

let failed = false;

function ok(msg) {
  console.log('  ✓ ' + msg);
}
function fail(msg) {
  failed = true;
  console.error('  ✗ ' + msg);
}

// ---------- 1. manifest.json ----------
const manifestPath = path.join(extDir, 'manifest.json');
console.log('1) manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  ok('JSON 解析成功：' + manifest.name + ' v' + manifest.version);
} catch (e) {
  fail('JSON 解析失败：' + e.message);
  process.exit(1);
}

// 关键字段检查
const requiredFields = ['manifest_version', 'name', 'version', 'background', 'content_scripts'];
for (const f of requiredFields) {
  if (manifest[f] === undefined) fail('缺少字段：' + f);
  else ok('字段存在：' + f);
}

if (manifest.manifest_version !== 3) fail('manifest_version 应为 3，当前为 ' + manifest.manifest_version);

// ---------- 2. JS 语法校验 ----------
console.log('2) JS 语法校验');
const jsFiles = [
  path.join(extDir, 'background.js'),
  path.join(extDir, 'content.js'),
  path.join(extDir, 'gallery.js'),
  path.join(__dirname, 'gen-icons.js'),
  path.join(__dirname, 'validate.js'),
];
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    ok(path.relative(root, f));
  } catch (e) {
    fail(path.relative(root, f) + ' 语法错误：\n' + (e.stderr ? e.stderr.toString() : e.message));
  }
}

// ---------- 3. 图标文件检查 ----------
console.log('3) 图标文件检查');
const iconPaths = [
  (manifest.icons && manifest.icons['16']) || '',
  (manifest.icons && manifest.icons['48']) || '',
  (manifest.icons && manifest.icons['128']) || '',
].filter(Boolean);
if (!iconPaths.length) {
  console.log('  - manifest 未声明图标（可正常加载，Chrome 显示默认图标）');
} else {
  for (const p of iconPaths) {
    const abs = path.join(extDir, p);
    if (fs.existsSync(abs)) ok(p);
    else fail('图标缺失：' + p + '（请运行 node scripts/gen-icons.js）');
  }
}

console.log('');
if (failed) {
  console.error('校验未通过，存在错误。');
  process.exit(1);
} else {
  console.log('校验通过，所有检查均正常。');
}
