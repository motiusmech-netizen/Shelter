// ===== Запуск и главный цикл =====
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}
let lastT = 0, hudT = 0, uiT = 0, cloudT = 0, hiddenAt = 0;
const MENU_DUST = [];

function renderMenu(t) {
  const w = Cam.vw, h = Cam.vh;
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#111a21'); g.addColorStop(0.5, '#3f3a36'); g.addColorStop(0.72, '#a86e40'); g.addColorStop(1, '#2a1f18');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const hy = h * 0.7;
  ctx.fillStyle = 'rgba(255,220,160,.16)'; ctx.beginPath(); ctx.arc(w * 0.78, hy - 40, 90, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,180,.55)'; ctx.beginPath(); ctx.arc(w * 0.78, hy - 40, 26, 0, 7); ctx.fill();
  ctx.fillStyle = '#5e4a3a';
  ctx.beginPath(); ctx.moveTo(0, hy);
  for (let x = 0; x <= w + 40; x += 40) ctx.lineTo(x, hy - 40 - 30 * Math.abs(Math.sin(x * 0.011)) - 12 * Math.sin(x * 0.037));
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.fillStyle = rockPat || '#3a2b20';
  ctx.fillRect(0, hy, w, h - hy);
  ctx.fillStyle = '#6b5236'; ctx.fillRect(0, hy - 3, w, 6);
  // дверь-шестерня
  const r = Math.min(w, h) * 0.34, cx = w / 2, cy = hy + r * 0.62;
  ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.05);
  ctx.fillStyle = '#7f8484';
  ctx.beginPath();
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, rr = i % 2 ? r * 0.91 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.fill();
  ctx.fillStyle = '#9ea3a1'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0ae34'; ctx.beginPath(); ctx.arc(0, 0, r * 0.64, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a5ea8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, 7); ctx.fill();
  ctx.restore();
  // пыль
  if (!MENU_DUST.length) for (let i = 0; i < 40; i++) MENU_DUST.push({ x: rnd(), y: rnd(), s: rf(0.5, 2), v: rf(0.005, 0.02) });
  ctx.fillStyle = 'rgba(255,225,180,.35)';
  for (const p of MENU_DUST) {
    p.x += p.v / 60; if (p.x > 1) p.x = 0;
    ctx.fillRect(p.x * w, p.y * h * 0.8 + Math.sin(t + p.y * 10) * 6, p.s, p.s);
  }
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
    ? Promise.all([document.fonts.load(`14px ${FONT_D}`), document.fonts.load(`bold 14px ${FONT_B}`), document.fonts.load(`14px ${FONT_B}`)]).catch(() => {})
    : Promise.resolve();
  await Promise.all([YA.init(), Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))])]);
  makePatterns();
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
window.__shelter = { get S() { return S; }, R, Cam, UI, sim, simOffline, ACT, newGame, startPlaying, buildRoom, spotsFor, spawnArrival, acceptArrival, startIncident, startRaid, RM, D, assign, upgradeRoom, roomView, craftView, questsView, centerOn };
// предпросмотр в веб-обёртке: состояние переживает обновление страницы
const HOT = window.claude && window.claude.hot;
try { if (HOT && HOT.snapshot) HOT.snapshot(() => (S && R.playing ? { save: serialize() } : {})); } catch (e) {}
function start(data) {
  if (data && data.save) { try { R.hotSave = JSON.parse(data.save); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}
if (HOT && HOT.ready) HOT.ready(start); else start((HOT && HOT.data) || {});
