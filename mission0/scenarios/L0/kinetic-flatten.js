import { createWorld, addRoom, setActive, fireRound } from '../../../js/rooms.js';
import { penetrateRound } from '../../../js/damage.js';
import { roundGeometry } from '../../../js/projectile.js';

// S21 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-5): the stop takes min(s, r) with the flattened area, and
// a wrecked round's momentum goes to what it stopped in. Literals worked by hand in the criterion, not an own loop.
// (stop) an M round at T1 into 6 armour-like cells (three switched-off M shield generators, 10 t cells, sigma 400
// kg/m^2) by the kernel's fireRound; (wreck) the kernel's penetrateRound with the same round and cells but a strength
// of 1.5 r, so that it is wrecked in cell 2.

export default {
  id: 'L0.kinetic.flatten',
  level: 'L0',
  laws: ['the round takes what the cell takes against its own strength and flattens at constant volume (#228, #230)', 'a wrecked round\'s remaining momentum goes to what it stopped in (13i.1)'],
  dependsOn: [],
  setup: '(stop) an M round (6 kg, 800 m/s, a steel cylinder 4 diameters long) at T1 into 6 cells of sigma 400 kg/m^2 (switched-off shield generators) by the kernel\'s fireRound; (wreck) penetrateRound with the same round and cells and strength 1.5 r (13k.4 S21)',
  measure: 'cells passed, the stopping cell, the sectional momentum it took, the momentum left at the stop, the damage f and the area after; the momentum each cell took and their sum',
  tolerance: 'literals 1e-6 relative (worked to 7-8 digits); the momentum books 1e-12',
  criterion: 'hand-worked: p0 = 6 x 800 = 4800 N s; D = (4 x 6 / (pi x 7850 x 4))^(1/3) = 0.0624277 m, A0 = pi D^2 / 4 = 0.00306087 m^2; r = 2.7e5 x 12^(1/3) = 618 145.69 kg/(m s); S = c m / A0 = 1545.364 x 6 / A0 = 3 029 268.3. (stop) cell 1: s = 1 568 186 > r, f + r / S = 0.204058 < 1: passes, p = 4800 - r A0 = 2907.9387, f = 0.204058, A = A0 / (1 - f) = 0.00384559; cell 2: s = 756 175.2 > r: passes, p = 2907.9387 - r A = 530.80474, f = 0.408116, A = 0.00517139; cell 3: s = p / A = 102 642.54 < r: stops, takes min(s, r) = 102 642.54 with the flattened area, f = 0.408116 + s / S = 0.441999, its impulse = 530.80474 N s; depth 2.166049 cells. (wreck, S = 1.5 r = 927 218.5) cell 1 passes (f = 2/3, p = 2907.9387, A = 3 A0); cell 2: s = 316 679.26 < r, f would be 2/3 + 0.341535 > 1: wrecked (f = 1), stopped in cell 2, which takes the remaining 2907.9387 N s; in both, the momentum the cells took sums to p0 (1e-12) (#228, #230, #232, #244)',
  tunable: [],
  locked: null,
  cases() {
    return [{ part: 'stop' }, { part: 'wreck' }];
  },
  expected(ctx, c) {
    if (c.part === 'stop') return { passed: 2, stoppedIn: 2, taken: 102642.54, stopMomentum: 530.80474, f: 0.441999, area: 0.003060866 / (1 - 0.441999), p0: 4800 };
    return { passed: 1, stoppedIn: 1, wrecked: true, f: 1, stopMomentum: 2907.9387, p0: 4800 };
  },
  run(ctx, c) {
    const p = ctx.params, fx = ctx.fixed, edge = ctx.tiers.T1.edge, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
    const { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
    if (c.part === 'stop') {
      const world = createWorld({ params: p, edge, dt: ctx.dt });
      const rooms = [1, 2, 3].map((i) => addRoom(world, 'shieldGenerator', { id: `gen-${i}` }));
      for (const r of rooms) setActive(world, r, false);
      const res = fireRound(world, { mass: m, velocity: v, area: A }, rooms.flatMap((room) => [{ room, cell: 0 }, { room, cell: 1 }]), 'round-1');
      return { passed: res.passed, stoppedIn: res.stoppedIn, taken: res.absorbed[res.stoppedIn], stopMomentum: res.stopMomentum, impulseAtStop: res.impulse[res.stoppedIn], f: res.f, area: res.area, sum: res.impulse.reduce((x, y) => x + y, 0) + res.momentum };
    }
    const r = p.matter.kineticResistance.value * (ctx.scaled(p.cellMass.shieldGenerator, edge) / (edge * edge));
    const res = penetrateRound({ momentum: m * v, area: A, strength: 1.5 * r }, new Array(6).fill(r));
    return { passed: res.passed, stoppedIn: res.stoppedIn, wrecked: res.wrecked, f: res.f, stopMomentum: res.stopMomentum, impulseAtStop: res.impulse[res.stoppedIn], sum: res.impulse.reduce((x, y) => x + y, 0) + res.momentum };
  },
  compare(e, a, c) {
    const near = (x, y) => Number.isFinite(y) && Math.abs(x - y) <= 1e-6 * Math.abs(x);
    const checks = {
      'cells passed and the stop': a.passed === e.passed && a.stoppedIn === e.stoppedIn,
      'momentum left at the stop goes to that cell': near(e.stopMomentum, a.stopMomentum) && a.impulseAtStop === a.stopMomentum,
      'damage f': c.part === 'stop' ? near(e.f, a.f) : a.f === 1 && a.wrecked === true,
      'momentum books': Math.abs(a.sum - e.p0) <= 1e-12 * e.p0,
      ...(c.part === 'stop' ? { 'the stop takes min(s, r) with the flattened area': near(e.taken, a.taken), 'area after': near(e.area, a.area) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    const a = r.actual;
    return { expected: JSON.stringify(r.expected), actual: `passed ${a.passed}, stopped in ${a.stoppedIn}, took ${a.taken === undefined ? '-' : a.taken.toFixed(4)}, left ${a.stopMomentum.toFixed(6)} N s, f ${a.f.toFixed(9)}${a.wrecked ? ' (wrecked)' : ''}, books ${a.sum}` };
  },
};
