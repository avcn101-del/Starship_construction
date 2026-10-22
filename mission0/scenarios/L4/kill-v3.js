import { createBattle, tick, largestFraction } from '../../../js/battle.js';
import { beamDeposit } from '../../../js/damage.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// K3 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #273 (c), #274, #278), successor of L4.kill.v2 (withdrawn under #278:
// its magazine cases record the L4 rule, "destroyed by the magazine's explosion in its step", and the detonation by a
// destroyed cell). The battle loop (js/battle.js), the attacker R1d at rest 900 m from the target's centre of mass on
// bearing -y, bow-on. (R1 magazine) rounds into R1's magazine through its hold; (R1 reactor) rounds into R1's reactor
// through its shield generator (L4.kill.v2's reactor case, its checks kept); (R1d magazine, rounds) rounds into R1d's
// magazine through the hold and the citadel's plate under it; (R1d magazine, beam) the spinal beam held there.
// Under 13n.1 (b) a magazine detonates when a round enters a standing cell of it at magazine.detonationSpeed (400 m/s)
// or more, and its explosion is a blast through its walls that ends nothing by itself; the ship is destroyed by a
// reactor's explosion or by pieces (battle.wreckFraction 0.5).
// Hand-worked (the round rule, 13i.1; c 1545.364, A0 3.0609e-3 m^2, S 3.029e6): R1's column from -y is two hold cells
// (sigma 120) then the magazine: the first takes 567.62 N s of 4800 (f 0.0612, A 3.2605e-3), the second 604.64 N s:
// the round enters the magazine at 3627.7 / 6 = 604.6 m/s >= 400: shot-1 detonates it (one hit). On R1d the citadel's
// 0.2 m plate (sigma 1570) under the magazine stops every round until it is a hole; then a round crosses two holes and a
// hole and enters at the full 800 m/s less the hull's own motion: kernel-read, labelled (tools/estimates/l5.mjs (2)):
// the two hold cells of the column destroyed by shot-4, the plate by shot-6, the detonation by shot-7.
// The end: R1's full magazine (150 HE, 1.2e9 J) against R1's whole blast capacity (94 MJ, 13n.1 (b)) wrecks every room;
// the reactor's cells are among them, so the reactor explodes in the same step and, checked first (13l.1), names the
// end; the largest fragment is then under wreckFraction too (pieces). Checked: destroyed, in the detonation's step,
// not by the magazine's explosion, the largest fragment under 0.5 at the end; the end's event naming the reactor's
// explosion is kernel-read, labelled (13n.4 K3 reads "by pieces": a question in the pull request).
// The beam case under 13n.1 (b): a destroyed magazine cell no longer detonates it, so the beam burns the magazine's
// cells one by one and, with the last, its rounds leave as debris; the battle has no end by the limit (the target's
// turret keeps its ready store): kernel-read, labelled; the first cell's destruction still checked against the
// scenario's own stepped sum of the burn, as L4.kill.v2 did for its explosion.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const LIMIT = 200; // s
// The beam case's own stepped sum (re-statement of 13i.1 and #258 along the line the kernel's battle draws, with the
// masses as literals): hold cell 3000 kg, the 0.2 m plate 39 250 kg (sigma 1570 kg/m^2 over cos theta), magazine cell
// 3000 kg; q = 3000 J/kg; repair by R1d's quarters as 13d.1 (repair.massRate 200 kg/s, half strength at 30 m between
// room centres, the asks scaled to the budget, granted from the start of the step, before the burn).
const MASS = { hold: 3000, magazine: 3000, plate: 39250 };
const IRON = { protonRest: 938.272 * 1.602176634e-13, electronRest: 0.51099895 * 1.602176634e-13, K: 0.307075 * 1.602176634e-17, ZA: 465.57, I: 286e-6 * 1.602176634e-13, lambda: 1321 };

function beamSum(b) {
  // Run the battle; beside it, the scenario's own integrities of the entries the beam meets.
  const T = b.target, q = 3000, dt = b.dt, own = new Map(), roomPos = new Map(T.world.rooms.map((r) => [r.id, r.position]));
  const qPos = roomPos.get('quarters');
  let ownT = null, powers = new Set();
  const key = (x) => (x.plate ? `plate:${x.plate.id}` : `${x.room.id}:${x.cell}`);
  while (!b.ended && b.step < Math.round(LIMIT / dt)) {
    tick(b);
    const x = b.beam;
    // repair, from the integrities at the start of the step (the cells the beam damaged)
    const damaged = [...own.entries()].filter(([k, v]) => !k.startsWith('plate:') && v > 0 && v < 1);
    const asks = damaged.map(([k]) => { const p = roomPos.get(k.split(':')[0]), r = Math.hypot(p[0] - qPos[0], p[1] - qPos[1]); return 200 / (1 + (r / 30) ** 2); });
    const sum = asks.reduce((s, a) => s + a, 0), scale = sum > 200 ? 200 / sum : 1;
    damaged.forEach(([k, v], i) => own.set(k, Math.min(1, v + ((asks[i] * scale) / MASS[k.split(':')[0]]) * dt)));
    if (!x || !x.hit) continue;
    powers.add(x.power);
    const path = x.hit.path.filter((y) => y.plate || MASS[y.room.id]);
    const sig = path.map((y) => { const v = own.has(key(y)) ? own.get(key(y)) : 1; return v > 0 ? (y.plate ? 1570 / Math.max(y.cos ?? 1, 0.2 / 5) : MASS[y.room.id] / 25) * (y.chord ?? 1) : 0; });
    const F = beamDeposit(x.energy, sig, IRON).fractions;
    path.forEach((y, i) => {
      if (!(F[i] > 0)) return;
      const k = key(y), v = (own.has(k) ? own.get(k) : 1) - (x.power * F[i] * dt) / (q * (y.plate ? MASS.plate : MASS[y.room.id]));
      own.set(k, v > 1e-12 ? v : 0);
      if (k === 'magazine:0' && own.get(k) === 0 && ownT === null) ownT = b.t;
    });
  }
  return { ownT, powers: [...powers] };
}

export default {
  id: 'L4.kill.v3',
  level: 'L4',
  laws: ['a magazine detonates when a round enters one of its standing cells at magazine.detonationSpeed or more (#273 (c), 13n.1 (b))', 'a magazine\'s explosion is a blast through its walls; the ship is destroyed by a reactor\'s explosion or by pieces (#274, 13n.1 (b))', 'a breached reactor explodes reactor.breachCountdown later (#81)', 'a citadel\'s plate resists a round as a cell does and burns by its mass (#255, #258)'],
  dependsOn: [],
  setup: 'the battle loop at T1, attacker R1d at rest 900 m from the target\'s centre of mass on bearing -y, bow-on: (R1 magazine) its turret at R1\'s magazine; (R1 reactor) at R1\'s reactor; (R1d magazine, rounds) at R1d\'s magazine; (R1d magazine, beam) its beam at R1d\'s magazine; 200 s at most (13n.4 K3)',
  measure: 'how and when the battle ends; (magazine, rounds) the detonation event, its shot and its entry speed, the shots launched by then, the largest fragment at the end; (R1d, rounds) the shots that destroyed the column\'s two hold cells and the plate; (reactor) the breach and the explosion steps, the shots; (beam) the magazine\'s cells destroyed, the explosions, the end, the first cell\'s time against the scenario\'s own stepped sum',
  tolerance: 'step counts and shot counts exact; the entry speed 0.1 m/s against the hand-worked literal; the beam\'s time one-sided in [t, t + dt) (1e-9 relative slack, #185 (2))',
  criterion: '(R1 magazine) shot-1 detonates the magazine (one hit, 1 launched), entering at 604.6 m/s (hand-worked); (R1d magazine, rounds) shot-7 detonates it (7 launched), the column\'s two hold cells destroyed by shot-4 and the plate by shot-6 (kernel-read, labelled); in both: the battle ends destroyed (not Disabled) in the detonation\'s step, its end not the magazine\'s explosion, the largest fragment under battle.wreckFraction at the end (by pieces), and the end\'s event the reactor\'s explosion (kernel-read, labelled: the blast wrecks the reactor, checked before pieces, 13l.1); (R1 reactor, L4.kill.v2\'s checks) destroyed by the reactor\'s explosion in its step, 600 steps after the breach (reactor.breachCountdown 10 s / (1/60) s, hand-worked), breached by shot-46 with 46 launched, 51 in all (kernel-read); (R1d magazine, beam) no explosion, the magazine\'s four cells destroyed and its rounds gone, no end by 200 s (kernel-read, labelled), and its first cell destroyed in [t, t + dt) of the scenario\'s own stepped sum (re-statement as L4.kill.v2), t within the hand-worked bounds [28.95, 32] s',
  tunable: ['magazine.detonationSpeed', 'reactor.breachCountdown', 'reactor.breachFraction', 'armour.plateThickness', 'matter.burnEnergyPerKg', 'battle.wreckFraction'],
  locked: null,
  cases() {
    return [{ target: 'R1', aim: 'magazine' }, { target: 'R1', aim: 'reactor' }, { target: 'R1d', aim: 'magazine' }, { target: 'R1d', aim: 'magazine', weapon: 'beam' }];
  },
  expected(ctx, c) {
    // 600 hand-worked (10 s / (1/60) s), 604.6 m/s hand-worked; the other shot ids and counts kernel-read
    if (c.weapon) return { kind: null, bounds: [28.95, 32], powers: [0, 5e6] };
    if (c.aim === 'reactor') return { kind: 'destroyed', countdown: 600, key: { shot: 'shot-46', launched: 46, all: 51 } };
    return c.target === 'R1' ? { kind: 'destroyed', key: { shot: 'shot-1', launched: 1 }, speed: 604.6, wreck: 0.5 } : { kind: 'destroyed', key: { shot: 'shot-7', launched: 7 }, holds: 'shot-4', plate: 'shot-6', wreck: 0.5 };
  },
  run(ctx, c) {
    const plan = c.weapon === 'beam' ? { beam: [c.aim] } : { turret: [c.aim] };
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: '-y', plan });
    let sum = null, key = null;
    const keyOf = (ev) => (c.aim === 'reactor' ? ev.find((e) => e.type === 'breach') : ev.find((e) => e.type === 'detonation'));
    if (c.weapon === 'beam') sum = beamSum(b);
    else while (!b.ended && b.step < Math.round(LIMIT / b.dt)) { tick(b); if (!key) { const e = keyOf(b.target.world.log.events); if (e) key = { cause: e.cause, launched: b.shots }; } }
    const T = b.target, ev = T.world.log.events, stepOf = (t) => Math.round(t / b.dt);
    const booms = ev.filter((e) => e.type === 'explosion'), breach = ev.find((e) => e.type === 'breach'), det = ev.find((e) => e.type === 'detonation');
    const end = b.ended ? ev.find((e) => e.id === b.ended.event) : null, endParent = end ? ev.find((e) => e.id === end.parent) : null;
    const magCells = ev.filter((e) => e.type === 'cell-destroyed' && e.room === 'magazine');
    const holds = ev.filter((e) => e.type === 'cell-destroyed' && e.room === 'hold' && (e.cell === 0 || e.cell === 2)).map((e) => e.cause);
    const plate = ev.find((e) => e.type === 'plate-destroyed');
    const contents = T.room('magazine').magazine;
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, t: b.ended.t, by: b.ended.by } : null,
      endOf: endParent ? { type: endParent.type, room: endParent.room } : null,
      fraction: largestFraction(T.world, T.undock),
      booms: booms.map((e) => ({ room: e.room, step: stepOf(e.t) })), breach: breach ? stepOf(breach.t) : null,
      detonation: det ? { cause: det.cause, speed: det.speed, step: stepOf(det.t) } : null,
      holds: holds.length === 2 && holds[0] === holds[1] ? holds[1] : holds.join('+'), plate: plate ? plate.cause : null,
      magCells: magCells.map((e) => ({ cause: e.cause, t: e.t })), rounds: contents.ap + contents.he,
      sum, key, shots: b.shots,
    };
  },
  compare(e, a, c) {
    const checks = {};
    if (c.weapon === 'beam') {
      const t = a.sum.ownT, dt = 1 / 60, first = a.magCells.find((x) => x.cause === 'beam-1');
      checks['no explosion (kernel-read)'] = a.booms.length === 0;
      checks['the magazine\'s four cells destroyed, its rounds gone (kernel-read)'] = a.magCells.length === 4 && a.rounds === 0;
      checks['no end by 200 s (kernel-read)'] = a.ended === null;
      checks['first magazine cell in [t, t + dt) of the own sum'] = t !== null && !!first && first.t >= t * (1 - 1e-9) && first.t < (t + dt) * (1 + 1e-9);
      checks['own sum within the hand-worked bounds'] = t !== null && t >= e.bounds[0] && t <= e.bounds[1];
      checks['beam power 0 or 5 MW'] = a.sum.powers.every((p) => e.powers.includes(p));
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    if (c.aim === 'reactor') {
      const boom = a.booms.find((x) => x.room === 'reactor');
      checks['destroyed by the reactor\'s explosion in its step'] = !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.ended.by === 'explosion' && !!boom && boom.step === a.ended.step && !!a.endOf && a.endOf.type === 'explosion' && a.endOf.room === 'reactor';
      checks['600 steps after the breach'] = a.breach !== null && !!boom && boom.step - a.breach === e.countdown;
      checks['breached by shot-46, 46 launched by then (kernel-read)'] = !!a.key && a.key.cause === e.key.shot && a.key.launched === e.key.launched;
      checks['51 shots in all (kernel-read)'] = a.shots === e.key.all;
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    checks[`${e.key.shot} detonates the magazine, ${e.key.launched} launched by then`] = !!a.detonation && a.detonation.cause === e.key.shot && !!a.key && a.key.cause === e.key.shot && a.key.launched === e.key.launched;
    if (e.speed !== undefined) checks['entry speed 604.6 m/s (hand-worked, 0.1)'] = !!a.detonation && Math.abs(a.detonation.speed - e.speed) <= 0.1;
    if (e.holds) { checks['the column\'s two hold cells by shot-4 (kernel-read)'] = a.holds === e.holds; checks['the plate by shot-6 (kernel-read)'] = a.plate === e.plate; }
    checks['destroyed (not Disabled) in the detonation\'s step'] = !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && !!a.detonation && a.detonation.step === a.ended.step;
    checks['the end is not the magazine\'s explosion'] = !!a.endOf && !(a.endOf.type === 'explosion' && a.endOf.room === 'magazine');
    checks['the largest fragment under battle.wreckFraction at the end (pieces)'] = a.fraction < e.wreck;
    checks['the end\'s event the reactor\'s explosion (kernel-read)'] = !!a.endOf && a.endOf.type === 'explosion' && a.endOf.room === 'reactor' && a.ended.by === 'explosion';
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: JSON.stringify(r.expected), actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} in step ${a.ended.step} (${a.ended.by}${a.endOf ? `: ${a.endOf.type} ${a.endOf.room}` : ''})` : 'no end'}; largest fragment ${a.fraction.toFixed(4)}; explosions ${a.booms.map((x) => `${x.room}@${x.step}`).join(' ') || '-'}${a.detonation ? `; detonation by ${a.detonation.cause} at ${a.detonation.speed.toFixed(4)} m/s, step ${a.detonation.step}` : ''}${a.breach !== null ? `; breach step ${a.breach}` : ''}${a.key ? `; key by ${a.key.cause}, ${a.key.launched} launched` : ''}; ${a.shots} shots${a.sum ? `; own sum t ${a.sum.ownT === null ? '-' : a.sum.ownT.toFixed(4)} s, magazine cells ${a.magCells.map((x) => x.t.toFixed(4)).join(' ')}` : ''}` };
  },
};
