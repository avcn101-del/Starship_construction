import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint, rotate } from '../../../js/body.js';
import { edgeMidpoint } from '../../../js/layout.js';
import { shieldBuffer } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// W12 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #100): the firing window. A round or beam leaving its own ship never
// meets its own field (the loop tests a round against the other hull only); while a side's round crosses its own
// field's hull segment (one step) or its beam fires through it (every step), that segment is open: a round of the other
// side entering through it in that step meets no field.
//
// Setup (T1): the L4 battle, R1d (attacker) against R1 from -y at 900 m, both shields on. (own) the plan's turret on
// R1's magazine: the attacker's shield buffer from the end of the first step (charged by then) through 1.5 s (its own first round fired at t = 0 has left). (turret
// now / next) the same, and an M round of the target's (6 kg at 800 m/s, inserted into the target's rounds) set to enter
// the attacker through the segment the attacker's first round opened (read from the window event of a first, identical
// battle: the battle is deterministic), 2 m outside it along its inward normal, in the step that opens it (tick 1) or
// in the next (tick 2). (beam open / closed) the plan's beam on R1's reactor; at tick 5 such a round enters the bay's
// bow-face segment (10, 2) +x (open while it fires), or the bay's -y segment of (10, 2) (closed).
// Hand-worked: through the open segment the round meets no field (its speed after the field equals before, the
// attacker's buffers pay nothing for it); through a closed segment, or the open one a step later, the field takes it
// (speed after < before, a payment).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

function battle(ctx, plan) {
  return createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan, shield: { attacker: true, target: true } });
}
/** A target round entering the attacker through grid segment `key` ('x,y|dx,dy'), starting 2 m outside it. */
function insert(b, key) {
  const A = b.attacker, T = b.target, w = A.world, [cs, ss] = key.split('|'), c = cs.split(',').map(Number), s = ss.split(',').map(Number);
  const other = [c[0] + s[0], c[1] + s[1]], inside = w.layout.occupied.has(`${c[0]},${c[1]}`) ? c : other, outside = inside === c ? other : c;
  const P = edgeMidpoint(w.edge, c, s), din = [inside[0] - outside[0], inside[1] - outside[1]], body = mainBody(A), d = rotate(din, body.theta);
  const Pw = worldPoint(body, P), x0 = [Pw[0] - 2 * d[0], Pw[1] - 2 * d[1]], ref = { m: 6, x: x0, v: [800 * d[0] + body.v[0], 800 * d[1] + body.v[1]], from: 'turret', t: b.t, x0: [...x0], cause: 'T:inserted' };
  T.world.ship.rounds.push(ref);
  b.rounds.push({ id: 'shot-999', shooter: T, other: A, ref, prev: [...x0], t0: b.t, event: null, cleared: true });
}

export default {
  id: 'L4.shield.window',
  level: 'L4',
  laws: ['a round leaving its own ship never meets its own field (#100, 13n.1 (c))', 'the firing window: a segment a side\'s own round crosses (one step) or its beam fires through (every step) is open: a round of the other side entering through it in that step meets no field (#100)'],
  dependsOn: ['L3.shield.bodies.v2'],
  setup: 'T1: the L4 battle R1d against R1 from -y at 900 m, both shields on; the attacker\'s turret on R1\'s magazine, a target round inserted through the segment the attacker\'s first round opened in that step or the next; the attacker\'s beam on R1\'s reactor, a target round through the bay\'s bow face (open) or its -y edge (closed) at tick 5 (13n.4 W12)',
  measure: 'the attacker\'s shield buffer while its own rounds leave; the window events; the inserted round\'s hit: its speed before and after the attacker\'s field',
  tolerance: 'exact (a field met or not)',
  criterion: 'own: the attacker\'s buffer full through 1.5 s with its first round gone (no payment); turret now: the inserted round meets no field (speed after = before); next: it is slowed; beam open: no field, every firing step a window on (10, 2) +x and (10, 3) +x; closed: slowed',
  tunable: [],
  locked: null,
  cases() {
    return [{ part: 'own' }, { part: 'turret', when: 'now' }, { part: 'turret', when: 'next' }, { part: 'beam', seg: 'open' }, { part: 'beam', seg: 'closed' }];
  },
  expected(ctx, c) {
    return { shielded: (c.part === 'turret' && c.when === 'next') || (c.part === 'beam' && c.seg === 'closed') };
  },
  run(ctx, c) {
    if (c.part === 'own') {
      const b = battle(ctx, { turret: ['magazine'] }), g = b.attacker.world.rooms.find((r) => r.type === 'shieldGenerator');
      tick(b); // the generator powered by the first step's routing: its buffer charged (before it, its power fraction is 0)
      const full = shieldBuffer(b.attacker.world, g), seen = [];
      while (b.step < 90) { tick(b); seen.push(shieldBuffer(b.attacker.world, g)); }
      return { full, min: Math.min(...seen), shots: b.shots, windows: b.log.events.length };
    }
    if (c.part === 'turret') {
      const probe = battle(ctx, { turret: ['magazine'] });
      tick(probe);
      const key = probe.log.events.find((e) => e.type === 'window').segment;
      const b = battle(ctx, { turret: ['magazine'] });
      if (c.when === 'next') tick(b);
      insert(b, key);
      tick(b);
      const h = b.hits.find((x) => x.id === 'shot-999');
      return { key, open: [...b.attacker.open], hit: h ? { speed: h.speed, afterShield: h.afterShield } : null };
    }
    const b = battle(ctx, { beam: ['reactor'] });
    while (b.step < 4) tick(b);
    insert(b, c.seg === 'open' ? '10,2|1,0' : '10,1|0,1');
    tick(b);
    const h = b.hits.find((x) => x.id === 'shot-999'), firing = [];
    while (b.step < 30) { tick(b); firing.push([...b.attacker.open].sort().join(' ')); }
    return { hit: h ? { speed: h.speed, afterShield: h.afterShield } : null, firing: [...new Set(firing)], beamWindows: b.log.events.filter((e) => e.room === 'beamBay').map((e) => e.segment) };
  },
  compare(e, a, c) {
    let checks;
    if (c.part === 'own') checks = { 'the attacker\'s buffer never paid for its own rounds': a.min === a.full && a.shots >= 1, 'its round opened a window': a.windows >= 1 };
    else {
      checks = { 'the inserted round hit the attacker': !!a.hit };
      if (a.hit) checks[e.shielded ? 'the field took it (slowed)' : 'no field (speed after = before)'] = e.shielded ? a.hit.afterShield < a.hit.speed : a.hit.afterShield === a.hit.speed;
      if (c.part === 'beam' && c.seg === 'open') checks['every firing step the bay\'s bow face open'] = a.firing.every((s) => s.includes('10,2|1,0') && s.includes('10,3|1,0')) && a.beamWindows.length === 2;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
