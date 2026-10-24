import { createBattle } from '../../../js/battle.js';
import { SENSOR_SHIPS } from '../../targets.js';

// J6 of L5e1 (DESIGN.md 13n.8, 13n.1 (d) "The enemy", #120, #309 (1)): the wildcard is a personality drawn at battle
// start from the seed (the mechanism, no content): js/enemy.js personalityOf draws aggression, patience, caution and
// resolve, in that order, from the battle's seeded stream (util.js rng, mulberry32) when the enemy is created; nothing
// draws from the stream before it (the dodge intervals draw later, in the helm's steps).
//
// Setup (T1): createBattle with knowledge on, R1d-A against R1d-A at battle.openingRange, the target the enemy with
// { wildcard: true }, the attacker without orders; seeds 1, 2, 3, 4, each built twice; nothing stepped.
// Hand-worked (a re-statement of the stream, written out here from the algorithm, not read from util.js): the
// mulberry32 stream of seed s, its first four numbers in order; each in [0, 1).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
/** mulberry32's first n numbers for a seed (the algorithm of util.js rng, written out as a re-statement). */
function mulberry32(seed, n) {
  let a = seed >>> 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}
const KEYS = ['aggression', 'patience', 'caution', 'resolve'];

export default {
  id: 'L4.enemy.wildcard',
  level: 'L4',
  laws: ['the wildcard: a personality of four numbers in [0, 1) drawn at battle start from the battle\'s seeded stream; the same seed gives the same draw (#120, 13n.1 (d))'],
  dependsOn: ['L4.enemy.decide'],
  setup: 'T1: createBattle, knowledge on, R1d-A against R1d-A; the target the enemy with { wildcard: true }; seeds 1-4, each built twice; no step (13n.8 J6)',
  measure: 'the enemy\'s personality (aggression, patience, caution, resolve) in each build',
  tolerance: 'exact',
  criterion: 'each seed\'s four numbers are the first four of mulberry32(seed) in the order aggression, patience, caution, resolve, each in [0, 1); the two builds of a seed give the same four; no two seeds give the same four; the personality is marked wildcard',
  tunable: [],
  locked: null,
  cases() {
    return [1, 2, 3, 4].map((seed) => ({ seed }));
  },
  expected(ctx, c) {
    return { draw: mulberry32(c.seed, 4), others: [1, 2, 3, 4].filter((s) => s !== c.seed).map((s) => mulberry32(s, 4)) };
  },
  run(ctx, c) {
    const build = () => createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: SENSOR_SHIPS['R1d-A'], seed: c.seed, knowledge: true, enemy: { T: { wildcard: true } } }).target.enemy.personality;
    const p = build(), q = build();
    return { draw: KEYS.map((k) => p[k]), again: KEYS.map((k) => q[k]), wildcard: p.wildcard === true };
  },
  compare(e, a) {
    const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
    const checks = {
      'the first four numbers of the seed\'s stream, in order': same(a.draw, e.draw),
      'each in [0, 1)': a.draw.every((v) => v >= 0 && v < 1),
      'the same seed, the same draw': same(a.draw, a.again),
      'another seed, another draw': e.others.every((o) => !same(o, a.draw)),
      'marked wildcard': a.wildcard,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: r.expected.draw.map((v) => v.toFixed(9)).join(', '), actual: r.actual.draw.map((v) => v.toFixed(9)).join(', ') };
  },
};
