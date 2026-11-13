/* 词源星图 · 世界布局：词根 / 词星 / 题型行星 */
(function (ES) {
  'use strict';
  const { hash, clamp } = ES.util;

  ES.TYPE = {
    meaning: { name: '词义辨识', short: '词义', color: '#ffd479' },
    form: { name: '词形变换', short: '词形', color: '#7fd4ff' },
    cloze: { name: '语境填空', short: '语境', color: '#c9a7ff' },
  };

  // 六片星区的中心位置（世界坐标），形成不规则星环
  const ROOT_POS = [
    { x: -1540, y: -430 },
    { x: -470, y: -930 },
    { x: 840, y: -850 },
    { x: 1560, y: 70 },
    { x: 720, y: 930 },
    { x: -880, y: 840 },
  ];

  function buildWorld(data) {
    const rootsData = (data && data.roots) || [];
    const world = {
      roots: [], words: [], planets: [],
      rootById: {}, wordById: {}, planetById: {},
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      totalRoots: rootsData.length, totalWords: 0, totalPlanets: 0,
    };

    rootsData.forEach((rd, i) => {
      const pos = ROOT_POS[i % ROOT_POS.length];
      const root = {
        kind: 'root', id: rd.id, data: rd, index: i,
        x: pos.x, y: pos.y, color: rd.color || '#7fd4ff',
        words: [],
      };
      world.roots.push(root);
      world.rootById[root.id] = root;

      (rd.words || []).forEach((wd, j) => {
        const baseAngle = -Math.PI / 2 + i * 0.52 + j * (Math.PI * 2 / rd.words.length);
        const angle = baseAngle + (hash(rd.id + wd.id) - 0.5) * 0.2;
        const radius = 290 + (j % 2) * 56 + hash(wd.id + 'r') * 34;
        const word = {
          kind: 'word', id: wd.id, rootId: rd.id, root, data: wd,
          index: j, angle, color: root.color,
          x: root.x + Math.cos(angle) * radius,
          y: root.y + Math.sin(angle) * radius * 0.92,
          curve: (j % 2 ? 1 : -1) * (0.1 + 0.018 * j),
          planets: [],
        };
        world.words.push(word);
        world.wordById[word.id] = word;
        root.words.push(word);

        (wd.questions || []).forEach((q, k) => {
          const orbit = 62 + (k % 2) * 4;
          const pa = angle + Math.PI / 2 + k * (Math.PI * 2 / 3) + j * 0.42;
          const planet = {
            kind: 'planet', id: `${wd.id}:${q.type || k}`, wordId: wd.id, rootId: rd.id,
            type: q.type, index: k, question: q, word,
            color: (ES.TYPE[q.type] || ES.TYPE.meaning).color,
            x: word.x + Math.cos(pa) * orbit,
            y: word.y + Math.sin(pa) * orbit * 0.92,
            angle: pa,
          };
          word.planets.push(planet);
          world.planets.push(planet);
          world.planetById[planet.id] = planet;
        });
      });
      root.dust = [];
      for (let k = 0; k < 72; k++) {
        const a = hash(`${rd.id}-dust-a-${k}`) * Math.PI * 2;
        const rr = 140 + hash(`${rd.id}-dust-r-${k}`) * 300;
        root.dust.push({
          x: root.x + Math.cos(a) * rr,
          y: root.y + Math.sin(a) * rr * 0.9,
          s: 0.5 + hash(`${rd.id}-dust-s-${k}`) * 1.2,
          a: 0.12 + hash(`${rd.id}-dust-b-${k}`) * 0.28,
          ph: hash(`${rd.id}-dust-p-${k}`) * 6.28,
          color: hash(`${rd.id}-dust-c-${k}`) > 0.62 ? '#ffe9c4' : '#dbe9ff',
        });
      }
    });

    // 边界（含光晕/标签余量）
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const r of world.roots) {
      for (const w of r.words) {
        minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x);
        minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y);
      }
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y);
    }
    if (!isFinite(minX)) { minX = -600; maxX = 600; minY = -400; maxY = 400; }
    const margin = 240;
    world.bounds = {
      minX: minX - margin, maxX: maxX + margin,
      minY: minY - margin, maxY: maxY + margin,
    };
    world.totalWords = world.words.length;
    world.totalPlanets = world.planets.length;

    // 每个词根的统计
    world.roots.forEach((r) => {
      r.planetTotal = r.words.reduce((n, w) => n + w.planets.length, 0);
    });

    return world;
  }

  ES.buildWorld = buildWorld;
})(window.ES = window.ES || {});
