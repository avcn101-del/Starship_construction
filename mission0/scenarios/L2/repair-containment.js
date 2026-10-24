import { buildShip } from '../../../js/battle.js';
import { damageCell, step } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// J4 of L5e1 (DESIGN.md 13n.8 "Reactor containment first", #37, #307): crew repair follows the repair order, but a
// damaged reactor's cells take the repair budget first, whole, whatever the order says; the rest is shared as before
// (the order's whole-cell grants, or 'none's proportional share).
//
// Setup (T1): R1 built as js/battle.js buildShip builds a battle's ship (power routed, every reactor at full demand); at
// undock its reactor cell 0 and turret cell 0 each lose half their integrity (damageCell, loss 0.5); the repair order
// (world.repairOrder, what js/helm.js sets from the slot) the turret's room, 'none' (null), or the turret with the
// reactor whole (control: only the turret damaged, so the list grants it whole as before #37's rule); one step.
// Hand-worked (R1's grid, m: the quarters' centre (32.5, 25), the reactor's (20, 15), the turret's (45, 25)): r =
// sqrt(256.25) = 16.008 m and 12.5 m; g = 1 / (1 + r^2 / repair.radius^2) = 1 / (1 + 256.25 / 900) = 0.778378 and
// 0.852071; the quarters' budget R = repair.massRate = 200 kg/s (fully powered, kernel-read); the asks R g: reactor
// 155.676 kg/s, turret 170.414 kg/s, together 326.09 > R. (turret first) the reactor takes its whole 155.676 kg/s, the
// turret the remaining 44.324 kg/s (not its whole ask, as the list alone would give); (none) the same: containment
// first, the rest to the turret; (control) the turret alone takes its whole 170.414 kg/s. Gains in the step q dt / m:
// the reactor cell cellMass.reactor 150 000 kg, the turret cell structure.cellMass + turret.machineryMass = 4975 kg.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const Q = [32.5, 25], C = { reactor: [20, 15], turret: [45, 25] };

export default {
  id: 'L2.repair.containment',
  level: 'L2',
  laws: ['reactor containment first: a damaged reactor\'s cells take the repair budget before the repair order\'s list or its proportional share, whatever the order says; the rest is shared as before (#37, 13n.8)'],
  dependsOn: ['L2.repair.shared.v2'],
  setup: 'T1: R1 (buildShip: routed, reactors at full demand); its reactor cell 0 and turret cell 0 at half integrity; the repair order [turret] or none; a control with only the turret damaged and [turret]; one step (13n.8 J4)',
  measure: 'the quarters\' budget; the reactor\'s and the turret\'s cell 0 integrity gain in the step',
  tolerance: '1e-9 relative',
  criterion: '(turret first) and (none): the reactor\'s gain R g_r dt / m_r (its whole ask), the turret\'s (R - R g_r) dt / m_t (what is left); (control) the turret\'s whole ask R g_t dt / m_t; R = repair.massRate (kernel-read: the quarters fully powered); no other cell changes',
  tunable: ['repair.massRate', 'repair.radius', 'cellMass.reactor', 'structure.cellMass', 'turret.machineryMass'],
  locked: { date: '2026-10-24', hash: '4e598892' },
  cases() {
    return [{ name: 'turret first', order: ['turret'], hurt: ['reactor', 'turret'] }, { name: 'none', order: null, hurt: ['reactor', 'turret'] }, { name: 'control', order: ['turret'], hurt: ['turret'] }];
  },
  expected(ctx, c) {
    const p = ctx.params, R = p.repair.massRate.value, rad = p.repair.radius.value, g = (id) => 1 / (1 + ((C[id][0] - Q[0]) ** 2 + (C[id][1] - Q[1]) ** 2) / (rad * rad));
    const m = { reactor: p.cellMass.reactor.value, turret: p.structure.cellMass.value + p.turret.machineryMass.value };
    const q = c.name === 'control' ? { reactor: 0, turret: R * g('turret') } : { reactor: R * g('reactor'), turret: R - R * g('reactor') };
    return { R, q, gain: { reactor: (q.reactor * ctx.dt) / m.reactor, turret: (q.turret * ctx.dt) / m.turret }, literal: { reactor: 155.676, turret: c.name === 'control' ? 170.414 : 44.324 } };
  },
  run(ctx, c) {
    const { world, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { setup: (w, r) => { for (const id of c.hurt) damageCell(w, r(id), 0, 0.5, 'case', 'kinetic'); } });
    world.repairOrder = c.order;
    const ids = ['reactor', 'turret'], before = Object.fromEntries(ids.map((id) => [id, room(id).cells[0].integrity]));
    step(world);
    const q = room('quarters');
    return {
      budget: q.quarters.budget, power: q.powerFraction, before,
      gain: Object.fromEntries(ids.map((id) => [id, room(id).cells[0].integrity - before[id]])),
      others: world.rooms.every((r) => ids.includes(r.id) || r.cells.every((x) => x.integrity === 1)),
    };
  },
  compare(e, a, c) {
    const rel = (x, y) => (y === 0 ? x === 0 : Math.abs(x - y) <= 1e-9 * Math.abs(y));
    const checks = {
      'the budget is repair.massRate (fully powered, kernel-read)': a.power === 1 && rel(a.budget, e.R),
      'the reactor\'s gain (1e-9)': rel(a.gain.reactor, e.gain.reactor),
      'the turret\'s gain (1e-9)': rel(a.gain.turret, e.gain.turret),
      'the hand-worked grants (kg/s, 1e-5 relative: printed to 3 decimals)': (c.name === 'control' || Math.abs(e.q.reactor - e.literal.reactor) <= 1e-5 * e.literal.reactor) && Math.abs(e.q.turret - e.literal.turret) <= 1e-5 * e.literal.turret,
      'no other cell changes': a.others,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `grants reactor ${e.q.reactor.toFixed(3)}, turret ${e.q.turret.toFixed(3)} kg/s; gains ${e.gain.reactor.toExponential(6)}, ${e.gain.turret.toExponential(6)}`, actual: `budget ${a.budget} kg/s (power ${a.power}); gains ${a.gain.reactor.toExponential(6)}, ${a.gain.turret.toExponential(6)}` };
  },
};
