/**
 * App.jsx —— 电商图片提取下载扩展官网展示页
 * 纯静态单页，React + Tailwind，无需后端。
 */

const platforms = ['淘宝', '天猫', '京东', '拼多多', '拼多多商家版']

const features = [
  {
    title: '一键提取',
    desc: '详情页右下角悬浮「获取图片」按钮，点击即可扫描全部商品图。',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: '智能过滤',
    desc: '自动排除 logo、图标、占位图、1x1 像素与小于 100x100 的小图。',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V5H5v14h14v-1.586l2-2V20a1 1 0 01-1 1H4a1 1 0 01-1-1V4z',
  },
  {
    title: '集中勾选',
    desc: '新标签页网格化展示，每张图带缩略图、尺寸与复选框，支持全选 / 反选。',
    icon: 'M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1zm5 10.586l6.293-6.293 1.414 1.414L10 15.414l-3.707-3.707 1.414-1.414L10 13.586z',
  },
  {
    title: '批量下载 PNG',
    desc: '统一转换为 PNG 格式，文件名「商品图_001.png」补零排序，带进度与结果反馈。',
    icon: 'M12 3a1 1 0 011 1v9.586l2.293-2.293 1.414 1.414L12 17.414l-4.707-4.707 1.414-1.414L11 13.586V4a1 1 0 011-1zM5 19h14v2H5v-2z',
  },
]

const steps = [
  { title: '打开商品详情页', desc: '进入淘宝 / 京东 / 拼多多商家版的任意商品详情页。' },
  { title: '点击「获取图片」', desc: '页面右下角出现悬浮按钮，点击后自动扫描页面图片。' },
  { title: '勾选所需图片', desc: '在新标签页中预览缩略图与尺寸，勾选要下载的图片。' },
  { title: '下载为 PNG', desc: '点击「下载选中」，自动转换为 PNG 并保存到下载目录。' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <Nav />
      <Hero />
      <Platforms />
      <Features />
      <HowItWorks />
      <Install />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500" />
          <span className="text-lg font-bold">电商图片提取下载</span>
        </div>
        <a
          href="#install"
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          安装指南
        </a>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
      <p className="mx-auto mb-4 inline-block rounded-full bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-600">
        Chrome 浏览器扩展 · Manifest V3
      </p>
      <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
        一键提取电商商品图，批量下载为 PNG
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
        支持淘宝、天猫、京东、拼多多商家版。悬浮按钮一键扫描页面图片，自动过滤图标与占位图，
        集中勾选后统一转换为 PNG 下载到本地。
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <a
          href="#install"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
        >
          免费使用
        </a>
        <a
          href="#features"
          className="rounded-xl border border-slate-200 px-8 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          了解更多
        </a>
      </div>

      {/* 示意图（纯 CSS 模拟界面） */}
      <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-2 text-xs text-slate-400">gallery.html · 商品图片</span>
        </div>
        <div className="grid grid-cols-4 gap-3 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl text-indigo-400"
            >
              🖼
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-500">
          <span>已选 8 张</span>
          <span className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 font-semibold text-white">
            下载选中
          </span>
        </div>
      </div>
    </section>
  )
}

function Platforms() {
  return (
    <section className="border-y border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-12 text-center">
        <h2 className="text-2xl font-bold">支持平台</h2>
        <p className="mt-2 text-slate-500">覆盖主流电商平台的商品详情页</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {platforms.map((p) => (
            <span
              key={p}
              className="rounded-full border border-slate-200 bg-white px-6 py-2 font-medium text-slate-700 shadow-sm"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-2xl font-bold">核心功能</h2>
      <p className="mt-2 text-center text-slate-500">从提取到下载，全流程自动化</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d={f.icon} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="border-y border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold">使用流程</h2>
        <p className="mt-2 text-center text-slate-500">四步完成图片提取与下载</p>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Install() {
  return (
    <section id="install" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-2xl font-bold">安装步骤</h2>
      <p className="mt-2 text-center text-slate-500">无需打包，直接加载源码即可使用</p>
      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {[
          '下载本扩展源码目录（含 manifest.json 等全部文件）',
          '打开 Chrome，地址栏输入 chrome://extensions 并回车',
          '开启右上角「开发者模式」',
          '点击「加载已解压的扩展程序」，选择 extension 目录',
          '打开任意支持的电商商品详情页，右下角点击「获取图片」',
        ].map((text, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
              {i + 1}
            </span>
            <p className="text-slate-700">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-slate-400">
        <p>电商图片提取下载 · Chrome 扩展 · Manifest V3</p>
        <p className="mt-2">仅供学习与个人使用，请尊重图片版权。</p>
      </div>
    </footer>
  )
}
