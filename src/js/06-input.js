// ===== Управление: перетаскивание, щипок, тап =====
const Ptr = { pts: new Map(), start: null, moved: false, pinch: null, vx: 0, vy: 0, lastT: 0, lastX: 0, lastY: 0, kin: false };

function initInput() {
  cv.addEventListener('pointerdown', e => {
    Snd.init();
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    Ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    Ptr.kin = false;
    if (Ptr.pts.size === 1) {
      Ptr.start = { x: e.clientX, y: e.clientY, cx: Cam.x, cy: Cam.y };
      Ptr.moved = false;
      Ptr.vx = Ptr.vy = 0;
      Ptr.lastT = performance.now(); Ptr.lastX = e.clientX; Ptr.lastY = e.clientY;
    } else if (Ptr.pts.size === 2) {
      const [a, b] = [...Ptr.pts.values()];
      Ptr.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: Cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      Ptr.moved = true;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!Ptr.pts.has(e.pointerId)) return;
    Ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!S) return;
    if (Ptr.pts.size === 1 && Ptr.start) {
      const dx = e.clientX - Ptr.start.x, dy = e.clientY - Ptr.start.y;
      if (!Ptr.moved && Math.hypot(dx, dy) > 9) Ptr.moved = true;
      if (Ptr.moved) {
        Cam.x = Ptr.start.cx - dx / Cam.z;
        Cam.y = Ptr.start.cy - dy / Cam.z;
        clampCam();
        const now = performance.now(), dtm = Math.max(1, now - Ptr.lastT);
        Ptr.vx = (e.clientX - Ptr.lastX) / dtm; Ptr.vy = (e.clientY - Ptr.lastY) / dtm;
        Ptr.lastT = now; Ptr.lastX = e.clientX; Ptr.lastY = e.clientY;
      }
    } else if (Ptr.pts.size === 2 && Ptr.pinch) {
      const [a, b] = [...Ptr.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, Ptr.pinch.z * (d / Math.max(10, Ptr.pinch.d)));
      Cam.x -= (mx - Ptr.pinch.mx) / Cam.z; Cam.y -= (my - Ptr.pinch.my) / Cam.z;
      Ptr.pinch.mx = mx; Ptr.pinch.my = my;
      clampCam();
    }
  });
  const up = e => {
    if (!Ptr.pts.has(e.pointerId)) return;
    const wasSingle = Ptr.pts.size === 1;
    Ptr.pts.delete(e.pointerId);
    if (Ptr.pts.size < 2) Ptr.pinch = null;
    if (Ptr.pts.size === 1) {
      const p = [...Ptr.pts.values()][0];
      Ptr.start = { x: p.x, y: p.y, cx: Cam.x, cy: Cam.y };
    }
    if (wasSingle && e.type === 'pointerup') {
      if (!Ptr.moved) onTap(e.clientX, e.clientY);
      else if (performance.now() - Ptr.lastT < 80) Ptr.kin = true;
    }
    if (!Ptr.pts.size) Ptr.start = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    if (!S) return;
    zoomAt(e.clientX, e.clientY, Cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!S || !R.playing || e.target.tagName === 'INPUT') return;
    const k = 40 / Cam.z;
    if (e.key === 'ArrowLeft') Cam.x -= k; else if (e.key === 'ArrowRight') Cam.x += k;
    else if (e.key === 'ArrowUp') Cam.y -= k; else if (e.key === 'ArrowDown') Cam.y += k;
    else if (e.key === '+' || e.key === '=') zoomAt(Cam.vw / 2, Cam.vh / 2, Cam.z * 1.15);
    else if (e.key === '-') zoomAt(Cam.vw / 2, Cam.vh / 2, Cam.z / 1.15);
    else if (e.key === 'Escape') { if (R.place) endPlace(); else UI.close(); }
    else return;
    clampCam();
  });
}
function kinetic(dt) {
  if (!Ptr.kin) return;
  Cam.x -= (Ptr.vx * 1000 * dt) / Cam.z;
  Cam.y -= (Ptr.vy * 1000 * dt) / Cam.z;
  const f = Math.pow(0.04, dt);
  Ptr.vx *= f; Ptr.vy *= f;
  clampCam();
  if (Math.hypot(Ptr.vx, Ptr.vy) < 0.02) Ptr.kin = false;
}

function onTap(sx, sy) {
  if (!S || !R.playing) return;
  const w = toWorld(sx, sy);
  if (R.place) {
    const sp = R.placeSpots.find(s => w.x >= s.c * CW && w.x <= (s.c + s.w) * CW && w.y >= roomY(s) && w.y <= roomY(s) + FH);
    if (sp) {
      const t = R.place;
      const r = buildRoom(t, sp.f, sp.c);
      endPlace();
      if (r && t !== 'elev') { R.selRoom = r.id; UI.open(roomView(r.id), true); revealAbove(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2); }
    } else toast('Нажмите на подсвеченное место', 'warn');
    return;
  }
  // пузыри ресурсов
  const bs = 1 / clamp(Cam.z, 0.55, 1.3);
  for (const r of S.rooms) {
    if (!r.rdy && !r.done) continue;
    const p = bubblePos(r);
    if (Math.hypot(w.x - p.x, w.y - p.y) < 20 * bs) { collectRoom(r); return; }
  }
  // улица: прибывшие и вернувшиеся
  const gy = SURF + FH - 6;
  if (w.x < 0 && w.y > gy - 60 && w.y < gy + 10) {
    let k = 0;
    for (const d of S.dwellers) {
      if (d.st !== 'explore' || !d.ex || !d.ex.home) continue;
      const x = -40 - (S.arrivals.length + k) * 24; k++;
      if (Math.abs(w.x - x) < 14) { collectExplorer(d); return; }
    }
    if (S.arrivals.length && w.x > -34 - S.arrivals.length * 24 - 14) { UI.open(arrivalsView()); return; }
  }
  // жители
  let best = null, bd = 1e9;
  const tol = 6 / Cam.z;
  for (const d of S.dwellers) {
    if (d.hide) continue;
    const p = dwellerWorldPos(d);
    if (!p) continue;
    const h = (d.child ? 22 : 32);
    if (w.x > p.x - 8 - tol && w.x < p.x + 8 + tol && w.y > p.y - h - tol && w.y < p.y + 4) {
      const dd = Math.abs(w.x - p.x);
      if (dd < bd) { bd = dd; best = d; }
    }
  }
  if (best) {
    if (best.st === 'dead') UI.open(deadView(best.id));
    else if (best.lu) levelUp(best);
    else { R.selD = best.id; UI.open(dwellerView(best.id)); const p = dwellerWorldPos(best); if (p) revealAbove(p.x, p.y - 16); }
    return;
  }
  // комнаты
  const f = Math.floor((w.y - SURF) / FH), c = Math.floor(w.x / CW);
  const r = at(f, c);
  if (r && r.t !== 'elev') {
    R.selRoom = r.id;
    UI.open(roomView(r.id), true);
    revealAbove(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2);
    return;
  }
  UI.close();
}

function startPlace(t) {
  if (!unlocked(t)) { toast(`Откроется при ${ROOMS[t].pop} жителях`, 'warn'); return; }
  if (t !== 'elev' && ROOMS[t].unique && hasType(t)) { toast('Такая комната уже построена', 'warn'); return; }
  if (S.res.caps < buildCost(t)) { toast('Не хватает крышек', 'bad'); Snd.bad(); return; }
  R.place = t;
  R.placeSpots = spotsFor(t);
  UI.close();
  if (!R.placeSpots.length) { toast('Нет доступных мест. Постройте лифт вниз', 'warn'); R.place = null; return; }
  const b = document.getElementById('place');
  b.hidden = false;
  b.querySelector('b').textContent = t === 'elev' ? 'Лифт' : ROOMS[t].n;
  b.querySelector('small').textContent = `${fmt(buildCost(t))} крышек · нажмите на подсвеченное место`;
  // показать ближайшее место
  const sp = R.placeSpots[0];
  const vis = R.placeSpots.some(s => { const x = s.c * CW, y = roomY(s); return x > Cam.x && x < Cam.x + Cam.vw / Cam.z && y > Cam.y && y < Cam.y + Cam.vh / Cam.z; });
  if (!vis) centerOn(sp.c * CW + sp.w * CW / 2, roomY(sp) + FH / 2);
}
function endPlace() {
  R.place = null;
  R.placeSpots = [];
  document.getElementById('place').hidden = true;
}
