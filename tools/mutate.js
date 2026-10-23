#!/usr/bin/env node
// tools/mutate.js — coverage by mutation (#246 (1), DESIGN.md §17 item 21).
// Each mutation of tools/mutations.json ({ id, rule, file, old, new }) is
// applied to a scratch copy of the repository (never the working tree), and
// every scenario `regress` reports VERIFIED runs there through
// `node tools/m0.js cov`. A rule whose mutation leaves every verdict PASS is a
// finding, not an error: the exit code is 0 unless the tool itself fails.
//
//   node tools/mutate.js [--jobs n] [--timeout s] [--only id,id] [--rule prefix]
//                        [--out file] [--catalogue file] [--no-fail-fast]
//
// Classes: STALE (`old` not found exactly once in `file`), KILLED (some
// verdict is not PASS, or the run throws), CHANGED (every verdict PASS, some
// result differs from its record: an output moved, which is not coverage, no
// criterion noticed it, #257), SURVIVED (every verdict PASS, every result as
// recorded), TIMEOUT (the run took longer than --timeout, default 600 s).
// A changed data hash alone is not a kill: a data.js mutation that only
// changes the data hash is not caught by physics.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// What the runner reads: the kernel, the tools, the scenarios and records, and
// the prototype's duel (L0.determinism runs tools/determinism.mjs on it).
const COPY = ['js', 'tools', 'mission0', 'proto'];
// Scenarios that must not run at the same time in two copies (a fixed port).
const SERIAL = ['L0.determinism', 'L0.determinism.v2'];

function parseArgs(argv) {
  const o = { jobs: os.cpus().length, timeout: 600, only: null, rule: null, out: null, catalogue: path.join(ROOT, 'tools', 'mutations.json'), failFast: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--jobs') o.jobs = Number(next());
    else if (a === '--timeout') o.timeout = Number(next());
    else if (a === '--only') o.only = next().split(',').filter(Boolean);
    else if (a === '--rule') o.rule = next();
    else if (a === '--out') o.out = next();
    else if (a === '--catalogue') o.catalogue = path.resolve(next());
    else if (a === '--no-fail-fast') o.failFast = false;
    else throw new Error(`unknown option ${a}`);
  }
  if (!(o.timeout > 0) || !Number.isInteger(o.jobs) || !(o.jobs >= 1)) throw new Error('--jobs takes a whole number of at least 1 and --timeout a positive number (#257)');
  return o;
}

function loadCatalogue(file) {
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ids = new Set();
  for (const m of list) {
    for (const k of ['id', 'rule', 'file', 'old', 'new']) if (typeof m[k] !== 'string') throw new Error(`${file}: ${m.id || '?'} has no string ${k}`);
    if (ids.has(m.id)) throw new Error(`${file}: duplicate id ${m.id}`);
    if (!COPY.some((d) => m.file.startsWith(d + '/'))) throw new Error(`${m.id}: ${m.file} is outside ${COPY.join(', ')}`);
    ids.add(m.id);
  }
  return list;
}

const occurrences = (text, s) => (s === '' ? 0 : text.split(s).length - 1);

/** A fresh copy of what the runner reads, under os.tmpdir(). */
function scratchCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-'));
  for (const d of COPY) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
  return dir;
}

/** Run `node tools/m0.js cov` in `dir`; resolves { lines, code, timedOut, stderr }. */
function cov(dir, { timeout, failFast, lock }) {
  return new Promise((resolve) => {
    const args = ['tools/m0.js', 'cov', '--serial', SERIAL.join(','), '--lock', lock, ...(failFast ? ['--fail-fast'] : [])];
    const child = spawn(process.execPath, args, { cwd: dir, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', timedOut = false;
    child.stdout.on('data', (b) => { out += b; });
    child.stderr.on('data', (b) => { err += b; });
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, timeout * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = out.split('\n').filter((l) => l.startsWith('COV ')).map((l) => JSON.parse(l.slice(4)));
      resolve({ lines, code, timedOut, ended: /^COV-END /m.test(out), stderr: err.trim() });
    });
  });
}

/** Class of one run: KILLED, CHANGED, SURVIVED or TIMEOUT, with the scenarios that decided it. */
function classify(r) {
  if (r.timedOut) return { cls: 'TIMEOUT', detail: `after ${r.lines.length} scenarios` };
  const bad = r.lines.find((l) => l.verdict !== 'PASS');
  if (bad) return { cls: 'KILLED', detail: `${bad.id} (${bad.verdict}${bad.error ? ': ' + bad.error.slice(0, 80) : ''})` };
  if (!r.ended || r.code !== 0) return { cls: 'KILLED', detail: `the runner threw: ${(r.stderr.split('\n').find((l) => l.startsWith('error:')) || r.stderr.split('\n')[0] || `exit ${r.code}`).slice(0, 100)}` };
  const changed = r.lines.filter((l) => l.rows !== 'same').map((l) => l.id);
  if (changed.length) return { cls: 'CHANGED', detail: changed.join(', ') };
  const data = r.lines.some((l) => l.data !== 'same');
  return { cls: 'SURVIVED', detail: data ? 'data hash only' : '' };
}

async function runOne(m, opt, lock) {
  const text = fs.readFileSync(path.join(ROOT, m.file), 'utf8'), n = occurrences(text, m.old);
  if (n !== 1) return { cls: 'STALE', detail: `old found ${n} times in ${m.file}`, seconds: 0 };
  const t0 = Date.now(), dir = scratchCopy();
  try {
    const target = path.join(dir, m.file);
    fs.writeFileSync(target, text.replace(m.old, () => m.new));
    const r = await cov(dir, { timeout: opt.timeout, failFast: opt.failFast, lock });
    return { ...classify(r), seconds: (Date.now() - t0) / 1000 };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function headState() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain -- js mission0 tools proto', { cwd: ROOT }).toString().trim() !== '';
    return `${sha}${dirty ? '+dirty' : ''}`;
  } catch { return 'unknown'; }
}

const section = (rule) => rule.split(' ')[0];

function report(results, { head, date, command, baseline, seconds }) {
  const lines = [];
  lines.push(`# Mutation coverage (tools/mutate.js, #246 (1))`, '');
  lines.push(`head ${head}, ${date}`, `command: ${command}`);
  lines.push(`baseline: ${baseline} scenarios VERIFIED by regress, every one PASS with its recorded results in an unmutated copy`);
  lines.push(`wall time: ${(seconds / 60).toFixed(1)} min`);
  lines.push('classes: KILLED = some verdict is not PASS (a criterion noticed); CHANGED = every verdict PASS but some output moved from its record (not coverage: no criterion noticed, #257); SURVIVED = every verdict PASS, every output as recorded; STALE = the edit no longer applies; TIMEOUT', '');
  const w = { id: Math.max(2, ...results.map((r) => r.m.id.length)), rule: Math.max(4, ...results.map((r) => r.m.rule.length)) };
  lines.push(`${'id'.padEnd(w.id)}  ${'rule'.padEnd(w.rule)}  ${'class'.padEnd(8)}  first killing scenario, or the changed scenarios`);
  for (const r of results) lines.push(`${r.m.id.padEnd(w.id)}  ${r.m.rule.padEnd(w.rule)}  ${r.cls.padEnd(8)}  ${r.detail}`);
  const CLASSES = ['KILLED', 'CHANGED', 'SURVIVED', 'STALE', 'TIMEOUT'];
  const count = (list) => CLASSES.map((c) => `${c} ${list.filter((r) => r.cls === c).length}`).join(', ');
  lines.push('', `total ${results.length}: ${count(results)}`, '', 'per DESIGN section:');
  const sections = [...new Set(results.map((r) => section(r.m.rule)))].sort(), sw = Math.max(...sections.map((s) => s.length));
  for (const s of sections) {
    const list = results.filter((r) => section(r.m.rule) === s);
    lines.push(`  §${s.padEnd(sw)} ${String(list.length).padStart(3)}: ${count(list)}`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  let list = loadCatalogue(opt.catalogue);
  if (opt.only) {
    const unknown = opt.only.filter((id) => !list.some((m) => m.id === id));
    if (unknown.length) throw new Error(`unknown mutation id ${unknown.join(', ')}`);
    list = list.filter((m) => opt.only.includes(m.id));
  }
  if (opt.rule) list = list.filter((m) => m.rule.startsWith(opt.rule) || m.id.startsWith(opt.rule));
  if (!list.length) throw new Error('no mutation selected');
  const head = headState(), date = new Date().toISOString().slice(0, 10);
  const command = ['node tools/mutate.js', ...process.argv.slice(2)].join(' ');
  const lock = path.join(os.tmpdir(), `mutate-lock-${process.pid}`);
  const t0 = Date.now();

  // The baseline: unmutated, every scenario must pass with its recorded results, or nothing below means anything.
  const dir = scratchCopy();
  let base;
  try { base = await cov(dir, { timeout: opt.timeout, failFast: false, lock }); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const off = base.lines.filter((l) => l.verdict !== 'PASS' || l.rows !== 'same');
  if (base.timedOut || !base.ended || base.code !== 0 || off.length || !base.lines.length) {
    throw new Error(`the unmutated baseline is not clean (${off.map((l) => `${l.id} ${l.verdict} rows ${l.rows}`).join('; ') || base.stderr || 'no scenario ran'}): fix it before measuring coverage`);
  }
  console.error(`baseline: ${base.lines.length} scenarios PASS as recorded; ${list.length} mutations, ${opt.jobs} jobs`);

  const results = new Array(list.length);
  let next = 0, done = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++, m = list[i];
      const r = await runOne(m, opt, lock);
      results[i] = { m, ...r };
      done++;
      console.error(`[${done}/${list.length}] ${m.id}: ${r.cls}${r.detail ? ' ' + r.detail : ''} (${r.seconds.toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opt.jobs, list.length) }, worker));
  const text = report(results, { head, date, command, baseline: base.lines.length, seconds: (Date.now() - t0) / 1000 });
  process.stdout.write(text);
  if (opt.out) fs.writeFileSync(path.resolve(opt.out), text);
}
main().catch((e) => { console.error('error: ' + e.message); process.exitCode = 2; });
