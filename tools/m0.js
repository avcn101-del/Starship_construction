#!/usr/bin/env node
// tools/m0.js — the Mission 0 runner (DESIGN.md §13). Text only.
//
//   node tools/m0.js list
//   node tools/m0.js run <id|level> [--set group.name=value ...]
//   node tools/m0.js lock <id|level>       lock criteria BEFORE the first run
//   node tools/m0.js verify <id|level>     independent re-run from the record
//   node tools/m0.js regress               re-run every recorded PASS; check every withdrawn scenario
//                                          against its frozen record, not run (#245, #250; a retired
//                                          one is listed, not run, #237)
//   node tools/m0.js ledger                regenerate MISSION0.md
//
// A run without --set is canonical and is recorded in mission0/results/.
// A run with --set is exploratory: printed, never recorded.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PARAMS, FIXED, ROOMS, TIERS, BASE_EDGE, scaled, withOverrides } from '../js/data.js';
import { hash, stableStringify } from '../js/util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCEN = path.join(ROOT, 'mission0', 'scenarios');
const RESULTS = path.join(ROOT, 'mission0', 'results');
const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
// Scenarios withdrawn for a specification error (#187 (8)) or as superseded
// (#188, #200): each stays locked with its record; verify and regress report
// it as WITHDRAWN while it keeps the verdict it was recorded with. A
// withdrawn scenario marked `retired` (#237: it reads a constant data.js no
// longer holds) is listed as RETIRED and not run, its file, lock and last
// record unchanged; verify and regress count it apart. A withdrawn scenario
// marked `frozen` keeps its withdrawal-time record (#245 guard (2)): a
// canonical run skips it, and verify and regress check its lock and its run()
// against that record instead of re-running it against today's data. Every
// withdrawn scenario that is not retired is frozen (#250).
const WITHDRAWN_FILE = path.join(ROOT, 'mission0', 'withdrawn.json');
const WITHDRAWN = new Map((fs.existsSync(WITHDRAWN_FILE) ? JSON.parse(fs.readFileSync(WITHDRAWN_FILE, 'utf8')) : []).map((w) => [w.id, w]));
/** The scenario that stands for `id`: itself, or the end of its chain of successors when it was withdrawn and its successor withdrawn in turn (#188, #221). */
function standing(id) {
  const seen = new Set();
  while (WITHDRAWN.has(id) && !seen.has(id)) { seen.add(id); id = WITHDRAWN.get(id).successor; }
  return id;
}
/** #188, #189 (6): every entry names a locked scenario, a successor that exists and is locked, a chain of successors that ends in one recorded PASS, and a decision #n. */
function checkWithdrawn(all) {
  const byId = new Map(all.map((s) => [s.id, s]));
  for (const w of WITHDRAWN.values()) {
    const s = byId.get(w.id), next = byId.get(w.successor), last = standing(w.successor);
    const problem = !s ? 'the withdrawn scenario does not exist'
      : !s.locked ? 'the withdrawn scenario is not locked'
      : !next ? `its successor ${w.successor} does not exist`
      : !next.locked ? `its successor ${w.successor} is not locked`
      : WITHDRAWN.has(last) ? `its chain of successors from ${w.successor} loops`
      : !byId.has(last) || !byId.get(last).locked ? `the last successor ${last} does not exist or is not locked`
      : (recorded(last) || {}).verdict !== 'PASS' ? `its successor ${last === w.successor ? w.successor : `${w.successor}, through ${last},`} is not recorded PASS`
      : !/^#\d+$/.test(String(w.decision)) ? `decision "${w.decision}" is not a decision number (#n)`
      : w.retired !== undefined && w.retired !== true ? 'retired must be true when present'
      : w.retired && (!/^#\d+$/.test(String(w.retiredDecision)) || !w.retiredReason) ? 'a retired scenario needs a retiredDecision (#n) and a retiredReason'
      : w.frozen !== undefined && w.frozen !== true ? 'frozen must be true when present'
      : w.frozen && !recorded(w.id) ? 'a frozen scenario needs its withdrawal-time record'
      : !w.retired && !w.frozen ? 'a withdrawn scenario must be frozen (#245, #250)'
      : null;
    if (problem) throw new Error(`mission0/withdrawn.json, ${w.id}: ${problem}`);
  }
}

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
  // Dependencies first, so a level runs in one pass.
  const byId = new Map(list.map((s) => [s.id, s]));
  const done = new Set(), out = [];
  const visit = (s) => {
    if (done.has(s.id)) return;
    done.add(s.id);
    for (const d of s.dependsOn || []) if (byId.has(d)) visit(byId.get(d));
    out.push(s);
  };
  list.forEach(visit);
  return out;
}

// ---------- locking ----------
// L0 rule (kept so the L0 locks stay valid): the hash covers everything that
// defines the criterion: what is measured, the cases, the expected formula,
// the comparison and the invariants, but NOT run() or helpers in the file.
// From L1 on (#184): the hash covers the whole scenario file except its
// `locked:` line, so nothing in the file can change after the lock.
// run() is also hashed separately into each record (runHash, #175), so
// verify notices a run() edited since the canonical run.
// The stripped line may hold nothing but `locked: null` or the lock object
// that `lock` writes, with an optional trailing comma; any other text on it
// is an error, so nothing can be smuggled past the hash (#189 (2)). Which
// rule applies is decided by the scenario's folder, not by its own `level`.
const LOCKED_LINE = /^[ \t]*locked:.*(\r?\n|$)/m;
const VALID_LOCKED_LINE = /^[ \t]*locked:[ \t]*(?:null|\{ date: '\d{4}-\d{2}-\d{2}', hash: '[0-9a-f]{8}' \})[ \t]*,?[ \t]*(\r?\n|$)/;
const folderOf = (s) => path.basename(path.dirname(s.file));
function criterionHash(s) {
  const folder = folderOf(s);
  if (folder !== s.level) throw new Error(`${s.id}: level ${s.level} but its file is in mission0/scenarios/${folder}/`);
  if (folder !== 'L0') {
    const text = fs.readFileSync(s.file, 'utf8'), line = text.match(LOCKED_LINE);
    if (!line) throw new Error(`${s.id}: no locked: line`);
    if (!VALID_LOCKED_LINE.test(line[0])) throw new Error(`${s.id}: the locked: line holds other text; it may contain only "locked: null" or "locked: { date: '...', hash: '...' }" with an optional trailing comma (#189 (2)): ${line[0].trim()}`);
    return hash(text.replace(LOCKED_LINE, ''));
  }
  const parts = {
    id: s.id, level: s.level, laws: s.laws, dependsOn: s.dependsOn, measure: s.measure,
    tolerance: s.tolerance, criterion: s.criterion,
    cases: String(s.cases), expected: String(s.expected), compare: String(s.compare),
    invariants: String(s.invariants || ''),
  };
  return hash(stableStringify(parts));
}
function runHash(s) {
  return hash(String(s.run));
}
/** Constants this scenario's verdict depends on that the owner has not approved. */
function unapproved(s) {
  return (s.tunable || []).filter((k) => {
    const [g, n] = k.split('.');
    return PARAMS[g] && PARAMS[g][n] && !PARAMS[g][n].approved;
  });
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
  return { params: withOverrides(overrides), fixed: FIXED, tiers: TIERS, baseEdge: BASE_EDGE, scaled, dt: FIXED.simStep.value };
}
function hasNaN(v) {
  if (typeof v === 'number') return !Number.isFinite(v);
  if (Array.isArray(v)) return v.some(hasNaN);
  if (v && typeof v === 'object') return Object.values(v).some(hasNaN);
  return false;
}
// A case whose run() throws is recorded as a FAIL with the error as its
// actual value, so a locked scenario the kernel no longer satisfies (a
// withdrawn one, #188) keeps a record instead of stopping the runner (#206).
function runCase(s, ctx, c) {
  try { return s.run(ctx, c); } catch (e) { return { error: String(e && e.message ? e.message : e) }; }
}
// Likewise a case whose expected() throws (a locked formula naming a constant
// that a later decision removed, #221) is recorded as a FAIL with the error.
function expectedCase(s, ctx, c) {
  try { return { value: s.expected(ctx, c) }; } catch (e) { return { error: String(e && e.message ? e.message : e) }; }
}
function execute(s, overrides) {
  const ctx = context(overrides);
  const rows = s.cases(ctx).map((c) => {
    const exp = expectedCase(s, ctx, c);
    const actual = runCase(s, ctx, c);
    if (exp.error !== undefined) return { case: c, expected: { error: exp.error }, actual, pass: false, note: `expected() threw: ${exp.error}` };
    const expected = exp.value;
    if (actual && actual.error !== undefined && Object.keys(actual).length === 1) return { case: c, expected, actual, pass: false, note: `run() threw: ${actual.error}` };
    const { pass, note } = s.compare(expected, actual, c, ctx);
    return { case: c, expected, actual, pass, note: note || '' };
  });
  const errored = rows.filter((r) => r.note.startsWith('run() threw: ') || r.note.startsWith('expected() threw: '));
  let invariants;
  try { invariants = (s.invariants ? s.invariants(ctx, errored.length ? rows.filter((r) => !errored.includes(r)) : rows) : []).slice(); } catch (e) { invariants = [{ name: 'invariants', ok: false, detail: String(e.message) }]; }
  const ranOut = errored.filter((r) => r.note.startsWith('run() threw: ')).length, formulaOut = errored.length - ranOut;
  if (ranOut) invariants.push({ name: 'run() completes in every case', ok: false, detail: `${ranOut} case(s) threw` });
  if (formulaOut) invariants.push({ name: 'expected() completes in every case', ok: false, detail: `${formulaOut} case(s) threw` });
  invariants.push({ name: 'no NaN or infinity', ok: !rows.some((r) => hasNaN(r.actual)) });
  const again = s.cases(ctx).map((c) => runCase(s, context(overrides), c));
  const rowsHash = hash(stableStringify(rows.map((r) => r.actual)));
  invariants.push({ name: 'deterministic (two runs, same hash)', ok: hash(stableStringify(again)) === rowsHash });
  // The data hash covers PARAMS (with any overrides), FIXED, ROOMS (#185 (9)), TIERS and BASE_EDGE (#189 (7)).
  return { rows, invariants, rowsHash, dataHash: hash(stableStringify({ params: ctx.params, fixed: FIXED, rooms: ROOMS, tiers: TIERS, baseEdge: BASE_EDGE })) };
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
/** Dependencies not recorded PASS; a withdrawn dependency counts through its successor, and through that one's successor if it was withdrawn in turn (#188, #200, #221). */
function unmetDeps(s) {
  return (s.dependsOn || []).filter((d) => (recorded(standing(d)) || {}).verdict !== 'PASS');
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
    let shown;
    try { shown = s.display ? s.display(r) : { expected: fmt(r.expected), actual: fmt(r.actual) }; } catch { shown = { expected: fmt(r.expected), actual: fmt(r.actual) }; }
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
      const retired = WITHDRAWN.get(s.id);
      if (retired && retired.retired) { console.log(`\n${s.id}: RETIRED (${retired.retiredDecision}), not run; its last record stays`); continue; }
      if (canonical && retired && retired.frozen) { console.log(`\n${s.id}: WITHDRAWN (${retired.decision}), frozen (#245): not run; its withdrawal-time record (${(recorded(s.id) || {}).verdict}) stays`); continue; }
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
          criterionHash: criterionHash(s), lockedHash: s.locked.hash, runHash: runHash(s), dataHash: res.dataHash, rowsHash: res.rowsHash,
          rows: res.rows, invariants: res.invariants,
        };
        fs.writeFileSync(path.join(RESULTS, `${s.id}.json`), JSON.stringify(record, null, 2) + '\n');
      }
    }
    process.exitCode = failed ? 1 : 0;
    return;
  }
  if (cmd === 'verify' || cmd === 'regress') {
    checkWithdrawn(all);
    const list = cmd === 'regress'
      ? all.filter((s) => (recorded(s.id) || {}).verdict === 'PASS' || WITHDRAWN.has(s.id))
      : select(all, sel);
    let bad = 0;
    const counts = { VERIFIED: 0, WITHDRAWN: 0, RETIRED: 0, MISMATCH: 0 };
    for (const s of list) {
      const w = WITHDRAWN.get(s.id);
      if (w && w.retired) { counts.RETIRED++; console.log(`RETIRED  ${s.id}  not run (${w.retiredDecision}; successor ${w.successor})`); continue; }
      const rec = recorded(s.id);
      if (!rec) { console.log(`${s.id}: no record to verify`); bad++; continue; }
      if (w && w.frozen) {
        const checks = [
          ['criterion unchanged since lock', s.locked && criterionHash(s) === s.locked.hash && rec.lockedHash === s.locked.hash],
          ['run() unchanged since record', !rec.runHash || runHash(s) === rec.runHash],
          ['withdrawal-time record kept', rec.verdict === 'FAIL' || rec.verdict === 'PASS'],
        ];
        const ok = checks.every(([, v]) => v);
        if (!ok) bad++;
        const label = ok ? 'WITHDRAWN' : 'MISMATCH';
        counts[label]++;
        console.log(`${label}  ${s.id}  ${checks.map(([n, v]) => `${v ? 'ok' : 'NO'} ${n}`).join('; ')}  (frozen record ${rec.verdict} at data ${rec.dataHash}, #245; successor ${w.successor}, ${w.decision})`);
        continue;
      }
      const res = execute(s, {});
      const verdict = verdictOf(s, res, unmetDeps(s));
      const checks = [
        ['criterion unchanged since lock', s.locked && criterionHash(s) === s.locked.hash && rec.lockedHash === s.locked.hash],
        ['same results as recorded', res.rowsHash === rec.rowsHash],
        ['same data as recorded', res.dataHash === rec.dataHash],
        ...(rec.runHash ? [['run() unchanged since record', runHash(s) === rec.runHash]] : []),
        // A withdrawn scenario keeps the verdict it was recorded with: FAIL, or PASS when it tests a superseded pure
        // function the kernel keeps for the prototype (13i.1) while the game rule moved to its successor.
        w ? ['same verdict as recorded', (verdict === 'FAIL' || verdict === 'PASS') && verdict === rec.verdict] : ['still passes', verdict === 'PASS'],
      ];
      const ok = checks.every(([, v]) => v);
      if (!ok) bad++;
      const label = !ok ? 'MISMATCH' : w ? 'WITHDRAWN' : 'VERIFIED';
      counts[label]++;
      const why = w ? `  (successor ${w.successor}, ${w.decision})` : '';
      console.log(`${label}  ${s.id}  ${checks.map(([n, v]) => `${v ? 'ok' : 'NO'} ${n}`).join('; ')}${why}`);
    }
    console.log(`${counts.VERIFIED} VERIFIED + ${counts.WITHDRAWN} WITHDRAWN + ${counts.RETIRED} RETIRED${counts.MISMATCH ? ` + ${counts.MISMATCH} MISMATCH` : ''}${bad - counts.MISMATCH > 0 ? ` (${bad - counts.MISMATCH} without a record)` : ''}`);
    process.exitCode = bad ? 1 : 0;
    return;
  }
  if (cmd === 'ledger') {
    checkWithdrawn(all);
    const lines = ['# MISSION0 — results ledger', '',
      'Generated by `node tools/m0.js ledger` from `mission0/results/`; do not edit by hand.',
      'Each row: the scenario, its locked criterion hash, the verdict of its last canonical run,',
      'the hash of its run() at that run, the code it ran on, the unapproved constants the verdict',
      'depends on (it holds only once the owner approves them), and the command that reproduces it',
      '(`DESIGN.md` §13). A WITHDRAWN scenario is superseded by its successor (a later decision) or was',
      'a specification error; it stays locked with its withdrawal-time record, frozen: run, verify and',
      'regress never re-run it (#245, #250). It is listed in `mission0/withdrawn.json` with its successor',
      'and decision (#187 (8), #188, E-F10 of the scenario audit).',
      'A RETIRED scenario reads a constant `data.js` no longer holds: listed, not run (#237).', ''];
    for (const level of LEVELS) {
      const ss = all.filter((s) => s.level === level);
      lines.push(`## ${level}`, '');
      if (!ss.length) { lines.push('Not started.', ''); continue; }
      lines.push('| Scenario | Criterion | Verdict | run() | Code | Depends on unapproved | Reproduce |', '|---|---|---|---|---|---|---|');
      for (const s of ss) {
        const r = recorded(s.id);
        const un = unapproved(s).map((k) => `\`${k}\``).join(', ') || 'none';
        const w = WITHDRAWN.get(s.id);
        const verdict = !r ? 'not run' : w && w.retired ? `${r.verdict}, WITHDRAWN (successor \`${w.successor}\`, ${w.decision}), RETIRED (${w.retiredDecision}, not run)` : w ? `${r.verdict}, WITHDRAWN (successor \`${w.successor}\`, ${w.decision})` : r.verdict;
        lines.push(`| \`${s.id}\` | ${s.locked ? s.locked.hash : 'unlocked'} | ${verdict} | ${r && r.runHash ? r.runHash : '-'} | ${r ? r.code : '-'} | ${un} | \`${r ? r.command : '-'}\` |`);
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
