import { buildShip, createBattle, tick, battleEnergy, battleMomentum, battleAngular } from '../../../js/battle.js';
import { contactBurst, empBurst, fireRound, pathAlong, cellAt, step, roundOf } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { momentumOf } from '../../../js/body.js';
import { TARGETS, missileShip } from '../../targets.js';

// Successor of L2.missile.warheads (W7, withdrawn under #296 (3)): every case and check of W7 kept, plus (#296 (3)) a
// missile's body at impact (all of it for HE and EMP, the rest beyond the penetrator) is a stopped projectile of its
// mass at its speed: its momentum goes to the hull's body at the entry point, its kinetic energy is heat in the hit
// cell's room (the round rule's accounting for a stopped round, B4), nothing is booked as spent; and the penetrator is
// flown through the battle's warhead path (R1-M with a penetrator missile), so missile.penetratorMass is the kernel's.
// Battle cases (he, penetrator, emp): an R1-M missile of that warhead, designated on the reactor, unscanned (it flies
// at the silhouette's centre), from -y at 900 m, knowledge on, until it hits. Hand-worked: the body's mass 200 kg (HE,
// EMP) and 200 - 50 = 150 kg (penetrator); its speed at impact sqrt(2 a s) with s the flight from the bay's face to
// R1's -y face, about 900 - 26 (the face ahead of R1-M's centre) - 5 (R1's face below its centre) = 869 m: 228 m/s,
// inside [225, 235] m/s; the whole missile's momentum, 200 x 228 = 46 kN s ("ten M rounds' worth", #296), is what the
// hull takes in the hit step besides thrust and RCS (the penetrator's part by the round rule, the rest by the join),
// checked against the missile's kernel-read velocity (1e-9); the body's heat is its kinetic energy less the hull's gain
// (re-statement: K0 - K1 of the join), within 1e-3 of 1/2 m_b v^2 (the hull's gain is (m_b v)^2 / 2M, about 1e-4 of it
// on 1.4 kt) and the book: nothing spent (battle.spent's mass 0); the energy, momentum and angular momentum books of
// the battle close (1e-9 of their gross) from the start to the step after the hit. Penetrator (the round rule,
// hand-worked): a 50 kg steel rod 4 diameters long has D = cbrt(4 x 50 / (pi x 7850 x 4)) = 0.12655 m, A = 0.012578
// m^2, s0 = 50 v / A = 3975 v; a crewed cell resists r = c sigma = 1545.35 m/s x (14 800 kg / 25 m^2 = 592 kg/m^2) =
// 914 850 kg/(m s), so the rod passes the first crewed cell only above v = 914 850 / 3975 = 230.1 m/s. W7's unit case
// flew it at 232.4 m/s (900 m from rest) and it passed one; the battle's missile meets the hull after about 869 m, at
// about 228 m/s, under 230.1: the battle's penetrator stops in the first bridge cell (0 passed, stopped in entry 0). At
// four times the mass (D x 1.587, A x 2.52, s0 = 6309 v) it would pass above 145 m/s, and its body would be 0 kg.
//
// W7's header, kept:
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
  id: 'L2.missile.warheads.v2',
  level: 'L2',
  laws: ['HE: a contact burst, he.coupling of missile.warheadEnergy entering the hit room, the blast through walls from there (#97, #141, 13d.1)', 'penetrator: the round rule with missile.penetratorMass at the impact speed (#97)', 'EMP: a field of the shield\'s shape after the buffer pays; a powered room whose centre receives emp.scramDose: a reactor SCRAMs, another room shuts down for emp.outageTime (#97, #142, #292)', 'a missile\'s body at impact is a stopped projectile of its mass at its speed: its momentum to the hull\'s body at the entry point, its kinetic energy heat in the hit cell, nothing spent (#296 (3))'],
  dependsOn: ['L0.missile.flight'],
  setup: 'T1: R1 at rest, one step, then at 1.5 dt: an HE contact burst at the bridge from -y; a penetrator down column x = 5; EMP bursts at (27.5, 10) and (55, 15), shields off, and at (27.5, 10) shield on; 400 steps after; an HE, a penetrator and an EMP missile of R1-M from -y at 900 m through the battle\'s warhead path (13n.4 W7, #296 (3))',
  measure: 'HE: world.blasts (each room\'s absorbed energy, the escape); the bridge\'s cells. Penetrator: cells passed, the stopping entry. EMP: the rooms hit and how (scram / outage), the buffer\'s payment, each outage-ended event\'s time. Battle: the warhead event\'s point and the rooms hit; the missile\'s velocity at the hit (kernel-read); the body\'s mass and heat; the target\'s momentum less its external impulse over the hit step; battle.spent; the three books from the start to the step after the hit; the penetrator\'s cells passed and stopping entry',
  tolerance: 'energies 1e-9 relative; counts and sets exact; an outage\'s end one-sided [t, t + dt) with the 1e-9 slack; the hull\'s momentum 1e-9 of the missile\'s; the body\'s heat 1e-3 of 1/2 m_b v^2; the books 1e-9 of their gross',
  criterion: 'HE: the bridge absorbs its whole 5.92 MJ (every cell destroyed), 10 MJ enters (absorbed + escaped = 10 MJ, 1e-9), 10 MJ vented; penetrator: 1 crewed cell passed, stopped in the 2nd; EMP -y: the reactor SCRAMs, the bridge and the shield generator shut down until the step holding 5.025 s, nothing else; bow: the beam bay only; shield on: the buffer pays 2 MJ, nothing hit; battle (emp): the rooms the field rule reaches from the warhead\'s point, a reactor among them SCRAMmed; battle (he, penetrator, emp): a hit of that kind, the body 200 kg (he, emp) or 150 kg (penetrator), the impact speed in [225, 235] m/s, the hull takes the whole missile\'s momentum 200 kg x V in the hit step besides thrust and RCS (1e-9), the body\'s heat within 1e-3 of 1/2 m_b v^2, nothing spent, the three books closed (1e-9); battle (penetrator): the impact speed under 230.1 m/s, no cell passed, stopped in the 1st (the bridge\'s, hand-worked from the round rule)',
  tunable: ['missile.warheadEnergy', 'he.coupling', 'missile.penetratorMass', 'missile.empEnergy', 'emp.radius', 'emp.scramDose', 'emp.outageTime', 'matter.blastPerKg', 'missile.mass', 'missile.acceleration'],
  locked: { date: '2026-10-23', hash: 'ba40f09b' },
  cases() {
    return [{ part: 'he' }, { part: 'penetrator' }, { part: 'emp', at: '-y' }, { part: 'emp', at: 'bow' }, { part: 'emp', at: '-y', shield: true }, { part: 'battle' }, { part: 'battle', warhead: 'he' }, { part: 'battle', warhead: 'penetrator' }];
  },
  expected(ctx, c) {
    if (c.part === 'he') return { bridge: 5.92e6, entered: 10e6, vented: 10e6 };
    if (c.part === 'penetrator') return { passed: 1, stoppedIn: 1 };
    if (c.part === 'battle') return { kind: c.warhead || 'emp', body: c.warhead === 'penetrator' ? 150 : 200, mass: 200, speed: [225, 235], ...(c.warhead === 'penetrator' ? { passSpeed: 914850 / 3975, passed: 0, stoppedIn: 0 } : {}), ...(c.warhead ? {} : { scram: true }) };
    if (c.shield) return { paid: 2e6, hit: [] };
    return c.at === '-y' ? { scram: ['reactor'], outage: ['bridge', 'shield'], end: 1.5 / 60 + 5 } : { scram: [], outage: ['beamBay'], end: 1.5 / 60 + 5 };
  },
  run(ctx, c) {
    if (c.part === 'battle') {
      const b = createBattle({ params: ctx.params, attacker: missileShip('designated', c.warhead || 'emp'), target: TARGETS.R1, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true });
      const sh = b.target.world.ship;
      // The target's momentum less its external impulse that is not a hit's (thrust, RCS): what munitions brought it.
      const Q = () => { const m = momentumOf(sh), l = sh.left || { P: [0, 0] }, r = sh.received || { J: [0, 0], field: [0, 0] }; return [m.P[0] + l.P[0] - (sh.external.J[0] - r.J[0] - r.field[0]), m.P[1] + l.P[1] - (sh.external.J[1] - r.J[1] - r.field[1])]; };
      const books = () => { const e = battleEnergy(b), p = battleMomentum(b), l = battleAngular(b); return { E: e.total, Eg: e.gross, P: [p.P[0] - p.J[0], p.P[1] - p.J[1]], Pg: p.gross, L: l.total, Lg: l.gross }; };
      const B0 = books();
      let x = null, q0 = null;
      while (b.step < 900) {
        const q = Q();
        tick(b);
        x = x || b.missiles[0] || null;
        if (x && x.hit) { q0 = q; break; }
        if (b.missileShots && !b.missiles.length) break;
      }
      const q1 = Q();
      tick(b); // the step after the hit: the books still closed
      const B1 = books(), w = b.target.world, ev = w.log.events.find((e) => e.type === 'warhead');
      const hit = w.log.events.filter((e) => (e.type === 'outage' || e.type === 'scram') && e.cause === (ev && ev.cause)).map((e) => ({ room: e.room, type: e.type }));
      const h = x ? b.hits.find((y) => y.id === x.id) : null;
      return {
        entry: ev ? ev.entry : null, kind: ev ? ev.kind : null, hit, m: x ? x.m : null, V: x ? [...x.v] : null, body: x && x.hit ? x.hit.body : null,
        dQ: q0 ? [q1[0] - q0[0], q1[1] - q0[1]] : null, spent: b.spent.m, B0, B1, passed: h ? h.passed : null, stoppedIn: h ? h.stoppedIn : null,
      };
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
      const v = a.V ? Math.hypot(a.V[0], a.V[1]) : NaN, mv = a.m * v, book = (x, y, g) => Math.abs(x - y) <= 1e-9 * g;
      checks = {
        [`a ${e.kind} warhead hit`]: a.kind === e.kind,
        'the body 200 kg (he, emp) or 150 kg (penetrator), of a 200 kg missile': a.m === e.mass && !!a.body && a.body.m === e.body,
        'the impact speed in [225, 235] m/s (hand-worked)': v >= e.speed[0] && v <= e.speed[1],
        'the hull takes the whole missile\'s momentum m V in the hit step, besides thrust and RCS (1e-9)': !!a.dQ && Math.hypot(a.dQ[0] - a.m * a.V[0], a.dQ[1] - a.m * a.V[1]) <= 1e-9 * mv,
        'the body\'s heat within 1e-3 of 1/2 m_b v^2, not above it': !!a.body && a.body.heat <= 0.5 * a.body.m * v * v && a.body.heat >= (1 - 1e-3) * 0.5 * a.body.m * v * v,
        'nothing booked as spent': a.spent === 0,
        'the energy book closed (1e-9 of its gross)': book(a.B0.E, a.B1.E, Math.max(a.B0.Eg, a.B1.Eg)),
        'the momentum book closed (1e-9 of its gross)': book(a.B0.P[0], a.B1.P[0], Math.max(a.B0.Pg, a.B1.Pg)) && book(a.B0.P[1], a.B1.P[1], Math.max(a.B0.Pg, a.B1.Pg)),
        'the angular book closed (1e-9 of its gross)': book(a.B0.L, a.B1.L, Math.max(a.B0.Lg, a.B1.Lg)),
      };
      if (e.kind === 'emp') {
        const want = a.entry ? reached(a.entry) : null, got = a.hit.map((h) => h.room).sort();
        checks['the rooms the field reaches from its point (re-statement, the point kernel-read)'] = !!want && JSON.stringify(want) === JSON.stringify(got);
        checks['a reactor SCRAMmed'] = a.hit.some((h) => h.room === 'reactor' && h.type === 'scram');
      }
      if (e.kind === 'penetrator') checks['the penetrator (the battle\'s, missile.penetratorMass) under 230.1 m/s: no cell passed, stopped in the 1st'] = v < e.passSpeed && a.passed === e.passed && a.stoppedIn === e.stoppedIn;
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
