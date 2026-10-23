import { createBattle, tick } from '../../../js/battle.js';
import { R1_ROOMS, R1_FITTINGS, missileShip } from '../../targets.js';

// W8 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #93): laser point defence. A fitting on a hull edge engages missiles
// only, in the arc of its segment (the outward half-plane of its edge), the nearest first; a missile dies when its dose
// reaches its hp, matter.burnEnergyPerKg x missile.mass = 3000 x 200 = 600 kJ (the one law).
// Laser: pdLaser.power (1 MW x its host's power fraction) on its missile every step it holds it, no falloff: it kills in
// hp / P = 0.6 s = 36 steps of beam (hand-worked; on the step grid: the dose per step is what is tested).
//
// Setup (T1): createBattle, knowledge on, the attacker R1-M (one designated HE missile, unscanned: it flies at the
// silhouette's centre) from -y at 900 m against R1 with one pdLaser fitting: (in arc) on the hold's -y edge of cell (7, 0)
// (facing the missile); (outside) on the turret's +y edge of cell (8, 5) (the missile, coming from -y, never enters its
// half-plane). One missile launched at t = 0; until it dies or hits, at most 15 s.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const HP = 3000 * 200, KILL_R = 10 * Math.sqrt(2e6 / HP - 1);
const FIT = { in: ['pdLaser', 'hold', [7, 0], [0, -1]], out: ['pdLaser', 'turret', [8, 5], [0, 1]] };

export default {
  id: 'L1.pd.laser',
  level: 'L1',
  laws: ['point defence engages missiles only, in the outward half-plane of its hull segment, the nearest first (#93, 13n.1 (c))', 'laser: pdLaser.power on its missile while in arc, no falloff; the missile dies when the dose reaches its hp (13n.1 (c), #230)'],
  dependsOn: ['L0.missile.flight'],
  setup: 'T1: createBattle, knowledge on, R1-M\'s one missile from -y at 900 m against R1 with one pdLaser fitting on the hold\'s -y edge (in arc) or the turret\'s +y edge (outside), up to 15 s (13n.4 W8)',
  measure: 'the energy the laser put on the missile, the steps it held it, the missile-killed event and its dose; the warhead event',
  tolerance: 'the beam\'s steps exact (on the grid: tested); energies 1e-12',
  criterion: 'in arc: the missile killed by the laser after 36 steps (0.6 s) of beam, its dose 600 kJ (hand-worked); no warhead; outside: no beam, the missile hits',
  tunable: ['missile.mass', 'matter.burnEnergyPerKg', 'pdLaser.power', 'beambay.efficiency'],
  locked: null,
  cases() {
    return [{ arc: 'in' }, { arc: 'out' }];
  },
  expected(ctx, c) {
    return c.arc === 'in' ? { killed: true, hp: HP, killR: KILL_R, steps: 36 } : { killed: false };
  },
  run(ctx, c) {
    const target = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, FIT[c.arc]] };
    const b = createBattle({ params: ctx.params, attacker: missileShip('designated', 'he'), target, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true });
    const f = b.target.world.fittings.find((x) => x.type === 'pdLaser'), bursts = [];
    while (b.step < 900) {
      tick(b);
      if (b.missileShots && !b.missiles.length) break;
    }
    for (const x of b.bursts || []) bursts.push(x.d);
    const ev = b.target.world.log.events, kill = ev.find((e) => e.type === 'missile-killed');
    return { killed: kill ? { by: kill.by, dose: kill.dose, t: kill.t } : null, warhead: ev.some((e) => e.type === 'warhead'), flak: ev.filter((e) => e.type === 'flak').length, ammo: f.ammo ?? null, bursts, energy: f.energy ?? null, P: ctx.params.pdLaser.power.value };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    let checks;
    if (c.arc === 'in') {
      checks = {
        'killed by the laser, no warhead': !!a.killed && a.killed.by === 'laser' && !a.warhead,
        'after 36 steps (0.6 s) of beam: its energy P x 36 dt (1e-12)': close(e.steps * (a.P / 60), a.energy, 1e-12),
        'its dose the hp 600 kJ (1e-12)': a.killed && close(e.hp, a.killed.dose, 1e-12),
      };
    } else checks = { 'no beam': a.energy === 0, 'the missile hits': a.warhead && !a.killed };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
