/**
 * background.js —— Service Worker（Manifest V3）
 *
 * 职责：
 *  1. 消息转发（保存图片列表 / 读取列表 / 打开 gallery）
 *  2. 图片转 PNG（fetch + createImageBitmap + OffscreenCanvas，规避跨域）
 *  3. 执行 chrome.downloads.download 批量下载，并回传进度
 */

const LIST_KEY = 'imageList';

// 监听来自 content.js 与 gallery.js 的消息
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
  return true; // 保持消息通道打开以支持异步响应
});

async function handleMessage(msg) {
  if (!msg || !msg.type) return { ok: false, error: '未知消息' };

  switch (msg.type) {
    case 'SAVE_IMAGES':
      await chrome.storage.session.set({ [LIST_KEY]: msg.images || [] });
      return { ok: true, count: (msg.images || []).length };

    case 'GET_IMAGES': {
      const data = await chrome.storage.session.get(LIST_KEY);
      return { ok: true, images: data[LIST_KEY] || [] };
    }

    case 'OPEN_GALLERY':
      await chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
      return { ok: true };

    case 'DOWNLOAD':
      return await downloadBatch(msg.items || []);

    default:
      return { ok: false, error: '未支持的消息类型：' + msg.type };
  }
}

// ============ 批量下载 ============
async function downloadBatch(items) {
  const total = items.length;
  const results = [];
  for (let i = 0; i < total; i++) {
    const item = items[i];
    let result;
    try {
      // 统一转成 PNG dataURL 再下载，保证文件名 .png 与内容一致
      const dataUrl = await fetchAndConvertToPng(item.url);
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: item.filename,
        conflictAction: 'uniquify', // 重名时自动追加序号，避免覆盖
      });
      result = { index: i, ok: true, id: downloadId };
    } catch (err) {
      result = { index: i, ok: false, error: String((err && err.message) || err) };
    }
    results.push(result);
    // 回传进度给 gallery
    broadcast({ type: 'PROGRESS', index: i, total, result });
  }
  return { ok: true, results };
}

// fetch 图片 → 解码 → 画到 OffscreenCanvas → 输出 PNG dataURL
async function fetchAndConvertToPng(url) {
  const resp = await fetch(url, { credentials: 'omit' });
  if (!resp.ok) throw new Error('图片请求失败 HTTP ' + resp.status);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    const buf = await pngBlob.arrayBuffer();
    return 'data:image/png;base64,' + arrayBufferToBase64(buf);
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

// ArrayBuffer → base64（分块处理，避免大图导致调用栈溢出）
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// 广播进度消息（gallery 通过 onMessage 接收）
function broadcast(payload) {
  try {
    chrome.runtime.sendMessage(payload).catch(() => {});
  } catch (_) {
    /* 忽略：无接收方时不报错 */
  }
}
