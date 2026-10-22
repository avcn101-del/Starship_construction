// constants.mjs — prints CONSTANTS.md, the one table of every value and range,
// from js/data.js (#241 (5)). Usage, from the repository root:
//   node tools/constants.mjs $(git log -1 --format=%h -- js/data.js) > CONSTANTS.md
// The optional argument is the commit hash of js/data.js, printed in the header.
import { PARAMS, FIXED, ROOMS, TIERS, BASE_EDGE } from '../js/data.js';

const hash = process.argv[2] || 'unknown';
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const num = (v) => (typeof v === 'number' ? Number(v.toPrecision(6)).toString() : JSON.stringify(v));
const row = (cells) => '| ' + cells.map(esc).join(' | ') + ' |';
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

const out = [];
out.push('# Constants');
out.push('');
out.push(`Generated from \`js/data.js\` (commit \`${hash}\`) by \`node tools/constants.mjs $(git log -1 --format=%h -- js/data.js) > CONSTANTS.md\`. Do not edit by hand: change \`js/data.js\` (the integrator does) and regenerate. This is the only table of values and ranges (\`DESIGN.md\` §5.1); the history of each value is in \`DECISIONS.md\` and \`HISTORY.md\`.`);
out.push('');
out.push(`A tunable constant is \`value\` at the T1 cell edge (${BASE_EDGE} m), scaled by (edge / ${BASE_EDGE} m)^k. \`approved\` is the flag in \`data.js\`.`);
out.push('');
out.push('## PARAMS (tunable)');
out.push('');
const prows = [];
for (const [g, group] of Object.entries(PARAMS)) {
  for (const [n, p] of Object.entries(group)) {
    prows.push([`${g}.${n}`, num(p.value), p.unit, num(p.min), num(p.max), p.k, p.approved, p.note]);
  }
}
out.push(table(['group.name', 'value', 'unit', 'min', 'max', 'k', 'approved', 'note'], prows));
out.push('');
out.push('## FIXED (real values and geometric choices, not tunable)');
out.push('');
out.push(table(['name', 'value', 'unit', 'note'], Object.entries(FIXED).map(([n, f]) => [
  n, typeof f.value === 'object' ? Object.entries(f.value).map(([k, v]) => `${k}: ${num(v)}`).join(', ') : num(f.value), f.unit, f.note])));
out.push('');
out.push('## ROOMS');
out.push('');
const fp = (r) => Object.entries(r.footprint).map(([s, d]) => `${s} ${d[0]}×${d[1]}`).join(', ') + (r.spinal ? ` (spinal, N ≥ ${r.spinal.min})` : '');
out.push(table(['type', 'footprints (cells)', 'placement', 'thermal class', 'loop', 'crew', 'draw / power', 'cell mass source'],
  Object.entries(ROOMS).map(([t, r]) => [t, fp(r), r.placement, r.thermalClass, r.loop, r.crew ?? '-', r.draw || r.power || '-', r.cellMass])));
out.push('');
out.push('## TIERS');
out.push('');
out.push(table(['tier', 'name', 'cell edge (m)', 'grid (cells)'], Object.entries(TIERS).map(([t, x]) => [t, x.name, x.edge, `${x.grid[0]}×${x.grid[1]}`])));
out.push('');
console.log(out.join('\n'));
