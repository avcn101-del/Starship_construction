import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Successor of L0.determinism (#310): the same hash part (S9, DESIGN.md 13k.4: proto/duel.js in Node and in
// Chromium) and a grep for every Math member in js/ whose result is not exact or correctly rounded by IEEE 754
// and ECMAScript. The original's grep named only Math.pow, Math.sin and Math.cos, and Math.atan2, Math.cbrt and
// Math.hypot in the kernel gave different hashes in Node and Chromium (PR #96). The allowed list is in
// expected(), inside the L0 lock (#175: run() is hashed into each record, not into the lock). Needs Playwright
// (NODE_PATH, default /opt/node-tools/node_modules) and Chromium (PLAYWRIGHT_BROWSERS_PATH), as the smoke test does.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export default {
  id: 'L0.determinism.v2',
  level: 'L0',
  laws: ['deterministic: the same seed and inputs give the same battle on every engine (#239 Q6, 13k.1, #310)'],
  dependsOn: [],
  setup: '(hash) node tools/determinism.mjs --chromium: the duel of proto/duel.js on the kernel\'s symmetric loop (L5d, #301 (5), #311: createDuel of seed 7, both ships R1d-A, the player on Evade from t = 0, broadside, so both ships turn, against the standard enemy, run for 60 s) in Node and in Chromium through Playwright; (grep) every file of js/ with its comments removed',
  measure: '(hash) the two event hashes and the tool\'s verdict; (grep) every use of Math (its member, or the bare name), and every ** whose exponent is not an integer literal',
  tolerance: 'exact',
  criterion: 'the Node and Chromium hashes are equal and the tool prints MATCH; js/ uses no Math member but the exact or correctly rounded abs, ceil, floor, round, trunc, sign, min, max, sqrt, fround, imul, clz32 and the constants PI, E, LN2, LN10, LOG2E, LOG10E, SQRT2, SQRT1_2, never Math bare, and no ** with a non-integer exponent (#239 Q6, #243, #310)',
  tunable: [],
  locked: { date: '2026-10-23', hash: 'e328384c' },
  cases() {
    return [{ part: 'hash' }, { part: 'grep' }];
  },
  expected(ctx, c) {
    return c.part === 'hash'
      ? { verdict: 'MATCH' }
      : { allowed: ['abs', 'ceil', 'floor', 'round', 'trunc', 'sign', 'min', 'max', 'sqrt', 'fround', 'imul', 'clz32', 'PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2'], hits: [] };
  },
  run(ctx, c) {
    if (c.part === 'hash') {
      const env = { ...process.env, NODE_PATH: process.env.NODE_PATH || '/opt/node-tools/node_modules' };
      const out = execFileSync('node', [path.join(ROOT, 'tools', 'determinism.mjs'), '--chromium'], { encoding: 'utf8', env }).trim().split('\n');
      const node = out[0].split(/\s+/)[0], chromium = out[1] ? out[1].split(/\s+/)[0] : null, verdict = out[1] ? out[1].trim().split(/\s+/).pop() : null;
      return { node, chromium, verdict };
    }
    const members = {}, power = [];
    const dir = path.join(ROOT, 'js');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
      const code = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/\/\/.*$/gm, ''); // block comments keep their line breaks, so line numbers are the file's
      code.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/\bMath\b(?:\s*\.\s*([A-Za-z_$][\w$]*))?/g)) (members[m[1] || '(bare)'] ||= []).push(`${f}:${i + 1}`);
        for (const m of line.matchAll(/\*\*\s*([^\s;,)]+)/g)) if (!/^-?\d+$/.test(m[1])) power.push(`${f}:${i + 1} ${line.trim()}`);
      });
    }
    return { members: Object.fromEntries(Object.keys(members).sort().map((k) => [k, members[k]])), power };
  },
  compare(e, a, c) {
    if (c.part === 'hash') {
      const pass = a.verdict === 'MATCH' && a.node !== null && a.node === a.chromium;
      return { pass, note: pass ? '' : 'hash mismatch' };
    }
    const bad = Object.keys(a.members).filter((m) => !e.allowed.includes(m)), pass = bad.length === 0 && a.power.length === 0;
    return { pass, note: pass ? '' : `forbidden: ${bad.map((m) => 'Math.' + m).join(', ')}${a.power.length ? `; ${a.power.length} ** with a non-integer exponent` : ''}` };
  },
  display(r) {
    return r.case.part === 'hash'
      ? { expected: 'Node hash = Chromium hash, MATCH', actual: `Node ${r.actual.node}, Chromium ${r.actual.chromium}: ${r.actual.verdict}` }
      : { expected: 'only exact or correctly rounded Math members, no ** with a non-integer, in js/', actual: `Math members used: ${Object.keys(r.actual.members).join(', ')}; forbidden: ${[...Object.keys(r.actual.members).filter((m) => !r.expected.allowed.includes(m)).map((m) => `Math.${m} at ${r.actual.members[m].join(' ')}`), ...r.actual.power].join(' | ') || 'none'}` };
  },
};
