import { createBattle, tick } from '../../../js/battle.js';
import { TARGETS, missileShip } from '../../targets.js';

// H9 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c) (d), #252, #292): the EMP route. An EMP warhead on a ship with its
// shield down SCRAMs the reactors in its reach (60 s to restart > 10 s: Disabled, a capture) and shuts the other
// powered rooms in reach for emp.outageTime (5 s); a charged buffer at the burst point pays first; the scan is the
// prerequisite (the designated seeker flies at a room its model knows).
//
// Setup (T1): createBattle with knowledge on; R1-M (its missile bay and magazine loaded with designated EMP missiles,
// the antenna on its hold) against a static R1 (heading 0, at rest) at 900 m; the plan (a test input) launches one
// missile designated on a room, and R1-M's antenna scans the zone holding that room's first cell from t = 0 (it
// resolves before the missile arrives); until the end or 20 s. Cases: (reactor) from -y on the bridge (zone 1): the
// missile enters the bridge's -y face near (27.5, 10) (R1 grid m), under the reactor's flank; (reactor-shield) the
// same with R1's shield on; (bow) from +x on the turret (zone 5): it enters the turret's +x face near (50, 22.5);
// (stern) from -x on the engine (zone 0), R1's engine at throttle 1 from t = 7 s (a case's input, so the missile's
// approach is a static ship's): it enters the stern face near (0, 15).
// Hand-worked (the field of #99's shape, R = emp.radius 20 m, E = missile.empEnergy 2 MJ, D = emp.scramDose 1.47 MJ:
// a powered room is hit when E / (1 + (r / R)^2) >= D, r from its centre to the burst point, which is kernel-read and
// labelled): R1's powered rooms and their centres (grid m) — reactor (20, 15), bridge (30, 15), shield generator (20,
// 5), quarters (32.5, 25), turret (45, 25), beam bay (50, 15), engine (7.5, 15); holds, magazines and heat sinks are
// immune. At (27.5, 10): the reactor (9.0 m, 1.66 MJ), the bridge (5.6 m, 1.85) and the shield generator (9.0 m, 1.66);
// at (50, 22.5): the turret (5.6 m, 1.85) and the beam bay (7.5 m, 1.75); at (0, 15): the engine (7.5 m, 1.75). The
// effects: a reactor SCRAMs (then no weapon has power: Disabled 10 s after the burst's step, a capture, nothing
// destroyed), every other room hit has an outage ending at the first step boundary at or after burst + 5 s (one-sided);
// the bow burst ends nothing in 15 s after it; the stern burst stops the engine's thrust for the outage and it comes
// back after; behind R1's charged buffer (10 MJ at g >= 0.53 anywhere on R1) the buffer pays all 2 MJ and nothing is hit.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const CENTRES = { reactor: [20, 15], bridge: [30, 15], shield: [20, 5], quarters: [32.5, 25], turret: [45, 25], beamBay: [50, 15], engine: [7.5, 15] };

export default {
  id: 'L4.route.emp',
  level: 'L4',
  laws: ['an EMP warhead SCRAMs the reactors in its reach (Disabled, a capture) and shuts the other powered rooms in reach for emp.outageTime; a charged buffer pays first (#252, #292, 13n.1 (d))'],
  dependsOn: ['L4.route.surrender'],
  setup: 'T1: createBattle, knowledge on; R1-M (designated EMP missiles, antenna) against a static R1 at 900 m; the plan launches one missile designated on the bridge (-y), the turret (+x) or the engine (-x), the antenna scanning its zone from t = 0; R1\'s shield off, or on (reactor-shield); the engine at throttle 1 from 7 s (stern); to the end or 20 s (13n.4 H9)',
  measure: 'the burst point (kernel-read); the rooms hit (scram / outage events) against the field\'s doses recomputed from the hand-worked centres; the end; the outage\'s end; the engine\'s thrust',
  tolerance: 'doses 1e-9 relative; steps exact; the outage one-sided [t + 5, t + 5 + dt)',
  criterion: 'the rooms hit are exactly those with E / (1 + (r / R)^2) >= D: (reactor) reactor, bridge, shield, Disabled 600 steps after the burst\'s step, a capture; (reactor-shield) none (the charged buffer pays first), no end; (bow) turret and beam bay, their outages ending one-sided at +5 s, no end; (stern) the engine, thrust 0 through the outage and above 0 after',
  tunable: ['missile.empEnergy', 'emp.radius', 'emp.scramDose', 'emp.outageTime', 'battle.disabledSeconds'],
  locked: null,
  cases() {
    return [
      { name: 'reactor', bearing: '-y', room: 'bridge', zone: 1 },
      { name: 'reactor-shield', bearing: '-y', room: 'bridge', zone: 1, shield: true },
      { name: 'bow', bearing: '+x', room: 'turret', zone: 5 },
      { name: 'stern', bearing: '-x', room: 'engine', zone: 0, thrust: true },
    ];
  },
  expected(ctx, c) {
    const p = ctx.params;
    return { E: p.missile.empEnergy.value, R: p.emp.radius.value, D: p.emp.scramDose.value, out: p.emp.outageTime.value, hits: { reactor: ['bridge', 'reactor', 'shield'], 'reactor-shield': [], bow: ['beamBay', 'turret'], stern: ['engine'] }[c.name] };
  },
  run(ctx, c) {
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: missileShip('designated', 'emp'), target: TARGETS.R1, bearing: c.bearing, knowledge: true,
      plan: { missile: { rooms: [c.room], count: 1 } }, scans: [{ side: 'A', antenna: 0, zone: c.zone, at: 0 }], shield: { target: !!c.shield },
    });
    const T = b.target, w = T.world, engine = w.rooms.find((r) => r.type === 'engine');
    let burst = null, seen = 0, ended = null;
    const thrust = [];
    while (b.step < 1200 && !b.ended) {
      if (c.thrust && b.step === 420) engine.engine.throttle = 1; // the stern case's input: R1 under thrust from t = 7 s, before the missile arrives
      tick(b);
      for (const e of w.log.events.slice(seen)) if (e.type === 'warhead' && !burst) burst = { entry: [...e.entry], step: b.step, t: e.t };
      seen = w.log.events.length;
      if (burst) thrust.push({ step: b.step, thrust: engine.engine.thrust });
      if (b.ended && !ended) ended = b.ended;
      if (burst && b.step > burst.step + 900) break;
    }
    const ev = w.log.events;
    const hit = [...new Set(ev.filter((e) => (e.type === 'scram' || e.type === 'outage') && burst).map((e) => e.room))].sort();
    const outages = ev.filter((e) => e.type === 'outage').map((e) => ({ room: e.room, until: e.until, ended: (ev.find((x) => x.type === 'outage-ended' && x.room === e.room) || {}).t ?? null }));
    const known = b.attacker.model.rooms.has(c.room);
    return { burst, hit, outages, ended: ended ? { kind: ended.kind, side: ended.side, step: ended.step } : null, known, scrams: ev.filter((e) => e.type === 'scram').length, thrust, destroyed: w.rooms.filter((r) => r.exploded).length };
  },
  compare(e, a, c) {
    if (!a.burst) return { pass: false, note: 'no burst' };
    const [x, y] = a.burst.entry;
    const dose = (id) => e.E / (1 + ((Math.hypot(CENTRES[id][0] - x, CENTRES[id][1] - y)) / e.R) ** 2);
    const byField = Object.keys(CENTRES).filter((id) => !c.shield && dose(id) >= e.D).sort();
    const dt = 1 / 60;
    const checks = {
      'the room was known (scanned) before the burst': a.known,
      'the rooms hit are those of the field (recomputed at the kernel-read point)': a.hit.join(',') === byField.join(','),
      'the hand-worked set': a.hit.join(',') === e.hits.join(','),
    };
    if (c.name === 'reactor') {
      checks['the reactor SCRAMs'] = a.scrams === 1;
      checks['Disabled 600 steps after the burst\'s step, side T, a capture'] = a.ended && a.ended.kind === 'disabled' && a.ended.side === 'T' && a.ended.step === a.burst.step + 600 && a.destroyed === 0;
    } else {
      checks['no end'] = a.ended === null;
      checks['every outage ends one-sided at burst + 5 s'] = a.outages.every((o) => o.ended !== null && o.ended >= a.burst.t + e.out - 1e-9 && o.ended < a.burst.t + e.out + dt);
    }
    if (c.name === 'stern') {
      const o = a.outages[0];
      checks['thrust 0 from the step after the burst through the outage, above 0 after'] = !!o && a.thrust.filter((s) => s.step > a.burst.step && s.step * dt <= o.ended - 1e-9).every((s) => s.thrust === 0) && a.thrust.some((s) => s.step * dt > o.ended + 1e-9 && s.thrust > 0);
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `hit ${r.expected.hits.join(', ') || 'nothing'}`, actual: a.burst ? `burst at (${a.burst.entry.map((v) => v.toFixed(2)).join(', ')}) step ${a.burst.step} (kernel-read); hit ${a.hit.join(', ') || 'nothing'}; outages ${a.outages.map((o) => `${o.room} to ${o.ended === null ? '-' : o.ended.toFixed(4)}`).join(', ') || '-'}; end ${a.ended ? `${a.ended.kind} ${a.ended.side} step ${a.ended.step}` : 'none'}` : 'no burst' };
  },
};
