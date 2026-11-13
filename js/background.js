/* 词源星图 · 星空背景：星尘 / 星云 / 银河 / 流星 / 暗角 */
(function (ES) {
  'use strict';
  const { mod, hash } = ES.util;

  class SkyBackground {
    constructor() {
      this.w = 0; this.h = 0; this.dpr = 1;
      this.stars = [];
      this.shooting = [];
      this.time = 0;
      this.nextShoot = 2.5 + Math.random() * 4;
      this.base = null;
      this.vignette = null;
    }

    resize(w, h, dpr) {
      if (this.w === w && this.h === h && this.dpr === dpr) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.buildStars();
      this.base = this.buildBase();
      this.vignette = this.buildVignette();
    }

    buildStars() {
      const area = this.w * this.h;
      const layers = [
        { count: Math.round(area / 7600), depth: 0.35, size: [0.45, 1.15], alpha: [0.18, 0.5] },
        { count: Math.round(area / 15000), depth: 0.7, size: [0.6, 1.7], alpha: [0.28, 0.72] },
        { count: Math.round(area / 42000), depth: 1.15, size: [0.9, 2.4], alpha: [0.45, 0.95] },
      ];
      const palette = ['#ffffff', '#dfe9ff', '#cfe4ff', '#ffe9c4', '#bcd6ff', '#e8ddff'];
      this.stars = [];
      for (const layer of layers) {
        for (let i = 0; i < layer.count; i++) {
          const t = Math.random();
          this.stars.push({
            x: Math.random() * this.w,
            y: Math.random() * this.h,
            depth: layer.depth,
            size: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
            a: layer.alpha[0] + Math.random() * (layer.alpha[1] - layer.alpha[0]),
            tw: 0.25 + Math.random() * 1.7,
            ph: Math.random() * Math.PI * 2,
            color: palette[Math.floor(t * palette.length)],
            flare: Math.random() < 0.045,
          });
        }
      }
    }

    buildBase() {
      const { w, h } = this;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      // 深空底色
      const bg = ctx.createLinearGradient(0, 0, w * 0.7, h);
      bg.addColorStop(0, '#02040c');
      bg.addColorStop(0.42, '#050b1c');
      bg.addColorStop(0.72, '#071022');
      bg.addColorStop(1, '#03060f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 星云团
      const blobs = [
        { x: 0.19, y: 0.30, r: 0.46, c1: [42, 92, 190, 0.20], c2: [28, 60, 150, 0] },
        { x: 0.80, y: 0.22, r: 0.38, c1: [118, 74, 190, 0.14], c2: [60, 40, 130, 0] },
        { x: 0.68, y: 0.76, r: 0.44, c1: [32, 132, 160, 0.11], c2: [20, 80, 110, 0] },
        { x: 0.37, y: 0.84, r: 0.35, c1: [150, 86, 150, 0.09], c2: [70, 40, 90, 0] },
        { x: 0.52, y: 0.48, r: 0.55, c1: [60, 90, 180, 0.06], c2: [20, 40, 90, 0] },
      ];
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * Math.max(w, h));
        g.addColorStop(0, `rgba(${b.c1.join(',')})`);
        g.addColorStop(1, `rgba(${b.c2.join(',')})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // 银河带
      const band = ctx.createLinearGradient(0, 0, w, h);
      band.addColorStop(0, 'rgba(90,120,200,0)');
      band.addColorStop(0.32, 'rgba(90,120,200,0.028)');
      band.addColorStop(0.48, 'rgba(150,170,255,0.06)');
      band.addColorStop(0.56, 'rgba(150,170,255,0.045)');
      band.addColorStop(0.72, 'rgba(90,120,200,0.025)');
      band.addColorStop(1, 'rgba(90,120,200,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h);

      // 细碎星尘（静态，增强层次）
      const dust = Math.round(w * h / 5200);
      for (let i = 0; i < dust; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = Math.random() * 0.18 + 0.03;
        ctx.fillStyle = `rgba(190,210,255,${a})`;
        ctx.fillRect(x, y, 0.7, 0.7);
      }
      return c;
    }

    buildVignette() {
      const { w, h } = this;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return c;
    }

    update(dt, cam) {
      this.time += dt;
      // 流星
      if (this.time > this.nextShoot) {
        this.nextShoot = this.time + 5 + Math.random() * 9;
        const fromLeft = Math.random() < 0.72;
        const x = fromLeft ? -40 : Math.random() * this.w * 0.7;
        const y = this.h * (0.06 + Math.random() * 0.42);
        const angle = (fromLeft ? 0.42 : 0.62) + Math.random() * 0.16;
        const speed = 780 + Math.random() * 420;
        this.shooting.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, maxLife: 0.9 + Math.random() * 0.5,
          len: 120 + Math.random() * 110,
        });
      }
      for (let i = this.shooting.length - 1; i >= 0; i--) {
        const s = this.shooting[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt / s.maxLife;
        if (s.life <= 0 || s.x > this.w + 200 || s.y > this.h + 200) this.shooting.splice(i, 1);
      }
    }

    draw(ctx, cam) {
      const { w, h } = this;
      if (this.base) ctx.drawImage(this.base, 0, 0, w, h);

      // 视差星
      const t = this.time;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const px = -cam.x * 0.014 * s.depth;
        const py = -cam.y * 0.014 * s.depth;
        const x = mod(s.x + px, w + 16) - 8;
        const y = mod(s.y + py, h + 16) - 8;
        const a = s.a * (0.58 + 0.42 * Math.sin(t * s.tw + s.ph));
        if (a <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = s.color;
        if (s.size < 1.05) {
          ctx.fillRect(x, y, s.size, s.size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, s.size * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
        if (s.flare && a > 0.42) {
          ctx.globalAlpha = Math.min(0.7, a * 0.7);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.7;
          const L = s.size * 3.2;
          ctx.beginPath();
          ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
          ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // 流星
      for (const s of this.shooting) {
        const a = Math.max(0, Math.sin(s.life * Math.PI));
        const nx = s.vx / Math.hypot(s.vx, s.vy);
        const ny = s.vy / Math.hypot(s.vx, s.vy);
        const g = ctx.createLinearGradient(s.x, s.y, s.x - nx * s.len, s.y - ny * s.len);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
        g.addColorStop(0.22, `rgba(190,225,255,${0.55 * a})`);
        g.addColorStop(1, 'rgba(150,190,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - nx * s.len, s.y - ny * s.len);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.vignette) ctx.drawImage(this.vignette, 0, 0, w, h);
    }
  }

  ES.SkyBackground = SkyBackground;
})(window.ES = window.ES || {});
