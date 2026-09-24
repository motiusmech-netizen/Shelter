// ===== Запуск и главный цикл =====
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}
let lastT = 0, hudT = 0, uiT = 0, cloudT = 0, hiddenAt = 0;
const MENU_DUST = [];

function renderMenu(t) {
  const w = Cam.vw, h = Cam.vh;
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  if (!ART.rockC) { ctx.fillStyle = '#050805'; ctx.fillRect(0, 0, w, h); return; }
  updateWorldCache();
  const st = WORLD.st;
  const hz = h * 0.64;
  ctx.fillStyle = vgrad(ctx, 0, hz, [st.top, st.mid, st.hor]);
  ctx.fillRect(0, 0, w, hz + 2);
  if (st.stars > 0.02) {
    for (const [sx, sy, sz, ph] of WORLD.stars) { ctx.globalAlpha = st.stars * (0.5 + 0.5 * Math.sin(t * 1.5 + ph)); ctx.fillStyle = '#fff'; ctx.fillRect(sx * w, sy * hz * 0.8, sz, sz); }
    ctx.globalAlpha = 1;
  }
  // солнце / луна
  const day = st.h >= 5.8 && st.h <= 19.8;
  const sx = w * 0.74, sy = hz - h * 0.2;
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.35);
  gl.addColorStop(0, rgba(st.sun, day ? 0.6 : 0.25)); gl.addColorStop(0.25, rgba(st.sun, day ? 0.18 : 0.08)); gl.addColorStop(1, rgba(st.sun, 0));
  ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = day ? mixc(st.sun, '#ffffff', 0.5) : '#eef2ff'; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 7); ctx.fill();
  // облака
  for (const cl of WORLD.clouds) {
    const x = ((cl.x + t * cl.v * 2) % (w + 600) + w + 600) % (w + 600) - 300;
    ctx.drawImage(cl.c, x, hz * 0.2 + cl.y * 0.6 + 60, cl.w * 1.2, cl.h * 1.2);
  }
  // слои гор и руин
  for (const [name, sp, k, dy] of [['far', 4, 1.1, 0.02], ['mid', 9, 1.5, 0.07]]) {
    const L = WORLD.layers[name];
    if (!L) continue;
    const sc = (h * 0.32 * k) / L.LH;
    const lw = L.LW * sc;
    const ox = -((t * sp) % (lw - w));
    ctx.drawImage(L.c, ox - lw * 0.1, hz - L.base * sc + h * dy, lw, L.LH * sc);
  }
  // скала
  if (!ART.menuRock) { ART.menuRock = ctx.createPattern(ART.rockC, 'repeat'); try { ART.menuRock.setTransform(new DOMMatrix().scale(0.7)); } catch (e) {} }
  const top = hz + h * 0.05;
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 18) ctx.lineTo(x, top + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.07 + 1) * 4 - Math.max(0, 40 - Math.abs(x - w / 2) * 0.2));
  ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = ART.menuRock; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = vgrad(ctx, top - 20, h, [rgba(st.tint, 0.1), 'rgba(0,0,0,.25)', 'rgba(0,0,0,.75)']); ctx.fillRect(0, top - 40, w, h);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = st.tint; ctx.fillRect(0, top - 40, w, h); ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  ctx.strokeStyle = rgba(day ? '#ffd8a0' : '#8aa0d0', 0.45); ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= w + 20; x += 18) { const y = top + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.07 + 1) * 4 - Math.max(0, 40 - Math.abs(x - w / 2) * 0.2); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  // гермодверь
  const r = Math.min(w * 0.36, h * 0.2), cx = w / 2, cy = h - r * 0.72;
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, 7); ctx.fill();
  ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#4a4c48'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, 7); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 1.22, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = r * 0.06; ctx.strokeStyle = '#e8b422'; ctx.setLineDash([r * 0.12, r * 0.12]); ctx.stroke(); ctx.restore();
  const zz = Cam.z; Cam.z = 1;
  drawGearDoor(ctx, cx, cy, r, t * 0.06, S ? S.vault : '042');
  Cam.z = zz;
  // лучи света
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.28 + Math.sin(t * 0.3 + i) * 0.03;
    const len = h * 0.7;
    const g2 = ctx.createLinearGradient(cx, cy - r, cx + Math.cos(a) * len, cy - r + Math.sin(a) * len);
    g2.addColorStop(0, 'rgba(255,220,140,.14)'); g2.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.9); ctx.lineTo(cx + Math.cos(a - 0.06) * len, cy - r + Math.sin(a - 0.06) * len); ctx.lineTo(cx + Math.cos(a + 0.06) * len, cy - r + Math.sin(a + 0.06) * len); ctx.lineTo(cx + r * 0.2, cy - r * 0.9); ctx.fill();
  }
  for (const bx of [cx - r * 1.35, cx + r * 1.35]) {
    const on = Math.sin(t * 3 + bx) > 0;
    const g3 = ctx.createRadialGradient(bx, cy - r * 0.6, 0, bx, cy - r * 0.6, r * 0.5);
    g3.addColorStop(0, `rgba(255,180,40,${on ? 0.55 : 0.1})`); g3.addColorStop(1, 'rgba(255,180,40,0)');
    ctx.fillStyle = g3; ctx.fillRect(bx - r * 0.5, cy - r * 1.1, r, r);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const bx of [cx - r * 1.35, cx + r * 1.35]) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(bx - 5, cy - r * 0.6 - 7, 10, 14); ctx.fillStyle = Math.sin(t * 3 + bx) > 0 ? '#ffc24a' : '#6a4a10'; ctx.fillRect(bx - 3, cy - r * 0.6 - 5, 6, 10); }
  // пыль
  if (!MENU_DUST.length) for (let i = 0; i < 70; i++) MENU_DUST.push({ x: rnd(), y: rnd(), s: rf(0.6, 2.2), v: rf(0.004, 0.02) });
  ctx.fillStyle = day ? 'rgba(255,230,190,.45)' : 'rgba(200,215,255,.35)';
  for (const p of MENU_DUST) { p.x += p.v / 60; if (p.x > 1) p.x = 0; ctx.fillRect(p.x * w, p.y * h + Math.sin(t + p.y * 10) * 6, p.s, p.s); }
  // виньетка
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.hypot(w, h) * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}

function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
  lastT = now;
  if (R.playing && S) {
    if (!R.paused) {
      sim(dt);
      R.saveT += dt;
      cloudT += dt;
      if (R.saveT > 15) { R.saveT = 0; const c = cloudT > 60; if (c) cloudT = 0; saveGame(c); }
    }
    kinetic(dt);
    render(now);
    hudT += dt;
    if (hudT > 0.1) { hudT = 0; updateHud(); }
    uiT += dt;
    if (uiT > 0.5) { uiT = 0; UI.tick(); }
  } else {
    renderMenu(now / 1000);
  }
  requestAnimationFrame(frame);
}

function onVisibility() {
  if (document.hidden) {
    hiddenAt = Date.now();
    if (R.playing) saveGame(true);
    pauseGame(true, 'hidden');
  } else {
    pauseGame(false, 'hidden');
    if (R.playing && S && hiddenAt) {
      const away = clamp((Date.now() - hiddenAt) / 1000, 0, 7200);
      if (away > 15) { simOffline(away); if (R.offlineReport && away > 60) { const o = R.offlineReport; toast(`Пока вас не было (${fmtTime(o.sec)}): крышки ${o.caps >= 0 ? '+' : ''}${fmt(o.caps)}`, 'good'); } R.offlineReport = null; }
    }
    hiddenAt = 0;
  }
}

async function boot() {
  cv = document.getElementById('cv');
  ctx = cv.getContext('2d');
  try { Snd.on = localStorage.getItem('atom_shelter_sound') !== '0'; } catch (e) {}
  document.querySelectorAll('[data-ic]').forEach(el => el.insertAdjacentHTML('afterbegin', svg(el.dataset.ic)));
  initHud();
  initInput();
  initUiEvents();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => { if (R.playing) saveGame(true); });
  resize();
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load(`600 14px ${FONT_D}`), document.fonts.load(`700 14px ${FONT_D}`), document.fonts.load(`500 14px ${FONT_M}`), document.fonts.load(`600 14px ${FONT_M}`), document.fonts.load(`400 14px ${FONT_B}`), document.fonts.load(`600 14px ${FONT_B}`)]).catch(() => {})
    : Promise.resolve();
  await Promise.all([YA.init(), Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))])]);
  makeTextures();
  document.getElementById('loading').hidden = true;
  YA.ready();
  showMainMenu();
  if (R.hotSave) {
    try { loadGame(R.hotSave); startPlaying(); } catch (e) { showMainMenu(); }
    R.hotSave = null;
  }
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
// хук для автотестов
window.__shelterIcons = ICON;
window.__shelter = { get S() { return S; }, R, Cam, UI, ART, WORLD, sim, simOffline, ACT, newGame, startPlaying, buildRoom, spotsFor, spawnArrival, acceptArrival, startIncident, startRaid, spawnStranger, genPet, RM, D, assign, upgradeRoom, roomView, craftView, questsView, centerOn, drawHuman, dwellerParams, genDweller, CHR, outfitLook };
// предпросмотр в веб-обёртке: состояние переживает обновление страницы
const HOT = window.claude && window.claude.hot;
try { if (HOT && HOT.snapshot) HOT.snapshot(() => (S && R.playing ? { save: serialize() } : {})); } catch (e) {}
function start(data) {
  if (data && data.save) { try { R.hotSave = JSON.parse(data.save); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}
if (HOT && HOT.ready) HOT.ready(start); else start((HOT && HOT.data) || {});
