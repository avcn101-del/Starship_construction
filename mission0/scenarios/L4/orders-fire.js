import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint } from '../../../js/body.js';
import { TARGETS, SENSOR_SHIPS, HELM_SHIPS } from '../../targets.js';

// H5 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #38, #301 (2)): the firepower orders. Open fire 'in range' fires
// while the other ship is within battle.cullDistance (where a round can arrive before it is culled; a reading of "in
// range", a question of the pull request); 'sure hit' when 1/2 x the other ship's acceleration across the line of sight
// (from its last three silhouette poses) x the time of flight^2 is under one cell edge; 'salvo' releases every weapon at
// once, 'ripple' weapon i of n at i / n of its reload; the target priority picks among the rooms its model knows, else
// the centre of the zone with the most unknown cells.
//
// Setup (T1): createBattle with knowledge on; a shooter with a helm (position flank, facing bow, range hold, auto-scan
// off) on bearing -y of R1 at 900 m (or 3500 m), both at rest; R1 static (no helm) or, in (sure-dodge), R1d with a helm
// broadside and dodging (weapons held, throttle 1). Cases and hand-working:
//   (inrange-900) R1-A, open fire in range: released at the first step: its first shot at t = 0;
//   (inrange-3500) the same at 3500 m (beyond battle.cullDistance, 3000 m): no shot in 5 s;
//   (sure-static) open fire sure hit against the static R1: the acceleration needs three silhouette poses (at undock,
//     after step 1, after step 2), so the first shot is at the third step, t = 2 dt (0.0333 s), and R1's acceleration
//     is 0;
//   (sure-dodge) sure hit against R1d dodging from rest: its acceleration across the line is 10.552 m/s^2 (15 MN over
//     1 421 484 kg) and 1/2 x 10.552 x 1.11^2 = 6.5 m > 5 m: no shot in 4 s (before its dodge carries it helm.rangeBand
//     = 100 m off its station, sqrt(2 x 100 / 10.552) = 4.35 s, where its range order takes the helm, #302);
//   (salvo) R1-2T (two turrets), salvo: both turrets' first shots at t = 0;
//   (ripple) R1-2T, ripple: turret at t = 0, turret2 at 1/2 x its reload (1 / turret.fireRate = 2 s): t = 1.0 s;
//   (priority-<p>) R1-A scans R1's zone 1 (the verb at t = 0) and, once it resolves, its model knows the cells of zone 1
//     only: shield (4, 0) (4, 1), hold (7, 0) (7, 1), reactor (4, 2), bridge (5, 2) (6, 2), magazine (7, 2) (R1's zones,
//     §13n.1 (a): 6 / 8 / 5 / 6 / 12 / 7 occupied cells in zones 0-5); the target the step after: weapons -> no
//     weapon known: the centre of zone 4, the zone with the most unknown cells (12); power -> the reactor; bridge -> the
//     bridge; nearest -> the known room whose aim point (its first known standing cell's centre: shield (4, 0), hold
//     (7, 0), reactor (4, 2), bridge (5, 2), magazine (7, 2)) is nearest the shooter (R1's pose and the shooter's
//     position kernel-read, labelled).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const AIMS = { shield: [4, 0], hold: [7, 0], reactor: [4, 2], bridge: [5, 2], magazine: [7, 2] };

export default {
  id: 'L4.orders.fire',
  level: 'L4',
  laws: ['open fire in range (within battle.cullDistance) or on a sure hit (1/2 a_lateral t_f^2 under one cell edge) (#38, #301 (2))', 'salvo releases every weapon at once, ripple spreads them over the reload (#38)', 'the target priority picks from the known rooms, else the zone with the most unknown cells (#38, 13n.1 (d))'],
  dependsOn: ['L4.helm.dodge'],
  setup: 'T1: createBattle, knowledge on; R1-A or R1-2T with a helm (position flank, facing bow, auto-scan off) on bearing -y of R1 (static) or R1d (dodging) at 900 or 3500 m; open fire, firing style and target priority per case (13n.4 H5)',
  measure: 'the steps and times of the first shots; the helm\'s target after zone 1 resolves',
  tolerance: 'times exact (whole steps, from the events); the target exact (room id or zone)',
  criterion: '(inrange-900) first shot t = 0; (inrange-3500) none in 5 s; (sure-static) first shot t = 2 dt; (sure-dodge) none in 4 s; (salvo) both at 0; (ripple) turret 0, turret2 1.0 s; (priority) weapons zone 4, power reactor, bridge bridge, nearest the hand-worked nearest',
  tunable: ['battle.cullDistance', 'turret.fireRate', 'sensor.scanTime'],
  locked: null,
  cases() {
    return [
      { name: 'inrange-900', ship: 'R1-A', openFire: 'inRange', distance: 900, seconds: 5 },
      { name: 'inrange-3500', ship: 'R1-A', openFire: 'inRange', distance: 3500, seconds: 5 },
      { name: 'sure-static', ship: 'R1-A', openFire: 'sureHit', distance: 900, seconds: 5 },
      { name: 'sure-dodge', ship: 'R1-A', openFire: 'sureHit', distance: 900, seconds: 4, dodger: true },
      { name: 'salvo', ship: 'R1-2T', openFire: 'inRange', distance: 900, seconds: 3, firing: 'salvo' },
      { name: 'ripple', ship: 'R1-2T', openFire: 'inRange', distance: 900, seconds: 3, firing: 'ripple' },
      ...['weapons', 'power', 'bridge', 'nearest'].map((p) => ({ name: `priority-${p}`, ship: 'R1-A', openFire: 'inRange', distance: 900, priority: p })),
    ];
  },
  expected(ctx, c) {
    const dt = ctx.dt;
    if (c.priority) return { target: { weapons: 'zone-4', power: 'reactor', bridge: 'bridge', nearest: 'nearest' }[c.priority] };
    return {
      'inrange-900': { first: { turret: 0 } }, 'inrange-3500': { first: {} }, 'sure-static': { first: { turret: 2 * dt } }, 'sure-dodge': { first: {} },
      salvo: { first: { turret: 0, turret2: 0 } }, ripple: { first: { turret: 0, turret2: 1 } },
    }[c.name];
  },
  run(ctx, c) {
    const orders = { range: 'hold', position: 'flank', facing: 'bow', autoScan: 'off', openFire: c.openFire, firing: c.firing || 'salvo', target: c.priority || 'weapons', throttle: 1 };
    const ships = { 'R1-A': SENSOR_SHIPS['R1-A'], 'R1-2T': HELM_SHIPS['R1-2T'] };
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: ships[c.ship], target: c.dodger ? TARGETS.R1d : TARGETS.R1, bearing: '-y', distance: c.distance, knowledge: true,
      orders: { A: orders, ...(c.dodger ? { T: { facing: 'broadside', dodging: 'on', heat: { threshold: 0, response: 'weapons' }, throttle: 1 } } : {}) },
      inputs: c.priority ? [{ t: 0, side: 'A', verb: 'scan', arg: 1 }] : [],
    });
    const A = b.attacker;
    if (c.priority) {
      while (!A.model.resolved.has(1) && b.step < 1200) tick(b);
      tick(b);
      const tg = A.helm.target, me = mainBody(A), tb = mainBody(b.target);
      const dists = Object.fromEntries(Object.entries(AIMS).map(([id, [x, y]]) => [id, Math.hypot(...[0, 1].map((i) => worldPoint(tb, [(x + 0.5) * 5, (y + 0.5) * 5])[i] - me.x[i]))]));
      return { target: tg.room || `zone-${tg.zone}`, known: [...A.model.rooms.keys()].sort(), dists, resolvedAt: A.model.resolved.get(1) };
    }
    const first = {};
    let seen = 0;
    while (b.step < Math.round(c.seconds / b.dt) && !b.ended) {
      tick(b);
      for (const e of A.world.log.events.slice(seen)) if (e.type === 'shot' && !(e.room in first)) first[e.room] = e.t;
      seen = A.world.log.events.length;
    }
    return { first };
  },
  compare(e, a, c) {
    let checks;
    if (c.priority) {
      const nearest = Object.entries(a.dists).sort((p, q) => p[1] - q[1])[0][0];
      checks = {
        'the model knows zone 1\'s rooms only': a.known.join(',') === 'bridge,hold,magazine,reactor,shield',
        'the target by the priority': a.target === (e.target === 'nearest' ? nearest : e.target),
      };
    } else {
      const keys = (x) => Object.keys(x).sort().join(',');
      checks = {
        'the turrets that fired': keys(a.first) === keys(e.first),
        'their first shots\' times (whole steps, 1e-12 s)': Object.entries(e.first).every(([k, t]) => Math.abs(a.first[k] - t) <= 1e-12),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.priority) return { expected: `target ${r.expected.target}`, actual: `target ${a.target}; known ${a.known.join(' ')}; zone 1 resolved after step ${a.resolvedAt}; distances ${Object.entries(a.dists).map(([k, d]) => `${k} ${d.toFixed(2)}`).join(', ')} m (kernel-read pose)` };
    const s = (x) => Object.entries(x).map(([k, t]) => `${k} ${t.toFixed(4)} s`).join(', ') || 'no shot';
    return { expected: s(r.expected.first), actual: s(a.first) };
  },
};
