/* 词源星图 · 工具函数 */
(function (ES) {
  'use strict';
  const util = {
    clamp(v, min, max) { return v < min ? min : (v > max ? max : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    damp(a, b, lambda, dt) { return util.lerp(a, b, 1 - Math.exp(-lambda * dt)); },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    mod(n, m) { return ((n % m) + m) % m; },
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 100000) / 100000;
    },
    hexToRgb(hex) {
      const s = String(hex || '#ffffff').replace('#', '');
      const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    rgba(hex, a) {
      const c = util.hexToRgb(hex);
      return `rgba(${c.r},${c.g},${c.b},${a})`;
    },
    escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
      ));
    },
    /* 把 [[word]] 标记转成 span；先转义再替换，安全 */
    markup(text, cls) {
      const klass = cls || 'hl';
      return util.escapeHtml(text).replace(/\[\[([^\]]+)\]\]/g, (m, w) => `<span class="${klass}">${w}</span>`);
    },
    fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    isMobile() { return window.innerWidth <= 900; },
  };
  ES.util = util;
})(window.ES = window.ES || {});
