#!/usr/bin/env node
// proto/captain-probe.mjs — the question behind §13n.12 (#366) before it is built: can a side flown by js/enemy.js keep
// a hold and a preset written by the phases layer between ticks? Two readings on the kernel, both sides the standard
// enemy (as §13n.12 asks), R2 against R2, bow on, seed 1. Not a Mission 0 result (#217); no number outside js/data.js.
//
//   node proto/captain-probe.mjs
//
// (1) Hold: before every tick the page sets side A's helm.hold = true (contact's "weapons held until its exit"). It
//     prints each change of A's hold, zones resolved and whether its weapons are held, from helm.rangeHold.
// (2) Preset verb: side A plays the verb 'preset cool' at the first step after enemy.decisionInterval x 2 (between two
//     of the captain's decisions); it prints A's preset at every step until it changes back.
import { withOverrides, scaled, TIERS } from '../js/data.js';
import { createBattle, tick } from '../js/battle.js';
import { BUILDS } from '../mission0/builds.js';

const STANDARD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const params = withOverrides({}), edge = TIERS.T1.edge;
const battle = (inputs = []) => createBattle({ params, attacker: BUILDS.R2, target: BUILDS.R2, distance: scaled(params.helm.rangeHold, edge), seed: 1, knowledge: true, bearing: '+x', enemy: { A: STANDARD, T: STANDARD }, inputs });

console.log('(1) hold set before every tick; A: t, helm.hold, zones resolved, weapons held');
let x = battle(), prev = null;
const zones = x.attacker.model.zones.length;
while (!x.ended && x.attacker.model.resolved.size < zones) {
  x.attacker.helm.hold = true;
  tick(x);
  const s = `hold ${x.attacker.helm.hold} · zones ${x.attacker.model.resolved.size}/${zones} · held ${x.attacker.helm.held}`;
  if (s !== prev) { console.log(`  ${x.t.toFixed(2)} s  ${s}`); prev = s; }
}

const every = scaled(params.enemy.decisionInterval, edge), at = 2 * every + x.dt; // one step after a decision
console.log(`(2) A plays 'preset cool' at ${at.toFixed(4)} s (enemy.decisionInterval ${every} s); A's preset as it changes`);
x = battle([{ t: at, side: 'A', verb: 'preset', arg: 'cool' }]);
prev = null;
while (!x.ended && x.t < at + 2 * every) {
  tick(x);
  if (x.attacker.helm.orders.name !== prev) { prev = x.attacker.helm.orders.name; console.log(`  ${x.t.toFixed(4)} s  ${prev}`); }
}
