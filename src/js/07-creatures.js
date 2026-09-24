// ===== Существа и питомцы: единый стиль с жителями (контур + объёмная заливка) =====
const CR_OW = 0.62;
function crInk(g, paths, w = CR_OW) {
  g.fillStyle = INK_C; g.strokeStyle = INK_C; g.lineWidth = w * 2; g.lineJoin = 'round'; g.lineCap = 'round';
  for (const p of paths) { g.fill(p); g.stroke(p); }
}
function crLine(g, pts, w, col) {
  // конечность-ломаная: сначала контур, потом цвет
  g.lineJoin = 'round'; g.lineCap = 'round';
  const path = new Path2D(); path.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = INK_C; g.lineWidth = w + CR_OW * 2; g.stroke(path);
  g.strokeStyle = col; g.lineWidth = w; g.stroke(path);
  g.strokeStyle = rgba(clt(col, 0.4), 0.5); g.lineWidth = Math.max(0.3, w * 0.3); g.stroke(path);
}
function crShadow(g, rx, ry = 2) { g.fillStyle = 'rgba(8,4,2,.35)'; g.beginPath(); g.ellipse(0, 0.3, rx, ry, 0, 0, 7); g.fill(); }

// ---------- таракан-мутант ----------
function drawRoach(g, x, y, face, t, seed) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  crShadow(g, 12, 1.8);
  const ph = t * 26 + seed, bob = Math.abs(Math.sin(ph)) * 0.4;
  const legs = [[-5, 0], [0, 2.1], [5, 4.2]];
  for (const [lx, o] of legs) { const s = Math.sin(ph + o); crLine(g, [lx, -4.5 - bob, lx - 3 + s * 2, -2.6, lx - 5 + s * 3, 0], 0.9, '#3a2010'); }
  const ab = ellP(-3.5, -6 - bob, 9, 4.7, -0.05), th = ellP(5.2, -5.6 - bob, 4.3, 3.7, 0.1), hd = ellP(9.8, -4.6 - bob, 2.8, 2.5);
  crInk(g, [ab, th, hd]);
  cel(g, ab, '#8a5024', { d: 1.3, h: 0.7, hic: '#e8b27a' });
  cel(g, th, '#7a4520', { d: 1, h: 0.6, hic: '#e8b27a' });
  cel(g, hd, '#5a3016', { d: 0.8, h: 0.4 });
  g.save(); g.clip(ab);
  g.strokeStyle = 'rgba(40,20,8,.7)'; g.lineWidth = 0.45; g.beginPath(); g.moveTo(-12, -6.2 - bob); g.quadraticCurveTo(-3, -7.4 - bob, 5, -6.4 - bob); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-10 + i * 3.4, -3 - bob, 3, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  g.strokeStyle = 'rgba(255,230,190,.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-9, -9.2 - bob); g.quadraticCurveTo(-3, -11 - bob, 3, -9.4 - bob); g.stroke();
  g.restore();
  for (const [lx, o] of legs) { const s = Math.sin(ph + o + Math.PI); crLine(g, [lx + 1, -3.5 - bob, lx + 3 + s * 2, -1.8, lx + 5 + s * 3, 0], 1, '#4a2a14'); }
  g.fillStyle = '#ffdca0'; g.beginPath(); g.arc(11, -5.4 - bob, 0.6, 0, 7); g.fill();
  const aw = Math.sin(t * 9 + seed) * 2;
  crLine(g, [11.5, -6 - bob, 16, -12, 21, -10 + aw], 0.45, '#5a3016');
  crLine(g, [11, -5 - bob, 17, -8, 22, -5 + aw * 0.7], 0.45, '#5a3016');
  g.restore();
}

// ---------- мутокрыса ----------
function drawMolerat(g, x, y, face, t, seed, atk) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  crShadow(g, 13, 2);
  const ph = t * 14 + seed, bob = Math.abs(Math.sin(ph)) * 0.8;
  const skin = '#c98f86', dark = cmix(skin, '#3a1c18', 0.35);
  // хвост
  const tw = Math.sin(t * 5 + seed) * 2;
  crLine(g, [-12, -6, -18, -5 + tw, -23, -9 + tw * 1.5], 1.3, '#b8807a');
  // дальние лапы
  for (const lx of [-7, 5]) { const s = Math.sin(ph + lx); crLine(g, [lx, -4 - bob, lx - 1 + s * 1.5, -0.6], 2.2, dark); }
  const body = P2(p => { p.moveTo(-13, -4 - bob); p.bezierCurveTo(-15, -12 - bob, -6, -16 - bob, 2, -14 - bob); p.bezierCurveTo(8, -13.5 - bob, 11, -11 - bob, 12, -8 - bob); p.lineTo(12, -4 - bob); p.bezierCurveTo(6, -2 - bob, -6, -1.5 - bob, -13, -4 - bob); p.closePath(); });
  const jaw = atk ? Math.max(0, Math.sin(t * 12 + seed)) * 2.2 : 0;
  const head = P2(p => { p.moveTo(8, -13.5 - bob); p.bezierCurveTo(13, -14 - bob, 18, -12 - bob, 20, -9.5 - bob); p.bezierCurveTo(21, -8 - bob, 20.4, -6.6 - bob, 19, -6.6 - bob); p.bezierCurveTo(15, -6 + jaw * 0.4 - bob, 11, -5 - bob, 8, -5.5 - bob); p.closePath(); });
  const ear = ellP(10.6, -12.8 - bob, 1.6, 1.3);
  crInk(g, [body, head, ear]);
  cel(g, body, skin, { d: 1.6, sx: 0.4, h: 0.8, hic: '#f2c8bc', y0: -16, y1: -2 });
  g.save(); g.clip(body);
  g.strokeStyle = rgba(dark, 0.55); g.lineWidth = 0.45;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-9 + i * 3.6, -9 - bob, 5 + (i % 2), Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
  g.fillStyle = rgba('#6a4038', 0.35); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(-11 + ((i * 7.3) % 22), -12 + ((i * 3.1) % 7) - bob, 0.6, 0, 7); g.fill(); }
  g.restore();
  cel(g, head, cmix(skin, '#ffffff', 0.05), { d: 1.2, h: 0.6, hic: '#f6d2c6' });
  cel(g, ear, dark, { d: 0.5, h: 0 });
  // зубы
  const teeth = P2(p => { p.moveTo(17.2, -7.2 - bob); p.lineTo(18.6, -7.2 - bob); p.lineTo(18.2, -3.4 + jaw - bob); p.lineTo(17.4, -3.6 + jaw - bob); p.closePath(); p.moveTo(18.8, -7.2 - bob); p.lineTo(20, -7.4 - bob); p.lineTo(19.6, -3.8 + jaw - bob); p.lineTo(18.9, -3.9 + jaw - bob); p.closePath(); });
  crInk(g, [teeth], 0.4); g.fillStyle = '#f4ecd0'; g.fill(teeth);
  g.fillStyle = '#1a0a08'; g.beginPath(); g.arc(14.5, -11 - bob, 0.9, 0, 7); g.fill();
  g.fillStyle = '#ff6a4a'; g.beginPath(); g.arc(14.8, -11.3 - bob, 0.3, 0, 7); g.fill();
  g.fillStyle = '#7a3a34'; g.beginPath(); g.arc(20.4, -9.4 - bob, 0.8, 0, 7); g.fill();
  // ближние лапы
  for (const lx of [-9, 7]) { const s = Math.sin(ph + lx + 2); crLine(g, [lx, -4 - bob, lx + 1 + s * 1.5, -0.6], 2.4, skin); crLine(g, [lx + 1 + s * 1.5, -0.6, lx + 3 + s * 1.5, -0.3], 0.6, '#f2e6d0'); }
  g.restore();
}

// ---------- радскорпион ----------
function drawScorp(g, x, y, face, t, seed) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  crShadow(g, 22, 2.6);
  const ph = t * 12 + seed, base = '#8a5228', dark = '#4a2a14', plate = '#a8683a';
  for (let i = 0; i < 4; i++) { const s = Math.sin(ph + i * 1.3), lx = -10 + i * 6; crLine(g, [lx, -7, lx - 4 + s * 1.5, -9, lx - 7 + s * 2.5, 0], 1.2, dark); }
  // хвост из сегментов
  const sw = Math.sin(t * 3 + seed) * 2.5;
  const segs = []; let px = -15, py = -9;
  for (let i = 0; i < 6; i++) { const a = -Math.PI * 0.62 + i * 0.36 + sw * 0.02; px += Math.cos(a) * 5.2; py += Math.sin(a) * 5.2; segs.push([px, py, 3.4 - i * 0.25]); }
  const tail = segs.map(([sx, sy, r]) => ellP(sx, sy, r, r * 0.85));
  const [ex, ey] = segs[segs.length - 1];
  const sting = P2(p => { p.moveTo(ex - 2, ey); p.bezierCurveTo(ex + 2, ey - 5, ex + 7, ey - 2, ex + 6, ey + 4); p.bezierCurveTo(ex + 4, ey + 1, ex + 1, ey + 2, ex - 2, ey); p.closePath(); });
  const body = P2(p => { p.moveTo(-17, -6); p.bezierCurveTo(-18, -13, -8, -15, 2, -14); p.bezierCurveTo(10, -14, 15, -12, 16, -8); p.bezierCurveTo(16, -5, 10, -3, 0, -3.5); p.bezierCurveTo(-8, -3.5, -16, -3, -17, -6); p.closePath(); });
  const cl1 = P2(p => { p.moveTo(14, -9); p.bezierCurveTo(19, -12, 23, -10, 24, -8); p.lineTo(22, -6); p.bezierCurveTo(20, -8, 17, -7, 14, -6); p.closePath(); });
  const cc = Math.sin(t * 6 + seed) * 0.25;
  const pinA = P2(p => { p.ellipse(28, -8, 5.2, 3.4, -0.25 + cc, 0, Math.PI * 2); });
  const pinB = P2(p => { p.moveTo(31, -9); p.quadraticCurveTo(37, -12 - cc * 6, 36, -6); p.quadraticCurveTo(34, -7, 31, -7); p.closePath(); });
  crInk(g, [...tail, sting, body, cl1, pinA, pinB]);
  tail.forEach((p, i) => cel(g, p, i % 2 ? plate : base, { d: 1, h: 0.5, hic: '#e0a870' }));
  cel(g, sting, '#2a1a0c', { d: 0.6, h: 0.4 });
  g.save(); g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(ex + 4, ey + 1, 0, ex + 4, ey + 1, 9); gl.addColorStop(0, `rgba(190,255,80,${0.55 + 0.25 * Math.sin(t * 5)})`); gl.addColorStop(1, 'rgba(190,255,80,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(ex + 4, ey + 1, 9, 0, 7); g.fill(); g.restore();
  cel(g, body, base, { d: 1.8, h: 0.9, hic: '#e0a870', y0: -15, y1: -3 });
  g.save(); g.clip(body);
  g.strokeStyle = rgba(dark, 0.8); g.lineWidth = 0.6;
  for (let i = -12; i < 12; i += 4.5) { g.beginPath(); g.moveTo(i, -16); g.quadraticCurveTo(i + 1.5, -9, i, -2); g.stroke(); }
  g.restore();
  cel(g, cl1, plate, { d: 0.9, h: 0.5, hic: '#e0a870' });
  cel(g, pinA, base, { d: 1.2, h: 0.7, hic: '#e8b07a' });
  cel(g, pinB, plate, { d: 0.8, h: 0.5 });
  for (let i = 0; i < 4; i++) { const s = Math.sin(ph + i * 1.3 + Math.PI), lx = -8 + i * 6; crLine(g, [lx, -5, lx + 3 + s * 1.5, -7, lx + 6 + s * 2.5, 0], 1.3, '#6a3a1c'); }
  g.fillStyle = '#1a0a04'; g.beginPath(); g.arc(12, -10.5, 0.9, 0, 7); g.arc(9.5, -11, 0.8, 0, 7); g.fill();
  g.restore();
}

// ---------- когтистая тварь ----------
// утолщённый сегмент конечности между двумя точками
function segPath(x0, y0, x1, y1, r0, r1) {
  const a = Math.atan2(y1 - y0, x1 - x0), n = a + Math.PI / 2;
  const p = new Path2D();
  p.moveTo(x0 + Math.cos(n) * r0, y0 + Math.sin(n) * r0);
  p.lineTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
  p.arc(x1, y1, r1, n, n - Math.PI, true);
  p.lineTo(x0 - Math.cos(n) * r0, y0 - Math.sin(n) * r0);
  p.arc(x0, y0, r0, n + Math.PI, n, true);
  p.closePath();
  return p;
}
function crLimb(g, pts, rs, col, hic) {
  const segs = [];
  for (let i = 0; i < pts.length - 2; i += 2) segs.push(segPath(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], rs[i / 2], rs[i / 2 + 1]));
  crInk(g, segs);
  for (const p of segs) cel(g, p, col, { d: 1.2, h: 0.6, hic });
}
function drawBeast(g, x, y, face, t, seed, atk) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  crShadow(g, 20, 3.2);
  const ph = t * 5 + seed, s1 = Math.sin(ph), c1 = Math.cos(ph);
  const skin = '#57503a', belly = '#9a8a5e', far = '#3a3426', claw = '#f0e6c8';
  const bob = Math.abs(c1) * 1.2;
  const swing = atk ? Math.pow(Math.max(0, Math.sin(t * 6 + seed)), 2) : 0;
  // хвост
  crLimb(g, [-8, -24 - bob, -18, -18 + s1, -26, -9 + s1 * 2, -30, -3 + s1 * 2], [5, 3.6, 2.2, 1], far);
  // дальние конечности
  const lk = s1 * 4;
  crLimb(g, [-2, -26 - bob, 5 - lk, -15, -2 - lk, -6, 4 - lk, 0], [5.4, 4, 2.8, 2.2], far);
  crLimb(g, [6, -46 - bob, 12, -34 - bob, 20 + swing * 6, -30 + swing * 10 - bob], [4.2, 3.4, 2.6], far);
  // торс
  const body = P2(p => { p.moveTo(-9, -22 - bob); p.bezierCurveTo(-14, -36 - bob, -4, -52 - bob, 8, -52 - bob); p.bezierCurveTo(17, -52 - bob, 20, -42 - bob, 17, -34 - bob); p.bezierCurveTo(14, -26 - bob, 6, -20 - bob, -3, -19 - bob); p.closePath(); });
  const hy = -53 - bob;
  const head = P2(p => { p.moveTo(10, hy + 3); p.bezierCurveTo(12, hy - 5, 21, hy - 7, 27, hy - 2); p.lineTo(30, hy + 2); p.bezierCurveTo(27, hy + 4, 22, hy + 5, 18, hy + 5); p.bezierCurveTo(14, hy + 6, 10, hy + 6, 10, hy + 3); p.closePath(); });
  const jaw = 0.8 + swing * 3;
  const low = P2(p => { p.moveTo(16, hy + 5); p.lineTo(29, hy + 3 + jaw); p.lineTo(27, hy + 6 + jaw); p.bezierCurveTo(22, hy + 8 + jaw, 17, hy + 8, 14, hy + 6); p.closePath(); });
  const horn1 = P2(p => { p.moveTo(13, hy - 2); p.bezierCurveTo(9, hy - 10, 2, hy - 14, -4, hy - 13); p.bezierCurveTo(1, hy - 10, 6, hy - 6, 10, hy + 1); p.closePath(); });
  const horn2 = P2(p => { p.moveTo(18, hy - 4); p.bezierCurveTo(16, hy - 12, 11, hy - 17, 6, hy - 17); p.bezierCurveTo(10, hy - 13, 13, hy - 8, 15, hy - 2); p.closePath(); });
  crInk(g, [body, head, low, horn1, horn2]);
  cel(g, body, skin, { d: 2.6, sx: 0.8, h: 1.1, hic: '#a8986c', y0: -52, y1: -19 });
  g.save(); g.clip(body);
  const bp = P2(p => p.ellipse(11, -34 - bob, 6, 12, -0.45, 0, Math.PI * 2));
  cel(g, bp, belly, { d: 1.2, h: 0.5 });
  g.strokeStyle = 'rgba(40,30,16,.55)'; g.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(6 + i * 0.6, -44 + i * 3.6 - bob); g.quadraticCurveTo(11, -45 + i * 3.6 - bob, 16 - i * 0.4, -42 + i * 3.4 - bob); g.stroke(); }
  g.fillStyle = 'rgba(22,18,10,.4)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(-8 + ((i * 5.3) % 18), -46 + ((i * 7.1) % 24) - bob, 1.6, 1, 0.4, 0, 7); g.fill(); }
  g.restore();
  cel(g, head, skin, { d: 1.4, h: 0.7, hic: '#b0a070' });
  cel(g, low, '#3a3222', { d: 0.6, h: 0.3 });
  cel(g, horn1, '#e8dec2', { d: 1, h: 0.6 }); cel(g, horn2, '#d6caa8', { d: 1, h: 0.6 });
  g.fillStyle = claw;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(17 + i * 2.2, hy + 5.2); g.lineTo(18 + i * 2.2, hy + 7.4 + jaw * 0.4); g.lineTo(19 + i * 2.2, hy + 5); g.fill(); }
  g.save(); g.globalCompositeOperation = 'lighter';
  const eg = g.createRadialGradient(21, hy - 0.5, 0, 21, hy - 0.5, 6); eg.addColorStop(0, '#fff8b0'); eg.addColorStop(0.3, 'rgba(255,200,40,.85)'); eg.addColorStop(1, 'rgba(255,150,20,0)');
  g.fillStyle = eg; g.beginPath(); g.arc(21, hy - 0.5, 6, 0, 7); g.fill(); g.restore();
  // ближние конечности
  crLimb(g, [2, -25 - bob, 9 + lk, -15, 2 + lk, -6, 8 + lk, 0], [6, 4.4, 3, 2.4], skin, '#a8986c');
  const ax = 24 + swing * 10, ay = -30 + swing * 14 - bob;
  crLimb(g, [9, -45 - bob, 16 + swing * 4, -35 + swing * 8 - bob, ax, ay], [5, 4, 3], skin, '#a8986c');
  for (let i = 0; i < 3; i++) {
    const cp = P2(p => { p.moveTo(ax - 1.2, ay - 1 + i * 1.2); p.quadraticCurveTo(ax + 7 + i, ay - 2 + i * 2, ax + 9 + i, ay + 6 + i * 1.5); p.quadraticCurveTo(ax + 5 + i, ay + 2 + i * 1.6, ax - 0.6, ay + 1.4 + i * 1.2); p.closePath(); });
    crInk(g, [cp], 0.45); cel(g, cp, claw, { d: 0.5, h: 0.4 });
  }
  g.restore();
}

// ---------- питомцы ----------
function drawPet(g, pet, x, y, face, moving, t, s = 1) {
  const T = PET_TYPES.find(p => p.id === pet.type);
  if (!T || T.k === 'bird') return;
  g.save(); g.translate(x, y); g.scale(face * s, s);
  crShadow(g, 8, 1.6);
  const ph = t * 13, lg = moving ? Math.sin(ph) : 0;
  const c1 = T.c1, c2 = T.c2, far = cmul(c1, 0.72);
  if (T.k === 'cat') {
    const bob = moving ? Math.abs(Math.cos(ph)) * 0.4 : Math.sin(t * 2) * 0.15;
    const tw = Math.sin(t * 1.7 + x * 0.1) * 1.5;
    crLine(g, [-6, -7 - bob, -10, -9, -11 + tw * 0.3, -14, -9 + tw, -17], 1.4, c1);
    for (const [lx, o] of [[-4, 0], [4, 2]]) crLine(g, [lx, -5 - bob, lx + Math.sin(ph + o) * 1.4 - 0.4, 0], 1.3, far);
    const body = P2(p => { p.moveTo(-7, -6.5 - bob); p.bezierCurveTo(-7, -10 - bob, 5, -10.5 - bob, 6, -7.5 - bob); p.bezierCurveTo(6, -4.5 - bob, -6, -3.6 - bob, -7, -6.5 - bob); p.closePath(); });
    const head = P2(p => { p.ellipse(7.4, -10.2 - bob, 3.3, 2.9, 0, 0, Math.PI * 2); p.moveTo(5, -12 - bob); p.lineTo(5.3, -15.4 - bob); p.lineTo(7.2, -12.8 - bob); p.closePath(); p.moveTo(8, -12.8 - bob); p.lineTo(9.8, -15.2 - bob); p.lineTo(10.2, -11.8 - bob); p.closePath(); });
    crInk(g, [body, head]);
    cel(g, body, c1, { d: 1.2, h: 0.6 });
    g.save(); g.clip(body); g.fillStyle = rgba(c2, 0.55); for (let i = 0; i < 4; i++) g.fillRect(-5 + i * 2.8, -11, 1.1, 5); g.restore();
    cel(g, head, c1, { d: 0.9, h: 0.5 });
    g.fillStyle = '#2a4a1a'; g.beginPath(); g.ellipse(8.4, -10.6 - bob, 0.7, 0.85, 0, 0, 7); g.fill();
    g.fillStyle = '#c8ff6a'; g.beginPath(); g.ellipse(8.5, -10.7 - bob, 0.35, 0.6, 0, 0, 7); g.fill();
    g.fillStyle = '#e88a8a'; g.beginPath(); g.arc(10.6, -9.6 - bob, 0.45, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(10.2, -9.2 - bob); g.lineTo(13, -9.8 - bob); g.moveTo(10.2, -8.9 - bob); g.lineTo(13, -8.6 - bob); g.stroke();
    for (const [lx, o] of [[-5, Math.PI], [5, Math.PI + 2]]) crLine(g, [lx, -5 - bob, lx + Math.sin(ph + o) * 1.4, 0], 1.4, c1);
  } else {
    const small = T.id === 'dach', stocky = T.id === 'bull';
    const H = small ? 3.6 : stocky ? 5 : 6.5, L = small ? 9 : 7.5;
    const bob = moving ? Math.abs(Math.cos(ph)) * 0.6 : Math.sin(t * 2.4) * 0.2;
    const wag = Math.sin(t * (moving ? 14 : 9)) * 2.2;
    crLine(g, [-L + 0.5, -H - 2.5 - bob, -L - 3, -H - 5 + wag * 0.5, -L - 4.5, -H - 8 + wag], stocky ? 1.4 : 1.6, T.id === 'husky' ? c2 : c1);
    for (const [lx, o] of [[-L + 2, 0], [L - 2.5, 2]]) crLine(g, [lx, -H - bob, lx + Math.sin(ph + o) * 1.8, -H * 0.4, lx + Math.sin(ph + o) * 1.2 + 0.4, 0], small ? 1.5 : 1.8, far);
    const body = P2(p => { p.moveTo(-L, -H - 1 - bob); p.bezierCurveTo(-L, -H - 5 - bob, L - 2, -H - 5.5 - bob, L, -H - 2.5 - bob); p.bezierCurveTo(L + 1, -H + 1 - bob, L - 2, -H + 1.5 - bob, 0, -H + 1.4 - bob); p.bezierCurveTo(-L + 2, -H + 1.4 - bob, -L - 0.6, -H + 0.6 - bob, -L, -H - 1 - bob); p.closePath(); });
    const hx = L + 1.6, hy = -H - 5.5 - bob;
    const head = P2(p => { p.ellipse(hx, hy, stocky ? 3.6 : 3.1, stocky ? 3.2 : 2.9, 0, 0, Math.PI * 2); p.moveTo(hx + 1.5, hy - 1.2); p.bezierCurveTo(hx + 5.5, hy - 1.4, hx + (stocky ? 5 : 6.5), hy + 0.4, hx + (stocky ? 5 : 6.2), hy + 1.6); p.bezierCurveTo(hx + 5, hy + 2.6, hx + 2, hy + 2.6, hx + 1, hy + 2); p.closePath(); });
    const pointy = T.id === 'shep' || T.id === 'husky';
    const ear = pointy ? P2(p => { p.moveTo(hx - 1.4, hy - 1.8); p.lineTo(hx - 1.6, hy - 6); p.lineTo(hx + 1, hy - 2.6); p.closePath(); }) : P2(p => { p.ellipse(hx - 1.4, hy + 0.4, 1.3, 2.6, 0.3, 0, Math.PI * 2); });
    crInk(g, [body, head, ear]);
    cel(g, body, c1, { d: 1.4, h: 0.6 });
    g.save(); g.clip(body);
    if (T.id === 'shep' || T.id === 'husky') { g.fillStyle = c2; g.beginPath(); g.ellipse(-1, -H - 4.5 - bob, L * 0.8, 2.6, -0.05, 0, 7); g.fill(); }
    if (T.id === 'husky') { g.fillStyle = '#f4f4f0'; g.beginPath(); g.ellipse(2, -H + 0.2 - bob, L * 0.8, 2, 0, 0, 7); g.fill(); }
    if (T.id === 'bull') { g.fillStyle = rgba(c2, 0.5); g.beginPath(); g.arc(-2, -H - 2 - bob, 2.2, 0, 7); g.fill(); }
    g.restore();
    cel(g, head, c1, { d: 1, h: 0.5 });
    g.save(); g.clip(head);
    if (T.id === 'husky' || T.id === 'shep') { g.fillStyle = T.id === 'husky' ? '#f4f4f0' : cmix(c1, '#e8c890', 0.4); g.beginPath(); g.ellipse(hx + 3.5, hy + 1.2, 3.4, 1.6, 0, 0, 7); g.fill(); }
    if (T.id === 'shep') { g.fillStyle = c2; g.beginPath(); g.ellipse(hx + 5, hy, 2, 1.4, 0, 0, 7); g.fill(); }
    g.restore();
    cel(g, ear, pointy ? c1 : cmul(c1, 0.75), { d: 0.6, h: 0.3 });
    g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(hx + (stocky ? 5 : 6), hy + 0.6, 0.9, 0.75, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(hx + 1.4, hy - 0.8, 0.7, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + 1.6, hy - 1, 0.25, 0, 7); g.fill();
    if (!moving && Math.sin(t * 0.7) > 0.2) { g.fillStyle = '#e8606a'; g.beginPath(); g.ellipse(hx + 3.6, hy + 2.6, 0.8, 1.2, 0.2, 0, 7); g.fill(); }
    if (T.id === 'husky' || T.id === 'shep') { g.fillStyle = '#c23a2a'; g.fillRect(hx - 2.4, hy + 2.4, 3, 0.9); }
    for (const [lx, o] of [[-L + 3, Math.PI], [L - 1.5, Math.PI + 2]]) crLine(g, [lx, -H - bob, lx + Math.sin(ph + o) * 1.8, -H * 0.4, lx + Math.sin(ph + o) * 1.2 + 0.5, 0], small ? 1.6 : 1.9, c1);
  }
  g.restore();
}
function drawBird(g, pet, x, y, t) {
  const T = PET_TYPES.find(p => p.id === pet.type) || PET_TYPES[7];
  g.save(); g.translate(x, y);
  const bob = Math.sin(t * 4) * 0.4;
  const tail = P2(p => { p.moveTo(-1.6, 1 + bob); p.lineTo(-5.6, 8.4); p.lineTo(-3.4, 8.8); p.lineTo(0.2, 1.6 + bob); p.closePath(); });
  const body = ellP(0, -1 + bob, 2.8, 3.6, 0.35);
  const head = ellP(1.4, -4.8 + bob, 2.2, 2.1);
  const beak = P2(p => { p.moveTo(3.2, -5.2 + bob); p.quadraticCurveTo(5.6, -5 + bob, 4.8, -2.8 + bob); p.lineTo(3.2, -3.6 + bob); p.closePath(); });
  crInk(g, [tail, body, head, beak], 0.45);
  cel(g, tail, T.c2, { d: 0.5, h: 0.3 });
  cel(g, body, T.c1, { d: 0.9, h: 0.5 });
  g.save(); g.clip(body); g.fillStyle = T.c2; g.beginPath(); g.ellipse(-1, 0.5 + bob, 2.2, 3, 0.4, 0, 7); g.fill(); g.restore();
  cel(g, head, T.c1, { d: 0.6, h: 0.4 });
  cel(g, beak, T.id === 'cockatoo' ? '#3a3a3a' : '#f2e6c0', { d: 0.4, h: 0.2 });
  if (T.id === 'cockatoo') { g.fillStyle = T.c2; g.beginPath(); g.moveTo(0.4, -6.4 + bob); g.lineTo(-1.8, -10.4 + bob); g.lineTo(1.6, -6.8 + bob); g.fill(); }
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(2.2, -5.2 + bob, 0.5, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(2.35, -5.35 + bob, 0.18, 0, 7); g.fill();
  g.restore();
}
