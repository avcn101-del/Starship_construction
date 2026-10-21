// proto/proto.js — the feel prototype's page (DESIGN.md 13h, #217, #224):
// draws the battle of proto/battle.js on a 2D canvas and takes the player's
// three verbs (target a room by tapping it, switch preset, set time), after
// a loadout panel that sets both ships alike before each battle. A
// throwaway: it only reads the kernel's state and never counts as a Mission 0
// result. No Math.random: the page draws no random effect.
import { createBattle, tick, setTarget, setPreset, drainEvents, abilities } from './battle.js';
import { isDestroyed, roomTemperature, survivingFraction } from '../js/rooms.js';
import { PRESETS, PRESET_ORDER, SPEEDS, MAX_STEPS_PER_FRAME, LOG_LINES, COLOURS, LABELS, STAND_INS, SEPARATION, DISABLED_SECONDS, LOADOUT, LOADOUT_ORDER, defaultLoadout } from './config.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view'), ctx = canvas.getContext('2d');
const GAP = 4; // cells of screen between the ships (900 m is not drawn to scale)

// GW x GH: the drawn grid of a ship (its layout plus the armour belt), set when a battle starts.
let battle = null, GW = 0, GH = 0, speed = 1, paused = false, choosing = true, acc = 0, last = null, geo = null;
let loadout = defaultLoadout();

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
/** The loadout in the corner of the battle view (two short lines). */
function loadoutTag(lo) {
  return [`${optionLabel('magazine', lo)} · armour ${optionLabel('armour', lo)} · ${optionLabel('layout', lo)}`,
    `shield ${optionLabel('shieldBudget', lo)} · hits ${optionLabel('hitsToWreck', lo)} · turrets ${optionLabel('turrets', lo)}`];
}
/** The loadout panel: shown before the first battle and from Restart; the battle behind it stops. */
function chooseLoadout() {
  choosing = true;
  refreshLoadout();
  $('end').hidden = true;
  $('loadout').hidden = false;
}

function start() {
  battle = createBattle({ loadout });
  GW = battle.width; GH = battle.player.size[1];
  choosing = false; acc = 0; last = null; paused = false;
  $('loadout').hidden = true;
  $('lo-tag').replaceChildren(...loadoutTag(battle.loadout).map((t) => { const d = document.createElement('div'); d.textContent = t; return d; }));
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
  const line = 15, top = 2 * line + 6, bottom = 4 * line + 4;
  const cs = battle ? Math.floor(Math.min((w - 12) / (2 * GW + GAP), (h - top - bottom) / GH)) : 1;
  const total = (2 * GW + GAP) * cs, ox = Math.floor((w - total) / 2), oy = top;
  geo = { w, h, cs, line, oy, ox: { player: ox, enemy: ox + (GW + GAP) * cs } };
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
      const key = `${room.id}:${k}`, burnt = ship.burn.get(key);
      if (burnt && !c.destroyed) { ctx.fillStyle = COLOURS.beam; ctx.fillRect(x, y + cs - 4, (cs * burnt) / battle.burnEnergy, 4); }
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
  // STAND-IN bow armour: grey cells in front of each row, darker with lost integrity, a red cross when wrecked.
  for (const cells of ship.armour.values()) {
    for (const c of cells) {
      const [x, y] = cellXY(ship.side, c.x, c.row);
      if (c.destroyed) {
        ctx.strokeStyle = COLOURS.cross; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + cs - 4, y + cs - 4); ctx.moveTo(x + cs - 4, y + 4); ctx.lineTo(x + 4, y + cs - 4); ctx.stroke();
        continue;
      }
      ctx.fillStyle = rgb(COLOURS.armour, 0.35 + 0.65 * c.integrity); ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      const burnt = ship.burn.get(`armour:${c.row}:${c.x}`);
      if (burnt) { ctx.fillStyle = COLOURS.beam; ctx.fillRect(x, y + cs - 4, (cs * burnt) / battle.burnEnergy, 4); }
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
  ctx.fillText(`${ship.side === 'player' ? 'YOU' : 'ENEMY'}  ${PRESETS[ship.preset].label}`, o, line);
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace'; ctx.fillStyle = COLOURS.text;
  ctx.fillText(`target: ${ship.target ? LABELS[ship.target] : '—'}`, o, 2 * line);
  const by = geo.oy + GH * geo.cs + line;
  const ok = (x) => (x ? 'ok' : 'NO');
  ctx.fillText(`beam ${ok(a.beam)} gun ${ok(a.turret)} thrust ${ok(a.thrust)}`, o, by);
  ctx.fillText(`crew ${ship.crewTotal - ship.crewLost}/${ship.crewTotal}  reactor ${(reactor.delivered / 1e6).toFixed(1)} MW`, o, by + line);
  ctx.fillText(`shield ${up ? `${Math.round(frac * 100)}%` : 'OFF'}  absorbing ${(s.absorbed / 1e6).toFixed(1)} MW`, o, by + 2 * line);
  if (ship.disabledSince !== null) { ctx.fillStyle = COLOURS.cross; ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText(`DISABLED in ${Math.max(0, DISABLED_SECONDS - (battle.t - ship.disabledSince)).toFixed(1)} s`, o, by + 3 * line); }
}

function drawShots() {
  // Beams: magenta while they pass the shield, cyan where the shield takes them.
  for (const s of battle.ships) {
    if (!(s.beam.power > 0) || !s.beam.aimed) continue;
    const from = pointXY(s, s.room('beamBay').position), to = pointXY(s.other, s.other.room(s.beam.aimed).position);
    const passing = s.beam.passed > 0;
    ctx.save();
    ctx.strokeStyle = passing ? COLOURS.beam : COLOURS.beamAbsorbed; ctx.lineWidth = passing ? 3 : 2;
    ctx.globalAlpha = passing ? 1 : 0.7;
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
    ctx.restore();
  }
  // Rounds: short white dashes along their straight line.
  ctx.strokeStyle = COLOURS.round; ctx.lineWidth = 3;
  for (const r of battle.rounds) {
    const f = (battle.t - r.t0) / (r.t1 - r.t0), cs = geo.cs;
    const a = pointXY(r.shooter, r.shooter.room('turret').position);
    const [cx] = pointXY(r.target, r.target.room(r.room).position), [, y0] = cellXY(r.target.side, 0, r.row), b = [cx, y0 + cs / 2];
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, dx = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), dy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    ctx.beginPath(); ctx.moveTo(x - dx * 10, y - dy * 10); ctx.lineTo(x, y); ctx.stroke();
  }
  // Hits of the last 0.4 s: the row the round went down.
  for (const h of battle.hits) {
    if (battle.t - h.t > 0.4) continue;
    const ship = battle[h.target], [x0, y0] = cellXY(ship.side, ship.side === 'player' ? 0 : GW - 1, h.row);
    ctx.save(); ctx.globalAlpha = 1 - (battle.t - h.t) / 0.4; ctx.strokeStyle = COLOURS.round; ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, GW * geo.cs, geo.cs); ctx.restore();
  }
}

function draw() {
  layout();
  ctx.fillStyle = COLOURS.background; ctx.fillRect(0, 0, geo.w, geo.h);
  if (!battle) return;
  drawShip(battle.player); drawShip(battle.enemy);
  drawShots();
  ctx.fillStyle = COLOURS.dim; ctx.font = '11px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center';
  const gx = geo.ox.enemy - (GAP * geo.cs) / 2, gy = geo.oy + (GH * geo.cs) / 2;
  ctx.fillText(`${SEPARATION} m`, gx, gy + 22); ctx.fillText('not to scale', gx, gy + 36);
  const t = Math.floor(battle.t);
  $('clock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------- log ----------
const BIG = new Set(['explosion', 'scram', 'shutdown', 'control-lost', 'crew-died', 'cell-destroyed', 'meltdown', 'breach', 'cook-off', 'shield-down']);
function logEvents() {
  const evs = drainEvents(battle).filter((e) => e.type !== 'shot'); // shots are drawn as rounds
  if (!evs.length) return;
  const log = $('log'), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 4;
  for (const e of evs.slice(-LOG_LINES)) {
    const div = document.createElement('div'), side = e.side === 'player' ? 'P' : 'E';
    const extra = e.type === 'crew-died' ? ` ${e.deaths} dead` : e.type === 'cell-damaged' || e.type === 'armour-damaged' ? ` ${Math.round(e.integrity * 100)}%` : e.type === 'explosion' ? ` ${(e.energy / 1e6).toFixed(0)} MJ` : '';
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
  el.prepend(b);
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
    while (n-- > 0 && !battle.ended) tick(battle);
    if (acc > 4 * battle.dt * speed) acc = 0; // a slow phone drops time rather than spiral
    logEvents();
    if (battle.ended) showEnd();
  }
  draw();
  requestAnimationFrame(frame);
}

// For the smoke test: read-only access and the screen rectangle of a room.
window.__proto = {
  get battle() { return battle; },
  get choosing() { return choosing; },
  roomCentre(side, id) {
    const r = canvas.getBoundingClientRect(), [x, y, w, h] = roomRect(battle[side], id);
    return [r.left + x + w / 2, r.top + y + h / 2];
  },
};

buttons();
chooseLoadout();
requestAnimationFrame(frame);
