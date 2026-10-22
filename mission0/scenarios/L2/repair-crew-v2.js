import { createWorld, addRoom, step, damageCell, destroyCell } from '../../../js/rooms.js';

// Successor of L2.repair.crew (DESIGN.md 13l.7, #271: TH1 and the survivor e1.rep.destroyedRepairable): the original
// case kept; losses of 0.9 and 1.6 cells, either side of a whole cell, so floor is told from round; and a destroyed
// cell beside a damaged one, which repair does not bring back (#206).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const cluster = (ctx) => {
  const world = createWorld({ params: ctx.params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  const bridge = addRoom(world, 'bridge', { id: 'bridge', cell: [0, 0] });
  addRoom(world, 'quarters', { id: 'quarters', cell: [2, 0] });
  return { world, bridge };
};
const deathsIn = (world) => world.log.events.filter((e) => e.type === 'crew-died' && e.room === 'bridge').reduce((x, e) => x + e.deaths, 0);

export default {
  id: 'L2.repair.crew.v2',
  level: 'L2',
  laws: ['crew die in proportion to the integrity lost; repair restores cells, never crew (#206, 13e.1)', 'repair restores damaged cells only, never a destroyed one (#206, 13e.1)'],
  dependsOn: ['L2.repair.shared.v2'],
  setup: 'a T1 cluster: a bridge at cell (0, 0) (4 crew, 4 cells) and a quarters at (2, 0), powered. (all) the kernel\'s damageCell takes 0.6 from bridge cells 0 and 1 (1.2 cells of integrity lost: 1 death); the quarters repair them to full; then 0.1 is taken from bridge cell 2 (13l.4 A8: survivor e1.rep.crewBack of mission0/mutations/2026-10-22-b7c4290.txt; §17 item 13, a larger hit-1). (loss 0.9, loss 1.6) losses of 0.6, then 0.3 (0.9 cells), or 0.6, 0.6 and 0.4 (1.6 cells) from bridge cells 0, 1, 2, no repair (13l.7 TH1). (destroyed) bridge cell 0 destroyed (destroyCell) and cell 1 damaged to 0.5; the quarters repair until cell 1 is full (13l.7, the survivor e1.rep.destroyedRepairable)',
  measure: 'the bridge\'s crew after each stage; the crew-died events; the integrity of the repaired cells; (destroyed) cell 0\'s integrity and destroyed flag after cell 1 is repaired',
  tolerance: 'exact (whole crew, integrity of a destroyed cell)',
  criterion: '(all) hand-worked: after the two losses the bridge has lost floor(4 x 1.2 / 4) = 1 crew (3 aboard); the repair brings cells 0 and 1 back to 1 and nobody back (3 aboard); the third loss of 0.1 (0.1 of a cell lost now, 1.2 in all) kills nobody more: 3 aboard, one crew-died event in all (#206, 13e.1); (loss 0.9) hand-worked floor(4 x 0.9 / 4) = 0 deaths, 4 aboard (round would give 1); (loss 1.6) floor(4 x 1.6 / 4) = 1 death, 3 aboard (round would give 2) (13l.7 TH1); (destroyed) cell 1 is repaired to 1 while cell 0 stays destroyed at integrity 0 (repair restores damaged cells only, #206), and the destroyed cell\'s crew stays dead: floor(4 x (1 + 0.5) / 4) = 1 death, 3 aboard',
  tunable: ['repair.massRate', 'repair.radius', 'crewRequired.bridge'],
  locked: { date: '2026-10-22', hash: 'f3ec1119' },
  cases() {
    return [{ stage: 'all' }, { stage: 'loss', loss: 0.9 }, { stage: 'loss', loss: 1.6 }, { stage: 'destroyed' }];
  },
  expected(ctx, c) {
    if (c.stage === 'all') return { afterHits: 3, afterRepair: 3, afterThird: 3, deaths: 1 };
    if (c.stage === 'loss') { const deaths = Math.floor((4 * c.loss) / 4); return { deaths, crew: 4 - deaths, literal: c.loss === 0.9 ? 0 : 1 }; } // hand-worked
    return { deaths: 1, crew: 3 };
  },
  run(ctx, c) {
    const { world, bridge } = cluster(ctx);
    if (c.stage === 'all') {
      damageCell(world, bridge, 0, 0.6, 'hit-1', 'kinetic');
      damageCell(world, bridge, 1, 0.6, 'hit-2', 'kinetic');
      const afterHits = bridge.crew;
      let steps = 0;
      while ((bridge.cells[0].integrity < 1 || bridge.cells[1].integrity < 1) && steps < 60000) { step(world); steps++; }
      const afterRepair = bridge.crew, repaired = [bridge.cells[0].integrity, bridge.cells[1].integrity];
      damageCell(world, bridge, 2, 0.1, 'hit-3', 'kinetic');
      return { afterHits, afterRepair, afterThird: bridge.crew, deaths: deathsIn(world), repaired, seconds: steps * ctx.dt };
    }
    if (c.stage === 'loss') {
      const parts = [Math.min(c.loss, 0.6), Math.min(Math.max(c.loss - 0.6, 0), 0.6), Math.max(c.loss - 1.2, 0)];
      parts.forEach((p, i) => { if (p > 0) damageCell(world, bridge, i, p, `hit-${i + 1}`, 'kinetic'); });
      return { parts, crew: bridge.crew, deaths: deathsIn(world) };
    }
    destroyCell(world, bridge, 0, 'hit-1');
    damageCell(world, bridge, 1, 0.5, 'hit-2', 'kinetic');
    let steps = 0;
    while (bridge.cells[1].integrity < 1 && steps < 60000) { step(world); steps++; }
    return { cell0: { integrity: bridge.cells[0].integrity, destroyed: bridge.cells[0].destroyed }, cell1: bridge.cells[1].integrity, crew: bridge.crew, deaths: deathsIn(world), seconds: steps * ctx.dt };
  },
  compare(e, a, c) {
    let checks;
    if (c.stage === 'all') {
      checks = {
        'one death after the two losses': a.afterHits === e.afterHits,
        'cells 0 and 1 repaired to full': a.repaired.every((x) => x === 1),
        'repair brings nobody back': a.afterRepair === e.afterRepair,
        'the third, small loss brings nobody back either': a.afterThird === e.afterThird && a.deaths === e.deaths,
      };
    } else if (c.stage === 'loss') {
      checks = { [`floor: ${e.literal} death(s) at ${c.loss} cells (hand-worked)`]: e.deaths === e.literal && a.deaths === e.deaths && a.crew === e.crew };
    } else {
      checks = {
        'the damaged cell repaired to full': a.cell1 === 1,
        'the destroyed cell beside it not repaired': a.cell0.destroyed === true && a.cell0.integrity === 0,
        'its crew stays dead': a.deaths === e.deaths && a.crew === e.crew,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (r.case.stage === 'all') return { expected: 'crew 3, 3, 3; 1 death', actual: `crew ${a.afterHits}, ${a.afterRepair}, ${a.afterThird}; ${a.deaths} death(s); repaired in ${a.seconds.toFixed(2)} s` };
    if (r.case.stage === 'loss') return { expected: `${e.deaths} death(s), crew ${e.crew}`, actual: `${a.deaths} death(s), crew ${a.crew} (losses ${a.parts.join(', ')})` };
    return { expected: 'cell 1 full, cell 0 destroyed at 0; 1 death', actual: `cell 1 ${a.cell1}, cell 0 ${a.cell0.integrity} (destroyed ${a.cell0.destroyed}); ${a.deaths} death(s), crew ${a.crew}; ${a.seconds.toFixed(2)} s` };
  },
};
