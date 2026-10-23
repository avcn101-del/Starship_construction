import { createBattle, tick, mainBody, aimPoint } from '../../../js/battle.js';
import { worldPoint, rotate } from '../../../js/body.js';
import { damageCell } from '../../../js/rooms.js';
import { knownAim } from '../../../js/sensors.js';
import { SENSOR_SHIPS, TARGETS } from '../../targets.js';

// H17 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #301 (1), §17 item 45 (a), #306): plan advancement by the model. With
// knowledge on a plan room is lost to its shooter when its model knows the room and no standing cell of it; a room it
// knows standing stays the target, whatever the truth. With knowledge off the truth advances the plan at once.
//
// Setup (T1): createBattle, R1d-A (its antenna on the hold) against a static R1 from -y at 900 m, the plan's turret on
// R1's quarters then its heat sink (plan.turret ['quarters', 'heatSink']). The quarters [5, 8) x [4, 6) lie wholly in
// zone 4 ([4, 8) x [3, 6)), the heat sink [3, 5) x [4, 6) half in it. The attacker's turret and magazine are emptied
// at undock (no round flies, so nothing but the case's input changes R1). At step 360 (6 s) every cell of the
// quarters is destroyed in the truth (a case's input: damageCell, loss 1). (knowledge) knowledge on, the case naming
// zone 4 (plan.zone), the antenna scanning zone 4 from t = 0 (it resolves before 6 s, kernel-read) and again from
// t = 10 s; up to 25 s. (truth) knowledge off, the same plan and input; up to 10 s.
// Hand-worked: nothing numeric; the order of events. Each step the turret's ship-frame aim is compared with the
// direction from the turret to the quarters' and the heat sink's aim points as the shooter's model knows them
// (knownAim) with knowledge on, as the truth has them (aimPoint) with it off, both on the pose before the tick
// (1e-12). Knowledge on: from zone 4's first resolution the aim is on the quarters, and stays there after step 360
// while the model, unscanned since, shows them standing; the first step on the heat sink is the step zone 4 resolves
// again (the model then knows the quarters with no standing cell), kernel-read and labelled. Knowledge off: the aim
// is on the quarters before step 360 and on the heat sink from step 360 (the input is applied before that tick).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const KILL = 360;

export default {
  id: 'L4.plan.model',
  level: 'L4',
  laws: ['with knowledge on a plan room is lost to its shooter only when its model knows the room and no standing cell of it (#301 (1), §17 item 45 (a))', 'with knowledge off the truth advances the plan (13l.1)'],
  dependsOn: ['L4.target.known'],
  setup: 'T1: createBattle, R1d-A (turret and magazine emptied) against a static R1 from -y at 900 m, plan.turret quarters then heat sink; the quarters destroyed in the truth at step 360; knowledge on (plan.zone 4, zone 4 scanned from 0 s and again from 10 s; 25 s) or off (10 s) (13n.4 H17)',
  measure: 'each step: which room the turret\'s aim is laid on (the model\'s aim points with knowledge on, the truth\'s with it off, 1e-12); the steps zone 4 resolves (kernel-read)',
  tolerance: 'the aim direction 1e-12 (each component); steps exact',
  criterion: 'knowledge on: zone 4 resolves before step 360 and again after it; from the first resolution to the second the aim is on the quarters every step (the truth destroyed them at 360), and from the step of the second it is on the heat sink every step (kernel-read steps, labelled); knowledge off: on the quarters every step before 360, on the heat sink every step from 360',
  tunable: ['sensor.scanTime', 'sensor.scanRange'],
  locked: null,
  cases() {
    return [{ knowledge: true }, { knowledge: false }];
  },
  expected(ctx, c) {
    return { kill: KILL, knowledge: c.knowledge };
  },
  run(ctx, c) {
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1d-A'], target: TARGETS.R1, bearing: '-y', knowledge: c.knowledge,
      plan: { turret: ['quarters', 'heatSink'], ...(c.knowledge ? { zone: 4 } : {}) },
      scans: c.knowledge ? [{ side: 'A', antenna: 0, zone: 4, at: 0 }, { side: 'A', antenna: 0, zone: 4, at: 10 }] : [],
      setup: { attacker: (w, room) => { const t = room('turret'); t.turret.ammo = 0; const m = room('magazine'); m.magazine.ap = 0; m.magazine.he = 0; } },
    });
    const A = b.attacker, T = b.target, turret = A.world.rooms.find((r) => r.type === 'turret'), quarters = T.room('quarters');
    const rows = [], resolved = [];
    let was = c.knowledge ? A.model.resolved.get(4) ?? null : null;
    while (!b.ended && b.step < (c.knowledge ? 1500 : 600)) {
      const n = b.step;
      if (n === KILL) quarters.cells.forEach((_, k) => { if (!quarters.cells[k].destroyed) damageCell(T.world, quarters, k, 1, 'case', 'kinetic'); });
      // The aim points before the tick, as the turret's rule reads them: the model's with knowledge on, the truth's off.
      const ab = A.world.ship.bodies.find((x) => x.id === turret.body) || mainBody(A), S = worldPoint(ab, turret.position), theta = ab.theta;
      const point = (id) => (c.knowledge ? knownAim(A.model, id) : aimPoint(T, T.room(id)));
      const dir = (P) => { if (!P) return null; const d = [P[0] - S[0], P[1] - S[1]], L = Math.hypot(d[0], d[1]); return rotate([d[0] / L, d[1] / L], -theta); };
      const wq = dir(point('quarters')), wh = dir(point('heatSink'));
      tick(b);
      const aim = turret.turret.aim, err = (w) => (w ? Math.max(Math.abs(aim[0] - w[0]), Math.abs(aim[1] - w[1])) : Infinity);
      rows.push({ n, on: err(wq) <= 1e-12 ? 'quarters' : err(wh) <= 1e-12 ? 'heatSink' : 'other', hold: turret.turret.hold });
      if (c.knowledge) { const r = A.model.resolved.get(4) ?? null; if (r !== was) { resolved.push(b.step); was = r; } }
    }
    const shots = A.world.log.events.filter((e) => e.type === 'shot').length;
    return { runs: runs(rows), resolved, shots, destroyed: quarters.cells.every((x) => x.destroyed), steps: b.step };
  },
  compare(e, a, c) {
    const on = a.runs;
    let checks;
    if (c.knowledge) {
      const [r1, r2] = a.resolved;
      const seg = (from, to, room) => on.filter((x) => x.to > from && x.from < to).every((x) => x.on === room) && on.some((x) => x.from <= from && x.to > from);
      checks = {
        'zone 4 resolves before 360 and again after (kernel-read)': a.resolved.length >= 2 && r1 <= e.kill && r2 > e.kill,
        'the quarters destroyed in the truth at 360': a.destroyed,
        'on the quarters from the first resolution to the second (the model shows them standing)': r1 !== undefined && r2 !== undefined && seg(r1, r2, 'quarters'),
        'on the heat sink from the second resolution on': r2 !== undefined && seg(r2, a.steps, 'heatSink'),
        'no round fired': a.shots === 0,
      };
    } else {
      checks = {
        'the quarters destroyed in the truth at 360': a.destroyed,
        'on the quarters every step before 360': on.filter((x) => x.from < e.kill).every((x) => x.on === 'quarters' && x.to <= e.kill),
        'on the heat sink every step from 360': on.filter((x) => x.to > e.kill).every((x) => x.on === 'heatSink' && x.from >= e.kill) && on.some((x) => x.from === e.kill),
        'no round fired': a.shots === 0,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: r.expected.knowledge ? 'quarters until zone 4 re-resolves, then the heat sink' : 'quarters before 360, heat sink from 360', actual: `${a.runs.map((x) => `${x.on} [${x.from}, ${x.to})`).join(', ')}; zone 4 resolved after steps ${a.resolved.join(', ') || '-'} (kernel-read); shots ${a.shots}` };
  },
};

/** The rows as runs of the same room: [{ on, from, to }], steps [from, to). */
function runs(rows) {
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.on === r.on && last.to === r.n) last.to = r.n + 1;
    else out.push({ on: r.on, from: r.n, to: r.n + 1 });
  }
  return out;
}
