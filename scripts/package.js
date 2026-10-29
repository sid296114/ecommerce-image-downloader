/**
 * package.js —— 将 extension/ 目录打包为 Chrome 扩展 ZIP（纯 Node，无第三方依赖）
 *
 * 用法：node scripts/package.js
 * 产物：website/public/ecom-image-downloader-v<manifest版本>.zip
 *       放在 public 下，vite build 时会自动复制进官网静态资源，供"下载扩展"按钮引用。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const extDir = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));

const outName = `ecom-image-downloader-v${manifest.version}.zip`;
const outDir = path.join(root, 'website', 'public');
const outPath = path.join(outDir, outName);

// ---------- CRC32（表驱动） ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- 收集 extension 下全部文件 ----------
const files = [];
function walk(dir, base) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(full, rel);
    else files.push({ name: rel, full });
  }
}
walk(extDir, '');

// ---------- 组装 ZIP（Deflate，UTF-8 文件名） ----------
const chunks = [];
const central = [];
let offset = 0;

for (const f of files) {
  const data = fs.readFileSync(f.full);
  const crc = crc32(data);
  const comp = zlib.deflateRawSync(data);
  const method = comp.length < data.length ? 8 : 0; // deflate，否则存储
  const stored = method === 8 ? comp : data;
  const nameBuf = Buffer.from(f.name, 'utf8');

  // Local File Header
  const lfh = Buffer.alloc(30);
  lfh.writeUInt32LE(0x04034b50, 0);  // signature
  lfh.writeUInt16LE(20, 4);          // version needed
  lfh.writeUInt16LE(0x0800, 6);      // flags: UTF-8 文件名
  lfh.writeUInt16LE(method, 8);
  lfh.writeUInt16LE(0, 10);          // mod time
  lfh.writeUInt16LE(0x21, 12);       // mod date
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(stored.length, 18);
  lfh.writeUInt32LE(data.length, 22);
  lfh.writeUInt16LE(nameBuf.length, 26);
  lfh.writeUInt16LE(0, 28);          // extra len

  chunks.push(lfh, nameBuf, stored);

  // Central Directory Header
  const cfh = Buffer.alloc(46);
  cfh.writeUInt32LE(0x02014b50, 0);  // signature
  cfh.writeUInt16LE(20, 4);          // version made by
  cfh.writeUInt16LE(20, 6);          // version needed
  cfh.writeUInt16LE(0x0800, 8);      // flags
  cfh.writeUInt16LE(method, 10);
  cfh.writeUInt16LE(0, 12);          // mod time
  cfh.writeUInt16LE(0x21, 14);       // mod date
  cfh.writeUInt32LE(crc, 16);
  cfh.writeUInt32LE(stored.length, 20);
  cfh.writeUInt32LE(data.length, 24);
  cfh.writeUInt16LE(nameBuf.length, 28);
  cfh.writeUInt16LE(0, 30);          // extra len
  cfh.writeUInt16LE(0, 32);          // comment len
  cfh.writeUInt16LE(0, 34);          // disk start
  cfh.writeUInt16LE(0, 36);          // internal attrs
  cfh.writeUInt32LE(0, 38);          // external attrs
  cfh.writeUInt32LE(offset, 42);     // local header offset

  central.push(cfh, nameBuf);
  offset += lfh.length + nameBuf.length + stored.length;
}

// End of Central Directory
const centralSize = central.reduce((s, b) => s + b.length, 0);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);   // signature
eocd.writeUInt16LE(0, 4);            // disk number
eocd.writeUInt16LE(0, 6);            // central dir start disk
eocd.writeUInt16LE(files.length, 8); // entries on this disk
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);           // comment len

fs.mkdirSync(outDir, { recursive: true });
const fd = fs.openSync(outPath, 'w');
for (const b of [...chunks, ...central, eocd]) fs.writeSync(fd, b);
fs.closeSync(fd);

const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓ 打包完成：${outName}`);
console.log(`  文件数：${files.length}，大小：${sizeKB} KB`);
console.log(`  输出：${path.relative(root, outPath)}`);
