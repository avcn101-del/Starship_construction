#!/usr/bin/env node
// proto/smoke.mjs — Playwright smoke test of the phases feel prototype
// (DESIGN.md 13h.4, 13j, 13n.1 (d), 13n.12; #301 (5), #366, #367): serves the
// repository root with python3 -m http.server, opens /proto/ at a phone
// landscape viewport with touch, checks the page shows PROTO_VERSION and the
// battle panel seed 1, computes the determinism duel's hash (proto/duel.js) in
// Chromium and compares it with tools/determinism.mjs in Node (MATCH, 13k.1).
// Then two battles, each played through decision point 1:
//   (1) R2 v Swarm, 1500 m, bow on, seed 41, decision points PAUSE: Scan then a
//       tap on zone 2, a tap on a room the model knows (each must reach the
//       kernel's inputs), x4 until decision point 1 stops the battle, then a tap
//       on the decision panel's second option (the battle must wait for it and
//       the choice must be recorded), an Export mid-battle, then on to the end
//       or the limit and an Export there.
//   (2) Restart (the seed must be 42), Lance v Furnace, 900 m, broadside,
//       decision points AUTO: x4 until decision point 1 has applied its
//       automatic entry without stopping, then a tap on Break off in the menu
//       (recorded), on to the end or the limit and an Export there.
// Every export is replayed with proto/replay.mjs and must print MATCH. Fails on
// any console error (a blocked Google Fonts request is not a game error; the
// page loads no font), a visible button under 44 px, a verb or choice that did
// not reach the battle, a replay MISMATCH or a determinism MISMATCH. Saves
// proto/screens/loadout.png, start.png, decision.png, export.png, end.png,
// auto.png and end2.png.
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
const LIMIT = 300; // simulated seconds per battle
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

  // The determinism test (13k.1, #239 Q6, L0.determinism.v2): the duel of proto/duel.js in Chromium against
  // tools/determinism.mjs in Node; the hashes must MATCH.
  const inPage = await page.evaluate(async () => { const r = (await import('/proto/duel.js')).duelHash(); return { hash: r.hash, steps: r.steps, events: r.events, endLine: r.endLine, battle: r.battle }; });
  const inNode = execFileSync('node', [path.join(root, 'tools', 'determinism.mjs')], { encoding: 'utf8' }).trim().split(/\s+/)[0];
  const determinism = inPage.hash === inNode ? 'MATCH' : 'MISMATCH';
  if (determinism !== 'MATCH') errors.push(`determinism: Chromium ${inPage.hash}, Node ${inNode}`);

  const small = async () => page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
  const lever = (group, name) => page.getByRole('group', { name: group }).getByRole('button', { name, exact: true }).tap();
  const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const state = () => page.evaluate(() => { const b = window.__proto.battle, p = b.phases.A; return { t: b.t, step: b.step, ended: b.ended, pending: p.pending, points: (p.points || []).length, entry: p.entry, choices: b.phases.choices.length, decision: !document.getElementById('decision').hidden }; });
  const played = () => page.evaluate(() => window.__proto.battle.played.map((x) => `${x.t.toFixed(2)}:${x.verb}:${x.arg}`));
  const tapAt = async (p) => { await page.touchscreen.tap(p[0], p[1]); await wait(150); };
  const exports = [];
  const doExport = async (selector, label) => {
    await page.locator(selector).tap();
    await page.waitForFunction(() => !document.getElementById('export-panel').hidden && /kB/.test(document.getElementById('export-status').textContent));
    await wait(200);
    const got = await page.evaluate(() => ({ text: window.__proto.lastExport, box: document.getElementById('export-text').value, status: document.getElementById('export-status').textContent, paused: document.getElementById('pause').textContent === 'Run' }));
    if (got.text !== got.box) errors.push(`${label}: the text box does not hold the export`);
    if (!got.paused) errors.push(`${label}: the battle did not pause`);
    const x = JSON.parse(got.text);
    if (!x.phases || !Array.isArray(x.choices)) errors.push(`${label}: the export carries no phases setup or choices`);
    exports.push({ label, text: got.text, status: got.status });
    await page.locator('#export-close').tap(); await wait(200);
  };
  /** Wait (polling) until `until(state)` or the battle ends / reaches the limit / the real-time cap; returns the state. */
  const runUntil = async (until, cap = 120000) => {
    const t0 = Date.now();
    for (;;) {
      const st = await state();
      if (until(st) || st.ended || st.t >= LIMIT || Date.now() - t0 > cap) return st;
      await wait(100);
    }
  };
  const finish = async (label, shot) => {
    const st = await runUntil(() => false);
    if (!st.ended) await page.locator('#pause').tap();
    await wait(400);
    await page.screenshot({ path: path.join(here, 'screens', shot) });
    if (st.ended && !(await page.evaluate(() => !document.getElementById('end').hidden))) errors.push(`${label}: the battle ended but the end panel is hidden`);
    if (st.ended && !(await page.evaluate(() => document.querySelectorAll('#end .tree').length))) errors.push(`${label}: the end panel has no cascade tree`);
    await doExport(st.ended ? '#end-export' : '#export', `${label}, ${st.ended ? 'at the end' : 'at the limit'}`);
    return st;
  };
  const battles = [];

  // Battle 1: decision points pause. The panel: seed 1 shown; R2 v Swarm, 1500 m, bow, pause; seed 41.
  const shownSeed = await page.inputValue('#seed');
  if (shownSeed !== '1') errors.push(`the panel shows seed ${shownSeed}, not 1`);
  await lever('Your build', 'R2'); await lever('Enemy build', 'Swarm'); await lever('Opening distance', '1500 m'); await lever('Aspect', 'Bow on'); await lever('Decision points', 'Pause');
  await page.fill('#seed', String(SEED));
  await page.locator('#seed').dispatchEvent('change');
  if (await small()) errors.push(`${await small()} visible buttons under 44 px on the panel`);
  await wait(300);
  await page.screenshot({ path: path.join(here, 'screens', 'loadout.png') });
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.waitForFunction(() => window.__proto.battle && !window.__proto.choosing);
  const setup = await page.evaluate(() => ({ ...window.__proto.battle.phases.setup, tag: document.getElementById('lo-tag').textContent, menu: [...document.querySelectorAll('#menu button')].map((b) => b.textContent) }));
  if (setup.seed !== SEED || setup.player !== 'R2' || setup.enemy !== 'Swarm' || setup.opening !== 'rangeOpen' || setup.aspect !== 'bow' || setup.pause !== true) errors.push(`battle 1 setup did not take: ${JSON.stringify(setup)}`);
  if (!setup.tag.includes(`seed ${SEED}`)) errors.push(`the battle view does not show the seed: ${setup.tag}`);
  if (setup.menu.join('|') !== 'Stand off|Break off|Turret line|Close in|Charge') errors.push(`R2's menu is ${setup.menu.join('|')}`);
  if (await small()) errors.push(`${await small()} visible buttons under 44 px in battle`);
  await frames();
  await page.locator('#scan').tap();
  await tapAt(await page.evaluate(() => window.__proto.zoneCentre(2)));
  if (!(await played()).some((x) => x.endsWith(':scan:2'))) errors.push(`the scan did not reach the inputs (${(await played()).join(' ')})`);
  await page.getByRole('button', { name: '×4', exact: true }).tap();
  const known = await (async () => { const t0 = Date.now(); for (;;) { const id = await page.evaluate(() => [...window.__proto.battle.attacker.model.rooms.keys()][0] || null); if (id || Date.now() - t0 > 60000) return id; await wait(100); } })();
  if (known) {
    await page.locator('#pause').tap(); await frames();
    await tapAt(await page.evaluate((x) => window.__proto.knownRoomCentre(x), known));
    if (!(await played()).some((x) => x.endsWith(`:target:${known}`))) errors.push(`the target did not reach the inputs (${(await played()).join(' ')})`);
    await page.screenshot({ path: path.join(here, 'screens', 'start.png') });
    await page.locator('#pause').tap();
  } else errors.push('battle 1: the model knew no room within 60 s real');
  let st = await runUntil((x) => x.decision);
  if (!st.decision || !st.pending || st.pending.dp !== 1) errors.push(`battle 1: decision point 1 did not stop the battle (${JSON.stringify(st)})`);
  else {
    await wait(600);
    const still = await state();
    if (still.step !== st.step) errors.push(`battle 1: the battle did not wait at decision point 1 (step ${st.step} -> ${still.step})`);
    await page.screenshot({ path: path.join(here, 'screens', 'decision.png') });
    const opt = await page.evaluate(() => document.querySelectorAll('#decision button')[1].dataset.entry);
    await page.locator('#decision button').nth(1).tap();
    await wait(300);
    st = await state();
    if (st.decision || st.pending || st.entry !== opt || st.choices !== 1) errors.push(`battle 1: the choice ${opt} did not take (${JSON.stringify(st)})`);
    await runUntil((x) => x.t >= still.t + 4);
    await doExport('#export', 'battle 1 after decision 1');
    await page.screenshot({ path: path.join(here, 'screens', 'export.png') });
  }
  battles.push({ label: 'battle 1 (pause)', end: await finish('battle 1', 'end.png'), decision: st, inputs: (await played()).join(' ') });

  // Battle 2: Restart; decision points auto. Lance v Furnace, 900 m, broadside.
  await page.locator('#restart').tap();
  await wait(300);
  if (!(await page.evaluate(() => window.__proto.choosing && !document.getElementById('loadout').hidden))) errors.push('Restart did not show the panel');
  const nextSeed = await page.inputValue('#seed');
  if (nextSeed !== String(SEED + 1)) errors.push(`after Restart the panel shows seed ${nextSeed}, not ${SEED + 1}`);
  await lever('Your build', 'Lance'); await lever('Enemy build', 'Furnace'); await lever('Opening distance', '900 m'); await lever('Aspect', 'Broadside'); await lever('Decision points', 'Auto, no pause');
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.waitForFunction(() => window.__proto.battle && !window.__proto.choosing);
  await page.getByRole('button', { name: '×4', exact: true }).tap();
  let st2 = await runUntil((x) => x.points >= 1);
  if (st2.points < 1) errors.push(`battle 2: no decision point 1 (${JSON.stringify(st2)})`);
  else {
    if (st2.decision || st2.pending) errors.push('battle 2: decision point 1 stopped the battle without the pause setting');
    if (st2.entry !== 'railLine') errors.push(`battle 2: the automatic entry is ${st2.entry}, not railLine`);
    await page.screenshot({ path: path.join(here, 'screens', 'auto.png') });
    if (!st2.ended) {
      await page.locator('#menu button[data-entry="breakOff"]').tap();
      await wait(300);
      st2 = await state();
      if (st2.entry !== 'breakOff' || st2.choices !== 1) errors.push(`battle 2: Break off from the menu did not take (${JSON.stringify(st2)})`);
    }
  }
  battles.push({ label: 'battle 2 (auto)', end: await finish('battle 2', 'end2.png'), decision: st2, inputs: (await played()).join(' ') });

  // Replay every export headless: each must print MATCH.
  const dir = mkdtempSync(path.join(os.tmpdir(), 'proto-export-')), replays = [];
  exports.forEach((x, i) => {
    const file = path.join(dir, `export-${i + 1}.json`);
    writeFileSync(file, x.text);
    let out = '', code = 0;
    try { out = execFileSync('node', [path.join(here, 'replay.mjs'), file], { encoding: 'utf8' }); } catch (e) { out = e.stdout || String(e); code = e.status ?? 1; }
    const lines = out.trim().split('\n'), verdict = lines.pop(), j = JSON.parse(x.text);
    replays.push(`${x.label}: step ${j.step}, choices ${JSON.stringify(j.choices)}, end "${j.end}", hash ${j.hash}; node proto/replay.mjs ${file} -> ${lines.filter((l) => /^(hash|end) +replay/.test(l)).join('; ')}; ${verdict}`);
    if (code !== 0 || verdict !== 'MATCH') errors.push(`replay of ${x.label}: ${verdict}`);
  });
  await browser.close();

  console.log(`version on the page ${shownVersion}`);
  console.log(`determinism: Chromium ${inPage.hash} (${inPage.steps} steps, ${inPage.events} events, ${inPage.endLine}; battle hash ${inPage.battle}), Node ${inNode}: ${determinism}`);
  console.log(`viewport ${VIEWPORT.width} x ${VIEWPORT.height}, touch; after Restart seed ${nextSeed}`);
  for (const x of battles) console.log(`${x.label}: verbs ${x.inputs || 'none'}; ${x.end.ended ? `ended: ${x.end.ended.kind} ${x.end.ended.side} at ${x.end.ended.t.toFixed(2)} s` : `no end by ${x.end.t.toFixed(2)} s simulated`}`);
  for (const r of replays) console.log(r);
  console.log(`console errors: ${consoleErrors.length}`);
  console.log(`failures: ${errors.length}${errors.length ? '' : ' (PASS)'}`);
  for (const e of errors) console.log(`  ${e}`);
  failed = errors.length > 0;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
