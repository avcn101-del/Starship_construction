import { createBattle, runBattle, buildShip } from '../../../js/battle.js';
import { readout } from '../../../js/rooms.js';
import { validateShip } from '../../../js/layout.js';
import { ROOMS, TIERS } from '../../../js/data.js';
import { BUILDS, R2 } from '../../builds.js';
import { TARGETS } from '../../targets.js';

// #330's lethality of the rebuilt reference builds (DESIGN.md 13n.1 (e); #329, #330, #332, #343): each specialist can
// kill its own mirror and can damage R2. Lance and Swarm each carry one secondary S turret (#332: without it Lance's
// mirror ended in 6 of 8 cells, Swarm hurt R2 in 3 of 8); Furnace carries none, and its mirror's count is recorded,
// not a criterion (#343: the other's two shields absorb most of its beam and its heat sends both ships to Cool).
//
// Setup (T1), every battle as tools/estimates/pace-e7.mjs's cell: createBattle with knowledge on, both sides the
// standard enemy (personality 0.5 each, its default orders), seed 1, at 600 / 900 / 1500 / 2500 m, bow (the attacker
// on the target's bearing +x) and broadside (bearing +y, the attacker's heading 0), battle.cullDistance =
// max(3000, 2 x range) m, each to its end or 600 s.
// (i) Mirror: each of Lance, Swarm and Furnace against itself, the 8 cells. A battle counts as a kill when it ends by
// 600 s with cell damage on the loser (on both ships in a draw); cell damage is a 'cell-damaged' event in that ship's
// log (#343 (5)); a dry surrender with no damage is no kill.
// (ii) Against R2: R2 (mission0/builds.js, unchanged by #330) as the attacker against each of the three, the same 8
// cells; R2 takes cell damage (any 'cell-damaged' event in its log) in at least 4 of 8.
// (iii) Each of the three passes validateShip and its mass at undock (the readout's) lies within 5 % of R1d's.
// Every battle's end, time and cells damaged on each side are printed.
const RANGES = [600, 900, 1500, 2500], OPENINGS = ['bow', 'broadside'];
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const LIMIT = 600;
const SPECIALISTS = ['Lance', 'Swarm', 'Furnace'];
const MEASURED = new Set(['Furnace']); // #343: Furnace's (i) is a measured count, not a criterion
const T1 = TIERS.T1;

export default {
  id: 'L4.builds.lethal',
  level: 'L4',
  laws: ['the reference specialists are lethal (#330, #332, #343): Lance and Swarm kill their own mirror in every cell; each of the three damages R2 in at least half the cells; each valid and on R1d\'s budget'],
  dependsOn: ['L4.builds.valid.v2', 'L4.helm.race'],
  setup: 'T1: createBattle as tools/estimates/pace-e7.mjs\'s cell (knowledge on, both the standard enemy with personality 0.5, default orders, seed 1, bearing +x for bow, +y with attackerHeading 0 for broadside, limit 600 s) at 600 / 900 / 1500 / 2500 m, bow and broadside, battle.cullDistance = max(3000, 2 x range); (i) Lance, Swarm, Furnace each against itself; (ii) R2 as the attacker against each; (iii) validateShip and the readout\'s mass',
  measure: 'per battle: its end (kind, side, time) and the cell-damaged events in each side\'s log; per build: validateShip\'s verdict and the mass at undock',
  tolerance: 'counts of battles (exact); the mass within 5 % of R1d\'s',
  criterion: '(i) Lance and Swarm: in 8 of 8 mirror cells the battle ends by 600 s with cell damage on the loser (on both ships in a draw; a dry surrender with no damage is no kill); Furnace\'s mirror count is recorded, not a criterion (#343); (ii) for each of the three, R2 takes cell damage (any cell-damaged event in its log) in at least 4 of 8 cells; (iii) each of the three passes validateShip and |mass / mass(R1d) - 1| <= 0.05',
  tunable: [],
  locked: null,
  cases() {
    return [
      ...SPECIALISTS.map((b) => ({ part: 'i', a: b, b })),
      ...SPECIALISTS.map((b) => ({ part: 'ii', a: 'R2', b })),
      ...SPECIALISTS.map((b) => ({ part: 'iii', b })),
    ];
  },
  expected(ctx, c) {
    if (c.part === 'i') return { kills: MEASURED.has(c.b) ? null : 8, of: 8 };
    if (c.part === 'ii') return { hurt: 4, of: 8 };
    return { tolerance: 0.05 };
  },
  run(ctx, c) {
    if (c.part === 'iii') {
      const bp = BUILDS[c.b];
      const v = validateShip({ grid: T1.grid, edge: T1.edge, rooms: bp.rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: bp.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) }, ROOMS, ctx.params);
      const mass = v.valid ? readout(buildShip(ctx.params, 'T1', bp).world).mass : null, budget = readout(buildShip(ctx.params, 'T1', TARGETS.R1d).world).mass;
      return { valid: v.valid, reasons: v.reasons.map((x) => `${x.rule} ${x.room}: ${x.detail}`), mass, budget };
    }
    const battles = [];
    for (const range of RANGES) for (const opening of OPENINGS) battles.push(battle(ctx, c.a === 'R2' ? R2 : BUILDS[c.a], BUILDS[c.b], range, opening));
    return { battles };
  },
  compare(e, a) {
    if (a.battles === undefined) {
      const ok = a.valid && Math.abs(a.mass / a.budget - 1) <= e.tolerance;
      return { pass: ok, note: ok ? '' : a.valid ? `mass ${(a.mass / a.budget * 100).toFixed(1)} % of R1d` : `invalid: ${a.reasons.join('; ')}` };
    }
    if (e.kills !== undefined) {
      const n = a.battles.filter(kill).length;
      if (e.kills === null) return { pass: true, note: `measured (#343): ${n} of 8` };
      return { pass: n >= e.kills, note: n >= e.kills ? '' : `${n} of 8 kills` };
    }
    const n = a.battles.filter((x) => x.dA > 0).length;
    return { pass: n >= e.hurt, note: n >= e.hurt ? '' : `R2 damaged in ${n} of 8` };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (a.battles === undefined) return { expected: 'valid; within 5 % of R1d', actual: a.valid ? `${(a.mass / 1e3).toFixed(1)} t (${((a.mass / a.budget) * 100).toFixed(1)} % of ${(a.budget / 1e3).toFixed(1)} t)` : `invalid: ${a.reasons.join('; ')}` };
    const lines = a.battles.map((x) => `${x.range} ${x.opening}: ${x.end}, cells damaged A/T ${x.dA}/${x.dT}${e.kills !== undefined ? (kill(x) ? ' (kill)' : ' (no kill)') : ''}`).join('; ');
    if (e.kills !== undefined) return { expected: e.kills === null ? 'measured (#343)' : `${e.kills} of 8 kills`, actual: `${a.battles.filter(kill).length} of 8 kills: ${lines}` };
    return { expected: `R2 damaged in >= ${e.hurt} of 8`, actual: `R2 damaged in ${a.battles.filter((x) => x.dA > 0).length} of 8: ${lines}` };
  },
};

/** One cell: its end and the cell-damaged events on each side (A the attacker, T the target). */
function battle(ctx, attacker, target, range, opening) {
  const p = ctx.params, broadside = opening === 'broadside';
  const params = { ...p, battle: { ...p.battle, cullDistance: { ...p.battle.cullDistance, value: Math.max(3000, 2 * range) } } };
  const b = createBattle({ params, attacker, target, distance: range, seed: 1, knowledge: true, bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD } });
  runBattle(b, LIMIT);
  const dmg = (s) => s.world.log.events.filter((x) => x.type === 'cell-damaged').length, e = b.ended;
  return { range, opening, kind: e ? e.kind : 'none', side: e ? e.side : null, t: e ? e.t : null, dA: dmg(b.attacker), dT: dmg(b.target),
    end: e ? `${e.kind} ${e.side}${e.why ? ` (${e.why})` : e.by ? ` (${e.by})` : ''} at ${e.t.toFixed(2)} s` : `none by ${LIMIT} s` };
}
/** A kill (#330 (i)): an end by the limit with cell damage on the loser, on both ships in a draw. */
function kill(x) {
  if (x.kind === 'none') return false;
  if (x.kind === 'draw') return x.dA > 0 && x.dT > 0;
  return (x.side === 'A' ? x.dA : x.dT) > 0; // the side that ended is the loser (surrender, Disabled, destroyed, escaped)
}
