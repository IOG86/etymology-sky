// 词源星图 · 浏览器自动化走查（Edge headless + CDP）
// 用法：node tools/qa.mjs [--mobile] [--out shots]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(here, '..');
const outDir = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(projectRoot, 'shots'));
mkdirSync(outDir, { recursive: true });
const mobile = process.argv.includes('--mobile');
const W = mobile ? 390 : 1600;
const H = mobile ? 844 : 1000;
const url = pathToFileURL(join(projectRoot, 'index.html')).href;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9700 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'es-qa-'));

const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--mute-audio',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(path, method = 'GET') {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, signal: AbortSignal.timeout(4000) });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

async function main() {
  let target = null;
  for (let i = 0; i < 80; i++) {
    try {
      const list = await http('/json/list');
      if (Array.isArray(list)) { target = list.find((t) => t.type === 'page'); if (target) break; }
    } catch { /* retry */ }
    await sleep(150);
  }
  if (!target) throw new Error('Edge page not found');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(`[exception] ${d.text} ${d.exception && d.exception.description ? d.exception.description.split('\n')[0] : ''}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('[console.error] ' + msg.params.args.map((a) => a.value || a.description || '').join(' '));
    }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    const timer = setTimeout(() => { pending.delete(mid); reject(new Error('CDP timeout ' + method)); }, 25000);
    pending.set(mid, (msg) => { clearTimeout(timer); resolve(msg); });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      errors.push('[eval] ' + d.text + ' ' + (d.exception ? d.exception.description : ''));
      return null;
    }
    return r.result && r.result.result ? r.result.result.value : null;
  };
  const shot = async (name) => {
    const cap = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const p = join(outDir, name);
    writeFileSync(p, Buffer.from(cap.result.data, 'base64'));
    console.log('[shot] ' + p);
  };
  const waitFor = (ms) => sleep(ms);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url });
  await waitFor(2800);

  await shot(mobile ? '10-m-intro.png' : '01-intro.png');
  console.log('load: ' + await evaluate("JSON.stringify({roots:window.__ES__?__ES__.world.roots.length:-1, words:window.__ES__?__ES__.world.words.length:-1, planets:window.__ES__?__ES__.world.planets.length:-1, intro: !document.getElementById('intro').classList.contains('hidden')})"));

  // 进入星图
  await evaluate("document.getElementById('startBtn').click()");
  await waitFor(3200);
  await shot(mobile ? '11-m-overview.png' : '02-overview.png');
  console.log('overview: ' + await evaluate("JSON.stringify({view:__ES__.state.view, zoom:+__ES__.camera.zoom.toFixed(3), x:Math.round(__ES__.camera.x), y:Math.round(__ES__.camera.y)})"));

  const clickAt = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const pointOf = async (expr) => JSON.parse(await evaluate(`JSON.stringify(${expr})`));

  // 真实点击：词根恒星
  const rp = await pointOf("__ES__.camera.worldToScreen(__ES__.world.rootById['spect'].x, __ES__.world.rootById['spect'].y)");
  await clickAt(rp.x, rp.y);
  await waitFor(2000);
  await shot(mobile ? '12-m-root.png' : '03-root.png');
  console.log('afterRootClick: ' + await evaluate("JSON.stringify({view:__ES__.state.view, root:__ES__.state.activeRootId})"));

  // 真实点击：词星
  const wp = await pointOf("__ES__.camera.worldToScreen(__ES__.world.wordById['inspect'].x, __ES__.world.wordById['inspect'].y)");
  await clickAt(wp.x, wp.y);
  await waitFor(1800);
  await shot(mobile ? '13-m-word.png' : '04-word.png');
  console.log('afterWordClick: ' + await evaluate("JSON.stringify({view:__ES__.state.view, word:__ES__.state.activeWordId, zoom:+__ES__.camera.zoom.toFixed(2)})"));

  // 真实点击：题型行星
  const pp = await pointOf("__ES__.camera.worldToScreen(__ES__.world.planetById['inspect:meaning'].x, __ES__.world.planetById['inspect:meaning'].y)");
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pp.x, y: pp.y });
  await waitFor(700);
  await shot(mobile ? '13b-m-hover.png' : '04b-hover-tooltip.png');
  console.log('hover: ' + await evaluate("JSON.stringify({hidden:document.getElementById('tooltip').hidden, text:document.getElementById('tooltip').textContent})"));
  await clickAt(pp.x, pp.y);
  await waitFor(2000);
  await shot(mobile ? '14-m-panel.png' : '05-panel-meaning.png');
  console.log('afterPlanetClick: ' + await evaluate("JSON.stringify({panel:__ES__.panel.isOpen(), current:__ES__.state.currentPlanetId})"));

  // 答题：选中正确项并提交
  await evaluate("document.querySelectorAll('#pOptions .option')[0].click(); document.getElementById('pSubmit').click();");
  await waitFor(1800);
  await shot(mobile ? '15-m-answered.png' : '06-answered.png');
  console.log('afterAnswer: ' + await evaluate("JSON.stringify({lit:[...__ES__.progress.lit], count:__ES__.progress.count(), panelOpen:document.getElementById('panel').classList.contains('open')})"));

  // 点「下一颗行星 →」，应自动切到同一词星的下一种题型
  await evaluate("document.getElementById('pSubmit').click()");
  await waitFor(1800);
  await shot(mobile ? '16-m-form.png' : '07-panel-form.png');
  console.log('afterNext: ' + await evaluate("JSON.stringify({current:__ES__.state.currentPlanetId, type:__ES__.state.currentPlanetId?__ES__.state.currentPlanetId.split(':')[1]:null})"));

  // Esc 关闭面板
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(900);
  console.log('afterEsc: ' + await evaluate("JSON.stringify({panel:__ES__.panel.isOpen(), body:document.body.className})"));

  // part2 风格：题干自带例句的 form 题（语段应保持高亮而不是挖空）
  await evaluate("__ES__.openPlanet('dictionary','form')");
  await waitFor(2000);
  await shot(mobile ? '16b-m-form2.png' : '07b-panel-form2.png');

  // 关闭并回到总览
  await evaluate("document.getElementById('panelClose').click(); setTimeout(()=>__ES__.overview(), 700)");
  await waitFor(2400);
  await shot(mobile ? '17-m-overview2.png' : '08-overview-lit.png');

  // 刷新验证：进度应仍保存在 localStorage
  await send('Page.reload', { ignoreCache: false });
  await waitFor(3200);
  console.log('afterReload: ' + await evaluate("JSON.stringify({count:__ES__?__ES__.progress.count():-1, lit:__ES__?[...__ES__.progress.lit]:[]})"));

  // 展示态：预置一片点亮了一半的星座，拍一张「星座正在亮起」的截图
  await evaluate(`(() => {
    const es = __ES__;
    const root = es.world.rootById['spect'];
    const ids = root.words.flatMap(w => w.planets.map(p => p.id)).slice(0, 9);
    ids.forEach(id => { if (!es.progress.has(id)) { es.progress.light(id); } });
    document.getElementById('intro').style.display = 'none';
    document.body.classList.remove('intro-open');
    es.focusRoot('spect');
    return 'ok';
  })()`);
  await waitFor(2400);
  await shot(mobile ? '18-m-lit-root.png' : '09-lit-constellation.png');

  console.log('finalState: ' + await evaluate("JSON.stringify({view:__ES__.state.view, count:__ES__.progress.count(), bodyClass:document.body.className})"));
  if (errors.length) {
    console.log('\nJS ERRORS:');
    for (const e of errors) console.log('  ' + e);
  } else {
    console.log('\nNo JS errors.');
  }
  ws.close();
  child.kill('SIGKILL');
  process.exit(0);
}

main().catch((err) => { console.error('QA_ERROR', err); child.kill('SIGKILL'); process.exit(1); });
