import { createBattle, runBattle, battleTree } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// B8 of L4b (DESIGN.md 13l.4): the cascade tree (#41, 13l.1). The battles of B1 (R1, rounds at the bridge from -y)
// and B6 (R1, rounds at the magazine from -y), attacker R1d at rest 900 m away, bow-on.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.cascade',
  level: 'L4',
  laws: ['every event carries a cause chain to a root: a shot, a beam, heat or launch (#41, 13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1, target R1, attacker R1d at rest 900 m from it on bearing -y, bow-on: (B1) its turret at the bridge; (B6) at the magazine; to the end (13l.4 B8)',
  measure: 'every event of both ships\' logs and its parent; the chain of parents from the end event; (B1) the events whose parent is the bridge\'s last cell-destroyed event, and the scram\'s parent',
  tolerance: 'exact',
  criterion: 'every event\'s parent is a root (a shot id, a beam id, heat, launch) or the id of an earlier event of the same log, on both ships (no error in js/events.js cascadeTree); (B1) the Disabled event\'s chain runs through the bridge\'s last cell-destroyed event to a shot id; that cell-destroyed event is the parent of a control-lost of every other placed room of R1 (the bridge\'s own included), and the reactor\'s scram is a child of the reactor\'s control-lost (13l.4: shot -> cell-destroyed (bridge) -> control-lost (each room) -> scram (reactor) -> Disabled; the Disabled event hangs from the control-lost of the last weapon to lose its ability, the first failing condition of 13l.1\'s able, a question in the pull request); (B6) the destroyed event\'s parent is the magazine\'s explosion, whose chain runs through a magazine cell-destroyed to a shot id',
  tunable: [],
  locked: { date: '2026-10-22', hash: 'bfad5f3d' },
  cases() {
    return [{ battle: 'B1', aim: 'bridge' }, { battle: 'B6', aim: 'magazine' }];
  },
  expected(ctx, c) {
    return c.battle === 'B1' ? { rooms: TARGETS.R1.rooms.map((r) => r.id).sort() } : { by: 'explosion' };
  },
  run(ctx, c) {
    const b = runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: [c.aim] } }), 200);
    const errors = battleTree(b).reduce((n, s) => n + s.errors.length, 0);
    const ev = b.target.world.log.events, byId = new Map(ev.map((e) => [e.id, e]));
    const chain = [];
    for (let id = b.ended ? b.ended.event : null; id && byId.has(id); id = byId.get(id).parent) { const e = byId.get(id); chain.push(`${e.type}:${e.room}`); if (!byId.has(e.parent)) chain.push(e.parent); }
    const out = { errors, events: ev.length + b.attacker.world.log.events.length, ended: b.ended ? b.ended.kind : null, chain };
    if (c.battle === 'B1') {
      const cut = [...ev].reverse().find((e) => e.type === 'cell-destroyed' && e.room === 'bridge');
      out.lost = ev.filter((e) => e.type === 'control-lost' && e.parent === cut.id).map((e) => e.room).sort();
      const scram = ev.find((e) => e.type === 'scram'), p = scram && byId.get(scram.parent);
      out.scramParent = p ? `${p.type}:${p.room}` : null;
      out.throughCut = chain.includes('cell-destroyed:bridge');
    }
    return out;
  },
  compare(e, a, c) {
    const root = a.chain[a.chain.length - 1];
    const checks = { 'every parent a root or an earlier event': a.errors === 0, 'the chain ends at a shot': /^shot-\d+$/.test(String(root)) };
    if (c.battle === 'B1') {
      checks['Disabled'] = a.ended === 'disabled';
      checks['through the bridge\'s last cell-destroyed'] = a.throughCut;
      checks['control-lost of every room under it'] = JSON.stringify(a.lost) === JSON.stringify(e.rooms);
      checks['scram under the reactor\'s control-lost'] = a.scramParent === 'control-lost:reactor';
    } else {
      checks['destroyed under the explosion, through a magazine cell'] = a.ended === 'destroyed' && a.chain[1] === 'explosion:magazine' && a.chain.includes('cell-destroyed:magazine');
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: r.case.battle === 'B1' ? `no errors; disabled <- control-lost <- cell-destroyed:bridge <- shot; control-lost of [${r.expected.rooms}]` : 'no errors; destroyed <- explosion:magazine <- cell-destroyed:magazine <- shot', actual: `${a.errors} errors in ${a.events} events; chain ${a.chain.join(' <- ')}${a.lost ? `; control-lost [${a.lost}]; scram under ${a.scramParent}` : ''}` };
  },
};
