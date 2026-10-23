import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint } from '../../../js/body.js';
import { TARGETS, SENSOR_SHIPS, missileShip } from '../../targets.js';

// W6 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #97): a seeker picks its missile's aim point each step from its own
// side's knowledge model only: IR the nearest resolved IR source of the other ship (a panel, an exhaust); radar the
// centre of the nearest zone its side has resolved; anti-radiation the nearest resolved EM source (a scanning antenna,
// an absorbing shield); designated the model's aim point of the room its ship targets; nothing resolved: the
// silhouette's centre.
//
// Setup (T1): createBattle with knowledge on, the attacker R1-M (R1 with a missile bay for its turret and the antenna on
// its hold, mission0/targets.js) loaded with the seeker's missiles, from -y at 900 m, plan.missile { rooms: ['magazine'],
// count: 1 }: one missile launched at t = 0, followed until it hits or 12 s. Per seeker, a target with one source of its
// kind resolved and one without: (ir) R1 (17 panels at rest, resolved at 900 m: S1) / T-gun (no fittings, engine off:
// IR-dark); (antiRadiation) R1-A scanning from t = 0, a new zone every 3 s (0, 3, 4, 5: a zone takes 4 s at 900 m, so it never stops; its antenna EM-bright, resolved at 5.6 km: S3) / R1 (no
// scan, shield off); (radar) R1 with the attacker's antenna scanning zone 1 from t = 0 / R1 without a scan; (designated)
// R1 with zone 1 scanned (it holds the magazine's cell (7, 2)) / R1 without a scan.
// Hand-worked (grid of R1 and T-gun, m): the silhouette's box is x 0-11, y 0-6 cells: its centre (27.5, 15); zone 1 =
// [4, 8) x [0, 3) (13n.1 (a)), its centre (30, 7.5); the magazine's first known cell (7, 2), centre (37.5, 12.5). Each
// mapped on the target's main body's pose (kernel-read, labelled). For IR and anti-radiation the point is a source of
// the model's (its position, kernel-read, labelled): the nearest of its kind to the missile, a re-statement of the rule.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const SIL = [27.5, 15], ZONE1 = [30, 7.5], MAG = [37.5, 12.5];
const KINDS = { ir: new Set(['panel', 'exhaust']), antiRadiation: new Set(['antenna', 'shield']) };

function setupOf(c) {
  const with_ = c.with;
  if (c.seeker === 'ir') return { target: with_ ? TARGETS.R1 : TARGETS['T-gun'], scans: [] };
  if (c.seeker === 'antiRadiation') return with_ ? { target: SENSOR_SHIPS['R1-A'], scans: [0, 3, 6, 9].map((at, i) => ({ side: 'T', antenna: 0, zone: [0, 3, 4, 5][i], at })) } : { target: TARGETS.R1, scans: [] };
  return { target: TARGETS.R1, scans: with_ ? [{ side: 'A', antenna: 0, zone: 1, at: 0 }] : [] };
}

export default {
  id: 'L2.missile.seekers',
  level: 'L2',
  laws: ['a seeker reads only its side\'s knowledge model: IR a resolved IR source, radar a resolved zone\'s centre, anti-radiation a resolved EM source, designated the room its ship targets; with nothing resolved the silhouette\'s centre (#97, 13n.1 (c))'],
  dependsOn: ['L0.missile.flight', 'L1.missilebay.launch'],
  setup: 'T1: createBattle, knowledge on, R1-M with one missile of each seeker against a target with one source of its kind resolved and one without (ir: R1 / T-gun; antiRadiation: R1-A scanning / R1; radar and designated: zone 1 scanned / not), from -y at 900 m, until the hit or 12 s (13n.4 W6)',
  measure: 'every step the missile flies: the seeker\'s aim point and what it named, against the expected point computed from the model before the step (the nearest source of its kind, the nearest resolved zone\'s centre, the room\'s known cell, or the silhouette\'s centre)',
  tolerance: 'points 1e-9 m',
  criterion: 'with: (ir) a panel or exhaust source, the nearest the model resolves, every step; (antiRadiation) the target\'s antenna once resolved; (radar) zone 1\'s centre (30, 7.5) once resolved, the silhouette\'s centre (27.5, 15) before; (designated) the magazine\'s cell (37.5, 12.5) once zone 1 resolves, the silhouette\'s centre before; without: the silhouette\'s centre (27.5, 15) every step; the missile flies (at least 60 steps checked)',
  tunable: ['sensor.sensitivity', 'sensor.scanTime', 'missile.acceleration'],
  locked: null,
  cases() {
    const out = [];
    for (const seeker of ['ir', 'radar', 'antiRadiation', 'designated']) for (const w of [true, false]) out.push({ seeker, with: w });
    return out;
  },
  expected(ctx, c) {
    return { seeker: c.seeker, with: c.with };
  },
  run(ctx, c) {
    const s = setupOf(c);
    const b = createBattle({ params: ctx.params, attacker: missileShip(c.seeker, 'he'), target: s.target, bearing: '-y', plan: { missile: { rooms: ['magazine'], count: 1 } }, knowledge: true, scans: s.scans });
    const A = b.attacker, model = A.model, rows = [];
    let x = null;
    while (b.step < 720 && !b.ended) {
      x = x || b.missiles[0] || null;
      let want = null;
      if (x && !x.over) {
        // The expected point from the model as it stands before the step (what the seeker reads), labelled re-statement.
        const pose = mainBody(b.target), map = (g) => worldPoint(pose, g);
        if (KINDS[c.seeker]) {
          let best = null;
          for (const [id, src] of [...model.sources.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1))) if (src.now && KINDS[c.seeker].has(src.kind)) { const d = (src.position[0] - x.x[0]) ** 2 + (src.position[1] - x.x[1]) ** 2; if (!best || d < best.d) best = { id, d, p: src.position }; }
          want = best ? { by: best.id, p: best.p } : { by: 'silhouette', p: map(SIL) };
        } else if (c.seeker === 'radar') want = model.resolved.has(1) ? { by: 'zone-1', p: map(ZONE1) } : { by: 'silhouette', p: map(SIL) };
        else want = model.rooms.has('magazine') ? { by: 'magazine', p: map(MAG) } : { by: 'silhouette', p: map(SIL) };
      }
      tick(b);
      if (want && x.aim) rows.push({ by: x.aim.by, want: want.by, err: Math.hypot(x.aim.point[0] - want.p[0], x.aim.point[1] - want.p[1]) });
      if (x && x.over) break;
    }
    const kinds = [...new Set(rows.map((r) => r.by.split(':')[0]))];
    return { steps: rows.length, mismatched: rows.filter((r) => r.by !== r.want).length, maxErr: Math.max(0, ...rows.map((r) => r.err)), kinds, last: rows.length ? rows[rows.length - 1].by : null, over: x ? x.over : null };
  },
  compare(e, a, c) {
    const kinds = c.with ? { ir: ['panel', 'exhaust'], antiRadiation: ['antenna'], radar: ['zone-1'], designated: ['magazine'] }[c.seeker] : ['silhouette'];
    const checks = {
      'the missile flies, at least 60 steps checked': a.steps >= 60,
      'every step the expected point (1e-9 m)': a.mismatched === 0 && a.maxErr <= 1e-9,
      [`it homes on ${kinds.join(' / ')} by the end`]: kinds.some((k) => a.last && a.last.startsWith(k)),
    };
    if (!c.with) checks['the silhouette\'s centre every step'] = a.kinds.length === 1 && a.kinds[0] === 'silhouette';
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
