#!/usr/bin/env node
// proto/smoke.mjs — Playwright smoke test of the feel prototype (DESIGN.md
// 13h.4): serves the repository root with python3 -m http.server, opens
// /proto/ at a phone landscape viewport, taps an enemy room, cycles the
// presets, runs time x4 until the battle ends or 6 simulated minutes pass,
// and fails on any console error (a blocked font request is not a game
// error; the page loads no font). Saves proto/screens/start.png and end.png.
//
//   NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
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
  await page.waitForFunction(() => window.__proto && window.__proto.battle);

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

  const t0 = Date.now();
  let state;
  for (;;) {
    state = await page.evaluate(() => ({ t: window.__proto.battle.t, ended: window.__proto.battle.ended }));
    if (state.ended || state.t >= LIMIT || Date.now() - t0 > 150000) break;
    await wait(500);
  }
  await wait(500);
  await page.screenshot({ path: path.join(here, 'screens', 'end.png') });
  const endShown = await page.evaluate(() => !document.getElementById('end').hidden);
  if (state.ended && !endShown) errors.push('the battle ended but the end panel is hidden');
  await browser.close();

  console.log(`viewport ${VIEWPORT.width} x ${VIEWPORT.height}, touch; simulated ${state.t.toFixed(2)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s real at x4`);
  console.log(state.ended ? `battle ended at ${state.ended.t.toFixed(2)} s: ${state.ended.losers.map((s) => `${s} ${state.ended.reason[s]}`).join(', ')}` : `no end within ${LIMIT} s simulated`);
  console.log(`console errors: ${errors.length}`);
  for (const e of errors) console.log(`  ${e}`);
  failed = errors.length > 0;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
