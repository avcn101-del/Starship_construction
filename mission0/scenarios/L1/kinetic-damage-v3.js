import { createWorld, addRoom, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Successor of L1.kinetic.damage.v2 (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but
// for its id; its record moves by float residue only (the heat books' generated and stored, 1e-16 relative), because
// the round's heat is now split between entries by the energy each took (L4 of 13n.1 (b)) and summed in another
// order.
// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them;
// 'cell-damaged' (#206) carries channel, cell and integrity.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// Targets as D1 (L1.kinetic.damage): rooms placed one behind another along the round's line, each crossed along
// its longest side (an M crew quarters 3 x 2: 3 cells deep; an empty hold 2 x 2: 2 cells deep); 'line' is six
// quarters in a row (18 cells).
const TARGETS = { quarters: { type: 'quarters', rooms: 1 }, hold: { type: 'hold', rooms: 1 }, line: { type: 'quarters', rooms: 6 } };
// A room type's cell mass constant (13i.2, #235): crew rooms cellMass.crewed, the hold structure.cellMass.
const MASS = { quarters: (p) => p.cellMass.crewed, hold: (p) => p.structure.cellMass };
const depthOf = (type) => Math.max(...ROOMS[type].footprint.M);
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
// Crew a room of `type` holds at `edge` (L1): quarters crewPerCell (k = 2, rounded) per cell; a hold none.
const crewOf = (ctx, type, edge) => (type === 'quarters' ? Math.round(ctx.scaled(ctx.params.quarters.crewPerCell, edge)) * cellsOf(type) : 0);
// A whole number within 1e-9 counts as that number (float residue of three thirds), else floor.
const floorish = (x) => (Math.abs(x - Math.round(x)) <= 1e-9 * Math.max(1, x) ? Math.round(x) : Math.floor(x));
// The round rule written out (13i.1), independent of the kernel; r = 0 is a hole (it takes nothing).
function ownLoop(p0, A0, S, rs) {
  let p = p0, f = 0, A = A0;
  const taken = [];
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i], s = p / A;
    if (s > r && f + r / S < 1) { taken.push(r); p -= r * A; f += r / S; A = A0 / (1 - f); continue; }
    const t = Math.min(s, r);
    taken.push(t);
    return { passed: i, stoppedIn: i, depth: i + t / r, f: Math.min(1, f + t / S), p: 0, residual: 0, taken };
  }
  return { passed: rs.length, stoppedIn: -1, depth: null, f, p, residual: p / A, taken };
}

export default {
  id: 'L1.kinetic.damage.v3',
  level: 'L1',
  laws: ['kinetic damage is momentum (sectional momentum per cell)', 'protection is the mass on the path (#232)', 'every interaction is symmetric: the round flattens (#228, #230)', 'a hit damages a room cell partly; several hits wreck it', 'crew die in proportion to the integrity lost', 'square-cube scaling'],
  dependsOn: ['L0.kinetic.penetration.v3', 'L0.kinetic.overpen.v2'],
  setup: 'D1\'s setup (L1.kinetic.damage) under the cell masses and round rule of 13i: rooms alone (L1), lined up along a round\'s path and crossed along their longest side: one M crew quarters (3 cells deep, sigma = cellMass.crewed / edge^2), one empty M hold (2 cells deep, sigma = structure.cellMass / edge^2), and a line of six M quarters (18 cells); one S, M or L round (6 kg x sizeLinear^3 at T1, 800 m/s, a steel cylinder 4 diameters long) along the line; then 2 and 3 M rounds along the same line; the M cases at every tier T1-T6 (13i.4 P4)',
  measure: 'per round: cells passed, the stopping cell, continuous depth, what each cell took, the momentum and sectional momentum on exit; per cell: integrity after the rounds; per room: cumulative crew deaths; cell-damaged and cell-destroyed events',
  tolerance: 'depth, losses, integrity and exit momentum relative 1e-9 (1e-12 absolute at 0); counts exact; depth and losses across tiers relative 1e-9',
  criterion: 'each cell resists r = matter.kineticResistance x sigma and the round takes the same against S = matter.kineticResistance x rho_steel L (13i.1), round after round with destroyed cells as holes, by the scenario\'s own loop: cells passed, stopping cell and depth (estimates: quarters S and M stop in the 2nd cell, L in the 3rd, depths 1.078 / 1.498 / 2.191; through a hold every size exits keeping 0.627 / 0.756 / 0.839 of its momentum; the line: M stops in cell 2); a passed cell loses 1 / kinetic.hitsToWreck per round, the stopping cell (taken / r) / hitsToWreck, a hole nothing; cumulative crew deaths per room = floor(crew x (cells - sum of integrity) / cells), never more than its crew; after three M rounds the first quarters cell is destroyed; depth and every loss identical T1-T6 (#206, #230, #232, #235)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'matter.kineticResistance', 'cellMass.crewed', 'structure.cellMass', 'quarters.crewPerCell'],
  locked: { date: '2026-10-22', hash: '73c650fa' },
  cases() {
    const out = [];
    for (const target of ['quarters', 'hold', 'line']) {
      for (const size of ['S', 'M', 'L']) out.push({ target, size, rounds: 1, tier: 'T1' });
      for (const rounds of [2, 3]) out.push({ target, size: 'M', rounds, tier: 'T1' });
      for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) out.push({ target, size: 'M', rounds: 1, tier });
    }
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge, t = TARGETS[c.target], hits = p.kinetic.hitsToWreck.value;
    const m = ctx.scaled(p.kinetic.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, v = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const cR = p.matter.kineticResistance.value, S = cR * f.steelDensity.value * f.roundLengthToDiameter.value * D;
    const r = cR * (ctx.scaled(MASS[t.type](p), edge) / (edge * edge)), n = depthOf(t.type) * t.rooms;
    const line = new Array(n).fill(1), shots = [];
    for (let k = 0; k < c.rounds; k++) {
      const own = ownLoop(m * v, A0, S, line.map((g) => (g > 0 ? r : 0)));
      const losses = own.taken.map((x, i) => (line[i] === 0 ? 0 : (i < own.passed ? 1 : x / r) / hits));
      losses.forEach((x, i) => { const left = line[i] - x; line[i] = left > 1e-12 ? left : 0; });
      shots.push({ passed: own.passed, stoppedIn: own.stoppedIn, depth: own.depth, kept: own.p / (m * v), residual: own.residual, losses });
    }
    const crew = crewOf(ctx, t.type, edge), cells = cellsOf(t.type), depth = depthOf(t.type);
    const rooms = Array.from({ length: t.rooms }, (_, i) => {
      const lost = line.slice(i * depth, (i + 1) * depth).reduce((x, g) => x + (1 - g), 0);
      return { crew, deaths: Math.min(crew, floorish((crew * lost) / cells)) };
    });
    return { r, S, shots, line, rooms };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge, t = TARGETS[c.target];
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const rooms = Array.from({ length: t.rooms }, (_, i) => addRoom(world, t.type, { id: `${t.type}-${i + 1}`, position: [i * depthOf(t.type) * edge, 0] }));
    // Cells crossed along the longest side: footprint [w, h], cell k = j w + i; the line takes row j = 0.
    const [w] = ROOMS[t.type].footprint.M;
    const path = [];
    for (const room of rooms) for (let i = 0; i < depthOf(t.type); i++) path.push({ room, cell: w >= depthOf(t.type) ? i : i * w });
    const mass = ctx.scaled(p.kinetic.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const shots = [];
    for (let k = 1; k <= c.rounds; k++) {
      const s = fireRound(world, { mass, velocity, area: A }, path, `round-${k}`);
      shots.push({ passed: s.passed, stoppedIn: s.stoppedIn, depth: s.stoppedIn === -1 ? null : s.passed + s.absorbed[s.stoppedIn] / s.r[s.stoppedIn], kept: s.momentum / s.p0, residual: s.residual, losses: s.losses, r: s.r, booked: (s.impulse.reduce((x, y) => x + y, 0) + s.momentum) / s.p0 });
    }
    const ev = world.log.events;
    return {
      shots, line: path.map((x) => x.room.cells[x.cell].integrity),
      rooms: rooms.map((room) => ({ crew: room.crewTotal, aboard: room.crew, deaths: ev.filter((e) => e.type === 'crew-died' && e.room === room.id).reduce((x, e) => x + e.deaths, 0) })),
      damaged: ev.filter((e) => e.type === 'cell-damaged').length, destroyed: ev.filter((e) => e.type === 'cell-destroyed').length,
      books: rooms.map((room) => heatBooks(room.heat)), eventsOk: eventsOk(ev),
    };
  },
  compare(e, a, c, ctx) {
    const eq = (x, y) => (x === 0 ? Math.abs(y) <= 1e-12 : close(x, y, 1e-9));
    const hits = ctx.params.kinetic.hitsToWreck.value;
    // Events: every reach of a live cell is one cell-damaged event, or one cell-destroyed when it reaches 0.
    const reached = e.shots.reduce((x, s, k) => x + s.losses.filter((l) => l > 0).length, 0), destroyedEvents = e.line.filter((g) => g === 0).length;
    const checks = {
      'resistance per cell = matter.kineticResistance x sigma': a.shots.every((s) => s.r.every((r) => close(e.r, r, 1e-9))),
      'cells passed and the stopping cell, every round': a.shots.every((s, k) => s.passed === e.shots[k].passed && s.stoppedIn === e.shots[k].stoppedIn),
      'continuous depth by the round rule': a.shots.every((s, k) => (e.shots[k].depth === null ? s.depth === null : close(e.shots[k].depth, s.depth, 1e-9))),
      'losses: passed 1 / hitsToWreck, the stopping cell (taken / r) / hitsToWreck': a.shots.every((s, k) => s.losses.length === e.shots[k].losses.length && s.losses.every((x, i) => eq(e.shots[k].losses[i], x))),
      'momentum and sectional momentum on exit': a.shots.every((s, k) => eq(e.shots[k].kept, s.kept) && eq(e.shots[k].residual, s.residual)),
      'momentum books: p0 = sum taken + p on exit': a.shots.every((s) => close(1, s.booked, 1e-9)),
      'integrity of every cell': a.line.length === e.line.length && e.line.every((g, i) => eq(g, a.line[i])),
      'crew deaths by integrity lost': a.rooms.every((r, i) => r.crew === e.rooms[i].crew && r.deaths === e.rooms[i].deaths && r.deaths <= r.crew && r.aboard === r.crew - r.deaths),
      'cell-damaged and cell-destroyed events': a.destroyed === destroyedEvents && a.damaged === reached - destroyedEvents,
    };
    if (c.target !== 'hold' && c.size === 'M' && c.rounds >= hits) checks['the first quarters cell destroyed after hitsToWreck M rounds'] = a.line[0] === 0;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const m = rows.filter((r) => r.case.size === 'M' && r.case.rounds === 1);
    const same = (key) => ['quarters', 'hold', 'line'].every((t) => {
      const rs = m.filter((r) => r.case.target === t), ref = rs.find((r) => r.case.tier === 'T1');
      return rs.every((r) => key(r.actual.shots[0], ref.actual.shots[0]));
    });
    return [
      { name: 'M round: cells passed, stopping cell, depth and exit momentum identical T1-T6 (1e-9)', ok: same((s, ref) => s.passed === ref.passed && s.stoppedIn === ref.stoppedIn && (ref.depth === null ? s.depth === null : close(ref.depth, s.depth, 1e-9)) && Math.abs(s.kept - ref.kept) <= 1e-9 * Math.max(1e-12, ref.kept)) },
      { name: 'M round: every cell loss identical T1-T6 (1e-9)', ok: same((s, ref) => s.losses.length === ref.losses.length && s.losses.every((x, i) => (ref.losses[i] === 0 ? x === 0 : close(ref.losses[i], x, 1e-9)))) },
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, es = e.shots[e.shots.length - 1], as = a.shots[a.shots.length - 1];
    const f = (s) => (s.stoppedIn === -1 ? `passes ${s.passed}, exits keeping ${s.kept.toFixed(6)} of p0` : `depth ${s.depth.toFixed(6)}: stops in cell ${s.stoppedIn + 1} (loss ${s.losses[s.stoppedIn].toFixed(6)})`);
    const deaths = (rs) => rs.map((x) => x.deaths).join('/');
    return {
      expected: `${f(es)}; integrity [${e.line.map((g) => g.toFixed(4)).join(' ')}]; deaths ${deaths(e.rooms)}`,
      actual: `${f(as)}; integrity [${a.line.map((g) => g.toFixed(4)).join(' ')}]; deaths ${deaths(a.rooms)}; events damaged ${a.damaged}, destroyed ${a.destroyed}`,
    };
  },
};
