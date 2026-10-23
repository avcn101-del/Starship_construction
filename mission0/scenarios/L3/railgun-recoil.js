import { buildShip } from '../../../js/battle.js';
import { step, readout } from '../../../js/rooms.js';
import { WEAPON_SHIPS } from '../../targets.js';

// W3 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #5): the railgun's recoil, -m v along the ship's axis at the room's
// centre, on R1d with an N = 2 railgun in place of its beam bay (mission0/targets.js R1d-L).
//
// Setup (T1): buildShip R1d-L at rest, heading 0 (the axis is +x), its railgun ordered to fire, one step (the slug leaves
// at t = 0 from the magazine through the barrel; nothing else moves: the turret holds, no RCS, no thrust).
// Hand-worked: R1d's mass at undock from its parts (cells: engine 6 x 5700, reactor 4 x 150 000, bridge 4 x 14 800,
// magazine 4 x 3000 + 900 kg of contents, beam bay 4 x 5500, heat sink 4 x 3000 + its water 4 x 4 x 1.35e6 / 4186,
// quarters 6 x 14 800, turret 4 x 4975 + its 4 ready rounds 24, shield generator 4 x 10 000, hold 4 x 3000; fittings 17
// x 250 + 4 x 200; plates 13 x 0.2 x 7850 x 25) = 1 421 484.057 kg; R1d-L trades the beam bay's 22 000 kg for the
// railgun's 4 x 10 000 (the magazine's 900 kg of slugs weigh as its HE): M = 1 439 484.057 kg. The slug (10 kg at
// 2000 m/s) leaves: the ship of M - 10 kg takes -20 000 N s: dv = 20 000 / 1 439 474.057 = 0.013893963 m/s along -x,
// none across. The plan's 0.0137 m/s (W3) is 20 000 / 1460.8 t, R1d's mass before L5m (13n.1 (e)): the literal here is
// the formula's on today's ship (a question in the pull request). Spin: the recoil acts at the railgun's centre, grid
// y = 15 m; R1d-L's centre of mass is not on that line (kernel-read, labelled), so omega = (r x J) / I, not 0: the
// plan's "no spin (on the axis)" holds only for a centre of mass on the bore line (a question in the pull request).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const M = 34200 + 600000 + 59200 + 12000 + 900 + 22000 + 12000 + (16 * 1.35e6) / 4186 + 88800 + 19900 + 24 + 40000 + 12000 + 4250 + 800 + 13 * 0.2 * 7850 * 25 - 22000 + 40000;

export default {
  id: 'L3.railgun.recoil',
  level: 'L3',
  laws: ['recoil, Newton 3: a slug of m at v leaves the railgun along the ship\'s axis and the ship takes -m v there (#5, 13n.1 (c))'],
  dependsOn: ['L1.railgun.fire'],
  setup: 'T1: buildShip R1d-L (R1d with an N = 2 railgun for its beam bay, its magazine of slugs) at rest, heading 0, the railgun ordered to fire, one step (13n.4 W3)',
  measure: 'the main body\'s velocity and spin after the step; the mass at undock (readout); its centre of mass and inertia after the slug left (kernel-read, labelled) for the spin',
  tolerance: 'mass and dv 1e-12 (closed form); the spin 1e-9 relative against (r x J) / I from kernel-read r and I',
  criterion: 'the mass at undock 1 439 484.057 kg (hand-worked); dv = (-20 000 / (M - 10), 0) = (-0.013893963, 0) m/s (1e-12); the spin (r x J) / I with r the railgun\'s centre less the centre of mass (kernel-read, labelled): not 0, the centre of mass lying off the bore line',
  tunable: ['railgun.roundMass', 'railgun.muzzleVelocity', 'cellMass.railgun'],
  locked: null,
  cases() {
    return [{ ship: 'R1d-L' }];
  },
  expected() {
    return { M, dv: [-20000 / (M - 10), 0] };
  },
  run(ctx) {
    const { world, room } = buildShip(ctx.params, 'T1', WEAPON_SHIPS['R1d-L']);
    const r = readout(world), b = world.ship.bodies[0];
    room('railgun').railgun.firing = true;
    step(world);
    const rail = room('railgun');
    return { M: r.mass, centre: [...b.c], I: b.I, rail: rail.position, v: [...b.v], omega: b.omega, shots: rail.railgun.shots };
  },
  compare(e, a) {
    const close = (x, y, t) => Math.abs(x - y) <= t * Math.max(Math.abs(x), 1e-300);
    // Kernel-read (labelled): the arm from the centre of mass to the railgun's centre, after the slug left (I and c of the body).
    const J = [-20000, 0], r = [a.rail[0] - a.centre[0], a.rail[1] - a.centre[1]], spin = (r[0] * J[1] - r[1] * J[0]) / a.I;
    const checks = {
      'one slug': a.shots === 1,
      'the mass at undock (hand-worked, 1e-12)': close(e.M, a.M, 1e-12),
      'dv along -x = 20 000 / (M - 10) (hand-worked, 1e-12)': close(e.dv[0], a.v[0], 1e-12) && a.v[1] === 0,
      'spin (r x J) / I (kernel-read r and I, labelled; 1e-9), not 0': a.omega !== 0 && Math.abs(a.omega - spin) <= 1e-9 * Math.abs(spin),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
