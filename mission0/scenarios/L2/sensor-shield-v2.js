import { step, setBeams } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { createKnowledge, sense, setScan } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// Successor of L2.sensor.shield (S5, withdrawn under #301 (6), §17 item 45 (e): the L5b checker's gap): every case and
// check of S5 kept, plus the gap: in the scan case with the shield on under the beam, the generator still absorbs (its
// s.em > 0) at the step zone 0 resolves (249), so the scan passed an absorbing field; with the shield off it absorbs
// nothing then (0). S5's header, kept:
// S5 of the L5 plan (DESIGN.md 13n.4, 13n.1 (a), #103, #289): a shield is an EM source while it absorbs (its absorbed
// power, s.em) at its generator room's centre, and not after; it does not block scans.
//
// Setup (T1, at rest, power routed): R1 at the origin heading 0 with its shield generator on; R1d-A (an antenna on its
// hold's -y edge of cell (8, 0), grid (42.5, 0) m) heading 0 with its grid corner at (0, -900), its model of R1 sensed
// after every step. (absorb) A 5 MW beam at grid (20, 0) m (the generator room's -y face, setBeams) before steps
// 61-120 only (t 1-2 s), none before or after; 180 steps. (scan) The antenna scans zone 0 (which holds two of the
// generator's cells) from the first step, with the shield on and the beam on every step, and with the shield off and
// no beam.
// Hand-worked: the generator room [3, 5) x [0, 2) has its centre at grid (20, 5) m; 5 MW is seen to sqrt(5e6 x 4 /
// (4 pi 1e-3)) = 39 894 m, so at about 900 m the shield is resolved in every step it absorbs anything above 1e-3 W x 4 pi
// d^2 / 4 m^2 = 2.6 kW; zone 0 resolves after step 249 either way (S4's d^2 = 824 612.5 m^2, t = 4.145623 s).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const BEAM = { from: 61, to: 120 };

export default {
  id: 'L2.sensor.shield.v2',
  level: 'L2',
  laws: ['a shield is an EM source of its absorbed power while it absorbs, and not after (#103, 13n.1 (a))', 'the shield does not block scans (#103)'],
  dependsOn: ['L1.sensor.passive', 'L1.sensor.active'],
  setup: 'T1, at rest: R1 at the origin with its shield on; R1d-A heading 0 with its grid corner at (0, -900); a 5 MW beam on R1\'s generator face in steps 61-120 (absorb); R1d-A scanning R1\'s zone 0 with the shield on under the beam and with it off (scan) (13n.4 S5)',
  measure: 'the steps in which the model has the shield resolved, and the generator\'s absorbed power in each; its source-resolved events and position; the step zone 0 resolves in each scan case',
  tolerance: 'steps exact; the position 1e-9 m',
  criterion: '(absorb) the shield resolved exactly in steps 61-120, in each of which the generator absorbs (s.em > 0, the kernel\'s), and in none before or after; one source-resolved event of kind shield, after step 61, root sense, at grid (20, 5) m, its last known position kept after; (scan) zone 0 resolves after step 249 with the shield on under the beam and with it off, the generator absorbing at that step with the shield on (s.em > 0) and not with it off',
  tunable: ['sensor.area', 'sensor.sensitivity', 'shield.budget', 'sensor.scanTime', 'sensor.scanRange'],
  locked: { date: '2026-10-23', hash: '54caeaef' },
  cases() {
    return [{ mode: 'absorb' }, { mode: 'scan', shield: true }, { mode: 'scan', shield: false }];
  },
  expected(ctx, c) {
    return c.mode === 'absorb' ? { from: BEAM.from, to: BEAM.to, at: [20, 5] } : { n: 249 };
  },
  run(ctx, c) {
    const on = c.mode === 'absorb' || c.shield;
    const { world: T, room } = buildShip(ctx.params, 'T1', TARGETS.R1, { prefix: 'T', origin: [0, 0], setup: (w, r) => { r('shield').shield.on = on; } });
    const O = buildShip(ctx.params, 'T1', SENSOR_SHIPS['R1d-A'], { prefix: 'A', origin: [0, -900] }).world;
    const model = createKnowledge(O, T), pairs = [{ world: O, model }], g = room('shield');
    sense(pairs, { scan: false });
    const beam = (yes) => setBeams(T, yes ? [{ id: 'beam-1', position: [20, 0], power: 5e6 }] : []);
    if (c.mode === 'scan') {
      setScan(O, 0, 0);
      let n = null;
      let em = null;
      while (n === null && O.step < 320) { beam(on); step(O); step(T); sense(pairs); if (model.resolved.has(0)) { n = O.step; em = g.shield.em; } }
      return { n, em };
    }
    const seen = [], absorbing = [];
    while (O.step < 180) {
      beam(O.step + 1 >= BEAM.from && O.step + 1 <= BEAM.to);
      step(O); step(T); sense(pairs);
      const s = model.sources.get('shield:shield');
      if (s && s.now) seen.push(O.step);
      if (g.shield.em > 0) absorbing.push(O.step);
    }
    const ev = O.log.events.filter((e) => e.type === 'source-resolved' && e.kind === 'shield');
    const last = model.sources.get('shield:shield');
    return { seen: [seen[0], seen[seen.length - 1], seen.length], absorbing: [absorbing[0], absorbing[absorbing.length - 1], absorbing.length], events: ev.map((e) => ({ step: Math.round(e.t / O.dt), parent: e.parent, position: e.position })), last: last ? { now: last.now, position: last.position } : null };
  },
  compare(e, a, c) {
    let checks;
    if (c.mode === 'scan') checks = { 'zone 0 resolves after step 249': a.n === e.n, 'the generator absorbs at that step iff the shield is on (s.em > 0, else 0)': c.shield ? a.em > 0 : a.em === 0 };
    else {
      const at = (p) => !!p && Math.abs(p[0] - e.at[0]) <= 1e-9 && Math.abs(p[1] - e.at[1]) <= 1e-9;
      const span = e.to - e.from + 1;
      checks = {
        'resolved exactly in steps 61-120': a.seen[0] === e.from && a.seen[1] === e.to && a.seen[2] === span,
        'absorbing in each of them (the kernel\'s s.em), in none other': a.absorbing[0] === e.from && a.absorbing[1] === e.to && a.absorbing[2] === span,
        'one source-resolved event after step 61, root sense, at (20, 5)': a.events.length === 1 && a.events[0].step === e.from && a.events[0].parent === 'sense' && at(a.events[0].position),
        'not resolved after, its last position kept': !!a.last && a.last.now === false && at(a.last.position),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
