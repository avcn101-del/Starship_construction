import { createWorld, addRoom, fireRound, destroyCell } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L3 scenario (13f.3), written out in each file so its lock covers them. These rooms stand
// alone (D1's line), so there is no ship: the momentum books are the round's, s0 = sum absorbed + residual.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const floorish = (x) => (Math.abs(x - Math.round(x)) <= 1e-9 * Math.max(1, x) ? Math.round(x) : Math.floor(x));

const ROOMS_IN_LINE = 6, DEPTH = Math.max(...ROOMS.quarters.footprint.M), CELLS = ROOMS.quarters.footprint.M[0] * ROOMS.quarters.footprint.M[1];
const HOLE = 1; // the 2nd cell of the line (cell 2 of the first quarters), destroyed beforehand

export default {
  id: 'L3.kinetic.hole',
  level: 'L3',
  laws: ['kinetic damage is momentum (sectional momentum per cell)', 'a destroyed cell is a hole: it resists no round (#212 (5))', 'crew die in proportion to the integrity lost'],
  dependsOn: ['L1.kinetic.damage'],
  setup: 'D1\'s line (L1.kinetic.damage): six M crew quarters standing alone in a row, crossed along their longest side (18 cells), one M round (6 kg at T1, 800 m/s, a steel cylinder 4 diameters long) along it; the line intact, and the same line with its 2nd cell destroyed beforehand (3 of the first quarters\' 18 crew die then); T1 and T6',
  measure: 'per cell: sectional momentum absorbed and integrity after the round; cells passed and the stopping cell; per room: cumulative crew deaths',
  tolerance: 'integrity and losses relative 1e-9 (1e-12 absolute at 0); counts exact; momentum books relative 1e-12',
  criterion: 'the destroyed cell takes nothing from the round (absorbs 0) and loses no integrity; every other cell resists R = room.kineticResistance, a passed cell losing 1 / kinetic.hitsToWreck, the stopping cell (s_left / R) / hitsToWreck (D pass); with depth d = s0 / R the round stops in cell floor(d) + 1 of the intact line (cell 11 at T1) and one cell deeper with the hole (cell 12), with the same stopping loss; deaths by the floor rule, floor(crew x (cells - sum of integrity) / cells); s0 = sum absorbed + residual (#206, #208, #212 (5), #216)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'room.kineticResistance', 'quarters.crewPerCell'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T6']) for (const line of ['intact', 'hole']) out.push({ tier, line });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge;
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value));
    const s0 = (m * v) / ((Math.PI * D * D) / 4), R = ctx.scaled(p.room.kineticResistance, edge), d = s0 / R, hits = p.kinetic.hitsToWreck.value;
    const n = DEPTH * ROOMS_IN_LINE, hole = c.line === 'hole' ? HOLE : -1;
    // Walk the line: a hole takes nothing; every other cell R until the round stops.
    let s = s0, stoppedIn = -1;
    const absorbed = [], line = [];
    for (let i = 0; i < n; i++) {
      if (i === hole) { absorbed.push(0); line.push(0); continue; }
      if (stoppedIn >= 0) { absorbed.push(0); line.push(1); continue; }
      if (s > R) { absorbed.push(R); s -= R; line.push(1 - 1 / hits); }
      else { absorbed.push(s); line.push(1 - s / R / hits); s = 0; stoppedIn = i; }
    }
    const crew = Math.round(ctx.scaled(p.quarters.crewPerCell, edge)) * CELLS;
    const rooms = Array.from({ length: ROOMS_IN_LINE }, (_, r) => {
      const lost = line.slice(r * DEPTH, (r + 1) * DEPTH).reduce((x, g) => x + (1 - g), 0);
      return { crew, deaths: Math.min(crew, floorish((crew * lost) / CELLS)) };
    });
    return { s0, R, depth: d, stoppedIn, stopLoss: (d - Math.floor(d)) / hits, absorbed, line, rooms, residual: s };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge;
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const rooms = Array.from({ length: ROOMS_IN_LINE }, (_, r) => addRoom(world, 'quarters', { id: `quarters-${r + 1}`, position: [r * DEPTH * edge, 0] }));
    const path = [];
    for (const room of rooms) for (let i = 0; i < DEPTH; i++) path.push({ room, cell: i }); // row j = 0 of a 3 x 2 footprint
    if (c.line === 'hole') destroyCell(world, path[HOLE].room, path[HOLE].cell, 'hole');
    const mass = ctx.scaled(p.kinetic.roundMass, edge), velocity = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const r = fireRound(world, { mass, velocity, area: A }, path, 'round-1');
    const ev = world.log.events;
    return {
      s0: r.s0, absorbed: r.absorbed, residual: r.residual, passed: r.passed, stoppedIn: r.stoppedIn, losses: r.losses,
      line: path.map((x) => x.room.cells[x.cell].integrity),
      rooms: rooms.map((room) => ({ crew: room.crewTotal, aboard: room.crew, deaths: ev.filter((e) => e.type === 'crew-died' && e.room === room.id).reduce((x, e) => x + e.deaths, 0) })),
      books: rooms.map((room) => heatBooks(room.heat)), eventsOk: eventsOk(ev),
    };
  },
  compare(e, a, c) {
    const eq = (x, y) => (x === 0 ? Math.abs(y) <= 1e-12 : close(x, y, 1e-9));
    const checks = {
      'stopping cell': a.stoppedIn === e.stoppedIn,
      'stopping loss = (s_left / R) / hitsToWreck': close(e.stopLoss, a.losses[a.stoppedIn], 1e-9),
      'momentum absorbed per cell': a.absorbed.length === e.stoppedIn + 1 && a.absorbed.every((x, i) => eq(e.absorbed[i], x)),
      'integrity of every cell': e.line.every((g, i) => eq(g, a.line[i])),
      'crew deaths by the floor rule': a.rooms.every((r, i) => r.crew === e.rooms[i].crew && r.deaths === e.rooms[i].deaths && r.aboard === r.crew - r.deaths),
      'momentum books: s0 = sum absorbed + residual': close(a.s0, a.absorbed.reduce((x, y) => x + y, 0) + a.residual, 1e-12),
    };
    if (c.line === 'hole') checks['the hole takes nothing and loses nothing'] = a.absorbed[HOLE] === 0 && a.losses[HOLE] === 0 && a.line[HOLE] === 0;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const pairs = ['T1', 'T6'].map((t) => [rows.find((r) => r.case.tier === t && r.case.line === 'intact'), rows.find((r) => r.case.tier === t && r.case.line === 'hole')]);
    return [
      { name: 'with the hole the round stops one cell deeper, with the same stopping loss, at each tier', ok: pairs.every(([i, h]) => h.actual.stoppedIn === i.actual.stoppedIn + 1 && close(i.actual.losses[i.actual.stoppedIn], h.actual.losses[h.actual.stoppedIn], 1e-9)) },
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `depth ${e.depth.toFixed(4)} cells: stops in cell ${e.stoppedIn + 1} (loss ${e.stopLoss.toFixed(6)}); deaths ${e.rooms.map((x) => x.deaths).join('/')}`,
      actual: `stops in cell ${a.stoppedIn + 1} (loss ${a.losses[a.stoppedIn].toFixed(6)}); cell 2 absorbed ${a.absorbed[HOLE].toExponential(3)}, integrity ${a.line[HOLE].toFixed(4)}; deaths ${a.rooms.map((x) => x.deaths).join('/')}`,
    };
  },
};
