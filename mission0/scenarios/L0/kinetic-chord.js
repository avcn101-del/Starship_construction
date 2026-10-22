import { createWorld, addRoom, setActive, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// S11 of physics pass 2 (DESIGN.md 13k.4): the chord rule (13k.1, #239). The L0 lock hashes cases, expected, compare
// and invariants but not helpers (#175), so the scenario's own loop lives inside expected(). A column of 10
// armour-like cells: five M shield generators standing alone and switched off, crossed two cells deep (10 t cells,
// sigma 400 kg/m^2 at T1, armour.cellMass's); each path entry carries the chord of a 45 degree line (1 / sqrt 2) or
// none (a straight line, chord 1).
const CELLS = 10;
const CHORD = { straight: 1, diagonal: Math.SQRT1_2 };

export default {
  id: 'L0.kinetic.chord',
  level: 'L0',
  laws: ['a cell a line crosses for a fraction of an edge resists in proportion: r = c sigma chord (#239, 13k.1)', 'protection is the mass on the path (#232)', 'every interaction is symmetric (#228)'],
  dependsOn: [],
  setup: 'an M round (kinetic.roundMass, kinetic.muzzleVelocity) into a column of 10 armour-like cells (switched-off shield generators, 10 t cells) by the kernel\'s fireRound, every path entry with chord 1 / sqrt 2 (a 45 degree line) or without one (chord 1), T1 and T3 (13k.4 S11)',
  measure: 'the resistance of each cell, cells passed, the continuous depth (passed + taken / r at the stop), the round\'s damage f, the momentum books, the loss of each cell',
  tolerance: 'closed form against the kernel\'s loop 1e-12 (13k.4 conventions); the literal 1e-6',
  criterion: 're-statement: the round rule of 13i.1 in the scenario\'s own loop with r = matter.kineticResistance x sigma x chord; depth, cells passed and f within 1e-12; p0 = sum of the momentum each cell took + p on exit within 1e-12; a passed cell loses 1 / kinetic.hitsToWreck, the stopping cell (taken / r) / hitsToWreck; hand-worked literal: at T1 a diagonal cell resists 2.7e5 x 12^(1/3) / sqrt 2 = 437 095.0 kg/(m s) (1e-6). The straight depth x sqrt 2 is not the diagonal depth (the round flattens cell by cell, so the ratio is about 1.39, not 1.414): not a criterion here (a question in the pull request) (#228, #232, #239, #243)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'cellMass.shieldGenerator', 'kinetic.hitsToWreck'],
  locked: { date: '2026-10-22', hash: '8ef725b0' },
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const line of Object.keys(CHORD)) out.push({ tier, line });
    return out;
  },
  expected(ctx, c) {
    function ownLoop(p0, A0, S, rs) {
      let p = p0, f = 0, A = A0;
      const taken = [], impulse = [];
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i], s = p / A;
        if (s > r && f + r / S < 1) { taken.push(r); impulse.push(r * A); p -= r * A; f += r / S; A = A0 / (1 - f); continue; }
        const t = Math.min(s, r);
        f = Math.min(1, f + t / S);
        taken.push(t); impulse.push(p);
        return { passed: i, stoppedIn: i, depth: i + t / r, f, taken };
      }
      return { passed: rs.length, stoppedIn: -1, depth: rs.length, f, taken };
    }
    const p = ctx.params, fx = ctx.fixed, edge = ctx.tiers[c.tier].edge;
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const cR = p.matter.kineticResistance.value, r = cR * (ctx.scaled(p.cellMass.shieldGenerator, edge) / (edge * edge)) * CHORD[c.line];
    const S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D, own = ownLoop(m * v, A0, S, new Array(CELLS).fill(r));
    const hits = p.kinetic.hitsToWreck.value;
    const losses = own.taken.map((t, i) => (i < own.passed ? 1 : t / r) / hits);
    return { r, depth: own.depth, passed: own.passed, f: own.f, losses, literal: c.tier === 'T1' && c.line === 'diagonal' ? 437095.0 : null };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, world = createWorld({ params: ctx.params, edge, dt: ctx.dt }), p = ctx.params, fx = ctx.fixed;
    const rooms = Array.from({ length: CELLS / 2 }, (_, i) => addRoom(world, 'shieldGenerator', { id: `gen-${i + 1}` }));
    for (const r of rooms) setActive(world, r, false);
    const path = rooms.flatMap((room) => [0, 1].map((cell) => (c.line === 'straight' ? { room, cell } : { room, cell, chord: CHORD.diagonal })));
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
    const res = fireRound(world, { mass: m, velocity: v, area: A }, path, 'round-1');
    const depth = res.stoppedIn === -1 ? res.passed : res.passed + res.absorbed[res.stoppedIn] / res.r[res.stoppedIn];
    return { r: res.r[0], depth, passed: res.passed, f: res.f, p0: res.p0, booked: res.impulse.reduce((x, y) => x + y, 0) + res.momentum, losses: res.losses };
  },
  compare(e, a) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    const checks = {
      'r = c sigma chord': close(e.r, a.r, 1e-12),
      'depth by the round rule with r chord': close(e.depth, a.depth, 1e-12),
      'cells passed': a.passed === e.passed,
      'damage f': close(e.f, a.f, 1e-12),
      'momentum books': close(a.p0, a.booked, 1e-12),
      'cell losses': a.losses.length === e.losses.length && e.losses.every((x, i) => close(x, a.losses[i], 1e-12)),
      ...(e.literal !== null ? { 'hand-worked literal r = 437 095.0': close(e.literal, a.r, 1e-6) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    return { expected: `r ${r.expected.r.toFixed(3)}, depth ${r.expected.depth.toFixed(12)} cells, passes ${r.expected.passed}, f ${r.expected.f.toFixed(6)}`, actual: `r ${r.actual.r.toFixed(3)}, depth ${r.actual.depth.toFixed(12)} cells, passes ${r.actual.passed}, f ${r.actual.f.toFixed(6)}` };
  },
};
