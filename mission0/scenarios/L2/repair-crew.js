import { createWorld, addRoom, step, damageCell } from '../../../js/rooms.js';

const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.repair.crew',
  level: 'L2',
  laws: ['crew die in proportion to the integrity lost; repair restores cells, never crew (#206, 13e.1)'],
  dependsOn: ['L2.repair.shared.v2'],
  setup: 'a T1 cluster: a bridge at cell (0, 0) (4 crew, 4 cells) and a quarters at (2, 0), powered; the kernel\'s damageCell takes 0.6 from bridge cells 0 and 1 (1.2 cells of integrity lost: 1 death); the quarters repair them to full; then 0.1 is taken from bridge cell 2 (13l.4 A8: survivor e1.rep.crewBack of mission0/mutations/2026-10-22-b7c4290.txt; §17 item 13, a larger hit-1)',
  measure: 'the bridge\'s crew after each stage; the crew-died events; the integrity of cells 0 and 1 after the repair',
  tolerance: 'exact (whole crew)',
  criterion: 'hand-worked: after the two losses the bridge has lost floor(4 x 1.2 / 4) = 1 crew (3 aboard); the repair brings cells 0 and 1 back to 1 and nobody back (3 aboard); the third loss of 0.1 (0.1 of a cell lost now, 1.2 in all) kills nobody more: 3 aboard, one crew-died event in all (#206, 13e.1)',
  tunable: ['repair.massRate', 'repair.radius', 'crewRequired.bridge'],
  locked: { date: '2026-10-22', hash: '012ad5ff' },
  cases() {
    return [{ stage: 'all' }];
  },
  expected() {
    return { afterHits: 3, afterRepair: 3, afterThird: 3, deaths: 1 };
  },
  run(ctx) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const bridge = addRoom(world, 'bridge', { id: 'bridge', cell: [0, 0] });
    addRoom(world, 'quarters', { id: 'quarters', cell: [2, 0] });
    damageCell(world, bridge, 0, 0.6, 'hit-1', 'kinetic');
    damageCell(world, bridge, 1, 0.6, 'hit-2', 'kinetic');
    const afterHits = bridge.crew;
    let steps = 0;
    while ((bridge.cells[0].integrity < 1 || bridge.cells[1].integrity < 1) && steps < 60000) { step(world); steps++; }
    const afterRepair = bridge.crew, repaired = [bridge.cells[0].integrity, bridge.cells[1].integrity];
    damageCell(world, bridge, 2, 0.1, 'hit-3', 'kinetic');
    const deaths = world.log.events.filter((e) => e.type === 'crew-died' && e.room === 'bridge').reduce((x, e) => x + e.deaths, 0);
    return { afterHits, afterRepair, afterThird: bridge.crew, deaths, repaired, seconds: steps * ctx.dt };
  },
  compare(e, a) {
    const checks = {
      'one death after the two losses': a.afterHits === e.afterHits,
      'cells 0 and 1 repaired to full': a.repaired.every((x) => x === 1),
      'repair brings nobody back': a.afterRepair === e.afterRepair,
      'the third, small loss brings nobody back either': a.afterThird === e.afterThird && a.deaths === e.deaths,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'crew 3, 3, 3; 1 death', actual: `crew ${a.afterHits}, ${a.afterRepair}, ${a.afterThird}; ${a.deaths} death(s); repaired in ${a.seconds.toFixed(2)} s` };
  },
};
