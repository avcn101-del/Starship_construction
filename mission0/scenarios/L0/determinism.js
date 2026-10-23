import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// S9 of physics pass 2 (DESIGN.md 13k.4): a deterministic kernel across JavaScript engines (13k.1, #239 Q6). The
// L0 lock hashes cases, expected, compare and invariants but not helpers (#175). Needs Playwright (NODE_PATH, default
// /opt/node-tools/node_modules) and Chromium (PLAYWRIGHT_BROWSERS_PATH), as the smoke test does.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export default {
  id: 'L0.determinism',
  level: 'L0',
  laws: ['deterministic: the same seed and inputs give the same battle on every engine (#239 Q6, 13k.1)'],
  dependsOn: [],
  setup: '(hash) node tools/determinism.mjs --chromium: the duel of proto/duel.js on the kernel\'s symmetric loop (L5d, #301 (5): createDuel of seed 7, both ships R1d-A, the player on Evade from t = 0, broadside, so both ships turn, against the standard enemy, run for 60 s) in Node and in Chromium through Playwright; (grep) every file of js/ with its comments removed (13k.4 S9)',
  measure: '(hash) the two event hashes and the tool\'s verdict; (grep) every use of Math.pow, Math.sin, Math.cos, and every ** whose exponent is not an integer literal',
  tolerance: 'exact',
  criterion: 'the Node and Chromium hashes are equal and the tool prints MATCH; js/ holds no Math.pow, Math.sin or Math.cos and no ** with a non-integer exponent (#239 Q6, #243)',
  tunable: [],
  locked: { date: '2026-10-22', hash: '381f764c' },
  cases() {
    return [{ part: 'hash' }, { part: 'grep' }];
  },
  expected(ctx, c) {
    return c.part === 'hash' ? { verdict: 'MATCH' } : { hits: [] };
  },
  run(ctx, c) {
    if (c.part === 'hash') {
      const env = { ...process.env, NODE_PATH: process.env.NODE_PATH || '/opt/node-tools/node_modules' };
      const out = execFileSync('node', [path.join(ROOT, 'tools', 'determinism.mjs'), '--chromium'], { encoding: 'utf8', env }).trim().split('\n');
      const node = out[0].split(/\s+/)[0], chromium = out[1] ? out[1].split(/\s+/)[0] : null, verdict = out[1] ? out[1].trim().split(/\s+/).pop() : null;
      return { node, chromium, verdict };
    }
    const hits = [];
    const dir = path.join(ROOT, 'js');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
      const code = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      code.split('\n').forEach((line, i) => {
        if (/Math\.(pow|sin|cos)\b/.test(line)) hits.push(`${f}:${i + 1} ${line.trim()}`);
        for (const m of line.matchAll(/\*\*\s*([^\s;,)]+)/g)) if (!/^-?\d+$/.test(m[1])) hits.push(`${f}:${i + 1} ${line.trim()}`);
      });
    }
    return { hits };
  },
  compare(e, a, c) {
    const pass = c.part === 'hash' ? a.verdict === 'MATCH' && a.node !== null && a.node === a.chromium : a.hits.length === 0;
    return { pass, note: pass ? '' : c.part === 'hash' ? 'hash mismatch' : `${a.hits.length} forbidden uses` };
  },
  display(r) {
    return r.case.part === 'hash'
      ? { expected: 'Node hash = Chromium hash, MATCH', actual: `Node ${r.actual.node}, Chromium ${r.actual.chromium}: ${r.actual.verdict}` }
      : { expected: 'no Math.pow, Math.sin, Math.cos, ** with a non-integer in js/', actual: r.actual.hits.length ? r.actual.hits.join(' | ') : 'none' };
  },
};
