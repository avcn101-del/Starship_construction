#!/usr/bin/env node
// tools/determinism.mjs — the hash of the determinism duel on the kernel's
// symmetric loop (proto/duel.js duelHash: createDuel({ seed: 7, inputs: [{ t: 0,
// verb: 'preset', arg: 'evade' }] }), both ships R1d-A, the player on Evade from
// t = 0 so both ships turn, run for 60 s; every event and every body's final
// state) in Node (DESIGN.md 13k.1, #239 Q6, #301 (5), scenario L0.determinism).
// proto/smoke.mjs computes the same in Chromium; the two must MATCH. Prints
// one line: the hash, then the steps, the events, the end, the kernel's battle
// hash (js/battle.js battleHash) and the final headings.
// With --chromium it also serves the repository (python3 -m http.server),
// runs the same duel in Chromium through Playwright (NODE_PATH=/opt/node-
// tools/node_modules) and prints a second line: the Chromium hash and MATCH
// or MISMATCH.
//
//   node tools/determinism.mjs [--chromium]
import { duelHash } from '../proto/duel.js';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const r = duelHash();
console.log(`${r.hash}  steps ${r.steps}, events ${r.events}, end ${r.endLine}, battle hash ${r.battle}, final headings ${r.headings.map((x) => (x === undefined ? '-' : x.toFixed(6))).join(' / ')} rad`);

if (process.argv.includes('--chromium')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PORT = 8738;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/proto/duel.js`); break; } catch { await new Promise((ok) => setTimeout(ok, 100)); } }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/proto/`);
    const c = await page.evaluate(async () => { const x = (await import('/proto/duel.js')).duelHash(); return { hash: x.hash }; });
    await browser.close();
    console.log(`${c.hash}  Chromium ${chromium.name()}: ${c.hash === r.hash ? 'MATCH' : 'MISMATCH'}`);
  } finally {
    server.kill();
  }
}
