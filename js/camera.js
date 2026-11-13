/* 词源星图 · 相机：平移 / 缩放 / 缓动 */
(function (ES) {
  'use strict';
  const { clamp, damp } = ES.util;

  class Camera {
    constructor() {
      this.w = 0; this.h = 0;
      this.x = 0; this.y = 0; this.zoom = 0.3;
      this.tx = 0; this.ty = 0; this.tzoom = 0.3;
      this.sideInset = 0;
      this.tSideInset = 0;
      this.minZoom = 0.07;
      this.maxZoom = 3.0;
    }

    setViewport(w, h) { this.w = w; this.h = h; }

    center() {
      return { x: (this.w - this.sideInset) / 2, y: this.h / 2 };
    }

    update(dt) {
      const k = 1 - Math.exp(-6.5 * dt);
      this.x += (this.tx - this.x) * k;
      this.y += (this.ty - this.y) * k;
      this.zoom += (this.tzoom - this.zoom) * k;
      this.sideInset = damp(this.sideInset, this.tSideInset, 7, dt);
    }

    jump(x, y, zoom) {
      this.x = this.tx = x;
      this.y = this.ty = y;
      this.zoom = this.tzoom = clamp(zoom, this.minZoom, this.maxZoom);
      this.sideInset = this.tSideInset;
    }

    focus(x, y, zoom) {
      this.tx = x; this.ty = y;
      this.tzoom = clamp(zoom, this.minZoom, this.maxZoom);
    }

    setSideInset(px) { this.tSideInset = px; }

    worldToScreen(x, y) {
      const c = this.center();
      return { x: c.x + (x - this.x) * this.zoom, y: c.y + (y - this.y) * this.zoom };
    }

    screenToWorld(sx, sy) {
      const c = this.center();
      return { x: this.x + (sx - c.x) / this.zoom, y: this.y + (sy - c.y) / this.zoom };
    }

    zoomAt(sx, sy, factor) {
      const before = this.screenToWorld(sx, sy);
      const nz = clamp(this.tzoom * factor, this.minZoom, this.maxZoom);
      const c = this.center();
      this.tzoom = nz;
      this.tx = before.x - (sx - c.x) / nz;
      this.ty = before.y - (sy - c.y) / nz;
    }

    panBy(dx, dy) {
      this.tx -= dx / this.zoom;
      this.ty -= dy / this.zoom;
      this.x = this.tx;
      this.y = this.ty;
    }

    fit(bounds, padTop = 96, padBottom = 118) {
      const availW = Math.max(320, this.w - 90);
      const availH = Math.max(240, this.h - padTop - padBottom);
      const bw = Math.max(1, bounds.maxX - bounds.minX);
      const bh = Math.max(1, bounds.maxY - bounds.minY);
      const z = clamp(Math.min(availW / bw, availH / bh), this.minZoom, 0.82);
      this.tzoom = z;
      this.tx = (bounds.minX + bounds.maxX) / 2;
      this.ty = (bounds.minY + bounds.maxY) / 2 + (padTop - padBottom) / 2 / z;
    }

    overview(bounds, instant) {
      const saved = { x: this.tx, y: this.ty, z: this.tzoom };
      this.fit(bounds);
      if (instant) this.jump(this.tx, this.ty, this.tzoom);
      return saved;
    }
  }

  ES.Camera = Camera;
})(window.ES = window.ES || {});
