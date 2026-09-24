// ===== Камера и сборка кадра =====
const Cam = { x: -140, y: 40, z: 1, vw: 1, vh: 1, dpr: 1, top: 0, bot: 0 };
let cv, ctx;

function resize() {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  Cam.dpr = dpr;
  Cam.vw = cv.clientWidth || window.innerWidth;
  Cam.vh = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(Cam.vw * dpr);
  cv.height = Math.round(Cam.vh * dpr);
  const hud = document.getElementById('hud'), bar = document.getElementById('bar');
  Cam.top = hud && !hud.closest('[hidden]') ? hud.getBoundingClientRect().bottom : 0;
  Cam.bot = bar && !bar.closest('[hidden]') ? Cam.vh - bar.getBoundingClientRect().top : 0;
  document.documentElement.style.setProperty('--hud-h', Math.round(Cam.top) + 'px');
  if (S) clampCam();
}
function worldBounds() {
  return { x0: -OUTW, x1: GW * CW + 60, y0: SURF - 330, y1: SURF + Math.min(MAXF, (S ? maxFloor() : 1) + 2) * FH + 30 };
}
function minZoom() { const b = worldBounds(); const visH = Cam.vh - Cam.top - Cam.bot; return clamp(Math.max(Cam.vw / (b.x1 - b.x0), 0.8 * visH / (b.y1 - b.y0)), 0.3, 0.7); }
function clampCam() {
  const b = worldBounds();
  Cam.z = clamp(Cam.z, minZoom(), 2.8);
  const vw = Cam.vw / Cam.z, vh = Cam.vh / Cam.z;
  const t = Cam.top / Cam.z, bt = Math.max(Cam.bot, R.sheetH || 0) / Cam.z;
  const xmin = b.x0, xmax = b.x1 - vw;
  Cam.x = xmax < xmin ? (b.x0 + b.x1 - vw) / 2 : clamp(Cam.x, xmin, xmax);
  const ymin = b.y0 - t, ymax = b.y1 + bt - vh;
  Cam.y = ymax < ymin ? ymin : clamp(Cam.y, ymin, ymax);
}
function zoomAt(sx, sy, nz) {
  const wx = Cam.x + sx / Cam.z, wy = Cam.y + sy / Cam.z;
  Cam.z = clamp(nz, minZoom(), 2.8);
  Cam.x = wx - sx / Cam.z;
  Cam.y = wy - sy / Cam.z;
  clampCam();
}
function centerOn(wx, wy, z) {
  if (z) Cam.z = clamp(z, minZoom(), 2.8);
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
  if (sy > bottom - 10 || sy < top) { Cam.y = wy - ((top + bottom) / 2) / Cam.z; clampCam(); }
}
function toWorld(sx, sy) { return { x: Cam.x + sx / Cam.z, y: Cam.y + sy / Cam.z }; }
function setW() { const z = Cam.z * Cam.dpr; ctx.setTransform(z, 0, 0, z, -Cam.x * z, -Cam.y * z); }

// ===== Эффекты =====
function floatText(x, y, text, col, icon) { if (R.offline) return; R.floaters.push({ x, y, text, col, icon, t: 0 }); }
function floatHeart(x, y) { for (let i = 0; i < 7; i++) R.parts.push({ x: x + rf(-10, 10), y, vx: rf(-8, 8), vy: rf(-30, -15), t: 0, life: 1.8, col: '#ff5a7a', heart: true, s: rf(5, 8) }); }
function sparks(x, y, col, n) {
  if (R.offline) return;
  for (let i = 0; i < n; i++) R.parts.push({ x, y, vx: rf(-80, 80), vy: rf(-110, 10), t: 0, life: rf(0.5, 1.2), col, s: rf(1.2, 3), ember: true });
}
function tracer(x1, y1, x2, y2, col) { if (!R.offline) R.tracers.push({ x1, y1, x2, y2, col, t: 0 }); }

// ===== Кадр =====
let artT = 0;
function render(time) {
  const t = time / 1000;
  // масштаб запекания с гистерезисом
  const s = Cam.z * Cam.dpr;
  const want = s < 1.05 ? 1 : s < 2.1 ? 2 : 3;
  if (want !== ART.k && (want > ART.k || s < ART.k - 0.35)) { ART.k = want; ART.cache.clear(); WORLD.key = -1; }
  updateWorldCache();
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  ctx.fillStyle = '#16100b';
  ctx.fillRect(0, 0, Cam.vw, Cam.vh);
  if (!S) return;
  const view = { x0: Cam.x - 30, y0: Cam.y - 30, x1: Cam.x + Cam.vw / Cam.z + 30, y1: Cam.y + Cam.vh / Cam.z + 30 };
  drawSky(t);
  drawLayers(t, view);
  drawRock(view);
  drawForeground();
  drawSurfaceFx(t);
  setW();
  // комнаты
  const vis = [];
  for (const r of S.rooms) {
    const x = roomX(r), y = roomY(r), w = roomW(r) * CW;
    if (x > view.x1 || x + w < view.x0 || y > view.y1 || y + FH < view.y0) continue;
    vis.push(r);
    const a = artFor(r);
    ctx.drawImage(a.cv, x - a.pad, y - a.pad, a.W + a.pad * 2, a.H + a.pad * 2);
  }
  for (const r of vis) roomDynamic(r, t);
  drawCars(t);
  drawActors(t, view);
  for (const r of vis) roomOverlay(r, t);
  drawRobots(t);
  drawSynergyLinks(vis, t);
  drawTrader(t);
  drawLabels(vis);
  drawBubbles(t);
  if (R.place) drawPlacement(t);
  if (R.selRoom) {
    const r = RM(R.selRoom);
    if (r) {
      const a = 0.55 + 0.3 * Math.sin(t * 4);
      ctx.strokeStyle = `rgba(255,200,80,${a})`; ctx.lineWidth = 2.4 / Cam.z;
      ctx.strokeRect(roomX(r) + 1, roomY(r) + 1, roomW(r) * CW - 2, FH - 2);
      ctx.strokeStyle = `rgba(255,200,80,${a * 0.3})`; ctx.lineWidth = 6 / Cam.z;
      ctx.strokeRect(roomX(r) - 1, roomY(r) - 1, roomW(r) * CW + 2, FH + 2);
    }
  }
  drawFx(t);
  // постобработка
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!R.vign || R.vign.width !== cv.width || R.vign.height !== cv.height) {
    R.vign = mkCanvas(cv.width, cv.height);
    const g = R.vign.getContext('2d');
    const W2 = cv.width, H2 = cv.height;
    const vg = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.45, W2 / 2, H2 / 2, Math.hypot(W2, H2) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = vg; g.fillRect(0, 0, W2, H2);
  }
  ctx.drawImage(R.vign, 0, 0);
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  if (S.incs.length) {
    const a = 0.08 + 0.07 * Math.sin(t * 5) + R.flash * 0.25;
    const g = ctx.createRadialGradient(Cam.vw / 2, Cam.vh / 2, Math.min(Cam.vw, Cam.vh) * 0.35, Cam.vw / 2, Cam.vh / 2, Math.max(Cam.vw, Cam.vh) * 0.75);
    g.addColorStop(0, 'rgba(220,30,20,0)'); g.addColorStop(1, `rgba(220,30,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, Cam.vw, Cam.vh);
  }
}

// ===== Живые детали комнат =====
function roomDynamic(r, t) {
  const x = roomX(r), y = roomY(r);
  if (r.t === 'door') { drawDoor(r, x, y, t); }
  if (r.off || Cam.z < 0.42) return;
  const a = artFor(r);
  const active = r.w.length > 0 && !incAt(r.id);
  ctx.save(); ctx.translate(x, y);
  for (const an of a.anc) {
    switch (an.k) {
      case 'coil': case 'core': {
        const p = active ? 0.5 + 0.5 * Math.sin(t * (an.k === 'core' ? 2.2 : 5) + an.x) : 0.15;
        ctx.globalCompositeOperation = 'lighter';
        const col = an.k === 'core' ? '120,255,90' : '255,200,80';
        const g = ctx.createRadialGradient(an.x, an.y, 0, an.x, an.y, an.r);
        g.addColorStop(0, `rgba(${col},${0.35 * p})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(an.x - an.r, an.y - an.r, an.r * 2, an.r * 2);
        ctx.globalCompositeOperation = 'source-over';
        if (active && an.k === 'coil' && Math.sin(t * 13 + an.x * 3) > 0.93) {
          ctx.strokeStyle = 'rgba(220,240,255,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(an.x - 10, an.y - 14);
          for (let i = 0; i < 4; i++) ctx.lineTo(an.x - 10 + i * 6 + rf(-2, 2), an.y - 18 + rf(-3, 3));
          ctx.stroke();
        }
        break;
      }
      case 'screen':
        if (Math.sin(t * 7 + an.x * 5) > 0.6) { ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(an.x, an.y, an.w, an.h); }
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(an.x, an.y + ((t * 6 + an.x) % an.h), an.w, 0.5);
        break;
      case 'blink':
        if (Math.sin(t * 3 + an.ph) > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(an.col, 0.6); ctx.beginPath(); ctx.arc(an.x, an.y, 2, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        break;
      case 'bubbles':
        ctx.fillStyle = 'rgba(220,245,255,.55)';
        for (let i = 0; i < 5; i++) { const p = (t * 0.45 + i / 5 + an.x * 0.01) % 1; ctx.beginPath(); ctx.arc(an.x + ((i * 37) % an.w) + Math.sin(t * 3 + i) * 1.2, an.y + an.h - p * an.h, 0.6 + (i % 3) * 0.35, 0, 7); ctx.fill(); }
        break;
      case 'steam':
        for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; ctx.fillStyle = `rgba(240,240,240,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(an.x + Math.sin(p * 6 + i) * 2, an.y - p * 12, 1.5 + p * 3, 0, 7); ctx.fill(); }
        break;
      case 'ecg': {
        ctx.strokeStyle = '#6aff8a'; ctx.lineWidth = 0.5; ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const u = i / 16, ph = (u * 2 + t * 1.2) % 1; const yy = an.y + an.h / 2 - (ph > 0.45 && ph < 0.55 ? (ph < 0.5 ? 2.4 : -1.4) : 0); if (!i) ctx.moveTo(an.x + u * an.w, yy); else ctx.lineTo(an.x + u * an.w, yy); }
        ctx.stroke();
        break;
      }
      case 'reels':
        ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 0.5;
        for (let i = 0; i < 2; i++) { const a2 = t * (active ? 4 : 0.2) * (i ? -1 : 1); ctx.beginPath(); ctx.moveTo(an.x + i * 6, an.y); ctx.lineTo(an.x + i * 6 + Math.cos(a2) * 2.2, an.y + Math.sin(a2) * 2.2); ctx.stroke(); }
        break;
      case 'vu':
        for (let i = 0; i < 5; i++) { const h = active ? (0.3 + 0.7 * Math.abs(Math.sin(t * (5 + i) + i))) * (an.h - 1) : 1; ctx.fillStyle = i > 3 ? '#ff5a3a' : '#2a1a08'; ctx.fillRect(an.x + 1 + i * 2.6, an.y + an.h - h, 1.8, h); }
        break;
      case 'onair': {
        const on = active && Math.sin(t * 2.5) > -0.6;
        ctx.fillStyle = on ? '#ff3a2a' : '#4a1a16';
        ctx.font = `700 4.8px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('В ЭФИРЕ', an.x + an.w / 2, an.y + an.h / 2 + 0.3);
        if (on) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(an.x + an.w / 2, an.y + 3, 0, an.x + an.w / 2, an.y + 3, 16); g.addColorStop(0, 'rgba(255,60,40,.35)'); g.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g; ctx.fillRect(an.x - 8, an.y - 13, an.w + 16, 32); ctx.globalCompositeOperation = 'source-over'; }
        break;
      }
      case 'spark':
        if (active && Math.sin(t * 9) > 0.2) { for (let i = 0; i < 3; i++) { ctx.fillStyle = i ? '#ffd84a' : '#ffffff'; ctx.fillRect(an.x + rf(-3, 3), an.y + rf(-4, 1), 0.8, 0.8); } ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(an.x, an.y, 0, an.x, an.y, 9); g.addColorStop(0, 'rgba(160,200,255,.5)'); g.addColorStop(1, 'rgba(160,200,255,0)'); ctx.fillStyle = g; ctx.fillRect(an.x - 9, an.y - 9, 18, 18); ctx.globalCompositeOperation = 'source-over'; }
        break;
      case 'glow': {
        const p = 0.5 + 0.5 * Math.sin(t * 3 + an.ph);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(an.x, an.y, 0, an.x, an.y, an.r);
        g.addColorStop(0, rgba(an.col, 0.3 * p)); g.addColorStop(1, rgba(an.col, 0));
        ctx.fillStyle = g; ctx.fillRect(an.x - an.r, an.y - an.r, an.r * 2, an.r * 2);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'belt':
        for (let i = 0; i < 6; i++) { const bx = an.x + ((i * (an.w / 6) + (active ? t * 12 : 0)) % an.w); ctx.fillStyle = '#6a1a20'; rr(ctx, bx, an.y - 5, 3, 6, 1); ctx.fill(); ctx.fillStyle = '#e8e0d0'; ctx.fillRect(bx + 0.5, an.y - 3, 2, 1.4); }
        break;
    }
  }
  ctx.restore();
}
// Поверх жителей: аварийный свет, тревога, прогресс
function roomOverlay(r, t) {
  if (r.t === 'elev') return;
  const x = roomX(r), y = roomY(r), w = roomW(r) * CW;
  const ix = x + 6, iy = y + 6, iw = w - 12, ih = FH - 13;
  if (r.off) {
    ctx.fillStyle = 'rgba(4,6,14,.74)'; ctx.fillRect(ix, iy, iw, ih);
    const on = Math.sin(t * 4 + r.id) > 0;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + w / 2, iy + 3, 0, x + w / 2, iy + 3, ih);
    g.addColorStop(0, `rgba(255,40,30,${on ? 0.4 : 0.12})`); g.addColorStop(1, 'rgba(255,40,30,0)');
    ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = on ? '#ff4a3a' : '#5a1a14'; ctx.beginPath(); ctx.arc(x + w / 2, iy + 2.5, 1.8, 0, 7); ctx.fill();
  }
  const inc = incAt(r.id);
  if (inc && !(inc.ext && r.t === 'door' && r.hp > 0)) {
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    if (inc.k === 'fire') {
      ctx.fillStyle = `rgba(255,110,30,${0.14 + 0.08 * Math.sin(t * 17) + 0.05 * Math.sin(t * 29)})`; ctx.fillRect(ix, iy, iw, ih);
    }
    // вращающийся маячок
    const bx = x + w / 2, by = iy + 3, a = t * 5;
    ctx.fillStyle = 'rgba(255,40,20,.22)';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, ih * 1.6, a, a + 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, ih * 1.6, a + Math.PI, a + Math.PI + 0.5); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff3a1a'; ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  const def = ROOMS[r.t];
  if (def && (def.kind === 'prod' || def.kind === 'radio') && r.w.length && !r.rdy && !r.off) {
    const col = def.kind === 'radio' ? '#c58af0' : RES_COL[def.res];
    drawProgress(x + 12, y + FH - 7.2, w - 24, r.p, col, t);
  }
  if (def && def.kind === 'craft' && r.craft) {
    drawProgress(x + 12, y + FH - 7.2, w - 24, r.craft.p, '#7dff95', t);
  }
}
function drawLabels(vis) {
  if (Cam.z < 0.62) return;
  const k = Math.min(4, Math.max(1, Math.ceil(Cam.z * Cam.dpr)));
  for (const r of vis) {
    if (r.t === 'elev' || r.t === 'door') continue;
    const c = roomPlate(r, k);
    ctx.drawImage(c, roomX(r) + 8, roomY(r) + 8, c._w, c._h);
  }
}
function drawDoor(r, x, y, t) {
  // дверь-шестерня: засовы уходят в раму, дверь выдвигается и откатывается по рельсу вправо
  const near = S.dwellers.some(d => (d.st === 'vault' || d.leaving) && d.fy < 0.5 && d.x > -70 && d.x < 60 && (d.path && d.path.length)) || (S.incs.some(i => i.ext && r.hp <= 0 && i.room === r.id));
  const tgt = near || R.doorHold > 0 ? 1 : 0;
  const dt = clamp(t - (R.doorT ?? t), 0, 0.1); R.doorT = t;
  R.doorOpen = clamp((R.doorOpen || 0) + clamp(tgt - (R.doorOpen || 0), -0.7 * dt, 0.7 * dt), 0, 1);
  const o = R.doorOpen;
  if (o > 0.02 && o < 0.98 && Math.abs(tgt - o) > 0.01 && !R.doorSnd) { R.doorSnd = true; Snd.door(); }
  if (o <= 0.02 || o >= 0.98) R.doorSnd = false;
  const breach = S.incs.some(i => i.ext && i.room === r.id && r.hp > 0);
  const cx = x + 40, cy = y + 42.5;
  const shake = breach ? Math.sin(t * 38) * 0.7 : 0;
  const kk = Math.min(4, Math.max(1, Math.ceil(Cam.z * Cam.dpr)));
  // свет с поверхности на полу комнаты
  if (o > 0.05) {
    const st = WORLD.st, ex = st ? mixc(st.hor, '#ffffff', 0.3) : '#fff0c8';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx + 10, y + 71); ctx.scale(1, 0.22);
    const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, 60);
    gr.addColorStop(0, rgba(ex, 0.3 * o)); gr.addColorStop(1, rgba(ex, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); ctx.fill();
    ctx.restore();
  }
  // рычаг крепится к оси двери сзади: рисуем до двери
  const p1 = smooth01(clamp(o / 0.22, 0, 1)), p2 = smooth01(clamp((o - 0.22) / 0.78, 0, 1));
  const hubX = cx + 72 * p2 + shake;
  ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, DOOR_W * CW - 4, FH - 4); ctx.clip();
  drawVaultDoor(ctx, cx, cy, o, t, { k: kk, lvl: r.l, num: S.vault, shake, roll: 72, arm: () => drawPiston(ctx, x + 132, y + 12, hubX, cy) });
  ctx.restore();
  // проблесковые маячки
  if (o > 0.02 || breach) {
    const col = breach ? '255,60,40' : '255,184,40';
    ctx.save(); ctx.beginPath(); ctx.rect(x + 6, y + 6, DOOR_W * CW - 12, FH - 13); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (const [bx, ph] of [[x + 90, 0], [x + 150, 1.6]]) {
      const a = t * 5 + ph, by = y + 9;
      const sw = Math.cos(a);
      const beam = ctx.createRadialGradient(bx, by, 0, bx, by, 70);
      beam.addColorStop(0, `rgba(${col},.32)`); beam.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 70, Math.PI * 0.5 + sw * 1.1 - 0.28, Math.PI * 0.5 + sw * 1.1 + 0.28); ctx.closePath(); ctx.fill();
      const core = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
      core.addColorStop(0, `rgba(${col},${0.6 + 0.4 * Math.abs(Math.sin(a))})`); core.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  for (const bx of [x + 90, x + 150]) {
    ctx.fillStyle = '#2a2d30'; rr(ctx, bx - 3, y + 6, 6, 2, 0.6); ctx.fill();
    ctx.fillStyle = breach ? '#ff5a3a' : o > 0.02 ? '#ffc23a' : '#8a6a2a'; ctx.beginPath(); ctx.arc(bx, y + 9, 2, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(bx - 0.6, y + 8.2, 0.6, 0, 7); ctx.fill();
  }
  if (breach && Math.random() < 0.12) sparks(cx - 30 + rf(-2, 2), cy + rf(-20, 20), '#ffc24a', 3);
  // прочность двери
  const mx = doorMaxHp(r);
  if (r.hp < mx) {
    const bx = x + 8, by = y - 8, w = 64, n = 12, k = clamp(r.hp / mx, 0, 1);
    ctx.fillStyle = 'rgba(6,8,7,.85)'; rr(ctx, bx - 1.5, by - 1.5, w + 3, 5.4, 2.2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 0.4; rr(ctx, bx - 1.5, by - 1.5, w + 3, 5.4, 2.2); ctx.stroke();
    const col = k > 0.35 ? '#ffc24a' : '#ff4a3a';
    for (let i = 0; i < n; i++) { ctx.fillStyle = (i + 0.5) / n <= k ? col : 'rgba(255,255,255,.08)'; ctx.fillRect(bx + i * (w / n) + 0.3, by, w / n - 0.8, 2.4); }
  }
}
// ===== Лифты =====
function drawCars(t) {
  const riding = new Set();
  for (const d of S.dwellers) {
    if (!d.inElev || (d.st !== 'vault' && !d.leaving)) continue;
    const c = Math.floor(d.x / CW);
    riding.add(c);
    const y = SURF + d.fy * FH;
    drawCar(c * CW + CW / 2, y, t, true);
    R.carF[c] = d.fy;
  }
  for (const r of S.rooms) {
    if (r.t !== 'elev' || riding.has(r.c)) continue;
    const f = R.carF[r.c];
    const parked = f == null ? r.f === Math.min(...S.rooms.filter(e => e.t === 'elev' && e.c === r.c).map(e => e.f)) : Math.round(f) === r.f;
    if (parked) drawCar(r.c * CW + CW / 2, roomY(r), t, !r.off);
  }
}

// ===== Персонажи =====
function poseOf(d, r, inc) {
  if (d.inElev) return 'idle';
  const fighting = inc && !d.child && !d.preg && !(inc.ext && r.t === 'door' && r.hp > 0 && false);
  if (d.path && d.path.length) return inc || d.leaving ? 'run' : 'walk';
  if (inc && (d.child || d.preg)) return 'run';
  if (fighting && inc.en.some(e => e.hp > 0)) {
    if (inc.k === 'fire') return 'work';
    const wk = d.weapon ? WEAPONS[d.weapon.id][4] : null;
    return !wk || wk === 'bat' || wk === 'knife' ? 'melee' : 'fight';
  }
  if (Math.abs(d.tx - d.x) > 1) return 'walk';
  if (r && r.pair && (r.pair.m === d.id || r.pair.f === d.id)) return r.pair.ph === 1 ? 'dance' : 'talk';
  if (R.say && R.say.id === d.id) return 'talk';
  const def = r && ROOMS[r.t];
  if (def && r.w.includes(d.id) && !r.off) {
    if (def.kind === 'train') return 'exercise';
    if ((def.kind === 'prod' || def.kind === 'radio') && !r.rdy) return 'work';
    if (def.kind === 'craft' && r.craft) return 'work';
  }
  return 'idle';
}
function drawActors(t, view) {
  const lod = Cam.z > 0.4;
  // жители в убежище
  for (const d of S.dwellers) {
    if (d.st === 'dead' && d.deadIn === 'vault') { const p = dwellerWorldPos(d); if (p) drawGrave(p.x, p.y); continue; }
    const inside = d.st === 'vault' || (d.leaving && d.st !== 'dead');
    if (!inside || d.hide) continue;
    const p = dwellerWorldPos(d);
    if (!p || p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y - 50 > view.y1) continue;
    const r = p.r;
    const inc = r ? incAt(r.id) : null;
    const pose = poseOf(d, r, inc);
    // питомец
    if (d.pet && lod) {
      if (d.petX == null) d.petX = p.x - d.face * 12;
      const tx = p.x - (d.face || 1) * 13;
      const dx = tx - d.petX;
      d.petX += dx * 0.08;
      const moving = Math.abs(dx) > 1.5;
      if (!d.inElev) drawPet(ctx, d.pet, d.petX, p.y, moving ? Math.sign(dx) : (d.face || 1), moving, t);
    }
    drawDwellerAt(d, p.x, p.y, t, pose);
    if (!lod) continue;
    // значки над головой
    const top = p.y - (d.child ? 30 : 46);
    if (d.lu) {
      const by = top - 8 + Math.sin(t * 5 + d.id) * 1.6;
      drawMedal(p.x, by, 'up', '#3fcf62', 0.42 / clamp(Cam.z, 0.7, 1.4));
    } else if (d.hp < effMax(d) * 0.4) {
      ctx.fillStyle = '#ff5a4a'; ctx.fillRect(p.x - 1.2, top - 7, 2.4, 7); ctx.fillRect(p.x - 3.5, top - 4.7, 7, 2.4);
    }
    if (inc && !d.child) {
      const w = 16, hy = p.y - (d.child ? 30 : 44);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p.x - w / 2, hy, w, 2.6);
      ctx.fillStyle = d.hp / d.mhp > 0.4 ? '#7dff95' : '#ff5a4a'; ctx.fillRect(p.x - w / 2, hy, w * clamp(d.hp / d.mhp, 0, 1), 2.6);
      if (d.rad > 0) { ctx.fillStyle = '#d23a2a'; ctx.fillRect(p.x + w / 2 - w * (d.rad / d.mhp), hy, w * (d.rad / d.mhp), 2.6); }
    }
    if (R.selD === d.id) {
      ctx.strokeStyle = 'rgba(255,200,80,.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 11, 3, 0, 0, 7); ctx.stroke();
    }
  }
  // речь
  if (R.say && Cam.z > 0.8) {
    const d = D(R.say.id);
    const p = d && d.st === 'vault' ? dwellerWorldPos(d) : null;
    if (p) {
      ctx.font = `500 7px ${FONT_B}`;
      const tw = Math.min(110, ctx.measureText(R.say.text).width);
      const bx = p.x - tw / 2 - 5, by = p.y - 64;
      ctx.fillStyle = 'rgba(250,246,232,.95)'; rr(ctx, bx, by, tw + 10, 12, 4); ctx.fill();
      poly(ctx, [p.x - 3, by + 11.5, p.x + 3, by + 11.5, p.x, by + 16]); ctx.fill();
      ctx.fillStyle = '#2a2016'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(R.say.text, p.x, by + 6.3, 110);
    }
  }
  // враги
  for (const inc of S.incs) {
    const r = RM(inc.room);
    if (!r) continue;
    const x0 = roomX(r), fy = roomY(r) + FEET;
    for (const en of inc.en) {
      if (en.hp <= 0) continue;
      const x = x0 + en.x;
      if (inc.k === 'fire') drawFire(en, x, fy + 1, t, en.hp / en.m);
      else drawEnemy(inc, en, x, fy, t);
      if (inc.k !== 'fire' && en.hp < en.m) {
        const hy = fy - (inc.k === 'beast' ? 62 : inc.k === 'scorp' ? 40 : inc.k === 'raider' || inc.k === 'ghoul' ? 46 : 18);
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 9, hy, 18, 2.6);
        ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x - 9, hy, 18 * (en.hp / en.m), 2.6);
      }
    }
  }
  // незнакомец
  if (R.stranger) {
    const s = R.stranger, r = RM(s.room);
    if (r) { const a = clamp(Math.min(s.t, s.life - s.t) / 0.8, 0, 1) * 0.92; drawStranger(roomX(r) + s.x, roomY(r) + FEET, t, a); }
  }
  // улица: прибывшие и вернувшиеся
  const gy = GROUND_Y;
  S.arrivals.forEach((d, i) => {
    const x = PORTAL.x0 - 22 - i * 22;
    d.face = 1;
    drawDwellerAt(d, x, gy, t, 'idle');
    if (i === 0) drawBadge(x, gy - 58 + Math.sin(t * 4) * 2, '!', '#ffc24a');
  });
  let k = 0;
  for (const d of S.dwellers) {
    if (d.st !== 'explore' || !d.ex || d.leaving) continue;
    const ex = d.ex;
    let x = null, pose = 'walk';
    if (ex.home) { x = PORTAL.x0 - 30 - (S.arrivals.length + k) * 22; k++; pose = 'idle'; d.face = 1; }
    else if (ex.back >= 0 && ex.back < 8) { x = PORTAL.x0 - 20 - ex.back * 34; d.face = 1; d.walk = t * 30; }
    else if (ex.back < 0 && ex.t < 8 && ex.outT != null && S.time - ex.outT < 8) { x = PORTAL.x0 - 20 - (S.time - ex.outT) * 34; d.face = -1; d.walk = t * 30; }
    if (x === null) continue;
    drawDwellerAt(d, x, gy, t, pose);
    if (d.pet) drawPet(ctx, d.pet, x - d.face * 13, gy, d.face, pose === 'walk', t);
    if (ex.home) drawBadge(x, gy - 58 + Math.sin(t * 4 + 1) * 2, 'bag', '#7dff95');
  }
}
// ===== торговец с повозкой =====
const TRADER_X = PORTAL.x0 - 118;
function drawTrader(t) {
  if (!S.trader) return;
  const g = ctx, x = TRADER_X, y = GROUND_Y;
  // повозка
  g.save(); g.translate(x - 26, y);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 1, 30, 3, 0, 0, 7); g.fill();
  g.strokeStyle = '#2a1c10'; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(18, -10); g.lineTo(36, -4); g.stroke();
  g.fillStyle = vgrad(g, -24, -8, ['#9a6a3a', '#6a4424', '#4a2e18']); rr(g, -24, -24, 44, 15, 1.5); g.fill();
  g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = -20; i < 20; i += 8) g.fillRect(i, -24, 0.8, 15);
  g.strokeStyle = '#3a2412'; g.lineWidth = 0.8; rr(g, -24, -24, 44, 15, 1.5); g.stroke();
  // тент
  g.fillStyle = vgrad(g, -48, -22, ['#e8dcbc', '#c8b48a', '#9a8662']);
  g.beginPath(); g.moveTo(-24, -22); g.bezierCurveTo(-24, -52, 20, -52, 20, -22); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(80,60,30,.6)'; g.lineWidth = 0.7;
  for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(-2 + k * 44, -23); g.quadraticCurveTo(-2 + k * 30, -46, -2 + k * 10, -45); g.stroke(); }
  g.fillStyle = '#b8412f'; g.fillRect(-24, -30, 44, 2.2);
  // ящики и бочка
  crate(g, -14, -24, 10, 8, '#8a6a3a'); crate(g, -3, -24, 9, 6, '#6a7a4a');
  // колёса
  for (const wx of [-15, 11]) {
    g.fillStyle = '#2a1c10'; g.beginPath(); g.arc(wx, -7, 7.4, 0, 7); g.fill();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.4; g.beginPath(); g.arc(wx, -7, 6, 0, 7); g.stroke();
    g.lineWidth = 0.9; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(wx, -7); g.lineTo(wx + Math.cos(a) * 6, -7 + Math.sin(a) * 6); g.stroke(); }
    g.fillStyle = '#c8a060'; g.beginPath(); g.arc(wx, -7, 1.3, 0, 7); g.fill();
  }
  // фонарь
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(20, -34); g.lineTo(24, -34); g.lineTo(24, -30); g.stroke();
  g.fillStyle = '#ffd88a'; rr(g, 22.3, -30, 3.4, 4.6, 1); g.fill();
  g.globalCompositeOperation = 'lighter';
  const lg = g.createRadialGradient(24, -28, 0, 24, -28, 26); lg.addColorStop(0, `rgba(255,190,90,${0.45 + 0.08 * Math.sin(t * 7)})`); lg.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = lg; g.beginPath(); g.arc(24, -28, 26, 0, 7); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.restore();
  drawHuman(ctx, traderParams(x + 22, y, t, 1));
  if (Cam.z > 0.45) drawBadge(x + 22, y - 62 + Math.sin(t * 3) * 2, 'bag', '#c8a050');
}
// значки соседства на стенах между комнатами
function drawSynergyLinks(vis, t) {
  if (Cam.z < 0.55) return;
  const s = 0.34 / clamp(Cam.z, 0.7, 1.4);
  const seen = new Set();
  for (const r of vis) {
    if (!ROOMS[r.t]) continue;
    const syn = synergy(r);
    for (const x of syn.list) {
      const key = Math.min(r.id, x.id) + ':' + Math.max(r.id, x.id);
      if (seen.has(key)) continue; seen.add(key);
      const n = RM(x.id); if (!n) continue;
      let bx, by;
      if (n.f === r.f) { bx = n.c > r.c ? roomX(n) : roomX(r); by = roomY(r) + FH * 0.42; }
      else { const c0 = Math.max(r.c, n.c), c1 = Math.min(r.c + roomW(r), n.c + roomW(n)); bx = (c0 + c1) / 2 * CW; by = Math.max(roomY(r), roomY(n)); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(bx, by, 0, bx, by, 16); gl.addColorStop(0, `rgba(255,200,80,${0.35 + 0.15 * Math.sin(t * 3 + r.id)})`); gl.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 7); ctx.fill(); ctx.restore();
      drawMedal(bx, by, 'star', '#e8a820', s, { tail: false });
    }
  }
}
function drawBadge(x, y, what, col) {
  const s = 0.82 / Math.max(0.6, Math.min(1.4, Cam.z));
  if (what === '!') drawMedal(x, y, 'x', col, s, { text: '!' });
  else drawMedal(x, y, what, col, s);
}
function drawGrave(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = vgrad(ctx, y - 15, y, ['#a8a8a2', '#6a6a66']); rr(ctx, x - 5.5, y - 15, 11, 15, 5); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = '#3a3a38'; ctx.fillRect(x - 0.8, y - 12, 1.6, 7); ctx.fillRect(x - 3, y - 10, 6, 1.6);
}

// ===== Роботы =====
function drawRobots(t) {
  for (const b of S.robots) {
    const y = SURF + b.f * FH + 34 + Math.sin(t * 3 + b.x) * 3;
    ctx.save(); ctx.translate(b.x, y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 12, 0, 0, 12, 10); g.addColorStop(0, 'rgba(120,200,255,.6)'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-10, 2, 20, 20);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = vgrad(ctx, -9, 9, ['#dfe4e6', '#8a9296', '#4a5256']); ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#5a6266'; ctx.fillRect(-9.5, -1, 19, 2);
    for (const a of [-0.4, 0, 0.4]) { ctx.fillStyle = '#1a1e20'; ctx.beginPath(); ctx.arc(Math.sin(a) * 6 * b.dir, -3 - Math.cos(a) * 3, 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#7dff95'; ctx.beginPath(); ctx.arc(Math.sin(a) * 6 * b.dir, -3 - Math.cos(a) * 3, 0.9, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#6d777c'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-11, 11 + Math.sin(t * 4) * 2); ctx.moveTo(6, 5); ctx.lineTo(11, 11 - Math.sin(t * 4) * 2); ctx.moveTo(0, 8); ctx.lineTo(0, 13); ctx.stroke();
    ctx.restore();
  }
}

// ===== Пузыри готовности =====
function bubblePos(r) { return { x: roomX(r) + roomW(r) * CW / 2, y: roomY(r) + 36 }; }
function drawBubbles(t) {
  const s = 1 / clamp(Cam.z, 0.55, 1.3);
  for (const r of S.rooms) {
    let icon = null, col = null;
    if (r.rdy) { const def = ROOMS[r.t]; icon = RES_ICON[def.res]; col = RES_COL[def.res]; }
    else if (r.done) { icon = r.done.k === 'w' ? 'gun' : 'shirt'; col = RAR_COL[itemRar(r.done)]; }
    if (!icon) continue;
    const p = bubblePos(r);
    const ph = t * 3 + r.id;
    const by = p.y + Math.sin(ph) * 2.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(p.x, by, 6 * s, p.x, by, 28 * s); gl.addColorStop(0, rgba(col, 0.3 + 0.12 * Math.sin(t * 4))); gl.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, by, 28 * s, 0, 7); ctx.fill();
    ctx.restore();
    const sq = 1 + Math.max(0, Math.sin(ph * 2)) * 0.04;
    drawMedal(p.x, by, icon, col, s * sq);
  }
}
// ===== Режим строительства =====
function drawPlacement(t) {
  const a = 0.5 + 0.25 * Math.sin(t * 4);
  const cost = buildCost(R.place);
  const ghost = R.place === 'elev' ? artFor({ t: 'elev' }) : artFor({ t: R.place, s: 1, l: 1 });
  for (const sp of R.placeSpots) {
    const x = sp.c * CW, y = roomY(sp), w = sp.w * CW;
    ctx.globalAlpha = 0.42;
    ctx.drawImage(ghost.cv, x - ghost.pad, y - ghost.pad, ghost.W + ghost.pad * 2, ghost.H + ghost.pad * 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,190,60,${a * 0.22})`; ctx.fillRect(x + 2, y + 2, w - 4, FH - 4);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = `rgba(255,200,80,${0.6 + a * 0.4})`; ctx.lineWidth = 2 / Math.max(0.6, Cam.z); ctx.strokeRect(x + 2, y + 2, w - 4, FH - 4); ctx.setLineDash([]);
    const s = 1 / clamp(Cam.z, 0.6, 1.3);
    ctx.save(); ctx.translate(x + w / 2, y + FH / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(10,12,10,.8)'; ctx.beginPath(); ctx.arc(0, sp.w > 1 ? -6 : 0, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffc24a'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#ffc24a'; ctx.font = `700 16px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, (sp.w > 1 ? -6 : 0) + 0.5);
    if (sp.w > 1) { ctx.font = `600 10px ${FONT_D}`; ctx.fillStyle = '#fff2d0'; ctx.fillText(`${fmt(cost)}`, 0, 14); }
    ctx.restore();
  }
}

// ===== Частицы и всплывающий текст =====
function drawFx(t) {
  const dt = 1 / 60;
  for (let i = R.tracers.length - 1; i >= 0; i--) {
    const tr = R.tracers[i];
    tr.t += dt;
    if (tr.t > 0.09) { R.tracers.splice(i, 1); continue; }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(tr.col, 1 - tr.t / 0.09); ctx.lineWidth = tr.col === '#ffe08a' ? 0.8 : 1.6;
    ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = R.parts.length - 1; i >= 0; i--) {
    const p = R.parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.heart ? -10 : p.smoke ? -5 : 160) * dt;
    if (p.t > p.life) { R.parts.splice(i, 1); continue; }
    const k = 1 - p.t / p.life;
    if (p.heart) { ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s / 24, p.s / 24); ctx.fill(icoPath('heart')); ctx.restore(); }
    else if (p.smoke) { ctx.globalAlpha = k * 0.8; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.6 - k * 0.6), 0, 7); ctx.fill(); }
    else { ctx.globalAlpha = k; ctx.globalCompositeOperation = p.ember ? 'lighter' : 'source-over'; ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.globalAlpha = 1;
  const s = 1 / clamp(Cam.z, 0.55, 1.4);
  for (let i = R.floaters.length - 1; i >= 0; i--) {
    const f = R.floaters[i];
    f.t += dt;
    if (f.t > 1.5) { R.floaters.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = f.t > 1.1 ? (1.5 - f.t) / 0.4 : Math.min(1, f.t * 6);
    const pop = f.t < 0.15 ? 0.7 + f.t * 2 : 1;
    ctx.translate(f.x, f.y - f.t * 28);
    ctx.scale(s * pop, s * pop);
    ctx.font = `700 15px ${FONT_D}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(f.text).width + (f.icon ? 18 : 0);
    ctx.translate(-tw / 2, 0);
    if (f.icon) { ctx.save(); ctx.translate(0, -8); ctx.scale(15 / 24, 15 / 24); ctx.fillStyle = f.col; ctx.strokeStyle = 'rgba(10,8,6,.85)'; ctx.lineWidth = 4; ctx.stroke(icoPath(f.icon)); ctx.fill(icoPath(f.icon)); ctx.restore(); }
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(10,8,6,.85)'; ctx.strokeText(f.text, f.icon ? 18 : 0, 0);
    ctx.fillStyle = f.col; ctx.fillText(f.text, f.icon ? 18 : 0, 0);
    ctx.restore();
  }
  if (R.flash > 0) R.flash = Math.max(0, R.flash - dt);
  if (R.doorHold > 0) R.doorHold -= dt;
}

// Портрет жителя для карточки
function drawPortrait(canvas, d) {
  // живой портрет: персонаж дышит и моргает, пока карточка открыта
  canvas._d = d;
  if (canvas._loop) return;
  canvas._loop = true;
  const tick = () => {
    if (!canvas.isConnected) { canvas._loop = false; return; }
    paintPortrait(canvas, canvas._d);
    requestAnimationFrame(tick);
  };
  tick();
}
function paintPortrait(canvas, d) {
  const g = canvas.getContext('2d');
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 104, h = canvas.clientHeight || 128;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = performance.now() / 1000;
  // фон: стена убежища, прожектор сверху
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#26343a'); bg.addColorStop(0.72, '#18232a'); bg.addColorStop(0.73, '#2a2622'); bg.addColorStop(1, '#141210');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 14; y < h * 0.72; y += 18) g.fillRect(0, y, w, 1);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 15; y < h * 0.72; y += 18) g.fillRect(0, y, w, 1);
  g.globalCompositeOperation = 'lighter';
  const sp = g.createRadialGradient(w / 2, -10, 4, w / 2, h * 0.4, h * 0.75);
  sp.addColorStop(0, 'rgba(255,226,170,.42)'); sp.addColorStop(1, 'rgba(255,226,170,0)');
  g.fillStyle = sp; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  if (d.pet) { const T = PET_TYPES.find(p => p.id === d.pet.type); if (T && T.k !== 'bird') drawPet(g, d.pet, w * 0.2, h - 10, 1, false, t, 2.0); }
  const P = dwellerParams(d, w / 2 + 2, h - 9, t, 'idle', 2.25);
  P.face = 1;
  drawHuman(g, P);
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
}
