import { buildShip } from '../../../js/battle.js';
import { damageCell } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// J10 of L5e1 (DESIGN.md 13n.8 "No event without a change of state", §17 item 51, #311): damageCell emits cell-damaged
// only when the cell's integrity changes. Before L5e1 a loss of about 1e-17 on a cell at integrity 1 (1 - 1e-17 is 1
// in floats) emitted an event with the integrity still 1, so whether a repaired cell sat at exactly 1 or one ulp below
// decided an event, and a one-ulp move changed the event count and every hash over events (#311: the determinism duel
// 30 -> 27 events).
//
// Setup (T1): R1 built as js/battle.js buildShip builds a battle's ship; its hold's cell 0 (a hold: no crew, nothing
// follows a loss), set to integrity 1 or to 1 - 2^-53 (the largest double below 1, one ulp), then damageCell with a loss
// of 1e-17 (below the ulp of 1, 1.1e-16, and of 1 - 2^-53), 0, or 1e-3; the events it emits read from the log.
// Hand-worked (IEEE doubles): 1 - 1e-17 rounds to 1; (1 - 2^-53) - 1e-17 rounds to 1 - 2^-53 (the gap below it is
// 2^-53 = 1.1e-16, and 1e-17 is under half of it); 1 - 1e-3 = 0.999 changes: one cell-damaged with integrity 0.999.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const ULP = 1 - 2 ** -53;

export default {
  id: 'L4.events.change',
  level: 'L4',
  laws: ['no event without a change of state: cell-damaged only when a cell\'s integrity changes (§17 item 51)'],
  dependsOn: ['L4.cascade.v4'],
  setup: 'T1: R1 (buildShip); its hold\'s cell 0 at integrity 1 or 1 - 2^-53; damageCell with a loss of 1e-17, 0 or 1e-3; the events emitted (13n.8 J10)',
  measure: 'the cell\'s integrity before and after; the events damageCell emitted',
  tolerance: 'exact (IEEE doubles)',
  criterion: 'a loss below float resolution (1e-17 at 1 and at 1 - 2^-53) or of 0 leaves the integrity bit for bit as it was and emits nothing; a loss of 1e-3 at 1 emits exactly one cell-damaged with integrity 0.999 (1 - 1e-3 in doubles)',
  tunable: [],
  locked: null,
  cases() {
    return [{ from: 1, loss: 1e-17 }, { from: ULP, loss: 1e-17 }, { from: 1, loss: 0 }, { from: 1, loss: 1e-3 }];
  },
  expected(ctx, c) {
    const after = c.from - c.loss;
    return { after, events: after === c.from ? [] : ['cell-damaged'], literal: c.loss === 1e-3 ? 0.999 : c.from };
  },
  run(ctx, c) {
    const { world, room } = buildShip(ctx.params, 'T1', TARGETS.R1);
    const hold = room('hold'), cell = hold.cells[0];
    cell.integrity = c.from;
    const n = world.log.events.length;
    damageCell(world, hold, 0, c.loss, 'case', 'kinetic');
    const ev = world.log.events.slice(n);
    return { before: c.from, after: cell.integrity, events: ev.map((e) => e.type), integrity: ev.map((e) => e.integrity) };
  },
  compare(e, a, c) {
    const checks = {
      'the integrity after (bit for bit)': a.after === e.after && a.after === e.literal,
      'the events emitted': a.events.join(',') === e.events.join(','),
      'an event carries the new integrity': a.events.length === 0 || a.integrity[0] === a.after,
      'below resolution: unchanged': c.loss === 1e-3 || a.after === a.before,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `integrity ${r.expected.after}; events ${r.expected.events.join(', ') || 'none'}`, actual: `integrity ${r.actual.before} -> ${r.actual.after}; events ${r.actual.events.join(', ') || 'none'}` };
  },
};
