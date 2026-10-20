#!/usr/bin/env node
// tools/m0.js — the Mission 0 runner (DESIGN.md §13). Text only.
//
//   node tools/m0.js list
//   node tools/m0.js run <id|level> [--set group.name=value ...]
//   node tools/m0.js lock <id|level>       lock criteria BEFORE the first run
//   node tools/m0.js verify <id|level>     independent re-run from the record
//   node tools/m0.js regress               re-run every recorded PASS
//   node tools/m0.js ledger                regenerate MISSION0.md
//
// A run without --set is canonical and is recorded in mission0/results/.
// A run with --set is exploratory: printed, never recorded.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PARAMS, FIXED, TIERS, BASE_EDGE, scaled, withOverrides } from '../js/data.js';
import { hash, stableStringify } from '../js/util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCEN = path.join(ROOT, 'mission0', 'scenarios');
const RESULTS = path.join(ROOT, 'mission0', 'results');
const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

// ---------- discovery ----------
async function loadAll() {
  const out = [];
  for (const level of LEVELS) {
    const dir = path.join(SCEN, level);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
      const file = path.join(dir, f);
      const mod = await import(pathToFileURL(file).href);
      out.push({ ...mod.default, file });
    }
  }
  return out;
}
function select(all, sel) {
  const list = all.filter((s) => s.id === sel || s.level === sel);
  if (!list.length) throw new Error(`no scenario matches ${sel}`);
  return list;
}

// ---------- locking ----------
// The hash covers everything that defines the criterion: what is measured,
// the cases, the expected formula, the comparison and the invariants. It
// does NOT cover run(): changing the simulation is allowed, changing the
// test is not.
function criterionHash(s) {
  const parts = {
    id: s.id, level: s.level, laws: s.laws, dependsOn: s.dependsOn, measure: s.measure,
    tolerance: s.tolerance, criterion: s.criterion,
    cases: String(s.cases), expected: String(s.expected), compare: String(s.compare),
    invariants: String(s.invariants || ''),
  };
  return hash(stableStringify(parts));
}
function lockScenario(s, date) {
  if (s.locked) return `${s.id}: already locked (${s.locked.date}, ${s.locked.hash}); a locked criterion is never re-locked`;
  const text = fs.readFileSync(s.file, 'utf8');
  if (!/\n\s*locked:\s*null,/.test(text)) throw new Error(`${s.id}: no "locked: null," line to replace`);
  const h = criterionHash(s);
  fs.writeFileSync(s.file, text.replace(/(\n\s*)locked:\s*null,/, `$1locked: { date: '${date}', hash: '${h}' },`));
  return `${s.id}: locked ${h}`;
}

// ---------- running ----------
function context(overrides) {
  return { params: withOverrides(overrides), fixed: FIXED, tiers: TIERS, baseEdge: BASE_EDGE, scaled, dt: 1 / 60 };
}
function hasNaN(v) {
  if (typeof v === 'number') return !Number.isFinite(v);
  if (Array.isArray(v)) return v.some(hasNaN);
  if (v && typeof v === 'object') return Object.values(v).some(hasNaN);
  return false;
}
function execute(s, overrides) {
  const ctx = context(overrides);
  const rows = s.cases(ctx).map((c) => {
    const expected = s.expected(ctx, c);
    const actual = s.run(ctx, c);
    const { pass, note } = s.compare(expected, actual, c, ctx);
    return { case: c, expected, actual, pass, note: note || '' };
  });
  const invariants = (s.invariants ? s.invariants(ctx, rows) : []).slice();
  invariants.push({ name: 'no NaN or infinity', ok: !rows.some((r) => hasNaN(r.actual)) });
  const again = s.cases(ctx).map((c) => s.run(context(overrides), c));
  const rowsHash = hash(stableStringify(rows.map((r) => r.actual)));
  invariants.push({ name: 'deterministic (two runs, same hash)', ok: hash(stableStringify(again)) === rowsHash });
  return { rows, invariants, rowsHash, dataHash: hash(stableStringify(ctx.params)) };
}
function verdictOf(s, res, deps) {
  if (!s.locked) return 'UNLOCKED';
  if (s.locked.hash !== criterionHash(s)) return 'CRITERION CHANGED';
  if (deps.length) return 'BLOCKED';
  return res.rows.every((r) => r.pass) && res.invariants.every((i) => i.ok) ? 'PASS' : 'FAIL';
}
function recorded(id) {
  const f = path.join(RESULTS, `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
function unmetDeps(s) {
  return (s.dependsOn || []).filter((d) => (recorded(d) || {}).verdict !== 'PASS');
}
function gitState() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain -- js mission0/scenarios tools', { cwd: ROOT }).toString().trim() !== '';
    return `${sha}${dirty ? '+dirty' : ''}`;
  } catch { return 'unknown'; }
}

// ---------- printing ----------
const fmt = (v) => {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(4) : v.toPrecision(5);
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}=${fmt(x)}`).join(' ');
  return String(v);
};
function show(s, res, verdict, command) {
  const lines = [];
  lines.push(`\n${s.id}  [${s.level}]  ${s.laws.join(', ')}`);
  lines.push(`  setup:     ${s.setup}`);
  lines.push(`  measure:   ${s.measure}`);
  lines.push(`  criterion: ${s.criterion}`);
  lines.push(`  tolerance: ${s.tolerance}`);
  for (const r of res.rows) {
    const shown = s.display ? s.display(r) : { expected: fmt(r.expected), actual: fmt(r.actual) };
    lines.push(`  ${r.pass ? 'PASS' : 'FAIL'}  ${fmt(r.case).padEnd(26)} expected ${shown.expected}`);
    lines.push(`        ${''.padEnd(26)} actual   ${shown.actual}${r.note ? '   (' + r.note + ')' : ''}`);
  }
  for (const i of res.invariants) lines.push(`  ${i.ok ? 'ok  ' : 'FAIL'}  invariant: ${i.name}${i.detail ? ' — ' + i.detail : ''}`);
  lines.push(`  => ${verdict}    reproduce: ${command}`);
  return lines.join('\n');
}

// ---------- commands ----------
function parseSets(args) {
  const out = {};
  const warnings = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--set') continue;
    const [k, v] = args[++i].split('=');
    const [g, n] = k.split('.');
    const p = PARAMS[g] && PARAMS[g][n];
    if (!p) throw new Error(`unknown constant ${k}`);
    const value = Number(v);
    if (!(value >= p.min && value <= p.max)) throw new Error(`${k}=${v} is outside the approved range ${p.min}..${p.max}; only the owner can approve a value outside it`);
    if (!p.approved) warnings.push(`${k} has no approved range yet: exploratory only, the owner must approve it before agents tune it`);
    out[k] = value;
  }
  return { overrides: out, warnings };
}

async function main() {
  const [cmd, sel, ...rest] = process.argv.slice(2);
  const all = await loadAll();
  if (!cmd || cmd === 'list') {
    for (const s of all) {
      const r = recorded(s.id);
      console.log(`${s.id.padEnd(28)} ${s.locked ? 'locked ' + s.locked.hash : 'UNLOCKED       '}  ${r ? r.verdict : '-'}`);
    }
    return;
  }
  if (cmd === 'lock') {
    const date = new Date().toISOString().slice(0, 10);
    for (const s of select(all, sel)) console.log(lockScenario(s, date));
    return;
  }
  if (cmd === 'run') {
    const { overrides, warnings } = parseSets(rest);
    const canonical = Object.keys(overrides).length === 0;
    warnings.forEach((w) => console.log('warning: ' + w));
    let failed = 0;
    for (const s of select(all, sel)) {
      const res = execute(s, overrides);
      const deps = unmetDeps(s);
      const verdict = verdictOf(s, res, deps);
      const sets = Object.entries(overrides).map(([k, v]) => ` --set ${k}=${v}`).join('');
      const command = `node tools/m0.js run ${s.id}${sets}`;
      console.log(show(s, res, canonical ? verdict : `${verdict} (exploratory, not recorded)`, command));
      if (deps.length) console.log(`  blocked by: ${deps.join(', ')}`);
      if (verdict !== 'PASS') failed++;
      if (canonical && s.locked) {
        fs.mkdirSync(RESULTS, { recursive: true });
        const record = {
          id: s.id, level: s.level, verdict, command, code: gitState(),
          criterionHash: criterionHash(s), lockedHash: s.locked.hash, dataHash: res.dataHash, rowsHash: res.rowsHash,
          rows: res.rows, invariants: res.invariants,
        };
        fs.writeFileSync(path.join(RESULTS, `${s.id}.json`), JSON.stringify(record, null, 2) + '\n');
      }
    }
    process.exitCode = failed ? 1 : 0;
    return;
  }
  if (cmd === 'verify' || cmd === 'regress') {
    const list = cmd === 'regress' ? all.filter((s) => (recorded(s.id) || {}).verdict === 'PASS') : select(all, sel);
    let bad = 0;
    for (const s of list) {
      const rec = recorded(s.id);
      if (!rec) { console.log(`${s.id}: no record to verify`); bad++; continue; }
      const res = execute(s, {});
      const checks = [
        ['criterion unchanged since lock', s.locked && criterionHash(s) === s.locked.hash && rec.lockedHash === s.locked.hash],
        ['same results as recorded', res.rowsHash === rec.rowsHash],
        ['same data as recorded', res.dataHash === rec.dataHash],
        ['still passes', verdictOf(s, res, unmetDeps(s)) === 'PASS'],
      ];
      const ok = checks.every(([, v]) => v);
      if (!ok) bad++;
      console.log(`${ok ? 'VERIFIED' : 'MISMATCH'}  ${s.id}  ${checks.map(([n, v]) => `${v ? 'ok' : 'NO'} ${n}`).join('; ')}`);
    }
    process.exitCode = bad ? 1 : 0;
    return;
  }
  if (cmd === 'ledger') {
    const lines = ['# MISSION0 — results ledger', '',
      'Generated by `node tools/m0.js ledger` from `mission0/results/`; do not edit by hand.',
      'Each row: the scenario, its locked criterion hash, the verdict of its last canonical run,',
      'the code it ran on, and the command that reproduces it (`DESIGN.md` §13).', ''];
    for (const level of LEVELS) {
      const ss = all.filter((s) => s.level === level);
      lines.push(`## ${level}`, '');
      if (!ss.length) { lines.push('Not started.', ''); continue; }
      lines.push('| Scenario | Criterion | Verdict | Code | Reproduce |', '|---|---|---|---|---|');
      for (const s of ss) {
        const r = recorded(s.id);
        lines.push(`| \`${s.id}\` | ${s.locked ? s.locked.hash : 'unlocked'} | ${r ? r.verdict : 'not run'} | ${r ? r.code : '-'} | \`${r ? r.command : '-'}\` |`);
      }
      lines.push('');
    }
    fs.writeFileSync(path.join(ROOT, 'MISSION0.md'), lines.join('\n'));
    console.log('MISSION0.md written');
    return;
  }
  throw new Error(`unknown command ${cmd}`);
}
main().catch((e) => { console.error('error: ' + e.message); process.exitCode = 2; });
