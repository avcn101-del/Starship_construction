import { createBattle, tick } from '../../../js/battle.js';
import { shieldBuffer } from '../../../js/rooms.js';
import { TARGETS, missileShip } from '../../targets.js';

// L5e1 J8 and J11 (DESIGN.md 13n.8, §17 items 48 and 50, #309 (3)): the successor of L4.route.emp.v2, every case and
// check kept but the shielded case's payment: (item 48) the missile's body meets the charged field before the warhead
// acts, as a round of its mass and speed (L2.missile.field pins that rule), so the buffer pays the body's share as well
// as the EMP's E and books both as the generator's heat; (item 50) the generator room's heat is read against a control
// (the same battle with no missile launched): after the generator's next step it holds exactly the booked heat more.
// H9' of the L5 plan (DESIGN.md 13n.4, 13n.1 (c) (d), #252, #292, #306): the EMP route; the successor of
// L4.route.emp (withdrawn under #306): every case and check kept, the bow case's text corrected, the shielded case
// asserting the buffer's payment and the generator's heat. An EMP warhead on a ship with its
// shield down SCRAMs the reactors in its reach (60 s to restart > 10 s: Disabled, a capture) and shuts the other
// powered rooms in reach for emp.outageTime (5 s); a charged buffer at the burst point pays first; the scan is the
// prerequisite (the designated seeker flies at a room its model knows).
//
// Setup (T1): createBattle with knowledge on; R1-M (its missile bay and magazine loaded with designated EMP missiles,
// the antenna on its hold) against a static R1 (heading 0, at rest) at 900 m; the plan (a test input) launches one
// missile designated on a room, and R1-M's antenna scans the zone holding that room's first cell from t = 0 (it
// resolves before the missile arrives); until the end or 20 s. Cases: (reactor) from -y on the bridge (zone 1): the
// missile enters the bridge's -y face near (27.5, 10) (R1 grid m), under the reactor's flank; (reactor-shield) the
// same with R1's shield on; (bow) from +x on the turret (zone 5): its path from the bay's launch point meets the beam
// bay's +x face (x = 55 m) before the turret's, so it bursts there, near the turret's corner (#306 (10), the
// checker's 3);
// (stern) from -x on the engine (zone 0), R1's engine at throttle 1 from t = 7 s (a case's input, so the missile's
// approach is a static ship's): it enters the stern face near (0, 15).
// Hand-worked (the field of #99's shape, R = emp.radius 20 m, E = missile.empEnergy 2 MJ, D = emp.scramDose 1.47 MJ:
// a powered room is hit when E / (1 + (r / R)^2) >= D, r from its centre to the burst point, which is kernel-read and
// labelled): R1's powered rooms and their centres (grid m) — reactor (20, 15), bridge (30, 15), shield generator (20,
// 5), quarters (32.5, 25), turret (45, 25), beam bay (50, 15), engine (7.5, 15); holds, magazines and heat sinks are
// immune. At (27.5, 10): the reactor (9.0 m, 1.66 MJ), the bridge (5.6 m, 1.85) and the shield generator (9.0 m, 1.66);
// on the beam bay's +x face the beam bay and the turret, the turret near the edge of the reach R sqrt(E / D - 1) =
// 12.009 m (a margin of about one per cent: the literal set is marginal, the set recomputed at the kernel-read point is
// the check that holds); at (0, 15): the engine (7.5 m, 1.75). The
// effects: a reactor SCRAMs (then no weapon has power: Disabled 10 s after the burst's step, a capture, nothing
// destroyed), every other room hit has an outage ending at the first step boundary at or after burst + 5 s (one-sided);
// the bow burst ends nothing in 15 s after it; the stern burst stops the engine's thrust for the outage and it comes
// back after; behind R1's charged buffer (10 MJ at g >= 0.53 anywhere on R1) the buffer pays all 2 MJ and nothing is hit:
// the generator's buffer falls by E = 2 MJ on the burst's step and the same 2 MJ is booked as its heat for its next step
// (shield.impulseHeat, as a stopped round's energy), which that step takes in (1e-9 relative). v3 (§17 item 48): the
// body pays first, its share P_b and heat q_b kernel-read from the hit (x.hit.field, labelled; L2.missile.field derives
// them), so the buffer falls by P_b + E and q_b + E is booked; the generator room's heat (room.heat.Q) after the step
// that takes it in exceeds the control's by exactly that (1e-9 relative: the generator's neighbours are untouched at
// that step's start, so its conduction is the control's).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const CENTRES = { reactor: [20, 15], bridge: [30, 15], shield: [20, 5], quarters: [32.5, 25], turret: [45, 25], beamBay: [50, 15], engine: [7.5, 15] };

export default {
  id: 'L4.route.emp.v3',
  level: 'L4',
  laws: ['an EMP warhead SCRAMs the reactors in its reach (Disabled, a capture) and shuts the other powered rooms in reach for emp.outageTime; a charged buffer pays first, for the missile\'s body (as a round) and then the EMP (#252, #292, 13n.1 (d), §17 item 48)'],
  dependsOn: ['L4.route.surrender.v2'],
  setup: 'T1: createBattle, knowledge on; R1-M (designated EMP missiles, antenna) against a static R1 at 900 m; the plan launches one missile designated on the bridge (-y), the turret (+x) or the engine (-x), the antenna scanning its zone from t = 0; R1\'s shield off, or on (reactor-shield); the engine at throttle 1 from 7 s (stern); to the end or 20 s; with the shield on also a control battle with no missile launched (13n.4 H9\'; 13n.8 J8, J11)',
  measure: 'the burst point (kernel-read); the rooms hit (scram / outage events) against the field\'s doses recomputed from the hand-worked centres; the end; the outage\'s end; the engine\'s thrust; with the shield on, the generator\'s buffer before and after the burst\'s step, the body\'s field payment and heat (kernel-read), the booked heat after it and after its next step, and the generator room\'s heat against the control\'s',
  tolerance: 'doses, the buffer\'s payment and the heat 1e-9 relative; steps exact; the outage one-sided [t + 5, t + 5 + dt)',
  criterion: 'the rooms hit are exactly those with E / (1 + (r / R)^2) >= D: (reactor) reactor, bridge, shield, Disabled 600 steps after the burst\'s step, a capture; (reactor-shield) none (the charged buffer pays first), no end, the buffer falls by the body\'s payment + 2 MJ on the burst\'s step and the body\'s heat + 2 MJ is booked as the generator\'s heat, taken in by its next step, after which the generator room holds that much more heat than the control\'s; (bow) turret and beam bay, their outages ending one-sided at +5 s, no end; (stern) the engine, thrust 0 through the outage and above 0 after',
  tunable: ['missile.empEnergy', 'emp.radius', 'emp.scramDose', 'emp.outageTime', 'battle.disabledSeconds'],
  locked: { date: '2026-10-24', hash: 'abf8e4dc' },
  cases() {
    return [
      { name: 'reactor', bearing: '-y', room: 'bridge', zone: 1 },
      { name: 'reactor-shield', bearing: '-y', room: 'bridge', zone: 1, shield: true },
      { name: 'bow', bearing: '+x', room: 'turret', zone: 5 }, // bursts on the beam bay's +x face (#306 (10))
      { name: 'stern', bearing: '-x', room: 'engine', zone: 0, thrust: true },
    ];
  },
  expected(ctx, c) {
    const p = ctx.params;
    return { E: p.missile.empEnergy.value, R: p.emp.radius.value, D: p.emp.scramDose.value, out: p.emp.outageTime.value, hits: { reactor: ['bridge', 'reactor', 'shield'], 'reactor-shield': [], bow: ['beamBay', 'turret'], stern: ['engine'] }[c.name] };
  },
  run(ctx, c) {
    const battle = (count) => createBattle({
      params: ctx.params, tier: 'T1', attacker: missileShip('designated', 'emp'), target: TARGETS.R1, bearing: c.bearing, knowledge: true,
      plan: { missile: { rooms: [c.room], count } }, scans: [{ side: 'A', antenna: 0, zone: c.zone, at: 0 }], shield: { target: !!c.shield },
    });
    const b = battle(1), control = c.shield ? battle(0) : null, flying = new Set();
    const T = b.target, w = T.world, engine = w.rooms.find((r) => r.type === 'engine'), gen = w.rooms.find((r) => r.type === 'shieldGenerator');
    let burst = null, seen = 0, ended = null, buffer = null;
    const thrust = [];
    while (b.step < 1200 && !b.ended) {
      if (c.thrust && b.step === 420) engine.engine.throttle = 1; // the stern case's input: R1 under thrust from t = 7 s, before the missile arrives
      const before = { buffer: shieldBuffer(w, gen), heat: gen.shield.impulseHeat };
      for (const x of b.missiles) flying.add(x);
      tick(b);
      if (control) tick(control);
      for (const e of w.log.events.slice(seen)) if (e.type === 'warhead' && !burst) burst = { entry: [...e.entry], step: b.step, t: e.t };
      seen = w.log.events.length;
      // The buffer's payment and the heat it books, read across the burst's step and the step after (kernel-read).
      if (burst && burst.step === b.step) buffer = { before: before.buffer, after: shieldBuffer(w, gen), bookedBefore: before.heat, booked: gen.shield.impulseHeat };
      else if (burst && b.step === burst.step + 1 && buffer) {
        buffer.bookedNext = gen.shield.impulseHeat;
        const cg = control ? control.target.world.rooms.find((r) => r.type === 'shieldGenerator') : null;
        buffer.heatOver = cg ? gen.heat.Q - cg.heat.Q : null; // the generator room's heat against the control's, after the step that takes the booked heat in
        const x = [...flying].find((m) => m.hit);
        buffer.body = x && x.hit.field ? { ...x.hit.field } : null;
      }
      if (burst) thrust.push({ step: b.step, thrust: engine.engine.thrust });
      if (b.ended && !ended) ended = b.ended;
      if (burst && b.step > burst.step + 900) break;
    }
    const ev = w.log.events;
    const hit = [...new Set(ev.filter((e) => (e.type === 'scram' || e.type === 'outage') && burst).map((e) => e.room))].sort();
    const outages = ev.filter((e) => e.type === 'outage').map((e) => ({ room: e.room, until: e.until, ended: (ev.find((x) => x.type === 'outage-ended' && x.room === e.room) || {}).t ?? null }));
    const known = b.attacker.model.rooms.has(c.room);
    return { burst, hit, outages, ended: ended ? { kind: ended.kind, side: ended.side, step: ended.step } : null, known, scrams: ev.filter((e) => e.type === 'scram').length, thrust, destroyed: w.rooms.filter((r) => r.exploded).length, buffer };
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
    if (c.shield) {
      const B = a.buffer, rel = (x, y) => Math.abs(x - y) <= 1e-9 * Math.abs(y);
      checks['the body met the field (a payment, kernel-read)'] = !!B && !!B.body && B.body.energy > 0;
      checks['the buffer falls by the body\'s payment + E on the burst\'s step (1e-9)'] = !!B && !!B.body && rel(B.before - B.after, B.body.energy + e.E);
      checks['E and the body\'s heat booked as the generator\'s heat, nothing booked before'] = !!B && B.bookedBefore === 0 && B.booked > e.E && B.booked <= e.E + B.body.energy * (1 + 1e-9);
      checks['the generator\'s next step takes it in'] = !!B && B.bookedNext === 0;
      checks['the generator room holds the booked heat more than the control\'s (1e-9)'] = !!B && rel(B.heatOver, B.booked);
    }
    if (c.name === 'stern') {
      const o = a.outages[0];
      checks['thrust 0 from the step after the burst through the outage, above 0 after'] = !!o && a.thrust.filter((s) => s.step > a.burst.step && s.step * dt <= o.ended - 1e-9).every((s) => s.thrust === 0) && a.thrust.some((s) => s.step * dt > o.ended + 1e-9 && s.thrust > 0);
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    const B = a.buffer, paid = r.case.shield && B ? `; the body: ${B.body ? `${B.body.speed.toFixed(3)} -> ${B.body.after.toFixed(3)} m/s, paid ${(B.body.energy / 1e6).toFixed(6)} MJ` : 'no field'} (kernel-read); buffer ${(B.before / 1e6).toFixed(6)} -> ${(B.after / 1e6).toFixed(6)} MJ, heat booked ${(B.booked / 1e6).toFixed(6)} MJ, taken in by the next step ${B.bookedNext === 0 ? 'yes' : 'no'}; the generator room ${(B.heatOver / 1e6).toFixed(6)} MJ over the control's` : '';
    return { expected: `hit ${r.expected.hits.join(', ') || 'nothing'}${r.case.shield ? `; the buffer pays the body\'s share + ${r.expected.E / 1e6} MJ, booked as heat, the generator room that much over the control\'s` : ''}`, actual: a.burst ? `burst at (${a.burst.entry.map((v) => v.toFixed(2)).join(', ')}) step ${a.burst.step} (kernel-read); hit ${a.hit.join(', ') || 'nothing'}; outages ${a.outages.map((o) => `${o.room} to ${o.ended === null ? '-' : o.ended.toFixed(4)}`).join(', ') || '-'}; end ${a.ended ? `${a.ended.kind} ${a.ended.side} step ${a.ended.step}` : 'none'}${paid}` : 'no burst' };
  },
};
