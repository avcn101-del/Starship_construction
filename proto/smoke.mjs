#!/usr/bin/env node
// proto/smoke.mjs — Playwright smoke test of the feel prototype (DESIGN.md
// 13h.4): serves the repository root with python3 -m http.server, opens
// /proto/ at a phone landscape viewport, chooses a non-default loadout on
// the loadout panel and starts, taps an enemy room, cycles the presets, runs
// time x4 until the battle ends or 6 simulated minutes pass (on the way:
// a target change to the turret at 8 s, Cool at 12 s, Fire at 16 s, an
// Export from the top bar at 20 s), exports again at the end, runs
// proto/replay.mjs on both exports (each must print MATCH), then checks that
// Restart brings the panel back; fails on any console error (a blocked font
// request is not a game error; the page loads no font), a touch target under
// 44 px or a replay MISMATCH. Saves proto/screens/loadout.png, start.png,
// end.png and export.png.
//
//   NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const PORT = 8737, URL = `http://127.0.0.1:${PORT}/proto/`;
const VIEWPORT = { width: 844, height: 390 }; // a phone in landscape
const LIMIT = 360; // simulated seconds

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
try {
  for (let i = 0; i < 50; i++) { try { await fetch(URL); break; } catch { await wait(100); } }
  const browser = await chromium.launch(); // Chromium from PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers)
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) errors.push(`request failed: ${r.url()}`); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__proto && window.__proto.choosing);

  // The loadout panel: choose a non-default loadout (every button >= 44 px), then Start.
  const CHOICE = { Magazine: 'AP full', 'Bow armour': '1 cell', Layout: 'R1-B', 'Shield budget': '20 MW', 'Hits to wreck': '5', Turrets: 'on' };
  const WANT = { magazine: 'apFull', armour: 1, layout: 'R1B', shieldBudget: 2e7, hitsToWreck: 5, turrets: true };
  for (const [group, label] of Object.entries(CHOICE)) await page.getByRole('group', { name: group }).getByRole('button', { name: label, exact: true }).tap();
  const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
  if (small) errors.push(`${small} visible buttons under 44 px`);
  await wait(300);
  await page.screenshot({ path: path.join(here, 'screens', 'loadout.png') });
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.waitForFunction(() => window.__proto.battle && !window.__proto.choosing);
  const got = await page.evaluate(() => window.__proto.battle.loadout);
  if (JSON.stringify(got) !== JSON.stringify(WANT)) errors.push(`loadout did not take: ${JSON.stringify(got)}`);

  // Tap the enemy's beam bay, then check the target took.
  const [x, y] = await page.evaluate(() => window.__proto.roomCentre('enemy', 'beamBay'));
  await page.touchscreen.tap(x, y);
  const target = await page.evaluate(() => window.__proto.battle.player.target);
  if (target !== 'beamBay') errors.push(`tap did not target the beam bay (target ${target})`);
  await wait(800);
  await page.screenshot({ path: path.join(here, 'screens', 'start.png') });

  // Cycle the presets: Cool, Evade, Fire; each must take.
  for (const label of ['Cool', 'Evade', 'Fire']) {
    await page.getByRole('button', { name: label, exact: true }).tap();
    await wait(300);
    const p = await page.evaluate(() => window.__proto.battle.player.preset);
    if (p !== label.toLowerCase()) errors.push(`preset ${label} did not take (${p})`);
  }
  await page.getByRole('button', { name: '×4', exact: true }).tap();

  // Export: tap a button, check the panel and its buttons, keep the text; Close resumes the battle.
  const exports = [];
  const doExport = async (selector, label) => {
    await page.locator(selector).tap();
    await page.waitForFunction(() => !document.getElementById('export-panel').hidden && /kB/.test(document.getElementById('export-status').textContent));
    await wait(200);
    const got = await page.evaluate(() => ({ text: window.__proto.lastExport, box: document.getElementById('export-text').value, status: document.getElementById('export-status').textContent, paused: document.getElementById('pause').textContent === 'Run' }));
    if (got.text !== got.box) errors.push(`${label}: the text box does not hold the export`);
    if (!got.paused) errors.push(`${label}: the battle did not pause`);
    const tiny = await page.evaluate(() => [...document.querySelectorAll('#export-panel button')].map((b) => b.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
    if (tiny) errors.push(`${label}: ${tiny} export buttons under 44 px`);
    exports.push({ label, text: got.text, status: got.status });
    return got;
  };
  // Scripted inputs on the way (each once, at simulated time >= at).
  const plan = [
    { at: 8, label: 'target turret', run: async () => { const [x, y] = await page.evaluate(() => window.__proto.roomCentre('enemy', 'turret')); await page.touchscreen.tap(x, y); } },
    { at: 12, label: 'Cool', run: () => page.getByRole('button', { name: 'Cool', exact: true }).tap() },
    { at: 16, label: 'Fire', run: () => page.getByRole('button', { name: 'Fire', exact: true }).tap() },
    { at: 20, label: 'export mid-battle', run: async () => { await doExport('#export', 'export mid-battle'); await page.screenshot({ path: path.join(here, 'screens', 'export.png') }); await page.locator('#export-close').tap(); await wait(200); } },
  ];
  const done = [];
  const t0 = Date.now();
  let state;
  for (;;) {
    state = await page.evaluate(() => ({ t: window.__proto.battle.t, ended: window.__proto.battle.ended }));
    if (state.ended || state.t >= LIMIT || Date.now() - t0 > 150000) break;
    const next = plan.find((p) => !done.includes(p.label) && state.t >= p.at);
    if (next) { await next.run(); done.push(next.label); continue; }
    await wait(250);
  }
  if (!state.ended) await page.locator('#pause').tap(); // stop at the limit before the final export
  await wait(500);
  await page.screenshot({ path: path.join(here, 'screens', 'end.png') });
  const endShown = await page.evaluate(() => !document.getElementById('end').hidden);
  if (state.ended && !endShown) errors.push('the battle ended but the end panel is hidden');
  if (state.ended) {
    const r = await page.evaluate(() => document.getElementById('end-export').getBoundingClientRect());
    if (r.height < 44 || r.width < 44) errors.push('the end panel\'s Export is under 44 px');
  }
  await doExport(state.ended ? '#end-export' : '#export', state.ended ? 'export at the end' : 'export at the limit');
  await page.locator('#export-close').tap();
  await wait(200);
  const inputs = await page.evaluate(() => window.__proto.battle.inputs.map((i) => `${i.step}:${i.kind}:${i.value}`).join(' '));

  // Replay every export headless: each must print MATCH.
  const dir = mkdtempSync(path.join(os.tmpdir(), 'proto-export-')), replays = [];
  exports.forEach((x, i) => {
    const file = path.join(dir, `export-${i + 1}.json`);
    writeFileSync(file, x.text);
    let outText = '', code = 0;
    try { outText = execFileSync('node', [path.join(here, 'replay.mjs'), file, '--quiet'], { encoding: 'utf8' }); } catch (e) { outText = e.stdout || String(e); code = e.status ?? 1; }
    const verdict = outText.trim().split('\n').pop();
    replays.push(`${x.label}: ${x.text.length} bytes, "${x.status}"; node proto/replay.mjs ${file} -> ${verdict}`);
    if (code !== 0 || verdict !== 'MATCH') errors.push(`replay of ${x.label}: ${verdict}`);
  });
  if (!done.includes('export mid-battle')) replays.push(`(the battle ended at ${state.t.toFixed(2)} s, before the mid-battle export at 20 s; done: ${done.join(', ') || 'none'})`);
  // Restart (the bar's) brings the loadout panel back, with the last choice.
  await page.locator('#restart').tap();
  await wait(300);
  const again = await page.evaluate(() => window.__proto.choosing && !document.getElementById('loadout').hidden);
  if (!again) errors.push('Restart did not show the loadout panel');
  await browser.close();

  console.log(`loadout ${JSON.stringify(got)}`);
  console.log(`viewport ${VIEWPORT.width} x ${VIEWPORT.height}, touch; simulated ${state.t.toFixed(2)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s real at x4`);
  console.log(`inputs ${inputs}`);
  for (const r of replays) console.log(r);
  console.log(state.ended ? `battle ended at ${state.ended.t.toFixed(2)} s: ${state.ended.losers.map((s) => `${s} ${state.ended.reason[s]}`).join(', ')}` : `no end within ${LIMIT} s simulated`);
  console.log(`console errors: ${errors.length}`);
  for (const e of errors) console.log(`  ${e}`);
  failed = errors.length > 0;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
