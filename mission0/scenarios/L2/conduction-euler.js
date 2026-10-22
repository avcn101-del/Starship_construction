import { createWorld, addRoom, step } from '../../../js/rooms.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.conduction.euler',
  level: 'L2',
  laws: ['conduction through a coolant wall at G (T_a - T_b), explicit Euler at the step from the temperatures at its start (#193, #200, 13d.1)'],
  dependsOn: ['L2.heat.pair.v3'],
  setup: 'a T1 cluster: two M reactors at cells (0, 0) and (2, 0) sharing a 10 m coolant wall, demand 0 (no power, no decay heat), no radiators, at 590 K and 290 K; two steps (13l.4 A8: survivor d1.cond.secondOrder of mission0/mutations/2026-10-22-b7c4290.txt)',
  measure: 'the heat each room took through the wall in each step (heat books\' conducted)',
  tolerance: 'closed forms 1e-12',
  criterion: 'hand-worked: G = conduction.wall x 10 m x 1 = 4e4 W/K; the first step moves G x 300 K x dt = 4e4 x 300 / 60 = 200 000 J from the hot room to the cold one (1e-12); the second G (T_a - T_b) dt from the temperatures after the first, T = 590 - 2e5 / C and 290 + 2e5 / C with C = 4 x thermal.coupledReactor = 2.2e7 J/K (re-statement of explicit Euler, 1e-12); a second-order (trapezoid) flow would differ by 0.5 G dt (1/C_a + 1/C_b) = 3.0e-5 of it (#193, #200)',
  tunable: ['conduction.wall', 'thermal.coupledReactor'],
  locked: null,
  cases() {
    return [{ steps: 2 }];
  },
  expected(ctx) {
    const G = 4e4, dt = ctx.dt, C = 2.2e7, q1 = 200000, Ta = 590 - q1 / C, Tb = 290 + q1 / C;
    return { q1, q2: G * (Ta - Tb) * dt };
  },
  run(ctx) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const a = addRoom(world, 'reactor', { id: 'hot', cell: [0, 0], temperature: 590 }), b = addRoom(world, 'reactor', { id: 'cold', cell: [2, 0], temperature: 290 });
    step(world);
    const q1 = [a.heat.conducted, b.heat.conducted];
    step(world);
    return { q1, q2: [a.heat.conducted - q1[0], b.heat.conducted - q1[1]], C: a.heat.C };
  },
  compare(e, a) {
    const checks = {
      'first step: 200 000 J out of the hot room, into the cold one (hand-worked)': close(-e.q1, a.q1[0], 1e-12) && close(e.q1, a.q1[1], 1e-12),
      'second step: G (T_a - T_b) dt from the temperatures after the first (explicit Euler)': close(-e.q2, a.q2[0], 1e-12) && close(e.q2, a.q2[1], 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `${r.expected.q1.toFixed(6)} J, then ${r.expected.q2.toFixed(6)} J`, actual: `${r.actual.q1[1].toFixed(6)} J, then ${r.actual.q2[1].toFixed(6)} J (C ${r.actual.C})` };
  },
};
