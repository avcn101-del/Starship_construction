import { createBattle, tick } from '../../../js/battle.js';
import { damageCell } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// L5e1 J11 (DESIGN.md 13n.8, §17 item 50, #309 (3)): the successor of L4.orders.repair, its three cases kept, with
// the two the checker found missing: (fallback) the order of the rooms a list does not name (the ship's room order:
// R1's beam bay, fourth of its rooms, before its turret, seventh) and (invalid) the slot's validation ('none' or a list
// of room types; any other value throws when the orders are built, so a misspelt slot is never read as 'none').
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
// (fallback) the turret, bridge and beam bay cells 0 at half integrity, the list ['bridge']: the bridge takes its whole
// ask 178.88 kg/s, then the unlisted rooms in the ship's order: the beam bay (its centre (50, 15) m, r = sqrt(406.25) =
// 20.156 m, g = 1 / (1 + 406.25 / 900) = 0.688995, ask 137.80 kg/s) the remaining 21.12 kg/s, the turret nothing; the
// beam bay cell's mass structure.cellMass + beambay.machineryMass = 3000 + 2500 = 5500 kg. (invalid) repair 'nonsense'
// and ['nonsense']: createBattle throws, naming the slot.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const QUARTERS = [32.5, 25], ROOMS = { turret: [45, 25], bridge: [30, 15], beamBay: [50, 15] };

export default {
  id: 'L4.orders.repair.v2',
  level: 'L4',
  laws: ['repair priority \'none\' shares a quarters\' budget in proportion; a room-type list grants it whole-cell in that order, the rooms it does not name after it in the ship\'s room order; any other value is refused (#307, §17 item 50)'],
  dependsOn: ['L4.orders.energy'],
  setup: 'T1: createBattle, knowledge on; R1 (a helm, weapons held, throttle 0) 900 m from a static R1d; its turret cell 0 and bridge cell 0 at half integrity; repair priority none, [turret] or [bridge]; the beam bay cell 0 too with [bridge] (fallback); repair \'nonsense\' and [\'nonsense\'] (invalid); one step (13n.4 H19; 13n.8 J11)',
  measure: 'the quarters\' budget; each damaged cell\'s integrity gain in the first step; whether createBattle throws',
  tolerance: '1e-9 relative',
  criterion: '\'none\': the gains q dt / m with q = R g / sum g (proportional); [turret]: the turret\'s whole ask R g_t, the bridge R (1 - g_t); [bridge]: the bridge\'s whole ask R g_b, the turret R (1 - g_b); R = repair.massRate (the quarters fully powered, kernel-read); (fallback) the bridge R g_b, the beam bay R (1 - g_b), the turret 0; (invalid) both throw',
  tunable: ['repair.massRate', 'repair.radius', 'turret.machineryMass', 'cellMass.crewed', 'structure.cellMass', 'beambay.machineryMass'],
  locked: null,
  cases() {
    return [{ repair: 'none' }, { repair: ['turret'] }, { repair: ['bridge'] }, { name: 'fallback', repair: ['bridge'] }, { name: 'invalid', repair: 'nonsense' }, { name: 'invalid', repair: ['nonsense'] }];
  },
  expected(ctx, c) {
    if (c.name === 'invalid') return { throws: true };
    const p = ctx.params, R = p.repair.massRate.value, rad = p.repair.radius.value;
    const g = (id) => 1 / (1 + (Math.hypot(ROOMS[id][0] - QUARTERS[0], ROOMS[id][1] - QUARTERS[1]) / rad) ** 2);
    const ask = { turret: R * g('turret'), bridge: R * g('bridge') }, sum = ask.turret + ask.bridge;
    if (c.name === 'fallback') {
      const q = { bridge: ask.bridge, beamBay: Math.min(R * g('beamBay'), R - ask.bridge), turret: 0 };
      const m = { bridge: p.cellMass.crewed.value, beamBay: p.structure.cellMass.value + p.beambay.machineryMass.value, turret: p.structure.cellMass.value + p.turret.machineryMass.value };
      return { R, ask: { ...ask, beamBay: R * g('beamBay') }, q, gain: { bridge: (q.bridge * ctx.dt) / m.bridge, beamBay: (q.beamBay * ctx.dt) / m.beamBay, turret: 0 } };
    }
    let q;
    if (c.repair === 'none') q = { turret: (ask.turret * R) / sum, bridge: (ask.bridge * R) / sum };
    else { const first = c.repair[0], other = first === 'turret' ? 'bridge' : 'turret'; q = { [first]: ask[first], [other]: R - ask[first] }; }
    const m = { turret: p.structure.cellMass.value + p.turret.machineryMass.value, bridge: p.cellMass.crewed.value };
    return { R, ask, q, gain: { turret: (q.turret * ctx.dt) / m.turret, bridge: (q.bridge * ctx.dt) / m.bridge } };
  },
  run(ctx, c) {
    const orders = { range: 'hold', position: 'flank', facing: 'bow', dodging: 'off', heat: { threshold: 0, response: 'weapons' }, throttle: 0, repair: c.repair };
    const hurt = c.name === 'fallback' ? ['turret', 'bridge', 'beamBay'] : ['turret', 'bridge'];
    let b;
    try {
      b = createBattle({
        params: ctx.params, tier: 'T1', attacker: TARGETS.R1, target: TARGETS.R1d, bearing: '-y', knowledge: true, orders: { A: orders },
        setup: { attacker: (w, room) => { for (const id of hurt) damageCell(w, room(id), 0, 0.5, 'case', 'kinetic'); } },
      });
    } catch (e) { return { threw: String(e.message) }; }
    if (c.name === 'invalid') return { threw: null };
    const A = b.attacker, quarters = A.room('quarters'), rooms = hurt.map((id) => A.room(id));
    const before = Object.fromEntries(rooms.map((r) => [r.id, r.cells[0].integrity]));
    tick(b);
    return {
      before, budget: quarters.quarters.budget, power: A.world.power ? quarters.powerFraction : 1,
      gain: Object.fromEntries(rooms.map((r) => [r.id, r.cells[0].integrity - before[r.id]])),
      others: A.world.rooms.every((r) => rooms.includes(r) || r.cells.every((x) => x.integrity === 1)),
    };
  },
  compare(e, a, c) {
    if (c.name === 'invalid') {
      const pass = typeof a.threw === 'string' && /repair priority/.test(a.threw);
      return { pass, note: pass ? '' : 'createBattle did not throw on the slot' };
    }
    const rel = (x, y) => (y === 0 ? x === 0 : Math.abs(x - y) <= 1e-9 * Math.abs(y));
    if (c.name === 'fallback') {
      const checks = {
        'the three cells at half integrity at undock': Object.values(a.before).every((x) => x === 0.5),
        'the budget is repair.massRate (fully powered, kernel-read)': a.power === 1 && rel(a.budget, e.R),
        'the bridge\'s whole ask (1e-9)': rel(a.gain.bridge, e.gain.bridge),
        'the beam bay (first unlisted in the ship\'s order) the rest (1e-9)': rel(a.gain.beamBay, e.gain.beamBay),
        'the turret (later in the ship\'s order) nothing': a.gain.turret === 0,
        'no other cell damaged': a.others,
      };
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
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
    if (r.case.name === 'invalid') return { expected: 'createBattle throws on the repair slot', actual: a.threw === null ? 'no throw' : `threw: ${a.threw}` };
    if (r.case.name === 'fallback') return { expected: `grants bridge ${e.q.bridge.toFixed(3)}, beam bay ${e.q.beamBay.toFixed(3)}, turret 0 kg/s; gains ${e.gain.bridge.toExponential(6)}, ${e.gain.beamBay.toExponential(6)}, 0`, actual: `budget ${a.budget} kg/s; gains ${a.gain.bridge.toExponential(6)}, ${a.gain.beamBay.toExponential(6)}, ${a.gain.turret}` };
    return { expected: `R ${e.R} kg/s; grants turret ${e.q.turret.toFixed(3)}, bridge ${e.q.bridge.toFixed(3)} kg/s; gains ${e.gain.turret.toExponential(6)}, ${e.gain.bridge.toExponential(6)}`, actual: `budget ${a.budget} kg/s (power fraction ${a.power}); gains ${a.gain.turret.toExponential(6)}, ${a.gain.bridge.toExponential(6)}` };
  },
};
