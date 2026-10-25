// proto/proto.js — the feel prototype's page (DESIGN.md 13j, 13n.1 (d), 13n.12;
// #217, #237, #301 (5), #366, #367): drives the kernel's battle with its phases
// (proto/battle.js, proto/phases.js) and draws it on a 2D canvas
// (a world strip above two head-up grids). The player's own ship is drawn from
// its own world; the enemy only as the player's knowledge model knows it
// (js/sensors.js: the silhouette, the zones resolved, the rooms they revealed
// with their state at the scan, the IR class of their panels), never its true
// layout, orders or phase (CLAUDE.md: knowledge, not truth). The player's verbs
// (scan a zone, target a known room) enter as the kernel's inputs; a menu entry
// is a recorded choice (proto/phases.js). A throwaway: it never counts as a Mission 0 result. No Math.random:
// the page draws no random effect.
import { startBattle, playVerb, tick, mainBody, shotStats, losses, endTree } from './battle.js';
import { exportText } from './export.js';
import { menuOf, entryOf, choose, waiting, phaseOf } from './phases.js';
import { weaponStates, toGrid } from '../js/battle.js';
import { isDestroyed, roomTemperature, survivingFraction } from '../js/rooms.js';
import { worldPoint } from '../js/body.js';
import { antennas } from '../js/sensors.js';
import { heatFraction, bufferFraction, observed, silhouettePose } from '../js/helm.js';
import { PRESET_LABELS, SPEEDS, MAX_STEPS_PER_FRAME, LOG_LINES, COLOURS, LABELS, STAND_INS, LOADOUT, LOADOUT_ORDER, defaultLoadout, optionLabel, SEED, PROTO_VERSION, DECISION_NOTE_SECONDS, PHASE_LABELS, EXIT_LABELS } from './config.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view'), ctx = canvas.getContext('2d');
const GAP = 2; // cells of screen between the two head-up grids

let battle = null, speed = 1, paused = false, choosing = true, acc = 0, last = null, geo = null, scanMode = false;
let loadout = defaultLoadout(), seed = SEED;
// box: each grid's cell box { x0, y0, W, H }: the player's from its own layout, the enemy's from the model's zones.
let box = null, logIndex = 0, hitIndex = 0, lastExport = null, pausedBeforeExport = false;
const me = () => battle.attacker, model = () => battle.attacker.model;
const roomLabel = (r) => LABELS[r.id] || LABELS[r.type] || r.id;

// ---------- controls ----------
function buttons() {
  $('scan').addEventListener('click', () => { scanMode = !scanMode; refreshButtons(); });
  $('speeds').replaceChildren(...SPEEDS.map((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = `×${s}`; b.dataset.speed = s;
    b.addEventListener('click', () => { speed = s; refreshButtons(); });
    return b;
  }));
  $('pause').addEventListener('click', () => { paused = !paused; refreshButtons(); });
  $('restart').addEventListener('click', chooseLoadout);
  $('export').addEventListener('click', openExport);
  $('export-close').addEventListener('click', closeExport);
  $('export-copy').addEventListener('click', () => copyExport());
  $('loadout-groups').replaceChildren(...LOADOUT_ORDER.map((k) => {
    const g = document.createElement('div'), h = document.createElement('div'), row = document.createElement('div');
    g.className = 'lo-group'; h.className = 'lo-label'; h.textContent = LOADOUT[k].label; row.className = 'group'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', LOADOUT[k].label);
    row.replaceChildren(...LOADOUT[k].options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.label; b.dataset.lever = k; b.dataset.option = i;
      b.addEventListener('click', () => { loadout[k] = o.value; refreshLoadout(); });
      return b;
    }));
    g.append(h, row);
    return g;
  }));
  $('loadout-start').addEventListener('click', start);
  $('seed').addEventListener('change', () => { const v = Math.floor(Number($('seed').value)); if (Number.isFinite(v) && v >= 0) seed = v; $('seed').value = seed; });
  $('loadout-default').addEventListener('click', () => { loadout = defaultLoadout(); refreshLoadout(); });
  $('standin-list').replaceChildren(...STAND_INS.map((text) => { const li = document.createElement('li'); li.textContent = text; return li; }));
}
function refreshButtons() {
  for (const b of $('menu').children) b.classList.toggle('on', !!battle && b.dataset.entry === battle.phases.A.entry);
  for (const b of $('speeds').children) b.classList.toggle('on', Number(b.dataset.speed) === speed);
  $('scan').classList.toggle('on', scanMode);
  $('pause').textContent = paused ? 'Run' : 'Pause';
  $('pause').classList.toggle('on', paused);
}
function refreshLoadout() {
  for (const b of $('loadout-groups').querySelectorAll('button')) b.classList.toggle('on', LOADOUT[b.dataset.lever].options[b.dataset.option].value === loadout[b.dataset.lever]);
}

/** A verb of the player's through the kernel's inputs (proto/battle.js playVerb); logged on the page. */
function verb(name, arg) {
  const x = playVerb(battle, name, arg);
  if (!x) return;
  logLine(`${x.t.toFixed(1)} P you: ${name} ${name === 'scan' ? `zone ${arg}` : arg}`, 'P big');
}

// ---------- the menu and the decision points (proto/phases.js) ----------
/** The menu of the player's build in the side panel: one button per entry (js/data.js MENUS: its name and its line). */
function menuButtons() {
  $('menu').replaceChildren(...menuOf(battle.phases.A.build).map((e) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = e.name; b.dataset.entry = e.id; b.title = e.text;
    b.addEventListener('click', () => { if (!battle || choosing || battle.ended || waiting(battle)) return; pick(e.id); });
    return b;
  }));
}
/** A menu choice of the player's: recorded with its step and applied before the next tick. */
function pick(id) {
  const p = battle.phases.A, dp = p.pending ? p.pending.dp : 0, x = choose(battle, id);
  if (!x) return;
  const e = entryOf(p.build, p.entry);
  logLine(`${battle.t.toFixed(1)} P you${dp ? ` (decision ${dp})` : ''}: ${id === 'stay' ? `stay on ${e.name}` : e.name}`, 'P big');
  $('decision').hidden = true;
  refreshButtons();
}
/** The decision panel (the pause setting): the options with their lines, the automatic choice marked; the battle waits. */
function showDecision() {
  const p = battle.phases.A, d = p.pending, el = $('decision'), cur = entryOf(p.build, p.entry);
  const head = d.dp === 1 ? `Decision 1: contact is over (${EXIT_LABELS[p.exit.why]})` : `Decision 2: you are hit on ${cur.name}`;
  const opts = d.options.map((id) => (id === 'stay' ? { id, name: `Stay on ${cur.name}`, text: cur.text } : entryOf(p.build, id)));
  const h = document.createElement('h2'); h.textContent = head;
  const row = document.createElement('div'); row.className = 'options';
  row.replaceChildren(...opts.map((e) => {
    const b = document.createElement('button'), n = document.createElement('b'), t = document.createElement('span');
    b.type = 'button'; b.dataset.entry = e.id; n.textContent = `${e.name}${e.id === d.auto ? ' (auto)' : ''}`; t.textContent = e.text;
    b.append(n, t); b.addEventListener('click', () => pick(e.id));
    return b;
  }));
  const note = document.createElement('div'); note.className = 'note'; note.textContent = 'The battle waits for your choice.';
  el.replaceChildren(h, row, note);
  el.hidden = false;
}
/** The phase readout: your phase and entry (your own state); the enemy only as your model and own log can read it. */
function phaseReadout() {
  const p = battle.phases.A, e = entryOf(p.build, p.entry), h = me().helm, ph = phaseOf(battle, 'A');
  const you = `YOU: ${PHASE_LABELS[ph] || ph} · ${e.name}${h.hold ? ' · weapons held' : ''}`;
  const pb = mainBody(me()), eb = silhouettePose(model());
  let range = '';
  if (pb && eb) {
    const d = [eb.x[0] - pb.x[0], eb.x[1] - pb.x[1]], R = Math.hypot(d[0], d[1]), ve = observed(battle, me()).v;
    const vr = ((ve[0] - pb.v[0]) * d[0] + (ve[1] - pb.v[1]) * d[1]) / R;
    range = ` · ${vr >= 0 ? 'opening' : 'closing'} ${Math.abs(vr).toFixed(0)} m/s`;
  }
  const fired = battle.hits.some((x) => x.side === 'A') || me().world.log.events.some((x) => x.type === 'cell-damaged');
  const enemy = `ENEMY: ${fired ? 'has hit you' : 'has not hit you'}${range}`;
  const note = p.lastAuto && battle.t - p.lastAuto.t < DECISION_NOTE_SECONDS ? `Decision ${p.lastAuto.dp}: auto ${p.lastAuto.entry === 'stay' ? `stayed on ${e.name}` : entryOf(p.build, p.lastAuto.entry).name}; change it from the menu` : e.text;
  const rows = [[you, 'you'], [enemy, 'enemy'], [note, p.lastAuto && battle.t - p.lastAuto.t < DECISION_NOTE_SECONDS ? 'auto' : 'line']];
  $('phase').replaceChildren(...rows.map(([t, c]) => { const d = document.createElement('div'); d.className = c; d.textContent = t; return d; }));
}

/** The loadout panel: shown before the first battle and from Restart (the seed moves on by 1); the battle behind it stops. */
function chooseLoadout() {
  closeExport();
  if (battle && !choosing) seed = battle.seed + 1;
  choosing = true;
  $('seed').value = seed;
  refreshLoadout();
  $('end').hidden = true;
  $('loadout').hidden = false;
}
function start() {
  const v = Math.floor(Number($('seed').value));
  if (Number.isFinite(v) && v >= 0) seed = v;
  battle = startBattle({ ...loadout, seed });
  const own = [...me().world.layout.occupied.keys()].map((k) => k.split(',').map(Number)), zs = model().zones;
  const bx = (x0, x1, y0, y1) => ({ x0, y0, W: x1 - x0, H: y1 - y0 });
  box = {
    player: bx(Math.min(...own.map((c) => c[0])), Math.max(...own.map((c) => c[0])) + 1, Math.min(...own.map((c) => c[1])), Math.max(...own.map((c) => c[1])) + 1),
    enemy: bx(Math.min(...zs.map((z) => z.x[0])), Math.max(...zs.map((z) => z.x[1])), Math.min(...zs.map((z) => z.y[0])), Math.max(...zs.map((z) => z.y[1]))),
  };
  choosing = false; acc = 0; last = null; paused = false; scanMode = false; logIndex = 0; hitIndex = 0;
  $('loadout').hidden = true;
  $('lo-tag').replaceChildren(...[`${loadout.player} v ${loadout.enemy} · seed ${battle.seed}`, `${optionLabel('opening', loadout)} ${optionLabel('aspect', loadout)} · ${loadout.pause ? 'pause' : 'auto'}`].map((t) => { const d = document.createElement('div'); d.textContent = t; return d; }));
  menuButtons();
  $('decision').hidden = true;
  $('log').replaceChildren();
  $('end').hidden = true;
  $('hint').hidden = false;
  refreshButtons();
}

// ---------- geometry ----------
function layout() {
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const line = 14, head = 2 * line + 4, foot = 3 * line + 6, stripMin = 72;
  const GW = battle ? box.player.W + box.enemy.W : 1, GH = battle ? Math.max(box.player.H, box.enemy.H) : 1;
  const cs = battle ? Math.max(1, Math.floor(Math.min((w - 12) / (GW + GAP), (h - head - foot - stripMin) / GH))) : 1;
  const strip = Math.max(stripMin, h - head - foot - GH * cs);
  const total = (GW + GAP) * cs, ox = Math.floor((w - total) / 2), oy = strip + head;
  geo = { w, h, cs, line, oy, strip, GH, ox: { player: ox, enemy: ox + (box ? box.player.W + GAP : 0) * cs } };
}
/** Top-left (px) of grid cell (x, y): the player faces right (y up); the enemy, turned 180 degrees, faces left. */
function cellXY(side, x, y) {
  const { cs, oy } = geo, o = geo.ox[side], b = box[side], i = x - b.x0, j = y - b.y0;
  return side === 'player' ? [o + i * cs, oy + (b.H - 1 - j) * cs] : [o + (b.W - 1 - i) * cs, oy + j * cs];
}
/** Screen point (px) of grid point p (m) on a side's grid; `edge` the cell edge (m). */
function pointXY(side, p, edge) {
  const { cs, oy } = geo, o = geo.ox[side], b = box[side], u = p[0] / edge - b.x0, v = p[1] / edge - b.y0;
  return side === 'player' ? [o + u * cs, oy + (b.H - v) * cs] : [o + (b.W - u) * cs, oy + v * cs];
}
/** The screen rectangle of a set of grid cells on a side's grid. */
function cellsRect(side, cells) {
  const pts = cells.map(([x, y]) => cellXY(side, x, y)), x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1]));
  return [x0, y0, Math.max(...pts.map((p) => p[0])) + geo.cs - x0, Math.max(...pts.map((p) => p[1])) + geo.cs - y0];
}
const ownCells = (id) => me().world.layout.rooms.get(id).cells;
const knownCells = (id) => model().rooms.get(id).cells.map((k) => k.split(',').map(Number));

// ---------- drawing ----------
const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, Math.max(0, f))));
/** A room's colour by its temperature against its own thresholds. */
function tempColour(room) {
  const T = roomTemperature(room), { hot, overheated, critical } = room.thresholds, rest = 290;
  if (T < hot) return mix(COLOURS.cold, COLOURS.warm, (T - rest) / (hot - rest));
  if (T < overheated) return mix(COLOURS.hot, COLOURS.overheated, (T - hot) / (overheated - hot));
  return mix(COLOURS.overheated, COLOURS.critical, (T - overheated) / (critical - overheated));
}
const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
const FONT = (px, bold = false) => `${bold ? 'bold ' : ''}${px}px ui-monospace, Menlo, Consolas, monospace`;
function crossCell(x, y, cs) {
  ctx.fillStyle = COLOURS.destroyed; ctx.fillRect(x, y, cs, cs);
  ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + cs - 4, y + cs - 4); ctx.moveTo(x + cs - 4, y + 4); ctx.lineTo(x + 4, y + cs - 4); ctx.stroke();
}
function label(rx, ry, rw, rh, top, bottom, colour = COLOURS.text) {
  ctx.fillStyle = '#000'; ctx.globalAlpha = 0.55; ctx.fillRect(rx + 3, ry + rh / 2 - 12, rw - 6, 24); ctx.globalAlpha = 1;
  ctx.fillStyle = colour; ctx.font = FONT(10, true); ctx.textAlign = 'center';
  ctx.fillText(top, rx + rw / 2, ry + rh / 2 - 2);
  if (bottom) ctx.fillText(bottom, rx + rw / 2, ry + rh / 2 + 9);
}

/** The player's own ship from its own world: temperature, integrity, control, shutdown, shield, and its status. */
function drawOwn() {
  const s = me(), w = s.world, { cs, line } = geo, b = box.player, o = geo.ox.player;
  const gens = w.rooms.filter((r) => r.type === 'shieldGenerator'), sh = gens[0];
  const up = sh && sh.shield.on && !sh.shield.down && !isDestroyed(sh), frac = up ? survivingFraction(sh) * (sh.powerFraction ?? 1) : 0;
  const [sx, sy] = cellXY('player', b.x0, b.y0 + b.H - 1);
  ctx.strokeStyle = COLOURS.grid; ctx.lineWidth = 1; ctx.strokeRect(sx - 0.5, sy - 0.5, b.W * cs + 1, b.H * cs + 1);
  if (frac > 0) {
    ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * frac; ctx.strokeStyle = COLOURS.shield; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx + (b.W * cs) / 2, sy + (b.H * cs) / 2, (b.W * cs) / 2 + 8, (b.H * cs) / 2 + 8, 0, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
  }
  for (const room of w.rooms) {
    if (!room.placed) continue;
    const cells = ownCells(room.id), col = tempColour(room);
    room.cells.forEach((c, k) => {
      const [x, y] = cellXY('player', cells[k][0], cells[k][1]);
      if (c.destroyed) crossCell(x, y, cs);
      else {
        ctx.fillStyle = rgb(col, 0.35 + 0.65 * c.integrity); ctx.fillRect(x, y, cs, cs);
        if (c.integrity < 1) { ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); }
      }
    });
    const [rx, ry, rw, rh] = cellsRect('player', cells);
    ctx.strokeStyle = room.controlled ? COLOURS.text : COLOURS.dim; ctx.lineWidth = 2; ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    if (!isDestroyed(room)) label(rx, ry, rw, rh, room.shutdown ? `${roomLabel(room)}!` : roomLabel(room), `${Math.round(roomTemperature(room))}K`, room.shutdown ? COLOURS.cross : COLOURS.text);
  }
  // Above: preset, the helm's mode and throttle, the target the helm holds (from the model).
  const h = s.helm, tg = h.target && h.target.room ? `${LABELS[model().rooms.get(h.target.room)?.type] || h.target.room}` : h.target && h.target.point ? 'zone centre' : '—';
  ctx.textAlign = 'left'; ctx.font = FONT(13, true); ctx.fillStyle = COLOURS.player;
  ctx.fillText(`YOU  ${entryOf(battle.phases.A.build, battle.phases.A.entry).name} · captain ${PRESET_LABELS[h.orders.name] || h.orders.name}${h.held ? ' (holding fire)' : ''}`, o, geo.strip + line);
  ctx.font = FONT(12); ctx.fillStyle = COLOURS.text;
  ctx.fillText(`target: ${tg} · ${h.mode || '-'}${h.throttle > 0 ? ` · engine ${Math.round(h.throttle * 100)}%` : ''}`, o, geo.strip + 2 * line);
  // Below: weapons able, crew, heat and buffer (js/helm.js), shield.
  const by = geo.oy + geo.GH * cs + line, able = weaponStates(w).map((x) => `${roomLabel(x.room)} ${x.able ? 'ok' : x.why}`).join(' ');
  const L = losses(battle, 'A');
  ctx.fillText(able, o, by);
  ctx.fillText(`crew ${L.crewTotal - L.crewLost}/${L.crewTotal}  heat ${heatFraction(w).toFixed(2)}  buffer ${bufferFraction(battle, w).toFixed(2)}`, o, by + line);
  ctx.fillText(`shield ${up ? `${Math.round(frac * 100)}%` : 'OFF'}${sh ? `  absorbing ${((sh.shield.absorbed || 0) / 1e6).toFixed(1)} MW` : ''}`, o, by + 2 * line);
  if (s.sinceStep !== null && !s.ended) { ctx.fillStyle = COLOURS.cross; ctx.font = FONT(12, true); ctx.fillText(`DISABLED in ${Math.max(0, (battle.disabledSteps - (battle.step - s.sinceStep)) * battle.dt).toFixed(1)} s`, o, by + 3 * line); }
}

/**
 * The enemy as the player's model knows it (js/sensors.js): the zones (dashed, resolved ones with the time), the
 * silhouette's standing cells (grey: unknown), the cells a scan revealed (their room's IR class if its panels are
 * resolved, else dim; their integrity and destroyed flag at the scan), a known cell the silhouette no longer has
 * (crossed), the known rooms' outlines and labels, the target, the zone your antenna scans and its progress.
 */
function drawKnown() {
  const m = model(), { cs, line } = geo, b = box.enemy, o = geo.ox.enemy, sil = m.silhouette.standing || new Map();
  const [sx, sy] = cellXY('enemy', b.x0 + b.W - 1, b.y0);
  ctx.strokeStyle = COLOURS.grid; ctx.lineWidth = 1; ctx.strokeRect(sx - 0.5, sy - 0.5, b.W * cs + 1, b.H * cs + 1);
  for (const [x, y] of m.silhouette.cells) {
    if (m.cells.has(`${x},${y}`)) continue;
    const [px, py] = cellXY('enemy', x, y);
    ctx.fillStyle = COLOURS.unknown; ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
  }
  for (const [k, c] of m.cells) {
    const [px, py] = cellXY('enemy', c.cell[0], c.cell[1]);
    if (c.destroyed || !sil.has(k)) { crossCell(px, py, cs); continue; }
    const r = m.rooms.get(c.room), col = r.ir ? COLOURS.ir[r.ir.class] : [110, 110, 140];
    ctx.fillStyle = rgb(col, 0.35 + 0.65 * c.integrity); ctx.fillRect(px, py, cs, cs);
    if (c.integrity < 1) { ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 1; ctx.strokeRect(px + 1.5, py + 1.5, cs - 3, cs - 3); }
  }
  for (const [id, r] of m.rooms) {
    const cells = knownCells(id), [rx, ry, rw, rh] = cellsRect('enemy', cells);
    ctx.strokeStyle = COLOURS.text; ctx.lineWidth = 2; ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    const standing = r.cells.some((k) => sil.has(k) && !m.cells.get(k).destroyed);
    if (standing) label(rx, ry, rw, rh, LABELS[r.type] || r.type, r.ir ? r.ir.class : `@${(r.step * battle.dt).toFixed(0)}s`);
  }
  // Zones: dashed rectangles, the number in a corner; a resolved one with the time it resolved.
  ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = COLOURS.zone; ctx.lineWidth = 1;
  ctx.font = FONT(9, true); ctx.textAlign = 'left';
  for (const z of m.zones) {
    const [rx, ry, rw, rh] = cellsRect('enemy', [[z.x[0], z.y[0]], [z.x[1] - 1, z.y[1] - 1]]);
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    const at = m.resolved.get(z.id);
    ctx.fillStyle = at === undefined ? COLOURS.dim : COLOURS.scan;
    ctx.fillText(`z${z.id}${at === undefined ? '' : ` ${(at * battle.dt).toFixed(0)}s`}`, rx + 3, ry + 10);
  }
  ctx.restore();
  // Your antenna's scan: the zone outlined in green, its progress as a bar.
  for (const f of antennas(me().world)) {
    if (!f.scan) continue;
    const z = m.zones[f.scan.zone], [rx, ry, rw, rh] = cellsRect('enemy', [[z.x[0], z.y[0]], [z.x[1] - 1, z.y[1] - 1]]);
    ctx.strokeStyle = COLOURS.scan; ctx.lineWidth = 3; ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
    ctx.fillStyle = COLOURS.scan; ctx.fillRect(rx + 3, ry + rh - 6, (rw - 6) * Math.min(1, f.scan.progress), 3);
  }
  // The target the helm holds: the verb's room (or its pick) in yellow dashes; a point at a zone centre as a ring.
  const h = me().helm;
  if (h.target && h.target.room && m.rooms.has(h.target.room)) {
    const [rx, ry, rw, rh] = cellsRect('enemy', knownCells(h.target.room));
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 4; ctx.strokeStyle = COLOURS.target; ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); ctx.restore();
  } else if (h.target && h.target.point) {
    const pose = silhouettePose(m);
    if (pose) { const [px, py] = pointXY('enemy', toGrid(pose, h.target.point), m.edge); ctx.strokeStyle = COLOURS.target; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * Math.PI); ctx.stroke(); }
  }
  // Text: what the model holds.
  const now = [...m.sources.values()].filter((x) => x.now);
  ctx.textAlign = 'left'; ctx.font = FONT(13, true); ctx.fillStyle = COLOURS.enemy;
  ctx.fillText('ENEMY (as you know it)', o, geo.strip + line);
  ctx.font = FONT(12); ctx.fillStyle = COLOURS.text;
  ctx.fillText(`zones ${m.resolved.size}/${m.zones.length} · rooms known ${m.rooms.size}`, o, geo.strip + 2 * line);
  const by = geo.oy + geo.GH * cs + line;
  ctx.fillText(`silhouette: ${m.silhouette.cells.length} cells, ${m.silhouette.bodies.length} bod${m.silhouette.bodies.length === 1 ? 'y' : 'ies'}`, o, by);
  ctx.fillText(`sources now: ${now.length ? [...new Set(now.map((x) => x.kind))].map((k) => `${k} ${now.filter((x) => x.kind === k).length}`).join(', ') : 'none'}`, o, by + line);
  ctx.fillStyle = COLOURS.target;
  ctx.fillText(scanMode ? 'SCAN: tap a zone' : 'tap: room = target, else scan', o, by + 2 * line);
}

/** Screen point (px) of a world point q (m) in the world strip: the line of sight from the player to the enemy points right. */
function stripXY(q) {
  const v = geo.view, dx = q[0] - v.mid[0], dy = q[1] - v.mid[1];
  return [v.cx + (dx * v.cos + dy * v.sin) * v.scale, v.cy - (-dx * v.sin + dy * v.cos) * v.scale];
}
/**
 * The world strip: your ship (its own world) and the enemy's silhouette (the model's standing cells on the
 * silhouette's poses) to scale, the velocities against the midpoint's (yours from your body, the enemy's as your helm
 * observes it), your rounds in flight, the beams, the range.
 */
function drawStrip() {
  const w = geo.w, h = geo.strip, m = model(), pb = mainBody(me()), eb = silhouettePose(m);
  if (!pb || !eb) return;
  const d = [eb.x[0] - pb.x[0], eb.x[1] - pb.x[1]], R = Math.hypot(d[0], d[1]), a = Math.atan2(d[1], d[0]);
  const ve = observed(battle, me()).v, mid = [(pb.x[0] + eb.x[0]) / 2, (pb.x[1] + eb.x[1]) / 2], vmid = [(pb.v[0] + ve[0]) / 2, (pb.v[1] + ve[1]) / 2];
  geo.view = { mid, cos: Math.cos(a), sin: Math.sin(a), scale: Math.min((w - 40) / (R + 120), (h - 30) / 160), cx: w / 2, cy: h / 2 + 6 };
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COLOURS.grid; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  const quad = (pose, i, j, e) => [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([x, y]) => stripXY(worldPoint(pose, [x * e, y * e])));
  const fill = (pts) => { ctx.beginPath(); pts.forEach((p, n) => (n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  // Yours: every hull cell on the body it belongs to; holes as outlines.
  const ws = me().world, e = ws.edge;
  for (const room of ws.rooms) {
    if (!room.placed) continue;
    const grid = ownCells(room.id);
    room.cells.forEach((c, k) => {
      const b = ws.ship.bodies.find((x) => x.id === c.fragment) || pb;
      fill(quad(b, grid[k][0], grid[k][1], e));
      if (c.destroyed) { ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 1; ctx.stroke(); } else { ctx.fillStyle = COLOURS.player; ctx.globalAlpha = 0.35 + 0.65 * c.integrity; ctx.fill(); ctx.globalAlpha = 1; }
    });
  }
  // The enemy's silhouette.
  ctx.fillStyle = COLOURS.enemy;
  for (const [x, y, body] of m.silhouette.cells) { fill(quad(m.silhouette.bodies.find((q) => q.id === body) || eb, x, y, m.edge)); ctx.fill(); }
  // Velocities against the midpoint's as 5 s of travel; your bow as a white tick.
  for (const [p, v] of [[pb.x, pb.v], [eb.x, ve]]) {
    const p0 = stripXY(p), p1 = stripXY([p[0] + (v[0] - vmid[0]) * 5, p[1] + (v[1] - vmid[1]) * 5]);
    ctx.strokeStyle = COLOURS.target; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
  }
  const nose = stripXY(worldPoint(pb, [(box.player.x0 + box.player.W) * e, pb.c[1]])), tickP = stripXY(worldPoint(pb, [(box.player.x0 + box.player.W) * e + 12, pb.c[1]]));
  ctx.strokeStyle = COLOURS.text; ctx.beginPath(); ctx.moveTo(nose[0], nose[1]); ctx.lineTo(tickP[0], tickP[1]); ctx.stroke();
  // Beams: yours from the bay's face along your axis to its entry on the enemy's hull (magenta) or on into space (grey
  // dashes); the enemy's only where it lands on your hull (magenta past your shield, cyan when your shield takes all).
  for (const s of battle.sides) {
    const bm = s.beam, mine = s === me();
    if (!bm || !(bm.power > 0) || (!mine && !bm.hit)) continue;
    // Your beam's entry on the enemy's silhouette pose (what you see of it); the enemy's on your own body.
    const body = !bm.hit ? null : mine ? m.silhouette.bodies.find((x) => x.id === bm.hit.body) || eb : ws.ship.bodies.find((x) => x.id === bm.hit.body) || pb;
    const to = bm.hit ? worldPoint(body, bm.hit.entry) : [bm.from[0] + bm.dir[0] * (R + 2000), bm.from[1] + bm.dir[1] * (R + 2000)];
    const res = !mine && ws.beamResults ? ws.beamResults.find((r) => r.id === bm.id) : null; // what your own shield let through
    const p0 = stripXY(mine ? bm.from : [to[0] - bm.dir[0] * 60, to[1] - bm.dir[1] * 60]), p1 = stripXY(to);
    ctx.save();
    if (!bm.hit) { ctx.setLineDash([5, 5]); ctx.strokeStyle = COLOURS.miss; ctx.lineWidth = 1.5; } else { ctx.strokeStyle = mine || (res && res.passed > 0) ? COLOURS.beam : COLOURS.beamAbsorbed; ctx.lineWidth = 2; }
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); ctx.restore();
  }
  // Your rounds in flight: a dot with a short tail.
  ctx.strokeStyle = COLOURS.round; ctx.fillStyle = COLOURS.round; ctx.lineWidth = 2;
  for (const r of battle.rounds) {
    if (r.shooter !== me() || r.over || r.done) continue;
    const p = stripXY(r.ref.x), q = stripXY(r.prev);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
  }
  const vr = ((ve[0] - pb.v[0]) * d[0] + (ve[1] - pb.v[1]) * d[1]) / R, st = shotStats(battle), taken = battle.hits.filter((x) => x.side === 'A').length;
  ctx.font = FONT(12, true); ctx.textAlign = 'right'; ctx.fillStyle = COLOURS.text;
  ctx.fillText(`${Math.round(R)} m  ${vr >= 0 ? 'opening' : 'closing'} ${Math.abs(vr).toFixed(0)} m/s`, w - 6, 13);
  ctx.font = FONT(11); ctx.textAlign = 'left'; ctx.fillStyle = COLOURS.player;
  ctx.fillText(`YOU shots ${st.A.shots} · hits ${st.A.hits} · misses ${st.A.misses} · in flight ${st.A.flying} · hits taken ${taken}`, 6, h - 5);
  ctx.fillStyle = COLOURS.dim; ctx.fillText('to scale · velocity vs midpoint, 5 s', 6, 13);
  ctx.restore();
}

/** Recent hits: on your grid where a round entered your hull (your own world's books); on the enemy's where your round entered (your model's hits). */
function drawHits() {
  const e = me().world.edge;
  for (const h of battle.hits) {
    const age = battle.t - h.t;
    if (h.side !== 'A' || age > 1.5) continue;
    const tip = pointXY('player', h.entry, e), tail = pointXY('player', [h.entry[0] - h.dir[0] * 1.5 * e, h.entry[1] - h.dir[1] * 1.5 * e], e);
    ctx.save(); ctx.globalAlpha = 1 - age / 1.5; arrow(tail, tip, COLOURS.round); ctx.restore();
  }
  const m = model(), pose = silhouettePose(m);
  if (!pose) return;
  for (const h of m.hits) {
    const age = battle.t - h.t;
    if (age > 1.5) continue;
    ctx.save(); ctx.globalAlpha = 1 - age / 1.5; ctx.strokeStyle = COLOURS.round; ctx.lineWidth = 2;
    for (const [i, j] of h.cells) { const [x, y] = cellXY('enemy', i, j); ctx.strokeRect(x + 2, y + 2, geo.cs - 4, geo.cs - 4); }
    const [x, y] = pointXY('enemy', toGrid(pose, h.entry), m.edge);
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke();
    ctx.restore();
  }
}
function arrow(from, to, colour) {
  const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(to[0] - ux * 8 - uy * 5, to[1] - uy * 8 + ux * 5); ctx.lineTo(to[0] - ux * 8 + uy * 5, to[1] - uy * 8 - ux * 5); ctx.closePath(); ctx.fill();
}

function draw() {
  layout();
  ctx.fillStyle = COLOURS.background; ctx.fillRect(0, 0, geo.w, geo.h);
  if (!battle) return;
  drawStrip();
  drawOwn(); drawKnown();
  drawHits();
  const t = Math.floor(battle.t);
  $('clock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------- log: your own ship's events (its log holds your scans, what you resolved and what hit you) ----------
const BIG = new Set(['explosion', 'scram', 'shutdown', 'control-lost', 'crew-died', 'cell-destroyed', 'meltdown', 'breach', 'cook-off', 'shield-down', 'zone-resolved', 'destroyed', 'disabled', 'surrender', 'escaped']);
function logLine(text, cls) {
  const log = $('log'), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 4, div = document.createElement('div');
  div.className = cls; div.textContent = text; log.appendChild(div);
  while (log.childElementCount > LOG_LINES) log.firstElementChild.remove();
  if (stick) log.scrollTop = log.scrollHeight;
}
function logEvents() {
  const ev = me().world.log.events;
  for (; logIndex < ev.length; logIndex++) {
    const e = ev[logIndex];
    if (e.type === 'shot') continue; // shots are drawn as rounds
    const extra = e.type === 'crew-died' ? ` ${e.deaths} dead` : e.type === 'cell-damaged' ? ` ${Math.round(e.integrity * 100)}%` : e.type === 'explosion' ? ` ${(e.energy / 1e6).toFixed(0)} MJ` : e.type === 'zone-resolved' ? ` zone ${e.zone}: ${e.rooms.length ? e.rooms.join(', ') : 'no room'}` : e.type === 'scan-started' ? ` zone ${e.zone}` : e.type === 'source-resolved' ? ` ${e.kind}` : '';
    logLine(`${e.t.toFixed(1)} P ${LABELS[e.room] || e.room} ${e.type}${extra} ← ${e.cause}${e.crew === undefined ? '' : ` · crew ${e.crew}`}`, `P${BIG.has(e.type) ? ' big' : ''}`);
  }
  const hits = model().hits;
  for (; hitIndex < hits.length; hitIndex++) logLine(`${hits[hitIndex].t.toFixed(1)} E hit by ${hits[hitIndex].id}${hits[hitIndex].cells.length ? ` (${hits[hitIndex].cells.length} known cells)` : ''}`, 'E');
}

// ---------- the end (the debrief: the books and the cascade tree of each side that ended) ----------
const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const TREE_ROWS = 80; // prototype setting: the most rows of the cascade tree on the end panel
const NAME = { A: 'You', T: 'The enemy' };
/** The cascade tree of why a side's battle ended (#41, #264): runs of the same event on the same room at the same depth are one row with a count. */
function treeHtml(name) {
  const tree = endTree(battle, name);
  if (!tree) return '';
  const rows = [];
  for (const r of tree.rows) {
    const last = rows[rows.length - 1], e = r.event;
    if (last && last.depth === r.depth && last.type === e.type && last.room === e.room && !last.end) { last.n++; continue; }
    rows.push({ depth: r.depth, type: e.type, room: e.room, t: e.t, n: 1, id: e.id, end: e.type === tree.end.kind });
  }
  const lines = rows.slice(0, TREE_ROWS).map((r) => `<div class="tree-row${r.id === tree.parent ? ' tree-cause' : ''}" style="padding-left:${r.depth * 12}px">${r.t.toFixed(1)} s ${esc(LABELS[r.room] || r.room)} ${esc(r.type)}${r.n > 1 ? ` &times;${r.n}` : ''}</div>`);
  const more = rows.length > TREE_ROWS ? `<div class="tree-row">… ${rows.length - TREE_ROWS} more rows (proto/replay.mjs --log has every event)</div>` : '';
  return `<div class="tree"><h3>${NAME[name]}: ${esc(tree.end.kind)}, cascade tree</h3><div class="tree-root">${esc(tree.root)}</div>${lines.join('')}${more}<div class="tree-row">→ ${esc(tree.end.kind)}${tree.end.why ? ` (${esc(tree.end.why)})` : ''}${tree.end.by ? ` by ${esc(tree.end.by)}` : ''}</div></div>`;
}
const TITLE = { destroyed: { A: 'You are destroyed', T: 'Enemy destroyed' }, disabled: { A: 'You are Disabled', T: 'Enemy Disabled' }, surrender: { A: 'You surrender', T: 'The enemy surrenders' }, escaped: { A: 'You escaped', T: 'The enemy escaped' } };
function showEnd() {
  const e = battle.ended, el = $('end'), t = Math.floor(e.t), st = shotStats(battle);
  const row = (name) => { const L = losses(battle, name), s = st[name]; return `<tr><th>${NAME[name]}</th><td>${L.crewLost} / ${L.crewTotal}</td><td>${L.wrecked.length ? L.wrecked.map((id) => LABELS[id] || id).join(', ') : 'none'}</td><td>${s.shots} / ${s.hits} / ${s.misses}</td></tr>`; };
  el.innerHTML = `<h2>${(TITLE[e.kind] || {})[e.side] || `${e.kind} ${e.side}`}</h2><div>Battle time ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} (${e.t.toFixed(2)} s)</div>
    <table><tr><th></th><th>Crew lost</th><th>Rooms wrecked</th><th>Shots / hits / misses</th></tr>${row('A')}${row('T')}</table>${battle.sides.filter((s) => s.ended).map((s) => treeHtml(s.name)).join('')}`;
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = 'Restart'; b.addEventListener('click', chooseLoadout);
  const x = document.createElement('button');
  x.type = 'button'; x.id = 'end-export'; x.textContent = 'Export'; x.addEventListener('click', openExport);
  el.prepend(b, x);
  el.hidden = false;
}

// ---------- input: tap the enemy's grid ----------
/** The enemy grid cell under a screen point, or null. */
function enemyCell(px, py) {
  const b = box.enemy, i = b.W - 1 - Math.floor((px - geo.ox.enemy) / geo.cs), j = Math.floor((py - geo.oy) / geo.cs);
  return i < 0 || i >= b.W || j < 0 || j >= b.H ? null : [b.x0 + i, b.y0 + j];
}
canvas.addEventListener('pointerdown', (ev) => {
  if (!geo || !battle || choosing || battle.ended) return;
  const r = canvas.getBoundingClientRect(), c = enemyCell(ev.clientX - r.left, ev.clientY - r.top);
  if (!c) return;
  const m = model(), known = m.cells.get(`${c[0]},${c[1]}`), z = m.zones.find((q) => c[0] >= q.x[0] && c[0] < q.x[1] && c[1] >= q.y[0] && c[1] < q.y[1]);
  if (!scanMode && known) verb('target', known.room);
  else if (z) { verb('scan', z.id); scanMode = false; refreshButtons(); }
  $('hint').hidden = true;
});

// ---------- the loop: the kernel's tick, as fast as the speed asks ----------
function frame(now) {
  if (last === null) last = now;
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (battle && !choosing && !paused && !battle.ended && !waiting(battle)) {
    acc += real * speed;
    let n = Math.min(MAX_STEPS_PER_FRAME * speed, Math.floor(acc / battle.dt + 1e-9));
    acc -= n * battle.dt;
    while (n-- > 0 && !battle.ended && !waiting(battle)) tick(battle);
    if (acc > 4 * battle.dt * speed) acc = 0; // a slow phone drops time rather than spiral
    logEvents();
    if (waiting(battle)) { acc = 0; showDecision(); }
    refreshButtons();
    if (battle.ended) { $('decision').hidden = true; showEnd(); }
  }
  if (battle && !choosing) phaseReadout();
  draw();
  requestAnimationFrame(frame);
}

// ---------- export (proto/export.js): one JSON text for proto/replay.mjs ----------
function openExport() {
  if (!battle || choosing) return;
  if ($('export-panel').hidden) pausedBeforeExport = paused;
  paused = true; refreshButtons();
  lastExport = exportText(battle);
  $('export-text').value = lastExport;
  $('export-status').textContent = `${(lastExport.length / 1024).toFixed(1)} kB, step ${battle.step}`;
  $('export-panel').hidden = false;
  copyExport();
}
function closeExport() {
  if ($('export-panel').hidden) return;
  $('export-panel').hidden = true;
  paused = pausedBeforeExport; refreshButtons();
}
/** Copy to the clipboard; a phone's clipboard can refuse, so the text stays in a selectable box. */
async function copyExport() {
  const box2 = $('export-text'), status = $('export-status'), size = `${(lastExport.length / 1024).toFixed(1)} kB`;
  let ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(lastExport); ok = true; } } catch { ok = false; }
  if (!ok) {
    box2.focus(); box2.select(); box2.setSelectionRange(0, lastExport.length);
    try { ok = document.execCommand('copy'); } catch { ok = false; }
  }
  status.textContent = ok ? `copied (${size})` : `not copied: select the text below and copy it (${size})`;
}

// For the smoke test: read-only access and screen points on the enemy's grid.
window.__proto = {
  get battle() { return battle; },
  get choosing() { return choosing; },
  get lastExport() { return lastExport; },
  /** The screen centre of the first cell of a room the model knows, or null. */
  knownRoomCentre(id) {
    if (!model().rooms.has(id)) return null;
    const r = canvas.getBoundingClientRect(), [x, y] = cellXY('enemy', ...knownCells(id)[0]);
    return [r.left + x + geo.cs / 2, r.top + y + geo.cs / 2];
  },
  /** The screen centre of zone z's rectangle on the enemy's grid. */
  zoneCentre(z) {
    const q = model().zones[z], r = canvas.getBoundingClientRect(), [x, y, w, h] = cellsRect('enemy', [[q.x[0], q.y[0]], [q.x[1] - 1, q.y[1] - 1]]);
    return [r.left + x + w / 2, r.top + y + h / 2];
  },
};

$('version').textContent = PROTO_VERSION;
buttons();
chooseLoadout();
requestAnimationFrame(frame);
