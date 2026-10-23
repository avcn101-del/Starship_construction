import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { setDemand, roomTemperature } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H6 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #38): the energy orders. Heat discipline: while the hottest room is at
// or past the threshold fraction of the way from rest (290 K) to its own hot threshold — (T - 290) / (hot - 290), a
// reading of "a threshold fraction of hot" (a question of the pull request) — the response holds: 'weapons' holds every
// weapon, 'shield' switches the shield off, 'engine' shuts the engine. Power priority: the slot's room types become the
// routing's order (rooms.js routePower's list), the rest following in room-id order.
//
// Setup (T1): createBattle with knowledge on; R1-A with a helm (position flank, range hold, open fire in range,
// auto-scan off, throttle 1) on bearing -y of a static R1 at 900 m, at rest. (heat-*) its hold heated by 20 MW from
// outside (a test source, room.externalPower) from the start; heat discipline threshold 0.5, response weapons / shield
// / engine (engine: facing broadside and dodging on, so the engine is open until the response); 20 s. (power-*) its
// reactor at demand 0.6 (12 MW of 20) from the start, the turret firing, the shield on, the beam firing (12.5 MW
// asked); priority Fire's (shieldGenerator, turret, railgun, missileBay, beamBay, engine) or none; 2 s.
// Hand-worked: the hold is a crewed-class room (hot 330 K): the response comes at the first step whose starting
// temperatures give (T - 290) / (hot - 290) >= 0.5 in any room (the scenario recomputes it from the rooms' kernel
// temperatures before each step; the step is kernel-read, labelled), never before; and holds every step after while
// the fraction stays above. (power-fire) the routing order is [shield, turret, beamBay, engine] (R1's ids of those types,
// in the slot's order); at 12 MW the shield and the turret get their whole draw (fraction 1) and the beam bay less
// (12.5 MW asked); (power-none) no order: the room-id order puts the beam bay first: it takes the whole 12 MW (its
// 12.5 MW and more are asked, so its fraction is under 1) and the shield and the turret get nothing (fraction 0).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.orders.energy',
  level: 'L4',
  laws: ['heat discipline: at a threshold fraction of the way from rest to hot the response holds the weapons, the shield or the engine (#38)', 'power priority: the slot\'s room types are routePower\'s order (#38, #193)'],
  dependsOn: ['L4.orders.fire'],
  setup: 'T1: createBattle, knowledge on; R1-A with a helm on bearing -y of a static R1 at 900 m; (heat) its hold heated by 20 MW, threshold 0.5, response weapons / shield / engine, 20 s; (power) its reactor at demand 0.6, weapons and shield on, priority Fire\'s or none, 2 s (13n.4 H6)',
  measure: '(heat) the step the recomputed fraction first reaches 0.5 and the steps the response holds; (power) the routing order and the power fractions of shield, turret and beam bay',
  tolerance: 'steps exact; fractions exact (1) or strictly under 1',
  criterion: '(heat) the response holds at exactly the steps whose starting hottest fraction is >= 0.5, from the first such step (at least one), and not before; (power-fire) order [shield, turret, beamBay, engine], shield and turret at fraction 1, beam bay under 1; (power-none) order [], the beam bay under 1 with everything, shield and turret at 0',
  tunable: ['thermal.crewedHot', 'reactor.power', 'beam.power', 'shield.powerDraw'],
  locked: { date: '2026-10-23', hash: '0e15c362' },
  cases() {
    return [{ name: 'heat-weapons', response: 'weapons' }, { name: 'heat-shield', response: 'shield' }, { name: 'heat-engine', response: 'engine' }, { name: 'power-fire', priority: 'fire' }, { name: 'power-none', priority: 'none' }];
  },
  expected(ctx, c) {
    if (c.name === 'power-fire') return { order: ['shield', 'turret', 'beamBay', 'engine'], full: ['shield', 'turret'], short: ['beamBay'] };
    if (c.name === 'power-none') return { order: [], full: [], short: ['beamBay'], zero: ['shield', 'turret'] };
    return { threshold: 0.5 };
  },
  run(ctx, c) {
    if (c.priority) {
      const orders = { range: 'hold', position: 'flank', facing: 'bow', autoScan: 'off', openFire: 'inRange', throttle: 1, heat: { threshold: 1, response: 'weapons' }, ...(c.priority === 'none' ? { priority: [] } : {}) };
      const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1-A'], target: TARGETS.R1, bearing: '-y', knowledge: true, orders: { A: orders }, setup: { attacker: (w, room) => setDemand(w, room('reactor'), 0.6) } });
      while (b.step < 120 && !b.ended) tick(b);
      const w = b.attacker.world, frac = (id) => w.rooms.find((r) => r.id === id).powerFraction;
      return { order: [...w.power.priority], fractions: { shield: frac('shield'), turret: frac('turret'), beamBay: frac('beamBay') } };
    }
    const dodge = c.response === 'engine';
    const orders = { range: 'hold', position: 'flank', facing: dodge ? 'broadside' : 'bow', dodging: dodge ? 'on' : 'off', autoScan: 'off', openFire: 'inRange', throttle: 1, heat: { threshold: 0.5, response: c.response } };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1-A'], target: TARGETS.R1, bearing: '-y', knowledge: true, orders: { A: orders }, setup: { attacker: (w, room) => { room('hold').externalPower = 2e7; } } });
    const A = b.attacker, w = A.world, turret = w.rooms.find((r) => r.type === 'turret'), shield = w.rooms.find((r) => r.type === 'shieldGenerator');
    let crossed = null, mismatch = 0, held = 0;
    while (b.step < 1200 && !b.ended) {
      let f = 0;
      for (const r of w.rooms) if (r.placed) f = Math.max(f, (roomTemperature(r) - 290) / (r.thresholds.hot - 290));
      const n = b.step, over = f >= 0.5, theta = mainBody(A).theta;
      if (over && crossed === null) crossed = n;
      tick(b);
      // The engine's response: shut where its heading error alone would open it (cos > 0); a step it is turned away tells nothing.
      const opening = Math.max(0, Math.cos(A.heading - theta)), engine = w.rooms.find((r) => r.type === 'engine').engine.throttle;
      if (c.response === 'engine' && !(opening > 1e-6)) continue;
      const responds = c.response === 'weapons' ? A.helm.held && turret.turret.hold : c.response === 'shield' ? !shield.shield.on : engine === 0;
      if (responds !== over) mismatch++;
      if (responds) held++;
    }
    return { crossed, mismatch, held };
  },
  compare(e, a, c) {
    let checks;
    if (c.priority) {
      checks = {
        'the routing order': a.order.join(',') === e.order.join(','),
        'the first in the order at fraction 1': e.full.every((k) => a.fractions[k] === 1),
        'the others under 1': e.short.every((k) => a.fractions[k] < 1),
        'the starved at 0': (e.zero || []).every((k) => a.fractions[k] === 0),
      };
    } else {
      checks = {
        'the fraction is crossed in the 20 s (kernel-read step)': a.crossed !== null && a.crossed > 0,
        'the response holds exactly while the starting fraction is >= 0.5': a.mismatch === 0 && a.held > 0,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.priority) return { expected: `order [${r.expected.order.join(', ')}]; full ${r.expected.full.join(', ')}; short ${r.expected.short.join(', ')}`, actual: `order [${a.order.join(', ')}]; fractions ${Object.entries(a.fractions).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(', ')}` };
    return { expected: 'the response from the step the fraction reaches 0.5', actual: `reached at step ${a.crossed} (kernel-read), response held ${a.held} steps, ${a.mismatch} mismatched steps` };
  },
};
