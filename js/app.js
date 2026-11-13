/* 词源星图 · 应用编排 */
(function (ES) {
  'use strict';
  const { clamp, escapeHtml, isMobile } = ES.util;

  const DATA = window.ETYMOLOGY_DATA || { meta: {}, roots: window.ETYMOLOGY_ROOTS || [] };
  const world = ES.buildWorld(DATA);

  class Progress {
    constructor() {
      this.key = 'etymology-sky.progress.v1';
      this.lit = new Set();
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) arr.forEach((id) => { if (world.planetById[id]) this.lit.add(id); });
        }
      } catch (e) { /* localStorage 不可用时静默 */ }
    }
    has(id) { return this.lit.has(id); }
    light(id) { this.lit.add(id); this.save(); }
    save() {
      try { localStorage.setItem(this.key, JSON.stringify([...this.lit])); } catch (e) { /* ignore */ }
    }
    reset() { this.lit.clear(); this.save(); }
    count() { return this.lit.size; }
    wordLit(word) { return word.planets.filter((p) => this.lit.has(p.id)).length; }
    rootLit(root) { return root.words.reduce((n, w) => n + this.wordLit(w), 0); }
  }

  const progress = new Progress();
  const cam = new ES.Camera();
  const bg = new ES.SkyBackground();
  const renderer = new ES.Renderer();

  const state = {
    view: 'overview',
    activeRootId: null,
    activeWordId: null,
    hover: null,
    currentPlanetId: null,
    lit: progress.lit,
  };

  // DOM
  const $ = (id) => document.getElementById(id);
  const canvas = $('sky');
  const ctx = canvas.getContext('2d');
  const introEl = $('intro');
  const startBtn = $('startBtn');
  const infoCard = $('infoCard');
  const rootNav = $('rootNav');
  const hint = $('hint');
  const toastEl = $('toast');
  const tooltip = $('tooltip');
  const progressCount = $('progressCount');
  const progressTotal = $('progressTotal');
  const progressPct = $('progressPct');
  const progressRing = $('progressRing');
  const soundBtn = $('soundBtn');
  const helpBtn = $('helpBtn');
  const helpModal = $('helpModal');
  const helpClose = $('helpClose');
  const resetBtn = $('resetBtn');
  const brand = $('brand');

  const panel = new ES.Panel({
    getLit: (id) => progress.has(id),
    onOpen: () => {
      document.body.classList.add('panel-open');
      cam.setSideInset(isMobile() ? 0 : 470);
    },
    onClose: () => {
      document.body.classList.remove('panel-open');
      cam.setSideInset(0);
      state.currentPlanetId = null;
      const w = state.activeWordId ? world.wordById[state.activeWordId] : null;
      if (w) cam.focus(w.x, w.y, isMobile() ? 1.12 : 1.24);
      updateHud();
    },
    onAnswer: (planet) => {
      if (progress.has(planet.id)) return;
      progress.light(planet.id);
      renderer.ignite(planet, planet.word);
      const word = planet.word;
      const root = word.root;
      const wordDone = progress.wordLit(word) === word.planets.length;
      const rootDone = progress.rootLit(root) === root.planetTotal;
      if (wordDone) {
        renderer.flashWord(word);
        toast(`词星 ${word.data.word} 点亮 ✦`);
        sound('correct');
      }
      if (rootDone) {
        burstAt(root.x, root.y, root.color, 46);
        setTimeout(() => toast(`星座「${root.data.root} · ${root.data.meaning}」完全点亮 ✦✦`), 750);
        sound('nova');
      }
      updateHud();
    },
    nextPlanet: (wordId, currentType) => {
      const word = world.wordById[wordId];
      if (!word) return null;
      const start = word.planets.findIndex((p) => p.type === currentType);
      for (let i = 1; i <= word.planets.length; i++) {
        const p = word.planets[(start + i) % word.planets.length];
        if (!progress.has(p.id)) return p;
      }
      return null;
    },
    toast: (msg) => toast(msg),
    sound: (kind) => sound(kind),
    openPlanet: (planet) => openPlanet(planet),
  });

  /* ---------------- 音效 ---------------- */
  let audioCtx = null;
  let soundOn = true;
  try { soundOn = localStorage.getItem('etymology-sky.sound') !== '0'; } catch (e) { /* ignore */ }

  function sound(kind) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const note = (freq, start, dur, type, gain) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + start);
        g.gain.linearRampToValueAtTime(gain || 0.04, now + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(now + start);
        o.stop(now + start + dur + 0.03);
      };
      if (kind === 'correct') {
        note(880, 0, 0.16, 'sine', 0.035);
        note(1318.5, 0.08, 0.26, 'sine', 0.03);
        note(1760, 0.16, 0.32, 'sine', 0.018);
      } else if (kind === 'wrong') {
        note(220, 0, 0.2, 'triangle', 0.045);
        note(174.6, 0.07, 0.24, 'triangle', 0.035);
      } else if (kind === 'nova') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.085, 0.55, 'sine', 0.026));
      } else if (kind === 'ui') {
        note(660, 0, 0.07, 'sine', 0.018);
      }
    } catch (e) { /* 音频不可用时静默 */ }
  }

  soundBtn.classList.toggle('muted', !soundOn);
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.classList.toggle('muted', !soundOn);
    try { localStorage.setItem('etymology-sky.sound', soundOn ? '1' : '0'); } catch (e) { /* ignore */ }
    if (soundOn) sound('ui');
    toast(soundOn ? '音效已开启' : '音效已关闭');
  });

  /* ---------------- 提示 / HUD ---------------- */
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function showInfo(html) {
    infoCard.innerHTML = html;
    infoCard.classList.add('show');
  }
  function hideInfo() { infoCard.classList.remove('show'); }

  function rootCardHtml(root) {
    const lit = progress.rootLit(root);
    return `
      <div class="card-kicker">词根档案 · ROOT</div>
      <h3>${escapeHtml(root.data.root)} <em>${escapeHtml(root.data.meaning)}</em></h3>
      <p class="origin">${escapeHtml(root.data.origin || '')}${root.data.variants ? ' · 变体 ' + escapeHtml(root.data.variants) : ''}</p>
      <p class="story">${escapeHtml(root.data.story || '')}</p>
      <div class="card-stats">
        <span>${root.words.length} 词星 · ${root.planetTotal} 行星</span>
        <span>已点亮 <b>${lit}</b> / ${root.planetTotal}</span>
      </div>`;
  }

  function wordCardHtml(word) {
    const wd = word.data;
    const lit = progress.wordLit(word);
    const chips = [];
    if (wd.prefix) chips.push(`<span class="chip prefix">${escapeHtml(wd.prefix)}<i>${escapeHtml(wd.prefixMeaning || '')}</i></span>`);
    chips.push(`<span class="chip root">${escapeHtml(word.root.data.root)}<i>${escapeHtml(word.root.data.meaning || '')}</i></span>`);
    if (wd.suffix) chips.push(`<span class="chip suffix">${escapeHtml(wd.suffix)}<i>${escapeHtml(wd.suffixMeaning || '')}</i></span>`);
    return `
      <div class="card-kicker">词星档案 · WORD</div>
      <h3>${escapeHtml(wd.word)} <span class="phonetic">${escapeHtml(wd.phonetic || '')}</span></h3>
      <p class="word-meaning">${escapeHtml(wd.pos || '')} ${escapeHtml(wd.meaning || '')}</p>
      <div class="breakdown">${chips.join('')}</div>
      <p class="literal">${escapeHtml(wd.literal || '')}</p>
      <div class="card-stats">
        <span>${escapeHtml(word.root.data.root)} 词根 · ${word.planets.length} 颗题型行星</span>
        <span>已点亮 <b>${lit}</b> / ${word.planets.length}</span>
      </div>`;
  }

  function refreshInfo() {
    if (!state.activeRootId) { hideInfo(); return; }
    if (state.activeWordId) {
      const w = world.wordById[state.activeWordId];
      if (w) showInfo(wordCardHtml(w));
      return;
    }
    const r = world.rootById[state.activeRootId];
    if (r) showInfo(rootCardHtml(r));
  }

  function updateHud() {
    const lit = progress.count();
    const total = world.totalPlanets;
    progressCount.textContent = lit;
    progressTotal.textContent = total;
    const pct = total ? Math.round((lit / total) * 100) : 0;
    progressPct.textContent = pct + '%';
    progressRing.style.setProperty('--p', pct);
    [...rootNav.children].forEach((chip) => {
      const root = world.rootById[chip.dataset.id];
      if (!root) return;
      chip.classList.toggle('active', state.activeRootId === root.id);
      const c = chip.querySelector('.chip-count');
      if (c) c.textContent = `${progress.rootLit(root)}/${root.planetTotal}`;
    });
    refreshInfo();
  }

  /* ---------------- 镜头与选择 ---------------- */
  function goOverview() {
    state.view = 'overview';
    state.activeRootId = null;
    state.activeWordId = null;
    state.currentPlanetId = null;
    state.hover = null;
    if (panel.isOpen()) panel.close();
    cam.setSideInset(0);
    cam.overview(world.bounds);
    hideInfo();
    updateHud();
    hint.textContent = '拖拽漫游 · 滚轮缩放 · 点击星辰进入星区';
    hideTooltip();
  }

  function focusRoot(root) {
    state.view = 'root';
    state.activeRootId = root.id;
    state.activeWordId = null;
    state.currentPlanetId = null;
    if (panel.isOpen()) panel.close();
    cam.setSideInset(0);
    const fitZoom = clamp(0.8 * Math.min(window.innerWidth, window.innerHeight) / 780, 0.34, 1.12);
    cam.focus(root.x, root.y, fitZoom);
    refreshInfo();
    updateHud();
    hint.textContent = '点击任意词星，查看它如何由前缀和词根组成';
    sound('ui');
  }

  function focusWord(word) {
    state.view = 'word';
    state.activeRootId = word.rootId;
    state.activeWordId = word.id;
    state.currentPlanetId = null;
    if (panel.isOpen()) panel.close();
    cam.setSideInset(0);
    cam.focus(word.x, word.y, 1.24);
    refreshInfo();
    updateHud();
    hint.textContent = '点击黯淡的行星，进入一段语段并答题';
    sound('ui');
  }

  function openPlanet(planet) {
    const word = planet.word;
    const root = word.root;
    state.view = 'word';
    state.activeRootId = root.id;
    state.activeWordId = word.id;
    state.currentPlanetId = planet.id;
    cam.setSideInset(isMobile() ? 0 : 470);
    cam.focus(word.x, word.y, isMobile() ? 1.32 : 1.62);
    refreshInfo();
    updateHud();
    hint.textContent = '读语段 · 选出答案 · 点亮行星';
    panel.open({ root, word, planet });
    hideTooltip();
  }

  function openPlanetById(wordId, type) {
    const p = world.planetById[`${wordId}:${type}`];
    if (p) openPlanet(p);
  }

  /* ---------------- 粒子爆发 ---------------- */
  function burstAt(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220;
      const life = 1.1 + Math.random() * 1.2;
      renderer.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life, maxLife: life,
        size: 1.2 + Math.random() * 2.4,
        color,
      });
    }
    renderer.rings.push({ x, y, r: 10, life: 1, color });
    renderer.flashes.push({ x, y, life: 1, color, wordId: null });
  }

  /* ---------------- 导航 ---------------- */
  function buildNav() {
    rootNav.innerHTML = '';
    world.roots.forEach((root) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'root-chip';
      chip.dataset.id = root.id;
      chip.innerHTML = `<b>${escapeHtml(root.data.root)}</b><i>${escapeHtml(root.data.meaning)}</i><span class="chip-count">0/0</span>`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        focusRoot(root);
      });
      rootNav.appendChild(chip);
    });
  }

  /* ---------------- 指针交互 ---------------- */
  const pointer = { down: false, moved: false, sx: 0, sy: 0, lx: 0, ly: 0, time: 0 };
  let hovered = null;

  function updateTooltip(hit, x, y) {
    if (!hit || panel.isOpen()) { hideTooltip(); return; }
    const node = hit.node;
    let html = '';
    if (hit.kind === 'planet') {
      const t = (ES.TYPE[node.type] || {}).name || '题型';
      html = `<b>${t}</b> · ${progress.has(node.id) ? '已点亮 ✦' : '未点亮'}`;
    } else if (hit.kind === 'word') {
      html = `<b>${escapeHtml(node.data.word)}</b> · ${escapeHtml(node.data.meaning || '')}`;
    } else {
      html = `<b>${escapeHtml(node.data.root)}</b> · ${escapeHtml(node.data.meaning || '')} · 词根恒星`;
    }
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y - 14 + 'px';
  }
  function hideTooltip() { tooltip.hidden = true; }

  function pickAt(x, y) { return renderer.pick(x, y, cam, world, state); }

  function handleHit(hit) {
    if (!hit) return;
    if (hit.kind === 'root') focusRoot(hit.node);
    else if (hit.kind === 'word') focusWord(hit.node);
    else if (hit.kind === 'planet') openPlanet(hit.node);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointer.down = true;
    pointer.moved = false;
    pointer.sx = pointer.lx = e.clientX;
    pointer.sy = pointer.ly = e.clientY;
    pointer.time = performance.now();
    canvas.style.cursor = 'grabbing';
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    const x = e.clientX, y = e.clientY;
    if (pointer.down) {
      const dx = x - pointer.lx, dy = y - pointer.ly;
      if (Math.hypot(x - pointer.sx, y - pointer.sy) > 5) pointer.moved = true;
      cam.panBy(dx, dy);
      pointer.lx = x; pointer.ly = y;
      hideTooltip();
      return;
    }
    const hit = pickAt(x, y);
    const hk = hit ? hit.kind + ':' + hit.id : null;
    const pk = hovered ? hovered.kind + ':' + hovered.id : null;
    if (hk !== pk) {
      hovered = hit ? { kind: hit.kind, id: hit.id } : null;
      state.hover = hovered;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
    updateTooltip(hit, x, y);
  });

  window.addEventListener('pointerup', (e) => {
    if (!pointer.down) return;
    pointer.down = false;
    canvas.style.cursor = 'grab';
    const wasClick = !pointer.moved && performance.now() - pointer.time < 650;
    if (!wasClick) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) handleHit(hit);
  });

  canvas.addEventListener('pointerleave', () => {
    hideTooltip();
    if (!pointer.down) state.hover = null;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0012);
    cam.zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  canvas.addEventListener('dblclick', (e) => {
    if (!pickAt(e.clientX, e.clientY)) goOverview();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!helpModal.hidden) { closeHelp(); return; }
      if (panel.isOpen()) { panel.close(); return; }
      if (state.view !== 'overview') goOverview();
      return;
    }
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) { openHelp(); return; }
    if (/^[1-6]$/.test(e.key)) {
      const root = world.roots[Number(e.key) - 1];
      if (root) focusRoot(root);
    }
  });

  /* ---------------- 帮助 / 重置 ---------------- */
  function openHelp() {
    helpModal.hidden = false;
    hideTooltip();
    sound('ui');
  }
  function closeHelp() { helpModal.hidden = true; }
  helpBtn.addEventListener('click', openHelp);
  helpClose.addEventListener('click', closeHelp);
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });

  resetBtn.addEventListener('click', () => {
    if (!window.confirm('确定要清空所有已点亮的行星吗？此操作不可撤销。')) return;
    progress.reset();
    renderer.particles.length = 0;
    renderer.rings.length = 0;
    renderer.flashes.length = 0;
    updateHud();
    toast('学习进度已重置，星图重新变暗');
    sound('ui');
  });

  brand.addEventListener('click', () => { goOverview(); sound('ui'); });

  /* ---------------- 开场 ---------------- */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    document.body.classList.remove('intro-open');
    introEl.classList.add('hidden');
    setTimeout(() => { introEl.style.display = 'none'; }, 950);
    goOverview();
    cam.jump(cam.tx, cam.ty, cam.zoom * 0.94);
    cam.overview(world.bounds);
    setTimeout(() => toast('点击任意词根恒星，进入一片星区'), 900);
    sound('ui');
  }
  startBtn.addEventListener('click', start);

  /* ---------------- 视口 / 主循环 ---------------- */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.setViewport(W, H);
    bg.resize(W, H, dpr);
    if (state.view === 'overview') cam.fit(world.bounds);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (state.view !== 'overview' && state.activeWordId) {
        const w = world.wordById[state.activeWordId];
        if (w) cam.focus(w.x, w.y, panel.isOpen() ? 1.62 : 1.24);
      }
    }, 120);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    cam.update(dt);
    bg.update(dt, cam);
    renderer.update(dt);
    ctx.clearRect(0, 0, W, H);
    bg.draw(ctx, cam);
    renderer.draw(ctx, cam, world, state);
    requestAnimationFrame(frame);
  }

  /* ---------------- 启动 ---------------- */
  resize();
  buildNav();
  updateHud();
  const statEls = document.querySelectorAll('.intro-stats b');
  if (statEls.length === 3) {
    statEls[0].textContent = world.totalRoots;
    statEls[1].textContent = world.totalWords;
    statEls[2].textContent = world.totalPlanets;
  }
  cam.setViewport(W, H);
  cam.overview(world.bounds, true);
  cam.zoom = cam.tzoom * 0.93;
  cam.x = cam.tx; cam.y = cam.ty;
  canvas.style.cursor = 'grab';

  if (!world.roots.length) {
    startBtn.textContent = '数据加载失败';
    startBtn.disabled = true;
    introEl.querySelector('.intro-sub').innerHTML = '词源数据没有成功载入，请检查 js/data.part1.js 与 js/data.part2.js。';
  }

  window.__ES__ = {
    state, world, camera: cam, progress, panel, renderer,
    focusRoot: (id) => { const r = world.rootById[id]; if (r) focusRoot(r); },
    focusWord: (id) => { const w = world.wordById[id]; if (w) focusWord(w); },
    openPlanet: openPlanetById,
    overview: goOverview,
    toast,
  };

  requestAnimationFrame(frame);
})(window.ES = window.ES || {});
