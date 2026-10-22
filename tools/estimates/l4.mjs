// tools/estimates/l4.mjs — the lead designer's estimates for the L4 plan
// (ship vs a static target, DESIGN.md 13l; #127, #82, #241 (1)). Reads js/
// only; changes nothing; never a canonical run:
//   node tools/estimates/l4.mjs [--set group.name=value ...]
// R1 (13f.2, as L3.r1.pinned builds it) is the target, at T1, at rest, its
// power routed, reactor at full demand, shield on or off as the case says. An
// attacker is modelled as a fire schedule only: one M turret (turret.fireRate)
// and one beam bay (beam.power) firing along axis-aligned lines through the
// target's grid, as a bow-on shooter at rest would; no time of flight (the
// target does not move), the round's velocity relative to the hull is the
// muzzle velocity (#242). The target does not fire back (static). Each route
// prints the time the target first loses every weapon and thrust, Disabled
// (that plus battle.disabledSeconds), or destroyed (a reactor or magazine
// explosion, #83), and the crew and cells lost.
// Disabled here is the rule the plan proposes (13l.1): a weapon or engine is
// able when it is not destroyed, controlled, not shut down, and joined
// through live walls to a reactor able to produce; the turret also needs a
// round in its ready store or in a magazine joined to it by live walls.
import { PARAMS, FIXED, TIERS, withOverrides, scaled } from '../../js/data.js';
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, fireRound, fireBeam, shieldRound, beamEnergy, cellAt, isDestroyed, survivingCells, magazineContents } from '../../js/rooms.js';
import { liveWalls } from '../../js/graph.js';
import { roundGeometry } from '../../js/projectile.js';

const args = process.argv.slice(2), overrides = {};
for (let i = 0; i < args.length; i++) if (args[i] === '--set') { const [k, v] = args[++i].split('='); overrides[k] = Number(v); }
const params = withOverrides(overrides);
const tier = TIERS.T1, edge = tier.edge;

const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];

function buildTarget({ shield = false, rooms = R1_ROOMS, fittings = R1_FITTINGS } = {}) {
  const world = createWorld({ params, edge, dt: FIXED.simStep.value, grid: tier.grid });
  for (const r of rooms) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of fittings) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  if (room('magazine')) loadMagazine(world, room('magazine'), { heMass: scaled(params.magazine.capacity, edge) });
  if (room('turret')) { loadTurret(room('turret'), params.turret.readyRounds.value); room('turret').turret.hold = true; }
  if (room('shield')) room('shield').shield.on = shield;
  enablePowerRouting(world);
  for (const r of world.rooms) if (r.type === 'reactor') setDemand(world, r, 1);
  enableShip(world);
  return { world, room };
}

// The cells of placed rooms a line meets in order, entering from `side` along row or column `k` (grid frame).
function line(world, side, k) {
  const [W, H] = tier.grid, out = [];
  const cells = side === '-y' ? [...Array(H).keys()].map((y) => [k, y]) : side === '+y' ? [...Array(H).keys()].reverse().map((y) => [k, y])
    : side === '+x' ? [...Array(W).keys()].reverse().map((x) => [x, k]) : [...Array(W).keys()].map((x) => [x, k]);
  let entry = null;
  for (const xy of cells) {
    const o = cellAt(world, xy);
    if (o) { out.push({ room: o.room, cell: o.index }); entry ??= xy; }
  }
  const dir = { '-y': [0, 1], '+y': [0, -1], '+x': [-1, 0], '-x': [1, 0] }[side];
  // The point where the line enters the hull (grid frame, m): the first cell's outer face.
  return { path: out, dir, entry: entry ? [(entry[0] + 0.5 - dir[0] / 2) * edge, (entry[1] + 0.5 - dir[1] / 2) * edge] : null };
}

// Able to fire or thrust (the rule 13l.1 proposes).
function abilities(world) {
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const producing = world.rooms.filter((r) => r.type === 'reactor' && !isDestroyed(r) && r.controlled && !r.shutdown && !r.reactor.scrammed);
  const reach = (from) => {
    const seen = new Set(from), q = [...from];
    for (let i = 0; i < q.length; i++) for (const w of walls) { const o = w.a === q[i] ? w.b : w.b === q[i] ? w.a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } }
    return seen;
  };
  const powered = reach(producing);
  const works = (r) => r && !isDestroyed(r) && r.controlled && !r.shutdown && r.active && powered.has(r);
  const mags = world.rooms.filter((r) => r.type === 'magazine' && !isDestroyed(r) && magazineContents(world, r).ap + magazineContents(world, r).he > 0);
  const able = { beam: false, turret: false, thrust: false };
  for (const r of world.rooms) {
    if (!works(r)) continue;
    if (r.type === 'beamBay') able.beam = true;
    if (r.type === 'engine') able.thrust = true;
    if (r.type === 'turret' && (r.turret.ammo > 0 || [...reach([r])].some((m) => mags.includes(m)))) able.turret = true;
  }
  return able;
}

const roundMass = scaled(params.kinetic.roundMass, edge) * FIXED.sizeLinear.value.M ** 3, v0 = params.kinetic.muzzleVelocity.value;
const { A } = roundGeometry(roundMass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value);
const shotEvery = 1 / scaled(params.turret.fireRate, edge), beamPower = scaled(params.beam.power, edge);
const disabledSeconds = params.battle.disabledSeconds.value;

/**
 * Run one route: `kinetic` and `beam` are lists of [side, k, roomId] lines, each used until roomId is destroyed,
 * then the next. Returns when Disabled is reached, the target is destroyed, or at `limit` s.
 */
function route(name, { kinetic = [], beam = [], shield = false, limit = 900, build = {} }) {
  const { world, room } = buildTarget({ shield, ...build });
  let next = 0, ki = 0, bi = 0, shots = 0, beamTime = 0, lostAt = null, end = null;
  const firstEvents = [];
  const bayE = beamEnergy(world, { length: 2 });
  while (world.t < limit) {
    // A line is used until its room is destroyed or none of that room's cells on the line is left.
    const spent = (l) => isDestroyed(room(l[2])) || !line(world, l[0], l[1]).path.some((x) => x.room.id === l[2] && !x.room.cells[x.cell].destroyed);
    while (ki < kinetic.length && spent(kinetic[ki])) ki++;
    while (bi < beam.length && spent(beam[bi])) bi++;
    if (ki < kinetic.length && world.t >= next - 1e-9) {
      const L = line(world, kinetic[ki][0], kinetic[ki][1]);
      const sh = shield ? shieldRound(world, { position: L.entry, mass: roundMass, velocity: v0, area: A, direction: L.dir }) : { velocity: v0 };
      if (sh.velocity > 0 && L.path.length) fireRound(world, { mass: roundMass, velocity: sh.velocity, area: A, direction: L.dir }, L.path, `shot-${shots}`);
      shots++; next += shotEvery;
    }
    if (bi < beam.length) {
      const L = line(world, beam[bi][0], beam[bi][1]);
      if (L.path.length) fireBeam(world, { power: beamPower, energy: bayE }, L.path, 'beam');
      beamTime += world.dt;
    }
    step(world);
    const exploded = world.rooms.find((r) => r.exploded && (r.type === 'reactor' || r.type === 'magazine'));
    if (exploded) { end = { kind: 'DESTROYED', by: exploded.id, t: world.t }; break; }
    const a = abilities(world);
    if (!a.beam && !a.turret && !a.thrust) { if (lostAt === null) lostAt = world.t; if (world.t - lostAt >= disabledSeconds - 1e-9) { end = { kind: 'DISABLED', t: world.t }; break; } }
    else lostAt = null;
  }
  for (const e of world.log.events || world.log) if (['scram', 'breach', 'shutdown', 'control-lost', 'explosion'].includes(e.type) && firstEvents.length < 6 && !firstEvents.some((f) => f.type === e.type && f.room === e.room)) firstEvents.push(e);
  const cellsLost = world.rooms.reduce((x, r) => x + r.cells.length - survivingCells(r), 0);
  const crew = world.rooms.reduce((x, r) => [x[0] + (r.crewTotal - r.crew), x[1] + r.crewTotal], [0, 0]);
  const wrecked = world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id);
  console.log(`${name.padEnd(34)} ${end ? `${end.kind} at ${end.t.toFixed(2)} s${end.by ? ` (${end.by})` : ''}` : `none by ${limit} s`}; lost all at ${lostAt === null ? '-' : lostAt.toFixed(2)} s; shots ${shots}, beam ${beamTime.toFixed(1)} s; cells lost ${cellsLost}; crew ${crew[0]}/${crew[1]}; wrecked [${wrecked.join(', ')}]`);
  console.log(`${''.padEnd(34)} first: ${firstEvents.map((e) => `${e.type} ${e.room} @${e.t.toFixed(2)} (${e.cause})`).join('; ')}`);
  return end;
}

console.log(`--- R1 target at T1, static; M round ${roundMass} kg at ${v0} m/s every ${shotEvery} s; beam ${beamPower / 1e6} MW (N = 2 bay energy); Disabled after ${disabledSeconds} s`);
// Decapitation: the bridge's columns 5 and 6 are open from -y (nothing below it).
route('decapitate, kinetic (-y cols 5, 6)', { kinetic: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']] });
route('decapitate, beam (-y cols 5, 6)', { beam: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']] });
route('decapitate, kinetic, shield on', { kinetic: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']], shield: true });
// Mission kill: beam bay (col 10, then col 9 through the bay into the turret), turret, engine (cols 0-2 from -y).
const mk = [['-y', 10, 'beamBay'], ['-y', 9, 'beamBay'], ['+y', 8, 'turret'], ['+y', 9, 'turret'], ['-y', 0, 'engine'], ['-y', 1, 'engine'], ['-y', 2, 'engine']];
route('mission kill, kinetic', { kinetic: mk });
route('mission kill, beam', { beam: mk });
route('mission kill, both', { kinetic: mk, beam: mk });
// Power: the reactor's own columns from -y (through the shield generator) and from +y (through the heat sink).
route('reactor, kinetic (-y cols 3, 4)', { kinetic: [['-y', 3, 'reactor'], ['-y', 4, 'reactor']] });
route('reactor, beam (-y cols 3, 4)', { beam: [['-y', 3, 'reactor'], ['-y', 4, 'reactor']] });
// Overheat: the beam held on one line whose rooms survive longest: along row 2 from the stern (engine, reactor ...).
route('beam along the axis from the stern', { beam: [['-x', 2, 'reactor'], ['-x', 3, 'reactor']], limit: 900 });
// The magazine: any route whose line crosses it.
route('magazine, kinetic (-y col 8 via hold)', { kinetic: [['-y', 8, 'magazine']] });
