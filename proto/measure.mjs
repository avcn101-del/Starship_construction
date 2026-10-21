#!/usr/bin/env node
// proto/measure.mjs — R1-versus-R1 battles of the feel prototype, headless
// (Node, no DOM), with both sides on the enemy's scripted presets (DESIGN.md
// 13h.2) and one loadout (config.js LOADOUT) on both ships. Reports each
// battle's length and end, what destroyed a ship, the first room to overheat
// or fail on each side and when, and the cost of one battle step in ms (E8
// budget 1 ms, #213). Not a Mission 0 scenario (#217): a measure for the
// owner, to set against 13h.3's rough estimate.
//
//   node proto/measure.mjs [--seeds N] [--limit seconds] [--magazine heFull|apFull|heHalf|apQuarter]
//     [--armour 0|1|2] [--layout R1|R1B] [--shield-budget W] [--hits N] [--turrets on|off] [--beam-only]
//
// --seeds N runs seeds SEED .. SEED + N - 1 (default 1). Every other flag is a
// lever of the loadout panel; a flag left out takes the lever's default.
// --shield-budget and --hits must be one of the panel's options. --beam-only
// is --turrets off.
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { createBattle, tick } from './battle.js';
import { SEED, defaultLoadout, loadoutText } from './config.js';
import { PARAMS } from '../js/data.js';

const PARAMS_DEFAULT = { shield: PARAMS.shield.budget.value, hits: PARAMS.kinetic.hitsToWreck.value };

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const seeds = Number(arg('--seeds', 1)), limit = Number(arg('--limit', 1800));
const loadout = defaultLoadout();
if (arg('--magazine')) loadout.magazine = arg('--magazine');
if (arg('--armour')) loadout.armour = Number(arg('--armour'));
if (arg('--layout')) loadout.layout = arg('--layout');
if (arg('--shield-budget')) loadout.shieldBudget = Number(arg('--shield-budget'));
if (arg('--hits')) loadout.hitsToWreck = Number(arg('--hits'));
if (arg('--turrets') === 'off' || process.argv.includes('--beam-only')) loadout.turrets = false;
const fmt = (x) => (x ? `${x.room} ${x.type || 'hot'} at ${x.t.toFixed(2)} s (cause ${x.cause || 'heat'})` : 'none');

console.log(`loadout: ${loadoutText(normalise(loadout))}`);
const lengths = [], costs = [];
for (let i = 0; i < seeds; i++) {
  const seed = SEED + i;
  const b = createBattle({ seed, scripted: { player: true, enemy: true }, loadout: normalise(loadout) });
  const t0 = performance.now();
  while (!b.ended && b.t < limit) tick(b);
  const ms = (performance.now() - t0) / b.steps;
  const e = b.ended, hash = createHash('sha256').update(JSON.stringify(b.events)).digest('hex').slice(0, 16);
  lengths.push(e ? e.t : null); costs.push(ms);
  console.log(`seed ${seed}: ${e ? `ended at ${e.t.toFixed(2)} s (${(e.t / 60).toFixed(2)} min): ${e.losers.map((s) => `${s} ${e.reason[s]}`).join(', ')}` : `no end within ${limit} s`}; event hash ${hash}`);
  for (const s of b.ships) {
    const wrecked = s.world.rooms.filter((r) => r.exploded || r.cells.every((c) => c.destroyed)).map((r) => r.id);
    const by = s.destroyedBy ? `; destroyed by the ${s.destroyedBy.room} exploding (${(s.destroyedBy.energy / 1e6).toFixed(0)} MJ) at ${s.destroyedBy.t.toFixed(2)} s` : '';
    const armour = [...s.armour.values()].flat(), armourLost = armour.filter((c) => c.destroyed).length;
    console.log(`  ${s.side}: first hot ${fmt(s.firstHot)}; first failure ${fmt(s.firstFailure)}${by}; crew lost ${s.crewLost}/${s.crewTotal}; rooms wrecked ${wrecked.length ? wrecked.join(', ') : 'none'}${armour.length ? `; armour cells lost ${armourLost}/${armour.length}` : ''}`);
  }
  console.log(`  cost: ${ms.toFixed(4)} ms per battle step (two ships, power routing, stand-ins; ${b.steps} steps; E8 budget 1 ms, #213)`);
}
const ended = lengths.filter((x) => x !== null);
console.log(`summary: ${ended.length}/${seeds} ended; length ${ended.length ? `${Math.min(...ended).toFixed(2)}-${Math.max(...ended).toFixed(2)} s` : '-'}; cost ${Math.min(...costs).toFixed(4)}-${Math.max(...costs).toFixed(4)} ms per step`);

/** A value equal to the js/data.js default is the default option (null: no override). */
function normalise(lo) {
  const d = defaultLoadout(), out = { ...lo };
  if (out.shieldBudget === PARAMS_DEFAULT.shield) out.shieldBudget = d.shieldBudget;
  if (out.hitsToWreck === PARAMS_DEFAULT.hits) out.hitsToWreck = d.hitsToWreck;
  return out;
}
