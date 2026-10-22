import { createWorld, addRoom, setActive, step, loadMagazine } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: rows.every((r) => booksOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const firstEvent = (world, type) => world.log.events.find((e) => e.type === type) || null;
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// The nine L1 rooms (#181): the eight rooms of #127 that are rooms (the radiator
// is a fitting) plus the beam bay, and the empty hold.
const TYPES = ['bridge', 'reactor', 'engine', 'magazine', 'shieldGenerator', 'quarters', 'beamBay', 'turret', 'hold'];
// External test source (W), chosen so no threshold time falls on a step.
const P_EXT = 1.1e6;

// The thermally coupled heat capacity per cell of each room type (#240 (1), DESIGN.md 13k.2), written out here, not read from ROOMS.
const COUPLED = { bridge: 'coupledCrewed', quarters: 'coupledCrewed', turret: 'coupledCrewed', missileBay: 'coupledCrewed', reactor: 'coupledReactor', engine: 'coupledEngine', beamBay: 'coupledBeamBay', shieldGenerator: 'coupledShieldGenerator', magazine: 'coupledMagazine', hold: 'coupledHold', heatSink: 'coupledHeatSink', railgun: 'coupledRailgun' };

export default {
  id: 'L1.room.thresholds.v2',
  level: 'L1',
  laws: ['three heat thresholds per room', 'crew die at critical heat', 'magazines cook off', 'reactors melt down'],
  dependsOn: [],
  setup: 'each of the nine rooms (bridge, reactor, engine, magazine, shield generator, quarters, beam bay, turret, hold), size M at T1, switched off (no own generation), no radiator, heated by an external 1.1 MW; the magazine is full of M HE rounds; run until critical + 1 s',
  measure: 'times of the hot, overheated and critical events; their order; the shutdown at overheated; crew deaths at critical; the cook-off and meltdown explosions',
  tolerance: 'times one-sided (expected <= actual < expected + dt); counts exact; energies relative 1e-9',
  criterion: 't_x = C (T_x - T_rest) / P for hot, overheated and critical of the room\'s class, one-sided; events in that order; the room shuts down at overheated; at critical the room\'s crew die (deaths = crew housed or required); the magazine cooks off (explosion of its contents) and the reactor melts down (explosion of reactor.explosionEnergy) at critical, with cause \'heat\'; no other room explodes (#18b, #181, #182) Successor of L1.room.thresholds (#240, #243, 13k.4 S16): C = cells x the room type\'s thermally coupled heat capacity per cell (13k.2) in place of thermal.heatCapacityPerCell.',
  tunable: ['thermal.coupledReactor', 'thermal.coupledBeamBay', 'thermal.coupledEngine', 'thermal.coupledShieldGenerator', 'thermal.coupledCrewed', 'thermal.coupledMagazine', 'thermal.coupledHold', 'thermal.coupledHeatSink', 'thermal.plantHot', 'thermal.plantOverheated', 'thermal.plantCritical', 'thermal.crewedHot', 'thermal.crewedOverheated', 'thermal.crewedCritical', 'thermal.magazineHot', 'thermal.magazineOverheated', 'thermal.magazineCritical'],
  locked: null,
  cases() {
    return TYPES.map((type) => ({ type }));
  },
  expected(ctx, c) {
    const def = ROOMS[c.type], [w, h] = def.footprint.M, cells = w * h, th = ctx.params.thermal, p = ctx.params;
    const C = cells * th[COUPLED[c.type]].value, rest = ctx.fixed.restTemperature.value, cls = def.thermalClass;
    const t = (name) => (C * (th[cls + name].value - rest)) / P_EXT;
    const deaths = def.crew === 'housed' ? p.quarters.crewPerCell.value * cells : def.crew ? p.crewRequired[c.type].value : 0;
    let explosion = null;
    if (c.type === 'magazine') explosion = Math.floor(p.magazine.capacity.value / p.kinetic.roundMass.value) * (p.kinetic.chargeEnergy.value + p.he.blastEnergy.value);
    if (c.type === 'reactor') explosion = p.reactor.explosionEnergy.value;
    return { hot: t('Hot'), overheated: t('Overheated'), critical: t('Critical'), deaths, explosion, dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, c.type);
    setActive(world, room, false);
    if (c.type === 'magazine') loadMagazine(world, room, { size: 'M', heMass: ctx.params.magazine.capacity.value });
    room.externalPower = P_EXT;
    let end = Infinity;
    while (world.t < Math.min(end, 5000)) {
      step(world);
      if (end === Infinity && firstEvent(world, 'critical')) end = world.t + 1;
    }
    const ev = world.log.events, at = (type) => ev.findIndex((e) => e.type === type);
    const tOf = (type) => (firstEvent(world, type) || { t: null }).t;
    const critical = tOf('critical');
    const explosions = ev.filter((e) => e.type === 'explosion');
    return {
      hot: tOf('hot'), overheated: tOf('overheated'), critical,
      ordered: at('hot') >= 0 && at('hot') < at('overheated') && at('overheated') < at('critical'),
      shutdownAtOverheated: tOf('shutdown') !== null && tOf('shutdown') === tOf('overheated'),
      deathsAtCritical: ev.filter((e) => e.type === 'crew-died' && e.t === critical && e.cause === 'heat').reduce((n, e) => n + e.deaths, 0),
      explosions: explosions.map((e) => ({ t: e.t, energy: e.energy, cause: e.cause })),
      cookOff: tOf('cook-off'), meltdown: tOf('meltdown'),
      books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const x = a.explosions;
    const explosion = e.explosion === null ? x.length === 0
      : x.length === 1 && x[0].t === a.critical && x[0].cause === 'heat' && close(e.explosion, x[0].energy, 1e-9)
        && (c.type === 'magazine' ? a.cookOff === a.critical : a.meltdown === a.critical);
    const checks = {
      hot: oneSided(e.hot, a.hot, e.dt), overheated: oneSided(e.overheated, a.overheated, e.dt), critical: oneSided(e.critical, a.critical, e.dt),
      order: a.ordered, shutdown: a.shutdownAtOverheated, deaths: a.deathsAtCritical === e.deaths, explosion,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, f = (x) => (x === null ? '-' : x.toFixed(3));
    const ex = (x) => (x === null ? 'none' : (x / 1e6).toFixed(1) + ' MJ');
    return {
      expected: `hot ${f(e.hot)}, overheated ${f(e.overheated)}, critical ${f(e.critical)} s; ${e.deaths} die; explosion ${ex(e.explosion)}`,
      actual: `hot ${f(a.hot)}, overheated ${f(a.overheated)}, critical ${f(a.critical)} s; ${a.deathsAtCritical} die; explosion ${a.explosions.length ? a.explosions.map((x) => ex(x.energy) + ' (' + x.cause + ')').join(', ') : 'none'}`,
    };
  },
};
