import { createBattle, tick } from '../../../js/battle.js';
import { momentumOf } from '../../../js/body.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B11 of L4b (DESIGN.md 13l.4): culling in the loop (§17 item 26). R1 the static target at T1 (its centre of mass at
// the origin), the attacker R1d at rest 900 m away on bearing -y; its turret fires one round at the world point
// (100, 0) m, 100 m beside R1's centre of mass (a miss: R1 is 30 m wide), then holds. The loop calls cull() every step
// with both ships' bodies.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const len = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
function books(world) {
  const s = world.ship, m = momentumOf(s), left = s.left || { m: 0, P: [0, 0] };
  let gross = len(left.P), M = left.m;
  for (const b of s.bodies) { gross += b.M * len(b.v); M += b.M; }
  for (const d of s.debris) { gross += d.m * len(d.v); M += d.m; }
  for (const r of s.rounds) { gross += r.m * len(r.v); M += r.m; }
  return { M, P: [m.P[0] + left.P[0], m.P[1] + left.P[1]], gross, J: [...s.external.J] };
}

export default {
  id: 'L4.cull',
  level: 'L4',
  laws: ['a round farther than battle.cullDistance from every body leaves play, its momentum booked as left; the battle loop calls cull() every step (#222 (7), §17 item 26, 13l.1)', 'momentum is conserved (books close with what left)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 at rest, centre of mass at the origin; attacker R1d at rest 900 m from it on bearing -y; one round aimed at (100, 0) m, then the turret holds; 10 s at most (13l.4 B11)',
  measure: 'whether the round hit; the step it leaves play; its distance from every body of both ships at that step and the step before; world.ship.left of the attacker\'s world; the attacker world\'s books (bodies + debris + rounds + left) against its external impulse (RCS) through the run',
  tolerance: 'distances exact; left = the round 1e-12; books: mass 1e-12, momentum 1e-9 x the gross (#220)',
  criterion: 'the round hits nothing and leaves play in the first step after which it is farther than battle.cullDistance (3000 m) from every body of both ships (at that step every distance > 3000 m, at the step before some distance <= 3000 m); left books its mass and momentum (1e-12); the attacker\'s books close with what left; hand-worked: the line passes 100 m from R1\'s centre, so the round is 3000 m from it about 885.7 + sqrt(3000^2 - 100^2) = 3884 m from the muzzle, 4.855 s at 800 m/s: it leaves between 4.8 and 4.9 s, when it is about 3884 m from the attacker (#222 (7))',
  tunable: ['battle.cullDistance', 'kinetic.muzzleVelocity'],
  locked: { date: '2026-10-22', hash: 'a196a230' },
  cases() {
    return [{ aim: [100, 0] }];
  },
  expected(ctx) {
    return { D: ctx.params.battle.cullDistance.value, bounds: [4.8, 4.9] };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turretPoint: c.aim } });
    const w = b.attacker.world, start = books(w), bodies = () => [...w.ship.bodies, ...b.target.world.ship.bodies].map((x) => [...x.x]);
    let ref = null, leftAt = null, okBooks = true;
    while (leftAt === null && b.step < 600) {
      const before = ref ? { x: [...ref.x], bodies: bodies() } : null;
      tick(b);
      if (!ref && w.ship.rounds.length) { ref = w.ship.rounds[0]; b.plan.turretPoint = null; }
      if (ref && !w.ship.rounds.includes(ref)) {
        const x = [before.x[0] + ref.v[0] * b.dt, before.x[1] + ref.v[1] * b.dt];
        leftAt = { t: b.t, now: Math.min(...bodies().map((p) => len([x[0] - p[0], x[1] - p[1]]))), before: Math.min(...before.bodies.map((p) => len([before.x[0] - p[0], before.x[1] - p[1]]))) };
      }
      const n = books(w), dJ = [n.J[0] - start.J[0], n.J[1] - start.J[1]], dP = len([n.P[0] - start.P[0] - dJ[0], n.P[1] - start.P[1] - dJ[1]]);
      okBooks = okBooks && Math.abs(n.M - start.M) <= 1e-12 * start.M && dP <= 1e-9 * Math.max(start.gross, n.gross, len(dJ)) + 1e-12;
    }
    const left = w.ship.left;
    return { hits: b.hits.length, leftAt, okBooks, left: left ? { m: left.m, P: left.P, rounds: left.rounds } : null, round: ref ? { m: ref.m, P: [ref.m * ref.v[0], ref.m * ref.v[1]] } : null };
  },
  compare(e, a) {
    const close = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(Math.abs(x), Math.abs(y), 1e-300);
    const checks = {
      'a miss': a.hits === 0,
      'leaves at the first step beyond the cull distance': !!a.leftAt && a.leftAt.now > e.D && a.leftAt.before <= e.D,
      'left books its mass and momentum': !!a.left && a.left.rounds === 1 && close(a.round.m, a.left.m) && close(a.round.P[0], a.left.P[0]) && close(a.round.P[1], a.left.P[1]),
      'books close': a.okBooks,
      'hand-worked bounds': !!a.leftAt && a.leftAt.t >= e.bounds[0] && a.leftAt.t <= e.bounds[1],
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `beyond ${r.expected.D} m from every body, between ${r.expected.bounds.join(' and ')} s`, actual: `${a.hits} hits; left at ${a.leftAt ? `${a.leftAt.t.toFixed(4)} s at ${a.leftAt.now.toFixed(3)} m (step before ${a.leftAt.before.toFixed(3)} m)` : 'never'}; books ${a.okBooks ? 'close' : 'OPEN'}` };
  },
};
