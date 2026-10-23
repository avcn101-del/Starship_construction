import { createBattle, tick } from '../../../js/battle.js';
import { isDestroyed, survivingCells } from '../../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.route.overheat.v2 (withdrawn under #286): overheat shown through R1's bridge. With the turret by its
// mount (#285) the beam held on T-gun's turret burns its 4975 kg cells out before it overheats, so heat decapitates
// instead (#185 (6), #286 (2)). The battle loop (js/battle.js, 13l.1), the attacker R1d at rest 900 m away, bow-on.
// (route) target R1, bearing -y (its bridge [5, 7) x [2, 4) is open from -y), R1d's spinal beam held on the bridge: the
//   bridge shuts down by heat (cause heat), gives no control, every reactor SCRAMs, and R1 is Disabled with why
//   no-control, the tree's root heat.
// (T-gun) target T-gun, bearing +x, the beam on its turret (cascade.v3's B4 setup, the target not firing): the beam
//   destroys the turret, Disabled with why destroyed, the turret never shut down.
// The bound (13l.7's L4.route.overheat.v2 row, its method): the bridge's temperature rises at most at
// (P_beam + P_own) / C(t). C(t) >= C_surv, the heat capacity of the bridge cells standing at the shutdown (a destroyed
// cell takes its share of the capacity and of the heat away, so the temperature does not jump). P_beam = beam.power
// 5 MW is the most the beam can put in. P_own = bridge.powerDraw 100 kW x the surviving fraction <= 100 kW: the bridge's
// draw is heat in it (js/rooms.js heatRate). The walls (conduction and life support's pump) only take heat out of the
// bridge here: a kernel reading checked every step to the shutdown, the bound's premise. So
// t >= C_surv dT / (P_beam + P_own) = 2 x 600 000 x (350 - 290) / (5e6 + 1e5) = 7.2e7 / 5.1e6 = 14.1176 s
// (2 cells a kernel reading; thermal.coupledCrewed 600 000 J/K a cell; 290 K the rest temperature, 350 K
// thermal.crewedOverheated).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const LIMIT = 300; // s

export default {
  id: 'L4.route.overheat.v3',
  level: 'L4',
  laws: ['a crewed room shuts down when overheated (13c.1)', 'an overheated bridge gives no control, so heat can decapitate (#185 (6), 13f.1)', 'losing control SCRAMs a reactor (#81)', 'the beam deposits its energy along its path as heat and burn (13i.1, #240 (1))'],
  dependsOn: [],
  setup: 'the battle loop at T1, attacker R1d at rest 900 m from the target\'s centre of mass, bow-on, its spinal beam held on a room, the target not firing; 300 s at most: (route) target R1 (mission0/targets.js), bearing -y, the beam on the bridge; (T-gun) target T-gun, bearing +x, the beam on its turret (#286 (2), 13l.2 "From L5m")',
  measure: 'how the battle ends, in which step and why; (route) the chain of parents from the Disabled event; the bridge\'s shutdown event (time, step, cause), the cells it has left then, its heat capacity then, its temperature at the start; the net heat into the bridge through its walls each step to the shutdown; the control-lost events and their parents; every room\'s control and every reactor\'s SCRAM at the end; the bridge\'s state at the end; (T-gun) the Disabled event\'s parent, the turret\'s state, any shutdown event of the turret, the step of its last cell',
  tolerance: 'exact (states, events, step counts); the shutdown time one-sided against its lower bound (1e-9 relative slack, #185 (2)); the bound\'s literal 1e-3 s; the rest temperature 1e-9 K',
  criterion: '(route) the target R1 is Disabled (no explosion) with why no-control; the Disabled event\'s chain of parents runs through the bridge\'s control-lost (cause overheat) and the bridge\'s shutdown (cause heat) to the root heat; the bridge is not destroyed when the target is Disabled (its ability lost by shutdown, not by destruction) and gives no control; every other placed room has a control-lost whose parent is the bridge\'s control-lost and is not controlled at the end; every reactor is SCRAMmed; the shutdown time t satisfies the hand-worked one-sided bound t >= C_surv dT / (P_beam + P_own) (the method of 13l.7\'s L4.route.overheat.v2 row): C_surv = 2 cells x thermal.coupledCrewed 600 000 J/K = 1.2e6 J/K (the 2 cells standing at the shutdown a kernel reading, pinned), dT = 350 - 290 = 60 K (thermal.crewedOverheated from the rest temperature, 290 K checked), P_beam = beam.power 5 MW, P_own = bridge.powerDraw 100 kW (the bridge\'s draw is heat in it; at most this), 7.2e7 / 5.1e6 = 14.118 s; its premise that the walls only take heat out (conduction and life support\'s pump) checked every step to the shutdown (a kernel reading); kernel-read, pinned as regressions (#286\'s probe: 22.98 s and 32.98 s): the shutdown in step 1379 and Disabled in step 1979, the literal 600 steps (battle.disabledSeconds / dt) later (hand-worked gap). (T-gun) the target T-gun is Disabled (no explosion) with why destroyed; the Disabled event\'s parent is the turret\'s cell-destroyed caused by the beam (beam-n); the turret is destroyed and has no shutdown event (#286 (2): the beam destroys the turret before it overheats); kernel-read, pinned: the turret\'s last cell in step 811 and Disabled in step 1411, 600 steps later',
  tunable: ['thermal.crewedOverheated', 'beam.power', 'battle.disabledSeconds', 'bridge.powerDraw'],
  locked: { date: '2026-10-23', hash: 'c80efbfa' },
  cases() {
    return [{ target: 'R1', bearing: '-y', room: 'bridge' }, { target: 'T-gun', bearing: '+x', room: 'turret' }];
  },
  expected(ctx, c) {
    if (c.target === 'T-gun') return { kind: 'disabled', why: 'destroyed', parent: 'cell-destroyed:turret', cell: 811, step: 1411, gap: 600 }; // 811, 1411 kernel-read; 600 hand-worked
    const cells = 2, perCell = 600000, rest = 290, dT = 350 - rest, beam = 5e6, own = 1e5; // hand-worked; 2 cells kernel-read
    return { kind: 'disabled', why: 'no-control', root: 'heat', rest, surviving: cells, C: cells * perCell, bound: (cells * perCell * dT) / (beam + own), literal: 14.118, shutdownStep: 1379, step: 1979, gap: 600 };
  },
  run(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: { beam: [c.room] } });
    const w = b.target.world, x = b.target.room(c.room);
    const rest = x.heat.Q / x.heat.C;
    let shutdown = null, wallsIn = -Infinity, last = null;
    while (!b.ended && b.step < Math.round(LIMIT / b.dt)) {
      const before = x.heat.conducted;
      tick(b);
      if (!shutdown) {
        wallsIn = Math.max(wallsIn, x.heat.conducted - before); // net heat in through the walls this step (conduction and the pump)
        const e = w.log.events.find((y) => y.type === 'shutdown' && y.room === c.room);
        if (e) shutdown = { t: e.t, step: Math.round(e.t / b.dt), cause: e.cause, surviving: survivingCells(x), C: x.heat.C };
      }
      if (!last && survivingCells(x) === 0) last = [...w.log.events].reverse().find((y) => y.type === 'cell-destroyed' && y.room === c.room);
    }
    const ev = w.log.events, byId = new Map(ev.map((y) => [y.id, y]));
    const chain = [];
    for (let id = b.ended ? b.ended.event : null; id && byId.has(id); id = byId.get(id).parent) { const y = byId.get(id); chain.push(`${y.type}:${y.room}:${y.cause}`); if (!byId.has(y.parent)) chain.push(y.parent); }
    const parent = b.ended ? byId.get(b.ended.parent) : null;
    const out = {
      ended: b.ended ? { kind: b.ended.kind, side: b.ended.side, t: b.ended.t, step: b.ended.step, why: b.ended.why } : null,
      parent: parent ? { type: parent.type, room: parent.room, cause: parent.cause } : null,
      explosions: ev.filter((y) => y.type === 'explosion').length,
      room: { destroyed: isDestroyed(x), shutdowns: ev.filter((y) => y.type === 'shutdown' && y.room === c.room).length },
      chain,
    };
    if (c.target === 'T-gun') return { ...out, lastCell: last ? Math.round(last.t / b.dt) : null };
    const cut = ev.find((y) => y.type === 'control-lost' && y.room === 'bridge');
    const placed = w.rooms.filter((r) => r.placed && r.type !== 'bridge');
    return {
      ...out, rest, shutdown, wallsIn,
      bridgeControl: x.bridge.control,
      lostUnderBridge: placed.filter((r) => cut && ev.some((y) => y.type === 'control-lost' && y.room === r.id && y.parent === cut.id)).map((r) => r.id).sort(),
      placed: placed.map((r) => r.id).sort(),
      controlled: placed.filter((r) => r.controlled).map((r) => r.id),
      reactors: w.rooms.filter((r) => r.type === 'reactor').map((r) => ({ id: r.id, scrammed: r.reactor.scrammed })),
    };
  },
  compare(e, a, c) {
    if (c.target === 'T-gun') {
      const t = {
        'Disabled, the target, no explosion': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0,
        'lost by destruction, the parent the turret\'s cell-destroyed by the beam': !!a.ended && a.ended.why === e.why && !!a.parent && `${a.parent.type}:${a.parent.room}` === e.parent && /^beam-\d+$/.test(String(a.parent.cause)),
        'the turret destroyed, never shut down': a.room.destroyed && a.room.shutdowns === 0,
        'the last cell in step 811, Disabled in step 1411 (kernel-read), 600 steps later': a.lastCell === e.cell && !!a.ended && a.ended.step === e.step && a.ended.step - a.lastCell === e.gap,
      };
      return { pass: Object.values(t).every(Boolean), note: notes(t) };
    }
    const s = a.shutdown, ch = a.chain;
    const checks = {
      'Disabled, the target, no explosion, why no-control': !!a.ended && a.ended.kind === e.kind && a.ended.side === 'T' && a.explosions === 0 && a.ended.why === e.why,
      'the chain runs through control-lost:bridge (overheat) and shutdown:bridge (heat) to the root heat': ch.includes('control-lost:bridge:overheat') && ch.includes('shutdown:bridge:heat') && ch.indexOf('control-lost:bridge:overheat') < ch.indexOf('shutdown:bridge:heat') && ch[ch.length - 1] === e.root,
      'the bridge not destroyed, giving no control': !a.room.destroyed && a.bridgeControl === false,
      'every other placed room lost control under the bridge\'s control-lost, none controlled': JSON.stringify(a.lostUnderBridge) === JSON.stringify(a.placed) && a.controlled.length === 0,
      'every reactor SCRAMmed': a.reactors.length > 0 && a.reactors.every((r) => r.scrammed),
      'rest temperature 290 K': Math.abs(a.rest - e.rest) <= 1e-9,
      'bound 14.118 s (hand-worked literal)': Math.abs(e.bound - e.literal) <= 1e-3,
      'the walls only take heat out of the bridge to the shutdown (the premise)': a.wallsIn <= 0,
      'shutdown cause heat at t >= C_surv dT / (P_beam + P_own)': !!s && s.cause === 'heat' && s.t >= e.bound * (1 - 1e-9),
      '2 cells standing at the shutdown, C 1.2e6 J/K (kernel-read)': !!s && s.surviving === e.surviving && s.C === e.C,
      'shutdown in step 1379, Disabled in step 1979 (kernel-read), 600 steps later': !!s && s.step === e.shutdownStep && !!a.ended && a.ended.step === e.step && a.ended.step - s.step === e.gap,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    const end = a.ended ? `${a.ended.kind} ${a.ended.side} at ${a.ended.t.toFixed(4)} s, step ${a.ended.step} (${a.ended.why})` : 'no end';
    if (r.case.target === 'T-gun') return { expected: `Disabled (destroyed) in step ${e.step}, parent ${e.parent} by the beam; turret destroyed, never shut down; last cell in step ${e.cell}`, actual: `${end}; parent ${a.parent ? `${a.parent.type}:${a.parent.room} (${a.parent.cause})` : '-'}; turret destroyed ${a.room.destroyed}, ${a.room.shutdowns} shutdowns; last cell in step ${a.lastCell}` };
    return { expected: `Disabled (no-control) in step ${e.step}; chain to heat through the bridge's shutdown at t >= ${e.bound.toFixed(4)} s in step ${e.shutdownStep}; control lost everywhere; reactors SCRAMmed`, actual: `${end}; chain ${a.chain.join(' <- ')}; shutdown ${s(a.shutdown)}; walls in max ${a.wallsIn.toExponential(3)} J/step; bridge destroyed ${a.room.destroyed}, control ${a.bridgeControl}; control-lost under the bridge [${a.lostUnderBridge}]; still controlled [${a.controlled}]; reactors ${JSON.stringify(a.reactors)}; rest ${a.rest} K` };
  },
};
const s = (x) => (x ? `${x.t.toFixed(4)} s step ${x.step} (${x.cause}), ${x.surviving} cells, C ${x.C}` : '-');
