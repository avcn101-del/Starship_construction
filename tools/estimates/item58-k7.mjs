// tools/estimates/item58-k7.mjs — §17 item 58, K7's probe (the lead designer, 2026-10-25): R2 v R2 at 2500 m, the target's reactor at
// demand 0.1 (its engine starved under the fire preset) for 600 steps, then 1: when the pilot asks again. Estimates only.
// Run: node tools/estimates/item58-k7.mjs <tree root> (base, or a scratch tree under item58-b.diff or item58-c.diff)
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const root = process.argv[2], imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const { withOverrides } = await imp('js/data.js');
const { createBattle, tick, mainBody } = await imp('js/battle.js');
const { setDemand } = await imp('js/rooms.js');
const { shipDynamics } = await imp('js/pilot.js');
const { BUILDS } = await imp('mission0/builds.js');
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const x = createBattle({ params: withOverrides({ 'battle.cullDistance': 5000 }), attacker: BUILDS.R2, target: BUILDS.R2, distance: 2500, seed: 1, knowledge: true, bearing: '+x', enemy: { A: STD, T: STD } });
const s = x.target, w = s.world, reactor = w.rooms.find((r) => r.type === 'reactor'), engine = w.rooms.find((r) => r.type === 'engine');
const S = 600, rows = [];
let asks = [0, 0], firstAskAfter = null;
for (let n = 0; n < 1200; n++) {
  setDemand(w, reactor, n < S ? 0.1 : 1);
  tick(x);
  const asked = engine.engine.throttle > 0;
  if (n < S) asks[0] += asked; else { asks[1] += asked; if (asked && firstAskAfter === null) firstAskAfter = n; }
  if ([1, 2, 3, 4, 300, 301, S - 1, S, S + 1, S + 2, S + 3, S + 60].includes(n)) rows.push({ n, asked, frac: engine.powerFraction, last: engine.engine.lastSupply, a: +shipDynamics(x, s).a.toFixed(4), engaged: s.helm.engaged, prio: w.power.priority.join(',') });
}
console.table(rows);
console.log({ asksBefore: asks[0], asksAfter: asks[1], firstAskAfter, ended: x.ended && x.ended.kind });
