import { createWorld, addRoom, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them;
// 'cell-damaged' (#206) carries channel, cell and integrity.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// Targets: rooms placed one behind another along the round's line, each crossed along its longest side
// (an M crew quarters 3 x 2: 3 cells deep; an empty hold 2 x 2: 2 cells deep). 'quarters' and 'hold' are the
// row's single rooms; 'line' is six quarters in a row (18 cells), added so that every size stops inside the
// line and the stopping cell's share is measured (S stops in its 7th cell, M in its 11th, L in its 16th).
const TARGETS = { quarters: { type: 'quarters', rooms: 1 }, hold: { type: 'hold', rooms: 1 }, line: { type: 'quarters', rooms: 6 } };
const depthOf = (type) => Math.max(...ROOMS[type].footprint.M);
const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
// Crew a room of `type` holds at `edge` (L1): quarters crewPerCell (k = 2, rounded) per cell; a hold none.
const crewOf = (ctx, type, edge) => (type === 'quarters' ? Math.round(ctx.scaled(ctx.params.quarters.crewPerCell, edge)) * cellsOf(type) : 0);
// A whole number within 1e-9 counts as that number (float residue of three thirds), else floor.
const floorish = (x) => (Math.abs(x - Math.round(x)) <= 1e-9 * Math.max(1, x) ? Math.round(x) : Math.floor(x));

export default {
  id: 'L1.kinetic.damage',
  level: 'L1',
  laws: ['kinetic damage is momentum (sectional momentum per cell)', 'a hit damages a room cell partly; several hits wreck it', 'crew die in proportion to the integrity lost', 'square-cube scaling'],
  dependsOn: ['L0.kinetic.penetration.v2', 'L0.kinetic.overpen'],
  setup: 'rooms alone (L1), lined up along a round\'s path and crossed along their longest side: one M crew quarters (3 cells deep), one empty M hold (2 cells deep), and a line of six M quarters (18 cells); one S, M or L round (6 kg x sizeLinear^3 at T1, 800 m/s, a steel cylinder 4 diameters long) along the line; then 2 and 3 M rounds along the same line; the M cases at every tier T1-T6 (13e.3 D1, #206)',
  measure: 'per cell: integrity after each round; cells passed and the stopping cell; sectional momentum left on exit; per room: cumulative crew deaths and crew-died events; cell-damaged and cell-destroyed events',
  tolerance: 'integrity and exit momentum relative 1e-9 (1e-12 absolute at 0); counts exact; depth across tiers relative 1e-9',
  criterion: 'each cell resists R = room.kineticResistance (k = 1) of the sectional momentum s0 = m v / (pi D^2 / 4); with depth d = s0 / R the round passes min(cells, floor(d)) cells, each losing 1 / kinetic.hitsToWreck of its integrity per round; the cell it stops in loses (d - floor(d)) / hitsToWreck; after k rounds a passed cell holds 1 - k / hitsToWreck (destroyed at 0: after 3 M rounds every passed cell); cumulative crew deaths per room = floor(crew x (cells - sum of integrity) / cells), never more than its crew; the exit momentum is s0 - cells x R when the round passes the whole line; depth and every loss identical T1-T6 (#137, #165, #203 D, #206)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'room.kineticResistance', 'quarters.crewPerCell'],
  locked: null,
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
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge, t = TARGETS[c.target];
    const m = ctx.scaled(p.kinetic.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, v = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value));
    const s0 = (m * v) / ((Math.PI * D * D) / 4), R = ctx.scaled(p.room.kineticResistance, edge), d = s0 / R, hits = p.kinetic.hitsToWreck.value;
    const depth = depthOf(t.type), n = depth * t.rooms, passed = Math.min(n, Math.floor(d)), frac = passed < n ? d - passed : 0;
    // Integrity of each cell on the line after c.rounds rounds.
    const line = Array.from({ length: n }, (_, i) => (i < passed ? Math.max(0, 1 - c.rounds / hits) : i === passed ? 1 - (c.rounds * frac) / hits : 1));
    const crew = crewOf(ctx, t.type, edge), cells = cellsOf(t.type);
    const rooms = Array.from({ length: t.rooms }, (_, r) => {
      const lost = line.slice(r * depth, (r + 1) * depth).reduce((x, g) => x + (1 - g), 0);
      return { crew, deaths: Math.min(crew, floorish((crew * lost) / cells)) };
    });
    return {
      s0, R, depth: d, passed, stoppedIn: passed < n ? passed : -1, stopLoss: frac / hits, passLoss: 1 / hits,
      exit: passed === n ? s0 - n * R : 0, line, rooms, destroyed: line.filter((g) => g === 0).length,
    };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge, t = TARGETS[c.target];
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const rooms = Array.from({ length: t.rooms }, (_, r) => addRoom(world, t.type, { id: `${t.type}-${r + 1}`, position: [r * depthOf(t.type) * edge, 0] }));
    // Cells crossed along the longest side: footprint [w, h], cell k = j w + i; the line takes row j = 0.
    const [w] = ROOMS[t.type].footprint.M;
    const path = [];
    for (const room of rooms) for (let i = 0; i < depthOf(t.type); i++) path.push({ room, cell: w >= depthOf(t.type) ? i : i * w });
    const mass = ctx.scaled(p.kinetic.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const shots = [];
    for (let k = 1; k <= c.rounds; k++) {
      const r = fireRound(world, { mass, velocity, area: A }, path, `round-${k}`);
      shots.push({ passed: r.passed, stoppedIn: r.stoppedIn, residual: r.residual, losses: r.losses, depth: r.absorbed.reduce((x, a) => x + a / r.R, 0) });
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
    const hits = ctx.params.kinetic.hitsToWreck.value, reached = e.stoppedIn === -1 ? e.passed : e.passed + 1;
    // Events: every reach of a cell is one cell-damaged event, or one cell-destroyed when it reaches 0.
    const destroyedEvents = e.line.filter((g) => g === 0).length, damagedEvents = c.rounds * reached - destroyedEvents;
    const checks = {
      'cells passed and the stopping cell, every round': a.shots.every((s) => s.passed === e.passed && s.stoppedIn === e.stoppedIn),
      'loss per passed cell = 1 / hitsToWreck': a.shots.every((s) => s.losses.slice(0, e.passed).every((x) => close(e.passLoss, x, 1e-9))),
      'stopping cell loss = (s_left / R) / hitsToWreck': e.stoppedIn === -1 || a.shots.every((s) => close(e.stopLoss, s.losses[e.passed], 1e-9)),
      'continuous depth = s0 / R (inside the line)': e.stoppedIn === -1 || a.shots.every((s) => close(e.depth, s.depth, 1e-9)),
      'exit momentum': a.shots.every((s) => eq(e.exit, s.residual)),
      'integrity of every cell': a.line.length === e.line.length && e.line.every((g, i) => eq(g, a.line[i])),
      'crew deaths by integrity lost': a.rooms.every((r, i) => r.crew === e.rooms[i].crew && r.deaths === e.rooms[i].deaths && r.deaths <= r.crew && r.aboard === r.crew - r.deaths),
      'cell-damaged and cell-destroyed events': a.destroyed === destroyedEvents && a.damaged === damagedEvents,
      'three M rounds destroy every passed cell': c.rounds < hits || a.line.slice(0, e.passed).every((g) => g === 0),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const m = rows.filter((r) => r.case.size === 'M' && r.case.rounds === 1);
    const same = (key) => ['quarters', 'hold', 'line'].every((t) => {
      const rs = m.filter((r) => r.case.target === t), ref = rs.find((r) => r.case.tier === 'T1');
      return rs.every((r) => key(r, ref));
    });
    return [
      { name: 'M round: depth and stopping cell identical T1-T6', ok: same((r, ref) => close(ref.actual.shots[0].depth, r.actual.shots[0].depth, 1e-9) && r.actual.shots[0].passed === ref.actual.shots[0].passed && r.actual.shots[0].stoppedIn === ref.actual.shots[0].stoppedIn) },
      { name: 'M round: every cell loss identical T1-T6', ok: same((r, ref) => r.actual.shots[0].losses.length === ref.actual.shots[0].losses.length && r.actual.shots[0].losses.every((x, i) => close(ref.actual.shots[0].losses[i], x, 1e-9))) },
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, s = a.shots[a.shots.length - 1];
    const deaths = (rs) => rs.map((x) => x.deaths).join('/');
    return {
      expected: `depth ${e.depth.toFixed(4)} cells: passes ${e.passed}${e.stoppedIn === -1 ? `, exits with ${e.exit.toExponential(4)}` : `, stops in cell ${e.stoppedIn + 1} (loss ${e.stopLoss.toFixed(6)})`}; pass loss ${e.passLoss.toFixed(6)}; integrity [${e.line.map((g) => g.toFixed(4)).join(' ')}]; deaths ${deaths(e.rooms)}`,
      actual: `depth ${s.depth.toFixed(4)} cells: passes ${s.passed}${s.stoppedIn === -1 ? `, exits with ${s.residual.toExponential(4)}` : `, stops in cell ${s.stoppedIn + 1} (loss ${s.losses[s.passed].toFixed(6)})`}; integrity [${a.line.map((g) => g.toFixed(4)).join(' ')}]; deaths ${deaths(a.rooms)}; events damaged ${a.damaged}, destroyed ${a.destroyed}`,
    };
  },
};
