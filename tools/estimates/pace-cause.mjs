// tools/estimates/pace-cause.mjs — the lead designer's probe after the pace study (#328, the design partner's check):
// R2 with one counter removed against the specialist it counters; scratch variants, not mission0/builds.js.
// Never a canonical run:  node tools/estimates/pace-cause.mjs
import { withOverrides } from '../../js/data.js';
import { createBattle, runBattle } from '../../js/battle.js';
import { BUILDS } from '../../mission0/builds.js';
import { R1D_PLATES } from '../../mission0/targets.js';
import { resultOf } from '../sweep.mjs';
const S = { aggression: .5, patience: .5, caution: .5, resolve: .5 };
const R2 = BUILDS.R2, key = (f) => JSON.stringify(f);
const D = new Set(R1D_PLATES.map(key));
const V = {
  'R2': R2,
  'R2-noShield': { rooms: R2.rooms.filter((r) => r.type !== 'shieldGenerator'), fittings: R2.fittings.filter((f) => f[1] !== 'shield') },
  'R2-noPD': { rooms: R2.rooms, fittings: R2.fittings.filter((f) => f[0] !== 'pd') },
  'R2-noR1dPlates': { rooms: R2.rooms, fittings: R2.fittings.filter((f) => !D.has(key(f))) },
};
const cases = [['R2-noShield', 'Furnace'], ['R2-noPD', 'Swarm'], ['R2-noR1dPlates', 'Lance'], ['R2', 'Furnace'], ['R2', 'Swarm'], ['R2', 'Lance']];
for (const [a, b] of cases) {
  let n = 0, hurt = 0, wins = { A: 0, T: 0, draw: 0, null: 0 }; const ts = [];
  for (const r of [600, 900, 1500, 2500]) for (const o of ['bow', 'broadside']) {
    const w = o === 'broadside';
    let x;
    try { x = createBattle({ params: withOverrides({ 'battle.cullDistance': Math.max(3000, 2 * r) }), attacker: V[a], target: BUILDS[b], distance: r, seed: 1, knowledge: true, bearing: w ? '+y' : '+x', ...(w ? { attackerHeading: 0 } : {}), enemy: { A: S, T: S } }); }
    catch (e) { console.log(a, 'invalid:', e.message.slice(0, 160)); break; }
    runBattle(x, 600); const res = resultOf(x); const L = x.attacker.world.log;
    n++; if ((L.events ?? L).some((e) => e.type === 'cell-damaged')) hurt++; wins[res.winner]++; ts.push(res.t ?? 600);
  }
  if (n) console.log(`${a} v ${b}: ${a} damaged in ${hurt} of ${n}; wins ${JSON.stringify(wins)}; ends ${ts.map((t) => t.toFixed(0)).join(' ')} s`);
}
