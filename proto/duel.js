// proto/duel.js — the prototype's duel on the kernel's symmetric loop (DESIGN.md
// 13n.1 (d), L5d; #217, #301 (5)): createDuel and replayLine mirror
// tools/duel.js's (which imports node:fs and so cannot load in the browser):
// both ships R1d-A, knowledge on, the player's side A on the preset Fire with
// its verbs as the kernel's inputs, the enemy T by js/enemy.js at personality
// 0.5 each (the standard enemy). proto/replay.mjs checks the mirror against
// tools/duel.js on every export. duelHash() is the determinism test's duel
// (13k.1, #239 Q6, scenario L0.determinism): seed 7, the player on Evade from
// t = 0 (broadside, so both ships turn), 60 s, the hash of every event and
// every body's final state. No DOM: tools/determinism.mjs runs it in Node and
// proto/smoke.mjs in Chromium; MATCH is the criterion.
import { withOverrides } from '../js/data.js';
import { createBattle, runBattle, battleHash, battleEvents } from '../js/battle.js';
import { hash, stableStringify } from '../js/util.js';
import { TARGETS, SENSOR_SHIPS, WEAPON_SHIPS, HELM_SHIPS } from '../mission0/targets.js';

export const SHIPS = { ...TARGETS, ...SENSOR_SHIPS, ...WEAPON_SHIPS, ...HELM_SHIPS };
export const STANDARD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

/** The duel's battle (not yet run), as tools/duel.js createDuel. */
export function createDuel({ player = 'R1d-A', enemy = 'R1d-A', seed = 1, range = null, inputs = [], personality = null, overrides = {} } = {}) {
  if (!SHIPS[player]) throw new Error(`unknown ship ${player}`);
  if (!SHIPS[enemy]) throw new Error(`unknown ship ${enemy}`);
  const params = withOverrides(overrides);
  return createBattle({
    params, attacker: SHIPS[player], target: SHIPS[enemy], bearing: '+x', ...(range !== null ? { distance: range } : {}), seed,
    knowledge: true, orders: { A: 'fire' }, enemy: { T: personality || STANDARD },
    inputs: inputs.map((x) => ({ ...x, side: 'A' })),
  });
}
/** The end of a battle in one line, as tools/duel.js endLine. */
export const endLine = (b) => (b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(4)} s (step ${b.ended.step}, event ${b.ended.event}, parent ${b.ended.parent}${b.ended.why ? `, ${b.ended.why}` : ''}${b.ended.by ? `, by ${b.ended.by}` : ''})` : `none by step ${b.step}`);
/** The line that replays a battle, as tools/duel.js replayLine. */
export function replayLine({ player, enemy, seed, range, limit, inputs, personality, overrides = {} }) {
  const pers = personality ? (personality.wildcard ? ' --wildcard' : ` --personality ${['aggression', 'patience', 'caution', 'resolve'].map((k) => personality[k]).join(',')}`) : '';
  const sets = Object.entries(overrides).map(([k, v]) => ` --set ${k}=${v}`).join('');
  return `node tools/duel.js ${player} ${enemy} --seed ${seed}${range !== null && range !== undefined ? ` --range ${range}` : ''} --limit ${limit}${pers}${sets} --inputs '${JSON.stringify(inputs.map(({ t, verb, arg }) => ({ t, verb, arg })))}'`;
}

// The determinism test's duel (L0.determinism): the lead designer's line, node tools/duel.js --seed 7 --inputs
// '[{"t":0,"verb":"preset","arg":"evade"}]' --limit 60.
export const DUEL = { seed: 7, seconds: 60, inputs: [{ t: 0, verb: 'preset', arg: 'evade' }] };

/** Run the duel; { hash, steps, events, end, headings, battle } with the hash over every event and every body's final state. */
export function duelHash() {
  const b = createDuel({ seed: DUEL.seed, inputs: DUEL.inputs });
  runBattle(b, DUEL.seconds);
  const events = battleEvents(b);
  const bodies = b.sides.map((s) => s.world.ship.bodies.map((x) => ({ id: x.id, x: x.x, v: x.v, theta: x.theta, omega: x.omega })));
  return { hash: hash(stableStringify({ events, bodies })), steps: b.step, events: events.length, end: b.ended ? b.ended.t : null, endLine: endLine(b), battle: battleHash(b), headings: bodies.map((x) => x[0] && x[0].theta) };
}
