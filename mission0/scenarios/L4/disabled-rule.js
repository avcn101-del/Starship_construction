import { createBattle, tick, weaponStates } from '../../../js/battle.js';
import { destroyCell, cellAt, isDestroyed } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B13 of L4b (DESIGN.md 13l.4; A11 moved from L4a, #258): the able rule and Disabled (#82 as amended by #255, 13l.1).
// The battle loop at T1, the attacker R1d at rest 900 m away on bearing -y holding fire; cells destroyed before undock
// (a fixture). (weapons lost) R1 with every cell of its beam bay and its turret destroyed, its engine intact; (no
// engine) T-gun with every engine cell destroyed, its turret holding fire; (cut off) T-gun with its turret's cell
// (8, 4) destroyed, which cuts the only wall between the turret and the magazine ((8, 3)-(8, 4)), the turret firing
// broadside (+y) from t = 0 until its ready store is empty.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const wreck = (world, room) => { for (let i = 0; i < room.cells.length; i++) destroyCell(world, room, i, 'launch'); };
const CASES = {
  'weapons lost': { target: 'R1', setup: (w, room) => { wreck(w, room('beamBay')); wreck(w, room('turret')); }, limit: 30 },
  'no engine': { target: 'T-gun', setup: (w, room) => wreck(w, room('engine')), limit: 30 },
  'cut off': { target: 'T-gun', setup: (w) => { const at = cellAt(w, [8, 4]); destroyCell(w, at.room, at.index, 'launch'); }, fire: true, limit: 60 },
};

export default {
  id: 'L4.disabled.rule',
  level: 'L4',
  laws: ['a weapon room is able while not destroyed, controlled, not shut down, active and joined through live walls to a reactor that can produce; a turret also needs a round in its store or a magazine with rounds that feeds it over a live wall (13l.1, #255)', 'no able weapon for battle.disabledSeconds: Disabled, whatever the engine does (#82, #255)'],
  dependsOn: [],
  setup: 'the battle loop at T1 with the attacker R1d holding fire 900 m away on bearing -y: (weapons lost) R1 without its beam bay and turret; (no engine) T-gun without its engine, turret holding fire; (cut off) T-gun with turret cell (8, 4) destroyed, firing broadside (13l.4 B13)',
  measure: 'how and in which step the battle ends; (weapons lost) the engine\'s state at the end; (no engine) whether a weapon was able at every step; (cut off) the turret\'s shots and why it lost its ability',
  tolerance: 'step counts exact',
  criterion: '(weapons lost) Disabled in step 600 (battle.disabledSeconds / dt after the start, when no weapon is able) with the engine not destroyed and controlled (#255); (no engine) not Disabled in 30 s, the turret able at every step; (cut off) the magazine cannot feed it, so the turret fires its turret.readyRounds = 4 rounds (steps 0, 120, 240, 360) and the target is Disabled in step (4 - 1) x 120 + 1 + 600 = 961 because it ran dry',
  tunable: ['battle.disabledSeconds', 'turret.readyRounds', 'turret.fireRate'],
  locked: { date: '2026-10-22', hash: 'f403e373' },
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    const p = ctx.params, gap = Math.round(p.battle.disabledSeconds.value / ctx.dt);
    if (c.name === 'weapons lost') return { kind: 'disabled', step: gap };
    if (c.name === 'no engine') return { kind: null };
    const n = p.turret.readyRounds.value;
    return { kind: 'disabled', step: Math.round((n - 1) / (p.turret.fireRate.value * ctx.dt)) + 1 + gap, shots: n, why: 'dry', literal: 961 };
  },
  run(ctx, c) {
    const k = CASES[c.name];
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[k.target], bearing: '-y', setup: { target: k.setup }, targetFire: k.fire ? { aim: [0, 1] } : null });
    let alwaysAble = true;
    while (!b.ended && b.step < Math.round(k.limit / b.dt)) { tick(b); alwaysAble = alwaysAble && weaponStates(b.target.world).some((x) => x.able); }
    const room = b.target.room, engine = room('engine'), t = room('turret');
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, why: b.ended.why } : null,
      engine: { destroyed: isDestroyed(engine), controlled: engine.controlled }, alwaysAble, shots: t.turret.shots,
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'weapons lost') checks = { 'Disabled in step 600': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.ended.step === e.step, 'with its engine': !a.engine.destroyed && a.engine.controlled };
    else if (c.name === 'no engine') checks = { 'not Disabled': a.ended === null, 'the turret able throughout': a.alwaysAble };
    else checks = { 'formula = literal 961': e.step === e.literal, 'Disabled in that step, dry': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.ended.step === e.step && a.ended.why === e.why, 'its ready store only': a.shots === e.shots };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: e.kind ? `Disabled in step ${e.step}` : 'not Disabled', actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} in step ${a.ended.step} (${a.ended.why})` : 'not ended'}; engine destroyed ${a.engine.destroyed}; able throughout ${a.alwaysAble}; shots ${a.shots}` };
  },
};
