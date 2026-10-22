import { createBattle, tick, battleEnergy, mainBody, buildShip } from '../../../js/battle.js';
import { fireRound, pathAlong } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// K6 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b) B3, B4, L4; §17 item 35; #278): the battle books energy across the two
// ships, a stopped round's mass joins the body it stops in, and a round's heat is split between its entries by the
// energy each took.
// (still, spin) B1's battle (R1 the static target, its centre of mass at the origin; the attacker R1d at rest 900 m on
// bearing -y, bow-on, its turret at the bridge), and the same with R1 given omega 0.05 rad/s and v (20, 0) m/s before
// the first step (as L4.books.two). What is summed (js/battle.js battleEnergy): over both ships the kinetic energy of
// bodies (with spin), debris (with spin), rounds in flight, what left play, and the rounds spent against a field, plus
// the heat of every hit, field and stopped round, less what entered: each shot's muzzle energy (1/2 m u^2 + the
// recoil's J^2 / 2M + (r x J)^2 / 2I, a closed form, not the state's difference), the work of thrust and RCS (the
// integrator's change of each body's kinetic energy) and of mass moved inside (the feed). The total is fixed: the
// residual is checked after every step in which a round hits and at the end, against 1e-9 x the largest gross (the
// sum of the magnitudes of its terms, #220). B4: every round stopped in R1's hull joins its body, so R1's mass
// (bodies + debris + what left play) at the end is its mass at undock + 6 kg per stopped round: in B1's battle all
// 12 rounds stop (B1's count, #267 N8), + 72 kg (hand-worked, 1e-12 relative).
// (split) One M round (6 kg, 800 m/s) by fireRound into R1 (built as the battle builds it, at rest) along the column
// x = 4 from -y: two shield generator cells (sigma 400 kg/m^2) and a reactor cell (6000) where it stops. L4: the heat
// of each entry is the round's heat x (p_i^2 - p_{i+1}^2) / sum, p_i the momentum on entering entry i. Hand-worked
// (13i.1; c 1545.364, A0 3.0609e-3 m^2, S 3.029e6): r = 618 145.7, the first cell takes r A0 = 1892.06 N s (p1 =
// 2907.94), f = 0.2041, A = 3.8457e-3, the second 2377.13 (p2 = 530.80), the reactor the rest: shares 0.63298,
// 0.35479, 0.012229 (5 digits); the scenario's own loop of the round rule at 1e-12 (re-statement).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const mass = (side) => { const sh = side.world.ship; return sh.bodies.reduce((x, b) => x + b.M, 0) + sh.debris.reduce((x, d) => x + d.m, 0) + (sh.left ? sh.left.m : 0); };

export default {
  id: 'L4.books.energy',
  level: 'L4',
  laws: ['energy is booked across both ships of a battle: muzzle energy in, heat and kinetic energy out (B3, 13n.1 (b))', 'a stopped round\'s mass joins the body it stops in (B4)', 'a round\'s heat is split between entries by the energy each took (L4)'],
  dependsOn: [],
  setup: 'the battle loop at T1: target R1 (centre of mass at the origin), attacker R1d at rest 900 m on bearing -y, bow-on, its turret at the bridge (B1); case still: R1 at rest; case spin: R1 given omega 0.05 rad/s and v (20, 0) m/s; until the end or 60 s; case split: one M round by fireRound into R1 at rest along x = 4 from -y (13n.4 K6)',
  measure: 'battleEnergy before the first step, after every step with a hit and at the end: the largest |total - total0| and the largest gross; R1\'s mass at the end and its rounds stopped in the hull; (split) the heat of each entry and the momentum on entering each',
  tolerance: 'books 1e-9 x gross (#220); masses 1e-12 relative; the split 1e-12 relative against the re-statement, the hand-worked shares 1e-5',
  criterion: 'still and spin: the largest residual <= 1e-9 x the largest gross; R1\'s mass at the end = undock + 6 kg x the rounds stopped in its hull (1e-12); still: 12 rounds stop, + 72 kg (hand-worked); spin: at least one hit (its rounds may all pass the drifting hull); split: each entry\'s heat = the round\'s heat x (p_i^2 - p_{i+1}^2) / sum (re-statement, 1e-12), shares 0.63298, 0.35479, 0.012229 (hand-worked, 1e-5)',
  tunable: [],
  locked: { date: '2026-10-22', hash: 'f1740cb6' },
  cases() {
    return [{ name: 'still', omega: 0, v: [0, 0] }, { name: 'spin', omega: 0.05, v: [20, 0] }, { name: 'split' }];
  },
  expected(ctx, c) {
    if (c.name !== 'split') return { tol: 1e-9, stopped: c.name === 'still' ? 12 : null, added: c.name === 'still' ? 72 : null };
    // re-statement of the round rule (13i.1) for the momentum on entering each entry
    const p = ctx.params, fx = ctx.fixed, m = 6, v = 800, cR = p.matter.kineticResistance.value;
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4, S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D;
    let pm = m * v, f = 0, A = A0;
    const P = [];
    for (const sg of [p.cellMass.shieldGenerator.value / 25, p.cellMass.shieldGenerator.value / 25, p.cellMass.reactor.value / 25]) {
      const r = cR * sg;
      P.push(pm);
      if (pm / A > r && f + r / S < 1) { pm -= r * A; f += r / S; A = A0 / (1 - f); } else { pm = 0; break; }
    }
    P.push(pm);
    const e = P.slice(0, -1).map((x, i) => x * x - P[i + 1] * P[i + 1]), sum = e.reduce((x, y) => x + y, 0);
    return { shares: e.map((x) => x / sum), hand: [0.63298, 0.35479, 0.012229] };
  },
  run(ctx, c) {
    if (c.name === 'split') {
      const { world, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T' });
      const fx = ctx.fixed, { A } = roundGeometry(6, fx.steelDensity.value, fx.roundLengthToDiameter.value);
      const path = pathAlong(world, [[4, 0], [4, 1], [4, 2], [4, 3]]).slice(0, 3);
      const res = fireRound(world, { mass: 6, velocity: 800, area: A, direction: [0, 1] }, path, 'round-1');
      return { rooms: path.map((x) => x.room.id), stoppedIn: res.stoppedIn, heats: res.heats, heat: res.heat, entry: res.entry, reactor: room('reactor').id };
    }
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const tb = mainBody(b.target);
    tb.omega = c.omega; tb.v = [...c.v];
    const e0 = battleEnergy(b);
    let worst = 0, gross = e0.gross, seen = 0;
    const check = () => { const e = battleEnergy(b); worst = Math.max(worst, Math.abs(e.total - e0.total)); gross = Math.max(gross, e.gross); };
    while (!b.ended && b.step < 3600) { tick(b); if (b.hits.length > seen) { seen = b.hits.length; check(); } }
    check();
    const e = battleEnergy(b);
    return { worst, gross, hits: b.hits.length, stopped: b.embedded, passed: b.hits.filter((h) => !h.stopped).length, undock: b.target.undock, massEnd: mass(b.target), shots: e.shots, heat: e.heat, t: b.t, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    let checks;
    if (c.name === 'split') {
      const sum = a.heats.reduce((x, y) => x + y, 0), shares = a.heats.map((q) => q / a.heat);
      checks = {
        'the path: two shield generator cells, the reactor; it stops in the reactor': a.rooms.join(' ') === 'shield shield reactor' && a.stoppedIn === 2,
        'heats sum to the round\'s heat (consistency invariant)': close(a.heat, sum, 1e-12),
        'each entry\'s heat by the energy it took (re-statement, 1e-12)': shares.length === 3 && e.shares.every((x, i) => close(x, shares[i], 1e-12)),
        'hand-worked shares (1e-5)': e.hand.every((x, i) => Math.abs(shares[i] - x) <= 1e-5),
      };
    } else {
      checks = {
        'energy books close at 1e-9 x gross': Number.isFinite(a.worst) && a.worst <= e.tol * a.gross,
        'R1\'s mass = undock + 6 kg per stopped round (B4, 1e-12)': close(a.undock + 6 * a.stopped, a.massEnd, 1e-12),
        ...(e.stopped !== null ? { '12 rounds stop, + 72 kg (hand-worked)': a.stopped === e.stopped && close(a.undock + e.added, a.massEnd, 1e-12) } : { 'a round hits': a.hits > 0 }),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.name === 'split') return { expected: `shares ${r.expected.shares.map((x) => x.toFixed(12)).join(' ')}`, actual: `${a.rooms.join(' > ')}, stops in ${a.stoppedIn}; heats ${a.heats.map((x) => x.toFixed(3)).join(' ')} of ${a.heat.toFixed(3)} J` };
    return { expected: `residual <= ${r.expected.tol} x gross; mass + 6 kg per stopped round`, actual: `largest residual ${a.worst.toExponential(3)} J of gross ${a.gross.toExponential(4)}; ${a.hits} hits, ${a.stopped} stopped, ${a.passed} passed; mass ${a.massEnd.toFixed(6)} from ${a.undock.toFixed(6)} kg; ${a.ended || 'running'} at ${a.t.toFixed(4)} s` };
  },
};
