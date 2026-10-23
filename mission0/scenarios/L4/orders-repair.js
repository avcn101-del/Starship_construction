import { createBattle, tick } from '../../../js/battle.js';
import { damageCell } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// H19 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #307): repair priority. A quarters' budget R = repair.massRate x its
// surviving fraction x its power fraction (kg/s); each damaged cell j in reach asks q_j = R g(r_j), g(r) = 1 / (1 +
// (r / repair.radius)^2), r from the quarters' centre to the cell's room's centre; a grant of q kg/s restores q / the
// cell's mass of integrity per second. When the asks exceed R: with repair priority 'none' (the presets' default) each
// is scaled by R / sum q_j (proportional, as before #307); with a room-type list the cells are granted whole, the
// listed rooms' first in the list's order, the rest after, until R is spent.
//
// Setup (T1): createBattle with knowledge on; R1 (A, a helm: range hold, position flank, facing bow, weapons held by
// heat discipline 0, throttle 0) 900 m from a static R1d on its -y side; at undock R1's turret cell 0 and bridge cell 0
// each lose half their integrity (a case's input: damageCell, loss 0.5); repair priority 'none', ['turret'] or
// ['bridge']; one step.
// Hand-worked (R1's grid, m: the quarters' centre (32.5, 25), the turret's (45, 25), the bridge's (30, 15)): r = 12.5 m
// and sqrt(106.25) = 10.308 m, g = 1 / (1 + 12.5^2 / 900) = 0.852071 and 1 / (1 + 106.25 / 900) = 0.894410; R = 200
// kg/s (a whole quarters, fully powered: its power fraction kernel-read, labelled); the asks 170.41 and 178.88 kg/s
// exceed R. 'none': each x R / (q_t + q_b): 97.58 and 102.42 kg/s; ['turret']: the turret's whole ask, 170.41, the
// bridge the remaining 29.59; ['bridge']: 178.88, the turret 21.12. Cell masses: the turret structure.cellMass +
// turret.machineryMass = 3000 + 1975 = 4975 kg, the bridge cellMass.crewed = 14 800 kg; so the first step's integrity
// gain is q dt / m for each (1e-9 relative).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const QUARTERS = [32.5, 25], ROOMS = { turret: [45, 25], bridge: [30, 15] };

export default {
  id: 'L4.orders.repair',
  level: 'L4',
  laws: ['repair priority \'none\' shares a quarters\' budget in proportion; a room-type list grants it whole-cell in that order (#307)'],
  dependsOn: ['L4.orders.energy'],
  setup: 'T1: createBattle, knowledge on; R1 (a helm, weapons held, throttle 0) 900 m from a static R1d; its turret cell 0 and bridge cell 0 at half integrity; repair priority none, [turret] or [bridge]; one step (13n.4 H19)',
  measure: 'the quarters\' budget; each damaged cell\'s integrity gain in the first step',
  tolerance: '1e-9 relative',
  criterion: '\'none\': the gains q dt / m with q = R g / sum g (proportional); [turret]: the turret\'s whole ask R g_t, the bridge R (1 - g_t); [bridge]: the bridge\'s whole ask R g_b, the turret R (1 - g_b); R = repair.massRate (the quarters fully powered, kernel-read)',
  tunable: ['repair.massRate', 'repair.radius', 'turret.machineryMass', 'cellMass.crewed', 'structure.cellMass'],
  locked: null,
  cases() {
    return [{ repair: 'none' }, { repair: ['turret'] }, { repair: ['bridge'] }];
  },
  expected(ctx, c) {
    const p = ctx.params, R = p.repair.massRate.value, rad = p.repair.radius.value;
    const g = (id) => 1 / (1 + (Math.hypot(ROOMS[id][0] - QUARTERS[0], ROOMS[id][1] - QUARTERS[1]) / rad) ** 2);
    const ask = { turret: R * g('turret'), bridge: R * g('bridge') }, sum = ask.turret + ask.bridge;
    let q;
    if (c.repair === 'none') q = { turret: (ask.turret * R) / sum, bridge: (ask.bridge * R) / sum };
    else { const first = c.repair[0], other = first === 'turret' ? 'bridge' : 'turret'; q = { [first]: ask[first], [other]: R - ask[first] }; }
    const m = { turret: p.structure.cellMass.value + p.turret.machineryMass.value, bridge: p.cellMass.crewed.value };
    return { R, ask, q, gain: { turret: (q.turret * ctx.dt) / m.turret, bridge: (q.bridge * ctx.dt) / m.bridge } };
  },
  run(ctx, c) {
    const orders = { range: 'hold', position: 'flank', facing: 'bow', dodging: 'off', heat: { threshold: 0, response: 'weapons' }, throttle: 0, repair: c.repair };
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: TARGETS.R1, target: TARGETS.R1d, bearing: '-y', knowledge: true, orders: { A: orders },
      setup: { attacker: (w, room) => { damageCell(w, room('turret'), 0, 0.5, 'case', 'kinetic'); damageCell(w, room('bridge'), 0, 0.5, 'case', 'kinetic'); } },
    });
    const A = b.attacker, turret = A.room('turret'), bridge = A.room('bridge'), quarters = A.room('quarters');
    const before = { turret: turret.cells[0].integrity, bridge: bridge.cells[0].integrity };
    tick(b);
    return {
      before, budget: quarters.quarters.budget, power: A.world.power ? quarters.powerFraction : 1,
      gain: { turret: turret.cells[0].integrity - before.turret, bridge: bridge.cells[0].integrity - before.bridge },
      others: A.world.rooms.every((r) => r === turret || r === bridge || r.cells.every((x) => x.integrity === 1)),
    };
  },
  compare(e, a) {
    const rel = (x, y) => Math.abs(x - y) <= 1e-9 * Math.abs(y);
    const checks = {
      'both cells at half integrity at undock': a.before.turret === 0.5 && a.before.bridge === 0.5,
      'the budget is repair.massRate (fully powered, kernel-read)': a.power === 1 && rel(a.budget, e.R),
      'the turret cell\'s gain (1e-9)': rel(a.gain.turret, e.gain.turret),
      'the bridge cell\'s gain (1e-9)': rel(a.gain.bridge, e.gain.bridge),
      'no other cell damaged': a.others,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `R ${e.R} kg/s; grants turret ${e.q.turret.toFixed(3)}, bridge ${e.q.bridge.toFixed(3)} kg/s; gains ${e.gain.turret.toExponential(6)}, ${e.gain.bridge.toExponential(6)}`, actual: `budget ${a.budget} kg/s (power fraction ${a.power}); gains ${a.gain.turret.toExponential(6)}, ${a.gain.bridge.toExponential(6)}` };
  },
};
