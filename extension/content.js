/**
 * content.js —— 电商图片提取扩展（内容脚本）
 *
 * 职责：
 *  1. 仅在商品详情页注入「获取图片」悬浮按钮
 *  2. 点击后扫描页面内所有商品相关图片
 *  3. 过滤小图 / 图标 / logo / 占位图，去重并补全为绝对地址
 *  4. 通过 chrome.runtime.sendMessage 把结果交给 service worker
 */
(() => {
  // 防止脚本被重复注入（SPA 页面可能反复执行）
  if (window.__ecomImgExtInjected) return;
  window.__ecomImgExtInjected = true;

  // ============ 常量 ============
  const MIN_SIZE = 100; // 宽高都小于该值的图片会被过滤
  const BUTTON_ID = 'ecom-img-ext-btn';

  // 明显是图标 / logo / 占位图等非商品图的 URL 关键词（启发式过滤）
  const JUNK_RE =
    /(logo|icon|avatar|placeholder|spacer|blank|loading|pixel|sprite|share|qr[-_]?code|barcode|shopping[-_]?cart|(^|[-_/])btn|(^|[-_/])button|arrow|cart|guide|transparent)/i;

  // ============ 详情页判定 ============
  function isDetailPage() {
    const url = location.href.toLowerCase();
    const host = location.hostname;

    // 淘宝 / 天猫：https://item.taobao.com/item.htm?... 或 https://detail.tmall.com/item.htm?...
    if (/\.(taobao|tmall)\.com$/.test(host) && url.includes('/item.htm')) return true;

    // 京东：https://item.jd.com/100012345678.html 或 https://item.m.jd.com/product/...
    if (host === 'item.jd.com' || host === 'item.m.jd.com') return true;

    // 拼多多商家版：https://mms.pinduoduo.com/goods/goods_detail?goods_id=...
    if (host === 'mms.pinduoduo.com' && /goods[/_-]?detail/i.test(url)) return true;

    // 拼多多 C 端 / 商家：https://mobile.yangkeduo.com/goods.html?goods_id=...
    if (/\.(pinduoduo|yangkeduo)\.com$/.test(host) && (/goods\.html/.test(url) || /goods_id=/.test(url))) return true;

    return false;
  }

  // ============ 工具函数 ============
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 从 CSS url(...) 字符串里提取所有图片地址
  function extractUrlsFromCss(css) {
    if (!css) return [];
    const urls = [];
    const re = /url\(\s*(["']?)(.*?)\1\s*\)/g;
    let m;
    while ((m = re.exec(css)) !== null) {
      if (m[2]) urls.push(m[2]);
    }
    return urls;
  }

  // 从 srcset 里挑最大的一张（w 描述符取数值最大；x 描述符取最大倍率；无描述符按 1x 处理）
  function pickLargestFromSrcset(srcset) {
    if (!srcset) return null;
    const parts = srcset.split(',').map((s) => s.trim()).filter(Boolean);
    let best = null;
    let bestVal = -1;
    for (const part of parts) {
      const seg = part.split(/\s+/);
      const url = seg[0];
      const desc = seg[1];
      let val = 1;
      if (desc) {
        if (desc.endsWith('w')) val = parseFloat(desc) || 0;
        else if (desc.endsWith('x')) val = (parseFloat(desc) || 1) * 10000;
      }
      if (val >= bestVal) {
        bestVal = val;
        best = url;
      }
    }
    return best;
  }

  // 判断 URL 是否是明显的图标 / logo / 占位图
  function isJunkUrl(url) {
    let path;
    try {
      path = new URL(url).pathname;
    } catch {
      return false;
    }
    return JUNK_RE.test(path);
  }

  // 测量图片真实尺寸（加载失败时返回 null，交给后续处理，避免误删）
  function measureImage(url) {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      let timer;
      const done = (result) => {
        clearTimeout(timer);
        img.onload = img.onerror = null;
        resolve(result);
      };
      timer = setTimeout(() => done(null), 6000);
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done(null);
      img.src = url;
    });
  }

  // ============ 图片收集 ============
  function collectCandidates() {
    const seen = new Set();
    const candidates = [];

    const add = (rawUrl, source) => {
      if (!rawUrl) return;
      let abs;
      try {
        abs = new URL(rawUrl, location.href).href;
      } catch {
        return;
      }
      if (!/^https?:/i.test(abs)) return; // 只保留 http/https
      if (seen.has(abs)) return; // 去重
      seen.add(abs);
      candidates.push({ url: abs, source });
    };

    // 1) <img> 标签
    document.querySelectorAll('img').forEach((img) => {
      // currentSrc 是浏览器根据 srcset 选定的实际地址，优先收集
      add(img.currentSrc, 'img');
      add(img.getAttribute('src'), 'img');

      const srcset = img.getAttribute('srcset');
      if (srcset) add(pickLargestFromSrcset(srcset), 'img-srcset');

      // 常见懒加载属性兼容
      const lazyAttrs = ['data-src', 'data-lazy-src', 'data-original', 'data-url', 'data-echo', 'data-actualsrc'];
      lazyAttrs.forEach((attr) => add(img.getAttribute(attr), 'img-' + attr));

      // 懒加载 srcset
      add(pickLargestFromSrcset(img.getAttribute('data-srcset')), 'img-data-srcset');
    });

    // 2) <picture><source>
    document.querySelectorAll('picture source').forEach((src) => {
      add(pickLargestFromSrcset(src.getAttribute('srcset')), 'source');
      add(src.getAttribute('src'), 'source');
    });

    // 3) 背景图：内联 style 遍历全部；计算样式只针对常见容器，避免全页 getComputedStyle 过慢
    document.querySelectorAll('div,li,span,section,a,figure,td,ul,ol,p,body').forEach((el) => {
      const inline = el.style && el.style.backgroundImage;
      if (inline && inline !== 'none') {
        extractUrlsFromCss(inline).forEach((u) => add(u, 'bg-inline'));
      }
      const cs = getComputedStyle(el);
      const bg = cs && cs.backgroundImage;
      if (bg && bg !== 'none') {
        extractUrlsFromCss(bg).forEach((u) => add(u, 'bg-computed'));
      }
    });

    return candidates;
  }

  // ============ 懒加载触发 ============
  // 分段滚动到底再回顶，触发 data-src / data-lazy-src 等懒加载图片
  async function triggerLazyLoad() {
    const originalY = window.scrollY;
    const step = window.innerHeight || 800;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let y = 0;
    let guard = 0;
    while (y < maxY && guard < 200) {
      y = Math.min(y + step, maxY);
      window.scrollTo(0, y);
      await sleep(120);
      guard++;
    }
    window.scrollTo(0, originalY);
    await sleep(200);
  }

  // ============ 过滤 ============
  async function filterImages(candidates) {
    const out = [];
    await Promise.all(
      candidates.map(async (c) => {
        if (isJunkUrl(c.url)) return; // 关键词过滤图标 / logo / 占位图
        const dims = await measureImage(c.url);
        if (dims) {
          // 1x1 像素图
          if (dims.width <= 1 && dims.height <= 1) return;
          // 宽高都小于 100 的小图
          if (dims.width < MIN_SIZE && dims.height < MIN_SIZE) return;
        }
        out.push({
          url: c.url,
          width: dims ? dims.width : 0,
          height: dims ? dims.height : 0,
          source: c.source,
        });
      })
    );
    return out;
  }

  // ============ 注入按钮 ============
  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = '获取图片';
    btn.title = '提取本页所有商品图片';
    btn.addEventListener('click', onGetImages);
    (document.body || document.documentElement).appendChild(btn);
  }

  // ============ 主流程 ============
  async function onGetImages() {
    const btn = document.getElementById(BUTTON_ID);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '提取中…';
    try {
      // 1. 触发懒加载
      await triggerLazyLoad();
      // 2. 收集候选图片
      const candidates = collectCandidates();
      // 3. 过滤
      const images = await filterImages(candidates);
      if (!images.length) {
        alert('未找到商品图片，请确认当前为商品详情页。');
        return;
      }
      // 4. 交给 service worker 保存，并打开 gallery
      const saved = await chrome.runtime.sendMessage({ type: 'SAVE_IMAGES', images });
      if (saved && saved.ok) {
        await chrome.runtime.sendMessage({ type: 'OPEN_GALLERY' });
      } else {
        throw new Error(saved && saved.error ? saved.error : '保存图片失败');
      }
    } catch (err) {
      console.error('[电商图片提取] 失败：', err);
      alert('图片提取失败：' + (err && err.message ? err.message : err));
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // ============ 入口 ============
  if (isDetailPage()) {
    if (document.body) {
      injectButton();
    } else {
      document.addEventListener('DOMContentLoaded', injectButton);
    }
  }

  // SPA 路由变化时重新判断（部分站点用 history 切换页面）
  let lastUrl = location.href;
  function checkAgain() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (isDetailPage()) injectButton();
  }
  window.addEventListener('hashchange', checkAgain);
  window.addEventListener('popstate', checkAgain);
})();
