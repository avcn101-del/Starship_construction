#!/usr/bin/env node
// proto/measure.mjs — R1-versus-R1 duels of the feel prototype v2, headless
// (Node, no DOM), with both ships on the enemy's script (DESIGN.md 13j.2:
// Fire 60 s, Cool 30 s; orders bow-on, dodge on) at each range order, for
// seeds 1-10, one loadout (config.js LOADOUT) on both ships. Prints per duel
// its length, the end, each side's shots, hits and misses, and what destroyed
// a ship; then a summary per range. Not a Mission 0 scenario (#217): a
// measure for the owner, to set against 13j.3's rough estimate.
//
//   node proto/measure.mjs [--seeds N] [--first S] [--range close|hold|open] [--limit seconds]
//     [--facing bow|broadside] [--magazine heFull|apFull|heHalf|apQuarter] [--layout R1|R1B]
//     [--shield-budget W] [--hits N] [--turrets on|off]
//
// --seeds N runs seeds S .. S + N - 1 (default 1 .. 10); --range one range
// order (default all three); --facing replaces the script's facing on both
// ships (default: the script's bow-on). Every other flag is a lever of the
// loadout panel; a flag left out takes the lever's default.
import { performance } from 'node:perf_hooks';
import { createBattle, tick } from './battle.js';
import { defaultLoadout, loadoutText, RANGES, SCRIPT } from './config.js';
import { PARAMS } from '../js/data.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const seeds = Number(arg('--seeds', 10)), first = Number(arg('--first', 1)), limit = Number(arg('--limit', 1800));
const ranges = arg('--range') ? [arg('--range')] : ['close', 'hold', 'open'];
const facing = arg('--facing', SCRIPT.orders.facing);
for (const r of ranges) if (!RANGES[r]) throw new Error(`unknown range ${r}`);
const loadout = defaultLoadout();
if (arg('--magazine')) loadout.magazine = arg('--magazine');
if (arg('--layout')) loadout.layout = arg('--layout');
if (arg('--shield-budget')) loadout.shieldBudget = Number(arg('--shield-budget')) === PARAMS.shield.budget.value ? null : Number(arg('--shield-budget'));
if (arg('--hits')) loadout.hitsToWreck = Number(arg('--hits')) === PARAMS.kinetic.hitsToWreck.value ? null : Number(arg('--hits'));
if (arg('--turrets') === 'off') loadout.turrets = false;
const savedFacing = SCRIPT.orders.facing;
SCRIPT.orders.facing = facing; // a measure-only replacement of the script's facing order on both ships

console.log(`loadout (both ships): ${loadoutText(loadout).split(' · ').slice(0, 5).join(' · ')}`);
console.log(`both ships on the enemy script: Fire ${SCRIPT.phases[0].seconds} s / Cool ${SCRIPT.phases[1].seconds} s, facing ${facing}, dodge ${SCRIPT.orders.dodge ? 'on' : 'off'}; limit ${limit} s`);
console.log('');
console.log('| range | seed | length (s) | end | P shots / hits / misses | E shots / hits / misses | destroyed by | ms/step |');
console.log('|---|---|---|---|---|---|---|---|');
const sums = {};
for (const range of ranges) {
  const rows = [];
  for (let seed = first; seed < first + seeds; seed++) {
    const b = createBattle({ seed, scripted: { player: true, enemy: true }, loadout, scriptRange: range });
    const t0 = performance.now();
    while (!b.ended && b.t < limit) tick(b);
    const ms = (performance.now() - t0) / b.steps, e = b.ended;
    const end = e ? e.losers.map((s) => `${s === 'player' ? 'P' : 'E'} ${e.reason[s]}`).join(', ') : `none by ${limit} s`;
    const st = (s) => `${s.stats.shots} / ${s.stats.hits} / ${s.stats.misses}`;
    const by = b.ships.filter((s) => s.destroyedBy).map((s) => `${s.name}: ${s.destroyedBy.room} at ${s.destroyedBy.t.toFixed(1)} s`).join('; ') || '-';
    console.log(`| ${range} ${RANGES[range]} m | ${seed} | ${e ? e.t.toFixed(2) : '-'} | ${end} | ${st(b.player)} | ${st(b.enemy)} | ${by} | ${ms.toFixed(3)} |`);
    rows.push({ t: e ? e.t : null, end, shots: b.player.stats.shots + b.enemy.stats.shots, hits: b.player.stats.hits + b.enemy.stats.hits, misses: b.player.stats.misses + b.enemy.stats.misses });
  }
  sums[range] = rows;
}
console.log('');
console.log('| range | ended | length min / median / max (s) | hits / shots (both) | misses / shots (both) |');
console.log('|---|---|---|---|---|');
for (const range of ranges) {
  const rows = sums[range], ts = rows.map((r) => r.t).filter((t) => t !== null).sort((a, b) => a - b);
  const shots = rows.reduce((x, r) => x + r.shots, 0), hits = rows.reduce((x, r) => x + r.hits, 0), misses = rows.reduce((x, r) => x + r.misses, 0);
  const med = ts.length ? (ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2) : null;
  const pct = (x) => (shots ? `${((100 * x) / shots).toFixed(0)} %` : '-');
  console.log(`| ${range} ${RANGES[range]} m | ${ts.length}/${rows.length} | ${ts.length ? `${ts[0].toFixed(1)} / ${med.toFixed(1)} / ${ts[ts.length - 1].toFixed(1)}` : '-'} | ${hits} / ${shots} (${pct(hits)}) | ${misses} / ${shots} (${pct(misses)}) |`);
}
SCRIPT.orders.facing = savedFacing;
