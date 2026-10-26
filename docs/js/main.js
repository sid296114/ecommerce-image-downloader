/* ============================================================
   图提取 ImageGrab 官网交互脚本
   功能：
   1. 滚动进入视口时元素淡入上移（IntersectionObserver）
   2. 导航栏吸顶阴影 + 当前区块高亮（scroll 监听）
   3. 移动端汉堡菜单开合
   ============================================================ */

(function () {
  'use strict';

  // ---------- 1. 进入视口淡入上移动画 ----------
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // 触发一次后不再监听，避免重复
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    // 兜底：不支持 IntersectionObserver 时直接显示
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // ---------- 2. 导航栏吸顶阴影 + 滚动高亮 ----------
  const navbar = document.getElementById('navbar');
  const navLinks = Array.from(document.querySelectorAll('.nav__link'));
  // 需要监听高亮的区块（与导航锚点对应）
  const sections = Array.from(
    document.querySelectorAll('main section[id]')
  );

  function onScroll() {
    // 吸顶阴影
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // 当前区块高亮（取视口上部约 1/3 处的区块）
    const probe = window.scrollY + window.innerHeight / 3;
    let currentId = null;
    sections.forEach((sec) => {
      if (sec.offsetTop <= probe) currentId = sec.id;
    });

    navLinks.forEach((link) => {
      const targetId = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', targetId === currentId);
    });
  }

  // 节流，避免频繁触发
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  });
  onScroll(); // 初始执行一次

  // ---------- 3. 移动端汉堡菜单 ----------
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');

  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  });

  // 点击导航链接后收起菜单（移动端）
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', '打开菜单');
    });
  });
})();
