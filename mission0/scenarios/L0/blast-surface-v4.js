import { blast } from '../../../js/damage.js';

export default {
  id: 'L0.blast.surface.v4',
  level: 'L0',
  laws: ['blast through shared walls', 'contact burst vents at the open face', 'energy conservation'],
  dependsOn: [],
  setup: 'an HE warhead bursting in contact with the open face (x = 0) of an armour plate, at the middle of the open face of an 11x11 plate and of a 3x3 plate (to test escape); energies 0.5x to 10x the M warhead; coupling at the minimum, value and maximum of he.coupling (#176)',
  measure: 'energy vented at the open face, absorbed by the plate and escaped; cells damaged (any energy) and destroyed (>= B); damage by grid distance; symmetry about the burst row',
  tolerance: 'energy relative 1e-9 of E; ordering and symmetry within 1e-9 of E',
  criterion: 'vented = (1 - c) E; absorbed + escaped + vented = E; damaged and destroyed reported apart (destroyed <= damaged); damage non-increasing with grid (Manhattan) distance from the burst cell: every cell at distance d + 1 has absorbed no more than every cell at distance d; the damaged region is symmetric about the burst row while it does not reach a plate edge other than the open face (#169, #176) Successor of L0.blast.surface.v2 (#240, #243, 13k.4 S16): the plate\'s cells absorb B = matter.blastPerKg x armour.cellMass (1 MJ at T1, as armour.blastResistance was) in place of the removed armour.blastResistance; nothing else changes.',
  tunable: ['he.blastEnergy', 'he.coupling', 'armour.blastResistance'],
  locked: null,
  cases(ctx) {
    const c = ctx.params.he.coupling;
    const out = [];
    for (const coupling of [c.min, c.value, c.max]) {
      for (const times of [0.5, 1, 2.5, 5, 10]) out.push({ w: 11, h: 11, x: 0, y: 5, times, coupling });
    }
    out.push({ w: 3, h: 3, x: 0, y: 1, times: 10, coupling: c.value });
    return out;
  },
  expected(ctx, c) {
    const E = ctx.params.he.blastEnergy.value * c.times;
    return { vented: (1 - c.coupling) * E, input: E };
  },
  run(ctx, c) {
    const E = ctx.scaled(ctx.params.he.blastEnergy) * c.times;
    const B = ctx.params.matter.blastPerKg.value * ctx.scaled(ctx.params.armour.cellMass); // q_b x the armour cell's mass (#240 (6))
    const r = blast(c.w, c.h, [c.x, c.y], E, B, c.coupling);
    const at = (x, y) => r.absorbed[y * c.w + x];
    let damaged = 0, destroyed = 0, reachesEdge = false;
    const minAt = [], maxAt = [];
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        const a = at(x, y), d = Math.abs(x - c.x) + Math.abs(y - c.y);
        if (a > 0) {
          damaged++;
          if (x === c.w - 1 || y === 0 || y === c.h - 1) reachesEdge = true;
        }
        if (a >= B * (1 - 1e-12)) destroyed++;
        minAt[d] = Math.min(minAt[d] ?? Infinity, a);
        maxAt[d] = Math.max(maxAt[d] ?? -Infinity, a);
      }
    }
    let worstRise = -Infinity; // max over d of (max at d + 1) - (min at d)
    for (let d = 0; d + 1 < minAt.length; d++) worstRise = Math.max(worstRise, maxAt[d + 1] - minAt[d]);
    let asymmetry = 0;
    for (let y = 0; y < c.h; y++) {
      const m = 2 * c.y - y;
      if (m < 0 || m >= c.h) continue;
      for (let x = 0; x < c.w; x++) asymmetry = Math.max(asymmetry, Math.abs(at(x, y) - at(x, m)));
    }
    return {
      input: E, vented: r.vented, absorbed: r.absorbed.reduce((p, q) => p + q, 0), escaped: r.escaped,
      damaged, destroyed, worstRise, reachesEdge, asymmetry,
    };
  },
  compare(e, a) {
    const tol = 1e-9 * e.input;
    const vented = Math.abs(a.vented - e.vented) <= tol;
    const books = Math.abs(e.input - a.absorbed - a.escaped - a.vented) <= tol;
    const apart = Number.isInteger(a.damaged) && Number.isInteger(a.destroyed) && a.destroyed <= a.damaged;
    const falling = a.worstRise <= tol;
    const symmetric = a.reachesEdge || a.asymmetry <= tol;
    const failed = [!vented && 'vented', !books && 'books', !apart && 'damaged/destroyed', !falling && 'not non-increasing with distance', !symmetric && 'not symmetric'].filter(Boolean);
    return { pass: failed.length === 0, note: [failed.join(', '), a.reachesEdge ? 'reaches a plate edge: symmetry not checked' : ''].filter(Boolean).join('; ') };
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(3) + ' MJ';
    return {
      expected: `vented ${mj(r.expected.vented)} of ${mj(r.expected.input)}`,
      actual: `vented ${mj(r.actual.vented)}, absorbed ${mj(r.actual.absorbed)}, escaped ${mj(r.actual.escaped)}; ${r.actual.destroyed} destroyed, ${r.actual.damaged} damaged; rise ${mj(r.actual.worstRise)}, asymmetry ${mj(r.actual.asymmetry)}`,
    };
  },
};
