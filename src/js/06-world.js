// ===== Мир: небо, время суток, поверхность, порода =====
const TOD = [
  // час, верх неба, середина, горизонт, солнце, тон пейзажа, звёзды
  [0, '#050914', '#0b142b', '#1b2440', '#cfe0ff', '#27324f', 1],
  [4.6, '#060a18', '#111a36', '#252c4a', '#cfe0ff', '#2c3756', 1],
  [6.0, '#243058', '#80546a', '#ee9a68', '#ffb070', '#8c7482', 0.2],
  [7.5, '#3f6e9c', '#98a8b4', '#f0c890', '#ffe0a8', '#e8d4c0', 0],
  [12, '#4e84b2', '#a6bfc6', '#eedaaf', '#fff8e0', '#ffffff', 0],
  [16.5, '#4a79a4', '#aab8b6', '#f2cb8c', '#ffe6b0', '#fff0dc', 0],
  [18.4, '#2b3462', '#b05f6c', '#ffa65c', '#ffb066', '#e2a48c', 0],
  [19.8, '#141a3a', '#4b3a5c', '#a4574a', '#ff9a6a', '#7a6680', 0.4],
  [21.3, '#070b1b', '#111932', '#232a46', '#cfe0ff', '#303c5c', 1],
  [24, '#050914', '#0b142b', '#1b2440', '#cfe0ff', '#27324f', 1],
];
const WORLD = { tod: 12, key: -1, sky: null, layers: {}, fg: null, fgK: 0, clouds: [], dust: [], birds: [] };
function todHour() {
  const mode = (S && S.todMode) || 'auto';
  if (mode === 'day') return 12;
  if (mode === 'dusk') return 18.6;
  if (mode === 'night') return 23;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
function todState(h) {
  let i = 0;
  while (i < TOD.length - 2 && TOD[i + 1][0] <= h) i++;
  const a = TOD[i], b = TOD[i + 1];
  const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  return { top: mixc(a[1], b[1], t), mid: mixc(a[2], b[2], t), hor: mixc(a[3], b[3], t), sun: mixc(a[4], b[4], t), tint: mixc(a[5], b[5], t), stars: a[6] + (b[6] - a[6]) * t, h };
}
function isNight(st) { return st.stars > 0.5; }
function mulc(a, b) { const x = rgb(a), y = rgb(b); const c = i => Math.round(x[i] * y[i] / 255).toString(16).padStart(2, '0'); return '#' + c(0) + c(1) + c(2); }

// ---------- рельеф ----------
function hillY(x) {
  return SURF - 74 + 9 * Math.sin(x * 0.011) + 6 * Math.sin(x * 0.029 + 1) + 2.5 * Math.sin(x * 0.083 + 2);
}
const PORTAL = { x0: -74, x1: 0 };
const GROUND_Y = SURF + FEET;

function cliffPath(g) {
  const b = worldBounds();
  g.beginPath();
  g.moveTo(b.x0 - 600, GROUND_Y + 2);
  g.lineTo(PORTAL.x0 - 16, GROUND_Y + 2);
  g.lineTo(PORTAL.x0 - 18, SURF - 8);
  g.lineTo(PORTAL.x0 - 30, SURF - 26);
  g.lineTo(PORTAL.x0 - 20, SURF - 48);
  g.lineTo(PORTAL.x0 + 2, SURF - 60);
  g.lineTo(-30, SURF - 80);
  for (let x = -20; x <= b.x1 + 600; x += 12) g.lineTo(x, hillY(x));
  g.lineTo(b.x1 + 600, b.y1 + 5000);
  g.lineTo(b.x0 - 600, b.y1 + 5000);
  g.closePath();
}

// ---------- слои с параллаксом ----------
function layerScale() { return Math.min(2, ART.k); }
function buildLayer(kind, st) {
  const k = layerScale();
  const LW = 3400, LH = 300, X0 = -1500;
  const c = mkCanvas(LW * k, LH * k), g = c.getContext('2d');
  g.scale(k, k);
  const base = LH - 20; // линия горизонта внутри слоя
  const rng = seeded(kind === 'far' ? 5 : 9);
  if (kind === 'far') {
    const col = mulc(mixc('#7a7486', st.hor, 0.38), mixc(st.tint, '#ffffff', 0.25));
    // хребет
    g.fillStyle = vgrad(g, base - 170, base, [mixc(col, st.top, 0.15), col]);
    g.beginPath(); g.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 20) g.lineTo(x, base - 70 - 60 * Math.abs(Math.sin(x * 0.0021 + 1)) - 38 * Math.abs(Math.sin(x * 0.0063)) - 10 * Math.sin(x * 0.03));
    g.lineTo(LW, LH); g.fill();
    // руины города
    const cityCol = mulc(mixc(col, '#34323e', 0.45), mixc(st.tint, '#ffffff', 0.4));
    g.fillStyle = cityCol;
    let x = 900;
    while (x < 1900) {
      const w = 18 + rng() * 34, h = 40 + rng() * 110;
      const y = base - 30 - h;
      g.beginPath(); g.moveTo(x, base); g.lineTo(x, y + 6);
      const broken = rng() < 0.6;
      if (broken) { g.lineTo(x + w * 0.3, y + rng() * 14); g.lineTo(x + w * 0.5, y + 10 + rng() * 12); g.lineTo(x + w * 0.7, y - 4 + rng() * 10); } else { g.lineTo(x + w * 0.5, y - 10); }
      g.lineTo(x + w, y + 6 + rng() * 10); g.lineTo(x + w, base); g.fill();
      if (!broken && rng() < 0.5) { g.fillRect(x + w * 0.48, y - 26, 1.4, 16); }
      // окна
      g.fillStyle = mixc(cityCol, st.hor, isNight(st) ? 0.05 : 0.25);
      for (let wy = y + 12; wy < base - 34; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (rng() < 0.55) g.fillRect(wx, wy, 2, 3);
      g.fillStyle = cityCol;
      x += w + rng() * 16;
    }
    // дымка
    g.fillStyle = vgrad(g, base - 90, base, [rgba(st.hor, 0), rgba(st.hor, 0.38)]);
    g.fillRect(0, base - 90, LW, 90 + 20);
  } else {
    const col = mulc(mixc('#8a6448', st.hor, 0.18), st.tint);
    // столовые горы
    const mp = new Path2D();
    mp.moveTo(0, LH);
    let x = 0;
    while (x < LW) {
      const w = 90 + rng() * 220, h = 30 + rng() * 80;
      mp.lineTo(x, base - 12);
      mp.lineTo(x + w * 0.12, base - h); mp.lineTo(x + w * 0.2, base - h - 4 + rng() * 6); mp.lineTo(x + w * 0.8, base - h - 3 + rng() * 6); mp.lineTo(x + w * 0.9, base - h + 4);
      mp.lineTo(x + w, base - 10 - rng() * 10);
      x += w + rng() * 60;
    }
    mp.lineTo(LW, base - 8); mp.lineTo(LW, LH); mp.closePath();
    g.fillStyle = vgrad(g, base - 110, base, [shade(col, 0.08), shade(col, -0.2)]);
    g.fill(mp);
    // пласты и освещённые грани
    g.save(); g.clip(mp);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.2;
    for (let y = base - 90; y < base; y += 11) { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); }
    g.fillStyle = vgrad(g, base - 110, base - 60, [rgba(st.sun, 0.18), rgba(st.sun, 0)]); g.fillRect(0, base - 110, LW, 50);
    g.restore();
    // равнина
    g.fillStyle = vgrad(g, base - 14, LH, [shade(col, -0.05), shade(col, -0.3)]);
    g.fillRect(0, base - 12, LW, LH);
    // опоры ЛЭП
    const pc = shade(col, -0.55);
    g.strokeStyle = pc; g.fillStyle = pc; g.lineWidth = 1.4;
    const poles = [];
    for (let px = 200; px < LW; px += 260 + rng() * 60) {
      const top = base - 58;
      g.beginPath(); g.moveTo(px - 7, base - 8); g.lineTo(px, top); g.lineTo(px + 7, base - 8); g.stroke();
      g.beginPath(); g.moveTo(px - 12, top + 6); g.lineTo(px + 12, top + 6); g.moveTo(px - 9, top + 14); g.lineTo(px + 9, top + 14);
      g.moveTo(px - 4, base - 30); g.lineTo(px + 4, base - 20); g.moveTo(px + 4, base - 30); g.lineTo(px - 4, base - 20); g.stroke();
      poles.push([px, top + 6]);
    }
    g.lineWidth = 0.6;
    for (let i = 1; i < poles.length; i++) {
      const [a, ay] = poles[i - 1], [b2, by] = poles[i];
      for (const o of [-10, 10]) { g.beginPath(); g.moveTo(a + o, ay); g.quadraticCurveTo((a + b2) / 2, ay + 18, b2 + o, by); g.stroke(); }
    }
    // водонапорная башня и заправка
    const wx = 1250;
    g.fillRect(wx - 12, base - 72, 24, 18); g.beginPath(); g.moveTo(wx - 14, base - 72); g.lineTo(wx, base - 84); g.lineTo(wx + 14, base - 72); g.fill();
    g.lineWidth = 1.6; for (const o of [-9, 9]) { g.beginPath(); g.moveTo(wx + o, base - 54); g.lineTo(wx + o * 1.4, base - 8); g.stroke(); }
    g.fillRect(1750, base - 30, 60, 3); g.fillRect(1756, base - 27, 3, 20); g.fillRect(1798, base - 27, 3, 20); g.fillRect(1770, base - 22, 20, 14);
    g.fillRect(1780, base - 52, 3, 22); g.fillRect(1772, base - 60, 20, 10);
    g.fillStyle = vgrad(g, base - 50, base, [rgba(st.hor, 0), rgba(st.hor, 0.16)]); g.fillRect(0, base - 50, LW, 60);
  }
  return { c, k, X0, LW, LH, base };
}
function buildClouds(st) {
  WORLD.clouds = [];
  const rng = seeded(3);
  const night = isNight(st);
  for (let i = 0; i < 7; i++) {
    const w = 120 + rng() * 160, h = 30 + rng() * 26;
    const k = 1;
    const c = mkCanvas(w * k, h * k * 1.6), g = c.getContext('2d');
    const lit = mixc('#ffffff', st.hor, 0.35), dark = mixc('#7a7c90', st.top, 0.4);
    for (let j = 0; j < 14; j++) {
      const x = w * (0.1 + rng() * 0.8), y = h * (0.6 + rng() * 0.5), r = h * (0.3 + rng() * 0.45);
      const gr = g.createRadialGradient(x, y - r * 0.3, 1, x, y, r);
      gr.addColorStop(0, rgba(night ? '#4a5270' : lit, night ? 0.35 : 0.75));
      gr.addColorStop(0.6, rgba(night ? '#2a3050' : dark, night ? 0.2 : 0.4));
      gr.addColorStop(1, rgba(dark, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    WORLD.clouds.push({ c, w, h: h * 1.6, x: rng() * 3000 - 1400, y: -170 + rng() * 150, v: 3 + rng() * 5, p: 0.85 + rng() * 0.1 });
  }
}

// ---------- передний план поверхности (запекается) ----------
function buildForeground(st) {
  const k = Math.min(3, ART.k);
  const b = worldBounds();
  const x0 = b.x0 - 80, x1 = GW * CW + 200, y0 = SURF - 260, y1 = SURF + FH + 4;
  const c = mkCanvas((x1 - x0) * k, (y1 - y0) * k), g = c.getContext('2d');
  g.scale(k, k); g.translate(-x0, -y0);
  const night = isNight(st);
  const rockP = patFor(g, ART.rockC, 256), dirtP = patFor(g, ART.dirtC, 128), concP = patFor(g, ART.concreteC, 96);
  // земля снаружи
  g.fillStyle = dirtP; g.fillRect(x0, GROUND_Y, PORTAL.x0 - x0, y1 - GROUND_Y);
  g.fillStyle = vgrad(g, GROUND_Y - 4, GROUND_Y + 14, ['rgba(255,220,170,.25)', 'rgba(0,0,0,0)']); g.fillRect(x0, GROUND_Y - 2, PORTAL.x0 - x0, 16);
  // дорога
  g.fillStyle = '#3d3a37'; poly(g, [x0, GROUND_Y + 1, PORTAL.x0, GROUND_Y + 1, PORTAL.x0, GROUND_Y + 8, x0, GROUND_Y + 10]); g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0, GROUND_Y + 1, PORTAL.x0 - x0, 0.8);
  g.fillStyle = '#b89a3a'; for (let x = x0 + 10; x < PORTAL.x0 - 20; x += 26) g.fillRect(x, GROUND_Y + 4.5, 12, 1);
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.5;
  const rng = seeded(17);
  for (let i = 0; i < 18; i++) { const x = x0 + rng() * (PORTAL.x0 - x0); g.beginPath(); g.moveTo(x, GROUND_Y + 2); g.lineTo(x + 3 - rng() * 6, GROUND_Y + 5); g.lineTo(x + 2 - rng() * 4, GROUND_Y + 8); g.stroke(); }
  // скала с убежищем
  g.save();
  cliffPath(g);
  g.clip();
  g.fillStyle = rockP; g.fillRect(x0 - 10, y0, x1 - x0 + 20, y1 - y0 + 10);
  // кромка и свет на кромке
  g.restore();
  g.save();
  cliffPath(g);
  g.lineWidth = 7; g.strokeStyle = shade('#7a5a3a', -0.1); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = rgba(night ? '#8aa0d0' : '#ffd8a0', night ? 0.25 : 0.45); g.stroke();
  g.restore();
  // сухая трава и камни по кромке
  for (let x = -20; x < x1; x += 7 + rng() * 9) {
    const y = hillY(x);
    g.strokeStyle = rng() < 0.5 ? '#9a8a4a' : '#7a6a3a'; g.lineWidth = 0.8;
    for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x + j, y + 2); g.lineTo(x + j + (rng() - 0.5) * 4, y - 3 - rng() * 5); g.stroke(); }
    if (rng() < 0.18) { g.fillStyle = vgrad(g, y - 6, y + 2, ['#8a7a66', '#4a3e32']); g.beginPath(); g.ellipse(x + 4, y, 4 + rng() * 5, 3 + rng() * 2, 0, Math.PI, 0); g.fill(); }
  }
  // мёртвые деревья
  const tree = (tx, s) => {
    const ty = tx < PORTAL.x0 ? GROUND_Y : hillY(tx);
    g.strokeStyle = '#2e241c'; g.lineCap = 'round';
    const br = (x, y, a, len, w, d) => {
      if (d > 4 || len < 3) return;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      br(ex, ey, a - 0.45 - rng() * 0.3, len * 0.7, w * 0.65, d + 1);
      if (rng() < 0.8) br(ex, ey, a + 0.4 + rng() * 0.3, len * 0.65, w * 0.6, d + 1);
    };
    br(tx, ty + 2, -Math.PI / 2 + (rng() - 0.5) * 0.2, 18 * s, 3.2 * s, 0);
  };
  tree(120, 1.1); tree(610, 0.9); tree(-230, 1.3); tree(930, 1);
  // вентиляционные шахты убежища
  for (const vx of [260, 540]) {
    const vy = hillY(vx);
    cylV(g, vx, vy + 3, 5, 16, '#6c7275');
    g.fillStyle = '#3a3e40'; rr(g, vx - 8, vy - 17, 16, 5, 2); g.fill();
    g.fillStyle = '#e8b422'; g.fillRect(vx - 5, vy - 6, 10, 1.4);
  }
  // радиомачта
  const mx = 740, my = hillY(mx);
  g.strokeStyle = '#4a4e52'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(mx - 9, my + 2); g.lineTo(mx - 1.5, my - 120); g.moveTo(mx + 9, my + 2); g.lineTo(mx + 1.5, my - 120); g.stroke();
  g.lineWidth = 0.6;
  for (let y = my - 4; y > my - 118; y -= 9) { const t = (my - y) / 122, hw = 9 - t * 7.5; g.beginPath(); g.moveTo(mx - hw, y); g.lineTo(mx + hw * 0.85, y - 9); g.moveTo(mx + hw, y); g.lineTo(mx - hw * 0.85, y - 9); g.stroke(); }
  g.fillStyle = '#6a6e72'; g.fillRect(mx - 6, my - 90, 12, 2); g.fillRect(mx - 3, my - 60, 6, 2);
  // спутниковая тарелка
  const dx = 420, dy = hillY(dx);
  g.fillStyle = '#5a5e62'; g.fillRect(dx - 1.2, dy - 12, 2.4, 14);
  g.save(); g.translate(dx, dy - 16); g.rotate(-0.5);
  g.fillStyle = vgrad(g, -10, 10, ['#d8dcdc', '#7a8084']); g.beginPath(); g.ellipse(0, 0, 11, 5, 0, Math.PI, 0); g.fill();
  g.strokeStyle = '#4a4e52'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -10); g.stroke();
  g.restore();
  // разбитый автомобиль на дороге
  const car = (cx, cy, col, flip) => {
    g.save(); g.translate(cx, cy); if (flip) g.scale(-1, 1);
    contact(g, 0, 0, 70, 0.55);
    g.fillStyle = vgrad(g, -20, 0, [shade(col, 0.15), shade(col, -0.3)]);
    g.beginPath(); g.moveTo(-32, -4); g.lineTo(-30, -12); g.lineTo(-16, -14); g.lineTo(-9, -24); g.lineTo(12, -24); g.lineTo(20, -14); g.lineTo(32, -12); g.lineTo(33, -4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(20,24,28,.85)'; poly(g, [-7, -22, 1, -22, 1, -15, -13, -15]); g.fill(); poly(g, [3, -22, 11, -22, 17, -15, 3, -15]); g.fill();
    g.fillStyle = '#8a4a2a'; for (let i = 0; i < 9; i++) { g.globalAlpha = 0.4; g.beginPath(); g.arc(-25 + rng() * 50, -10 + rng() * 8, 1 + rng() * 3, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.fillStyle = '#c9c4b0'; g.fillRect(-33, -8, 4, 2); g.fillStyle = '#d8d0a0'; g.fillRect(29, -10, 3, 2.4);
    for (const wx of [-20, 21]) { g.fillStyle = '#161616'; g.beginPath(); g.arc(wx, -3, 6, 0, 7); g.fill(); g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(wx, -3, 2.4, 0, 7); g.fill(); }
    g.restore();
  };
  car(-250, GROUND_Y + 6, '#6f8f8a', false);
  // знак
  const sx = -150;
  g.fillStyle = '#3a2e22'; g.save(); g.translate(sx, GROUND_Y); g.rotate(0.08); g.fillRect(-1.5, -52, 3, 52);
  g.fillStyle = '#e8c35a'; rr(g, -28, -64, 58, 18, 2); g.fill();
  g.strokeStyle = '#2a2016'; g.lineWidth = 1; rr(g, -26, -62, 54, 14, 1.5); g.stroke();
  g.fillStyle = '#2a2016'; g.font = `700 8px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`УБЕЖИЩЕ ${S ? S.vault : '000'}  ▶`, 1, -54.5);
  g.restore();
  // мешки с песком и бочки у входа
  for (let i = 0; i < 7; i++) { const bx = PORTAL.x0 - 50 + (i % 4) * 9 + (i >= 4 ? 4.5 : 0), by = GROUND_Y - (i >= 4 ? 6 : 0); g.fillStyle = vgrad(g, by - 6, by, ['#b8a27a', '#7a6848']); rr(g, bx - 5, by - 6, 10, 6, 3); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.5; g.stroke(); }
  barrel(g, -110, GROUND_Y, 5, 13, '#8a3a24');
  barrel(g, -99, GROUND_Y, 5, 13, '#3a5a7a');
  g.fillStyle = '#e8b422'; g.fillRect(-114, GROUND_Y - 9, 8, 1.2);
  // покрышки
  for (let i = 0; i < 3; i++) { g.fillStyle = '#1c1c1c'; g.beginPath(); g.ellipse(-320 + i * 3, GROUND_Y - 3 - i * 4, 8, 3.2, 0, 0, 7); g.fill(); g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(-320 + i * 3, GROUND_Y - 3.5 - i * 4, 4, 1.5, 0, 0, 7); g.fill(); }
  // забор с колючкой
  g.strokeStyle = '#4a3e30'; g.lineWidth = 1.4;
  for (let fx = -390; fx < -290; fx += 18) { g.beginPath(); g.moveTo(fx, GROUND_Y); g.lineTo(fx + 1, GROUND_Y - 20); g.stroke(); }
  g.strokeStyle = '#6a6a6a'; g.lineWidth = 0.4;
  for (const yy of [-8, -14, -19]) { g.beginPath(); g.moveTo(-390, GROUND_Y + yy); for (let fx = -390; fx < -290; fx += 6) g.lineTo(fx + 3, GROUND_Y + yy + (fx % 12 ? 0.8 : -0.8)); g.stroke(); }
  // портал бункера
  const P0 = PORTAL.x0, P1 = PORTAL.x1, top = SURF - 8;
  g.fillStyle = concP; g.fillRect(P0 - 14, top - 6, P1 - P0 + 18, GROUND_Y - top + 6);
  g.fillStyle = vgrad(g, top - 6, GROUND_Y, ['rgba(255,255,255,.18)', 'rgba(0,0,0,.05)', 'rgba(0,0,0,.35)']); g.fillRect(P0 - 14, top - 6, P1 - P0 + 18, GROUND_Y - top + 6);
  // крыша-козырёк
  g.fillStyle = vgrad(g, top - 16, top - 4, ['#9a968c', '#5d5a54']); poly(g, [P0 - 22, top - 4, P1 + 6, top - 4, P1 + 2, top - 14, P0 - 16, top - 14]); g.fill();
  hazard(g, P0 - 10, top - 3, P1 - P0 + 8, 4);
  // тоннель
  const tx0 = P0 + 8, ty0 = top + 12;
  g.fillStyle = vgrad(g, ty0, GROUND_Y, ['#0d0e10', '#1c1e21', '#121315']); g.fillRect(tx0, ty0, P1 - tx0, GROUND_Y - ty0);
  g.strokeStyle = 'rgba(120,130,140,.25)'; g.lineWidth = 0.8;
  for (let i = 1; i < 5; i++) { const x = tx0 + i * ((P1 - tx0) / 5); g.beginPath(); g.moveTo(x, ty0 + 2); g.lineTo(x, GROUND_Y); g.stroke(); }
  g.fillStyle = '#2a2c2e'; g.fillRect(tx0, GROUND_Y - 3, P1 - tx0, 3);
  g.fillStyle = hgrad(g, tx0, tx0 + 10, ['rgba(0,0,0,.6)', 'rgba(0,0,0,0)']); g.fillRect(tx0, ty0, 10, GROUND_Y - ty0);
  g.strokeStyle = '#2b2b2b'; g.lineWidth = 2; g.strokeRect(tx0, ty0, P1 - tx0 + 2, GROUND_Y - ty0);
  // табличка
  g.fillStyle = '#2d5ea8'; rr(g, P0 - 6, top - 32, 70, 15, 2); g.fill();
  g.strokeStyle = '#e8c35a'; g.lineWidth = 1.2; rr(g, P0 - 5, top - 31, 68, 13, 1.5); g.stroke();
  g.fillStyle = '#ffe07a'; g.font = `700 8.5px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`УБЕЖИЩЕ ${S ? S.vault : '000'}`, P0 + 29, top - 24.5);
  g.fillStyle = '#c9ccce'; for (const bx of [P0 - 3, P0 + 61]) { g.beginPath(); g.arc(bx, top - 24.5, 0.9, 0, 7); g.fill(); }
  // фонари
  for (const lx of [P0 - 8, P1 - 2]) { g.fillStyle = '#2a2a2a'; g.fillRect(lx - 2, top + 4, 4, 5); g.fillStyle = night ? '#fff2c0' : '#d8d0b0'; g.fillRect(lx - 1.4, top + 5, 2.8, 3); }
  // кабели
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(P0 - 8, top + 4); g.quadraticCurveTo(P0 + 30, top + 12, P1 - 2, top + 4); g.stroke();
  // тон под время суток (маской, чтобы не закрасить прозрачное небо)
  const mask = mkCanvas(c.width, c.height);
  mask.getContext('2d').drawImage(c, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = st.tint; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return { c, k, x0, y0, w: x1 - x0, h: y1 - y0 };
}

function updateWorldCache() {
  const h = todHour();
  const key = Math.floor(h * 2) + '|' + layerScale() + '|' + Math.min(3, ART.k) + '|' + (S ? S.vault : '');
  if (key === WORLD.key) return;
  WORLD.key = key;
  const st = todState(h);
  WORLD.st = st;
  WORLD.layers.far = buildLayer('far', st);
  WORLD.layers.mid = buildLayer('mid', st);
  WORLD.fg = buildForeground(st);
  buildClouds(st);
  WORLD.stars = [];
  const rng = seeded(8);
  for (let i = 0; i < 140; i++) WORLD.stars.push([rng(), rng() * 0.7, 0.4 + rng() * 1.2, rng() * 6]);
}

// ---------- отрисовка неба и поверхности ----------
function drawSky(t) {
  const st = WORLD.st;
  const hz = (SURF - 60 - Cam.y) * Cam.z; // горизонт на экране
  if (hz < -40) return false;
  ctx.setTransform(Cam.dpr, 0, 0, Cam.dpr, 0, 0);
  const H = Math.max(10, hz + 80);
  ctx.fillStyle = vgrad(ctx, hz - 380 * Math.max(0.7, Cam.z), hz + 30, [st.top, st.top, st.mid, st.hor]);
  ctx.fillRect(0, 0, Cam.vw, Math.min(Cam.vh, H));
  // звёзды
  if (st.stars > 0.02) {
    for (const [sx, sy, sz, ph] of WORLD.stars) {
      const y = sy * (hz + 20);
      if (y > hz - 10) continue;
      ctx.globalAlpha = st.stars * (0.5 + 0.5 * Math.sin(t * 1.5 + ph));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx * Cam.vw, y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
  // солнце / луна
  const h = st.h;
  const day = h >= 5.8 && h <= 19.8;
  const f = day ? (h - 5.8) / 14 : ((h + 24 - 19.8) % 24) / 10;
  const cx = Cam.vw * (0.12 + f * 0.76), cy = hz - Math.sin(f * Math.PI) * Math.min(Cam.vh * 0.45, 260) + 20;
  ctx.globalCompositeOperation = 'lighter';
  const r = day ? 24 : 16;
  const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 5);
  gl.addColorStop(0, rgba(st.sun, day ? 0.42 : 0.25)); gl.addColorStop(0.25, rgba(st.sun, day ? 0.1 : 0.06)); gl.addColorStop(1, rgba(st.sun, 0));
  ctx.fillStyle = gl; ctx.fillRect(cx - r * 5, cy - r * 5, r * 10, r * 10);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = day ? mixc(st.sun, '#ffffff', 0.5) : '#e8eeff';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 7); ctx.fill();
  if (!day) { ctx.fillStyle = rgba(st.top, 0.9); ctx.beginPath(); ctx.arc(cx + 5, cy - 3, r * 0.5, 0, 7); ctx.fill(); }
  WORLD.sunX = cx; WORLD.sunY = cy; WORLD.day = day;
  return true;
}
function drawLayers(t, view) {
  const z = Cam.z * Cam.dpr;
  const hzW = SURF - 60;
  if (view.y0 > hzW + 40) return;
  // облака
  for (const cl of WORLD.clouds) {
    cl.x += cl.v * (1 / 60);
    if (cl.x > 1800) cl.x = -1600;
    const wx = cl.x + Cam.x * cl.p, wy = hzW - 200 + cl.y + Cam.y * 0.3;
    ctx.setTransform(z, 0, 0, z, (wx - Cam.x) * z, (wy - Cam.y) * z);
    ctx.drawImage(cl.c, 0, 0, cl.w, cl.h);
  }
  for (const [name, p, dy] of [['far', 0.78, 30], ['mid', 0.5, 42]]) {
    const L = WORLD.layers[name];
    if (!L) continue;
    const wx = L.X0 + Cam.x * p, wy = hzW - L.base + dy + Cam.y * p * 0.25;
    ctx.setTransform(z, 0, 0, z, (wx - Cam.x) * z, (wy - Cam.y) * z);
    ctx.drawImage(L.c, 0, 0, L.LW, L.LH);
  }
  // птицы
  if (!WORLD.birds.length) for (let i = 0; i < 3; i++) WORLD.birds.push({ cx: rf(-300, 900), cy: rf(-120, -40), r: rf(30, 70), ph: rf(0, 6), v: rf(0.3, 0.6) });
  ctx.setTransform(z, 0, 0, z, -Cam.x * z, -Cam.y * z);
  ctx.strokeStyle = 'rgba(30,24,20,.7)'; ctx.lineWidth = 1;
  for (const b of WORLD.birds) {
    const a = t * b.v + b.ph, x = b.cx + Math.cos(a) * b.r + Cam.x * 0.6, y = SURF - 120 + b.cy + Math.sin(a) * b.r * 0.3;
    const fl = Math.sin(t * 6 + b.ph) * 2;
    ctx.beginPath(); ctx.moveTo(x - 5, y - fl); ctx.quadraticCurveTo(x - 2, y - 2, x, y); ctx.quadraticCurveTo(x + 2, y - 2, x + 5, y - fl); ctx.stroke();
  }
}
const ROCK = { cache: new Map(), key: '', size: 512 };
function rockChunk(ix, iy) {
  const key = ix + ':' + iy;
  let c = ROCK.cache.get(key);
  if (c) { ROCK.cache.delete(key); ROCK.cache.set(key, c); return c; }
  const S0 = ROCK.size, k = ART.k >= 2 ? 1.5 : 1;
  const x0 = ix * S0, y0 = iy * S0;
  c = mkCanvas(S0 * k, S0 * k);
  const g = c.getContext('2d');
  g.scale(k, k); g.translate(-x0, -y0);
  g.save();
  cliffPath(g); g.clip();
  const p = patFor(g, ART.rockC, 256);
  g.fillStyle = p; g.fillRect(x0, y0, S0, S0);
  const saved = ctx; ctx = g;
  drawRockDetails({ x0: x0 - 60, y0: y0 - 60, x1: x0 + S0 + 60, y1: y0 + S0 + 60 });
  ctx = saved;
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = vgrad(g, SURF, SURF + 1400, ['#ffffff', '#c8b8aa', '#8f8898', '#6a6576']);
  g.fillRect(x0, Math.max(y0, SURF), S0, S0);
  const st = WORLD.st;
  if (st && isNight(st)) { g.fillStyle = vgrad(g, SURF - 120, SURF + 80, [st.tint, '#ffffff']); g.fillRect(x0, y0, S0, Math.max(0, SURF + 80 - y0)); }
  g.restore();
  ROCK.cache.set(key, c);
  while (ROCK.cache.size > 14) ROCK.cache.delete(ROCK.cache.keys().next().value);
  return c;
}
function drawRock(view) {
  const key = ART.k + '|' + WORLD.key;
  if (ROCK.key !== key) { ROCK.key = key; ROCK.cache.clear(); }
  setW();
  const S0 = ROCK.size;
  const top = Math.max(view.y0, SURF - 140);
  for (let iy = Math.floor(top / S0); iy * S0 < view.y1; iy++) {
    for (let ix = Math.floor(view.x0 / S0); ix * S0 < view.x1; ix++) {
      ctx.drawImage(rockChunk(ix, iy), ix * S0, iy * S0, S0, S0);
    }
  }
}
function drawRockDetails(view) {
  const cs = 120;
  const cx0 = Math.floor(view.x0 / cs), cx1 = Math.ceil(view.x1 / cs), cy0 = Math.floor(Math.max(view.y0, SURF - 60) / cs), cy1 = Math.ceil(view.y1 / cs);
  const lod = true;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const rng = seeded(hashStr(cx + ':' + cy));
    const x = cx * cs + rng() * cs, y = cy * cs + rng() * cs;
    if (y < hillY(x) + 14 && x > -40) continue;
    if (x < PORTAL.x0 - 16 && y < GROUND_Y + 14) continue;
    const r = rng();
    if (r < 0.42) { // валун
      const s = 10 + rng() * 26;
      ctx.fillStyle = vgrad(ctx, y - s, y + s, ['#8a7258', '#4e3c2c', '#2e231a']);
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr2 = s * (0.75 + rng() * 0.35); ctx.lineTo(x + Math.cos(a) * rr2 * 1.2, y + Math.sin(a) * rr2 * 0.8); }
      ctx.closePath(); ctx.fill();
      if (lod) { ctx.strokeStyle = 'rgba(255,225,190,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.1, s * 0.75, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); }
    } else if (r < 0.5 && lod && y > SURF + 200) { // окаменелость
      ctx.strokeStyle = 'rgba(220,200,170,.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const rr2 = 1 + a * 0.9; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      ctx.stroke();
    } else if (r < 0.56 && lod && y > SURF + 400) { // кристаллы
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (rng() - 0.5) * 1.4, l2 = 5 + rng() * 8;
        ctx.fillStyle = rgba('#7ad8ff', 0.55);
        ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x + Math.cos(a) * l2, y + Math.sin(a) * l2); ctx.lineTo(x + 1.5, y); ctx.fill();
      }
    } else if (r < 0.62 && lod && y < SURF + 160) { // корни
      ctx.strokeStyle = 'rgba(60,40,24,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.bezierCurveTo(x + 8, y - 10, x - 6, y + 5, x + 4, y + 24); ctx.stroke();
      ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + 2, y - 8); ctx.lineTo(x + 12, y); ctx.stroke();
    } else if (r < 0.66 && lod) { // старая труба в породе
      ctx.fillStyle = vgrad(ctx, y - 2, y + 2, ['#6a5a4a', '#9a7a5a', '#3a2e24']);
      ctx.fillRect(x - 30, y - 2, 60, 4);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 10, y - 2.5, 2, 5);
    }
  }
}
function drawForeground() {
  const F = WORLD.fg;
  if (!F) return;
  const z = Cam.z * Cam.dpr;
  ctx.setTransform(z, 0, 0, z, (F.x0 - Cam.x) * z, (F.y0 - Cam.y) * z);
  ctx.drawImage(F.c, 0, 0, F.w, F.h);
}
function drawSurfaceFx(t) {
  const st = WORLD.st;
  const z = Cam.z * Cam.dpr;
  ctx.setTransform(z, 0, 0, z, -Cam.x * z, -Cam.y * z);
  const night = isNight(st);
  ctx.globalCompositeOperation = 'lighter';
  // фонари у входа
  const top = SURF - 8;
  for (const lx of [PORTAL.x0 - 8, PORTAL.x1 - 2]) {
    const a = night ? 0.55 : 0.12;
    const gr = ctx.createRadialGradient(lx, top + 7, 0, lx, top + 7, night ? 60 : 20);
    gr.addColorStop(0, `rgba(255,230,170,${a})`); gr.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = gr; ctx.fillRect(lx - 60, top - 53, 120, 120);
  }
  // огонёк на мачте
  const mx = 740, my = hillY(740) - 121;
  const bl = (Math.sin(t * 3) > 0.3) ? 1 : 0.2;
  const gr = ctx.createRadialGradient(mx, my, 0, mx, my, 10);
  gr.addColorStop(0, `rgba(255,60,40,${0.9 * bl})`); gr.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = gr; ctx.fillRect(mx - 10, my - 10, 20, 20);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bl > 0.5 ? '#ff5a3a' : '#6a2a20'; ctx.beginPath(); ctx.arc(mx, my, 1.4, 0, 7); ctx.fill();
  // пар из вентиляции
  for (const vx of [260, 540]) {
    const vy = hillY(vx) - 18;
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.35 + i / 4 + vx) % 1);
      ctx.fillStyle = `rgba(230,230,230,${0.22 * (1 - p)})`;
      ctx.beginPath(); ctx.arc(vx + Math.sin(p * 5 + i) * 4 + p * 10, vy - p * 26, 3 + p * 7, 0, 7); ctx.fill();
    }
  }
  // пыль в воздухе
  if (!WORLD.dust.length) for (let i = 0; i < 40; i++) WORLD.dust.push({ x: rf(-400, 1100), y: rf(SURF - 200, GROUND_Y), v: rf(8, 22), s: rf(0.6, 1.6) });
  ctx.fillStyle = night ? 'rgba(200,210,255,.25)' : 'rgba(255,230,190,.45)';
  for (const d of WORLD.dust) {
    d.x += d.v / 60;
    if (d.x > 1100) d.x = -400;
    const y = d.y + Math.sin(t + d.x * 0.02) * 4;
    if (y > hillY(d.x) && d.x > -40) continue;
    ctx.fillRect(d.x, y, d.s, d.s);
  }
}
