import { createWorld, addRoom, damageCell, setDemand, step } from '../../../js/rooms.js';

// S4 of physics pass 2 (DESIGN.md 13k.4): repair by mass (13k.1, #240 (1), F13). An M crew quarters (all 6 cells) at
// [0, 0] and one target room alone at the same point (r = 0, g = 1): an M hold (3 t cells), an M bridge (crewed,
// 14.8 t) or an M reactor (150 t, demand 0), its cell 0 at 2/3 integrity.
const TARGET = { hold: 'hold', crewed: 'bridge', reactor: 'reactor' };
const LOSS = 1 / 3;
// Hand-worked T1 literals: (m / 3) / repair.massRate = 1000 / 200 = 5 s, 4933.33 / 200 = 24.667 s, 50 000 / 200 = 250 s.
const LITERAL = { hold: 5, crewed: 14800 / 3 / 200, reactor: 250 };
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.repair.mass.v2',
  level: 'L1',
  laws: ['repair by mass: a cell regains repair.massRate / its mass of integrity per second (#240 (1), 13k.1)', 'repair restores damaged cells only'],
  dependsOn: [],
  setup: 'at T1 an M crew quarters (all 6 cells, powered) at [0, 0]; alone at the same point a target room: an M hold, an M bridge or an M reactor (demand 0), its cell 0 damaged by 1/3 at t = 0; run until its cell-repaired event (13k.4 S4)',
  measure: 'the target cell\'s repair rate in the first step; the time of its cell-repaired event; its integrity then',
  tolerance: 'rate 1e-9 relative (measured as a difference of integrities near 2/3 over one step, float resolution about 5e-12); time one-sided in [t, t + dt) with the 1e-9 float slack of #185 (2)',
  criterion: 're-statement: rate = repair.massRate / the cell\'s mass (g(0) = 1, all 6 quarters cells surviving); full at (m / 3) / repair.massRate, one-sided, integrity 1; hand-worked literals hold 5 s, crewed 24.667 s, reactor 250 s (13k.3 quoted 208 s for the 125 t reactor cell; the cell is 150 t since 13k.2) (#51, #206, #240 (1), #243) Successor of L1.repair.mass (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the first step\'s rate is checked at 1e-9, not 1e-12: it is a difference of two integrities of about 0.67 over one step (float resolution about 5e-12 for the reactor cell), not a closed form; nothing else changes.',
  tunable: ['repair.massRate', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor'],
  locked: { date: '2026-10-22', hash: 'c83463b8' },
  cases() {
    return Object.keys(TARGET).map((target) => ({ target }));
  },
  expected(ctx, c) {
    const p = ctx.params, m = { hold: p.structure.cellMass.value, crewed: p.cellMass.crewed.value, reactor: p.cellMass.reactor.value }[c.target];
    return { rate: p.repair.massRate.value / m, time: (m * LOSS) / p.repair.massRate.value, literal: LITERAL[c.target], dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    addRoom(world, 'quarters', { id: 'quarters', position: [0, 0] });
    const target = addRoom(world, TARGET[c.target], { id: 'target', position: [0, 0] });
    if (target.type === 'reactor') setDemand(world, target, 0);
    damageCell(world, target, 0, LOSS, 'hit-1', 'kinetic');
    const before = target.cells[0].integrity;
    step(world);
    const rate = (target.cells[0].integrity - before) / ctx.dt;
    const ev = () => world.log.events.find((e) => e.type === 'cell-repaired' && e.room === 'target' && e.cell === 0);
    while (!ev() && world.t < 2000) step(world);
    return { rate, time: ev() ? ev().t : null, integrity: target.cells[0].integrity };
  },
  compare(e, a) {
    const checks = {
      'rate = massRate / m': close(e.rate, a.rate, 1e-9),
      'full at (m / 3) / massRate, one-sided': oneSided(e.time, a.time, e.dt) && a.integrity === 1,
      'hand-worked literal, one-sided': oneSided(e.literal, a.time, e.dt),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `rate ${r.expected.rate.toExponential(6)} /s; full at ${r.expected.time.toFixed(4)} s (literal ${r.expected.literal.toFixed(3)} s)`, actual: `rate ${r.actual.rate.toExponential(6)} /s; full at ${r.actual.time === null ? 'never' : r.actual.time.toFixed(4)} s, integrity ${r.actual.integrity}` };
  },
};
