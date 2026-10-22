import { buildShip } from '../../../js/battle.js';
import { shieldRound, step } from '../../../js/rooms.js';
import { R1_ROOMS, R1_FITTINGS } from '../../targets.js';

// B15 of L4b (DESIGN.md 13l.4; re-review NB2 of L4a, #260): shieldRound when the paying generator's body is not among
// the ship's bodies. Two R1s at T1 as ships (js/battle.js buildShip), shield generator on, at rest: (found) as built;
// (nobody) the generator's body set to an id no body has (a fixture: the kernel never leaves a working room on a body
// that is gone). One M round at 800 m/s along +y of the grid at the point (20, 2.5) m, 2.5 m from the generator's
// centre (20, 5) m, its buffer full.
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a), 1e-300);
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const M = 6, V = 800, D = Math.cbrt((4 * M) / (Math.PI * 7850 * 4)), AREA = (Math.PI * D * D) / 4;

export default {
  id: 'L3.shield.nobody',
  level: 'L3',
  laws: ['the field\'s energy is its generator\'s heat; without a body to push, the old fallback: the whole payment as heat, no impulse (#170, #260 NB2, 13l.4)'],
  dependsOn: [],
  setup: 'two R1s at T1 as ships, shield on, at rest; (nobody) the generator\'s body id points at no body; one M round through the field at (20, 2.5) m along +y after one step (power routed) (13l.4 B15)',
  measure: 'the round\'s velocity after the field and the energy paid in both; in (nobody) the generator\'s heat for its next step (impulseHeat), the bodies\' momentum and spin, the external impulse and the field\'s booked impulse',
  tolerance: 'closed forms 1e-12 relative (13k.4)',
  criterion: 'the field acts on the round as with its body found: the same velocity after and the same energy paid (1e-12); (nobody) the generator\'s heat is the whole energy paid (hand-worked: heat = paid, 1e-12) and no impulse: every body\'s velocity and spin unchanged, the external impulse and the field\'s booked impulse unchanged (exactly); (found) the field pushes (its booked impulse is not zero), so the two cases differ only in the fallback',
  tunable: ['shield.buffer', 'shield.kineticStop', 'shield.radius'],
  locked: null,
  cases() {
    return [{ point: [20, 2.5] }];
  },
  expected() {
    return { heatIsPaid: true, impulse: 0 };
  },
  run(ctx, c) {
    const one = (nobody) => {
      const { world, room } = buildShip(ctx.params, 'T1', { rooms: R1_ROOMS, fittings: R1_FITTINGS }, { setup: (w, r) => { r('shield').shield.on = true; } });
      const g = room('shield');
      step(world); // one step routes power: the buffer's capacity follows the generator's power fraction (13d.1)
      if (nobody) g.body = 'gone';
      const v0 = world.ship.bodies.map((b) => [...b.v, b.omega]), J0 = [...world.ship.external.J];
      const heat0 = g.shield.impulseHeat;
      const res = shieldRound(world, { position: c.point, mass: M, velocity: V, area: AREA, direction: [0, 1] });
      const field = world.ship.received ? [...world.ship.received.field] : [0, 0];
      return {
        velocity: res.velocity, paid: res.energy, heat: g.shield.impulseHeat - heat0,
        moved: world.ship.bodies.some((b, i) => b.v[0] !== v0[i][0] || b.v[1] !== v0[i][1] || b.omega !== v0[i][2]),
        external: world.ship.external.J[0] !== J0[0] || world.ship.external.J[1] !== J0[1], field,
      };
    };
    return { found: one(false), nobody: one(true) };
  },
  compare(e, a) {
    const f = a.found, n = a.nobody;
    const checks = {
      'the same round after the field': close(f.velocity, n.velocity, 1e-12) && close(f.paid, n.paid, 1e-12) && n.paid > 0,
      'nobody: heat = the energy paid (hand-worked)': close(n.paid, n.heat, 1e-12),
      'nobody: no impulse': !n.moved && !n.external && n.field[0] === 0 && n.field[1] === 0,
      'found: the field pushes': f.moved && (f.field[0] !== 0 || f.field[1] !== 0),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const f = r.actual.found, n = r.actual.nobody;
    return { expected: 'same round; nobody: heat = paid, no impulse', actual: `velocity ${f.velocity.toPrecision(12)} / ${n.velocity.toPrecision(12)} m/s; paid ${f.paid.toPrecision(12)} / ${n.paid.toPrecision(12)} J; nobody heat ${n.heat.toPrecision(12)} J, moved ${n.moved}, external ${n.external}; found moved ${f.moved}` };
  },
};
