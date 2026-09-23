// ===== Камера и отрисовка =====
const Cam = { x: -140, y: 40, z: 1, vw: 1, vh: 1, dpr: 1, top: 0, bot: 0 };
let cv, ctx, rockPat = null, dirtPat = null;
const FONT_D = '"Russo One", "Arial Black", Impact, sans-serif';
const FONT_B = '"PT Sans Narrow", "Roboto Condensed", "Arial Narrow", sans-serif';

function shade(hex, a) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (a < 0) { r *= 1 + a; g *= 1 + a; b *= 1 + a; } else { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function makePatterns() {
  const mk = (base, dots, seed) => {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 160, 160);
    const rng = seeded(seed);
    for (let i = 0; i < 90; i++) {
      const x = rng() * 160, y = rng() * 160, r = 2 + rng() * 9;
      g.fillStyle = dots[Math.floor(rng() * dots.length)];
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rng() * 0.4), rng() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 400; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,230,200,.05)'; g.fillRect(rng() * 160, rng() * 160, 1.5, 1.5); }
    return ctx.createPattern(c, 'repeat');
  };
  rockPat = mk('#3a2b20', ['#33261c', '#45342690', '#2c2018', '#4a382a'], 7);
  dirtPat = mk('#5a4330', ['#4d3928', '#6a5038', '#503b2a'], 11);
}
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  Cam.dpr = dpr;
  Cam.vw = cv.clientWidth || window.innerWidth;
  Cam.vh = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(Cam.vw * dpr);
  cv.height = Math.round(Cam.vh * dpr);
  const hud = document.getElementById('hud'), bar = document.getElementById('bar');
  Cam.top = hud ? hud.getBoundingClientRect().bottom : 0;
  Cam.bot = bar ? Cam.vh - bar.getBoundingClientRect().top : 0;
  document.documentElement.style.setProperty('--hud-h', Math.round(hud ? hud.getBoundingClientRect().bottom : 0) + 'px');
  if (S) clampCam();
}
function worldBounds() {
  return { x0: -OUTW, x1: GW * CW + 50, y0: 0, y1: SURF + (Math.min(MAXF, maxFloor() + 2)) * FH + 30 };
}
function minZoom() { const b = worldBounds(); return clamp(Math.min(Cam.vw / (b.x1 - b.x0), 0.9), 0.28, 0.9); }
function clampCam() {
  const b = worldBounds();
  Cam.z = clamp(Cam.z, minZoom(), 2.6);
  const vw = Cam.vw / Cam.z, vh = Cam.vh / Cam.z;
  const t = Cam.top / Cam.z, bt = Math.max(Cam.bot, R.sheetH || 0) / Cam.z;
  const xmin = b.x0, xmax = b.x1 - vw;
  Cam.x = xmax < xmin ? (b.x0 + b.x1 - vw) / 2 : clamp(Cam.x, xmin, xmax);
  const ymin = b.y0 - t, ymax = b.y1 + bt - vh;
  Cam.y = ymax < ymin ? ymin : clamp(Cam.y, ymin, ymax);
}
function zoomAt(sx, sy, nz) {
  const wx = Cam.x + sx / Cam.z, wy = Cam.y + sy / Cam.z;
  Cam.z = clamp(nz, minZoom(), 2.6);
  Cam.x = wx - sx / Cam.z;
  Cam.y = wy - sy / Cam.z;
  clampCam();
}
function centerOn(wx, wy, z) {
  if (z) Cam.z = clamp(z, minZoom(), 2.6);
  const midY = Cam.top + (Cam.vh - Cam.top - Cam.bot) / 2;
  Cam.x = wx - Cam.vw / 2 / Cam.z;
  Cam.y = wy - midY / Cam.z;
  clampCam();
}
function revealAbove(wx, wy) {
  const sh = document.getElementById('sheet');
  R.sheetH = 0;
  if (sh.hidden) return;
  const rect = sh.getBoundingClientRect();
  if (rect.left > 10) return;
  R.sheetH = Cam.vh - rect.top;
  const sy = (wy - Cam.y) * Cam.z;
  const top = Cam.top + 16, bottom = rect.top - 16;
  if (sy > bottom - 10 || sy < top) {
    Cam.y = wy - ((top + bottom) / 2) / Cam.z;
    clampCam();
  }
}
function toWorld(sx, sy) { return { x: Cam.x + sx / Cam.z, y: Cam.y + sy / Cam.z }; }

// ===== Эффекты =====
function floatText(x, y, text, col, icon) { if (R.offline) return; R.floaters.push({ x, y, text, col, icon, t: 0 }); }
function floatHeart(x, y) { for (let i = 0; i < 6; i++) R.parts.push({ x: x + rf(-10, 10), y, vx: rf(-8, 8), vy: rf(-30, -15), t: 0, life: 1.6, col: '#ef5470', heart: true, s: rf(5, 8) }); }
function sparks(x, y, col, n) {
  if (R.offline) return;
  for (let i = 0; i < n; i++) R.parts.push({ x, y, vx: rf(-70, 70), vy: rf(-90, 10), t: 0, life: rf(0.5, 1.1), col, s: rf(1.5, 3.5) });
}

// ===== Кадр =====
function render(time) {
  const t = time / 1000;
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  ctx.fillStyle = '#0d1114';
  ctx.fillRect(0, 0, Cam.vw, Cam.vh);
  if (!S) return;
  const z = Cam.z * Cam.dpr;
  ctx.setTransform(z, 0, 0, z, -Cam.x * z, -Cam.y * z);
  const view = { x0: Cam.x - 20, y0: Cam.y - 20, x1: Cam.x + Cam.vw / Cam.z + 20, y1: Cam.y + Cam.vh / Cam.z + 20 };
  drawWorldBg(t, view);
  for (const r of S.rooms) {
    const x = roomX(r), y = roomY(r), w = roomW(r) * CW;
    if (x > view.x1 || x + w < view.x0 || y > view.y1 || y + FH < view.y0) continue;
    drawRoom(r, x, y, w, t);
  }
  drawOutside(t);
  // жители
  for (const d of S.dwellers) {
    if (d.st === 'dead' && d.deadIn === 'vault') { const p = dwellerWorldPos(d); if (p) drawGrave(p.x, p.y); continue; }
    if (d.st !== 'vault' || d.hide) continue;
    const p = dwellerWorldPos(d);
    if (!p || p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y - 40 > view.y1) continue;
    drawDweller(d, p.x, p.y, t, 1, p.r);
  }
  // враги
  for (const inc of S.incs) {
    const r = RM(inc.room);
    if (r) drawEnemies(inc, r, t);
  }
  for (const r of S.rooms) {
    if (r.pair && r.pair.ph === 2) drawHearts(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2, t);
  }
  drawRobots(t);
  drawBubbles(t);
  if (R.place) drawPlacement(t);
  if (R.selRoom) {
    const r = RM(R.selRoom);
    if (r) { ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 2.5 / Cam.z; ctx.strokeRect(roomX(r) + 1, roomY(r) + 1, roomW(r) * CW - 2, FH - 2); }
  }
  drawFx(t);
  // экранная вспышка тревоги
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  if (S.incs.length) {
    const a = 0.1 + 0.08 * Math.sin(t * 5) + R.flash * 0.25;
    const g = ctx.createRadialGradient(Cam.vw / 2, Cam.vh / 2, Math.min(Cam.vw, Cam.vh) * 0.35, Cam.vw / 2, Cam.vh / 2, Math.max(Cam.vw, Cam.vh) * 0.75);
    g.addColorStop(0, 'rgba(200,30,20,0)');
    g.addColorStop(1, `rgba(200,30,20,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, Cam.vw, Cam.vh);
  }
}

function drawWorldBg(t, v) {
  const b = worldBounds();
  const groundY = SURF - 46;
  // небо
  const g = ctx.createLinearGradient(0, -200, 0, SURF + FH);
  g.addColorStop(0, '#16222c'); g.addColorStop(0.45, '#4b4a48'); g.addColorStop(0.8, '#b87b4a'); g.addColorStop(1, '#d9a064');
  ctx.fillStyle = g;
  ctx.fillRect(b.x0 - 400, -400, b.x1 - b.x0 + 800, SURF + FH + 400);
  // солнце
  ctx.fillStyle = 'rgba(255,214,150,.18)';
  ctx.beginPath(); ctx.arc(-120, 40, 70, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,226,170,.6)';
  ctx.beginPath(); ctx.arc(-120, 40, 22, 0, 7); ctx.fill();
  // дальние горы
  ctx.fillStyle = '#6e5642';
  ctx.beginPath(); ctx.moveTo(b.x0 - 400, groundY + 10);
  for (let x = b.x0 - 400; x <= b.x1 + 400; x += 60) ctx.lineTo(x, groundY - 30 - 26 * Math.abs(Math.sin(x * 0.013)) - 14 * Math.sin(x * 0.041));
  ctx.lineTo(b.x1 + 400, groundY + 10); ctx.fill();
  ctx.fillStyle = '#58432f';
  ctx.beginPath(); ctx.moveTo(b.x0 - 400, SURF + FH);
  for (let x = b.x0 - 400; x <= 0; x += 40) ctx.lineTo(x, SURF + 30 - 18 * Math.abs(Math.sin(x * 0.02 + 1)));
  ctx.lineTo(0, SURF + FH); ctx.fill();
  // холм над убежищем
  ctx.fillStyle = rockPat;
  ctx.beginPath();
  ctx.moveTo(-4, SURF + FH - 6);
  ctx.lineTo(-10, SURF + 10);
  ctx.lineTo(-2, groundY + 8);
  for (let x = 0; x <= b.x1 + 400; x += 30) ctx.lineTo(x, groundY - 6 * Math.sin(x * 0.03) - 4 * Math.sin(x * 0.11));
  ctx.lineTo(b.x1 + 400, b.y1 + 4000);
  ctx.lineTo(b.x0 - 400, b.y1 + 4000);
  ctx.lineTo(b.x0 - 400, SURF + FH - 6);
  ctx.closePath();
  ctx.fill();
  // корка почвы
  ctx.strokeStyle = '#6b5236'; ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-2, groundY + 8);
  for (let x = 0; x <= b.x1 + 400; x += 30) ctx.lineTo(x, groundY - 6 * Math.sin(x * 0.03) - 4 * Math.sin(x * 0.11));
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.x0 - 400, SURF + FH - 4); ctx.lineTo(-4, SURF + FH - 4); ctx.stroke();
  // декор на холме: мёртвые деревья и ржавая машина
  ctx.strokeStyle = '#2a1f17'; ctx.lineWidth = 3;
  for (const tx of [120, 470, 760]) {
    const ty = groundY - 6 * Math.sin(tx * 0.03) - 4 * Math.sin(tx * 0.11);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 2, ty - 34); ctx.moveTo(tx + 1, ty - 18); ctx.lineTo(tx - 10, ty - 28); ctx.moveTo(tx + 2, ty - 26); ctx.lineTo(tx + 12, ty - 36); ctx.stroke();
  }
  const cx = 300, cy = groundY - 6 * Math.sin(cx * 0.03) - 4 * Math.sin(cx * 0.11);
  ctx.fillStyle = '#6a3a28'; ctx.beginPath(); ctx.roundRect(cx - 26, cy - 16, 52, 12, 4); ctx.fill();
  ctx.fillStyle = '#7d4a32'; ctx.beginPath(); ctx.roundRect(cx - 14, cy - 26, 28, 12, 5); ctx.fill();
  ctx.fillStyle = '#1b1612'; ctx.beginPath(); ctx.arc(cx - 15, cy - 4, 6, 0, 7); ctx.arc(cx + 15, cy - 4, 6, 0, 7); ctx.fill();
  // указатель у двери
  const sx = -170, sy = SURF + FH - 6;
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(sx, sy - 44, 4, 44);
  ctx.fillStyle = '#c9a247'; ctx.beginPath(); ctx.roundRect(sx - 34, sy - 60, 72, 22, 3); ctx.fill();
  ctx.fillStyle = '#2a1f14'; ctx.font = `10px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`УБЕЖИЩЕ ${S.vault}`, sx + 2, sy - 49);
  // вырытые, но пустые места под лифтами — не нужны; тёмные ниши этажей
}

function drawOutside(t) {
  const gy = SURF + FH - 6;
  // пришедшие
  S.arrivals.forEach((d, i) => {
    const x = -34 - i * 24;
    drawDweller(d, x, gy, t, 1, null, true);
    if (i === 0) drawBadge(x, gy - 48 + Math.sin(t * 4) * 2, '!', '#f0b429');
  });
  // исследователи
  let k = 0;
  for (const d of S.dwellers) {
    if (d.st !== 'explore' || !d.ex) continue;
    const ex = d.ex;
    let x = null;
    if (ex.home) { x = -40 - (S.arrivals.length + k) * 24; k++; }
    else if (ex.back < 0 && ex.t < 7) x = -20 - ex.t * 34;
    else if (ex.back >= 0 && ex.back < 7) x = -20 - ex.back * 34;
    if (x === null) continue;
    const walking = !ex.home;
    d.face = ex.back >= 0 || ex.home ? 1 : -1;
    d.walk = walking ? t * 30 : 0;
    drawDweller(d, x, gy, t, 1, null, true);
    if (ex.home) drawBadge(x, gy - 48 + Math.sin(t * 4 + 1) * 2, 'bag', '#7ed957');
  }
}
function drawBadge(x, y, what, col) {
  const s = 1 / Math.max(0.6, Math.min(1.4, Cam.z));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1510';
  if (what === '!') { ctx.font = `14px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 1); }
  else { ctx.save(); ctx.translate(-7, -7); ctx.scale(14 / 24, 14 / 24); ctx.fill(icoPath(what), 'evenodd'); ctx.restore(); }
  ctx.restore();
}

// ===== Комнаты =====
function drawRoom(r, x, y, w, t) {
  const def = ROOMS[r.t];
  ctx.fillStyle = '#16120e';
  ctx.fillRect(x, y, w, FH);
  const ix = x + 2, iy = y + 3, iw = w - 4, ih = FH - 6;
  if (r.t === 'elev') { drawElevator(r, ix, iy, iw, ih, t); return; }
  const col = r.t === 'door' ? '#3b4147' : def.col;
  ctx.fillStyle = col;
  ctx.fillRect(ix, iy, iw, ih);
  // панели стены
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  for (let px = ix + 18; px < ix + iw; px += 30) ctx.fillRect(px, iy + 6, 2, ih - 14);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(ix, iy + ih * 0.55, iw, 2);
  // потолок и пол
  ctx.fillStyle = '#26221d'; ctx.fillRect(ix, iy, iw, 5);
  ctx.fillStyle = '#2d2822'; ctx.fillRect(ix, iy + ih - 7, iw, 7);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(ix, iy + ih - 7, iw, 1);
  // лампы
  if (!r.off && Cam.z > 0.4) {
    for (let lx = ix + 20; lx < ix + iw - 8; lx += 40) {
      ctx.fillStyle = 'rgba(255,230,160,.10)';
      ctx.beginPath(); ctx.moveTo(lx - 4, iy + 5); ctx.lineTo(lx + 4, iy + 5); ctx.lineTo(lx + 16, iy + ih - 8); ctx.lineTo(lx - 16, iy + ih - 8); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(lx - 4, iy + 4, 8, 2);
    }
  }
  if (Cam.z > 0.35) drawInterior(r, ix, iy, iw, ih, t);
  // разделители объединённых комнат
  if (r.s > 1) { ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < r.s; i++) ctx.fillRect(ix + i * 3 * CW - 3, iy + 5, 2, ih - 12); }
  // прогресс
  if (def && (def.kind === 'prod' || def.kind === 'radio') && r.w.length && !r.rdy) {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(ix + 4, iy + ih - 4, iw - 8, 2.5);
    ctx.fillStyle = def.kind === 'radio' ? '#c58af0' : RES_COL[def.res];
    ctx.fillRect(ix + 4, iy + ih - 4, (iw - 8) * clamp(r.p, 0, 1), 2.5);
  }
  if (def && def.kind === 'craft' && r.craft) {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(ix + 4, iy + ih - 4, iw - 8, 2.5);
    ctx.fillStyle = '#7ed957'; ctx.fillRect(ix + 4, iy + ih - 4, (iw - 8) * clamp(r.craft.p, 0, 1), 2.5);
  }
  if (r.t === 'door') drawDoorGear(r, ix, iy, ih, t);
  // выключено
  if (r.off) { ctx.fillStyle = 'rgba(5,8,12,.62)'; ctx.fillRect(ix, iy, iw, ih); }
  // происшествие
  const inc = incAt(r.id);
  if (inc && !(inc.ext && r.t === 'door' && r.hp > 0)) {
    ctx.fillStyle = inc.k === 'fire' ? `rgba(255,110,30,${0.18 + 0.08 * Math.sin(t * 9)})` : `rgba(220,40,30,${0.12 + 0.08 * Math.sin(t * 5)})`;
    ctx.fillRect(ix, iy, iw, ih);
  }
  // табличка
  if (Cam.z > 0.62 && r.t !== 'door') {
    ctx.font = `bold 9px ${FONT_B}`;
    const name = def.n.toUpperCase();
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(12,10,8,.72)';
    ctx.beginPath(); ctx.roundRect(ix + 3, iy + 7, tw + 26, 12, 2); ctx.fill();
    ctx.fillStyle = '#efe6cf'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(name, ix + 6, iy + 13.5);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < r.l ? '#f0b429' : 'rgba(255,255,255,.2)'; ctx.fillRect(ix + 9 + tw + i * 5, iy + 11, 3.5, 5); }
  }
}
function drawElevator(r, ix, iy, iw, ih, t) {
  ctx.fillStyle = '#1e1d1b'; ctx.fillRect(ix - 2, iy - 3, iw + 4, ih + 6);
  ctx.fillStyle = '#4a4d50'; ctx.fillRect(ix + 2, iy + 8, iw - 4, ih - 15);
  ctx.fillStyle = '#5c6064'; ctx.fillRect(ix + 3, iy + 9, (iw - 7) / 2, ih - 17); ctx.fillRect(ix + 4 + (iw - 7) / 2, iy + 9, (iw - 7) / 2, ih - 17);
  ctx.fillStyle = '#2b2c2e'; ctx.fillRect(ix + iw / 2 - 0.5, iy + 9, 1, ih - 17);
  ctx.fillStyle = r.off ? '#552' : (Math.floor(t * 1.5 + r.f) % 3 === 0 ? '#7ed957' : '#3c5a30');
  ctx.fillRect(ix + iw / 2 - 2, iy + 3, 4, 3);
  ctx.strokeStyle = '#2f2f2f'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ix + 2, iy - 3); ctx.lineTo(ix + 2, iy + ih + 3); ctx.moveTo(ix + iw - 2, iy - 3); ctx.lineTo(ix + iw - 2, iy + ih + 3); ctx.stroke();
}
function drawDoorGear(r, ix, iy, ih, t) {
  const cx = ix + 26, cy = iy + ih / 2 + 1, rad = ih * 0.46;
  const open = R.doorOpen > 0 ? Math.min(1, R.doorOpen) : 0;
  // проём
  ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(cx, cy, rad - 1, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(cx - open * 30, cy);
  ctx.rotate(open * -2 + (S.incs.some(i => i.ext && r.hp > 0) ? Math.sin(t * 30) * 0.03 : 0));
  ctx.fillStyle = '#8b8f8f';
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? rad * 0.9 : rad;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.fill();
  ctx.fillStyle = '#a3a7a5'; ctx.beginPath(); ctx.arc(0, 0, rad * 0.78, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8b73a'; ctx.beginPath(); ctx.arc(0, 0, rad * 0.62, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a5ea8'; ctx.beginPath(); ctx.arc(0, 0, rad * 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#f0c848'; ctx.font = `${Math.round(rad * 0.44)}px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(S.vault, 0, 1);
  ctx.restore();
  // прочность двери
  if (r.hp < DOOR_HP[r.l - 1]) {
    const w = 60, x = ix + 8, y = iy - 10;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = '#ef5b42'; ctx.fillRect(x, y, w * (r.hp / DOOR_HP[r.l - 1]), 5);
  }
}
function drawInterior(r, x, y, w, h, t) {
  const fy = y + h - 7; // уровень пола
  const T = r.t;
  const each = (step, fn) => { for (let px = x + step / 2; px < x + w - 4; px += step) fn(px); };
  const lit = !r.off;
  ctx.save();
  switch (T) {
    case 'power': case 'reactor':
      each(T === 'reactor' ? 60 : 40, px => {
        if (T === 'reactor') {
          ctx.fillStyle = '#3c4a3a'; ctx.fillRect(px - 14, fy - 38, 28, 38);
          ctx.fillStyle = lit ? `rgba(120,255,120,${0.5 + 0.3 * Math.sin(t * 3 + px)})` : '#223';
          ctx.fillRect(px - 8, fy - 32, 16, 26);
          ctx.fillStyle = '#222'; ctx.fillRect(px - 16, fy - 40, 32, 4);
        } else {
          ctx.fillStyle = '#6b6f6a'; ctx.beginPath(); ctx.roundRect(px - 11, fy - 30, 22, 30, 4); ctx.fill();
          ctx.fillStyle = '#3d403c'; for (let i = 0; i < 4; i++) ctx.fillRect(px - 11, fy - 26 + i * 6, 22, 2);
          ctx.fillStyle = lit ? '#f6c945' : '#554'; ctx.save(); ctx.translate(px - 6, fy - 34); ctx.scale(0.5, 0.5); ctx.fill(icoPath('power')); ctx.restore();
          if (lit && Math.sin(t * 7 + px) > 0.7) { ctx.strokeStyle = '#fff2a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 12, fy - 32); ctx.lineTo(px - 16, fy - 38); ctx.lineTo(px - 13, fy - 40); ctx.stroke(); }
        }
      });
      break;
    case 'diner': case 'garden':
      if (T === 'garden') {
        each(24, px => {
          ctx.fillStyle = '#4a3a28'; ctx.fillRect(px - 10, fy - 8, 20, 8);
          ctx.fillStyle = '#5fa04a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px - 6 + i * 6, fy - 12 - (i % 2) * 4, 4, 7, 0, 0, 7); ctx.fill(); }
          ctx.fillStyle = lit ? 'rgba(200,120,255,.18)' : 'transparent'; ctx.fillRect(px - 12, y + 6, 24, 4);
        });
      } else {
        ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x + 4, fy - 16, Math.min(46, w * 0.35), 16);
        ctx.fillStyle = '#c9c3b0'; ctx.fillRect(x + 4, fy - 18, Math.min(46, w * 0.35), 3);
        each(44, px => { if (px < x + 60) return; ctx.fillStyle = '#b53a2a'; ctx.fillRect(px - 10, fy - 12, 20, 3); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(px - 1, fy - 10, 2, 10); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.arc(px - 4, fy - 14, 2, 0, 7); ctx.fill(); });
      }
      break;
    case 'water': case 'purifier':
      each(T === 'purifier' ? 48 : 40, px => {
        ctx.fillStyle = '#7d8a90'; ctx.beginPath(); ctx.roundRect(px - 12, fy - 36, 24, 36, 6); ctx.fill();
        const lv = 0.5 + 0.2 * Math.sin(t * 0.8 + px * 0.1);
        ctx.fillStyle = lit ? '#3aa0d8' : '#2a4050'; ctx.fillRect(px - 9, fy - 4 - 28 * lv, 18, 28 * lv);
        ctx.fillStyle = '#546066'; ctx.fillRect(px + 12, fy - 26, 8, 3);
      });
      break;
    case 'living':
      each(40, px => {
        ctx.fillStyle = '#4a3322'; ctx.fillRect(px - 15, fy - 24, 30, 3); ctx.fillRect(px - 15, fy - 10, 30, 3);
        ctx.fillStyle = '#b8c4d0'; ctx.fillRect(px - 14, fy - 27, 28, 3); ctx.fillRect(px - 14, fy - 13, 28, 3);
        ctx.fillStyle = '#4a3322'; ctx.fillRect(px - 15, fy - 28, 2, 28); ctx.fillRect(px + 13, fy - 28, 2, 28);
      });
      ctx.fillStyle = '#8a3a3a'; ctx.fillRect(x + w / 2 - 20, fy - 2, 40, 2);
      break;
    case 'storage':
      each(30, px => {
        ctx.fillStyle = '#5a4a32'; ctx.fillRect(px - 12, fy - 34, 24, 2); ctx.fillRect(px - 12, fy - 18, 24, 2);
        ctx.fillStyle = '#8a6a3a'; ctx.fillRect(px - 10, fy - 30, 9, 12); ctx.fillRect(px + 1, fy - 28, 8, 10);
        ctx.fillStyle = '#6a7a5a'; ctx.fillRect(px - 9, fy - 14, 18, 14);
      });
      break;
    case 'medbay': case 'science':
      each(40, px => {
        if (T === 'medbay') {
          ctx.fillStyle = '#dcdcdc'; ctx.fillRect(px - 14, fy - 12, 28, 4); ctx.fillStyle = '#888'; ctx.fillRect(px - 13, fy - 8, 2, 8); ctx.fillRect(px + 11, fy - 8, 2, 8);
          ctx.fillStyle = '#ef6a5a'; ctx.save(); ctx.translate(px - 5, y + 14); ctx.scale(0.42, 0.42); ctx.fill(icoPath('stim')); ctx.restore();
        } else {
          ctx.fillStyle = '#6a6a6a'; ctx.fillRect(px - 15, fy - 14, 30, 3); ctx.fillRect(px - 13, fy - 11, 2, 11); ctx.fillRect(px + 11, fy - 11, 2, 11);
          ctx.fillStyle = lit ? `rgba(120,255,150,${0.6 + 0.3 * Math.sin(t * 4 + px)})` : '#355';
          ctx.beginPath(); ctx.moveTo(px - 8, fy - 14); ctx.lineTo(px - 2, fy - 14); ctx.lineTo(px - 5, fy - 24); ctx.fill();
          ctx.fillStyle = lit ? '#f09a3a' : '#553'; ctx.fillRect(px + 3, fy - 22, 5, 8);
        }
      });
      break;
    case 'overseer':
      ctx.fillStyle = '#5a3f2a'; ctx.fillRect(x + w / 2 - 22, fy - 14, 44, 14);
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(x + 10, y + 12, 28, 20); ctx.fillRect(x + w - 38, y + 12, 28, 20);
      ctx.fillStyle = lit ? '#4fe08a' : '#244'; ctx.fillRect(x + 12, y + 14, 24, 16); ctx.fillRect(x + w - 36, y + 14, 24, 16);
      ctx.fillStyle = '#f0b429'; ctx.fillRect(x + w / 2 - 1, y + 10, 2, 22); ctx.fillStyle = '#2a5ea8'; ctx.fillRect(x + w / 2 + 1, y + 10, 14, 9);
      break;
    case 'radio':
      each(40, px => { ctx.fillStyle = '#2d2d33'; ctx.fillRect(px - 14, fy - 20, 28, 20); ctx.fillStyle = lit ? '#f0b429' : '#443'; for (let i = 0; i < 4; i++) ctx.fillRect(px - 10 + i * 6, fy - 16, 3, 3); });
      if (lit && r.w.length) { ctx.fillStyle = `rgba(255,70,70,${0.6 + 0.4 * Math.sin(t * 3)})`; ctx.font = `bold 8px ${FONT_B}`; ctx.textAlign = 'right'; ctx.fillText('В ЭФИРЕ', x + w - 6, y + 14); }
      break;
    case 'wshop': case 'oshop':
      ctx.fillStyle = '#5a4630'; ctx.fillRect(x + 8, fy - 14, w - 16, 4);
      ctx.fillStyle = '#3a2e22'; ctx.fillRect(x + 12, fy - 10, 3, 10); ctx.fillRect(x + w - 15, fy - 10, 3, 10);
      if (T === 'wshop') { ctx.fillStyle = '#2a2a2a'; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + 20 + i * 30, y + 16); ctx.scale(0.8, 0.6); ctx.fill(icoPath('gun')); ctx.restore(); } }
      else { for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#b85a5a', '#5a7ab8', '#c9a93a'][i]; ctx.save(); ctx.translate(x + 20 + i * 32, y + 14); ctx.scale(0.8, 0.8); ctx.fill(icoPath('shirt')); ctx.restore(); } }
      break;
    case 'gym': each(40, px => { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(px - 14, fy - 20, 28, 2); ctx.fillStyle = '#555'; ctx.fillRect(px - 16, fy - 25, 5, 12); ctx.fillRect(px + 11, fy - 25, 5, 12); ctx.fillStyle = '#3a3a3a'; ctx.fillRect(px - 6, fy - 8, 12, 8); }); break;
    case 'athletic': each(40, px => { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(px - 16, fy - 5, 32, 5); ctx.fillStyle = '#666'; ctx.fillRect(px + 12, fy - 22, 3, 17); ctx.fillRect(px + 8, fy - 22, 8, 3); }); break;
    case 'armory': each(40, px => { ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(px + 8, fy - 24, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(px + 8, fy - 24, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(px + 8, fy - 24, 2, 0, 7); ctx.fill(); }); break;
    case 'classroom': ctx.fillStyle = '#243a2a'; ctx.fillRect(x + 10, y + 12, Math.min(70, w - 20), 22); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 16, y + 20); ctx.lineTo(x + 40, y + 20); ctx.moveTo(x + 16, y + 26); ctx.lineTo(x + 50, y + 26); ctx.stroke(); each(40, px => { if (px < x + 70) return; ctx.fillStyle = '#6a4a2a'; ctx.fillRect(px - 8, fy - 12, 16, 3); ctx.fillRect(px - 7, fy - 9, 2, 9); }); break;
    case 'fitness': each(40, px => { ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(px - 8, fy - 6, 6, 0, 7); ctx.arc(px + 8, fy - 6, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#777'; ctx.fillRect(px - 8, fy - 7, 16, 2); ctx.fillRect(px - 1, fy - 20, 2, 14); }); break;
    case 'lounge': each(44, px => { ctx.fillStyle = '#7a3a4a'; ctx.beginPath(); ctx.roundRect(px - 16, fy - 14, 32, 14, 4); ctx.fill(); ctx.fillStyle = '#8a4a5a'; ctx.fillRect(px - 16, fy - 20, 32, 7); }); break;
    case 'gameroom': each(44, px => { ctx.fillStyle = '#1f5a3a'; ctx.fillRect(px - 16, fy - 14, 32, 5); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px - 14, fy - 9, 3, 9); ctx.fillRect(px + 11, fy - 9, 3, 9); ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(px, fy - 16, 1.8, 0, 7); ctx.fill(); }); break;
    case 'cola': ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 6, fy - 12, w - 12, 5); for (let i = 0; i < w / 14; i++) { const bx = x + 8 + ((i * 14 + (lit ? t * 20 : 0)) % (w - 20)); ctx.fillStyle = '#ef5470'; ctx.fillRect(bx, fy - 20, 5, 8); } break;
  }
  ctx.restore();
}

// ===== Жители =====
function drawDweller(d, x, y, t, sc, r, outside) {
  const kid = d.child > 0;
  const s = (kid ? 0.66 : 1) * sc;
  const suit = d.outfit ? OUTFITS[d.outfit.id][3] : '#2f6db3';
  const dark = shade(suit, -0.35);
  const lp = Math.sin(d.walk * 0.32) * 3;
  const leg = Math.abs(d.tx - d.px) > 1 || outside ? lp : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((d.face || 1) * s, s);
  // тень
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 1.8, 0, 0, 7); ctx.fill();
  // ноги
  ctx.fillStyle = dark;
  ctx.fillRect(-4 + leg * 0.5, -10, 3, 9); ctx.fillRect(1 - leg * 0.5, -10, 3, 9);
  ctx.fillStyle = '#22190f';
  ctx.fillRect(-4.5 + leg * 0.5, -2, 4, 2); ctx.fillRect(0.5 - leg * 0.5, -2, 4, 2);
  // туловище
  ctx.fillStyle = suit;
  ctx.beginPath(); ctx.roundRect(-5, -21, 10, 12, 2.5); ctx.fill();
  if (!d.outfit) { ctx.fillStyle = '#f0c040'; ctx.fillRect(-0.8, -21, 1.6, 12); ctx.fillRect(-5, -11.5, 10, 1.4); }
  if (d.preg > 0) { ctx.fillStyle = suit; ctx.beginPath(); ctx.arc(3.6, -13, 4, 0, 7); ctx.fill(); }
  // руки
  const fight = d.fight > 0 && !kid;
  ctx.fillStyle = shade(suit, -0.15);
  if (fight) { ctx.fillRect(2, -19, 8, 2.6); }
  else { ctx.save(); ctx.translate(-4, -19); ctx.rotate(-leg * 0.08); ctx.fillRect(-1.5, 0, 2.6, 9); ctx.restore(); ctx.save(); ctx.translate(4, -19); ctx.rotate(leg * 0.08); ctx.fillRect(-1, 0, 2.6, 9); ctx.restore(); }
  // оружие
  if (fight && d.weapon) { ctx.fillStyle = '#1c1c1c'; ctx.fillRect(7, -21, 8, 2.6); ctx.fillRect(8, -19, 2, 3); if (Math.sin(t * 20 + d.id) > 0.6) { ctx.fillStyle = '#ffdf6a'; ctx.beginPath(); ctx.arc(16.5, -20, 2, 0, 7); ctx.fill(); } }
  // голова
  ctx.fillStyle = d.look.skin;
  ctx.beginPath(); ctx.arc(0.5, -26, 4.8, 0, 7); ctx.fill();
  ctx.fillStyle = d.look.hair;
  if (d.g === 'f') {
    ctx.beginPath(); ctx.arc(0, -27, 5.2, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillRect(-5.2, -27, 3.2, d.look.hs % 2 ? 9 : 6);
  } else {
    ctx.beginPath(); ctx.arc(0.3, -27.4, 5, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    if (d.look.hs === 3) ctx.fillRect(-5, -28, 2, 4);
  }
  ctx.fillStyle = '#1a1410'; ctx.fillRect(2.4, -27, 1.3, 1.5);
  if (d.hurt > 0) { ctx.fillStyle = 'rgba(255,40,30,.5)'; ctx.beginPath(); ctx.arc(0, -16, 12, 0, 7); ctx.fill(); }
  ctx.restore();
  if (d.hurt > 0) d.hurt -= 1 / 60;
  if (d.fight > 0) d.fight -= 1 / 60;
  if (outside || Cam.z < 0.45) return;
  // значки
  const iy = y - 36 * s - 6;
  if (d.lu) { ctx.save(); ctx.translate(x - 6, iy - 8 + Math.sin(t * 5 + d.id) * 2); ctx.scale(0.5, 0.5); ctx.fillStyle = '#7ed957'; ctx.fill(icoPath('up')); ctx.restore(); }
  else if (r && r.pair && (r.pair.m === d.id || r.pair.f === d.id)) {
    if (r.pair.ph === 0 && r.pair.m === d.id) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.roundRect(x - 2, iy - 8, 16, 9, 3); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(x + 1, iy - 4, 2, 2); ctx.fillRect(x + 5, iy - 4, 2, 2); ctx.fillRect(x + 9, iy - 4, 2, 2); }
    if (r.pair.ph === 1) { ctx.save(); ctx.translate(x - 4, iy - 6 + Math.sin(t * 6) * 2); ctx.scale(0.35, 0.35); ctx.fillStyle = '#ef5470'; ctx.fill(icoPath('heart')); ctx.restore(); }
  } else if (d.hp < effMax(d) * 0.4) {
    ctx.fillStyle = '#ef5b42'; ctx.fillRect(x - 1.2, iy - 5, 2.4, 7); ctx.fillRect(x - 3.5, iy - 2.7, 7, 2.4);
  }
  // полоса здоровья в бою
  if (r && incAt(r.id) && !kid) {
    const w = 14;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y - 38 * s, w, 2.5);
    ctx.fillStyle = d.hp / d.mhp > 0.4 ? '#7ed957' : '#ef5b42'; ctx.fillRect(x - w / 2, y - 38 * s, w * clamp(d.hp / d.mhp, 0, 1), 2.5);
    if (d.rad > 0) { ctx.fillStyle = '#c33'; ctx.fillRect(x + w / 2 - w * (d.rad / d.mhp), y - 38 * s, w * (d.rad / d.mhp), 2.5); }
  }
  if (R.selD === d.id) { ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 9, 2.6, 0, 0, 7); ctx.stroke(); }
}
function drawGrave(x, y) {
  ctx.fillStyle = '#8a8a86'; ctx.beginPath(); ctx.roundRect(x - 5, y - 13, 10, 13, [5, 5, 0, 0]); ctx.fill();
  ctx.fillStyle = '#3a3a38'; ctx.fillRect(x - 0.8, y - 11, 1.6, 7); ctx.fillRect(x - 3, y - 9, 6, 1.6);
}
function drawHearts(x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.8 + i / 3) % 1;
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(x - 6 + i * 6, y - p * 26); ctx.scale(0.4, 0.4); ctx.fillStyle = '#ef5470'; ctx.fill(icoPath('heart')); ctx.restore();
  }
}

// ===== Враги =====
function drawEnemies(inc, r, t) {
  const x0 = roomX(r) + 2, fy = roomY(r) + FH - 10;
  const e = ENEMY[inc.k];
  for (const en of inc.en) {
    if (en.hp <= 0) continue;
    const x = x0 + en.x;
    const hpk = en.hp / en.m;
    ctx.save();
    ctx.translate(x, fy + 3);
    const face = Math.cos(en.ph * 1.3 + en.tg) >= 0 ? 1 : -1;
    switch (inc.k) {
      case 'fire': {
        const hgt = 12 + 18 * hpk;
        for (let i = 0; i < 3; i++) {
          const fl = Math.sin(t * 12 + en.tg * 3 + i * 2) * 3;
          ctx.fillStyle = ['#d8431e', '#ff8a2a', '#ffd35a'][i];
          const k = 1 - i * 0.28;
          ctx.beginPath(); ctx.moveTo(-10 * k, 0); ctx.quadraticCurveTo(-9 * k, -hgt * 0.5 * k, fl, -hgt * k); ctx.quadraticCurveTo(9 * k, -hgt * 0.5 * k, 10 * k, 0); ctx.fill();
        }
        break;
      }
      case 'roach':
        ctx.scale(face, 1);
        ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1;
        ctx.beginPath(); for (let i = -1; i <= 1; i++) { const l = Math.sin(t * 20 + i) * 2; ctx.moveTo(i * 3, -2); ctx.lineTo(i * 3 + l, 1); } ctx.stroke();
        ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(0, -3, 6, 3.2, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(11, -8); ctx.stroke();
        break;
      case 'molerat':
        ctx.scale(face, 1);
        ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(0, -5, 10, 5, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10, -6, 5, 3.5, 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(13, -4, 1.5, 3);
        ctx.strokeStyle = e.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-17, -3 + Math.sin(t * 8) * 2); ctx.stroke();
        break;
      case 'scorp':
        ctx.scale(face, 1);
        ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(0, -6, 14, 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = e.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.quadraticCurveTo(-22, -26, -6, -28 + Math.sin(t * 5) * 2); ctx.stroke();
        ctx.fillStyle = '#c9e04a'; ctx.beginPath(); ctx.arc(-6, -28, 2.5, 0, 7); ctx.fill();
        ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(16, -8, 5, 3, -0.4, 0, 7); ctx.fill();
        break;
      case 'beast':
        ctx.scale(face, 1);
        ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(0, -14, 11, 14, 0, 0, 7); ctx.fill();
        ctx.fillRect(-8, -4, 5, 4); ctx.fillRect(3, -4, 5, 4);
        ctx.beginPath(); ctx.ellipse(7, -30, 7, 5, 0.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#d8d0b0'; ctx.beginPath(); ctx.moveTo(4, -34); ctx.lineTo(1, -42); ctx.lineTo(7, -35); ctx.fill();
        ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(18, -12 + Math.sin(t * 9) * 3); ctx.stroke();
        break;
      default: { // рейдеры и гули — гуманоиды
        const col = inc.k === 'ghoul' ? '#6a6a4a' : '#6a3326';
        const skin = inc.k === 'ghoul' ? '#9aa36a' : '#d8a07a';
        ctx.scale(face, 1);
        const lg = Math.sin(t * 8 + en.tg) * 2.5;
        ctx.fillStyle = '#2a2018'; ctx.fillRect(-4 + lg * 0.5, -10, 3, 10); ctx.fillRect(1 - lg * 0.5, -10, 3, 10);
        ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-5, -21, 10, 12, 2); ctx.fill();
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0.5, -26, 4.6, 0, 7); ctx.fill();
        if (inc.k === 'raider') { ctx.fillStyle = '#c33'; ctx.fillRect(-1, -33, 2, 5); ctx.fillStyle = '#1c1c1c'; ctx.fillRect(4, -20, 9, 2.5); }
        else { ctx.fillStyle = '#e8f080'; ctx.fillRect(2, -27, 1.5, 1.5); }
      }
    }
    ctx.restore();
    if (inc.k !== 'fire' && en.hp < en.m) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 8, fy - 40, 16, 2.5);
      ctx.fillStyle = '#ef5b42'; ctx.fillRect(x - 8, fy - 40, 16 * hpk, 2.5);
    }
  }
}

// ===== Роботы =====
function drawRobots(t) {
  for (const b of S.robots) {
    const y = SURF + b.f * FH + 28 + Math.sin(t * 3 + b.x) * 3;
    ctx.save(); ctx.translate(b.x, y);
    ctx.fillStyle = 'rgba(120,200,255,.35)'; ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.lineTo(0, 16 + Math.random() * 3); ctx.fill();
    ctx.fillStyle = '#9aa3a8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#6d777c'; ctx.fillRect(-9, -1, 18, 2);
    ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.arc(3 * b.dir, -2, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6d777c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-10, 10); ctx.moveTo(6, 5); ctx.lineTo(10, 10); ctx.stroke();
    ctx.restore();
  }
}

// ===== Пузыри готовности =====
function bubblePos(r) { return { x: roomX(r) + roomW(r) * CW / 2, y: roomY(r) + 20 }; }
function drawBubbles(t) {
  const s = 1 / clamp(Cam.z, 0.55, 1.3);
  for (const r of S.rooms) {
    let icon = null, col = null;
    if (r.rdy) { const def = ROOMS[r.t]; icon = RES_ICON[def.res]; col = RES_COL[def.res]; }
    else if (r.done) { icon = r.done.k === 'w' ? 'gun' : 'shirt'; col = RAR_COL[itemRar(r.done)]; }
    if (!icon) continue;
    const p = bubblePos(r);
    const by = p.y + Math.sin(t * 3 + r.id) * 2.5;
    ctx.save(); ctx.translate(p.x, by); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(10,12,14,.55)'; ctx.beginPath(); ctx.arc(0, 2, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
    ctx.translate(-9, -9); ctx.scale(0.75, 0.75); ctx.fillStyle = shade(col, -0.2); ctx.fill(icoPath(icon), 'evenodd');
    ctx.restore();
  }
}

// ===== Режим строительства =====
function drawPlacement(t) {
  const a = 0.35 + 0.2 * Math.sin(t * 4);
  const cost = buildCost(R.place);
  for (const sp of R.placeSpots) {
    const x = sp.c * CW, y = roomY(sp), w = sp.w * CW;
    ctx.fillStyle = `rgba(240,180,41,${a * 0.5})`;
    ctx.fillRect(x + 2, y + 3, w - 4, FH - 6);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 3, w - 4, FH - 6); ctx.setLineDash([]);
    ctx.fillStyle = '#fff5d8'; ctx.font = `${sp.w > 1 ? 22 : 16}px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', x + w / 2, y + FH / 2 - (sp.w > 1 ? 6 : 0));
    if (sp.w > 1) { ctx.font = `bold 10px ${FONT_B}`; ctx.fillText(`${fmt(cost)} кр.`, x + w / 2, y + FH / 2 + 14); }
  }
}

// ===== Частицы и всплывающий текст =====
function drawFx(t) {
  const dt = 1 / 60;
  for (let i = R.parts.length - 1; i >= 0; i--) {
    const p = R.parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.heart ? -10 : 160) * dt;
    if (p.t > p.life) { R.parts.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.col;
    if (p.heart) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s / 24, p.s / 24); ctx.fill(icoPath('heart')); ctx.restore(); }
    else ctx.fillRect(p.x, p.y, p.s, p.s);
  }
  ctx.globalAlpha = 1;
  const s = 1 / clamp(Cam.z, 0.55, 1.4);
  for (let i = R.floaters.length - 1; i >= 0; i--) {
    const f = R.floaters[i];
    f.t += dt;
    if (f.t > 1.4) { R.floaters.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = f.t > 1 ? (1.4 - f.t) / 0.4 : 1;
    ctx.translate(f.x, f.y - f.t * 26);
    ctx.scale(s, s);
    ctx.font = `14px ${FONT_D}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(f.text).width + (f.icon ? 16 : 0);
    ctx.translate(-tw / 2, 0);
    if (f.icon) { ctx.save(); ctx.translate(0, -7); ctx.scale(14 / 24, 14 / 24); ctx.fillStyle = f.col; ctx.fill(icoPath(f.icon), 'evenodd'); ctx.restore(); }
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,.8)'; ctx.strokeText(f.text, f.icon ? 16 : 0, 0);
    ctx.fillStyle = f.col; ctx.fillText(f.text, f.icon ? 16 : 0, 0);
    ctx.restore();
  }
  if (R.flash > 0) R.flash = Math.max(0, R.flash - dt);
  if (R.doorOpen > 0) R.doorOpen -= dt;
}

// Портрет жителя для карточки
function drawPortrait(canvas, d) {
  const g = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 96, h = canvas.clientHeight || 120;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const prev = ctx;
  ctx = g;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const sv = { walk: d.walk, face: d.face, tx: d.tx, px: d.px, fight: d.fight, hurt: d.hurt };
  d.walk = 0; d.face = 1; d.tx = d.px; d.fight = 0; d.hurt = 0;
  drawDweller(d, w / 2, h - 10, 0, 3.1, null, true);
  Object.assign(d, sv);
  ctx = prev;
}
