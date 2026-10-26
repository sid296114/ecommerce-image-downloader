/**
 * gallery.js —— 图片展示与下载页
 *
 * 职责：
 *  1. 从 service worker 读取提取结果
 *  2. 网格化展示缩略图 + 尺寸 + 复选框
 *  3. 全选 / 反选 / 已选数量 / 下载选中
 *  4. 交给 service worker 批量下载（转 PNG），展示进度与结果
 */

const state = {
  images: [],
  selected: new Set(), // 存图片索引
};

const grid = document.getElementById('grid');
const emptyTip = document.getElementById('empty');
const totalCountEl = document.getElementById('totalCount');
const selectedCountEl = document.getElementById('selectedCount');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnInvert = document.getElementById('btnInvert');
const btnDownload = document.getElementById('btnDownload');

init();

async function init() {
  // 监听 service worker 回传的下载进度
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'PROGRESS') onProgress(msg);
  });

  const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES' });
  state.images = (resp && resp.images) || [];
  render();
}

function render() {
  grid.innerHTML = '';
  totalCountEl.textContent = state.images.length ? '共 ' + state.images.length + ' 张' : '';

  if (!state.images.length) {
    emptyTip.classList.remove('hidden');
    return;
  }
  emptyTip.classList.add('hidden');

  state.images.forEach((img, index) => {
    grid.appendChild(buildCard(img, index));
  });
  updateCount();
}

function buildCard(img, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.index = index;

  // 尺寸信息元素（提前声明，供 load 回调刷新）
  const sizeEl = document.createElement('span');
  sizeEl.className = 'size';
  sizeEl.textContent = img.width && img.height ? img.width + ' × ' + img.height : '尺寸未知';

  const idxEl = document.createElement('span');
  idxEl.className = 'idx';
  idxEl.textContent = '#' + String(index + 1).padStart(3, '0');

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.appendChild(sizeEl);
  meta.appendChild(idxEl);

  const imgEl = document.createElement('img');
  imgEl.className = 'thumb';
  imgEl.loading = 'lazy';
  imgEl.src = img.url;
  imgEl.alt = '商品图 ' + (index + 1);
  imgEl.addEventListener('error', () => imgEl.classList.add('broken'));
  imgEl.addEventListener('load', () => {
    if (imgEl.naturalWidth) {
      sizeEl.textContent = imgEl.naturalWidth + ' × ' + imgEl.naturalHeight;
    }
  });

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'check';
  check.addEventListener('change', () => {
    if (check.checked) state.selected.add(index);
    else state.selected.delete(index);
    card.classList.toggle('selected', check.checked);
    updateCount();
  });

  const wrap = document.createElement('div');
  wrap.className = 'thumb-wrap';
  wrap.appendChild(imgEl);
  wrap.appendChild(check);

  card.appendChild(wrap);
  card.appendChild(meta);

  // 点击卡片切换选中（点击复选框本身除外）
  card.addEventListener('click', (e) => {
    if (e.target === check) return;
    check.checked = !check.checked;
    check.dispatchEvent(new Event('change'));
  });

  return card;
}

function updateCount() {
  selectedCountEl.textContent = '已选 ' + state.selected.size + ' 张';
  btnDownload.disabled = state.selected.size === 0;
}

function setCheckbox(index, checked) {
  const card = grid.querySelector('.card[data-index="' + index + '"]');
  if (card) {
    const c = card.querySelector('.check');
    if (c) c.checked = checked;
    card.classList.toggle('selected', checked);
  }
}

// ---------- 顶部操作 ----------
btnSelectAll.addEventListener('click', () => {
  state.images.forEach((_, i) => {
    state.selected.add(i);
    setCheckbox(i, true);
  });
  updateCount();
});

btnInvert.addEventListener('click', () => {
  state.images.forEach((_, i) => {
    if (state.selected.has(i)) {
      state.selected.delete(i);
      setCheckbox(i, false);
    } else {
      state.selected.add(i);
      setCheckbox(i, true);
    }
  });
  updateCount();
});

btnDownload.addEventListener('click', async () => {
  const indexes = Array.from(state.selected).sort((a, b) => a - b);
  if (!indexes.length) return;

  // 生成文件名：商品图_序号.png，序号按选中顺序补零
  const pad = Math.max(3, String(indexes.length).length);
  const items = indexes.map((imgIndex, order) => ({
    url: state.images[imgIndex].url,
    filename: '商品图_' + String(order + 1).padStart(pad, '0') + '.png',
  }));

  // 进入下载状态
  btnDownload.disabled = true;
  progressWrap.classList.remove('hidden');
  setProgress(0, '开始下载（0/' + items.length + '）');

  const resp = await chrome.runtime.sendMessage({ type: 'DOWNLOAD', items });
  finishDownload(resp, items.length);
});

function onProgress(msg) {
  const done = msg.index + 1;
  const pct = Math.round((done / msg.total) * 100);
  setProgress(pct, '下载中 ' + done + '/' + msg.total);
}

function setProgress(pct, text) {
  progressFill.style.width = pct + '%';
  progressText.textContent = text;
}

function finishDownload(resp, total) {
  if (!resp || !resp.ok) {
    setProgress(100, '下载失败：' + (resp && resp.error ? resp.error : '未知错误'));
    btnDownload.disabled = false;
    return;
  }
  const results = resp.results || [];
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  const msg = '下载完成：成功 ' + okCount + ' 张' + (failCount ? '，失败 ' + failCount + ' 张' : '');
  setProgress(100, msg);

  if (failCount) {
    const fails = results.filter((r) => !r.ok).map((r) => '#' + (r.index + 1)).join('、');
    alert(msg + '\n失败项：' + fails);
  }
  btnDownload.disabled = state.selected.size === 0;
}
