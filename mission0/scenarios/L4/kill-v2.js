import { createBattle, tick } from '../../../js/battle.js';
import { beamDeposit } from '../../../js/damage.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B6 of L4b (DESIGN.md 13l.4), successor of L4.kill (13l.7, #271: U1, N1, N2): the kill routes (#83). The battle loop (js/battle.js, 13l.1), the attacker R1d at rest
// 900 m from the target's centre of mass on bearing -y, bow-on. (R1 magazine) rounds into R1's magazine through its
// hold; (R1 reactor) rounds into R1's reactor through its shield generator; (R1d magazine, rounds) rounds into R1d's
// magazine through the hold and the citadel's plate under it; (R1d magazine, beam) the spinal beam held there.
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
  id: 'L4.kill.v2',
  level: 'L4',
  laws: ['a reactor\'s or a magazine\'s explosion destroys the ship, checked before Disabled (#83, 13l.1)', 'a breached reactor explodes reactor.breachCountdown later (#81)', 'a citadel\'s plate resists a round as a cell does and burns by its mass (#255, #258)'],
  dependsOn: [],
  setup: 'the battle loop at T1, attacker R1d at rest 900 m from the target\'s centre of mass on bearing -y, bow-on: (R1 magazine) its turret at R1\'s magazine; (R1 reactor) at R1\'s reactor; (R1d magazine, rounds) at R1d\'s magazine; (R1d magazine, beam) its beam at R1d\'s magazine; 200 s at most (13l.4 B6)',
  measure: 'how and when the battle ends; the explosion\'s step; (reactor) the breach\'s step; (rounds) the shot whose hit destroys the magazine\'s first cell, or breaches the reactor, and the shots launched by that step; the shots launched in all; (R1d, beam) the explosion\'s time against the scenario\'s own stepped sum of the burn along the beam\'s path',
  tolerance: 'step counts and shot counts exact; the beam\'s time one-sided in [t, t + dt) (1e-9 relative slack, #185 (2))',
  criterion: 'every case ends destroyed (not Disabled) by the explosion, in the explosion\'s step; (R1 reactor) the explosion exactly 600 steps after the breach (reactor.breachCountdown 10 s / (1/60) s, the literal hand-worked, 13l.7 N2); kernel-read literals, pinned as regressions (read off the kernel by tools/estimates/l4.mjs, 13l.3, and tools/estimates/hygiene.mjs (1), not derived; the blind checker re-derived 4 and 46 at L4b, #267 (11), and 10 by the hold, the plate and the repair, #267 (6)): (R1 magazine) the magazine\'s first cell destroyed by shot-4, 4 shots launched by that step; (R1 reactor) the reactor breached by shot-46, 46 shots launched by that step, 51 in all; (R1d, rounds) the magazine\'s first cell destroyed by shot-10, 10 shots launched by that step (13l.7 N1: a kernel reading, not hand-worked); (R1d, beam) re-statement: the scenario\'s own stepped sum along the kernel\'s beam line (each entry loses P F dt / (q m), F by the pure beamDeposit over sigma x chord, sigma / cos theta for the plate; repair as 13d.1) destroys the magazine\'s cell at t, and the explosion falls in [t, t + dt); hand-worked literal: with no repair and each entry taking the whole beam in turn, (2 x 9 MJ + 117.75 MJ + 9 MJ) / 5 MW = 28.95 s, so t lies in [28.95, 32] s; the beam\'s power is 0 (the first step) or 5 MW',
  tunable: ['reactor.breachCountdown', 'reactor.breachFraction', 'armour.plateThickness', 'matter.burnEnergyPerKg'],
  locked: { date: '2026-10-22', hash: '95c1e58f' },
  cases() {
    return [{ target: 'R1', aim: 'magazine' }, { target: 'R1', aim: 'reactor' }, { target: 'R1d', aim: 'magazine' }, { target: 'R1d', aim: 'magazine', weapon: 'beam' }];
  },
  expected(ctx, c) {
    // 600 hand-worked (10 s / (1/60) s); the shot ids and counts kernel-read (13l.7)
    const key = c.weapon ? null : c.target === 'R1d' ? { shot: 'shot-10', launched: 10 } : c.aim === 'magazine' ? { shot: 'shot-4', launched: 4 } : { shot: 'shot-46', launched: 46, all: 51 };
    return { kind: 'destroyed', countdown: 600, key, bounds: [28.95, 32], powers: [0, 5e6] };
  },
  run(ctx, c) {
    const plan = c.weapon === 'beam' ? { beam: [c.aim] } : { turret: [c.aim] };
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: '-y', plan });
    let sum = null, key = null;
    const keyOf = (ev) => (c.aim === 'reactor' ? ev.find((e) => e.type === 'breach') : ev.find((e) => e.type === 'cell-destroyed' && e.room === 'magazine' && /^shot-/.test(e.cause)));
    if (c.weapon === 'beam') sum = beamSum(b);
    else while (!b.ended && b.step < Math.round(LIMIT / b.dt)) { tick(b); if (!key) { const e = keyOf(b.target.world.log.events); if (e) key = { cause: e.cause, launched: b.shots }; } }
    const ev = b.target.world.log.events, stepOf = (t) => Math.round(t / b.dt);
    const boom = ev.find((e) => e.type === 'explosion'), breach = ev.find((e) => e.type === 'breach');
    const magCell = ev.find((e) => e.type === 'cell-destroyed' && e.room === 'magazine' && /^shot-/.test(e.cause));
    return {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step, t: b.ended.t, by: b.ended.by } : null,
      boom: boom ? { room: boom.room, step: stepOf(boom.t), t: boom.t } : null, breach: breach ? stepOf(breach.t) : null,
      magCell: magCell ? magCell.cause : null, sum, key, shots: b.shots,
    };
  },
  compare(e, a, c) {
    const checks = {
      'destroyed by the explosion in its step': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.ended.by === 'explosion' && !!a.boom && a.boom.room === c.aim && a.boom.step === a.ended.step,
    };
    if (c.aim === 'reactor') checks['600 steps after the breach'] = a.breach !== null && a.boom.step - a.breach === e.countdown;
    if (c.target === 'R1d' && !c.weapon) checks['the first magazine cell by shot-10'] = a.magCell === e.key.shot;
    if (e.key) checks[`${c.aim === 'reactor' ? 'breached' : 'the first magazine cell'} by ${e.key.shot}, ${e.key.launched} launched by then (kernel-read)`] = !!a.key && a.key.cause === e.key.shot && a.key.launched === e.key.launched;
    if (e.key && e.key.all !== undefined) checks[`${e.key.all} shots in all (kernel-read)`] = a.shots === e.key.all;
    if (c.weapon === 'beam') {
      const t = a.sum.ownT, dt = 1 / 60;
      checks['explosion in [t, t + dt) of the own sum'] = t !== null && a.boom.t >= t * (1 - 1e-9) && a.boom.t < (t + dt) * (1 + 1e-9);
      checks['own sum within the hand-worked bounds'] = t !== null && t >= e.bounds[0] && t <= e.bounds[1];
      checks['beam power 0 or 5 MW'] = a.sum.powers.every((p) => e.powers.includes(p));
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `destroyed by the ${r.case.aim}'s explosion${r.case.aim === 'reactor' ? `, ${r.expected.countdown} steps after the breach` : ''}${r.expected.key ? `, key event by ${r.expected.key.shot} (${r.expected.key.launched} launched)` : ''}${r.case.weapon ? ', in [t, t + dt) of the own sum' : ''}`, actual: `${a.ended ? `${a.ended.kind} ${a.ended.side} in step ${a.ended.step} (${a.ended.by})` : 'no end'}; explosion ${a.boom ? `${a.boom.room} step ${a.boom.step} t ${a.boom.t.toFixed(4)}` : '-'}${a.breach !== null ? `; breach step ${a.breach}` : ''}${a.magCell ? `; magazine cell by ${a.magCell}` : ''}${a.key ? `; key by ${a.key.cause}, ${a.key.launched} launched, ${a.shots} in all` : ''}${a.sum ? `; own sum t ${a.sum.ownT === null ? '-' : a.sum.ownT.toFixed(4)} s` : ''}` };
  },
};
