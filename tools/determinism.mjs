#!/usr/bin/env node
// tools/determinism.mjs — the event hash of a fixed 60 s R1 duel with turning
// (proto/duel.js) in Node (DESIGN.md 13k.1, #239 Q6, scenario L0.determinism).
// proto/smoke.mjs computes the same in Chromium; the two must MATCH. Prints
// one line: the hash, then the steps, the events and the final headings.
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
console.log(`${r.hash}  steps ${r.steps}, events ${r.events}, end ${r.end === null ? 'none' : r.end.toFixed(4) + ' s'}, final headings ${r.headings.map((x) => (x === undefined ? '-' : x.toFixed(6))).join(' / ')} rad`);

if (process.argv.includes('--chromium')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PORT = 8738;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/proto/duel.js`); break; } catch { await new Promise((ok) => setTimeout(ok, 100)); } }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/proto/`);
    const c = await page.evaluate(async () => (await import('/proto/duel.js')).duelHash());
    await browser.close();
    console.log(`${c.hash}  Chromium ${chromium.name()}: ${c.hash === r.hash ? 'MATCH' : 'MISMATCH'}`);
  } finally {
    server.kill();
  }
}
