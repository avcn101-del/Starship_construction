import { createBattle, tick } from '../../../js/battle.js';
import { R1_ROOMS, R1_FITTINGS, missileShip } from '../../targets.js';

// W8 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #93): kinetic point defence. A fitting on a hull edge engages missiles
// only, in the arc of its segment (the outward half-plane of its edge), the nearest first; a missile dies when its dose
// reaches its hp, matter.burnEnergyPerKg x missile.mass = 3000 x 200 = 600 kJ (the one law).
// Kinetic: pd.fireRate M flak rounds a second from its own store of pd.ammo, each led on the missile and bursting at its
// closest approach with he.blastEnergy over g = 1 / (1 + (r / flak.radius)^2): it kills within r = 10 sqrt(2 / 0.6 - 1)
// = 15.275 m (hand-worked).
//
// Setup (T1): createBattle, knowledge on, the attacker R1-M (one designated HE missile, unscanned: it flies at the
// silhouette's centre) from -y at 900 m against R1 with one pd fitting: (in arc) on the hold's -y edge of cell (7, 0)
// (facing the missile); (outside) on the turret's +y edge of cell (8, 5) (the missile, coming from -y, never enters its
// half-plane). One missile launched at t = 0; until it dies or hits, at most 15 s.
//
// .v2 (#298 (1), DESIGN.md 13n.4 W8b): successor of L1.pd.kinetic (withdrawn under #298: it checked dose >= hp and
// d <= 15.275 m but not the dose law, so a d^-4 field passed). Every case and check of the original, plus the dose law
// enforced: the missile's dose at its kill equals the sum over the recorded bursts of E / (1 + (d_i / flak.radius)^2),
// E = he.blastEnergy, at 1e-12 (d_i each burst's closest approach, kernel-read, labelled). One missile: every burst
// is on it. The crossing case of #298 (1) is not built: see the pull request (Fix round 2, Q1).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const HP = 3000 * 200, KILL_R = 10 * Math.sqrt(2e6 / HP - 1);
const FIT = { in: ['pd', 'hold', [7, 0], [0, -1]], out: ['pd', 'turret', [8, 5], [0, 1]] };

export default {
  id: 'L1.pd.kinetic.v2',
  level: 'L1',
  laws: ['point defence engages missiles only, in the outward half-plane of its hull segment, the nearest first (#93, 13n.1 (c))', 'kinetic: flak rounds from its own store, each bursting at its closest approach with he.blastEnergy over flak.radius; the missile dies when the dose reaches its hp (13n.1 (c))'],
  dependsOn: ['L0.missile.flight'],
  setup: '(.v2 of L1.pd.kinetic, #298 (1)) T1: createBattle, knowledge on, R1-M\'s one missile from -y at 900 m against R1 with one pd fitting on the hold\'s -y edge (in arc) or the turret\'s +y edge (outside), up to 15 s (13n.4 W8)',
  measure: 'the flak events, the store left, each burst\'s closest-approach distance (kernel-read, labelled) and the dose; the missile-killed event; the warhead event',
  tolerance: 'counts exact; the dose sum of E g(d_i) 1e-12 (relative) at the kernel-read d_i',
  criterion: 'in arc: the missile killed by flak at a burst whose closest approach d <= 15.275 m (hand-worked), its dose E / (1 + (d / 10)^2) >= 600 kJ; its dose at the kill the sum over every recorded burst of E / (1 + (d_i / flak.radius)^2), E = he.blastEnergy 2 MJ, flak.radius 10 m (1e-12, #298 (1)); the store 40 less the flak fired; no warhead; outside: no flak fired, the store 40, the missile hits',
  tunable: ['missile.mass', 'matter.burnEnergyPerKg', 'pd.fireRate', 'pd.ammo', 'flak.radius', 'he.blastEnergy'],
  locked: { date: '2026-10-23', hash: '53c147fe' },
  cases() {
    return [{ arc: 'in' }, { arc: 'out' }];
  },
  expected(ctx, c) {
    return c.arc === 'in' ? { killed: true, hp: HP, killR: KILL_R, steps: 36, E: ctx.params.he.blastEnergy.value, R: ctx.params.flak.radius.value } : { killed: false };
  },
  run(ctx, c) {
    const target = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, FIT[c.arc]] };
    const b = createBattle({ params: ctx.params, attacker: missileShip('designated', 'he'), target, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 1 } }, knowledge: true });
    const f = b.target.world.fittings.find((x) => x.type === 'pd'), bursts = [];
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
      const d = a.bursts[a.bursts.length - 1];
      checks = {
        'killed by flak, no warhead': !!a.killed && a.killed.by === 'flak' && !a.warhead,
        'the killing burst within 15.275 m (hand-worked; d kernel-read, labelled)': d !== undefined && d <= e.killR,
        'its dose >= hp 600 kJ, and every burst beyond 15.275 m dosed under it': a.killed && a.killed.dose >= e.hp * (1 - 1e-12) && a.bursts.slice(0, -1).every((x) => x > e.killR),
        'the store counts down: 40 less the flak fired': a.flak > 0 && a.ammo === 40 - a.flak,
        'its dose the sum over the bursts of E / (1 + (d_i / flak.radius)^2) (1e-12, #298 (1))': !!a.killed && a.bursts.length > 0 && close(a.bursts.reduce((t, x) => t + e.E / (1 + (x / e.R) * (x / e.R)), 0), a.killed.dose, 1e-12),
      };
    } else checks = { 'no flak fired, the store full': a.flak === 0 && a.ammo === 40, 'the missile hits': a.warhead && !a.killed };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
