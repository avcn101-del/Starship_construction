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
// Disabled here is the rule of 13l.1 as amended by #255: no weapon able to fire
// for battle.disabledSeconds (thrust no longer counts). A weapon is
// able when it is not destroyed, controlled, not shut down, and joined
// through live walls to a reactor able to produce; the turret also needs a
// round in its ready store or in a magazine joined to it by live walls.
import { PARAMS, FIXED, TIERS, withOverrides, scaled } from '../../js/data.js';
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, fireRound, fireBeam, shieldRound, beamEnergy, cellAt, pathAlong, isDestroyed, survivingCells, magazineContents } from '../../js/rooms.js';
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
  const dir = { '-y': [0, 1], '+y': [0, -1], '+x': [-1, 0], '-x': [1, 0] }[side];
  // The kernel's own path: room cells in order and, before each, the plate its segment carries (13l.1, #258).
  const path = pathAlong(world, cells, null, dir);
  let entry = null;
  for (const xy of cells) if (cellAt(world, xy)) { entry = xy; break; }
  out.push(...path);
  // The point where the line enters the hull (grid frame, m): the first cell's outer face.
  return { path: out, dir, entry: entry ? [(entry[0] + 0.5 - dir[0] / 2) * edge, (entry[1] + 0.5 - dir[1] / 2) * edge] : null };
}

// Able to fire or thrust (13l.1); Disabled needs no able weapon only: thrust no longer counts (#255, the design
// partner's (c)), so `thrust` is printed, not tested.
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
    const spent = (l) => isDestroyed(room(l[2])) || !line(world, l[0], l[1]).path.some((x) => x.room && x.room.id === l[2] && !x.room.cells[x.cell].destroyed);
    while (ki < kinetic.length && spent(kinetic[ki])) ki++;
    while (bi < beam.length && spent(beam[bi])) bi++;
    if (ki < kinetic.length && world.t >= next - 1e-9) {
      const L = line(world, kinetic[ki][0], kinetic[ki][1]);
      if (!L.path.length) { ki++; continue; }
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
    const boom = world.log.events.find((e) => e.type === 'explosion'); // the first explosion is a reactor's or a magazine's
    if (boom) { end = { kind: 'DESTROYED', by: boom.room, t: world.t }; break; }
    const a = abilities(world);
    if (!a.beam && !a.turret) { if (lostAt === null) lostAt = world.t; if (world.t - lostAt >= disabledSeconds - 1e-9) { end = { kind: 'DISABLED', t: world.t }; break; } }
    else lostAt = null;
  }
  for (const e of world.log.events || world.log) if (['scram', 'breach', 'shutdown', 'control-lost', 'explosion'].includes(e.type) && firstEvents.length < 6 && !firstEvents.some((f) => f.type === e.type && f.room === e.room)) firstEvents.push(e);
  const cellsLost = world.rooms.reduce((x, r) => x + r.cells.length - survivingCells(r), 0);
  const crew = world.rooms.reduce((x, r) => [x[0] + (r.crewTotal - r.crew), x[1] + r.crewTotal], [0, 0]);
  const wrecked = world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id);
  console.log(`${name.padEnd(34)} ${end ? `${end.kind} at ${end.t.toFixed(2)} s${end.by ? ` (${end.by})` : ''}` : `none by ${limit} s`}; lost all at ${lostAt === null ? '-' : lostAt.toFixed(2)} s; shots ${shots}, beam ${beamTime.toFixed(1)} s; cells lost ${cellsLost}; crew ${crew[0]}/${crew[1]}; wrecked [${wrecked.join(', ')}]`);
  const hurt = world.rooms.filter((r) => !isDestroyed(r) && r.cells.some((c) => c.integrity < 1)).map((r) => `${r.id} ${(r.cells.reduce((x, c) => x + c.integrity, 0) / r.cells.length).toFixed(2)}${r.shutdown ? ' shut down' : ''}`);
  console.log(`${''.padEnd(34)} damaged, not destroyed (mean integrity): ${hurt.join(', ') || '-'}`);
  console.log(`${''.padEnd(34)} first: ${firstEvents.map((e) => `${e.type} ${e.room} @${e.t.toFixed(2)} (${e.cause})`).join('; ')}`);
  return end;
}

// R1c (13l.2, #256): eight plates around the magazine; R1d (#261): R1c plus five around the turret.
const R1C_FITTINGS = [...R1_FITTINGS,
  ['armour', 'magazine', [7, 2], [-1, 0]], ['armour', 'magazine', [7, 3], [-1, 0]], ['armour', 'magazine', [8, 2], [1, 0]], ['armour', 'magazine', [8, 3], [1, 0]],
  ['armour', 'magazine', [7, 2], [0, -1]], ['armour', 'magazine', [8, 2], [0, -1]], ['armour', 'magazine', [7, 3], [0, 1]], ['armour', 'magazine', [8, 3], [0, 1]]];
const R1D_FITTINGS = [...R1C_FITTINGS,
  ['armour', 'turret', [8, 5], [0, 1]], ['armour', 'turret', [9, 5], [0, 1]], ['armour', 'turret', [9, 4], [1, 0]], ['armour', 'turret', [9, 5], [1, 0]], ['armour', 'turret', [9, 4], [0, -1]]];
for (const [name, fittings] of [['R1', R1_FITTINGS], ['R1c', R1C_FITTINGS], ['R1d', R1D_FITTINGS]]) {
  const { world } = buildTarget({ fittings });
  const b = world.ship.bodies[0];
  console.log(`${name}: mass ${b.M.toFixed(1)} kg, ${(scaled(params.engine.thrust, edge) / b.M / 9.80665).toFixed(4)} g, centre (${b.c ? b.c.map((x) => x.toFixed(3)).join(', ') : '-'}), I ${b.I.toExponential(6)}`);
}
console.log(`--- R1 target at T1, static; M round ${roundMass} kg at ${v0} m/s every ${shotEvery} s; beam ${beamPower / 1e6} MW (N = 2 bay energy); Disabled after ${disabledSeconds} s`);
// Decapitation: the bridge's columns 5 and 6 are open from -y (nothing below it).
route('decapitate, kinetic (-y cols 5, 6)', { kinetic: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']] });
route('decapitate, beam (-y cols 5, 6)', { beam: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']] });
route('decapitate, kinetic, shield on', { kinetic: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']], shield: true });
// Mission kill: beam bay (col 10, then col 9 through the bay into the turret), then the turret.
const mk = [['-y', 10, 'beamBay'], ['-y', 9, 'beamBay'], ['+y', 8, 'turret'], ['+y', 9, 'turret']]; // weapons only (#255)
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

// ---------- target variants (13l.2): one per route R1 cannot show ----------
import { validateShip } from '../../js/layout.js';
import { ROOMS } from '../../js/data.js';
const check = (name, rooms) => {
  const v = validateShip({ grid: tier.grid, edge, rooms: rooms.map((r) => ({ ...r, size: 'M' })), fittings: [] }, ROOMS);
  console.log(`  layout ${name}: ${v.valid ? 'valid' : v.reasons.map((r) => `${r.rule} ${r.room}: ${r.detail}`).join('; ')}`);
};
// T-neck: an aft section (engine, reactor, shield, heat sink) joined to a forward section (bridge, magazine, beam bay,
// quarters, turret) only through a 2 x 2 hold, open from -y and +y. Split there: the bridge half has no reactor, the
// reactor half no bridge (SCRAM).
const T_NECK = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'hold', type: 'hold', cell: [5, 2] },
  { id: 'bridge', type: 'bridge', cell: [7, 2] }, { id: 'magazine', type: 'magazine', cell: [9, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [11, 2] }, { id: 'quarters', type: 'quarters', cell: [7, 4] },
  { id: 'turret', type: 'turret', cell: [10, 4] },
];
// T-hot: R1 without its beam bay (the turret its only weapon, a crewed room with low thresholds); the bow cells are holds.
const T_HOT = R1_ROOMS.map((r) => (r.id === 'beamBay' ? { id: 'bowHold', type: 'hold', cell: [9, 2] } : r));
// T-dry: an emplacement: R1 without engine and beam bay (a hold aft, a hold at the bow); it fires its turret until dry.
const T_DRY = T_HOT; // under #255 one layout (T-gun) shows both: the turret is its only weapon
console.log('--- variants');
check('T-neck', T_NECK); check('T-gun', T_HOT);
route('T-neck: split at the hold (-y cols 5, 6)', { kinetic: [['-y', 5, 'hold'], ['-y', 6, 'hold']], build: { rooms: T_NECK, fittings: [] } });
route('T-neck: naive, the beam bay first', { kinetic: [['-y', 11, 'beamBay'], ['-y', 12, 'beamBay']], build: { rooms: T_NECK, fittings: [] }, limit: 120 });
route('T-gun: beam on the turret (+x rows 5, 4)', { beam: [['+x', 5, 'turret'], ['+x', 4, 'turret']], build: { rooms: T_HOT, fittings: [] } });
// T-gun as T-dry: nobody shoots it; it fires its turret (hold off, aimed broadside) until the ready store and the magazine are empty.
{
  const { world, room } = buildTarget({ rooms: T_DRY, fittings: [] });
  room('turret').turret.hold = false; room('turret').turret.aim = [0, 1];
  let lostAt = null, end = null;
  while (world.t < 900) {
    step(world);
    if (world.ship.rounds) world.ship.rounds.length = Math.min(world.ship.rounds.length, 0); // rounds leave; their books are not this estimate's
    const a = abilities(world);
    if (!a.beam && !a.turret) { if (lostAt === null) lostAt = world.t; if (world.t - lostAt >= disabledSeconds - 1e-9) { end = world.t; break; } } else lostAt = null;
  }
  const mag = magazineContents(world, room('magazine'));
  console.log(`T-gun: fires until dry: last round gone at ${lostAt === null ? '-' : lostAt.toFixed(2)} s, Disabled at ${end === null ? '-' : end.toFixed(2)} s; magazine left ${mag.ap + mag.he}; expected (ready ${params.turret.readyRounds.value} + ${scaled(params.magazine.capacity, edge) / roundMass} rounds) x ${shotEvery} s = ${((params.turret.readyRounds.value + scaled(params.magazine.capacity, edge) / roundMass) * shotEvery).toFixed(0)} s`);
}

// ---------- R1c (13l.2, #256): A10's literals, from R1's readout and the plates as point masses ----------
// Run-time only (#241 (1)): R1 is built by the kernel without plates; each plate of armour.plateThickness (0.2 m,
// planned, unless data.js holds it) adds d x FIXED.steelDensity x edge^2 at its segment's midpoint, combined here by
// the parallel-axis rule, so the literals do not come from the kernel's plate code.
import { readout } from '../../js/rooms.js';
{
  const { world } = buildTarget();
  const r1 = readout(world), d = params.armour.plateThickness ? scaled(params.armour.plateThickness, edge) : 0.2 * (edge / 5);
  const m = d * FIXED.steelDensity.value * edge * edge;
  const segments = [[[7, 2], [-1, 0]], [[7, 3], [-1, 0]], [[8, 2], [1, 0]], [[8, 3], [1, 0]], [[7, 2], [0, -1]], [[8, 2], [0, -1]], [[7, 3], [0, 1]], [[8, 3], [0, 1]]];
  const pts = segments.map(([c, s]) => [(c[0] + 0.5 + s[0] / 2) * edge, (c[1] + 0.5 + s[1] / 2) * edge]);
  const M = r1.mass + m * pts.length;
  const c = [(r1.mass * r1.centre[0] + m * pts.reduce((x, p) => x + p[0], 0)) / M, (r1.mass * r1.centre[1] + m * pts.reduce((x, p) => x + p[1], 0)) / M];
  const d2 = (p) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
  const I = r1.inertia + r1.mass * d2(r1.centre) + m * pts.reduce((x, p) => x + d2(p), 0);
  const g = scaled(params.engine.thrust, edge) / M / FIXED.standardGravity.value;
  console.log(`--- R1c at T1: R1 ${r1.mass} kg + 8 plates x ${m} kg (d ${d} m) = ${M} kg (${(M - r1.mass).toFixed(6)} kg of plates); ${g.toPrecision(6)} g`);
  console.log(`    centre (${c[0].toPrecision(17)}, ${c[1].toPrecision(17)}) m; inertia ${I.toPrecision(17)} kg m^2 (R1: centre (${r1.centre.map((x) => x.toPrecision(17)).join(', ')}), inertia ${r1.inertia.toPrecision(17)})`);
}

// ---------- the L4a fix round (#258): literals of L0.armour.plate.v2 and L0.beam.csda.sweep ----------
// Arithmetic from the constants, outside the kernel's plate code; the thin-plate fractions use the kernel's pure
// beamDeposit (the checker's independent value is 0.5212 / 0.4788, checker/l4a-phase2.md).
import { beamDeposit, csdaSteps } from '../../js/damage.js';
{
  const rho = FIXED.steelDensity.value, q = params.matter.burnEnergyPerKg.value, P = scaled(params.beam.power, edge), dt = FIXED.simStep.value;
  const perKg = scaled(params.thermal.coupledArmour, edge) / scaled(params.armour.cellMass, edge), Chold = 4 * scaled(params.thermal.coupledHold, edge);
  console.log(`--- #258 plates: steel ${perKg} J/(kg K); hold C ${Chold} J/K; beam ${P} W, dt ${dt} s, q ${q} J/kg`);
  for (const d of [0.2, 0.15, 0.1, 0.01]) {
    const m = d * rho * edge * edge, ruin = (q * m) / P;
    console.log(`  d ${d} m: sigma ${d * rho} kg/m^2, mass ${m} kg, C ${m * perKg} J/K (hold with it ${Chold + m * perKg} J/K); burn per step at F = 1 ${(P * dt) / (q * m)}; ruin at F = 1 ${ruin} s = ${ruin / dt} steps`);
  }
  const d = 0.2, cap = edge / d;
  console.log(`  sigma / cos: 45 deg ${(d * rho) / Math.SQRT1_2} kg/m^2 (0.1 m: ${(0.1 * rho) / Math.SQRT1_2}); cap (cos >= d / edge = ${d / edge}) ${d * rho * cap} kg/m^2 = rho x edge ${rho * edge}`);
  const iron = { protonRest: FIXED.protonRestEnergy.value, electronRest: FIXED.electronRestEnergy.value, K: FIXED.betheK.value, ZA: FIXED.ironZOverA.value, I: FIXED.ironMeanExcitation.value, lambda: FIXED.ironInteractionLength.value };
  const E = 100 * 1.602176634e-13, F = beamDeposit(E, [0.01 * rho, 120, 120], iron).fractions;
  console.log(`  thin plate (0.01 m), 100 MeV: fractions ${F.map((x) => x.toPrecision(17)).join(', ')}; plate burn per step ${(P * F[0] * dt) / (q * 0.01 * rho * edge * edge)}`);
  // csdaSteps' count changes between 10 and 400 MeV: a log scan of 4000 energies, each change bisected (the reviewer's sweep).
  const MEV = 1.602176634e-13, N = 4000;
  let changes = 0, prev = csdaSteps(10 * MEV, iron).steps;
  for (let k = 1; k <= N; k++) { const n = csdaSteps(10 * MEV * 40 ** (k / N), iron).steps; changes += Math.abs(n - prev); prev = n; }
  console.log(`  csdaSteps changes 10-400 MeV (4000-point scan): ${changes}; steps ${csdaSteps(10 * MEV, iron).steps} -> ${csdaSteps(400 * MEV, iron).steps}`);
}

// ---------- R1d, the reference ship of L4b (#261): the kill routes against the citadel ----------
console.log('--- R1d');
route('R1d: decapitate, kinetic (-y cols 5, 6)', { kinetic: [['-y', 5, 'bridge'], ['-y', 6, 'bridge']], build: { fittings: R1D_FITTINGS } });
route('R1d: magazine, kinetic (-y col 8 via hold and plate)', { kinetic: [['-y', 8, 'magazine'], ['-y', 7, 'magazine']], build: { fittings: R1D_FITTINGS } });
route('R1d: magazine, beam (-y col 8)', { beam: [['-y', 8, 'magazine'], ['-y', 7, 'magazine']], build: { fittings: R1D_FITTINGS } });
route('R1d: mission kill, kinetic (turret plated)', { kinetic: mk, build: { fittings: R1D_FITTINGS } });
route('R1d: mission kill, beam', { beam: mk, build: { fittings: R1D_FITTINGS } });
route('R1d: reactor, kinetic (-y cols 3, 4)', { kinetic: [['-y', 3, 'reactor'], ['-y', 4, 'reactor']], build: { fittings: R1D_FITTINGS } });
