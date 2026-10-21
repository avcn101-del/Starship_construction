// proto/proto.js — the feel prototype v2's page (DESIGN.md 13j, #217, #237):
// draws the battle of proto/battle.js on a 2D canvas (a world strip of both
// ships to scale above two head-up grids) and takes the player's three verbs
// (target a room by tapping it, switch preset, set time), after a loadout
// panel (both ships' fit, the player's standing orders, the seed) before each
// battle. A throwaway: it only reads the kernel's state and never counts as a
// Mission 0 result. No Math.random: the page draws no random effect.
import { createBattle, tick, setTarget, setPreset, drainEvents, abilities, mainBody } from './battle.js';
import { createRecorder, record, exportText } from './export.js';
import { isDestroyed, roomTemperature, survivingFraction } from '../js/rooms.js';
import { worldPoint } from '../js/body.js';
import { PRESETS, PRESET_ORDER, SPEEDS, MAX_STEPS_PER_FRAME, LOG_LINES, COLOURS, LABELS, STAND_INS, DISABLED_SECONDS, LOADOUT, LOADOUT_ORDER, defaultLoadout, SEED } from './config.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view'), ctx = canvas.getContext('2d');
const GAP = 2; // cells of screen between the two head-up grids

// GW x GH: the drawn grid of a ship (its layout), set when a battle starts.
let battle = null, GW = 0, GH = 0, speed = 1, paused = false, choosing = true, acc = 0, last = null, geo = null;
let loadout = defaultLoadout(), seed = SEED;
// rec: the battle's recorder (proto/export.js), fed every tick's events; logged: events waiting for the log.
let rec = null, logged = [], lastExport = null, pausedBeforeExport = false;

// ---------- controls ----------
function buttons() {
  $('presets').replaceChildren(...PRESET_ORDER.map((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = PRESETS[k].label; b.dataset.preset = k;
    b.addEventListener('click', () => { if (!battle || choosing) return; setPreset(battle, battle.player, k); refreshButtons(); });
    return b;
  }));
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
  for (const b of $('presets').children) b.classList.toggle('on', !!battle && b.dataset.preset === battle.player.preset);
  for (const b of $('speeds').children) b.classList.toggle('on', Number(b.dataset.speed) === speed);
  $('pause').textContent = paused ? 'Run' : 'Pause';
  $('pause').classList.toggle('on', paused);
}

function refreshLoadout() {
  for (const b of $('loadout-groups').querySelectorAll('button')) b.classList.toggle('on', LOADOUT[b.dataset.lever].options[b.dataset.option].value === loadout[b.dataset.lever]);
}
const optionLabel = (k, lo) => LOADOUT[k].options.find((o) => o.value === lo[k]).label;
/** The loadout and seed in the corner of the battle view (three short lines). */
function loadoutTag(lo, sd) {
  return [`seed ${sd} · ${optionLabel('magazine', lo)} · ${optionLabel('layout', lo)}`,
    `${optionLabel('shieldBudget', lo)} · hits ${optionLabel('hitsToWreck', lo)} · guns ${optionLabel('turrets', lo)}`,
    `${lo.range} · ${optionLabel('facing', lo)} · ${lo.dodge ? 'dodge' : 'no dodge'}`];
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
  battle = createBattle({ seed, loadout });
  rec = createRecorder(battle); logged = [];
  GW = battle.player.size[0]; GH = battle.player.size[1];
  choosing = false; acc = 0; last = null; paused = false;
  $('loadout').hidden = true;
  $('lo-tag').replaceChildren(...loadoutTag(battle.loadout, battle.seed).map((t) => { const d = document.createElement('div'); d.textContent = t; return d; }));
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
  const cs = battle ? Math.max(1, Math.floor(Math.min((w - 12) / (2 * GW + GAP), (h - head - foot - stripMin) / GH))) : 1;
  const strip = Math.max(stripMin, h - head - foot - GH * cs);
  const total = (2 * GW + GAP) * cs, ox = Math.floor((w - total) / 2), oy = strip + head;
  geo = { w, h, cs, line, oy, strip, ox: { player: ox, enemy: ox + (GW + GAP) * cs } };
}
/** Top-left (px) of grid cell (x, y): the player faces right (y up); the enemy, turned 180 degrees, faces left. */
function cellXY(side, x, y) {
  const { cs, oy } = geo, o = geo.ox[side];
  return side === 'player' ? [o + x * cs, oy + (GH - 1 - y) * cs] : [o + (GW - 1 - x) * cs, oy + y * cs];
}
/** Screen point (px) of grid point p (m). */
function pointXY(ship, p) {
  const { cs, oy } = geo, o = geo.ox[ship.side], e = ship.world.edge, u = p[0] / e, v = p[1] / e;
  return ship.side === 'player' ? [o + u * cs, oy + (GH - v) * cs] : [o + (GW - u) * cs, oy + v * cs];
}
function roomRect(ship, id) {
  const cells = ship.world.layout.rooms.get(id).cells, pts = cells.map(([x, y]) => cellXY(ship.side, x, y));
  const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1]));
  return [x0, y0, Math.max(...pts.map((p) => p[0])) + geo.cs - x0, Math.max(...pts.map((p) => p[1])) + geo.cs - y0];
}

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

function drawShip(ship) {
  const { cs } = geo, w = ship.world, colour = ship.side === 'player' ? COLOURS.player : COLOURS.enemy;
  // Shield: an outline around the ship whose brightness is the generator's budget fraction.
  const sh = ship.room('shield'), s = sh.shield;
  const up = s.on && !s.down && !isDestroyed(sh);
  const frac = up ? survivingFraction(sh) * (sh.powerFraction ?? 1) : 0;
  const [sx, sy] = cellXY(ship.side, ship.side === 'player' ? 0 : GW - 1, ship.side === 'player' ? GH - 1 : 0);
  ctx.strokeStyle = COLOURS.grid; ctx.lineWidth = 1;
  ctx.strokeRect(sx - 0.5, sy - 0.5, GW * cs + 1, GH * cs + 1);
  if (frac > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.6 * frac;
    ctx.strokeStyle = COLOURS.shield; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx + (GW * cs) / 2, sy + (GH * cs) / 2, (GW * cs) / 2 + 8, (GH * cs) / 2 + 8, 0, 0, 2 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  for (const room of w.rooms) {
    const cells = w.layout.rooms.get(room.id).cells, col = tempColour(room);
    room.cells.forEach((c, k) => {
      const [x, y] = cellXY(ship.side, cells[k][0], cells[k][1]);
      if (c.destroyed) {
        ctx.fillStyle = COLOURS.destroyed; ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + cs - 4, y + cs - 4); ctx.moveTo(x + cs - 4, y + 4); ctx.lineTo(x + 4, y + cs - 4); ctx.stroke();
      } else {
        ctx.fillStyle = rgb(col, 0.35 + 0.65 * c.integrity); ctx.fillRect(x, y, cs, cs);
        if (c.integrity < 1) { ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); }
      }
    });
    const [rx, ry, rw, rh] = roomRect(ship, room.id);
    ctx.strokeStyle = room.controlled ? COLOURS.text : COLOURS.dim; ctx.lineWidth = 2; ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    if (!isDestroyed(room)) {
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.55; ctx.fillRect(rx + 3, ry + rh / 2 - 12, rw - 6, 24); ctx.globalAlpha = 1;
      ctx.fillStyle = room.shutdown ? COLOURS.cross : COLOURS.text; ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center';
      ctx.fillText(room.shutdown ? `${LABELS[room.id]}!` : LABELS[room.id], rx + rw / 2, ry + rh / 2 - 2);
      ctx.fillText(`${Math.round(roomTemperature(room))}K`, rx + rw / 2, ry + rh / 2 + 9);
    }
  }
  // Targets: the player's in yellow on the enemy; the enemy's in its colour on the player.
  const aimedBy = ship.other.target;
  if (aimedBy) {
    const [rx, ry, rw, rh] = roomRect(ship, aimedBy);
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 4;
    ctx.strokeStyle = ship.side === 'enemy' ? COLOURS.target : COLOURS.enemy;
    ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); ctx.restore();
  }
  // Text: above, name, preset and target; below, abilities, crew, power, shield.
  const a = abilities(ship), o = geo.ox[ship.side], line = geo.line;
  const reactor = ship.room('reactor').reactor;
  ctx.textAlign = 'left'; ctx.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace'; ctx.fillStyle = colour;
  ctx.fillText(`${ship.side === 'player' ? 'YOU' : 'ENEMY'}  ${PRESETS[ship.preset].label}`, o, geo.strip + line);
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace'; ctx.fillStyle = COLOURS.text;
  ctx.fillText(`target: ${ship.target ? LABELS[ship.target] : '—'} · ${ship.helm.mode || ''}${ship.helm.throttle > 0 ? ` · engine ${Math.round(ship.helm.throttle * 100)}%` : ''}`, o, geo.strip + 2 * line);
  const by = geo.oy + GH * geo.cs + line;
  const ok = (x) => (x ? 'ok' : 'NO');
  ctx.fillText(`beam ${ok(a.beam)} gun ${ok(a.turret)} thrust ${ok(a.thrust)}`, o, by);
  ctx.fillText(`crew ${ship.crewTotal - ship.crewLost}/${ship.crewTotal}  reactor ${(reactor.delivered / 1e6).toFixed(1)} MW`, o, by + line);
  ctx.fillText(`shield ${up ? `${Math.round(frac * 100)}%` : 'OFF'}  absorbing ${(s.absorbed / 1e6).toFixed(1)} MW`, o, by + 2 * line);
  if (ship.disabledSince !== null) { ctx.fillStyle = COLOURS.cross; ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText(`DISABLED in ${Math.max(0, DISABLED_SECONDS - (battle.t - ship.disabledSince)).toFixed(1)} s`, o, by + 3 * line); }
}

/** Screen point (px) of a world point q (m) in the world strip: the line of sight from the player to the enemy points right. */
function stripXY(q) {
  const v = geo.view, dx = q[0] - v.mid[0], dy = q[1] - v.mid[1];
  return [v.cx + (dx * v.cos + dy * v.sin) * v.scale, v.cy - (-dx * v.sin + dy * v.cos) * v.scale];
}
/** The world strip: both ships to scale with heading and velocity, rounds in flight, beams, the range, hits and misses. */
function drawStrip() {
  const w = geo.w, h = geo.strip, pb = mainBody(battle.player), eb = mainBody(battle.enemy);
  const d = [eb.x[0] - pb.x[0], eb.x[1] - pb.x[1]], R = Math.hypot(d[0], d[1]), a = Math.atan2(d[1], d[0]);
  const mid = [(pb.x[0] + eb.x[0]) / 2, (pb.x[1] + eb.x[1]) / 2], vmid = [(pb.v[0] + eb.v[0]) / 2, (pb.v[1] + eb.v[1]) / 2];
  geo.view = { mid, cos: Math.cos(a), sin: Math.sin(a), scale: Math.min((w - 40) / (R + 120), (h - 30) / 160), cx: w / 2, cy: h / 2 + 6 };
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COLOURS.grid; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  const e = battle.edge;
  for (const ship of battle.ships) {
    const colour = ship.side === 'player' ? COLOURS.player : COLOURS.enemy;
    // Hull cells, each on the body it belongs to; holes as outlines.
    for (const room of ship.world.rooms) {
      const grid = ship.world.layout.rooms.get(room.id).cells;
      room.cells.forEach((c, k) => {
        const b = ship.world.ship.bodies.find((x) => x.id === c.fragment) || mainBody(ship);
        const [i, j] = grid[k], pts = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([x, y]) => stripXY(worldPoint(b, [x * e, y * e])));
        ctx.beginPath(); pts.forEach((p, n) => (n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        if (c.destroyed) { ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 1; ctx.stroke(); } else { ctx.fillStyle = colour; ctx.globalAlpha = 0.35 + 0.65 * c.integrity; ctx.fill(); ctx.globalAlpha = 1; }
      });
    }
    // Velocity against the midpoint's, drawn as 5 s of travel; the bow marked by a short white tick.
    const b = mainBody(ship), p0 = stripXY(b.x), rel = [b.v[0] - vmid[0], b.v[1] - vmid[1]], p1 = stripXY([b.x[0] + rel[0] * 5, b.x[1] + rel[1] * 5]);
    ctx.strokeStyle = COLOURS.target; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    const nose = stripXY(worldPoint(b, [ship.size[0] * e, b.c[1]])), tick = stripXY(worldPoint(b, [ship.size[0] * e + 12, b.c[1]]));
    ctx.strokeStyle = COLOURS.text; ctx.beginPath(); ctx.moveTo(nose[0], nose[1]); ctx.lineTo(tick[0], tick[1]); ctx.stroke();
  }
  // Beams: from the bay's bow face along the axis to where they land (magenta past the shield, cyan when it takes all), or on into space (grey dashes: a miss).
  for (const s of battle.ships) {
    const bm = s.beam;
    if (!(bm.power > 0) || !bm.from) continue;
    let to;
    if (bm.hit) { const body = s.other.world.ship.bodies.find((x) => x.id === bm.hit.body) || mainBody(s.other); to = worldPoint(body, bm.hit.entry); } else to = [bm.from[0] + bm.dir[0] * (R + 2000), bm.from[1] + bm.dir[1] * (R + 2000)];
    const p0 = stripXY(bm.from), p1 = stripXY(to);
    ctx.save();
    if (!bm.hit) { ctx.setLineDash([5, 5]); ctx.strokeStyle = COLOURS.miss; ctx.lineWidth = 1.5; } else { ctx.strokeStyle = bm.passed > 0 ? COLOURS.beam : COLOURS.beamAbsorbed; ctx.lineWidth = 2; }
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); ctx.restore();
  }
  // Rounds in flight: a dot with a short tail along their path.
  ctx.strokeStyle = COLOURS.round; ctx.fillStyle = COLOURS.round; ctx.lineWidth = 2;
  for (const r of battle.rounds) {
    const p = stripXY(r.x), q = stripXY(r.prev);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
  }
  // Text: range and range rate; each side's hits and misses.
  const vr = ((eb.v[0] - pb.v[0]) * d[0] + (eb.v[1] - pb.v[1]) * d[1]) / R;
  ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = COLOURS.text;
  ctx.fillText(`${Math.round(R)} m  ${vr >= 0 ? 'opening' : 'closing'} ${Math.abs(vr).toFixed(0)} m/s`, w - 6, 13);
  ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
  const st = (s) => `hits ${s.stats.hits} · misses ${s.stats.misses} · in flight ${battle.rounds.filter((r) => r.shooter === s).length}`;
  ctx.textAlign = 'left'; ctx.fillStyle = COLOURS.player; ctx.fillText(`YOU ${st(battle.player)}`, 6, h - 5);
  ctx.textAlign = 'right'; ctx.fillStyle = COLOURS.enemy; ctx.fillText(`ENEMY ${st(battle.enemy)}`, w - 6, h - 5);
  ctx.textAlign = 'left'; ctx.fillStyle = COLOURS.dim; ctx.fillText('to scale · velocity vs midpoint, 5 s', 6, 13);
  ctx.restore();
}

/** On each head-up grid: an arrow where recent rounds entered and the cells they reached; the beam where it lands. */
function drawHits() {
  const cs = geo.cs, e = battle.edge;
  for (const h of battle.hits) {
    const age = battle.t - h.t;
    if (age > 1.5) continue;
    const ship = battle[h.target], f = 1 - age / 1.5;
    ctx.save(); ctx.globalAlpha = f; ctx.strokeStyle = COLOURS.round; ctx.lineWidth = 2;
    for (const [i, j] of h.cells) { const [x, y] = cellXY(ship.side, i, j); ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4); }
    const tip = pointXY(ship, h.entry), tail = pointXY(ship, [h.entry[0] - h.dir[0] * 1.5 * e, h.entry[1] - h.dir[1] * 1.5 * e]);
    arrow(tail, tip, COLOURS.round);
    ctx.restore();
  }
  for (const s of battle.ships) {
    const bm = s.beam;
    if (!(bm.power > 0)) continue;
    const ship = s.other;
    ctx.save();
    if (bm.hit) {
      const last = bm.hit.cells[bm.deepest ?? 0] || bm.hit.cells[0], tip = pointXY(ship, bm.hit.entry), end = pointXY(ship, [(last[0] + 0.5) * e, (last[1] + 0.5) * e]);
      const tail = pointXY(ship, [bm.hit.entry[0] - bm.hit.dir[0] * 1.2 * e, bm.hit.entry[1] - bm.hit.dir[1] * 1.2 * e]);
      ctx.strokeStyle = bm.passed > 0 ? COLOURS.beam : COLOURS.beamAbsorbed; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(tip[0], tip[1]); if (bm.passed > 0) ctx.lineTo(end[0], end[1]); ctx.stroke();
    } else {
      // In the target grid's top-left corner (empty in both layouts).
      ctx.fillStyle = COLOURS.miss; ctx.font = 'bold 11px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'left';
      ctx.fillText(`${s.side === 'player' ? 'your' : 'enemy'} beam: miss`, geo.ox[ship.side] + 3, geo.oy + 12);
    }
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
  drawShip(battle.player); drawShip(battle.enemy);
  drawHits();
  const t = Math.floor(battle.t);
  $('clock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------- log ----------
const BIG = new Set(['explosion', 'scram', 'shutdown', 'control-lost', 'crew-died', 'cell-destroyed', 'meltdown', 'breach', 'cook-off', 'shield-down']);
function logEvents() {
  const evs = logged.filter((e) => e.type !== 'shot'); // shots are drawn as rounds
  logged = [];
  if (!evs.length) return;
  const log = $('log'), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 4;
  for (const e of evs.slice(-LOG_LINES)) {
    const div = document.createElement('div'), side = e.side === 'player' ? 'P' : 'E';
    const extra = e.type === 'crew-died' ? ` ${e.deaths} dead` : e.type === 'cell-damaged' ? ` ${Math.round(e.integrity * 100)}%` : e.type === 'explosion' ? ` ${(e.energy / 1e6).toFixed(0)} MJ` : '';
    div.className = `${side}${BIG.has(e.type) ? ' big' : ''}`;
    div.textContent = `${e.t.toFixed(1)} ${side} ${LABELS[e.room] || e.room} ${e.type}${extra} ← ${e.cause}${e.crew === undefined ? '' : ` · crew ${e.crew}`}`;
    log.appendChild(div);
  }
  while (log.childElementCount > LOG_LINES) log.firstElementChild.remove();
  if (stick) log.scrollTop = log.scrollHeight;
}

// ---------- the end ----------
function showEnd() {
  const e = battle.ended, el = $('end'), t = Math.floor(e.t);
  const title = e.losers.length === 2 ? 'Both ships are out' : e.losers[0] === 'enemy' ? `Enemy ${e.reason.enemy}` : `You are ${e.reason.player}`;
  const row = (side) => {
    const s = e.sides[side];
    return `<tr><th>${side === 'player' ? 'You' : 'Enemy'}</th><td>${s.crewLost} / ${s.crewTotal}</td><td>${s.wrecked.length ? s.wrecked.map((id) => LABELS[id]).join(', ') : 'none'}</td></tr>`;
  };
  el.innerHTML = `<h2>${title}</h2><div>Battle time ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} (${e.t.toFixed(1)} s)</div>
    <table><tr><th></th><th>Crew lost</th><th>Rooms wrecked</th></tr>${row('player')}${row('enemy')}</table>`;
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = 'Restart'; b.addEventListener('click', chooseLoadout);
  const x = document.createElement('button');
  x.type = 'button'; x.id = 'end-export'; x.textContent = 'Export'; x.addEventListener('click', openExport);
  el.prepend(b, x);
  el.hidden = false;
}

// ---------- input: tap an enemy room ----------
canvas.addEventListener('pointerdown', (ev) => {
  if (!geo || !battle || choosing || battle.ended) return;
  const r = canvas.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
  const x = GW - 1 - Math.floor((px - geo.ox.enemy) / geo.cs), y = Math.floor((py - geo.oy) / geo.cs);
  if (x < 0 || x >= GW || y < 0 || y >= GH) return;
  const o = battle.enemy.world.layout.occupied.get(`${x},${y}`);
  if (!o || isDestroyed(battle.enemy.room(o.id))) return;
  setTarget(battle, battle.player, o.id);
  $('hint').hidden = true;
});

// ---------- the loop ----------
function frame(now) {
  if (last === null) last = now;
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (battle && !choosing && !paused && !battle.ended) {
    acc += real * speed;
    let n = Math.min(MAX_STEPS_PER_FRAME * speed, Math.floor(acc / battle.dt + 1e-9));
    acc -= n * battle.dt;
    while (n-- > 0 && !battle.ended) {
      tick(battle);
      const evs = drainEvents(battle); // after every tick, as proto/replay.mjs does, so the hashes agree
      record(rec, evs);
      for (const e of evs) logged.push(e);
    }
    if (acc > 4 * battle.dt * speed) acc = 0; // a slow phone drops time rather than spiral
    logEvents();
    if (battle.ended) showEnd();
  }
  draw();
  requestAnimationFrame(frame);
}

// ---------- export (proto/export.js): one JSON text for proto/replay.mjs ----------
/** Build the export of the battle as it stands, pause it, show it and copy it. */
function openExport() {
  if (!battle || choosing) return;
  if ($('export-panel').hidden) pausedBeforeExport = paused;
  paused = true; refreshButtons();
  lastExport = exportText(battle, rec);
  const box = $('export-text');
  box.value = lastExport;
  $('export-status').textContent = `${(lastExport.length / 1024).toFixed(1)} kB, step ${battle.steps}`;
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
  const box = $('export-text'), status = $('export-status'), size = `${(lastExport.length / 1024).toFixed(1)} kB`;
  let ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(lastExport); ok = true; } } catch { ok = false; }
  if (!ok) {
    box.focus(); box.select(); box.setSelectionRange(0, lastExport.length);
    try { ok = document.execCommand('copy'); } catch { ok = false; }
  }
  status.textContent = ok ? `copied (${size})` : `not copied: select the text below and copy it (${size})`;
}

// For the smoke test: read-only access and the screen rectangle of a room.
window.__proto = {
  get battle() { return battle; },
  get choosing() { return choosing; },
  get lastExport() { return lastExport; },
  roomCentre(side, id) {
    const r = canvas.getBoundingClientRect(), [x, y, w, h] = roomRect(battle[side], id);
    return [r.left + x + w / 2, r.top + y + h / 2];
  },
};

buttons();
chooseLoadout();
requestAnimationFrame(frame);
