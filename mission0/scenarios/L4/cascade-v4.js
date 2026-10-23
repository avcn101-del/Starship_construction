import { createBattle, runBattle, battleTree } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// Successor of L4.cascade.v3 (withdrawn under #286): every case of .v3, with B2 and B4 replaced by the routes of #286
// (the turret by its mount, #285, moved both): B2 is the mission kill on R1d (+y, rounds at the beam bay then the
// turret, L4.route.missionKill.v3), its end Disabled and its root a shot; B4 is overheat through R1's bridge (-y, the
// beam on the bridge, L4.route.overheat.v3), its end Disabled and its root heat, the Disabled event descending from the
// bridge's shutdown with cause heat. Every other case, check and literal as .v3.
// .v3's own header: successor of L4.cascade.v2 (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but for the
// magazine routes. A magazine now detonates when a round enters a standing cell of it at magazine.detonationSpeed or
// more (a detonation event, the explosion its child), and its explosion ends nothing by itself (#274): in B6 and R1d
// rounds its blast wrecks the reactor, whose explosion names the end (kernel-read, labelled; L4.kill.v3), so the
// destroyed event's chain runs explosion:reactor <- cell-destroyed:reactor <- explosion:magazine <- detonation:magazine
// <- the shot; in R1d beam a destroyed magazine cell no longer detonates it and the battle has no end by the limit
// (kernel-read, labelled; L4.kill.v3), so that case checks the tree alone and that no end and no explosion came.
// B8 of L4b (DESIGN.md 13l.4), successor of L4.cascade (13l.7, #271: C1): the cascade tree (#41, 13l.1). The
// battles of B1 (R1, rounds at the bridge from -y) and B6 (R1, rounds at the magazine from -y), as L4.cascade; and
// (13l.7) every other L4b battle: B2 (R1, +y, the beam bay then the turret), B3 (T-neck, -y, the neck), B4 (T-gun,
// +x, the beam on the turret), B5 (T-gun firing broadside +y until dry, the attacker holding fire), B6's R1d rounds
// and R1d beam cases (-y, at the magazine). Attacker R1d at rest 900 m away, bow-on, in all.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
// A root of the tree (13l.1): a shot id (the attacker's shot-n, or a ship's own room:shot-n), a beam id, heat or launch.
const ROOT = /^(heat|launch|(.+:)?(shot|beam)-\d+)$/;
const BATTLES = {
  B1: { target: 'R1', bearing: '-y', plan: { turret: ['bridge'] }, end: 'disabled', root: /^shot-\d+$/ },
  B6: { target: 'R1', bearing: '-y', plan: { turret: ['magazine'] }, end: 'destroyed', root: /^shot-\d+$/ },
  B2: { target: 'R1d', bearing: '+y', plan: { turret: ['beamBay', 'turret'] }, end: 'disabled', root: /^shot-\d+$/ },
  B3: { target: 'T-neck', bearing: '-y', plan: { turret: ['hold'] }, end: 'disabled', root: /^shot-\d+$/ },
  B4: { target: 'R1', bearing: '-y', plan: { beam: ['bridge'] }, end: 'disabled', root: /^heat$/ },
  B5: { target: 'T-gun', bearing: '-y', plan: {}, targetFire: { aim: [0, 1] }, limit: 400, end: 'disabled', root: /^turret:shot-\d+$/ },
  'R1d rounds': { target: 'R1d', bearing: '-y', plan: { turret: ['magazine'] }, end: 'destroyed', root: /^shot-\d+$/ },
  'R1d beam': { target: 'R1d', bearing: '-y', plan: { beam: ['magazine'] }, end: null, root: /^beam-\d+$/ },
};

export default {
  id: 'L4.cascade.v4',
  level: 'L4',
  laws: ['every event carries a cause chain to a root: a shot, a beam, heat or launch (#41, 13l.1)', 'Disabled\'s parent is the event of the first failing condition of the able rule, for the last weapon to lose its ability (#267 (3), 13l.1)'],
  dependsOn: [],
  setup: 'the battle loop at T1, attacker R1d at rest 900 m from the target on the case\'s bearing, bow-on: (B1) R1, -y, its turret at the bridge; (B6) R1, -y, at the magazine; (B2) R1d, +y, at the beam bay then the turret (#286 (1)); (B3) T-neck, -y, at the neck; (B4) R1, -y, the beam on the bridge (#286 (2)); (B5) T-gun firing broadside until dry, the attacker holding fire; (R1d rounds) R1d, -y, rounds at the magazine; (R1d beam) the beam there; to the end (13l.4 B8, 13l.7 C1, #286 (3))',
  measure: 'every event of both ships\' logs and its parent (js/battle.js battleTree); the chain of parents from the end event; (B1) the events whose parent is the bridge\'s last cell-destroyed event, the scram\'s parent and the Disabled event\'s parent; (B4) whether the end event\'s chain holds the bridge\'s shutdown event with cause heat',
  tolerance: 'exact',
  criterion: 'in every case: every event\'s parent is a root (a shot id, a beam id, heat, launch) or the id of an earlier event of the same log, on both ships (no error in js/battle.js battleTree), the battle ends as its route does (Disabled or destroyed; R1d beam: no end) and the end event\'s chain of parents ends at a root of the route\'s kind (kernel-read: a shot for B1, B2, B3, B6 and R1d rounds; heat for B4, the bridge\'s shutdown by overheating (#286 (2)); the target turret\'s own last shot for B5, run dry; the beam id for R1d beam, which has no end); (B1) the Disabled event\'s chain runs through the bridge\'s last cell-destroyed event to a shot id; that cell-destroyed event is the parent of a control-lost of every other placed room of R1 (the bridge\'s own included), the reactor\'s scram is a child of the reactor\'s control-lost, and the Disabled event\'s parent is the turret\'s control-lost (#267 (3): the first failing condition of the able rule, control, for the last weapon to lose it; 13l.7 C1); (B6, R1d rounds) the destroyed event\'s chain runs explosion:reactor, cell-destroyed:reactor, explosion:magazine, detonation:magazine to the shot (kernel-read: the magazine\'s blast wrecks the reactor, 13n.1 (b)); (R1d beam) no end by the limit and no explosion, the magazine\'s four cells destroyed (kernel-read: a destroyed cell no longer detonates it, 13n.1 (b)), every parent still a root or an earlier event; (B4, #286 (3)) the Disabled event descends from the bridge\'s shutdown with cause heat (that event in its chain of parents)',
  tunable: [],
  cases() {
    return Object.keys(BATTLES).map((battle) => ({ battle }));
  },
  expected(ctx, c) {
    const k = BATTLES[c.battle];
    return c.battle === 'B1' ? { end: k.end, rooms: TARGETS.R1.rooms.map((r) => r.id).sort(), disabledParent: 'control-lost:turret' } : { end: k.end };
  },
  run(ctx, c) {
    const k = BATTLES[c.battle];
    const b = runBattle(createBattle({ params: ctx.params, attacker: ATTACKER, target: TARGETS[k.target], bearing: k.bearing, plan: k.plan, targetFire: k.targetFire || null }), k.limit || 300);
    const errors = battleTree(b).reduce((n, s) => n + s.errors.length, 0);
    const ev = b.target.world.log.events, byId = new Map(ev.map((e) => [e.id, e]));
    const chain = [];
    for (let id = b.ended ? b.ended.event : null; id && byId.has(id); id = byId.get(id).parent) { const e = byId.get(id); chain.push(`${e.type}:${e.room}`); if (!byId.has(e.parent)) chain.push(e.parent); }
    const out = { errors, events: ev.length + b.attacker.world.log.events.length, ended: b.ended ? b.ended.kind : null, side: b.ended ? b.ended.side : null, chain, explosions: ev.filter((e) => e.type === 'explosion').length, magazineCells: ev.filter((e) => e.type === 'cell-destroyed' && e.room === 'magazine').length };
    if (c.battle === 'B4') out.underShutdown = (() => { for (let id = b.ended ? b.ended.event : null; id && byId.has(id); id = byId.get(id).parent) { const e = byId.get(id); if (e.type === 'shutdown' && e.room === 'bridge' && e.cause === 'heat') return true; } return false; })();
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
    const k = BATTLES[c.battle], root = a.chain[a.chain.length - 1];
    if (e.end === null) {
      const none = { 'every parent a root or an earlier event': a.errors === 0, 'no end by the limit (kernel-read)': a.ended === null, 'the magazine\'s four cells destroyed, no explosion (kernel-read)': a.magazineCells === 4 && a.explosions === 0 };
      return { pass: Object.values(none).every(Boolean), note: notes(none) };
    }
    const checks = {
      'every parent a root or an earlier event': a.errors === 0,
      'the route\'s end, the target': a.ended === e.end && a.side === 'T',
      'the chain ends at a root of the route\'s kind': ROOT.test(String(root)) && k.root.test(String(root)),
    };
    if (c.battle === 'B1') {
      checks['through the bridge\'s last cell-destroyed'] = a.throughCut;
      checks['control-lost of every room under it'] = JSON.stringify(a.lost) === JSON.stringify(e.rooms);
      checks['scram under the reactor\'s control-lost'] = a.scramParent === 'control-lost:reactor';
      checks['Disabled under the turret\'s control-lost'] = a.chain[1] === e.disabledParent;
    }
    if (c.battle === 'B4') checks['Disabled under the bridge\'s shutdown, cause heat'] = a.underShutdown === true;
    if (e.end === 'destroyed') checks['destroyed under the reactor\'s explosion, through the magazine\'s explosion and its detonation (kernel-read)'] = a.chain.slice(1, 5).join(' < ') === 'explosion:reactor < cell-destroyed:reactor < explosion:magazine < detonation:magazine';
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `no errors; ${r.expected.end}${r.case.battle === 'B1' ? ` <- control-lost:turret <- cell-destroyed:bridge <- shot; control-lost of [${r.expected.rooms}]` : ''}`, actual: `${a.errors} errors in ${a.events} events; ${a.ended} ${a.side}; chain ${a.chain.join(' <- ')}${a.lost ? `; control-lost [${a.lost}]; scram under ${a.scramParent}` : ''}` };
  },
};
