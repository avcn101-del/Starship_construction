#!/usr/bin/env node
// proto/smoke.mjs — Playwright smoke test of the feel prototype on the L5d
// kernel loop (DESIGN.md 13h.4, 13j, 13n.1 (d); #301 (5)): serves the
// repository root with python3 -m http.server, opens /proto/ at a phone
// landscape viewport with touch, checks the page shows PROTO_VERSION and the
// loadout panel seed 1, computes the determinism duel's hash (proto/duel.js) in
// Chromium and compares it with tools/determinism.mjs in Node (MATCH, 13k.1),
// chooses a non-default override (shield budget 20 MW) and seed 41 and
// starts, uses each verb once through the page (Scan then a tap on zone 2; a
// tap on a room the model knows, which targets it; Evade), runs x4 to the end
// or 6 simulated minutes with an Export from the top bar at 12 s, exports again
// at the end, runs proto/replay.mjs on both exports (each must print MATCH:
// the same battle hash and end through tools/duel.js), and checks Restart
// brings the panel back with seed 42. Fails on any console error (a blocked
// Google Fonts request is not a game error; the page loads no font), a visible
// button under 44 px, a verb that did not reach the kernel's inputs, a replay
// MISMATCH or a determinism MISMATCH. Saves proto/screens/loadout.png,
// start.png, export.png, end.png and restart.png.
//
//   NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PROTO_VERSION } from './config.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const PORT = 8737, URL = `http://127.0.0.1:${PORT}/proto/`;
const VIEWPORT = { width: 844, height: 390 }; // a phone in landscape
const LIMIT = 360; // simulated seconds
const SEED = 41;
mkdirSync(path.join(here, 'screens'), { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
try {
  for (let i = 0; i < 50; i++) { try { await fetch(URL); break; } catch { await wait(100); } }
  const browser = await chromium.launch(); // Chromium from PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers)
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [], consoleErrors = [];
  const consoleError = (x) => { consoleErrors.push(x); errors.push(x); };
  page.on('console', (m) => { if (m.type() === 'error') consoleError(`console: ${m.text()}`); });
  page.on('pageerror', (e) => consoleError(`page: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) consoleError(`request failed: ${r.url()}`); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__proto && window.__proto.choosing);
  const shownVersion = await page.evaluate(() => document.getElementById('version').textContent);
  if (shownVersion !== PROTO_VERSION) errors.push(`the page shows version ${shownVersion}, not ${PROTO_VERSION}`);

  // The determinism test (13k.1, #239 Q6, L0.determinism): the duel of proto/duel.js in Chromium against
  // tools/determinism.mjs in Node; the hashes must MATCH.
  const inPage = await page.evaluate(async () => { const r = (await import('/proto/duel.js')).duelHash(); return { hash: r.hash, steps: r.steps, events: r.events, endLine: r.endLine, battle: r.battle }; });
  const inNode = execFileSync('node', [path.join(root, 'tools', 'determinism.mjs')], { encoding: 'utf8' }).trim().split(/\s+/)[0];
  const determinism = inPage.hash === inNode ? 'MATCH' : 'MISMATCH';
  if (determinism !== 'MATCH') errors.push(`determinism: Chromium ${inPage.hash}, Node ${inNode}`);

  // The loadout panel: seed 1 shown; choose 20 MW and seed 41 (every button >= 44 px), then Start.
  const shownSeed = await page.inputValue('#seed');
  if (shownSeed !== '1') errors.push(`the panel shows seed ${shownSeed}, not 1`);
  await page.getByRole('group', { name: 'Shield budget' }).getByRole('button', { name: '20 MW', exact: true }).tap();
  await page.fill('#seed', String(SEED));
  await page.locator('#seed').dispatchEvent('change');
  const small = async () => page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
  if (await small()) errors.push(`${await small()} visible buttons under 44 px on the panel`);
  await wait(300);
  await page.screenshot({ path: path.join(here, 'screens', 'loadout.png') });
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.waitForFunction(() => window.__proto.battle && !window.__proto.choosing);
  const setup = await page.evaluate(() => ({ seed: window.__proto.battle.seed, overrides: window.__proto.battle.overrides, tag: document.getElementById('lo-tag').textContent }));
  if (setup.seed !== SEED) errors.push(`seed did not take: ${setup.seed}`);
  if (setup.overrides['shield.budget'] !== 2e7) errors.push(`override did not take: ${JSON.stringify(setup.overrides)}`);
  if (!setup.tag.includes(`seed ${SEED}`)) errors.push(`the battle view does not show the seed: ${setup.tag}`);
  if (await small()) errors.push(`${await small()} visible buttons under 44 px in battle`);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const exports = [];
  const doExport = async (selector, label) => {
    await page.locator(selector).tap();
    await page.waitForFunction(() => !document.getElementById('export-panel').hidden && /kB/.test(document.getElementById('export-status').textContent));
    await wait(200);
    const got = await page.evaluate(() => ({ text: window.__proto.lastExport, box: document.getElementById('export-text').value, status: document.getElementById('export-status').textContent, paused: document.getElementById('pause').textContent === 'Run' }));
    if (got.text !== got.box) errors.push(`${label}: the text box does not hold the export`);
    if (!got.paused) errors.push(`${label}: the battle did not pause`);
    const x = JSON.parse(got.text);
    if (x.seed !== SEED) errors.push(`${label}: the export does not carry seed ${SEED}`);
    if (!/^node tools\/duel\.js /.test(x.replay)) errors.push(`${label}: no tools/duel.js replay line`);
    exports.push({ label, text: got.text, status: got.status });
  };
  const played = () => page.evaluate(() => window.__proto.battle.played.map((x) => `${x.t.toFixed(2)}:${x.verb}:${x.arg}`));
  const tapAt = async (p) => { await page.touchscreen.tap(p[0], p[1]); await wait(150); };
  // Each verb once, through the page, at simulated time >= at; each must reach the kernel's inputs.
  const plan = [
    { at: 0.5, label: 'scan zone 2', run: async () => {
      await page.locator('#scan').tap();
      await tapAt(await page.evaluate(() => window.__proto.zoneCentre(2)));
      const p = await played();
      if (!p.some((x) => x.endsWith(':scan:2'))) errors.push(`the scan did not reach the inputs (${p.join(' ')})`);
    } },
    { at: 0, label: 'target a known room', ready: () => page.evaluate(() => [...window.__proto.battle.attacker.model.rooms.keys()].find((id) => id !== 'turret') || null), run: async (id) => {
      await tapAt(await page.evaluate((x) => window.__proto.knownRoomCentre(x), id));
      const p = await played(), held = await page.evaluate(() => window.__proto.battle.attacker.helm.verbTarget);
      if (!p.some((x) => x.endsWith(`:target:${id}`))) errors.push(`the target did not reach the inputs (${p.join(' ')})`);
      await wait(300);
      if (await page.evaluate(() => window.__proto.battle.attacker.helm.verbTarget) !== id) errors.push(`the helm does not hold the target ${id} (${held})`);
      await page.screenshot({ path: path.join(here, 'screens', 'start.png') });
      await page.getByRole('button', { name: '×4', exact: true }).tap();
    } },
    { at: 8, label: 'Evade', run: async () => {
      await page.getByRole('button', { name: 'Evade', exact: true }).tap();
      await wait(300);
      const p = await played(), name = await page.evaluate(() => window.__proto.battle.attacker.helm.orders.name);
      if (!p.some((x) => x.endsWith(':preset:evade'))) errors.push(`the preset did not reach the inputs (${p.join(' ')})`);
      if (name !== 'evade' && !(await page.evaluate(() => !!window.__proto.battle.ended))) errors.push(`the helm is on ${name}, not evade`);
    } },
    { at: 12, label: 'export mid-battle', run: async () => { await doExport('#export', 'export mid-battle'); await page.screenshot({ path: path.join(here, 'screens', 'export.png') }); await page.locator('#export-close').tap(); await wait(200); } },
  ];
  const done = [];
  const t0 = Date.now();
  let state;
  for (;;) {
    state = await page.evaluate(() => ({ t: window.__proto.battle.t, ended: window.__proto.battle.ended }));
    if (state.ended || state.t >= LIMIT || Date.now() - t0 > 150000) break;
    let acted = false;
    for (const p of plan) {
      if (done.includes(p.label) || state.t < p.at) continue;
      const arg = p.ready ? await p.ready() : true;
      if (!arg) continue;
      await p.run(arg); done.push(p.label); acted = true;
      break;
    }
    if (!acted) await wait(100);
  }
  if (!state.ended) await page.locator('#pause').tap(); // stop at the limit before the final export
  await wait(500);
  await page.screenshot({ path: path.join(here, 'screens', 'end.png') });
  if (state.ended && !(await page.evaluate(() => !document.getElementById('end').hidden))) errors.push('the battle ended but the end panel is hidden');
  if (state.ended && !(await page.evaluate(() => document.querySelectorAll('#end .tree').length))) errors.push('the end panel has no cascade tree');
  for (const p of plan) if (!done.includes(p.label)) errors.push(`not done before the end: ${p.label}`);
  await doExport(state.ended ? '#end-export' : '#export', state.ended ? 'export at the end' : 'export at the limit');
  await page.locator('#export-close').tap();
  await wait(200);
  const inputs = (await played()).join(' ');

  // Replay every export headless through tools/duel.js: each must print MATCH.
  const dir = mkdtempSync(path.join(os.tmpdir(), 'proto-export-')), replays = [];
  exports.forEach((x, i) => {
    const file = path.join(dir, `export-${i + 1}.json`);
    writeFileSync(file, x.text);
    let out = '', code = 0;
    try { out = execFileSync('node', [path.join(here, 'replay.mjs'), file], { encoding: 'utf8' }); } catch (e) { out = e.stdout || String(e); code = e.status ?? 1; }
    const lines = out.trim().split('\n'), verdict = lines.pop(), j = JSON.parse(x.text);
    replays.push(`${x.label}: step ${j.step}, end "${j.end}", hash ${j.hash}; node proto/replay.mjs ${file} -> ${lines.filter((l) => /^(hash|end) +replay/.test(l)).join('; ')}; ${verdict}`);
    if (code !== 0 || verdict !== 'MATCH') errors.push(`replay of ${x.label}: ${verdict}`);
  });
  // Restart (the bar's) brings the loadout panel back, with the seed plus one.
  await page.locator('#restart').tap();
  await wait(300);
  if (!(await page.evaluate(() => window.__proto.choosing && !document.getElementById('loadout').hidden))) errors.push('Restart did not show the loadout panel');
  const nextSeed = await page.inputValue('#seed');
  if (nextSeed !== String(SEED + 1)) errors.push(`after Restart the panel shows seed ${nextSeed}, not ${SEED + 1}`);
  await page.screenshot({ path: path.join(here, 'screens', 'restart.png') });
  await browser.close();

  console.log(`version on the page ${shownVersion}`);
  console.log(`determinism: Chromium ${inPage.hash} (${inPage.steps} steps, ${inPage.events} events, ${inPage.endLine}; battle hash ${inPage.battle}), Node ${inNode}: ${determinism}`);
  console.log(`seed ${setup.seed}, overrides ${JSON.stringify(setup.overrides)}, after Restart ${nextSeed}`);
  console.log(`viewport ${VIEWPORT.width} x ${VIEWPORT.height}, touch; simulated ${state.t.toFixed(2)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s real`);
  console.log(`verbs played (t:verb:arg) ${inputs}`);
  for (const r of replays) console.log(r);
  console.log(state.ended ? `battle ended: ${state.ended.kind} ${state.ended.side} at ${state.ended.t.toFixed(2)} s` : `no end within ${LIMIT} s simulated`);
  console.log(`console errors: ${consoleErrors.length}`);
  console.log(`failures: ${errors.length}${errors.length ? '' : ' (PASS)'}`);
  for (const e of errors) console.log(`  ${e}`);
  failed = errors.length > 0;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
