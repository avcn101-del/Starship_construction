import { createBattle, tick, largestFraction } from '../../../js/battle.js';
import { destroyCell, cellAt } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B7 of L4b (DESIGN.md 13l.4), successor of L4.kill.pieces (13l.7, #271: TH2, N2): destroyed by too many pieces (#83, 13l.1). A strip of 20 holds (each 2 x 2, 3 t per
// cell: 80 equal cells of 3000 kg, 240 t) on [0, 20) x [0, 4) of the T1 grid, a fixture (no bridge, no weapons: it
// is not validated), the static target of the battle loop; the attacker R1d at rest 900 m away on bearing -y holds
// fire. After the battle is created (its undock mass taken), whole columns of 4 cells are destroyed: (0.45) columns
// 9 and 19, leaving columns 0-8 and 10-18, two fragments of 36 cells each (0.45 of 80 cells); (0.55) column 11,
// leaving columns 0-10 (44 cells, 0.55) and 12-19 (32 cells); (0.50) column 10, leaving columns 0-9 and 11-19
// (40 and 36 cells: the largest exactly 0.5 of 80, the threshold itself). Then one step.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const STRIP = { rooms: Array.from({ length: 20 }, (_, i) => ({ id: `h${String(i).padStart(2, '0')}`, type: 'hold', cell: [2 * (i % 10), 2 * Math.floor(i / 10)] })), fittings: [] };

export default {
  id: 'L4.kill.pieces.v2',
  level: 'L4',
  laws: ['a ship whose largest fragment holds less than battle.wreckFraction of its mass at undock is destroyed (#83, #253, 13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1 with a 20-hold strip (80 cells of 3000 kg) as the target, the attacker R1d on bearing -y holding fire; whole columns destroyed after undock (0.45: columns 9 and 19; 0.55: column 11; 0.50: column 10), then one step (13l.4 B7, 13l.7 TH2)',
  measure: 'the largest fragment\'s share of the undock mass (js/battle.js largestFraction); the battle\'s end after the step',
  tolerance: 'the share 1e-12 relative; the end exact',
  criterion: 'hand-worked: the shares are 36 x 3000 / 240 000 = 0.45, 44 x 3000 / 240 000 = 0.55 and 40 x 3000 / 240 000 = 0.5 (1e-12); with battle.wreckFraction 0.5 (a literal in expected(), 13l.7 N2), destroyed when the share is less than 0.5: (0.45) the target is destroyed by pieces in that step; (0.55) and (0.50, exactly at the threshold: the rule is "less than", 13l.7 TH2) it is not destroyed (nor yet Disabled: its 10 s without a weapon have not passed)',
  tunable: ['battle.wreckFraction'],
  locked: { date: '2026-10-22', hash: 'b6adb51e' },
  cases() {
    return [{ share: 0.45, cut: [9, 19] }, { share: 0.55, cut: [11] }, { share: 0.5, cut: [10] }];
  },
  expected(ctx, c) {
    const wreckFraction = 0.5; // battle.wreckFraction, a literal (13l.7 N2)
    return { share: c.share, destroyed: c.share < wreckFraction };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: STRIP, bearing: '-y', validate: false });
    const w = b.target.world;
    for (const x of c.cut) for (let y = 0; y < 4; y++) { const at = cellAt(w, [x, y]); destroyCell(w, at.room, at.index, 'launch'); }
    tick(b);
    return { share: largestFraction(w, b.target.undock), bodies: w.ship.bodies.length, ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, by: b.ended.by, step: b.ended.step } : null };
  },
  compare(e, a) {
    const checks = {
      'the share (hand-worked)': Math.abs(a.share - e.share) <= 1e-12 * e.share,
      [e.destroyed ? 'destroyed by pieces' : 'not destroyed']: e.destroyed ? !!a.ended && a.ended.kind === 'destroyed' && a.ended.by === 'pieces' && a.ended.side === 'T' && a.ended.step === 1 : a.ended === null,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `largest ${r.expected.share}: ${r.expected.destroyed ? 'destroyed' : 'not destroyed'}`, actual: `largest ${a.share.toPrecision(15)} of ${a.bodies} bodies: ${a.ended ? `${a.ended.kind} (${a.ended.by}) in step ${a.ended.step}` : 'not ended'}` };
  },
};
