// ===== Гермодверь: шестерня с толщиной, массивная рама с засовами, туннель, гидравлика =====
const DOOR_R = 33;
const DOORC = { face: new Map(), frame: new Map(), edge: new Map() };

function cogPath(R, n, rootK, tipW, rootW) {
  const p = new Path2D(), Rr = R * rootK;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
    const r0 = a - rootW / 2;
    if (i === 0) p.moveTo(Math.cos(r0) * Rr, Math.sin(r0) * Rr);
    p.lineTo(Math.cos(a - tipW / 2) * R, Math.sin(a - tipW / 2) * R);
    p.arc(0, 0, R, a - tipW / 2, a + tipW / 2);
    p.lineTo(Math.cos(a + rootW / 2) * Rr, Math.sin(a + rootW / 2) * Rr);
    p.arc(0, 0, Rr, a + rootW / 2, a2 - rootW / 2);
  }
  p.closePath();
  return p;
}
function circP(r, x = 0, y = 0) { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; }
function ringP(r0, r1) { const p = new Path2D(); p.arc(0, 0, r1, 0, Math.PI * 2); p.moveTo(r0, 0); p.arc(0, 0, r0, 0, Math.PI * 2, true); return p; }
// фаска: светлая кромка сверху-слева, тёмная снизу-справа (inset — наоборот)
function bevel(g, p, w, hi, lo, inset) {
  g.save(); g.clip(p);
  g.fillStyle = inset ? hi : lo; g.fill(_inv(p, -w, -w), 'evenodd');
  g.fillStyle = inset ? lo : hi; g.fill(_inv(p, w, w), 'evenodd');
  g.restore();
}
function hexBolt(g, x, y, r, rot = 0.3) {
  g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(x + r * 0.35, y + r * 0.45, r * 1.2, 0, 7); g.fill();
  g.fillStyle = '#3c4145'; g.beginPath(); g.arc(x, y, r * 1.18, 0, 7); g.fill();
  const hp = new Path2D();
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; i ? hp.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : hp.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  hp.closePath();
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, '#e2e6e8'); gr.addColorStop(0.5, '#9aa1a6'); gr.addColorStop(1, '#4a5054');
  g.fillStyle = gr; g.fill(hp);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.35, 0, 7); g.fill();
}
function steelFill(g, R, cols) {
  if (g.createConicGradient) {
    const cg = g.createConicGradient(-0.5, 0, 0);
    const st = cols || ['#b9bfc3', '#eef1f2', '#9ba2a7', '#d0d5d8', '#80878c', '#dde1e3', '#8e959a', '#b9bfc3'];
    st.forEach((c, i) => cg.addColorStop(i / (st.length - 1), c));
    return cg;
  }
  const rg = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
  rg.addColorStop(0, '#e2e6e8'); rg.addColorStop(1, '#6e757a');
  return rg;
}

function doorFace(k, num, lvl) {
  const key = k + '|' + num + '|' + lvl;
  let c = DOORC.face.get(key);
  if (c) return c;
  const R = DOOR_R, S = Math.ceil((R * 2 + 6) * k);
  c = mkCanvas(S, S);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, S / 2, S / 2);
  const gold = lvl >= 3;
  // зубья
  const gp = cogPath(R, 12, 0.865, 0.2, 0.31);
  const tg = g.createLinearGradient(-R, -R, R, R);
  tg.addColorStop(0, gold ? '#e9dcb0' : '#d5dadd'); tg.addColorStop(0.5, gold ? '#a8966a' : '#8d9398'); tg.addColorStop(1, gold ? '#554a30' : '#43484c');
  g.fillStyle = tg; g.fill(gp);
  bevel(g, gp, 1.2, 'rgba(255,255,255,.55)', 'rgba(0,0,0,.5)');
  // канавки на зубьях
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save(); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(R * 0.88, -0.45, R * 0.1, 0.9);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(R * 0.88, 0.45, R * 0.1, 0.35);
    g.restore();
  }
  // основной диск — шлифованный металл
  const Rd = R * 0.845;
  const dp = circP(Rd);
  g.fillStyle = steelFill(g, Rd, gold ? ['#cfc4a0', '#f4ecd0', '#a89c78', '#ddd2ae', '#8e8360', '#e8dfbd', '#9a8f6c', '#cfc4a0'] : null); g.fill(dp);
  g.save(); g.clip(dp);
  for (let r = 2; r < Rd; r += 0.75) { g.strokeStyle = (r * 4 | 0) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.lineWidth = 0.4; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  const sh = g.createLinearGradient(-Rd, -Rd, Rd, Rd); sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.38)');
  g.fillStyle = sh; g.fill(dp);
  g.restore();
  // канавка по краю диска
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, 0, Rd - 0.4, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, 0, Rd - 1.2, Math.PI * 0.9, Math.PI * 1.75); g.stroke();
  // приподнятое кольцо с болтами
  const rim = ringP(R * 0.7, R * 0.8);
  g.fillStyle = gold ? '#b9ad86' : '#a4abb0'; g.fill(rim);
  bevel(g, rim, 0.8, 'rgba(255,255,255,.5)', 'rgba(0,0,0,.45)');
  const nb = lvl >= 2 ? 20 : 16;
  for (let i = 0; i < nb; i++) { const a = (i / nb) * Math.PI * 2 + 0.1; hexBolt(g, Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75, 1.05, a); }
  // радиальные пазы засовов
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.save(); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, R * 0.52, -1.4, R * 0.16, 2.8, 1.2); g.fill();
    g.fillStyle = '#5a6064'; rr(g, R * 0.53, -0.9, R * 0.13, 1.8, 0.8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(R * 0.54, 0.5, R * 0.11, 0.3);
    g.restore();
  }
  // жёлтое кольцо
  const yr = ringP(R * 0.46, R * 0.575);
  const yg = g.createLinearGradient(-R * 0.6, -R * 0.6, R * 0.6, R * 0.6);
  yg.addColorStop(0, '#ffe07a'); yg.addColorStop(0.5, '#f0b420'); yg.addColorStop(1, '#a86e0a');
  g.fillStyle = yg; g.fill(yr);
  bevel(g, yr, 0.8, 'rgba(255,250,220,.7)', 'rgba(80,40,0,.5)');
  g.save(); g.clip(yr);
  g.fillStyle = 'rgba(30,20,10,.85)';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    for (let j = -1; j <= 1; j++) { g.save(); g.rotate(a + j * 0.13); g.beginPath(); g.moveTo(R * 0.45, -0.9); g.lineTo(R * 0.6, 0.2); g.lineTo(R * 0.6, 1.6); g.lineTo(R * 0.45, 0.5); g.closePath(); g.fill(); g.restore(); }
  }
  g.restore();
  // центральная табличка
  const cp = circP(R * 0.455);
  const cg = g.createRadialGradient(-R * 0.12, -R * 0.16, R * 0.02, 0, 0, R * 0.46);
  cg.addColorStop(0, '#4d8ee0'); cg.addColorStop(0.7, '#23579f'); cg.addColorStop(1, '#143a70');
  g.fillStyle = cg; g.fill(cp);
  bevel(g, cp, 1.1, 'rgba(255,255,255,.25)', 'rgba(0,0,20,.55)', true);
  g.save(); g.clip(cp);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 0.5;
  for (let r = 3; r < R * 0.45; r += 1.6) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  g.restore();
  // номер убежища
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = String(num).length > 3 ? R * 0.34 : R * 0.44;
  g.font = `700 ${fs}px ${FONT_D}`;
  g.fillStyle = 'rgba(0,10,30,.6)'; g.fillText(num, 0.7, 1.6);
  g.lineWidth = 1.3; g.strokeStyle = '#0e2a52'; g.lineJoin = 'round'; g.strokeText(num, 0, 0.8);
  const ng = g.createLinearGradient(0, -fs / 2, 0, fs / 2); ng.addColorStop(0, '#fff2b0'); ng.addColorStop(0.55, '#ffd23e'); ng.addColorStop(1, '#e09a10');
  g.fillStyle = ng; g.fillText(num, 0, 0.8);
  // грязь и потёки
  g.save(); g.clip(gp);
  g.globalCompositeOperation = 'multiply';
  const dirt = g.createLinearGradient(0, -R, 0, R); dirt.addColorStop(0, '#ffffff'); dirt.addColorStop(0.6, '#f2eee6'); dirt.addColorStop(1, '#a89c8a');
  g.fillStyle = dirt; g.fillRect(-R - 2, -R - 2, R * 2 + 4, R * 2 + 4);
  g.globalCompositeOperation = 'source-over';
  const rng = seeded(97 + lvl);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = R * (0.6 + rng() * 0.28), x = Math.cos(a) * r, y = Math.sin(a) * r;
    const l = 2 + rng() * 5;
    const sg = g.createLinearGradient(0, y, 0, y + l); sg.addColorStop(0, 'rgba(110,60,25,.35)'); sg.addColorStop(1, 'rgba(110,60,25,0)');
    g.fillStyle = sg; g.fillRect(x - 0.3, y, 0.6 + rng() * 0.5, l);
  }
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 0.25;
  for (let i = 0; i < 10; i++) { const a = rng() * 7, r = R * (0.2 + rng() * 0.6); g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a) * r + (rng() - 0.5) * 6, Math.sin(a) * r + (rng() - 0.5) * 3); g.stroke(); }
  // блик
  g.globalCompositeOperation = 'lighter';
  const sp = g.createRadialGradient(-R * 0.4, -R * 0.45, 0, -R * 0.4, -R * 0.45, R * 0.55);
  sp.addColorStop(0, 'rgba(255,255,255,.18)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp; g.fillRect(-R, -R, R * 2, R * 2);
  g.restore();
  DOORC.face.set(key, c);
  return c;
}
// боковая грань (толщина двери)
function doorEdge(k) {
  let c = DOORC.edge.get(k);
  if (c) return c;
  const R = DOOR_R, S = Math.ceil((R * 2 + 6) * k);
  c = mkCanvas(S, S);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, S / 2, S / 2);
  const gp = cogPath(R, 12, 0.865, 0.2, 0.31);
  const eg = g.createLinearGradient(-R, -R, R, R); eg.addColorStop(0, '#4d5357'); eg.addColorStop(1, '#1c1f22');
  g.fillStyle = eg; g.fill(gp);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.6; g.stroke(gp);
  DOORC.edge.set(k, c);
  return c;
}
// массивная рама проёма
const FRAME_RO = DOOR_R + 6.5, FRAME_RI = DOOR_R - 1.4;
const FRAME_CL = [0, 1, 2, 3, 4, 5, 6, 7].map(i => (i / 8) * Math.PI * 2 + Math.PI / 8);
function doorFrame(k, lvl) {
  const key = k + '|' + lvl;
  let c = DOORC.frame.get(key);
  if (c) return c;
  const Ro = FRAME_RO, Ri = FRAME_RI, S = Math.ceil((Ro * 2 + 16) * k);
  c = mkCanvas(S, S);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, S / 2, S / 2);
  const ring = ringP(Ri, Ro);
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 5 * k; g.shadowOffsetX = 1 * k; g.shadowOffsetY = 2 * k;
  g.fillStyle = '#5e6468'; g.fill(ring); g.restore();
  g.fillStyle = steelFill(g, Ro, ['#6d7377', '#a7aeb2', '#5a6064', '#8a9195', '#4a5054', '#9ba2a6', '#555b5f', '#6d7377']); g.fill(ring);
  bevel(g, ring, 1.3, 'rgba(255,255,255,.4)', 'rgba(0,0,0,.55)');
  // внутренняя стенка проёма (глубина)
  const lip = ringP(Ri, Ri + 2.6);
  g.save(); g.clip(lip);
  const lg = g.createLinearGradient(-Ri, -Ri, Ri, Ri); lg.addColorStop(0, '#1d2023'); lg.addColorStop(1, '#8a9094');
  g.fillStyle = lg; g.fill(lip); g.restore();
  // жёлто-чёрная полоса снизу (порог)
  g.save();
  const sect = new Path2D(); sect.arc(0, 0, Ro - 1.4, Math.PI * 0.28, Math.PI * 0.72); sect.arc(0, 0, Ri + 3.2, Math.PI * 0.72, Math.PI * 0.28, true); sect.closePath();
  g.clip(sect);
  g.fillStyle = '#e8b422'; g.fill(sect);
  g.fillStyle = '#1d1d1d';
  for (let a = Math.PI * 0.2; a < Math.PI * 0.8; a += 0.09) { g.save(); g.rotate(a); g.beginPath(); g.moveTo(Ri, -1.2); g.lineTo(Ro, 1.2); g.lineTo(Ro, 3.4); g.lineTo(Ri, 1); g.closePath(); g.fill(); g.restore(); }
  g.restore();
  bevel(g, sect, 0.6, 'rgba(255,255,255,.3)', 'rgba(0,0,0,.45)', true);
  // заклёпки
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    if (a > Math.PI * 0.26 && a < Math.PI * 0.74) continue;
    const x = Math.cos(a) * (Ro - 1.7), y = Math.sin(a) * (Ro - 1.7);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + 0.25, y + 0.3, 0.72, 0, 7); g.fill();
    g.fillStyle = '#b8bec2'; g.beginPath(); g.arc(x, y, 0.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 0.2, y - 0.2, 0.22, 0, 7); g.fill();
  }
  // корпуса засовов
  for (const a of FRAME_CL) {
    g.save(); g.rotate(a);
    const hb = new Path2D(); hb.rect(Ri + 1.2, -3.4, Ro - Ri + 1.4, 6.8);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 2 * k; g.shadowOffsetY = 0.6 * k;
    g.fillStyle = '#4c5256'; g.fill(hb); g.restore();
    const bg = g.createLinearGradient(0, -3.4, 0, 3.4); bg.addColorStop(0, '#9ea5a9'); bg.addColorStop(0.5, '#6c7377'); bg.addColorStop(1, '#40464a');
    g.fillStyle = bg; g.fill(hb);
    bevel(g, hb, 0.6, 'rgba(255,255,255,.4)', 'rgba(0,0,0,.5)');
    g.fillStyle = '#23272a'; g.fillRect(Ri + 1.2, -1.3, 1.2, 2.6);
    hexBolt(g, Ro - 0.6, -2, 0.62, 0.4); hexBolt(g, Ro - 0.6, 2, 0.62, 0.9);
    g.restore();
  }
  DOORC.frame.set(key, c);
  return c;
}
// вид сквозь открытый проём: туннель к поверхности
function drawTunnel(g, cx, cy, r, open) {
  const st = WORLD.st;
  const exit = st ? mixc(st.hor, '#ffffff', isNight(st) ? 0.05 : 0.35) : '#e8e0c8';
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
  g.fillStyle = '#0d0b09'; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  const vx = cx - r * 0.42, vy = cy + r * 0.12;
  for (let i = 0; i < 7; i++) {
    const t = i / 7, e = Math.pow(t, 0.75);
    const x = cx + (vx - cx) * e, y = cy + (vy - cy) * e, rr0 = r * (1 - t * 0.82);
    g.fillStyle = i % 2 ? '#1e1a16' : '#26211b';
    g.beginPath(); g.arc(x, y, rr0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,230,190,.07)'; g.lineWidth = 0.7; g.beginPath(); g.arc(x, y, rr0 - 0.4, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
  }
  // пол туннеля
  g.fillStyle = vgrad(g, vy, cy + r, ['#2e271f', '#4a3f32']);
  g.beginPath(); g.moveTo(vx - r * 0.12, vy + r * 0.08); g.lineTo(vx + r * 0.12, vy + r * 0.08); g.lineTo(cx + r * 0.7, cy + r); g.lineTo(cx - r * 0.7, cy + r); g.closePath(); g.fill();
  // свет с поверхности
  const eg = g.createRadialGradient(vx, vy, 0, vx, vy, r * 0.32);
  eg.addColorStop(0, exit); eg.addColorStop(0.55, rgba(exit, 0.85)); eg.addColorStop(1, rgba(exit, 0));
  g.fillStyle = eg; g.beginPath(); g.arc(vx, vy, r * 0.32, 0, 7); g.fill();
  g.globalCompositeOperation = 'lighter';
  const lg = g.createRadialGradient(vx, vy, 0, vx, vy, r * 1.4);
  lg.addColorStop(0, rgba(exit, 0.35 * open)); lg.addColorStop(1, rgba(exit, 0));
  g.fillStyle = lg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
}
// гидравлический рычаг от потолка к оси двери
function drawPiston(g, mx, my, hx, hy) {
  const dx = hx - mx, dy = hy - my, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const cyl = Math.min(22, L - 4);
  g.save(); g.translate(mx, my); g.rotate(a);
  // шток
  g.fillStyle = 'rgba(0,0,0,.6)'; rr(g, cyl - 2, -1.7, L - cyl + 2, 3.4, 1.5); g.fill();
  g.fillStyle = hgradY(g, -1.2, 1.2, ['#f4f6f7', '#aab1b5', '#5c6368']); rr(g, cyl - 2, -1.2, L - cyl + 2, 2.4, 1.1); g.fill();
  // цилиндр
  g.fillStyle = 'rgba(0,0,0,.65)'; rr(g, -2.4, -3.3, cyl + 2.4, 6.6, 2); g.fill();
  g.fillStyle = hgradY(g, -2.8, 2.8, ['#d8b04a', '#f2c94a', '#a87a14', '#6a4a0a']); rr(g, -2, -2.8, cyl + 1.6, 5.6, 1.8); g.fill();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cyl - 4, -2.8, 1, 5.6); g.fillRect(3, -2.8, 0.8, 5.6);
  g.fillStyle = '#1d1d1d'; for (let x = 6; x < cyl - 6; x += 3.4) g.fillRect(x, -2.8, 1.3, 5.6);
  g.restore();
  // крепления
  for (const [x, y, r] of [[mx, my, 3], [hx, hy, 3.6]]) {
    g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(x, y, r + 0.6, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.3, x, y, r); gr.addColorStop(0, '#dfe3e5'); gr.addColorStop(1, '#4a5054');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#2a2e31'; g.beginPath(); g.arc(x, y, r * 0.38, 0, 7); g.fill();
  }
}
function hgradY(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }

// Сборка двери в кадре. o — 0 (закрыта) … 1 (откатана), k — масштаб запекания
function drawVaultDoor(g, cx, cy, o, t, opt = {}) {
  const k = opt.k || ART.k, lvl = opt.lvl || 1, num = opt.num || '000', sc = opt.s || 1;
  const p1 = smooth01(clamp(o / 0.22, 0, 1)), p2 = smooth01(clamp((o - 0.22) / 0.78, 0, 1));
  const roll = (opt.roll ?? 78) * p2;
  g.save(); g.translate(cx, cy); g.scale(sc, sc);
  // проём и туннель
  if (o > 0.005) drawTunnel(g, 0, 0, FRAME_RI + 0.4, p1);
  else { g.fillStyle = '#0a0908'; g.beginPath(); g.arc(0, 0, FRAME_RI + 0.4, 0, 7); g.fill(); }
  // рама
  const fr = doorFrame(k, lvl), FS = fr.width / k;
  g.drawImage(fr, -FS / 2, -FS / 2, FS, FS);
  // засовы: выдвинуты в дверь, пока она закрыта
  const pin = 1 - p1;
  for (const a of FRAME_CL) {
    g.save(); g.rotate(a);
    const x0 = FRAME_RI + 1.2 - pin * 4.4;
    g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, x0 - 0.2, -1.5, 4.2, 3.2, 0.8); g.fill();
    g.fillStyle = hgradY(g, -1.3, 1.3, ['#f2f4f5', '#a4abaf', '#50575b']); rr(g, x0, -1.3, 4, 2.6, 0.8); g.fill();
    g.restore();
  }
  if (opt.arm) { g.restore(); opt.arm(); g.save(); g.translate(cx, cy); g.scale(sc, sc); }
  // тень двери на стене и полу
  const dx = roll, sh = 3 + p1 * 4 + p2 * 2;
  if (o > 0.005) {
    g.save(); g.translate(dx + sh * 0.6, sh * 0.8);
    const gr = g.createRadialGradient(0, 0, DOOR_R * 0.7, 0, 0, DOOR_R * 1.12);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, DOOR_R * 1.12, 0, 7); g.fill();
    g.restore();
  }
  // дверь: толщина + лицевая сторона
  const rot = (opt.rot || 0) + roll / DOOR_R;
  const ds = 1 + p1 * 0.045 - p2 * 0.01;
  const shake = opt.shake || 0;
  g.save(); g.translate(dx + shake, 0); g.scale(ds, ds);
  const ed = doorEdge(k), ES = ed.width / k;
  const th = 1.6 + p1 * 2.4;
  g.save(); g.translate(th * 0.75, th * 0.55); g.rotate(rot); g.drawImage(ed, -ES / 2, -ES / 2, ES, ES); g.restore();
  g.save(); g.translate(th * 0.38, th * 0.28); g.rotate(rot); g.drawImage(ed, -ES / 2, -ES / 2, ES, ES); g.restore();
  const fc = doorFace(k, num, lvl), FC = fc.width / k;
  g.save(); g.rotate(rot); g.drawImage(fc, -FC / 2, -FC / 2, FC, FC); g.restore();
  g.restore();
  g.restore();
  return { hx: cx + (dx + shake) * sc, hy: cy, p1, p2 };
}
function smooth01(x) { return x * x * (3 - 2 * x); }

// Совместимость: шестерня для меню
function drawGearDoor(g, cx, cy, rad, rot, vault) {
  const sc = rad / DOOR_R;
  const k = Math.min(6, Math.max(1, Math.ceil(sc * (window.devicePixelRatio || 1))));
  const fc = doorFace(k, vault, 2), FC = fc.width / k;
  const ed = doorEdge(k), ES = ed.width / k;
  g.save(); g.translate(cx, cy); g.scale(sc, sc);
  g.save(); g.translate(2.4, 2); g.rotate(rot); g.drawImage(ed, -ES / 2, -ES / 2, ES, ES); g.restore();
  g.rotate(rot); g.drawImage(fc, -FC / 2, -FC / 2, FC, FC);
  g.restore();
}
