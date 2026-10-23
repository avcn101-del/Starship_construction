// tools/estimates/item43.mjs — the lead designer's measurement for DESIGN.md
// 17 item 43 (#291): is the overheat route the beam's or the throughput law's?
//   node tools/estimates/item43.mjs [--set group.name=value ...]
// Run-time overrides only; nothing recorded; never a canonical run. Two parts:
// (1) the throughput route: R1 and R1d firing beam and turret (the bay set
//     firing in setup) while the attacker's beam burns the rooms that carry
//     panels but no weapon; the heat the ship generates against what its
//     panels shed at plant hot; whether anything reaches Disabled by heat;
// (2) the sweep: the beam on R1's bridge against thermal.coupledCrewed, where
//     the heat shutdown (the route of #286) gives way to a burn-out.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2), overrides = {};
for (let i = 0; i < args.length; i++) if (args[i] === '--set') { const [k, v] = args[++i].split('='); overrides[k] = Number(v); }
const { withOverrides } = await import(ROOT + '/js/data.js');
const { createBattle, tick } = await import(ROOT + '/js/battle.js');
const { roomTemperature, isDestroyed, readout } = await import(ROOT + '/js/rooms.js');
const { TARGETS, ATTACKER } = await import(ROOT + '/mission0/targets.js');

const params = withOverrides(overrides);
console.log(`overrides ${JSON.stringify(overrides)}; thermal.coupledCrewed ${params.thermal.coupledCrewed.value} J/K per crewed cell`);

// ---------- (1) the throughput route ----------
const fire = (world, room) => { room('beamBay').beamBay.firing = true; };
const cases = [
  ['R1 beam and turret firing, attacker idle (own heat, 17 panels)', { target: 'R1', bearing: '-y', plan: {} }],
  ['R1 firing, attacker beam on heatSink then engine from +y (8 panels burnt)', { target: 'R1', bearing: '+y', plan: { beam: ['heatSink', 'engine'] } }],
  ['R1 firing, attacker beam on shield then engine from -y (10 panels burnt)', { target: 'R1', bearing: '-y', plan: { beam: ['shield', 'engine'] } }],
  ['R1d firing, attacker beam on heatSink then engine from +y', { target: 'R1d', bearing: '+y', plan: { beam: ['heatSink', 'engine'] } }],
  ['R1d firing, attacker beam on shield then engine from -y', { target: 'R1d', bearing: '-y', plan: { beam: ['shield', 'engine'] } }],
  ['R1 not firing, attacker beam on shield then engine from -y (panels only)', { target: 'R1', bearing: '-y', plan: { beam: ['shield', 'engine'] }, nofire: true }],
];
console.log('\n# (1) the throughput route: the ship cooked by its own reactor and weapons once its panels are shot away');
for (const [name, c] of cases) {
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: c.plan, targetFire: c.nofire ? null : { aim: [0, -1] }, setup: c.nofire ? {} : { target: fire } });
  const w = b.target.world, limit = Math.round(900 / b.dt), h0 = readout(w).heat;
  const maxT = {};
  while (!b.ended && b.step < limit) { tick(b); for (const r of w.rooms) maxT[r.id] = Math.max(maxT[r.id] || 0, roomTemperature(r)); }
  const ev = w.log.events;
  const heat = ev.filter((e) => e.type === 'shutdown' || e.type === 'hot' || e.type === 'overheated').map((e) => `${e.room} ${e.type}@${e.t.toFixed(1)}(${e.cause})`);
  const panels = w.rooms.reduce((n, r) => n + r.radiators, 0), h1 = readout(w).heat;
  const end = b.ended ? `${b.ended.side} ${b.ended.kind} at ${b.ended.t.toFixed(2)} s why=${b.ended.why || ''} by=${b.ended.by || ''}` : `none by ${b.t.toFixed(0)} s`;
  console.log(`\n## ${name}\n  end: ${end}; target shots ${ev.filter((e) => e.type === 'shot').length}; panels ${h0.panels} -> ${panels}; heat generated at start ${(h0.generated / 1e6).toFixed(2)} MW against the panels' ${(h0.capacity / 1e6).toFixed(2)} MW at plant hot; at the end ${(h1.generated / 1e6).toFixed(2)} against ${(h1.capacity / 1e6).toFixed(2)} MW`);
  console.log(`  max T (K): ${Object.entries(maxT).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  console.log(`  heat events: ${heat.join(', ') || '-'}; destroyed: ${w.rooms.filter(isDestroyed).map((r) => r.id).join(', ') || '-'}`);
}

// ---------- (2) the sweep ----------
console.log('\n# (2) the beam on R1\'s bridge against thermal.coupledCrewed (the route holds only while the heat shutdown precedes the last cell\'s burn)');
for (const c of [6e5, 1e6, 1.4e6, 1.6e6, 2e6, 2.24e6, 6.66e6]) {
  const p = withOverrides({ ...overrides, 'thermal.coupledCrewed': c });
  const b = createBattle({ params: p, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { beam: ['bridge'] } });
  const w = b.target.world, x = b.target.room('bridge');
  let maxT = 0, cellsAt = null;
  while (!b.ended && b.step < 300 / b.dt) {
    tick(b);
    maxT = Math.max(maxT, roomTemperature(x));
    if (cellsAt === null && w.log.events.some((e) => e.type === 'shutdown' && e.room === 'bridge')) cellsAt = x.cells.filter((q) => !q.destroyed).length;
  }
  const sh = w.log.events.find((e) => e.type === 'shutdown' && e.room === 'bridge');
  console.log(`  c ${c.toExponential(2)} J/K: bridge max ${maxT.toFixed(1)} K; shutdown ${sh ? `${sh.t.toFixed(2)} s with ${cellsAt} cells standing` : 'none'}; bridge ${isDestroyed(x) ? 'destroyed' : 'standing'}; end ${b.ended.kind} ${b.ended.t.toFixed(2)} s why=${b.ended.why}`);
}
