/* 词源星图 · 渲染器：星图 / 连线 / 行星 / 粒子 */
(function (ES) {
  'use strict';
  const { clamp, rgba, mod } = ES.util;
  const FONT_SERIF = '600 15px Georgia, "Times New Roman", "Songti SC", serif';
  const FONT_SERIF_SM = '600 12.5px Georgia, "Times New Roman", "Songti SC", serif';
  const FONT_SANS = '10.5px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  const FONT_SANS_XS = '9.5px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

  const spriteCache = new Map();
  function glowSprite(color) {
    if (spriteCache.has(color)) return spriteCache.get(color);
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rgb = ES.util.hexToRgb(color);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.10, `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`);
    g.addColorStop(0.30, `rgba(${rgb.r},${rgb.g},${rgb.b},0.32)`);
    g.addColorStop(0.62, `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)`);
    g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    spriteCache.set(color, c);
    return c;
  }

  function setFont(ctx, font, spacing) {
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing || '0px';
  }

  function quadPoint(a, c, b, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
      y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
    };
  }

  class Renderer {
    constructor() {
      this.time = 0;
      this.particles = [];
      this.rings = [];
      this.flashes = [];
    }

    update(dt) {
      this.time += dt;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 - 4 * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.r += 110 * dt;
        r.life -= dt * 1.5;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
      for (let i = this.flashes.length - 1; i >= 0; i--) {
        const f = this.flashes[i];
        f.life -= dt * 1.8;
        if (f.life <= 0) this.flashes.splice(i, 1);
      }
    }

    ignite(planet, word) {
      const color = planet.color;
      const n = 30;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 110;
        const life = 0.6 + Math.random() * 0.9;
        this.particles.push({
          x: planet.x, y: planet.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life, maxLife: life,
          size: 1 + Math.random() * 2.1,
          color,
        });
      }
      this.rings.push({ x: planet.x, y: planet.y, r: 4, life: 1, color });
      this.flashes.push({ x: word.x, y: word.y, life: 1, color: word.color, wordId: word.id });
    }

    flashWord(word) {
      this.flashes.push({ x: word.x, y: word.y, life: 1, color: word.color, wordId: word.id });
    }

    pick(mx, my, cam, world, state) {
      const z = cam.zoom;
      const planetsVisible = z > 0.36 || !!state.activeWordId;
      let best = null, bestD = Infinity;
      if (planetsVisible) {
        for (const p of world.planets) {
          const s = cam.worldToScreen(p.x, p.y);
          const d = Math.hypot(mx - s.x, my - s.y);
          if (d < clamp(9 + z * 4, 10, 16) && d < bestD) { best = { kind: 'planet', id: p.id, node: p }; bestD = d; }
        }
        if (best) return best;
      }
      for (const w of world.words) {
        const s = cam.worldToScreen(w.x, w.y);
        const d = Math.hypot(mx - s.x, my - s.y);
        if (d < clamp(12 + z * 3, 12, 20) && d < bestD) { best = { kind: 'word', id: w.id, node: w }; bestD = d; }
      }
      if (best) return best;
      for (const r of world.roots) {
        const s = cam.worldToScreen(r.x, r.y);
        const d = Math.hypot(mx - s.x, my - s.y);
        if (d < clamp(22 + z * 4, 22, 34) && d < bestD) { best = { kind: 'root', id: r.id, node: r }; bestD = d; }
      }
      return best;
    }

    draw(ctx, cam, world, state) {
      const z = cam.zoom;
      const t = this.time;
      for (const root of world.roots) {
        const isActive = state.activeRootId === root.id;
        const dim = state.activeRootId && !isActive ? 0.26 : 1;

        // 星区薄雾与星尘，让每片星座像一片真实的星空
        this.drawHaze(ctx, cam, root, dim, isActive, z);
        this.drawDust(ctx, cam, root, dim, z);

        // 连线
        for (const word of root.words) {
          const litN = word.planets.filter((p) => state.lit.has(p.id)).length;
          const progress = word.planets.length ? litN / word.planets.length : 0;
          this.drawLink(ctx, cam, root, word, dim, progress, isActive && z > 0.55);
        }

        // 行星轨道 + 行星
        const planetsVisible = z > 0.36 || !!state.activeWordId;
        if (planetsVisible) {
          for (const word of root.words) {
            this.drawOrbit(ctx, cam, word, dim);
          }
          for (const planet of world.planets) {
            if (planet.rootId !== root.id) continue;
            this.drawPlanet(ctx, cam, planet, state, dim, z);
          }
        }

        // 词星
        for (const word of root.words) {
          this.drawWord(ctx, cam, word, state, dim, z, isActive);
        }

        // 词根恒星
        const litN = root.words.reduce((n, w) => n + w.planets.filter((p) => state.lit.has(p.id)).length, 0);
        this.drawRoot(ctx, cam, root, state, dim, z, isActive, litN);

        // 标签
        this.drawLabels(ctx, cam, root, state, dim, z, isActive);
      }

      this.drawParticles(ctx, cam);
    }

    drawHaze(ctx, cam, root, dim, isActive, z) {
      const p = cam.worldToScreen(root.x, root.y);
      const R = 520 * clamp(z, 0.7, 1.5);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      const a1 = Math.min(0.34, (isActive ? 0.16 : 0.08) * dim);
      g.addColorStop(0, rgba(root.color, a1));
      g.addColorStop(0.45, rgba(root.color, a1 * 0.34));
      g.addColorStop(1, rgba(root.color, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
      ctx.restore();
    }

    drawDust(ctx, cam, root, dim, z) {
      if (!root.dust || z < 0.16) return;
      const W = cam.w, H = cam.h;
      ctx.save();
      for (const d of root.dust) {
        const s = cam.worldToScreen(d.x, d.y);
        if (s.x < -8 || s.x > W + 8 || s.y < -8 || s.y > H + 8) continue;
        ctx.globalAlpha = d.a * dim * (0.65 + 0.35 * Math.sin(this.time * 0.7 + d.ph));
        ctx.fillStyle = d.color || '#cfe4ff';
        ctx.fillRect(s.x, s.y, d.s, d.s);
      }
      ctx.restore();
    }

    drawLink(ctx, cam, root, word, dim, progress, showFlow) {
      const a = cam.worldToScreen(root.x, root.y);
      const b = cam.worldToScreen(word.x, word.y);
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) return;
      const nx = -dy / dist, ny = dx / dist;
      const curve = word.curve * dist;
      const c = { x: (a.x + b.x) / 2 + nx * curve, y: (a.y + b.y) / 2 + ny * curve };
      const alpha = (0.52 + progress * 0.36) * dim * (cam.zoom < 0.45 ? 0.72 : 1);
      ctx.save();
      ctx.lineWidth = progress >= 1 ? 1.7 : 1.15;
      ctx.shadowColor = rgba(word.color, 0.5);
      ctx.shadowBlur = progress >= 1 ? 9 : 5;
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, rgba(word.color, 0.10 + progress * 0.28));
      grad.addColorStop(1, rgba(progress >= 1 ? '#ffd479' : word.color, 0.42 + progress * 0.38));
      ctx.strokeStyle = grad;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.stroke();

      // 前缀方向的小字（线上）
      if (cam.zoom > 0.72) {
        const mid = quadPoint(a, c, b, 0.52);
        const label = word.data.prefix || '';
        if (label) {
          setFont(ctx, FONT_SANS_XS, '0.5px');
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = rgba(word.color, 0.9);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const angle = Math.atan2(dy, dx);
          ctx.save();
          ctx.translate(mid.x, mid.y - 8);
          if (Math.abs(angle) > Math.PI / 2) ctx.rotate(angle + Math.PI);
          else ctx.rotate(angle);
          ctx.fillText(label, 0, 0);
          if (word.data.prefixMeaning) {
            ctx.fillStyle = 'rgba(160,185,220,.65)';
            setFont(ctx, FONT_SANS_XS, '0.5px');
            ctx.fillText(word.data.prefixMeaning, 0, 11);
          }
          ctx.restore();
        }
      }

      // 能量流
      if (showFlow) {
        for (let k = 0; k < 2; k++) {
          const tt = mod(this.time * 0.11 + word.index * 0.16 + k * 0.5, 1);
          const p = quadPoint(a, c, b, tt);
          ctx.globalAlpha = dim * 0.65 * (1 - Math.abs(tt - 0.5) * 0.8);
          ctx.fillStyle = rgba('#ffffff', 0.9);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawOrbit(ctx, cam, word, dim) {
      const p = cam.worldToScreen(word.x, word.y);
      const r = 62 * cam.zoom;
      if (r < 12) return;
      ctx.save();
      ctx.globalAlpha = 0.26 * dim;
      ctx.strokeStyle = 'rgba(150,184,255,.8)';
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawRoot(ctx, cam, root, state, dim, z, isActive, litN) {
      const p = cam.worldToScreen(root.x, root.y);
      const pulse = 0.86 + 0.14 * Math.sin(this.time * 1.5 + root.index * 1.7);
      const total = root.planetTotal || 1;
      const progress = litN / total;
      const glowR = (nameScale(z) * 88 + (isActive ? 24 : 0)) * pulse;
      ctx.save();
      ctx.globalAlpha = dim;
      ctx.globalCompositeOperation = 'lighter';
      const sprite = glowSprite(root.color);
      ctx.drawImage(sprite, p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);
      ctx.globalCompositeOperation = 'source-over';

      // 核心
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = root.color;
      ctx.shadowBlur = 22 * clamp(z, 0.7, 1.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, clamp(5.2 * z, 2.3, 7), 0, Math.PI * 2);
      ctx.fill();

      // 十字星芒
      const L = (20 + (isActive ? 9 : 0)) * clamp(z, 0.7, 1.3) * pulse;
      ctx.strokeStyle = rgba('#ffffff', 0.62);
      ctx.lineWidth = 1;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y);
      ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L);
      ctx.stroke();
      const L2 = L * 0.5;
      ctx.strokeStyle = rgba(root.color, 0.75);
      ctx.beginPath();
      ctx.moveTo(p.x - L2 * 2, p.y - L2 * 2); ctx.lineTo(p.x + L2 * 2, p.y + L2 * 2);
      ctx.moveTo(p.x + L2 * 2, p.y - L2 * 2); ctx.lineTo(p.x - L2 * 2, p.y + L2 * 2);
      ctx.globalAlpha = dim * 0.5;
      ctx.stroke();
      ctx.globalAlpha = dim;
      ctx.shadowBlur = 0;

      // 选中旋转环
      if (isActive) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.time * 0.25);
        ctx.setLineDash([3, 8]);
        ctx.strokeStyle = rgba(root.color, 0.55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 36 * clamp(z, 0.6, 1.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 进度环
      if (progress > 0) {
        ctx.strokeStyle = 'rgba(255,212,121,.8)';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#ffd479';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30 * clamp(z, 0.55, 1.1), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawWord(ctx, cam, word, state, dim, z, rootActive) {
      if (z < 0.22 && !rootActive) return;
      const p = cam.worldToScreen(word.x, word.y);
      const isHover = state.hover && state.hover.kind === 'word' && state.hover.id === word.id;
      const isActive = state.activeWordId === word.id;
      const litN = word.planets.filter((q) => state.lit.has(q.id)).length;
      const progress = word.planets.length ? litN / word.planets.length : 0;
      const flash = this.flashes.find((f) => f.wordId === word.id);
      const glowR = (20 + progress * 26 + (isHover ? 14 : 0) + (isActive ? 16 : 0)) * clamp(z, 0.7, 1.5) * (flash ? 1.4 : 1);
      const alpha = (0.45 + progress * 0.5) * dim;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite(word.color), p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);
      ctx.globalCompositeOperation = 'source-over';

      // 核心
      ctx.fillStyle = progress >= 1 ? '#fff3d0' : '#ffffff';
      ctx.shadowColor = word.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 + progress * 1.3 + (isHover ? 0.8 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 进度弧
      if (progress > 0) {
        ctx.strokeStyle = progress >= 1 ? 'rgba(255,212,121,.95)' : rgba(word.color, 0.9);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      // 选中/悬停环
      if (isActive || isHover) {
        ctx.strokeStyle = isActive ? 'rgba(255,212,121,.85)' : 'rgba(255,255,255,.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash(isActive ? [2, 4] : []);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 17 : 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    drawPlanet(ctx, cam, planet, state, dim, z) {
      const p = cam.worldToScreen(planet.x, planet.y);
      const lit = state.lit.has(planet.id);
      const isHover = state.hover && state.hover.kind === 'planet' && state.hover.id === planet.id;
      const isCurrent = state.currentPlanetId === planet.id;
      const r = clamp(5.4 * Math.sqrt(z), 3.6, 7.6);
      ctx.save();
      ctx.globalAlpha = (lit ? 1 : 0.85) * dim;
      if (lit) {
        ctx.globalCompositeOperation = 'lighter';
        const gr = r * 5.2;
        ctx.drawImage(glowSprite(planet.color), p.x - gr, p.y - gr, gr * 2, gr * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = planet.color;
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 2.4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(7,14,30,.92)';
        ctx.strokeStyle = isHover ? 'rgba(255,212,121,.95)' : rgba(planet.color, 0.62);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = rgba(planet.color, 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isHover) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (isCurrent) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.time * 0.8);
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = 'rgba(255,212,121,.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    drawLabels(ctx, cam, root, state, dim, z, isActive) {
      if (state.activeRootId && !isActive) return;
      const p = cam.worldToScreen(root.x, root.y);
      ctx.save();
      ctx.globalAlpha = dim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, FONT_SERIF, '1.5px');
      ctx.fillStyle = isActive ? '#ffe6b3' : 'rgba(235,243,255,.92)';
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 8;
      const baseY = p.y + 44 * clamp(z, 0.7, 1.25);
      ctx.fillText(root.data.root, p.x, baseY);
      setFont(ctx, FONT_SANS, '1.5px');
      ctx.fillStyle = 'rgba(160,190,225,.8)';
      ctx.fillText(root.data.meaning, p.x, baseY + 17);
      ctx.restore();

      // 词星标签
      if (z > 0.6 || isActive) {
        for (const word of root.words) {
          const wp = cam.worldToScreen(word.x, word.y);
          const isHover = state.hover && state.hover.kind === 'word' && state.hover.id === word.id;
          const isActiveWord = state.activeWordId === word.id;
          if (!isActiveWord && !isHover && z < 0.5 && !isActive) continue;
          const litN = word.planets.filter((q) => state.lit.has(q.id)).length;
          ctx.save();
          ctx.globalAlpha = (isHover || isActiveWord ? 1 : 0.82) * dim;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          setFont(ctx, FONT_SERIF_SM, '0.5px');
          ctx.fillStyle = litN >= 3 ? '#ffe3a8' : (isHover || isActiveWord ? '#ffffff' : 'rgba(205,222,245,.9)');
          ctx.shadowColor = 'rgba(0,0,0,.9)';
          ctx.shadowBlur = 7;
          ctx.fillText(word.data.word, wp.x, wp.y + 21);
          ctx.restore();
        }
      }
    }

    drawParticles(ctx, cam) {
      if (!this.particles.length && !this.rings.length && !this.flashes.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const r of this.rings) {
        const p = cam.worldToScreen(r.x, r.y);
        ctx.globalAlpha = Math.max(0, r.life) * 0.6;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, r.r * cam.zoom), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of this.particles) {
        const s = cam.worldToScreen(p.x, p.y);
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.size * a + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const f of this.flashes) {
        const s = cam.worldToScreen(f.x, f.y);
        ctx.globalAlpha = f.life * 0.5;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, (1 - f.life) * 70 * cam.zoom + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function nameScale(z) { return clamp(z, 0.55, 1.35); }

  ES.Renderer = Renderer;
})(window.ES = window.ES || {});
