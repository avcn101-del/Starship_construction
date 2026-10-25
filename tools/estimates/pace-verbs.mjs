// tools/estimates/pace-verbs.mjs — the lead designer's pace study after L5e1 (#319): verb leverage, the share of
// battles one player verb flips, and the decisions available per battle (the moments at which some verb changes
// the result). Side A is the player (R2 flying the preset Fire with the verb as its one input, as tools/duel.js),
// side T the standard enemy on a reference build, on the locked builds of mission0/builds.js. The verbs: each preset,
// a scan of each zone, a target on each of the other build's rooms. Run-time overrides only; never a canonical run:
//   node tools/estimates/pace-verbs.mjs [--builds a,...] [--ranges m,...] [--openings bow,broadside] [--seed n]
//                                       [--pairs player:enemy,...] [--times s,... | --every s [--max-moments n]] [--limit s]
//                                       [--jobs n] [--cull2] [--set group.name=value ...]
// --pairs names the player's build and the enemy's (default R2 against each of --builds); --jobs the worker threads
// (default one per core; the output does not depend on it).
// --times lists the verb's moments (default 0); --every s tries every multiple of s before the baseline's end, at most
// --max-moments of them (default 12).
// A result is the winner (A, T, draw or none); a verb flips a battle when its winner differs from the baseline's.
// The tools pass (13n.11, #347, #349): --menu prototype (default) tries the three presets of js/data.js PRESETS as
// verbs, labelled as the prototype's; --menu designed replaces them by the player build's menu entries, MENUS[build]
// of js/data.js (#348) or --menu-file <json> ({ <build>: [{ name, phase, slots }] }): a menu verb sets side A's orders
// to Fire's with the entry's slots over them (the assignment the kernel's 'preset' verb makes), done by this tool
// between ticks at the verb's step, so it is not in battle.verbs. #349's rates, per pair and in total: the save rate
// (over the cells whose baseline is a player loss, the trials the player survives: win, escape, let go, stalemate,
// no end) and the error rate (over the cells whose baseline is a player win, the trials that end in a player loss);
// the totals over all cells, the mirror cells and the rest (#356 (1)).
import { PARAMS, withOverrides, PRESETS } from '../../js/data.js';
import * as DATA from '../../js/data.js'; // DATA.MENUS once #348 adds it
import { createBattle, tick, battleHash } from '../../js/battle.js';
import { createHelm } from '../../js/helm.js';
import { stepsAtLeast } from '../../js/util.js';
import fs from 'node:fs';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BUILDS, REFERENCE } from '../../mission0/builds.js';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv, opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const ranges = list(opt('--ranges', '600,900,1500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const seed = Number(opt('--seed', 1)), limit = Number(opt('--limit', 600)), builds = list(opt('--builds', Object.keys(REFERENCE).join(',')));
const every = opt('--every', null), maxMoments = Number(opt('--max-moments', 12)), times = every ? null : list(opt('--times', '0')).map(Number);
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
if (argv.includes('--cull2')) overrides['battle.cullDistance'] = 2 * Math.max(...ranges);
for (const [k, v] of Object.entries(overrides)) { const [g, n] = k.split('.'), p = PARAMS[g][n]; if (!(v >= p.min && v <= p.max)) throw new Error(`${k}=${v} outside ${p.min}..${p.max}`); }
for (const r of ranges) { const p = PARAMS.battle.openingRange; if (!(r >= p.min && r <= p.max)) throw new Error(`range ${r} outside battle.openingRange's ${p.min}..${p.max}`); }
const params = withOverrides(overrides), STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

/** A side's outcome as tools/sweep.mjs's outcomeOf (copied with resultOf: importing sweep.mjs in a worker starts its own worker loop). */
function outcomeOf(ended, side) {
  if (!ended) return 'noEnd';
  if (ended.kind === 'draw') return 'draw';
  if (ended.kind === 'stalemate') return 'stalemate';
  if (ended.kind === 'escaped') return ended.side === side ? 'escape' : 'letGo';
  return ended.side === side ? 'loss' : 'win'; // destroyed, disabled, surrender
}
const survives = (outcome) => outcome !== 'loss' && outcome !== 'draw';
/** A battle's result as tools/sweep.mjs's resultOf (copied). */
function resultOf(b) {
  const e = b.ended, outcome = { A: outcomeOf(e, 'A'), T: outcomeOf(e, 'T') };
  const winner = outcome.A === 'win' ? 'A' : outcome.T === 'win' ? 'T' : outcome.A === 'draw' ? 'draw' : null;
  const crew = Object.fromEntries(b.sides.map((s) => [s.name, s.world.rooms.reduce((n, r) => n + r.crew, 0)]));
  return { winner, outcome, crew, kind: e ? e.kind : 'none', side: e ? e.side : null, t: e ? e.t : null, step: e ? e.step : b.step, hash: battleHash(b) };
}
// The verb menu (#347, #348): the prototype's three presets, or the player build's designed menu.
const menuKind = opt('--menu', 'prototype'), menuFile = opt('--menu-file', null);
if (menuKind !== 'prototype' && menuKind !== 'designed') throw new Error(`--menu ${menuKind}: prototype or designed`);
const MENU = menuKind !== 'designed' ? null : menuFile ? JSON.parse(fs.readFileSync(menuFile, 'utf8')) : DATA.MENUS ?? null;
if (menuKind === 'designed' && !MENU) throw new Error('--menu designed needs a designed menu: js/data.js has no MENUS yet (#348); give --menu-file <json> ({ <build>: [{ name, phase, slots }] })');
const LABEL = menuKind === 'prototype'
  ? "verb leverage on the prototype's three presets, not a designed menu (#347); not comparable like for like with a designed menu"
  : `verb leverage on the designed menu (${menuFile ? `--menu-file ${menuFile}` : "js/data.js MENUS"}); a menu verb is set by this tool between ticks, not in battle.verbs`;
const SLOT_NAMES = new Set([...Object.keys(PRESETS.fire), 'heatResponse']);
/** The player build's menu entries ([{ name, phase, slots }]); stops when there is none. */
function menuOf(build) {
  const m = MENU[build];
  if (!Array.isArray(m) || !m.length) throw new Error(`--menu designed: no menu entries for the player build ${build} (#348)`);
  for (const e of m) for (const k of Object.keys(e.slots || {})) if (!SLOT_NAMES.has(k)) throw new Error(`menu entry ${e.name} of ${build}: unknown slot ${k}`);
  return m;
}
const pairs = opt('--pairs', null) ? list(opt('--pairs')).map((x) => x.split(':')) : builds.map((b) => ['R2', b]);
/** One battle: the player (side A, on Fire, the verb its one input) against the standard enemy. A 'menu' verb (arg the
 * entry's index in the player build's menu) is applied by this tool before the tick of its step, as the kernel applies
 * its inputs; every other verb is a kernel input. */
function duel({ a, b, range, opening, inputs }) {
  const broadside = opening === 'broadside', menu = inputs.filter((y) => y.verb === 'menu');
  const x = createBattle({ params, attacker: BUILDS[a], target: BUILDS[b], distance: range, seed, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), orders: { A: 'fire' }, enemy: { T: STD },
    inputs: inputs.filter((y) => y.verb !== 'menu').map((y) => ({ ...y, side: 'A' })) });
  const due = menu.map((y) => ({ step: stepsAtLeast(y.t || 0, x.dt), entry: menuOf(a)[y.arg], done: false }));
  // A kernel throw is reported as a result of its own (the pace study found one in beamsOut, #327), never hidden.
  try {
    const steps = stepsAtLeast(limit, x.dt); // as js/battle.js's runBattle
    while (!x.ended && x.step < steps) {
      for (const y of due) if (!y.done && x.step >= y.step) { x.attacker.helm.orders = createHelm(x, x.attacker, { ...y.entry.slots, name: y.entry.name }).orders; y.done = true; }
      tick(x);
    }
    return resultOf(x);
  } catch (e) { return { winner: 'error', kind: 'error', t: x.t, error: `${a} v ${b} ${range} ${opening} ${JSON.stringify(inputs)}: step ${x.step}: ${e.message}` }; }
}
/** Run every battle, in this thread or across --jobs workers; results in order. */
async function runAll(battles) {
  const jobs = Math.max(1, Math.min(battles.length, Number(opt('--jobs', os.cpus().length))));
  const out = new Array(battles.length);
  if (jobs === 1) { battles.forEach((c, i) => { out[i] = duel(c); }); return out; }
  await new Promise((done, fail) => {
    let next = 0, left = battles.length;
    for (let w = 0; w < jobs; w++) {
      const worker = new Worker(new URL(import.meta.url), { workerData: { argv } });
      let mine = -1;
      const feed = () => { if (next < battles.length) { mine = next++; worker.postMessage(battles[mine]); } else worker.terminate(); };
      worker.on('message', (r) => { out[mine] = r; if (--left === 0) done(); feed(); });
      worker.on('error', fail);
      feed();
    }
  });
  return out;
}
/** The verbs tried for a pair: the menu's (the three presets, or the player build's menu entries), a scan of each zone, a target on each of the enemy's rooms. */
const verbs = (a, b) => [...(MENU ? menuOf(a).map((_, k) => ['menu', k]) : Object.keys(PRESETS).map((p) => ['preset', p])), ...[0, 1, 2, 3, 4, 5].map((z) => ['scan', z]), ...BUILDS[b].rooms.map((r) => ['target', r.id])];
const verbName = (a, verb, arg) => (verb === 'menu' ? `menu ${menuOf(a)[arg].name}` : `${verb} ${arg}`);
const tag = (r) => `${r.winner ?? 'none'}${r.t === null ? '' : ` ${r.t.toFixed(1)} s`}`;

if (!isMainThread) parentPort.on('message', (c) => parentPort.postMessage(duel(c)));
else {
  const keys = [];
  for (const [a, b] of pairs) for (const range of ranges) for (const opening of openings) keys.push({ a, b, range, opening });
  const bases = await runAll(keys.map((k) => ({ ...k, inputs: [] })));
  const battles = [], where = [];
  keys.forEach((k, ci) => {
    const end = bases[ci].t ?? limit;
    const ts = times || Array.from({ length: Math.min(maxMoments, Math.ceil(end / Number(every))) }, (_, i) => i * Number(every));
    k.ts = ts;
    for (const t of ts) for (const [verb, arg] of verbs(k.a, k.b)) { battles.push({ ...k, inputs: [{ t, verb, arg }] }); where.push({ ci, t, verb, arg }); }
  });
  const results = await runAll(battles);
  const errors = [...bases, ...results].filter((r) => r.winner === 'error').map((r) => r.error);
  const score = (w) => (w === 'A' ? 1 : w === 'draw' ? 0.5 : 0);
  let cells = 0, flipped = 0, helped = 0, hurt = 0, moments = 0, live = 0;
  const best = {}, perCell = keys.map(() => ({ flips: 0, lines: [], moments: new Map() }));
  results.forEach((r, i) => {
    const { ci, t, verb, arg } = where[i], base = bases[ci], c = perCell[ci];
    if (!c.moments.has(t)) c.moments.set(t, 0);
    if (r.winner === 'error') return; // counted under kernel errors, not as a flip
    cells++;
    if (r.winner !== base.winner) {
      flipped++; c.flips++; c.moments.set(t, c.moments.get(t) + 1);
      const d = score(r.winner) - score(base.winner);
      if (d > 0) { helped++; best[verbName(keys[ci].a, verb, arg)] = (best[verbName(keys[ci].a, verb, arg)] || 0) + 1; } else if (d < 0) hurt++;
      c.lines.push(`    t ${t} ${verbName(keys[ci].a, verb, arg)}: ${tag(r)}`);
    }
  });
  console.log(`# verb leverage (the player on Fire, against the standard enemy), seed ${seed}, limit ${limit} s, overrides ${JSON.stringify(overrides)}`);
  console.log(`# ${LABEL}`);
  keys.forEach((k, ci) => {
    const c = perCell[ci];
    for (const n of c.moments.values()) { moments++; if (n) live++; }
    console.log(`${k.a} v ${k.b.padEnd(7)} ${String(k.range).padStart(4)} ${k.opening.padEnd(9)}: baseline ${tag(bases[ci])}; ${c.flips} flips over ${k.ts.length} moment(s) x ${verbs(k.a, k.b).length} verbs`);
    for (const l of c.lines) console.log(l);
  });
  const baseWins = bases.filter((r) => r.winner === 'A').length;
  console.log(`baselines: the player wins ${baseWins} of ${bases.length}`);
  console.log(`verb leverage: ${flipped} of ${cells} single-verb battles flip the result (${((100 * flipped) / Math.max(1, cells)).toFixed(1)} %): ${helped} toward the player, ${hurt} against; moments with a flip ${live} of ${moments}`);
  console.log(`verbs that turn a result toward the player: ${JSON.stringify(best)}`);
  // #349's rates: cells by the player's baseline outcome; each trial (a moment and a verb) of a cell counted once.
  const rates = (sel) => {
    const x = { save: [0, 0, 0], error: [0, 0, 0], other: [0, 0] }; // [k, trials, cells]; other: [trials, cells]
    keys.forEach((k, ci) => {
      if (!sel(k) || bases[ci].winner === 'error') return;
      const trials = results.filter((r, i) => where[i].ci === ci && r.winner !== 'error'), o = bases[ci].outcome.A;
      if (o === 'loss') { x.save[0] += trials.filter((r) => survives(r.outcome.A)).length; x.save[1] += trials.length; x.save[2]++; }
      else if (o === 'win') { x.error[0] += trials.filter((r) => r.outcome.A === 'loss').length; x.error[1] += trials.length; x.error[2]++; }
      else { x.other[0] += trials.length; x.other[1]++; }
    });
    return `save rate ${x.save[0]} of ${x.save[1]} trials (${x.save[2]} cells); error rate ${x.error[0]} of ${x.error[1]} trials (${x.error[2]} cells); baseline neither a win nor a loss: ${x.other[0]} trials (${x.other[1]} cells)`;
  };
  for (const [a, b] of pairs) console.log(`rates ${a} v ${b}: ${rates((k) => k.a === a && k.b === b)}`);
  // #356 (1): over all cells, over the mirror cells (player build = enemy build: an exact mirror always ends against A) and over the rest.
  console.log(`rates in total, all cells: ${rates(() => true)}`);
  console.log(`rates in total, mirror cells: ${rates((k) => k.a === k.b)}`);
  console.log(`rates in total, non-mirror cells: ${rates((k) => k.a !== k.b)}`);
  console.log(`kernel errors: ${errors.length}`); for (const e of errors) console.log(`  ERROR ${e}`);
}
