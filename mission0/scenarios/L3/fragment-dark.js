import { buildShip } from '../../../js/battle.js';
import { damageCell, setRcs, step } from '../../../js/rooms.js';
import { setScan, sourcesOf } from '../../../js/sensors.js';
import { T_NECK_ROOMS, T_NECK2_FITTINGS } from '../../targets.js';

// J5 of L5e1 (DESIGN.md 13n.8 "Dark fragments", #37 "fragments without the bridge", #81, 13d.1): a fragment that keeps
// no bridge cell has no control: its reactor SCRAMs (#81; the restart needs control back, which a fragment never gets),
// its weapons hold, its engines and RCS stop, its scans end; it emits only its heat. L5e1 states what the kernel already
// does and pins it (the engineer's first commit ran the clauses on the kernel: mission0/probes/l5e1-j5.mjs; every one
// held, so no rule was built).
//
// Setup (T1): T-neck2 (mission0/targets.js: an aft section joined to the forward one only through a 2 x 2 hold) with
// its heat sink replaced by a turret (aftTurret, its four radiators on it) and an antenna in place of the shield
// generator's (4, 1) +x radiator: the aft fragment will hold the engine, the reactor, the shield generator, the aft
// turret, the engine's two RCS and the antenna, the forward one the bridge. Built as js/battle.js buildShip builds a
// battle's ship (power routed, the reactor at full demand); then the shield on, the aft turret firing along -y, the
// engine at throttle 1, the engine's RCS fired and the antenna scanning zone 0, renewed every step; 30 steps; then the
// hold's four cells destroyed between steps (damageCell, loss 1: the split); then 600 steps.
// Hand-worked (the rules of 13f.1 and #81, no number): in the split's own call every aft room loses control (no live
// wall joins it to the bridge) and the reactor SCRAMs there, its event at the split's time; afterwards, every step: the
// reactor SCRAMmed, delivering 0, no restart scheduled; the aft turret fires no shot; the engine's thrust 0 and no
// exhaust source; the aft body's velocity and spin unchanged (no thrust, no RCS force: nothing else acts on it); the
// antenna scans nothing; no EM source (the antenna and the shield generator emit nothing); before the split each of
// these was working (the turret fired, the engine thrust, the antenna and RCS on).
const DARK = {
  rooms: T_NECK_ROOMS.map((r) => (r.id === 'heatSink' ? { id: 'aftTurret', type: 'turret', cell: [3, 4] } : r)),
  fittings: T_NECK2_FITTINGS.map(([t, room, cell, side]) => [t, room === 'heatSink' ? 'aftTurret' : room, cell, side])
    .map((f) => (f[1] === 'shield' && f[2][0] === 4 && f[2][1] === 1 && f[3][0] === 1 ? ['antenna', 'shield', [4, 1], [1, 0]] : f)),
};
const AFT = ['engine', 'reactor', 'shield', 'aftTurret'];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L3.fragment.dark',
  level: 'L3',
  laws: ['a fragment that keeps no bridge cell has no control: its reactor SCRAMs and never restarts, its weapons hold, its engines and RCS stop, its scans end; it emits only its heat (#37, #81, 13n.8)'],
  dependsOn: ['L3.fragment.scram.v2', 'L3.control.rules'],
  setup: 'T1: T-neck2 with a turret for its heat sink and an antenna on the shield generator (buildShip); shield on, the aft turret firing, the engine at throttle 1, its RCS fired, the antenna scanning; 30 steps; the hold\'s four cells destroyed; 600 steps (13n.8 J5)',
  measure: 'before the split: the turret\'s shots, the thrust, the antenna\'s source; at the split: each aft room\'s control and the SCRAM\'s time; every step after: the reactor\'s state, the turret\'s shots, the thrust and exhaust, the aft body\'s velocity and spin, the scans and the EM sources',
  tolerance: 'exact (states and events; the aft body\'s velocity and spin unchanged to the bit)',
  criterion: 'before: working; at the split: two bodies, every aft room on the body without the bridge and uncontrolled, the reactor SCRAMmed with its scram event at the split\'s time; after, every step: the reactor SCRAMmed, delivering 0, no restart step, no reactor-restart or control-restored event; no shot from the aft turret; thrust 0 and no exhaust source; the aft body\'s velocity and spin unchanged; the antenna not a source; no EM source of the ship',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'split' }];
  },
  expected() {
    return { bodies: 2, steps: 600 };
  },
  run(ctx) {
    const { world: w, room } = buildShip(ctx.params, 'T1', DARK);
    const engine = room('engine'), turret = room('aftTurret'), reactor = room('reactor'), rcs = w.fittings.filter((f) => f.type === 'rcs' && f.room === 'engine').map((f) => f.id);
    room('shield').shield.on = true;
    turret.turret.hold = false; turret.turret.aim = [0, -1];
    const drive = () => { engine.engine.throttle = 1; setRcs(w, rcs, true); setScan(w, 0, 0); };
    for (let i = 0; i < 30; i++) { drive(); step(w); }
    const before = { shots: turret.turret.shots, thrust: engine.engine.thrust, antenna: sourcesOf(w).some((s) => s.kind === 'antenna'), controlled: AFT.every((id) => room(id).controlled) };
    const t0 = w.t, ev0 = w.log.events.length, hold = room('hold');
    for (let k = 0; k < hold.cells.length; k++) damageCell(w, hold, k, 1, 'case', 'kinetic');
    const split = w.log.events.slice(ev0);
    const scram = split.find((e) => e.type === 'scram' && e.room === 'reactor');
    const dark = w.ship.bodies.find((b) => b.id === reactor.body), bridgeBody = room('bridge').body;
    const at = { bodies: w.ship.bodies.length, onDark: AFT.every((id) => room(id).body === dark.id), bridgeElsewhere: bridgeBody !== dark.id, uncontrolled: AFT.every((id) => !room(id).controlled), scramT: scram ? scram.t : null, t0 };
    const shots0 = turret.turret.shots, v0 = [...dark.v], w0 = dark.omega;
    let bad = { reactor: 0, shots: 0, thrust: 0, motion: 0, scan: 0, em: 0 };
    for (let i = 0; i < 600; i++) {
      drive();
      step(w);
      const src = sourcesOf(w), b = w.ship.bodies.find((x) => x.id === dark.id);
      if (!reactor.reactor.scrammed || reactor.reactor.delivered !== 0 || reactor.reactor.restartStep !== null) bad.reactor++;
      if (turret.turret.shots !== shots0) bad.shots++;
      if (engine.engine.thrust !== 0 || src.some((s) => s.kind === 'exhaust')) bad.thrust++;
      if (!b || b.v[0] !== v0[0] || b.v[1] !== v0[1] || b.omega !== w0) bad.motion++;
      if (src.some((s) => s.kind === 'antenna')) bad.scan++;
      if (src.some((s) => s.band === 'em')) bad.em++;
    }
    const later = w.log.events.slice(ev0).filter((e) => e.type === 'reactor-restart' || e.type === 'control-restored').length;
    return { before, at, bad, later, steps: 600 };
  },
  compare(e, a) {
    const checks = {
      'before the split: the turret fired, the engine thrust, the antenna scanned, the aft rooms controlled': a.before.shots > 0 && a.before.thrust > 0 && a.before.antenna && a.before.controlled,
      'two bodies; every aft room on the body without the bridge, uncontrolled': a.at.bodies === e.bodies && a.at.onDark && a.at.bridgeElsewhere && a.at.uncontrolled,
      'the reactor SCRAMs in the split\'s call, at its time': a.at.scramT === a.at.t0,
      'every step after: SCRAMmed, delivering 0, no restart': a.bad.reactor === 0 && a.later === 0,
      'no shot from the aft turret': a.bad.shots === 0,
      'thrust 0, no exhaust': a.bad.thrust === 0,
      'the aft body\'s velocity and spin unchanged (no thrust, no RCS)': a.bad.motion === 0,
      'the antenna scans nothing; no EM source': a.bad.scan === 0 && a.bad.em === 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'working before; dark after (SCRAM at the split, nothing restarts, no shot, no thrust, no RCS force, no scan, no EM) for 600 steps', actual: `before: ${a.before.shots} shots, thrust ${a.before.thrust}; split at ${a.at.t0} s: ${a.at.bodies} bodies, SCRAM at ${a.at.scramT}; steps failing each clause ${JSON.stringify(a.bad)}; restarts ${a.later}` };
  },
};
