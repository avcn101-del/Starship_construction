import { createWorld, addRoom, addFitting, loadMagazine, fireRound, pathAlong, plateEntry, railgunSlug } from '../../../js/rooms.js';

// W2 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #236 (6), #295): the railgun's slug is a round of the round rule
// (steel). Its counters (#295): a plate at 0.4 m (armour.plateThickness's top) stops every slug N = 2-6; a reactor cell
// stops it; it passes three crewed cells and enters a magazine behind a bridge fast enough to detonate it.
//
// Setup (T1, a cluster on a 20 x 10 grid, no ship): the slug of an M railgun of N = 2, 4, 6 cells (railgunSlug; the
// room at [0, 6]) fired with fireRound along row 0 of: (crewed) four bridges at [0, 0] .. [6, 0], 8 crewed cells;
// (bridge) a bridge at [0, 0] then a magazine at [2, 0] full of HE; (plate 0.2) a hold at [0, 0] and an empty magazine
// at [2, 0] with a plate of armour.plateThickness on their shared wall, the path the plate then the magazine's two
// cells; (plate 0.4) the same with the plate at 0.4 m: the case builds its own params with armour.plateThickness 0.4,
// the top of its range (--set-free, #295); (reactor) a reactor at [0, 0], its two cells.
// Hand-worked (the round rule, 13i.1, from its formulas, never from a printed value): c = 2.7e5 x 12^(1/3) / 400 =
// 1545.364 m/s; the slug 10 kg of steel, D = (4 x 10 / (pi x 7850 x 4))^(1/3) = 0.07400 m, A = 4.301e-3 m^2, S = c m /
// A; v = 2000, 2828.427, 3464.102 m/s. sigma: crewed 14 800 / 25 = 592, magazine 3000 / 25 = 120, reactor 150 000 / 25
// = 6000, plate 0.2 x 7850 = 1570, 0.4 x 7850 = 3140 kg/m^2; each entry r = c sigma; the round passes while s = p / A >
// r and f + r / S < 1, losing r A of momentum and flattening A = A0 / (1 - f). Carried through: 3 crewed cells passed
// at every N (stops in the 4th); the magazine behind the bridge entered at 1078.188411067277 / 1906.6155358134674 /
// 2542.2900262050316 m/s (>= 400: it detonates); the 0.2 m plate passed, the magazine entered at 956.063612445331 /
// 1784.4907371915215 / 2420.1652275830857 m/s; the reactor's first cell stops it; the 0.4 m plate stops it (entry 0).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const BRIDGE_MAG = { 2: 1078.188411067277, 4: 1906.6155358134674, 6: 2542.2900262050316 };
const PLATE_MAG = { 2: 956.063612445331, 4: 1784.4907371915215, 6: 2420.1652275830857 };

function build(ctx, c) {
  const params = c.col === 'plate4' ? JSON.parse(JSON.stringify(ctx.params)) : ctx.params;
  if (c.col === 'plate4') params.armour.plateThickness.value = 0.4; // the range's top, built in the case (#295)
  const w = createWorld({ params, edge: 5, dt: ctx.dt, grid: [20, 10] });
  const gun = addRoom(w, 'railgun', { id: 'railgun', cell: [0, 6], length: c.N });
  let path;
  if (c.col === 'crewed') { for (let i = 0; i < 4; i++) addRoom(w, 'bridge', { id: `bridge-${i}`, cell: [2 * i, 0] }); path = pathAlong(w, [0, 1, 2, 3, 4, 5, 6, 7].map((x) => [x, 0])); }
  else if (c.col === 'bridge') { addRoom(w, 'bridge', { id: 'bridge', cell: [0, 0] }); const m = addRoom(w, 'magazine', { id: 'magazine', cell: [2, 0] }); loadMagazine(w, m, { heMass: 900 }); path = pathAlong(w, [[0, 0], [1, 0], [2, 0], [3, 0]]); }
  else if (c.col === 'reactor') { addRoom(w, 'reactor', { id: 'reactor', cell: [0, 0] }); path = pathAlong(w, [[0, 0], [1, 0]]); }
  else {
    addRoom(w, 'hold', { id: 'hold', cell: [0, 0] });
    const m = addRoom(w, 'magazine', { id: 'magazine', cell: [2, 0] });
    addFitting(w, 'armour', 'magazine', [2, 0], [-1, 0]);
    path = [plateEntry(w, [1, 0], [2, 0]), { room: m, cell: 0, chord: 1 }, { room: m, cell: 1, chord: 1 }];
  }
  return { w, gun, path };
}

export default {
  id: 'L0.railgun.slug',
  level: 'L0',
  laws: ['the railgun\'s slug is a round of the round rule, steel of railgun.roundMass at railgun.muzzleVelocity x sqrt(N / 2) (13n.1 (c), #236 (6))', 'its counters: a 0.4 m plate stops every slug N = 2-6, a reactor cell stops it (#295)'],
  dependsOn: [],
  setup: 'T1: the slug of an M railgun of N = 2, 4, 6 by fireRound through 8 crewed cells; a bridge then a magazine of HE; a 0.2 m plate then a magazine; a 0.4 m plate (params built in the case) then a magazine; a reactor (13n.4 W2)',
  measure: 'the kernel\'s slug (railgunSlug); the round rule\'s cells passed, its stopping entry and its speed entering each entry (momentum / mass); the magazine\'s detonation',
  tolerance: 'counts and the stopping entry exact; entry speeds 1e-12 relative against the hand-worked literals',
  criterion: 'every N: 3 crewed cells passed, stopped in the 4th; the magazine behind a bridge entered at 1078.188 / 1906.616 / 2542.290 m/s and detonated; the 0.2 m plate passed and the magazine entered at 956.064 / 1784.491 / 2420.165 m/s; a reactor cell stops it (entry 0); the 0.4 m plate stops it (entry 0)',
  tunable: ['railgun.roundMass', 'railgun.muzzleVelocity', 'armour.plateThickness', 'cellMass.crewed', 'cellMass.reactor', 'matter.kineticResistance'],
  locked: null,
  cases() {
    const out = [];
    for (const N of [2, 4, 6]) for (const col of ['crewed', 'bridge', 'plate2', 'plate4', 'reactor']) out.push({ N, col });
    return out;
  },
  expected(ctx, c) {
    if (c.col === 'crewed') return { passed: 3, stoppedIn: 3 };
    if (c.col === 'bridge') return { passed: 4, stoppedIn: -1, enter: BRIDGE_MAG[c.N], index: 2, detonated: true };
    if (c.col === 'plate2') return { passed: 3, stoppedIn: -1, enter: PLATE_MAG[c.N], index: 1 };
    return { passed: 0, stoppedIn: 0 };
  },
  run(ctx, c) {
    const { w, gun, path } = build(ctx, c);
    const slug = railgunSlug(w, gun);
    const res = fireRound(w, { mass: slug.m, velocity: slug.v, area: slug.A }, path, 'slug-1');
    return { m: slug.m, v: slug.v, passed: res.passed, stoppedIn: res.stoppedIn, entry: res.entry.map((p) => p / slug.m), detonated: !!res.detonated, plate: path[0].plate ? path[0].plate.thickness : null };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    const checks = { 'cells passed (hand-worked)': a.passed === e.passed, 'stopping entry': a.stoppedIn === e.stoppedIn };
    if (e.enter !== undefined) checks['the magazine entered at the hand-worked speed (1e-12)'] = close(e.enter, a.entry[e.index], 1e-12);
    if (e.detonated) checks['the magazine detonates (>= magazine.detonationSpeed)'] = a.detonated;
    if (c.col === 'plate4') checks['the plate built at 0.4 m'] = a.plate === 0.4;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
