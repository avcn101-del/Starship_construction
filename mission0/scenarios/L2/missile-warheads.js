import { buildShip, createBattle, tick } from '../../../js/battle.js';
import { contactBurst, empBurst, fireRound, pathAlong, cellAt, step, roundOf } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { TARGETS, missileShip } from '../../targets.js';

// W7 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #97, #141, #292): a missile's warhead acts at the hit by a channel the
// kernel has. HE: a contact burst of missile.warheadEnergy, he.coupling of it entering the hit cell's room and the
// blast through walls from there (13d.1). Penetrator: the round rule with missile.penetratorMass at the impact speed.
// EMP (#292, a section, not the ship): a field of the shield's shape (budget missile.empEnergy, radius emp.radius) from
// the hit point after any charged buffer there pays; every powered room whose centre receives emp.scramDose: a reactor
// SCRAMs, another room shuts down for emp.outageTime.
//
// Setup (T1): R1 by buildShip at rest (origin [0, 0], heading 0; its shield off, reactor at full demand, routed), one
// step, then at t = 1.5 dt (within the second step, off the grid): (he) contactBurst at the bridge's cell (5, 2) from -y;
// (penetrator) fireRound of 50 kg of steel (4 diameters long) at 232.379 m/s along column x = 5 from -y (the bridge's
// (5, 2), (5, 3), the quarters' (5, 4), (5, 5)); (emp -y) empBurst at R1's -y face at the silhouette's centre column,
// grid (27.5, 10) m (the bridge's face, beside the reactor: where an unscanned missile from -y lands, 13n.1 (c)); (emp
// bow) at the bow face's centre (55, 15); (emp shield) at (27.5, 10) with the shield on (its buffer charged), then 400
// steps; (battle) an EMP missile of R1-M from -y at 900 m, knowledge on, unscanned (it flies at the silhouette's centre).
// Hand-worked: HE: 0.5 x 20 MJ = 10 MJ enters the bridge, whose capacity is 4 cells x 100 J/kg x 14 800 kg = 5.92 MJ:
// it fills (every cell destroyed), the rest 4.08 MJ passes on through its walls; vented 10 MJ; absorbed + escaped = 10
// MJ. Penetrator: s0 = 50 x 232.379 / A (A of a 50 kg steel rod) = 0.59 x the M round's, it passes 1 crewed cell and
// stops in the 2nd (the round rule; the L5 estimate's (4) is the source of the case, the count re-derived by hand). EMP
// (room centres in grid m: reactor (20, 15), bridge (30, 15), shield (20, 5), engine (7.5, 15), magazine (40, 15), beam
// bay (50, 15), heat sink (20, 25), quarters (32.5, 25), turret (45, 25), hold (40, 5)); dose 2 MJ / (1 + (r / 20)^2),
// reach 20 sqrt(2 / 1.47 - 1) = 12.009 m: from (27.5, 10) the reactor 1.662 (SCRAM), the bridge 1.855, the shield
// generator 1.662 (outage), the quarters 1.231, the engine 0.970, the turret 0.859 (none); from (55, 15) the beam bay
// 1.882 (outage), the turret 1.333 (none); each outage ends at the step holding 1.5 dt + 5 s = 5.025 s (one-sided).
// Shield on: the buffer (10 MJ x its generator's g at (27.5, 10), 9.01 m from (20, 5), g = 0.952 with shield.radius 40)
// takes the whole 2 MJ: nothing is hit. Battle: the warhead's hit point is kernel-read (labelled); the rooms hit are
// those the field rule gives there (re-statement with the hand-worked constants).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const CENTRES = { reactor: [20, 15], bridge: [30, 15], shield: [20, 5], engine: [7.5, 15], magazine: [40, 15], beamBay: [50, 15], heatSink: [20, 25], quarters: [32.5, 25], turret: [45, 25], hold: [40, 5] };
const POWERED = ['reactor', 'bridge', 'shield', 'engine', 'beamBay', 'quarters', 'turret'];
const dose = (p, c) => 2e6 / (1 + ((Math.hypot(c[0] - p[0], c[1] - p[1]) / 20) ** 2));
const reached = (p) => POWERED.filter((id) => dose(p, CENTRES[id]) >= 1.47e6).sort();

export default {
  id: 'L2.missile.warheads',
  level: 'L2',
  laws: ['HE: a contact burst, he.coupling of missile.warheadEnergy entering the hit room, the blast through walls from there (#97, #141, 13d.1)', 'penetrator: the round rule with missile.penetratorMass at the impact speed (#97)', 'EMP: a field of the shield\'s shape after the buffer pays; a powered room whose centre receives emp.scramDose: a reactor SCRAMs, another room shuts down for emp.outageTime (#97, #142, #292)'],
  dependsOn: ['L0.missile.flight'],
  setup: 'T1: R1 at rest, one step, then at 1.5 dt: an HE contact burst at the bridge from -y; a penetrator down column x = 5; EMP bursts at (27.5, 10) and (55, 15), shields off, and at (27.5, 10) shield on; 400 steps after; an EMP missile of R1-M from -y at 900 m (13n.4 W7)',
  measure: 'HE: world.blasts (each room\'s absorbed energy, the escape); the bridge\'s cells. Penetrator: cells passed, the stopping entry. EMP: the rooms hit and how (scram / outage), the buffer\'s payment, each outage-ended event\'s time. Battle: the warhead event\'s point and the rooms hit',
  tolerance: 'energies 1e-9 relative; counts and sets exact; an outage\'s end one-sided [t, t + dt) with the 1e-9 slack',
  criterion: 'HE: the bridge absorbs its whole 5.92 MJ (every cell destroyed), 10 MJ enters (absorbed + escaped = 10 MJ, 1e-9), 10 MJ vented; penetrator: 1 crewed cell passed, stopped in the 2nd; EMP -y: the reactor SCRAMs, the bridge and the shield generator shut down until the step holding 5.025 s, nothing else; bow: the beam bay only; shield on: the buffer pays 2 MJ, nothing hit; battle: the rooms the field rule reaches from the warhead\'s point, a reactor among them SCRAMmed',
  tunable: ['missile.warheadEnergy', 'he.coupling', 'missile.penetratorMass', 'missile.empEnergy', 'emp.radius', 'emp.scramDose', 'emp.outageTime', 'matter.blastPerKg'],
  locked: null,
  cases() {
    return [{ part: 'he' }, { part: 'penetrator' }, { part: 'emp', at: '-y' }, { part: 'emp', at: 'bow' }, { part: 'emp', at: '-y', shield: true }, { part: 'battle' }];
  },
  expected(ctx, c) {
    if (c.part === 'he') return { bridge: 5.92e6, entered: 10e6, vented: 10e6 };
    if (c.part === 'penetrator') return { passed: 1, stoppedIn: 1 };
    if (c.part === 'battle') return { scram: true };
    if (c.shield) return { paid: 2e6, hit: [] };
    return c.at === '-y' ? { scram: ['reactor'], outage: ['bridge', 'shield'], end: 1.5 / 60 + 5 } : { scram: [], outage: ['beamBay'], end: 1.5 / 60 + 5 };
  },
  run(ctx, c) {
    if (c.part === 'battle') {
      const b = createBattle({ params: ctx.params, attacker: missileShip('designated', 'emp'), target: TARGETS.R1, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true });
      while (b.step < 900 && !b.missiles.some((x) => x.hit) && !(b.missileShots && !b.missiles.length)) tick(b);
      const w = b.target.world, ev = w.log.events.find((e) => e.type === 'warhead');
      const hit = w.log.events.filter((e) => (e.type === 'outage' || e.type === 'scram') && e.cause === (ev && ev.cause)).map((e) => ({ room: e.room, type: e.type }));
      return { entry: ev ? ev.entry : null, kind: ev ? ev.kind : null, hit };
    }
    const { world: w, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { origin: [0, 0] });
    if (c.shield) room('shield').shield.on = true;
    step(w);
    const t = w.t + 0.5 * w.dt;
    if (c.part === 'he') {
      const at = cellAt(w, [5, 2]), r = contactBurst(w, { room: at.room, cell: at.index, chord: 1 }, 2e7, 'missile-1');
      const bl = w.blasts[0], absorbed = Object.values(bl.absorbed).reduce((x, y) => x + y, 0);
      return { r, bridge: bl.absorbed.bridge, absorbed, escaped: bl.escaped, bridgeCells: room('bridge').cells.filter((x) => x.destroyed).length };
    }
    if (c.part === 'penetrator') {
      const m = 50, v = Math.sqrt(2 * 900 * 30), { A } = roundGeometry(m, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
      const res = fireRound(w, { mass: m, velocity: v, area: A, direction: [0, 1] }, pathAlong(w, [[5, 2], [5, 3], [5, 4], [5, 5]]), 'missile-1');
      return { passed: res.passed, stoppedIn: res.stoppedIn, s0ratio: res.s0 / (roundOf(w, 'M').m * roundOf(w, 'M').v / roundOf(w, 'M').A) };
    }
    const r = empBurst(w, c.at === '-y' ? [27.5, 10] : [55, 15], 2e6, 'missile-1', t);
    for (let i = 0; i < 400; i++) step(w);
    const ends = w.log.events.filter((e) => e.type === 'outage-ended').map((e) => ({ room: e.room, t: e.t }));
    return { paid: r.paid, hit: r.hit.map((h) => ({ room: h.room, effect: h.effect, dose: h.dose })), ends };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), 1);
    let checks;
    if (c.part === 'he') checks = { 'the bridge absorbs its 5.92 MJ (1e-9)': close(e.bridge, a.bridge, 1e-9), 'every bridge cell destroyed': a.bridgeCells === 4, '10 MJ enters: absorbed + escaped (1e-9)': close(e.entered, a.r.entered, 1e-9) && close(e.entered, a.absorbed + a.escaped, 1e-9), '10 MJ vented (1e-9)': close(e.vented, a.r.vented, 1e-9) };
    else if (c.part === 'penetrator') checks = { 'passes 1 crewed cell, stops in the 2nd': a.passed === e.passed && a.stoppedIn === e.stoppedIn };
    else if (c.part === 'battle') {
      const want = a.entry ? reached(a.entry) : null, got = a.hit.map((h) => h.room).sort();
      checks = { 'an EMP warhead hit': a.kind === 'emp', 'the rooms the field reaches from its point (re-statement, the point kernel-read)': want && JSON.stringify(want) === JSON.stringify(got), 'a reactor SCRAMmed': a.hit.some((h) => h.room === 'reactor' && h.type === 'scram') };
    } else if (c.shield) checks = { 'the buffer pays 2 MJ (1e-12)': close(e.paid, a.paid, 1e-12), 'nothing hit': a.hit.length === 0 };
    else {
      const sc = a.hit.filter((h) => h.effect === 'scram').map((h) => h.room).sort(), out = a.hit.filter((h) => h.effect === 'outage').map((h) => h.room).sort();
      checks = {
        'SCRAMmed (hand-worked)': JSON.stringify(sc) === JSON.stringify(e.scram),
        'shut down, nothing else (hand-worked)': JSON.stringify(out) === JSON.stringify(e.outage),
        'each dose E g(r) at the hand-worked centre (1e-12)': a.hit.every((h) => close(dose(c.at === '-y' ? [27.5, 10] : [55, 15], CENTRES[h.room]), h.dose, 1e-12)),
        'each outage ends one-sided at 5.025 s': a.ends.length === out.length && a.ends.every((x) => x.t >= e.end * (1 - 1e-9) && x.t < (e.end + 1 / 60) * (1 + 1e-9)),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
