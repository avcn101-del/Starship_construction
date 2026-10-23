import { createBattle, tick, battleHash } from '../../../js/battle.js';
import { roomTemperature, survivingFraction } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H7 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #111-#117): the enemy decides each enemy.decisionInterval from its own
// model and its own ship: the zone to scan (the auto-scan rule), the room to target (the priority, from its model), the
// preset (heat above its caution threshold -> Cool, buffer below it -> Evade, else Fire); patience holds its first shot
// until floor(6 x patience) zones are resolved; deterministic: the same seed gives the same battle (E2).
//
// Setup (T1): createBattle with knowledge on; the enemy R1d-A (T, an antenna on its hold) against R1d (A, static: no
// helm, an empty plan, it never fires) on bearing -y at 900 m, both at rest; personalities (aggression, patience,
// caution, resolve): (0.5, 0, 0.5, 0.5), (0.5, 0.5, 0.5, 0.5), (0.5, 1, 0.5, 0.5) and (0.5, 0.34, 1, 0.5); 60 s.
// Hand-worked: the zones resolved at its first shot = floor(6 x patience): 0, 3, 6 (the first three); a decision at
// every whole second (enemy.decisionInterval 1 s: steps 0, 60, 120, ...); at each decision the preset is Cool iff the
// hottest room's fraction (T - 290) / (hot - 290) is above 1 - caution, else Evade iff the shield buffers' fraction of
// their full charge (shield.buffer x the generator's footprint factor x its surviving fraction; full before it is
// first drawn) is below caution, else Fire (recomputed here from the rooms' kernel states before the step). With
// caution 1 the enemy turns to Cool at its first decision with any room above rest. The same seed twice: the same
// battle hash.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.enemy.decide',
  level: 'L4',
  laws: ['the enemy decides each enemy.decisionInterval: scan, target, preset by heat and buffer against its caution (#111-#117, 13n.1 (d))', 'patience: floor(6 x patience) zones resolved before its first shot (13n.1 (d))', 'deterministic: the same seed, the same battle (E2, #112)'],
  dependsOn: ['L4.orders.energy'],
  setup: 'T1: createBattle, knowledge on; the enemy R1d-A against a static R1d on bearing -y at 900 m, at rest; four personalities; 60 s; the second personality run twice (13n.4 H7)',
  measure: 'the zones resolved at the enemy\'s first shot; the decision steps; each decision\'s preset against the rule recomputed from the kernel\'s states; the battle hash of two runs',
  tolerance: 'counts and steps exact',
  criterion: 'zones at the first shot 0 / 3 / 6 for patience 0 / 0.5 / 1; decisions at every 60th step until the battle ends (the enemy may end it); every decision\'s preset by the rule; caution 1: Cool from a decision; the two runs\' hashes equal',
  tunable: ['enemy.decisionInterval', 'sensor.scanTime'],
  locked: null,
  cases() {
    return [[0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0.5, 1, 0.5, 0.5], [0.5, 0.34, 1, 0.5]].map(([aggression, patience, caution, resolve]) => ({ aggression, patience, caution, resolve }));
  },
  expected(ctx, c) {
    return { zones: c.caution === 1 ? null : Math.floor(6 * c.patience), every: 60, cools: c.caution === 1 };
  },
  run(ctx, c) {
    const go = () => {
      const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS.R1d, target: SENSOR_SHIPS['R1d-A'], bearing: '-y', knowledge: true, enemy: { T: c } });
      const T = b.target, w = T.world;
      let first = null, seen = 0, mismatch = 0;
      const ruled = [];
      while (b.step < 3600 && !b.ended) {
        if (b.step % 60 === 0) {
          let heat = 0, have = 0, cap = 0;
          for (const r of w.rooms) if (r.placed) heat = Math.max(heat, (roomTemperature(r) - 290) / (r.thresholds.hot - 290));
          for (const r of w.rooms) if (r.type === 'shieldGenerator') { const full = ctx.params.shield.buffer.value * r.footprintFactor * survivingFraction(r); have += r.shield.buffer === null ? full : r.shield.buffer; cap += full; }
          ruled.push({ step: b.step, preset: heat > 1 - c.caution ? 'cool' : have / cap < c.caution ? 'evade' : 'fire' });
        }
        tick(b);
        for (const e of w.log.events.slice(seen)) if (e.type === 'shot' && first === null) first = T.model.resolved.size;
        seen = w.log.events.length;
      }
      const decisions = T.enemy.decisions;
      decisions.forEach((d, i) => { if (!ruled[i] || ruled[i].step !== d.step || ruled[i].preset !== d.preset) mismatch++; });
      return { first, ran: b.step, steps: decisions.map((d) => d.step), presets: decisions.map((d) => d.preset), mismatch, hash: battleHash(b), zones: T.model.resolved.size };
    };
    const one = go(), two = c.patience === 0.5 ? go() : null;
    return { first: one.first, steps: one.ran, decisions: one.steps.length, everyOk: one.steps.every((s, i) => s === 60 * i), mismatch: one.mismatch, cools: one.presets.includes('cool'), presets: [...new Set(one.presets)], zones: one.zones, hash: one.hash, again: two ? two.hash : null };
  },
  compare(e, a) {
    const checks = {
      'zones resolved at the first shot = floor(6 x patience)': e.zones === null || a.first === e.zones,
      'a decision at every 60th step while the battle runs': a.everyOk && a.decisions === Math.min(60, Math.ceil(a.steps / 60)),
      'every decision\'s preset by the rule (recomputed)': a.mismatch === 0,
      'caution 1 turns to Cool': a.cools === e.cools || (!e.cools),
      'the same seed, the same hash': a.again === null || a.again === a.hash,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `zones at first shot ${r.expected.zones ?? '-'}, decisions every ${r.expected.every} steps${r.expected.cools ? ', Cool' : ''}`, actual: `zones at first shot ${a.first}, ${a.decisions} decisions, presets ${a.presets.join('/')}, ${a.mismatch} off the rule, ${a.zones} zones by 60 s, hash ${a.hash}${a.again ? ` / ${a.again}` : ''}` };
  },
};
