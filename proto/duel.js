// proto/duel.js — the fixed duel of the determinism test (DESIGN.md 13k.1,
// #239 Q6, scenario L0.determinism): two R1s for 60 s on the prototype's
// battle, the player broadside and dodging (so both ships turn), targeting
// the enemy's beam bay, the enemy on its script, turrets held (the beam-only probe, so the duel lasts its 60 s). Returns the hash of every
// event and of the final state of every body. No DOM: tools/determinism.mjs
// runs it in Node and proto/smoke.mjs in Chromium; MATCH is the criterion.
import { createBattle, tick, setTarget } from './battle.js';
import { hash, stableStringify } from '../js/util.js';

export const DUEL = { seed: 7, seconds: 60, loadout: { facing: 'broadside', dodge: true, range: 'close', turrets: false }, target: 'beamBay' };

/** Run the duel; { hash, steps, events, end, headings } with the hash over every event and every body's final state. */
export function duelHash() {
  const battle = createBattle({ seed: DUEL.seed, loadout: DUEL.loadout });
  setTarget(battle, battle.player, DUEL.target);
  const events = [];
  while (battle.t < DUEL.seconds - 1e-9 && !battle.ended) {
    tick(battle);
    for (const e of battle.events) events.push(e);
    battle.events = [];
  }
  const bodies = battle.ships.map((s) => s.world.ship.bodies.map((b) => ({ id: b.id, x: b.x, v: b.v, theta: b.theta, omega: b.omega })));
  const text = stableStringify({ events, bodies });
  return { hash: hash(text), steps: battle.steps, events: events.length, end: battle.ended ? battle.ended.t : null, headings: bodies.map((b) => b[0] && b[0].theta) };
}
