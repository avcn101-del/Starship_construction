#!/usr/bin/env node
// tools/sweep.mjs — the search harness of ship versus ship (DESIGN.md 13n.1 (e), 13n.8; #277): a deterministic
// best-response search over the standing orders, no LLM, no Math.random, worker_threads for the cores.
//
// Over every pair of builds (mission0/builds.js), both sides are the standard enemy (js/enemy.js, personality 0.5
// each: the standard orders and their preset table); a side's order set is a set of slot values held over every
// preset it flies (as the enemy's own range and open-fire overrides are). From the standard set ({}), each side in
// turn tries every single-slot change of its current set (each slot's values from js/data.js ORDERS; the energy
// slot's lists `priority` and `repair` have no value list there and are not varied), keeps the set that wins most
// against the other's current set over the grid (the ranges x the openings x the seeds; a tie keeps the current
// set, then the first in slot order), and the other side answers; `--rounds` rounds (3). A battle's result: a side
// wins when the other ends (destroyed, Disabled, surrender, or escaped: an escape is a loss for the side that
// escapes, #293); a draw (both end in one step, #315) counts half a win for each; no end by --limit counts nothing.
// It reports every build's win rate over its pairs' final sets and flags any build or order set winning above 75 %
// (E5's number) and any end under 60 s, each with its replay line and the cascade tree of its fastest win.
// The table's hash (util.js hash of its stable JSON) does not depend on --jobs: every battle is its own seeded run.
//
//   node tools/sweep.mjs [--builds a,b,...] [--slots s,...] [--ranges m,...] [--openings bow,broadside]
//                        [--seeds n,...] [--rounds n] [--limit s] [--jobs n] [--json]
//   node tools/sweep.mjs --replay '<cell json>'      one battle of the sweep: its end, battle hash and cascade tree
//
// Defaults: every build, every slot, ranges helm.rangeClose / rangeHold / rangeOpen (600 / 900 / 1500 m at T1), both
// openings (bow: each on the other's bow, as tools/duel.js; broadside: side by side, both heading +x, the attacker
// on the target's +y beam), seeds 1-4, 3 rounds, 600 s, one job per core. The full run is the pace study's and
// L5e2's (13n.8); L5e1 proves it deterministic (L4.sweep.determinism).
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { PARAMS, ORDERS, TIERS, scaled } from '../js/data.js';
import { createBattle, runBattle, battleHash, battleTree } from '../js/battle.js';
import { hash, stableStringify } from '../js/util.js';
import { treeLines } from '../js/events.js';
import { BUILDS } from '../mission0/builds.js';

const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
/** The slots varied and their values (js/data.js ORDERS); heat discipline's response is the slot `heatResponse`. */
export const SLOT_VALUES = {
  range: ORDERS.movement.range, position: ORDERS.movement.position, style: ORDERS.movement.style, dodging: ORDERS.movement.dodging,
  facing: ORDERS.firepower.facing, firing: ORDERS.firepower.firing, openFire: ORDERS.firepower.openFire, target: ORDERS.firepower.target,
  heatResponse: ORDERS.energy.heat.response, emission: ORDERS.emission.emission, autoScan: ORDERS.emission.autoScan,
};

/** One battle of the sweep: { a, b (build names), setA, setB (slot overrides), range (m), opening, seed, limit (s) }, run. */
export function cellBattle(cell) {
  const broadside = cell.opening === 'broadside';
  const b = createBattle({
    params: PARAMS, attacker: BUILDS[cell.a], target: BUILDS[cell.b], distance: cell.range, seed: cell.seed, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD },
  });
  // A set's slots override every preset the enemy flies (js/helm.js reads helm.override over helm.orders; heatResponse
  // replaces heat discipline's response alone).
  b.attacker.helm.override = { ...b.attacker.helm.override, ...cell.setA };
  b.target.helm.override = { ...b.target.helm.override, ...cell.setB };
  return runBattle(b, cell.limit);
}
/** A battle's result for the sweep: the winner ('A', 'T', 'draw' or null), the end kind, time and step, the battle hash. */
export function resultOf(b) {
  const e = b.ended;
  const winner = !e ? null : e.kind === 'draw' ? 'draw' : e.kind === 'escaped' ? (e.side === 'A' ? 'T' : 'A') : e.side === 'A' ? 'T' : 'A';
  return { winner, kind: e ? e.kind : 'none', side: e ? e.side : null, t: e ? e.t : null, step: e ? e.step : b.step, hash: battleHash(b) };
}

// ---------- the worker ----------
if (!isMainThread) {
  for (const job of workerData.jobs) parentPort.postMessage({ i: job.i, r: resultOf(cellBattle(job.cell)) });
  parentPort.postMessage({ done: true });
}

/** Run every cell, in this thread (jobs 1) or across `jobs` workers; results in the cells' order. */
async function runCells(cells, jobs) {
  if (jobs <= 1) return cells.map((c) => resultOf(cellBattle(c)));
  const out = new Array(cells.length), parts = Array.from({ length: Math.min(jobs, cells.length) }, () => []);
  cells.forEach((cell, i) => parts[i % parts.length].push({ i, cell }));
  await Promise.all(parts.map((list) => new Promise((ok, fail) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: list } });
    w.on('message', (m) => { if (m.done) { w.terminate(); ok(); } else out[m.i] = m.r; });
    w.on('error', fail);
  })));
  return out;
}

/** The single-slot changes of a set: the set itself first, then each slot's other values in slot order. */
function variants(set, slots) {
  const out = [set];
  for (const s of slots) for (const v of SLOT_VALUES[s]) if ((set[s] ?? standardOf(s)) !== v) out.push({ ...set, [s]: v });
  return out;
}
/** A slot's standard value: the standard enemy's (Fire's slots; range and open fire from personality 0.5: hold, in range). */
function standardOf(s) {
  return { range: 'hold', position: 'bow', style: 'hold', dodging: 'off', facing: 'bow', firing: 'salvo', openFire: 'inRange', target: 'weapons', heatResponse: 'weapons', emission: 'normal', autoScan: 'on' }[s];
}
const score = (results, side) => results.reduce((x, r) => x + (r.winner === side ? 1 : r.winner === 'draw' ? 0.5 : 0), 0);

/** The sweep: options as the command line's; returns the table (no timing in it, so its hash is the run's). */
export async function sweep(o) {
  const grid = [];
  for (const range of o.ranges) for (const opening of o.openings) for (const seed of o.seeds) grid.push({ range, opening, seed });
  const pairs = [];
  for (let i = 0; i < o.builds.length; i++) for (let j = i + 1; j < o.builds.length; j++) pairs.push([o.builds[i], o.builds[j]]);
  const table = { options: { builds: o.builds, slots: o.slots, ranges: o.ranges, openings: o.openings, seeds: o.seeds, rounds: o.rounds, limit: o.limit }, pairs: [], flags: [] };
  for (const [a, b] of pairs) {
    const sets = { A: {}, T: {} }, turns = [];
    for (let round = 1; round <= o.rounds; round++) {
      for (const side of ['A', 'T']) {
        const tries = variants(sets[side], o.slots);
        const cells = tries.flatMap((set) => grid.map((g) => ({ a, b, setA: side === 'A' ? set : sets.A, setB: side === 'T' ? set : sets.T, ...g, limit: o.limit })));
        const res = await runCells(cells, o.jobs);
        let best = 0, bestScore = -1;
        tries.forEach((set, k) => { const sc = score(res.slice(k * grid.length, (k + 1) * grid.length), side); if (sc > bestScore) { best = k; bestScore = sc; } });
        sets[side] = tries[best];
        const rate = bestScore / grid.length;
        turns.push({ round, side, set: sets[side], wins: bestScore, of: grid.length, rate });
        if (rate > 0.75) table.flags.push({ flag: 'order set above 75 %', pair: [a, b], side, build: side === 'A' ? a : b, set: sets[side], rate });
      }
    }
    const cells = grid.map((g) => ({ a, b, setA: sets.A, setB: sets.T, ...g, limit: o.limit }));
    const res = await runCells(cells, o.jobs);
    const ends = res.map((r, k) => ({ ...grid[k], ...r }));
    table.pairs.push({ a, b, sets, turns, ends, wins: { A: score(res, 'A'), T: score(res, 'T') }, of: grid.length });
    for (const [k, r] of res.entries()) if (r.t !== null && r.t < 60) table.flags.push({ flag: 'end under 60 s', pair: [a, b], cell: cells[k], end: `${r.kind} ${r.side} at ${r.t.toFixed(2)} s` });
  }
  // Each build's win rate over its pairs' final sets.
  table.builds = Object.fromEntries(o.builds.map((n) => {
    let w = 0, of = 0;
    for (const p of table.pairs) { if (p.a === n) { w += p.wins.A; of += p.of; } if (p.b === n) { w += p.wins.T; of += p.of; } }
    return [n, { wins: w, of, rate: of ? w / of : 0 }];
  }));
  for (const [n, x] of Object.entries(table.builds)) if (x.rate > 0.75) table.flags.push({ flag: 'build above 75 %', build: n, rate: x.rate });
  table.hash = hash(stableStringify({ options: table.options, pairs: table.pairs, builds: table.builds, flags: table.flags }));
  return table;
}

/** The fastest win at the final sets of a flagged build (over its pairs) or order set (its pair and side): its cell, to replay. */
function fastestWin(table, f) {
  let best = null;
  for (const p of table.pairs) {
    for (const e of p.ends) {
      if (f.pair && (f.pair[0] !== p.a || f.pair[1] !== p.b)) continue;
      const side = f.side || (f.build === p.a ? 'A' : f.build === p.b ? 'T' : null);
      if (!side || e.winner !== side || e.t === null) continue;
      if (!best || e.t < best.e.t) best = { e, cell: { a: p.a, b: p.b, setA: p.sets.A, setB: p.sets.T, range: e.range, opening: e.opening, seed: e.seed, limit: table.options.limit } };
    }
  }
  return best;
}
/** A side's cascade tree as lines without one root and its events (the senses' many source-resolved events). */
const treeWithout = (t, root) => treeLines({ roots: t.tree.roots.filter((r) => r.root !== root), errors: t.tree.errors });
const replayLine = (cell) => `node tools/sweep.mjs --replay '${JSON.stringify(cell)}'`;

function parseArgs(argv) {
  const edge = TIERS.T1.edge;
  const o = { builds: Object.keys(BUILDS), slots: Object.keys(SLOT_VALUES), ranges: ['rangeClose', 'rangeHold', 'rangeOpen'].map((k) => scaled(PARAMS.helm[k], edge)), openings: ['bow', 'broadside'], seeds: [1, 2, 3, 4], rounds: 3, limit: 600, jobs: os.cpus().length, json: false, replay: null };
  const list = (x) => x.split(',').map((y) => y.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--builds') o.builds = list(next());
    else if (a === '--slots') o.slots = list(next());
    else if (a === '--ranges') o.ranges = list(next()).map(Number);
    else if (a === '--openings') o.openings = list(next());
    else if (a === '--seeds') o.seeds = list(next()).map(Number);
    else if (a === '--rounds') o.rounds = Number(next());
    else if (a === '--limit') o.limit = Number(next());
    else if (a === '--jobs') o.jobs = Number(next());
    else if (a === '--json') o.json = true;
    else if (a === '--replay') o.replay = JSON.parse(next());
    else throw new Error(`unknown option ${a}`);
  }
  for (const n of o.builds) if (!BUILDS[n]) throw new Error(`unknown build ${n}: ${Object.keys(BUILDS).join(', ')}`);
  for (const s of o.slots) if (!SLOT_VALUES[s]) throw new Error(`unknown slot ${s}: ${Object.keys(SLOT_VALUES).join(', ')}`);
  for (const x of o.openings) if (x !== 'bow' && x !== 'broadside') throw new Error(`unknown opening ${x}: bow, broadside`);
  if (!(Number.isInteger(o.jobs) && o.jobs >= 1) || !(Number.isInteger(o.rounds) && o.rounds >= 1) || !(o.limit > 0)) throw new Error('--jobs and --rounds take a whole number of at least 1, --limit a positive number');
  return o;
}

if (isMainThread && import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  if (o.replay) {
    const b = cellBattle(o.replay), r = resultOf(b);
    console.log(`${o.replay.a} (A) against ${o.replay.b} (T), ${o.replay.range} m, ${o.replay.opening}, seed ${o.replay.seed}: ${r.kind} ${r.side ?? ''} at ${r.t === null ? '-' : r.t.toFixed(4)} s (step ${r.step}), winner ${r.winner ?? 'none'}; battle hash ${r.hash}`);
    for (const t of battleTree(b)) { console.log(`cascade tree, ${t.side}:`); for (const l of t.lines) console.log(`  ${l}`); }
  } else {
    const table = await sweep(o);
    if (o.json) console.log(JSON.stringify(table, null, 2));
    else {
      console.log(`sweep: ${o.builds.length} builds, ${table.pairs.length} pairs, slots ${o.slots.join(', ')}; grid ${o.ranges.join('/')} m x ${o.openings.join('/')} x seeds ${o.seeds.join(',')}; ${o.rounds} rounds; limit ${o.limit} s`);
      for (const p of table.pairs) console.log(`  ${p.a} (A) ${p.wins.A} - ${p.wins.T} ${p.b} (T) of ${p.of}; sets A ${JSON.stringify(p.sets.A)}, T ${JSON.stringify(p.sets.T)}; ends ${p.ends.map((e) => `${e.kind}${e.side ? ' ' + e.side : ''}${e.t !== null ? ' ' + e.t.toFixed(1) : ''}`).join(', ')}`);
      for (const [n, x] of Object.entries(table.builds)) console.log(`  build ${n.padEnd(11)} ${x.wins} of ${x.of} (${(x.rate * 100).toFixed(1)} %)`);
      for (const f of table.flags) {
        console.log(`  FLAG ${f.flag}: ${f.build ?? ''} ${f.pair ? f.pair.join(' v ') : ''} ${f.rate !== undefined ? (f.rate * 100).toFixed(1) + ' %' : ''} ${f.set ? JSON.stringify(f.set) : ''} ${f.end ?? ''}`);
        const w = f.cell ? { cell: f.cell } : fastestWin(table, f);
        if (w) {
          console.log(`    replay: ${replayLine(w.cell)}`);
          for (const t of battleTree(cellBattle(w.cell))) { console.log(`    cascade tree, ${t.side} (the 'sense' root left out):`); for (const l of treeWithout(t, 'sense')) console.log(`      ${l}`); }
        }
      }
    }
    console.log(`table hash ${table.hash}`);
  }
}
