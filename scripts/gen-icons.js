/**
 * gen-icons.js —— 生成扩展占位图标（纯 Node，无第三方依赖）
 *
 * 用法：node scripts/gen-icons.js
 * 输出：extension/icons/icon16.png / icon48.png / icon128.png
 *
 * 图标内容：圆角矩形 + 垂直渐变背景 + 白色「图片」图形（相框 + 太阳 + 山）。
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'extension', 'icons');
const SIZES = [16, 48, 128];

// ---------- CRC32 ----------
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // 每行前加 filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 绘制 ----------
function inRoundRect(px, py, s, r) {
  const c = s / 2;
  const dx = Math.abs(px - c);
  const dy = Math.abs(py - c);
  if (dx > c || dy > c) return false;
  const cx = dx - (c - r);
  const cy = dy - (c - r);
  if (cx <= 0 || cy <= 0) return true;
  return cx * cx + cy * cy <= r * r;
}

function isWhiteGlyph(nx, ny) {
  // 相框（描边矩形）
  const th = 0.05;
  const inFrame = nx >= 0.2 && nx <= 0.8 && ny >= 0.24 && ny <= 0.76;
  const nearEdge =
    inFrame && (nx <= 0.2 + th || nx >= 0.8 - th || ny <= 0.24 + th || ny >= 0.76 - th);
  if (nearEdge) return true;

  // 太阳（实心圆）
  const scx = 0.63;
  const scy = 0.4;
  const sr = 0.08;
  if ((nx - scx) * (nx - scx) + (ny - scy) * (ny - scy) <= sr * sr) return true;

  // 山（实心三角形）：顶点 (0.50,0.44)，底边 (0.28,0.70)-(0.72,0.70)
  const top = 0.44;
  const bottom = 0.7;
  if (ny >= top && ny <= bottom) {
    const halfWidth = ((ny - top) / (bottom - top)) * 0.22;
    if (Math.abs(nx - 0.5) <= halfWidth) return true;
  }
  return false;
}

function renderIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const r = Math.round(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundRect(x + 0.5, y + 0.5, size, r)) {
        px[i + 3] = 0;
        continue;
      }
      // 背景渐变：上 #6366f1 -> 下 #2563eb
      const t = y / size;
      px[i] = Math.round(99 + (37 - 99) * t);
      px[i + 1] = Math.round(102 + (99 - 102) * t);
      px[i + 2] = Math.round(241 + (235 - 241) * t);
      px[i + 3] = 255;

      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      if (isWhiteGlyph(nx, ny)) {
        px[i] = px[i + 1] = px[i + 2] = 255;
      }
    }
  }
  return px;
}

// ---------- 主流程 ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, 'icon' + size + '.png');
  fs.writeFileSync(file, encodePng(size, size, renderIcon(size)));
  console.log('已生成', file);
}
