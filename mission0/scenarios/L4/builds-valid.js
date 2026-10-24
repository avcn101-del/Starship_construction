import { buildShip } from '../../../js/battle.js';
import { readout } from '../../../js/rooms.js';
import { validateShip, crewCapacity, createLayout, placeRoom, roomFootprint } from '../../../js/layout.js';
import { ROOMS, TIERS } from '../../../js/data.js';
import { BUILDS, REFERENCE, R2, everyWall } from '../../builds.js';
import { TARGETS, R1D_PLATES, R1C_PLATES } from '../../targets.js';

// J12 of L5e1 (DESIGN.md 13n.8 "The builds", 13n.1 (e) "The reference set", "The degenerate four, now six", #279,
// #297, #305): every build of mission0/builds.js passes the kernel's validateShip (with the crew rule) and lies within
// its budget: price ∝ mass at undock (#279: the readout's, plates and contents included), the reference four (R2,
// Lance, Swarm, Furnace) within 5 % of R1d's, the degenerate six (Brick, Glass, Porcupine, Fortress, Engine boat, Cold
// Brick) within 5 % of R2's; and each is what 13n.1 (e) names. The layouts are the engineer's, locked by the lead
// designer before the pace study (13n.8); this case pins them.
//
// Setup (T1): each build validated (validateShip, js/layout.js) and built (js/battle.js buildShip); its readout.
// Hand-worked (13n.1 (e)): R2: R1d's rooms, R1d's plates, an antenna and one point-defence fitting; Lance: an N = 4
// railgun, a slug magazine, no turret, no beam bay; Swarm: two missile bays, a missile magazine, two point-defence
// fittings, no turret; Furnace: an N = 6 beam bay, two shield generators, no turret; Brick: one S turret, no other
// weapon, a plate on every wall a plate may take (js/layout.js plateProblem accepts none more); Glass: a railgun and
// a reactor, no plates, the least quarters (removing any one of them breaks the crew rule); Porcupine: four S turrets
// and two magazines, no other weapon; Fortress: three shield generators and one turret; Engine boat: two engines, one
// turret, no other weapon; Cold Brick: R1d's rooms and plates, no radiator panel. Every build carries an antenna.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const WEAPONS = new Set(['turret', 'beamBay', 'railgun', 'missileBay']);
const T1 = TIERS.T1;
const count = (bp, f) => bp.rooms.filter(f).length, fits = (bp, t) => bp.fittings.filter((x) => x[0] === t).length;
const valid = (bp, params) => validateShip({ grid: T1.grid, edge: T1.edge, rooms: bp.rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: bp.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) }, ROOMS, params);
function crewOf(rooms, params) {
  const layout = createLayout({ edge: T1.edge, grid: T1.grid });
  for (const r of rooms) placeRoom(layout, r.id, roomFootprint(ROOMS[r.type], r.type, r.size || 'M', r.length ?? null), r.cell, r.rotation || 0, r.type);
  return crewCapacity(layout, ROOMS, params);
}
/** What 13n.1 (e) names for each build (the structural checks). */
function shape(name, bp, params) {
  const weapons = bp.rooms.filter((r) => WEAPONS.has(r.type));
  const type = (t, extra = () => true) => count(bp, (r) => r.type === t && extra(r));
  const plates = bp.fittings.filter((x) => x[0] === 'armour');
  switch (name) {
    case 'R2': return JSON.stringify(bp.rooms) === JSON.stringify(TARGETS.R1d.rooms) && R1C_PLATES.concat(R1D_PLATES).every((p) => plates.some((q) => JSON.stringify(q) === JSON.stringify(p))) && fits(bp, 'pd') + fits(bp, 'pdLaser') === 1;
    case 'Lance': return type('railgun', (r) => r.length === 4) === 1 && type('turret') === 0 && type('beamBay') === 0 && type('magazine', (r) => r.load && r.load.type === 'railgun') === 1;
    case 'Swarm': return type('missileBay') === 2 && type('magazine', (r) => r.load && r.load.type === 'missile') === 1 && fits(bp, 'pd') + fits(bp, 'pdLaser') === 2 && type('turret') === 0;
    case 'Furnace': return type('beamBay', (r) => r.length === 6) === 1 && type('shieldGenerator') === 2 && type('turret') === 0;
    case 'Brick': return weapons.length === 1 && type('turret', (r) => r.size === 'S') === 1 && everyWall(bp.rooms, bp.fittings).length === 0 && plates.length > 0;
    case 'Glass': {
      const q = bp.rooms.filter((r) => r.type === 'quarters');
      return type('railgun') === 1 && type('reactor') === 1 && weapons.length === 1 && plates.length === 0 && q.every((x) => { const c = crewOf(bp.rooms.filter((r) => r !== x), params); return c.required > c.berths; });
    }
    case 'Porcupine': return type('turret', (r) => r.size === 'S') === 4 && weapons.length === 4 && type('magazine') === 2;
    case 'Fortress': return type('shieldGenerator') === 3 && type('turret') === 1 && weapons.length === 1;
    case 'Engine boat': return type('engine') === 2 && type('turret') === 1 && weapons.length === 1;
    case 'Cold Brick': return JSON.stringify(bp.rooms) === JSON.stringify(TARGETS.R1d.rooms) && fits(bp, 'radiator') === 0 && R1C_PLATES.concat(R1D_PLATES).every((p) => plates.some((q) => JSON.stringify(q) === JSON.stringify(p)));
    default: return false;
  }
}

export default {
  id: 'L4.builds.valid',
  level: 'L4',
  laws: ['every build of ship versus ship passes validateShip and lies within its budget (price ∝ mass at undock, #279): the reference four within 5 % of R1d\'s, the degenerate six within 5 % of R2\'s; each is what 13n.1 (e) names (13n.8)'],
  dependsOn: ['L4.readout.blueprint.v2'],
  setup: 'T1: each build of mission0/builds.js validated (validateShip) and built (buildShip); R1d and R2 built for the budgets (13n.8 J12)',
  measure: 'validateShip\'s verdict; the readout\'s mass and acceleration; the budget\'s mass; the structural checks',
  tolerance: 'the mass within 5 % of the budget (13n.1 (e)); the rest exact',
  criterion: 'every build valid (no reason); |mass / budget - 1| <= 0.05 (R1d\'s for R2, Lance, Swarm, Furnace; R2\'s for the degenerate six); each build what 13n.1 (e) names (see the file); every build carries an antenna',
  tunable: [],
  locked: null,
  cases() {
    return Object.keys(BUILDS).map((name) => ({ name }));
  },
  expected(ctx, c) {
    return { budget: REFERENCE[c.name] ? 'R1d' : 'R2', tolerance: 0.05 };
  },
  run(ctx, c) {
    const bp = BUILDS[c.name], v = valid(bp, ctx.params);
    const mass = (b) => readout(buildShip(ctx.params, 'T1', b).world);
    const r = v.valid ? mass(bp) : null, base = mass(REFERENCE[c.name] ? TARGETS.R1d : R2);
    return { valid: v.valid, reasons: v.reasons.map((x) => `${x.rule} ${x.room}: ${x.detail}`), mass: r ? r.mass : null, g: r ? r.accelerationG : null, budget: base.mass, shape: shape(c.name, bp, ctx.params), antenna: fits(bp, 'antenna') >= 1 };
  },
  compare(e, a) {
    const checks = {
      'validateShip passes': a.valid,
      'within 5 % of the budget': a.mass !== null && Math.abs(a.mass / a.budget - 1) <= e.tolerance,
      'what 13n.1 (e) names': a.shape,
      'an antenna': a.antenna,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `valid; within 5 % of ${r.expected.budget}`, actual: a.valid ? `${(a.mass / 1e3).toFixed(1)} t (${((a.mass / a.budget) * 100).toFixed(1)} % of ${(a.budget / 1e3).toFixed(1)} t), ${a.g.toFixed(3)} g; shape ${a.shape ? 'as named' : 'NOT as named'}` : `invalid: ${a.reasons.join('; ')}` };
  },
};
