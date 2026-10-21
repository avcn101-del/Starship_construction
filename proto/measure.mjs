#!/usr/bin/env node
// proto/measure.mjs — one R1-versus-R1 battle of the feel prototype, headless
// (Node, no DOM), with both sides on the enemy's scripted presets (DESIGN.md
// 13h.2). Reports the battle's length, the first room to overheat or fail on
// each side and when, and the cost of one battle step in ms (E8 budget 1 ms,
// #213). Not a Mission 0 scenario (#217): a measure for the owner, to set
// against 13h.3's rough estimate.
//
//   node proto/measure.mjs [--seeds N] [--beam-only] [--limit seconds]
//
// --seeds N runs seeds SEED .. SEED + N - 1 (default 1); --beam-only holds
// both turrets (a probe of the heat race alone, not the prototype's battle).
import { performance } from 'node:perf_hooks';
import { createBattle, tick } from './battle.js';
import { SEED } from './config.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const seeds = Number(arg('--seeds', 1)), beamOnly = process.argv.includes('--beam-only'), limit = Number(arg('--limit', 1800));
const fmt = (x) => (x ? `${x.room} ${x.type || 'hot'} at ${x.t.toFixed(2)} s (cause ${x.cause || 'heat'})` : 'none');

for (let i = 0; i < seeds; i++) {
  const seed = SEED + i;
  const b = createBattle({ seed, scripted: { player: true, enemy: true }, beamOnly });
  const t0 = performance.now();
  while (!b.ended && b.t < limit) tick(b);
  const ms = (performance.now() - t0) / b.steps;
  const e = b.ended;
  console.log(`seed ${seed}${beamOnly ? ' (beam only)' : ''}: ${e ? `ended at ${e.t.toFixed(2)} s (${(e.t / 60).toFixed(2)} min): ${e.losers.map((s) => `${s} ${e.reason[s]}`).join(', ')}` : `no end within ${limit} s`}`);
  for (const s of b.ships) {
    const crewLost = s.crewLost, wrecked = s.world.rooms.filter((r) => r.exploded || r.cells.every((c) => c.destroyed)).map((r) => r.id);
    console.log(`  ${s.side}: first hot ${fmt(s.firstHot)}; first failure ${fmt(s.firstFailure)}; crew lost ${crewLost}/${s.crewTotal}; rooms wrecked ${wrecked.length ? wrecked.join(', ') : 'none'}`);
  }
  console.log(`  cost: ${ms.toFixed(4)} ms per battle step (two R1s, power routing, stand-ins; ${b.steps} steps; E8 budget 1 ms, #213)`);
}
