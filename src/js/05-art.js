// ===== Художественный движок: цвет, материалы, запечённые комнаты =====
const ART = { k: 2, cache: new Map(), rockPat: null, dirtPat: null, concretePat: null };

// ---------- цвет ----------
const _rgbc = new Map();
function rgb(h) {
  let v = _rgbc.get(h);
  if (v) return v;
  let c = h.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgbc.set(h, v);
  return v;
}
function shade(hex, a) {
  let [r, g, b] = rgb(hex);
  if (a < 0) { r *= 1 + a; g *= 1 + a; b *= 1 + a; } else { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function rgba(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mixc(a, b, t) {
  const x = rgb(a), y = rgb(b);
  const c = i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

// ---------- шум ----------
function makeNoise(size, seed) {
  const rng = seeded(seed);
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const at2 = (x, y) => grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at2(x0, y0), b = at2(x0 + 1, y0), c = at2(x0, y0 + 1), d = at2(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
function texture(px, seed, colorFn) {
  const c = mkCanvas(px, px), g = c.getContext('2d');
  const img = g.createImageData(px, px);
  const n1 = makeNoise(8, seed), n2 = makeNoise(16, seed + 1), n3 = makeNoise(32, seed + 2), n4 = makeNoise(64, seed + 3), n5 = makeNoise(128, seed + 4);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const u = x / px, v = y / px;
    const f = n1(u * 8, v * 8) * 0.4 + n2(u * 16, v * 16) * 0.25 + n3(u * 32, v * 32) * 0.17 + n4(u * 64, v * 64) * 0.11 + n5(u * 128, v * 128) * 0.07;
    const r = Math.abs(n2(u * 16 + 3.3, v * 16 + 7.1) - 0.5);
    const col = colorFn(f, r, u, v);
    const i = (y * px + x) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function makeTextures() {
  const rockC = texture(512, 11, (f, r, u, v) => {
    const base = [84, 63, 46];
    const strata = 0.08 * Math.sin(v * Math.PI * 2 * 6 + f * 5);
    let k = 0.66 + f * 0.62 + strata;
    if (r < 0.009) k *= 0.72;
    else if (r < 0.018) k *= 0.9;
    const warm = f > 0.62 ? 12 : 0;
    return [base[0] * k + warm, base[1] * k + warm * 0.6, base[2] * k];
  });
  const rg = rockC.getContext('2d');
  const rng = seeded(99);
  for (let i = 0; i < 140; i++) { // галька
    const x = rng() * 512, y = rng() * 512, r = 2 + rng() * rng() * 12;
    for (const dx of [0, -512, 512]) for (const dy of [0, -512, 512]) {
      const gr = rg.createRadialGradient(x + dx - r * 0.3, y + dy - r * 0.3, r * 0.1, x + dx, y + dy, r);
      const tone = 60 + rng() * 60;
      gr.addColorStop(0, `rgba(${tone + 40},${tone + 25},${tone + 10},.55)`);
      gr.addColorStop(0.7, `rgba(${tone},${tone * 0.8},${tone * 0.6},.45)`);
      gr.addColorStop(1, 'rgba(20,14,10,0)');
      rg.fillStyle = gr;
      rg.beginPath(); rg.ellipse(x + dx, y + dy, r, r * (0.55 + rng() * 0.4), rng() * 3, 0, 7); rg.fill();
    }
  }
  ART.rockC = rockC;
  ART.dirtC = texture(256, 23, (f, r) => { const k = 0.7 + f * 0.6; return [120 * k, 92 * k, 62 * k - (r < 0.03 ? 20 : 0)]; });
  ART.concreteC = texture(256, 37, (f, r) => { const k = 0.8 + f * 0.35 - (r < 0.012 ? 0.25 : 0); return [118 * k, 114 * k, 106 * k]; });
  ART.metalC = texture(128, 51, f => { const k = 0.85 + f * 0.25; return [110 * k, 114 * k, 118 * k]; });
}
function worldPattern(canvas, worldSize) {
  const p = ctx.createPattern(canvas, 'repeat');
  try { if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(worldSize / canvas.width)); } catch (e) {}
  return p;
}
function patFor(g, canvas, worldSize) {
  const p = g.createPattern(canvas, 'repeat');
  try { if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(worldSize / canvas.width)); } catch (e) {}
  return p;
}

// ---------- примитивы ----------
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function hgrad(g, x0, x1, stops) { const gr = g.createLinearGradient(x0, 0, x1, 0); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function contact(g, cx, cy, w, a = 0.45) {
  g.save(); g.translate(cx, cy); g.scale(1, 0.2);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, 0, 7); g.fill(); g.restore();
}
// блок с передней и верхней гранью (лёгкая перспектива сверху)
function blk(g, x, by, w, h, d, col, o = {}) {
  const y = by - h;
  if (!o.noShadow) contact(g, x + w / 2, by + 1, w * 1.25, 0.5);
  if (d > 0) {
    g.fillStyle = shade(col, 0.22);
    poly(g, [x, y, x + w, y, x + w - d * 0.35, y - d, x + d * 0.35, y - d]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + d * 0.35, y - d, w - d * 0.7, 0.6);
  }
  g.fillStyle = vgrad(g, y, by, [shade(col, 0.06), col, shade(col, -0.3)]);
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, y, w, 0.7);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + w - 1, y, 1, h); g.fillRect(x, by - 0.8, w, 0.8);
}
function cylV(g, cx, by, r, h, col, o = {}) {
  const x = cx - r, y = by - h, e = r * 0.3;
  if (!o.noShadow) contact(g, cx, by + 1, r * 2.6, 0.5);
  g.fillStyle = hgrad(g, x, x + 2 * r, [shade(col, -0.45), shade(col, 0.1), shade(col, 0.42), col, shade(col, -0.2), shade(col, -0.55)]);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, by); g.ellipse(cx, by, r, e, 0, Math.PI, 0, true); g.lineTo(x + 2 * r, y); g.closePath(); g.fill();
  g.fillStyle = shade(col, 0.28); g.beginPath(); g.ellipse(cx, y, r, e, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.5; g.stroke();
}
function cylH(g, x, cy, w, r, col) {
  g.fillStyle = vgrad(g, cy - r, cy + r, [shade(col, 0.1), shade(col, 0.45), col, shade(col, -0.5)]);
  g.fillRect(x, cy - r, w, 2 * r);
}
function pipeH(g, x0, x1, y, r, col) {
  cylH(g, x0, y, x1 - x0, r, col);
  for (let x = x0 + 14; x < x1 - 6; x += 30) { g.fillStyle = shade(col, -0.35); g.fillRect(x, y - r - 0.6, 2.2, 2 * r + 1.2); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, y - r - 0.6, 0.6, 2 * r + 1.2); }
}
function pipeV(g, x, y0, y1, r, col) {
  g.fillStyle = hgrad(g, x - r, x + r, [shade(col, -0.45), shade(col, 0.4), col, shade(col, -0.5)]);
  g.fillRect(x - r, y0, 2 * r, y1 - y0);
}
function glassShine(g, x, y, w, h) {
  g.fillStyle = 'rgba(255,255,255,.22)';
  poly(g, [x + w * 0.15, y, x + w * 0.32, y, x + w * 0.12, y + h, x - w * 0.05, y + h]); g.fill();
}
function screenBox(g, x, y, w, h, col, A, flicker = true) {
  g.fillStyle = '#1c1e1f'; rr(g, x - 1.2, y - 1.2, w + 2.4, h + 2.4, 1.5); g.fill();
  g.fillStyle = vgrad(g, y, y + h, [shade(col, 0.2), col, shade(col, -0.5)]);
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let yy = y + 1; yy < y + h; yy += 1.5) g.fillRect(x, yy, w, 0.5);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, h * 0.35);
  if (A) { A.glow.push([x + w / 2, y + h / 2, Math.max(w, h) * 1.1, col, 0.35]); if (flicker) A.anc.push({ k: 'screen', x, y, w, h, col }); }
}
function lightDots(g, x, y, n, cols, A) {
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    g.fillStyle = c; g.beginPath(); g.arc(x + i * 3.2, y, 0.9, 0, 7); g.fill();
    if (A && i % 2 === 0) A.anc.push({ k: 'blink', x: x + i * 3.2, y, col: c, ph: i * 1.7 });
  }
}
function plant(g, x, by, s, col = '#4e8a3a', pot = '#9a5b3a') {
  blk(g, x - 4 * s, by, 8 * s, 6 * s, 1.2 * s, pot);
  const rng = seeded(Math.floor(x * 7 + by));
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.2, len = (7 + rng() * 8) * s;
    g.strokeStyle = shade(col, (rng() - 0.5) * 0.4); g.lineWidth = 2.2 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, by - 6 * s); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5, by - 6 * s + Math.sin(a) * len * 0.8, x + Math.cos(a) * len, by - 6 * s + Math.sin(a) * len); g.stroke();
  }
}
function poster(g, x, y, w, h, bg, fg, kind) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y + 1.2, w, h);
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.fillStyle = fg;
  if (kind === 'gear') { g.beginPath(); g.arc(x + w / 2, y + h * 0.42, w * 0.28, 0, 7); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(x + w / 2, y + h * 0.42, w * 0.12, 0, 7); g.fill(); g.fillStyle = fg; g.fillRect(x + w * 0.15, y + h * 0.78, w * 0.7, h * 0.08); }
  else if (kind === 'bolt') { g.save(); g.translate(x + w * 0.18, y + h * 0.12); g.scale(w / 34, h / 30); g.fill(icoPath('power')); g.restore(); }
  else if (kind === 'smile') { g.beginPath(); g.arc(x + w / 2, y + h * 0.45, w * 0.3, 0, 7); g.fill(); g.fillStyle = bg; g.fillRect(x + w * 0.38, y + h * 0.35, w * 0.06, h * 0.08); g.fillRect(x + w * 0.56, y + h * 0.35, w * 0.06, h * 0.08); g.beginPath(); g.arc(x + w / 2, y + h * 0.48, w * 0.16, 0.2, Math.PI - 0.2); g.lineWidth = 0.8; g.strokeStyle = bg; g.stroke(); }
  else { g.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.12); g.fillRect(x + w * 0.15, y + h * 0.45, w * 0.5, h * 0.08); g.fillRect(x + w * 0.15, y + h * 0.62, w * 0.6, h * 0.08); }
  g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x, y, w, h * 0.3);
}
function clock(g, x, y, r) {
  g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(x, y, r + 0.8, 0, 7); g.fill();
  g.fillStyle = '#f3ecd8'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - r * 0.7); g.moveTo(x, y); g.lineTo(x + r * 0.5, y + r * 0.2); g.stroke();
}
function crate(g, x, by, w, h, col) {
  blk(g, x, by, w, h, 2.5, col);
  g.strokeStyle = shade(col, -0.35); g.lineWidth = 0.8;
  g.strokeRect(x + 1, by - h + 1, w - 2, h - 2);
  g.beginPath(); g.moveTo(x + 1, by - h + 1); g.lineTo(x + w - 1, by - 1); g.stroke();
}
function barrel(g, cx, by, r, h, col) {
  cylV(g, cx, by, r, h, col);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx - r, by - h * 0.3, 2 * r, 1); g.fillRect(cx - r, by - h * 0.72, 2 * r, 1);
}
function hazard(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#e8b422'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1d1d1d';
  for (let i = -h; i < w; i += h * 1.6) { poly(g, [x + i, y + h, x + i + h * 0.8, y + h, x + i + h * 1.6, y, x + i + h * 0.8, y]); g.fill(); }
  g.restore();
}
function lamp(g, x, y, col, kind) { // потолочный светильник (рисуется после освещения)
  if (kind === 'pend') {
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x, y); g.stroke();
    g.fillStyle = '#3a3c3e'; poly(g, [x - 4.5, y + 3, x + 4.5, y + 3, x + 2, y, x - 2, y]); g.fill();
    g.fillStyle = '#fffbe8'; g.beginPath(); g.ellipse(x, y + 3.1, 3.4, 0.9, 0, 0, 7); g.fill();
  } else {
    g.fillStyle = '#2f3133'; g.fillRect(x - 9, y - 1.4, 18, 2.4);
    g.fillStyle = '#fffdf2'; g.fillRect(x - 8, y + 0.6, 16, 1.1);
  }
}

// ---------- темы комнат ----------
const THEME = {
  power:    { wall: '#6a6e61', wall2: '#484c42', side: '#55594e', floor: 'metal', fc: '#56585a', ceil: '#2c2d2a', light: '#ffd98a', acc: '#f2b705', lamp: 'strip' },
  diner:    { wall: '#efe3c6', wall2: '#3aa39b', side: '#d9ccae', floor: 'checker', fc: '#e9e4d8', fc2: '#262626', ceil: '#3c3a34', light: '#ffe0b0', acc: '#d8403a', lamp: 'pend' },
  water:    { wall: '#a8c3cc', wall2: '#557c8f', side: '#91adb7', floor: 'tile', fc: '#56707c', ceil: '#2b3438', light: '#c6ecff', acc: '#3aa7e0', lamp: 'strip' },
  living:   { wall: '#cfae80', wall2: '#6e4b31', side: '#b99a6f', floor: 'wood', fc: '#7a5234', ceil: '#3a2e25', light: '#ffc98a', acc: '#b5553a', lamp: 'pend', paper: '#c49f70' },
  storage:  { wall: '#857d68', wall2: '#5c5543', side: '#746c59', floor: 'concrete', fc: '#6e6a61', ceil: '#2f2c27', light: '#ffe0a0', acc: '#c9a13a', lamp: 'pend' },
  medbay:   { wall: '#e4f1ed', wall2: '#93c7ba', side: '#cfe0db', floor: 'tile', fc: '#bccbc6', ceil: '#48504e', light: '#f2fbff', acc: '#d9443a', lamp: 'strip' },
  science:  { wall: '#c3d6c9', wall2: '#557262', side: '#aec2b5', floor: 'tile', fc: '#5c6962', ceil: '#2a322d', light: '#dcffe8', acc: '#56e07a', lamp: 'strip' },
  overseer: { wall: '#7a5438', wall2: '#46301f', side: '#684630', floor: 'carpet', fc: '#6b1f27', ceil: '#2c2018', light: '#ffd9a0', acc: '#2f5ea8', lamp: 'pend', panel: true },
  radio:    { wall: '#43394f', wall2: '#2b2433', side: '#3a3144', floor: 'carpet', fc: '#2e2a34', ceil: '#1d1a22', light: '#e6c8ff', acc: '#ff4a4a', lamp: 'pend', foam: true },
  wshop:    { wall: '#83725a', wall2: '#524637', side: '#72634d', floor: 'metal', fc: '#4f4a43', ceil: '#2c261f', light: '#ffd08a', acc: '#e08a2a', lamp: 'pend' },
  oshop:    { wall: '#dcc8d4', wall2: '#8a5a73', side: '#c8b3c0', floor: 'wood', fc: '#8a6246', ceil: '#3a2c33', light: '#ffe6f0', acc: '#c04a7a', lamp: 'pend' },
  gym:      { wall: '#8d939a', wall2: '#4b5158', side: '#7c8288', floor: 'rubber', fc: '#2f3134', ceil: '#26282b', light: '#fff2d8', acc: '#e03a3a', lamp: 'strip' },
  athletic: { wall: '#a8c7ad', wall2: '#4f7058', side: '#95b39a', floor: 'court', fc: '#c18f4d', ceil: '#27302a', light: '#fffbe0', acc: '#ff8a2a', lamp: 'strip' },
  armory:   { wall: '#8e836c', wall2: '#5b5445', side: '#7d735f', floor: 'concrete', fc: '#6f6a60', ceil: '#2a2721', light: '#fff0c8', acc: '#e0402a', lamp: 'strip' },
  classroom:{ wall: '#dccda3', wall2: '#6f8a5a', side: '#c9ba90', floor: 'wood', fc: '#8c6844', ceil: '#3a3528', light: '#fff4d6', acc: '#2a4a2a', lamp: 'pend' },
  fitness:  { wall: '#eac0ae', wall2: '#9a5a4a', side: '#d6ab99', floor: 'rubber', fc: '#40393a', ceil: '#3a2c28', light: '#fff0e6', acc: '#ff6a5a', lamp: 'strip' },
  lounge:   { wall: '#7e3c4c', wall2: '#3c1d26', side: '#6c3240', floor: 'carpet', fc: '#4a1c26', ceil: '#241218', light: '#ffc88a', acc: '#f2b705', lamp: 'pend', paper: '#74364a' },
  gameroom: { wall: '#2f5260', wall2: '#1c3039', side: '#284651', floor: 'carpet', fc: '#233a44', ceil: '#141f24', light: '#bff2ff', acc: '#ff5ad0', lamp: 'pend' },
  barber:   { wall: '#ece6da', wall2: '#2a4a8a', side: '#d9d2c4', floor: 'checker', fc: '#efeae0', fc2: '#1f2b45', ceil: '#3a3a3e', light: '#ffffff', acc: '#d93a3a', lamp: 'pend' },
  reactor:  { wall: '#4f584d', wall2: '#2f362e', side: '#434b41', floor: 'metal', fc: '#3e4340', ceil: '#1f241f', light: '#baff9e', acc: '#5aff5a', lamp: 'strip' },
  garden:   { wall: '#94ad7e', wall2: '#4f6a3a', side: '#829b6d', floor: 'soil', fc: '#5a412a', ceil: '#27301f', light: '#ffc2ff', acc: '#7ad04a', lamp: 'grow' },
  purifier: { wall: '#86a4b0', wall2: '#40606d', side: '#76939f', floor: 'metal', fc: '#44545b', ceil: '#1f2a2f', light: '#a8ecff', acc: '#3ac7ff', lamp: 'strip' },
  cola:     { wall: '#ecdcc4', wall2: '#b3242e', side: '#d8c8b0', floor: 'checker', fc: '#efe7da', fc2: '#8e1c24', ceil: '#3a2a28', light: '#ffe4d4', acc: '#e02a3a', lamp: 'pend' },
  door:     { wall: '#666b6f', wall2: '#40454a', side: '#575c60', floor: 'metal', fc: '#4a4e52', ceil: '#232629', light: '#fff0c8', acc: '#f2b705', lamp: 'strip' },
};

function roomGeom(W, H) {
  const f = 6;
  const X0 = f, X1 = W - f, Y0 = f, Y1 = H - f - 1;
  return { f, X0, X1, Y0, Y1, bx0: X0 + 11, bx1: X1 - 11, by0: Y0 + 8, by1: Y1 - 17, W, H };
}

// ---------- кэш комнат ----------
function artFor(r) {
  const key = r.t === 'elev' ? 'elev|' + ART.k : r.t + '|' + r.s + '|' + r.l + '|' + ART.k;
  let a = ART.cache.get(key);
  if (!a) { a = buildRoomArt(r.t, r.s, r.l); ART.cache.set(key, a); }
  return a;
}
function buildRoomArt(t, s, l) {
  const k = ART.k;
  const W = t === 'door' ? DOOR_W * CW : t === 'elev' ? CW : s * 3 * CW, H = FH, pad = 14;
  const cv = mkCanvas((W + pad * 2) * k, (H + pad * 2) * k);
  const g = cv.getContext('2d');
  g.scale(k, k); g.translate(pad, pad);
  // мягкая тень в породе вокруг комнаты
  g.save();
  g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 12 * k; g.shadowOffsetY = 2 * k;
  g.fillStyle = '#0c0a08'; g.fillRect(0, 0, W, H);
  g.restore();
  const G = roomGeom(W, H);
  const A = { g, G, s, l, t, T: THEME[t] || THEME.door, anc: [], glow: [], lamps: [], rng: seeded(hashStr(t + s + l)) };
  if (t === 'elev') { elevArt(A); return { cv, pad, W, H, anc: A.anc, k }; }
  g.save();
  g.beginPath(); g.rect(G.X0, G.Y0, G.X1 - G.X0, G.Y1 - G.Y0); g.clip();
  shellInterior(A);
  (INTERIOR[t] || (() => {}))(A);
  bakeLight(A);
  for (const lp of A.lamps) lamp(g, lp[0], lp[1], A.T.light, lp[2]);
  g.restore();
  roomFrame(A);
  return { cv, pad, W, H, anc: A.anc, k };
}

// Коробка комнаты: задняя стена, пол и потолок в перспективе, боковые стены
function shellInterior(A) {
  const { g, G, T, l } = A;
  const { X0, X1, Y0, Y1, bx0, bx1, by0, by1 } = G;
  const bw = bx1 - bx0;
  // задняя стена
  g.fillStyle = vgrad(g, by0, by1, [shade(T.wall, 0.08), T.wall, shade(T.wall, -0.12)]);
  g.fillRect(bx0, by0, bw, by1 - by0);
  const wy = by0 + (by1 - by0) * 0.58;
  if (T.paper) { // обои
    g.fillStyle = rgba(T.paper, 0.55);
    for (let x = bx0 + 3; x < bx1; x += 7) g.fillRect(x, by0, 2.2, wy - by0);
    g.fillStyle = 'rgba(255,255,255,.08)';
    for (let x = bx0 + 6.5; x < bx1; x += 7) for (let y = by0 + 4; y < wy - 2; y += 8) { g.beginPath(); g.arc(x, y, 0.8, 0, 7); g.fill(); }
  } else if (T.foam) { // акустическая пена
    for (let x = bx0; x < bx1; x += 5) for (let y = by0; y < wy; y += 5) {
      g.fillStyle = ((x + y) / 5) % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.05)';
      poly(g, [x, y, x + 5, y, x + 2.5, y + 5]); g.fill();
    }
  } else if (T.panel) { // деревянные панели
    for (let x = bx0; x < bx1; x += 11) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, by0, 0.8, wy - by0); g.fillStyle = 'rgba(255,220,180,.08)'; g.fillRect(x + 0.8, by0, 0.6, wy - by0); }
  } else { // металлические/кафельные панели
    const step = (t => (t === 'medbay' || t === 'water' || t === 'science' || t === 'diner' || t === 'cola' || t === 'barber' ? 6 : 16))(A.t);
    g.fillStyle = 'rgba(0,0,0,.13)';
    for (let x = bx0 + step; x < bx1; x += step) g.fillRect(x, by0, 0.6, wy - by0);
    if (step === 6) for (let y = by0 + 6; y < wy; y += 6) g.fillRect(bx0, y, bw, 0.6);
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let x = bx0 + step + 0.6; x < bx1; x += step) g.fillRect(x, by0, 0.5, wy - by0);
    if (step === 16) { g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = bx0 + 3; x < bx1; x += 16) { g.beginPath(); g.arc(x, by0 + 2.5, 0.55, 0, 7); g.arc(x, wy - 2.5, 0.55, 0, 7); g.fill(); } }
  }
  // нижняя панель стены
  g.fillStyle = vgrad(g, wy, by1, [shade(T.wall2, 0.12), T.wall2, shade(T.wall2, -0.25)]);
  g.fillRect(bx0, wy, bw, by1 - wy);
  g.fillStyle = 'rgba(0,0,0,.14)';
  for (let x = bx0 + 8; x < bx1; x += 8) g.fillRect(x, wy + 2, 0.5, by1 - wy - 2);
  // молдинг
  g.fillStyle = shade(T.wall2, -0.35); g.fillRect(bx0, wy - 1.2, bw, 2.2);
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(bx0, wy - 1.2, bw, 0.6);
  if (l >= 2) { g.fillStyle = l === 3 ? '#d9b24a' : '#9aa3a8'; g.fillRect(bx0, wy + 1.5, bw, 0.9); }
  g.fillStyle = shade(T.wall2, -0.45); g.fillRect(bx0, by1 - 1.6, bw, 1.6);
  // потолок
  g.fillStyle = vgrad(g, Y0, by0, [shade(T.ceil, -0.3), T.ceil]);
  poly(g, [X0, Y0, X1, Y0, bx1, by0, bx0, by0]); g.fill();
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let x = X0 + 10; x < X1; x += 22) { const bx = bx0 + (x - X0) / (X1 - X0) * bw; g.beginPath(); g.moveTo(x, Y0); g.lineTo(bx, by0); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); }
  pipeH(g, bx0, bx1, by0 + 2.2, 1.3, '#7b7f80');
  // пол
  floorPlane(A);
  // боковые стены
  for (const side of [0, 1]) {
    const xa = side ? X1 : X0, xb = side ? bx1 : bx0;
    g.fillStyle = hgrad(g, xa, xb, [shade(T.side, -0.45), shade(T.side, -0.2)]);
    poly(g, [xa, Y0, xb, by0, xb, by1, xa, Y1]); g.fill();
    const wyf = Y0 + (Y1 - Y0) * 0.6;
    g.fillStyle = hgrad(g, xa, xb, [shade(T.wall2, -0.5), shade(T.wall2, -0.28)]);
    poly(g, [xa, wyf, xb, wy, xb, by1, xa, Y1]); g.fill();
    // дверной проём в соседнюю комнату
    const dx0 = xa + (xb - xa) * 0.15, dx1 = xa + (xb - xa) * 0.85;
    const top0 = wyf - 22, top1 = wy - 15;
    g.fillStyle = 'rgba(0,0,0,.5)';
    poly(g, [dx0, top0 + (top1 - top0) * 0.15, dx1, top0 + (top1 - top0) * 0.85, dx1, by1 + (Y1 - by1) * 0.15, dx0, Y1 - (Y1 - by1) * 0.15]); g.fill();
  }
  // ambient occlusion в углах
  const ao = (x0, y0, x1, y1, a) => { g.fillStyle = (x1 !== x0 ? hgrad(g, x0, x1, [`rgba(0,0,0,${a})`, 'rgba(0,0,0,0)']) : vgrad(g, y0, y1, [`rgba(0,0,0,${a})`, 'rgba(0,0,0,0)'])); };
  ao(bx0, 0, bx0 + 8, 0, 0.35); g.fillRect(bx0, by0, 8, by1 - by0);
  ao(bx1, 0, bx1 - 8, 0, 0.35); g.fillRect(bx1 - 8, by0, 8, by1 - by0);
  ao(0, by0, 0, by0 + 7, 0.4); g.fillRect(bx0, by0, bw, 7);
  g.fillStyle = vgrad(g, by1 - 5, by1, ['rgba(0,0,0,0)', 'rgba(0,0,0,.3)']); g.fillRect(bx0, by1 - 5, bw, 5);
  // светильники
  const n = Math.max(1, Math.round((X1 - X0) / 44));
  for (let i = 0; i < n; i++) {
    const x = X0 + ((i + 0.5) * (X1 - X0)) / n;
    A.lamps.push([x, T.lamp === 'pend' ? by0 + 3 : by0 - 1, T.lamp === 'grow' ? 'strip' : T.lamp]);
  }
}
function floorPlane(A) {
  const { g, G, T } = A;
  const { X0, X1, Y1, bx0, bx1, by1 } = G;
  const quad = (u0, u1, v0, v1) => { // u поперёк, v — вглубь (0 зад, 1 перед)
    const xl = (u, v) => bx0 + (X0 - bx0) * v + ((bx1 + (X1 - bx1) * v) - (bx0 + (X0 - bx0) * v)) * u;
    const y = v => by1 + (Y1 - by1) * v;
    return [xl(u0, v0), y(v0), xl(u1, v0), y(v0), xl(u1, v1), y(v1), xl(u0, v1), y(v1)];
  };
  const base = T.fc;
  g.fillStyle = vgrad(g, by1, Y1, [shade(base, -0.25), base, shade(base, 0.05)]);
  poly(g, [bx0, by1, bx1, by1, X1, Y1, X0, Y1]); g.fill();
  const rows = [0, 0.22, 0.48, 0.74, 1];
  const cols = Math.round((X1 - X0) / 11);
  if (T.floor === 'checker' || T.floor === 'tile') {
    for (let ri = 0; ri < 4; ri++) for (let c = 0; c < cols; c++) {
      if (T.floor === 'checker' && (ri + c) % 2 === 0) { g.fillStyle = vgrad(g, by1, Y1, [shade(T.fc2, -0.2), T.fc2]); poly(g, quad(c / cols, (c + 1) / cols, rows[ri], rows[ri + 1])); g.fill(); }
    }
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.4;
    for (let c = 1; c < cols; c++) { const q = quad(c / cols, c / cols, 0, 1); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[6], q[7]); g.stroke(); }
    for (const v of rows.slice(1, -1)) { const q = quad(0, 1, v, v); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke(); }
  } else if (T.floor === 'wood') {
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.4;
    for (let i = 1; i < 7; i++) { const v = i / 7; const q = quad(0, 1, v, v); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke(); }
    for (let i = 0; i < 7; i++) for (let c = (i % 2) * 0.5; c < cols; c += 2.3) { const q = quad(c / cols, c / cols, i / 7, (i + 1) / 7); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[6], q[7]); g.stroke(); }
    g.fillStyle = 'rgba(255,220,170,.06)'; poly(g, quad(0, 1, 0.5, 0.62)); g.fill();
  } else if (T.floor === 'metal') {
    g.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 5; i++) for (let c = 0; c < cols * 2; c++) { const q = quad((c + 0.2) / (cols * 2), (c + 0.5) / (cols * 2), (i + 0.3) / 5, (i + 0.55) / 5); poly(g, q); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.5;
    for (let c = 4; c < cols; c += 4) { const q = quad(c / cols, c / cols, 0, 1); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[6], q[7]); g.stroke(); }
  } else if (T.floor === 'carpet' || T.floor === 'rubber') {
    const rng = seeded(7);
    g.fillStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 90; i++) { const q = quad(rng(), rng() * 0.98 + 0.01, rng(), 1); g.fillRect(q[0], q[1], 0.6, 0.6); }
    if (T.floor === 'carpet') { g.strokeStyle = rgba(T.acc, 0.35); g.lineWidth = 0.7; const q = quad(0.04, 0.96, 0.2, 0.9); poly(g, q); g.stroke(); }
  } else if (T.floor === 'court') {
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.6;
    poly(g, quad(0.05, 0.95, 0.15, 0.9)); g.stroke();
    const q = quad(0.5, 0.5, 0.15, 0.9); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[6], q[7]); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.12)'; for (let c = 1; c < cols * 1.5; c++) { const qq = quad(c / (cols * 1.5), c / (cols * 1.5), 0, 1); g.beginPath(); g.moveTo(qq[0], qq[1]); g.lineTo(qq[6], qq[7]); g.stroke(); }
  } else if (T.floor === 'soil') {
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 1; i < 5; i++) { poly(g, quad(0, 1, i / 5 - 0.03, i / 5)); g.fill(); }
  } else if (T.floor === 'concrete') {
    g.fillStyle = patFor(g, ART.concreteC, 128); g.globalAlpha = 0.5; poly(g, [bx0, by1, bx1, by1, X1, Y1, X0, Y1]); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.5; const q = quad(0, 1, 0.5, 0.5); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke();
  }
  // блик у передней кромки
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X0, Y1 - 1, X1 - X0, 1);
}

// Запекание освещения: затемнение + конусы света + подсветка машин
function bakeLight(A) {
  const { g, G, T } = A;
  const { X0, X1, Y0, Y1, bx0, bx1, by0, by1 } = G;
  const W = X1 - X0, H = Y1 - Y0;
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = vgrad(g, Y0, Y1, ['#3a3a48', '#7c7a82', '#948f8a', '#6a6560']);
  g.fillRect(X0, Y0, W, H);
  g.fillStyle = hgrad(g, X0, X1, ['#5a5a66', '#ffffff', '#ffffff', '#5a5a66']);
  g.fillRect(X0, Y0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (const lp of A.lamps) {
    const x = lp[0], y = lp[1] + 3;
    // конус
    const cone = g.createLinearGradient(0, y, 0, Y1);
    cone.addColorStop(0, rgba(T.light, 0.2)); cone.addColorStop(0.7, rgba(T.light, 0.05)); cone.addColorStop(1, rgba(T.light, 0.02));
    g.fillStyle = cone;
    poly(g, [x - 4, y, x + 4, y, x + 24, Y1, x - 24, Y1]); g.fill();
    // пятно на стене
    const wr = g.createRadialGradient(x, by0 + 12, 1, x, by0 + 12, 32);
    wr.addColorStop(0, rgba(T.light, 0.26)); wr.addColorStop(1, rgba(T.light, 0));
    g.fillStyle = wr; g.fillRect(x - 32, by0, 64, by1 - by0);
    // пятно на полу
    g.save(); g.translate(x, (by1 + Y1) / 2 + 2); g.scale(1, 0.28);
    const pr = g.createRadialGradient(0, 0, 1, 0, 0, 30);
    pr.addColorStop(0, rgba(T.light, 0.34)); pr.addColorStop(1, rgba(T.light, 0));
    g.fillStyle = pr; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.restore();
    // ореол у лампы
    const br = g.createRadialGradient(x, y, 0, x, y, 12);
    br.addColorStop(0, rgba(T.light, 0.7)); br.addColorStop(1, rgba(T.light, 0));
    g.fillStyle = br; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
  }
  for (const [x, y, r, col, a] of A.glow) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.restore();
}
function roomFrame(A) {
  const { g, G } = A;
  const { W, H, f } = G;
  const conc = patFor(g, ART.concreteC, 90);
  g.save();
  g.beginPath(); g.rect(0, 0, W, H); g.rect(G.X0, G.Y0, G.X1 - G.X0, G.Y1 - G.Y0); g.clip('evenodd');
  g.fillStyle = '#5b5750'; g.fillRect(0, 0, W, H);
  g.fillStyle = conc; g.globalAlpha = 0.8; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  g.fillStyle = vgrad(g, 0, H, ['rgba(255,255,255,.12)', 'rgba(0,0,0,.05)', 'rgba(0,0,0,.35)']); g.fillRect(0, 0, W, H);
  // стальная балка пола
  g.fillStyle = vgrad(g, G.Y1, H, ['#6d6f6f', '#3b3c3d', '#1f2021']); g.fillRect(0, G.Y1, W, H - G.Y1);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, G.Y1, W, 0.6);
  g.fillStyle = 'rgba(0,0,0,.45)';
  for (let x = 6; x < W; x += 14) { g.beginPath(); g.arc(x, G.Y1 + 3.2, 0.7, 0, 7); g.fill(); }
  // верхняя балка
  g.fillStyle = vgrad(g, 0, f, ['#77796f', '#4a4b46']); g.fillRect(0, 0, W, f - 1);
  g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 8; x < W; x += 16) { g.beginPath(); g.arc(x, 2.6, 0.65, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, W, 0.6);
  g.restore();
  // внутренняя кромка
  g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1; g.strokeRect(G.X0 + 0.5, G.Y0 + 0.5, G.X1 - G.X0 - 1, G.Y1 - G.Y0 - 1);
  g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 0.8; g.strokeRect(0.4, 0.4, W - 0.8, H - 0.8);
}
function elevArt(A) {
  const { g } = A;
  const W = CW, H = FH;
  g.fillStyle = '#26282a'; g.fillRect(0, 0, W, H);
  g.fillStyle = patFor(g, ART.concreteC, 90); g.globalAlpha = 0.5; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  // шахта
  g.fillStyle = vgrad(g, 0, H, ['#1a1c1e', '#2a2d30', '#1a1c1e']); g.fillRect(4, 0, W - 8, H);
  g.fillStyle = hgrad(g, 4, W - 4, ['rgba(0,0,0,.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.6)']); g.fillRect(4, 0, W - 8, H);
  // направляющие
  for (const x of [8, W - 10]) { g.fillStyle = hgrad(g, x, x + 2, ['#4a4d50', '#9aa0a4', '#3a3c3e']); g.fillRect(x, 0, 2, H); }
  g.fillStyle = 'rgba(0,0,0,.5)'; for (let y = 6; y < H; y += 12) { g.fillRect(7, y, 4, 1); g.fillRect(W - 11, y, 4, 1); }
  // тросы
  g.strokeStyle = '#555'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(W / 2 - 2, 0); g.lineTo(W / 2 - 2, H); g.moveTo(W / 2 + 2, 0); g.lineTo(W / 2 + 2, H); g.stroke();
  // перекрытие этажа
  g.fillStyle = vgrad(g, H - 7, H, ['#6d6f6f', '#2a2b2c']); g.fillRect(0, H - 7, W, 7);
  g.fillStyle = vgrad(g, 0, 5, ['#77796f', '#4a4b46']); g.fillRect(0, 0, W, 5);
  hazard(g, 4, H - 9, W - 8, 2);
  g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 0.8; g.strokeRect(0.4, 0.4, W - 0.8, H - 0.8);
}

// ---------- интерьеры ----------
function sections(A) { const { G, s } = A; const w = (G.bx1 - G.bx0) / s; const out = []; for (let i = 0; i < s; i++) out.push([G.bx0 + i * w, G.bx0 + (i + 1) * w]); return out; }
const INTERIOR = {
  power(A) {
    const { g, G, l } = A;
    const b = G.by1 + 2;
    pipeH(g, G.bx0, G.bx1, G.by0 + 7, 1.6, '#8a6a3a');
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const cx = x0 + w * (0.27 + i * 0.46);
        blk(g, cx - 15, b, 30, 6, 3, '#3b3e40');
        cylV(g, cx, b - 6, 11, 26, '#8f9496');
        // медные обмотки
        for (let yy = 0; yy < 5; yy++) { g.fillStyle = hgrad(g, cx - 11, cx + 11, ['#6a3a14', '#d88a3a', '#f0b060', '#b8662a', '#5a2e10']); g.fillRect(cx - 11, b - 10 - yy * 4, 22, 2.4); }
        g.fillStyle = '#2a2c2e'; g.fillRect(cx - 3, b - 36, 6, 4);
        A.glow.push([cx, b - 18, 16, '#ffcf5a', 0.25]);
        A.anc.push({ k: 'coil', x: cx, y: b - 18, r: 14 });
        if (l >= 2) { g.fillStyle = '#e8b422'; g.fillRect(cx - 11, b - 31, 22, 1.4); }
      }
      // пульт
      const px = x0 + w * 0.5;
      blk(g, px - 6, b, 12, 18, 2, '#4d5256');
      screenBox(g, px - 4, b - 15, 8, 5, '#6aff9a', A);
      lightDots(g, px - 3.5, b - 7, 3, ['#ff4a3a', '#ffd84a', '#6aff6a'], A);
      poster(g, x0 + w * 0.46, G.by0 + 5, 9, 11, '#e8b422', '#1d1d1d', 'bolt');
    }
    hazard(g, G.bx0, G.by1 - 3, G.bx1 - G.bx0, 2.2);
  },
  reactor(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      blk(g, cx - 20, b, 40, 5, 3, '#3a3f3a');
      cylV(g, cx, b - 5, 14, 34, '#6c7a6c');
      g.fillStyle = vgrad(g, b - 36, b - 8, ['#d8ffc0', '#6aff5a', '#1f8a2a']);
      rr(g, cx - 6, b - 34, 12, 26, 5); g.fill();
      glassShine(g, cx - 6, b - 34, 12, 26);
      for (let yy = 0; yy < 4; yy++) { g.fillStyle = '#2c342c'; g.fillRect(cx - 14, b - 12 - yy * 7, 28, 1.6); }
      A.glow.push([cx, b - 22, 34, '#7aff5a', 0.45]);
      A.anc.push({ k: 'core', x: cx, y: b - 22, r: 30 });
      pipeV(g, cx - 18, G.by0 + 4, b - 6, 2, '#8a8f88'); pipeV(g, cx + 18, G.by0 + 4, b - 6, 2, '#8a8f88');
      blk(g, x0 + 3, b, 10, 20, 2, '#44494c'); screenBox(g, x0 + 4.5, b - 17, 7, 5, '#ffd84a', A);
      blk(g, x1 - 13, b, 10, 20, 2, '#44494c'); lightDots(g, x1 - 11.5, b - 12, 3, ['#6aff6a', '#ff4a3a'], A);
      poster(g, cx - 5, G.by0 + 3, 10, 7, '#e8b422', '#1d1d1d', 'gear');
    }
    hazard(g, G.bx0, G.by1 - 3, G.bx1 - G.bx0, 2.2);
  },
  diner(A) {
    const { g, G, l } = A;
    const b = G.by1 + 2;
    const secs = sections(A);
    secs.forEach(([x0, x1], si) => {
      const w = x1 - x0;
      if (si === 0) {
        // стойка и кухня
        blk(g, x0 + 2, b, w * 0.42, 15, 3, '#c9c3b2');
        g.fillStyle = '#d8403a'; g.fillRect(x0 + 2, b - 15, w * 0.42, 2);
        g.fillStyle = '#b8b8b8'; g.fillRect(x0 + 4, b - 26, 14, 9); g.fillStyle = '#2a2a2a'; g.fillRect(x0 + 5, b - 25, 12, 5);
        A.glow.push([x0 + 11, b - 22, 10, '#ff8a3a', 0.35]);
        cylV(g, x0 + 24, b - 15, 3, 5, '#9aa0a4', { noShadow: true });
        A.anc.push({ k: 'steam', x: x0 + 24, y: b - 21 });
        // меню-доска
        g.fillStyle = '#1f2a26'; g.fillRect(x0 + 3, G.by0 + 4, 26, 12);
        g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 4; i++) g.fillRect(x0 + 6, G.by0 + 6.5 + i * 2.4, 12 + (i % 2) * 5, 0.7);
      }
      // столики со стульями
      const tables = si === 0 ? [0.72] : [0.28, 0.72];
      for (const tx of tables) {
        const cx = x0 + w * tx;
        blk(g, cx - 12, b, 5, 11, 1, '#b82f2f');
        blk(g, cx + 7, b, 5, 11, 1, '#b82f2f');
        g.fillStyle = '#8a8a8a'; g.fillRect(cx - 0.8, b - 11, 1.6, 11);
        blk(g, cx - 9, b - 11, 18, 2, 3, '#e9e4d8', { noShadow: true });
        g.fillStyle = '#d84a3a'; g.beginPath(); g.arc(cx - 3, b - 15, 1.6, 0, 7); g.fill();
        g.fillStyle = '#f2d06a'; g.beginPath(); g.arc(cx + 3, b - 15, 1.3, 0, 7); g.fill();
      }
      // автомат с газировкой
      if (si === secs.length - 1) {
        blk(g, x1 - 13, b, 11, 30, 2, '#c22a2a');
        g.fillStyle = '#f4e9d0'; g.fillRect(x1 - 11, b - 27, 7, 8);
        A.glow.push([x1 - 7.5, b - 23, 10, '#ff6a5a', 0.3]);
        g.fillStyle = '#222'; g.fillRect(x1 - 11, b - 14, 7, 4);
      }
      poster(g, x0 + w * 0.5 - 6, G.by0 + 4, 12, 9, '#f2c531', '#c22a2a', 'smile');
    });
    if (l >= 2) { g.fillStyle = '#d8403a'; g.fillRect(G.bx0, G.by1 - 22, G.bx1 - G.bx0, 1); }
  },
  garden(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 3; i++) {
        const cx = x0 + w * (0.18 + i * 0.32);
        blk(g, cx - 12, b, 24, 7, 3, '#6a4a2a');
        g.fillStyle = '#3a2a18'; g.fillRect(cx - 11, b - 7, 22, 1.5);
        const rng = seeded(Math.floor(cx * 13));
        for (let p = 0; p < 7; p++) {
          const px = cx - 9 + p * 3, h = 8 + rng() * 10;
          g.strokeStyle = '#3f7a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, b - 7); g.lineTo(px, b - 7 - h); g.stroke();
          g.fillStyle = p % 2 ? '#6fbf3a' : '#4f9a2e';
          g.beginPath(); g.ellipse(px - 1.5, b - 7 - h * 0.6, 2.4, 1.2, -0.5, 0, 7); g.ellipse(px + 1.5, b - 7 - h * 0.8, 2.4, 1.2, 0.5, 0, 7); g.fill();
          if (rng() < 0.4) { g.fillStyle = ['#e0402a', '#f2c531', '#ff8a2a'][p % 3]; g.beginPath(); g.arc(px, b - 7 - h, 1.4, 0, 7); g.fill(); }
        }
      }
      // полка с лампами роста
      g.fillStyle = '#3a3a3a'; g.fillRect(x0 + 4, G.by0 + 5, w - 8, 2);
      g.fillStyle = '#ff9aff'; g.fillRect(x0 + 6, G.by0 + 7, w - 12, 1);
      A.glow.push([(x0 + x1) / 2, G.by0 + 12, w * 0.5, '#ff7aff', 0.25]);
      pipeH(g, x0 + 2, x1 - 2, G.by1 - 6, 1, '#6a8a9a');
    }
  },
  water(A) {
    const { g, G, l } = A;
    const b = G.by1 + 2;
    pipeH(g, G.bx0, G.bx1, G.by0 + 6, 2, '#6f8c9a');
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const cx = x0 + w * (0.28 + i * 0.44);
        blk(g, cx - 13, b, 26, 4, 2, '#4a5a62');
        // стеклянный бак
        g.fillStyle = 'rgba(40,70,90,.55)'; rr(g, cx - 11, b - 38, 22, 34, 7); g.fill();
        g.fillStyle = vgrad(g, b - 30, b - 4, ['#6fd0ff', '#2a8ad0', '#16508a']); rr(g, cx - 10, b - 30, 20, 26, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(cx - 10, b - 30, 20, 0.8);
        glassShine(g, cx - 11, b - 38, 22, 34);
        g.strokeStyle = '#8fa9b4'; g.lineWidth = 1.2; rr(g, cx - 11, b - 38, 22, 34, 7); g.stroke();
        g.fillStyle = '#566a72'; g.fillRect(cx - 12, b - 40, 24, 3);
        A.glow.push([cx, b - 18, 18, '#4ac0ff', 0.3]);
        A.anc.push({ k: 'bubbles', x: cx - 9, y: b - 29, w: 18, h: 24 });
        pipeV(g, cx, G.by0 + 7, b - 40, 1.4, '#6f8c9a');
      }
      blk(g, x0 + w * 0.5 - 4, b, 8, 14, 2, '#3f4e56');
      g.fillStyle = '#c22a2a'; g.beginPath(); g.arc(x0 + w * 0.5, b - 16, 2.4, 0, 7); g.fill();
      screenBox(g, x0 + w * 0.5 - 3, b - 12, 6, 4, '#6fd0ff', A);
    }
    if (l >= 3) { g.fillStyle = '#d9b24a'; g.fillRect(G.bx0, G.by0 + 3, G.bx1 - G.bx0, 0.8); }
  },
  purifier(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    pipeH(g, G.bx0, G.bx1, G.by0 + 5, 3, '#5f7f8c');
    pipeH(g, G.bx0, G.bx1, G.by1 - 8, 2, '#5f7f8c');
    for (const [x0, x1] of sections(A)) {
      const cx = (x0 + x1) / 2;
      cylV(g, cx, b, 20, 38, '#8aa6b2');
      g.fillStyle = vgrad(g, b - 30, b - 8, ['#8fe4ff', '#1f8ad0']); rr(g, cx - 8, b - 30, 16, 20, 3); g.fill();
      glassShine(g, cx - 8, b - 30, 16, 20);
      A.glow.push([cx, b - 20, 28, '#3ac7ff', 0.4]);
      A.anc.push({ k: 'bubbles', x: cx - 7, y: b - 29, w: 14, h: 18 });
      for (const sx of [x0 + 10, x1 - 10]) { cylV(g, sx, b, 6, 22, '#6f8c9a'); g.fillStyle = '#d23a2a'; g.beginPath(); g.arc(sx, b - 24, 1.8, 0, 7); g.fill(); }
    }
  },
  living(A) {
    const { g, G, l } = A;
    const b = G.by1 + 2;
    const secs = sections(A);
    secs.forEach(([x0, x1], si) => {
      const w = x1 - x0;
      // двухъярусная кровать
      const bx = x0 + 4;
      g.fillStyle = '#5a3a24'; g.fillRect(bx, b - 30, 2, 30); g.fillRect(bx + 32, b - 30, 2, 30);
      for (const yy of [b - 6, b - 20]) {
        blk(g, bx + 1, yy, 32, 3, 2, '#6a4a30', { noShadow: yy !== b - 6 });
        g.fillStyle = '#e8e2d2'; rr(g, bx + 2, yy - 6, 30, 3.4, 1.5); g.fill();
        g.fillStyle = ['#3a64a8', '#a83a3a', '#5a8a3a'][(si + (yy < b - 10 ? 1 : 0)) % 3]; rr(g, bx + 10, yy - 6.2, 22, 3.6, 1.5); g.fill();
        g.fillStyle = '#fbf6ea'; rr(g, bx + 3, yy - 7.5, 7, 2.8, 1.2); g.fill();
      }
      // тумбочка с лампой
      blk(g, bx + 37, b, 9, 10, 2, '#7a5234');
      g.fillStyle = '#2a2a2a'; g.fillRect(bx + 41, b - 16, 1, 6);
      g.fillStyle = '#f2d8a0'; poly(g, [bx + 38, b - 16, bx + 45, b - 16, bx + 43.5, b - 20, bx + 39.5, b - 20]); g.fill();
      A.glow.push([bx + 41.5, b - 17, 12, '#ffcf8a', 0.45]);
      // диван, торшер, картина
      const sx = x0 + w * 0.56;
      blk(g, sx, b, 30, 8, 2, '#8a3a2a');
      g.fillStyle = '#9a4a36'; rr(g, sx - 1, b - 16, 32, 9, 2.5); g.fill();
      g.fillStyle = '#7a2e22'; rr(g, sx - 2, b - 11, 4, 11, 1.5); g.fill(); rr(g, sx + 28, b - 11, 4, 11, 1.5); g.fill();
      g.fillStyle = '#e8c86a'; rr(g, sx + 5, b - 13, 6, 5, 1.5); g.fill();
      poster(g, sx + 6, G.by0 + 5, 18, 12, '#6a8aa8', '#e8d8b0', 'text');
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 0.8; g.strokeRect(sx + 6, G.by0 + 5, 18, 12);
      if (si === secs.length - 1) plant(g, x1 - 6, b, 1);
      if (l >= 2) { g.fillStyle = '#8a3a3a'; g.save(); g.translate(sx + 15, b + 6); g.scale(1, 0.25); g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.restore(); }
      if (l >= 3) { g.fillStyle = '#2a2a2a'; blk(g, x0 + w * 0.47, b, 8, 12, 2, '#5a4030'); screenBox(g, x0 + w * 0.47 + 1, b - 11, 6, 5, '#9ad0ff', A); }
    });
  },
  storage(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const sx = x0 + 3 + i * (w * 0.5);
        const sw = w * 0.42;
        g.fillStyle = '#4a4a44'; g.fillRect(sx, b - 38, 1.6, 38); g.fillRect(sx + sw - 1.6, b - 38, 1.6, 38);
        for (const yy of [b - 13, b - 26, b - 38]) {
          blk(g, sx, yy + 2, sw, 2, 2, '#6a6a60', { noShadow: true });
        }
        const rng = seeded(Math.floor(sx * 3));
        for (const yy of [b - 13, b - 26]) {
          let cx = sx + 2;
          while (cx < sx + sw - 8) {
            const cw = 5 + rng() * 6, ch = 6 + rng() * 5;
            if (rng() < 0.5) crate(g, cx, yy, cw, ch, ['#a8844a', '#8a6a3a', '#6a7a4a'][Math.floor(rng() * 3)]);
            else barrel(g, cx + cw / 2, yy, cw / 2.4, ch, ['#3a5a8a', '#8a3a2a', '#5a6a3a'][Math.floor(rng() * 3)]);
            cx += cw + 1.5;
          }
        }
        crate(g, sx + 2, b, 12, 10, '#a8844a');
        crate(g, sx + 15, b, 9, 8, '#8f7040');
      }
    }
  },
  medbay(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const bx = x0 + 4 + i * w * 0.5;
        // кровать
        g.fillStyle = '#9aa3a8'; g.fillRect(bx, b - 10, 1.4, 10); g.fillRect(bx + 26, b - 10, 1.4, 10); g.fillRect(bx, b - 18, 1.4, 8);
        blk(g, bx, b - 8, 28, 3, 2, '#c9d3d6', { noShadow: true });
        g.fillStyle = '#ffffff'; rr(g, bx + 1, b - 12, 26, 4, 1.5); g.fill();
        g.fillStyle = '#8ac8ff'; rr(g, bx + 9, b - 12.3, 18, 4.3, 1.5); g.fill();
        contact(g, bx + 14, b + 1, 36);
        // капельница и монитор
        g.fillStyle = '#9aa3a8'; g.fillRect(bx + 31, b - 30, 1, 30);
        g.fillStyle = 'rgba(200,240,255,.7)'; rr(g, bx + 29.5, b - 30, 4, 6, 1.5); g.fill();
        screenBox(g, bx + 33, b - 28, 8, 6, '#1f3a2a', A, false);
        A.anc.push({ k: 'ecg', x: bx + 33, y: b - 28, w: 8, h: 6 });
      }
      // шкаф с крестом
      blk(g, x0 + w * 0.5 - 7, b, 14, 26, 2, '#e8efee');
      g.fillStyle = '#d9443a'; g.fillRect(x0 + w * 0.5 - 1.2, b - 22, 2.4, 8); g.fillRect(x0 + w * 0.5 - 4, b - 19.2, 8, 2.4);
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(x0 + w * 0.5, b - 12); g.lineTo(x0 + w * 0.5, b - 1); g.stroke();
    }
  },
  science(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      blk(g, x0 + 3, b, w * 0.55, 14, 3, '#6a767a');
      g.fillStyle = '#2a3a34'; g.fillRect(x0 + 3, b - 14, w * 0.55, 1.5);
      const cols = ['#5aff7a', '#ff5ad0', '#5ac8ff', '#ffd84a'];
      for (let i = 0; i < 5; i++) {
        const fx = x0 + 8 + i * (w * 0.1);
        const c = cols[i % 4];
        g.fillStyle = 'rgba(220,240,240,.55)';
        if (i % 2) { g.beginPath(); g.moveTo(fx - 1, b - 22); g.lineTo(fx + 1, b - 22); g.lineTo(fx + 3.5, b - 15.5); g.lineTo(fx - 3.5, b - 15.5); g.closePath(); g.fill(); g.fillStyle = c; g.beginPath(); g.moveTo(fx - 2.4, b - 18); g.lineTo(fx + 2.4, b - 18); g.lineTo(fx + 3.3, b - 15.6); g.lineTo(fx - 3.3, b - 15.6); g.fill(); }
        else { g.fillRect(fx - 1.2, b - 23, 2.4, 7.5); g.fillStyle = c; g.fillRect(fx - 1.2, b - 19, 2.4, 3.5); }
        A.glow.push([fx, b - 18, 6, c, 0.4]);
      }
      // компьютер-шкаф
      const cx = x0 + w * 0.68;
      blk(g, cx, b, 16, 32, 2, '#c9ccc4');
      for (let i = 0; i < 2; i++) { g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(cx + 5 + i * 6, b - 26, 2.6, 0, 7); g.fill(); g.fillStyle = '#6a6a6a'; g.beginPath(); g.arc(cx + 5 + i * 6, b - 26, 1, 0, 7); g.fill(); }
      A.anc.push({ k: 'reels', x: cx + 5, y: b - 26 });
      lightDots(g, cx + 3, b - 18, 4, ['#ff4a3a', '#6aff6a', '#ffd84a'], A);
      screenBox(g, cx + 3, b - 14, 10, 6, '#6aff9a', A);
      blk(g, x1 - 10, b, 7, 16, 2, '#8a969a');
      g.fillStyle = '#5aff7a'; g.fillRect(x1 - 9, b - 12, 5, 3); A.glow.push([x1 - 6.5, b - 10.5, 8, '#5aff7a', 0.45]);
    }
  },
  overseer(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0, cx = G.bx0 + W / 2;
    // стена мониторов
    for (let i = -2; i <= 2; i++) screenBox(g, cx + i * 13 - 5.5, G.by0 + 4 + (Math.abs(i) === 2 ? 3 : 0), 11, 8, i % 2 ? '#4fe08a' : '#6ac8ff', A);
    // флаг и карта
    g.fillStyle = '#6a4a2a'; g.fillRect(G.bx0 + 6, b - 34, 1, 34);
    g.fillStyle = '#2f5ea8'; g.fillRect(G.bx0 + 7, b - 34, 11, 7); g.fillStyle = '#f2c531'; g.beginPath(); g.arc(G.bx0 + 12.5, b - 30.5, 1.8, 0, 7); g.fill();
    g.fillStyle = '#d8c89a'; g.fillRect(G.bx1 - 24, G.by0 + 5, 18, 13);
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 0.6; g.strokeRect(G.bx1 - 24, G.by0 + 5, 18, 13);
    g.fillStyle = '#c23a2a'; g.beginPath(); g.arc(G.bx1 - 16, G.by0 + 10, 1, 0, 7); g.arc(G.bx1 - 11, G.by0 + 13, 1, 0, 7); g.fill();
    // шкаф с документами
    blk(g, G.bx1 - 16, b, 12, 24, 2, '#7a7f84');
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 3; i++) g.fillRect(G.bx1 - 13, b - 20 + i * 7, 6, 1);
    // стол
    blk(g, cx - 22, b + 3, 44, 13, 3, '#5a3a22');
    g.fillStyle = '#3a2414'; g.fillRect(cx - 22, b - 8, 44, 1);
    blk(g, cx - 8, b - 10, 16, 8, 1.5, '#b8b4a4', { noShadow: true });
    screenBox(g, cx - 6, b - 17.5, 12, 6, '#4fe08a', A);
    g.fillStyle = '#e8d8a0'; g.fillRect(cx + 11, b - 11.5, 6, 1.5);
    g.fillStyle = '#c22a2a'; g.beginPath(); g.arc(cx - 15, b - 12, 1.5, 0, 7); g.fill();
    plant(g, G.bx0 + 14, b, 0.9);
  },
  radio(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      // стойка передатчика
      blk(g, x0 + 3, b, 16, 34, 2, '#3a3d42');
      for (let i = 0; i < 4; i++) { g.fillStyle = '#23252a'; g.fillRect(x0 + 5, b - 31 + i * 7, 12, 5); lightDots(g, x0 + 6.5, b - 28.5 + i * 7, 3, ['#6aff6a', '#ffd84a', '#ff4a3a'], A); }
      // микшер
      blk(g, x0 + w * 0.35, b, w * 0.4, 12, 4, '#4a4450');
      g.fillStyle = '#2a262e'; g.fillRect(x0 + w * 0.35, b - 12, w * 0.4, 2.5);
      for (let i = 0; i < 8; i++) { g.fillStyle = '#bbb'; g.fillRect(x0 + w * 0.37 + i * (w * 0.045), b - 14, 1.2, 3); }
      screenBox(g, x0 + w * 0.42, b - 26, 14, 8, '#ffc84a', A);
      A.anc.push({ k: 'vu', x: x0 + w * 0.42, y: b - 26, w: 14, h: 8 });
      // микрофон
      const mx = x1 - 12;
      g.fillStyle = '#2a2a2a'; g.fillRect(mx, b - 22, 1.2, 22); g.fillRect(mx - 4, b - 1, 9, 1.2);
      g.fillStyle = '#9aa0a8'; rr(g, mx - 2.2, b - 28, 5.6, 7, 2.5); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 3; i++) g.fillRect(mx - 1.8, b - 26.5 + i * 1.8, 4.8, 0.5);
      // колонка
      blk(g, x1 - 25, b, 9, 16, 2, '#2a2830');
      g.fillStyle = '#1a181e'; g.beginPath(); g.arc(x1 - 20.5, b - 10, 3.2, 0, 7); g.arc(x1 - 20.5, b - 3.5, 1.8, 0, 7); g.fill();
    }
    // табло «В ЭФИРЕ»
    const cx = (G.bx0 + G.bx1) / 2;
    g.fillStyle = '#1a1010'; rr(g, cx - 13, G.by0 + 2, 26, 8, 1.5); g.fill();
    A.anc.push({ k: 'onair', x: cx - 12, y: G.by0 + 3, w: 24, h: 6 });
  },
  wshop(A) {
    const { g, G, l } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0;
    // перфопанель с инструментами
    g.fillStyle = '#b89a6a'; g.fillRect(G.bx0 + 8, G.by0 + 4, W * 0.5, 18);
    g.fillStyle = 'rgba(0,0,0,.3)'; for (let x = G.bx0 + 10; x < G.bx0 + 8 + W * 0.5; x += 3) for (let y = G.by0 + 6; y < G.by0 + 21; y += 3) g.fillRect(x, y, 0.5, 0.5);
    g.fillStyle = '#4a4d52';
    for (let i = 0; i < 6; i++) { const x = G.bx0 + 13 + i * (W * 0.075); g.fillRect(x, G.by0 + 7, 1.4, 10); g.beginPath(); g.arc(x + 0.7, G.by0 + 7, 1.8, 0, 7); g.fill(); }
    // оружейная стойка
    g.fillStyle = '#5a4430'; g.fillRect(G.bx1 - 36, G.by0 + 5, 30, 20);
    g.fillStyle = '#23252a';
    for (let i = 0; i < 3; i++) { g.save(); g.translate(G.bx1 - 33, G.by0 + 8 + i * 6); g.scale(1.05, 0.55); g.fill(icoPath('gun')); g.restore(); }
    // верстак
    blk(g, G.bx0 + 6, b, W * 0.62, 13, 4, '#6a5238');
    g.fillStyle = '#3a3a3a'; g.fillRect(G.bx0 + 6, b - 13, W * 0.62, 1.6);
    g.fillStyle = '#56595e'; rr(g, G.bx0 + 12, b - 18, 8, 5, 1); g.fill();
    g.fillStyle = '#23252a'; g.save(); g.translate(G.bx0 + W * 0.35, b - 20); g.scale(0.9, 0.6); g.fill(icoPath('gun')); g.restore();
    A.anc.push({ k: 'spark', x: G.bx0 + W * 0.33, y: b - 15 });
    // наковальня/тиски и ящик
    blk(g, G.bx1 - 30, b, 12, 9, 2, '#3a3c40');
    crate(g, G.bx1 - 15, b, 11, 10, '#8a6a3a');
    if (l >= 2) { g.fillStyle = '#e8b422'; g.fillRect(G.bx0 + 6, b - 11, W * 0.62, 0.8); }
  },
  oshop(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0;
    // рулоны ткани
    for (let i = 0; i < 5; i++) cylH(g, G.bx0 + 6, G.by0 + 7 + i * 4, 22, 1.7, ['#c04a7a', '#3a6aa8', '#e8c86a', '#5a8a3a', '#e8e0d0'][i]);
    // манекены
    for (let i = 0; i < 2; i++) {
      const cx = G.bx0 + W * (0.45 + i * 0.22);
      g.fillStyle = '#3a3a3a'; g.fillRect(cx - 0.6, b - 10, 1.2, 10); g.fillRect(cx - 5, b - 1, 10, 1);
      g.fillStyle = ['#2a4a8a', '#8a2a4a'][i]; rr(g, cx - 5.5, b - 27, 11, 17, 3.5); g.fill();
      g.fillStyle = '#d8c8b0'; g.beginPath(); g.arc(cx, b - 30, 3, 0, 7); g.fill();
    }
    // швейная машинка на столе
    blk(g, G.bx0 + 6, b, 28, 12, 3, '#8a6246');
    g.fillStyle = '#1f1f24'; rr(g, G.bx0 + 12, b - 20, 14, 5, 2); g.fill(); g.fillRect(G.bx0 + 12, b - 20, 3, 8);
    g.fillStyle = '#d9b24a'; g.fillRect(G.bx0 + 16, b - 18, 6, 0.8);
    blk(g, G.bx1 - 14, b, 11, 22, 2, '#dcd2c4');
    g.fillStyle = '#b8a8d8'; g.fillRect(G.bx1 - 12, b - 19, 7, 8);
  },
  gym(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    // зеркало
    g.fillStyle = vgrad(g, G.by0 + 3, G.by1 - 10, ['#b8d0e0', '#6a8aa0']); g.fillRect(G.bx0 + 8, G.by0 + 3, G.bx1 - G.bx0 - 16, 16);
    glassShine(g, G.bx0 + 20, G.by0 + 3, 20, 16);
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      // скамья со штангой
      const cx = x0 + w * 0.3;
      g.fillStyle = '#3a3a3a'; g.fillRect(cx - 12, b - 22, 1.4, 22); g.fillRect(cx + 12, b - 22, 1.4, 22);
      blk(g, cx - 10, b - 4, 22, 3, 2, '#2a2a2a', { noShadow: true }); contact(g, cx, b + 1, 30);
      g.fillStyle = '#b8b8b8'; g.fillRect(cx - 16, b - 21, 34, 1.3);
      g.fillStyle = '#1e1e1e'; rr(g, cx - 17, b - 25, 3, 9, 1); g.fill(); rr(g, cx + 15, b - 25, 3, 9, 1); g.fill();
      // стойка гантелей
      blk(g, x0 + w * 0.6, b, 20, 8, 2, '#4a4a4a');
      for (let i = 0; i < 4; i++) { g.fillStyle = '#1e1e1e'; g.fillRect(x0 + w * 0.6 + 2 + i * 4.5, b - 11, 3.2, 3); }
      // боксёрская груша
      const px = x1 - 8;
      g.fillStyle = '#2a2a2a'; g.fillRect(px - 0.4, G.by0 + 1, 0.8, 8);
      g.fillStyle = '#b8302a'; rr(g, px - 4, G.by0 + 9, 8, 22, 3.5); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(px - 3, G.by0 + 11, 1.2, 18);
      A.anc.push({ k: 'bag', x: px, y: G.by0 + 1 });
    }
  },
  athletic(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const tx = x0 + 4 + i * w * 0.5;
        blk(g, tx, b, 30, 4, 3, '#2a2c2e');
        g.fillStyle = '#1a1a1a'; g.fillRect(tx + 1, b - 4.5, 28, 1);
        g.fillStyle = '#4a4d52'; g.fillRect(tx + 26, b - 26, 2, 22);
        blk(g, tx + 22, b - 22, 9, 6, 2, '#3a3d42', { noShadow: true });
        screenBox(g, tx + 23.5, b - 27, 6, 3.5, '#ffb04a', A);
      }
      // баскетбольное кольцо
      g.fillStyle = '#f4f4f4'; g.fillRect(x0 + w * 0.46, G.by0 + 3, 12, 9);
      g.strokeStyle = '#e04a2a'; g.lineWidth = 0.8; g.strokeRect(x0 + w * 0.46 + 3, G.by0 + 6, 6, 4);
      g.strokeStyle = '#ff6a2a'; g.beginPath(); g.ellipse(x0 + w * 0.46 + 6, G.by0 + 13, 4, 1, 0, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x0 + w * 0.46 + 2.5 + i * 2.5, G.by0 + 13); g.lineTo(x0 + w * 0.46 + 4 + i * 1.3, G.by0 + 18); g.stroke(); }
    }
  },
  armory(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      // мишени
      for (let i = 0; i < 2; i++) {
        const cx = x0 + w * (0.3 + i * 0.4), cy = G.by0 + 18;
        g.fillStyle = '#6a5a44'; g.fillRect(cx - 0.6, cy, 1.2, b - cy);
        g.fillStyle = '#efe8d8'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill();
        g.fillStyle = '#c22a2a'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
        g.fillStyle = '#efe8d8'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
        g.fillStyle = '#c22a2a'; g.beginPath(); g.arc(cx, cy, 2.8, 0, 7); g.fill();
        g.fillStyle = '#222'; g.beginPath(); g.arc(cx + 2, cy - 3, 0.6, 0, 7); g.arc(cx - 4, cy + 2, 0.6, 0, 7); g.fill();
      }
      // стойки-перегородки
      blk(g, x0 + 2, b, 4, 16, 2, '#5a5344'); blk(g, x1 - 6, b, 4, 16, 2, '#5a5344');
      g.fillStyle = '#e8b422'; g.fillRect(x0, b - 3, w, 1.2);
    }
  },
  classroom(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0;
    // доска
    g.fillStyle = '#6a4a2a'; g.fillRect(G.bx0 + 6, G.by0 + 3, W * 0.5 + 2, 21);
    g.fillStyle = '#23402f'; g.fillRect(G.bx0 + 7, G.by0 + 4, W * 0.5, 19);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(G.bx0 + 11, G.by0 + 9); g.lineTo(G.bx0 + 30, G.by0 + 9); g.moveTo(G.bx0 + 11, G.by0 + 13); g.lineTo(G.bx0 + 24, G.by0 + 13);
    g.arc(G.bx0 + W * 0.4, G.by0 + 13, 4, 0, 7); g.moveTo(G.bx0 + W * 0.4 - 4, G.by0 + 13); g.lineTo(G.bx0 + W * 0.4 + 4, G.by0 + 13); g.stroke();
    // книжный шкаф
    blk(g, G.bx1 - 22, b, 18, 34, 2, '#6a4a2a');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { g.fillStyle = ['#8a2a2a', '#2a4a8a', '#3a6a3a', '#c9a13a', '#5a3a6a'][(r * 6 + i) % 5]; g.fillRect(G.bx1 - 20 + i * 2.6, b - 31 + r * 10, 2.2, 8); }
    // парты
    for (let i = 0; i < Math.max(2, A.s * 2); i++) {
      const dx = G.bx0 + 10 + i * ((W - 40) / Math.max(2, A.s * 2));
      blk(g, dx, b, 14, 8, 2.5, '#9a7a4a');
      g.fillStyle = '#6a5a3a'; g.fillRect(dx + 16, b - 9, 1.2, 9);
    }
    // глобус
    const gx = G.bx1 - 30;
    g.fillStyle = '#6a4a2a'; g.fillRect(gx - 0.5, b - 10, 1, 10); g.fillRect(gx - 3, b - 1, 6, 1);
    g.fillStyle = '#3a7ac0'; g.beginPath(); g.arc(gx, b - 14, 4.5, 0, 7); g.fill();
    g.fillStyle = '#5a9a4a'; g.beginPath(); g.ellipse(gx - 1, b - 15, 2, 1.4, 0.4, 0, 7); g.ellipse(gx + 2, b - 12.5, 1.2, 1, 0, 0, 7); g.fill();
  },
  fitness(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      for (let i = 0; i < 2; i++) {
        const cx = x0 + w * (0.22 + i * 0.36);
        g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(cx - 7, b - 4, 4, 0, 7); g.arc(cx + 8, b - 4, 4, 0, 7); g.fill();
        g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(cx - 7, b - 4, 1.2, 0, 7); g.arc(cx + 8, b - 4, 1.2, 0, 7); g.fill();
        g.strokeStyle = '#d84a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 7, b - 4); g.lineTo(cx, b - 14); g.lineTo(cx + 8, b - 4); g.moveTo(cx, b - 14); g.lineTo(cx + 5, b - 22); g.stroke();
        g.fillStyle = '#1a1a1a'; rr(g, cx - 3, b - 16, 7, 2.4, 1); g.fill();
        g.fillRect(cx + 3, b - 24, 5, 1.4);
        contact(g, cx, b + 1, 26);
      }
      // коврики и фитбол
      g.fillStyle = '#5ab0a0'; g.save(); g.translate(x1 - 16, b + 4); g.scale(1, 0.3); rr(g, -12, -8, 24, 16, 3); g.fill(); g.restore();
      g.fillStyle = vgrad(g, b - 14, b, ['#ff9a8a', '#d84a3a']); g.beginPath(); g.arc(x1 - 8, b - 6, 6, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(x1 - 10, b - 8.5, 2, 0, 7); g.fill();
    }
  },
  lounge(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const secs = sections(A);
    secs.forEach(([x0, x1], si) => {
      const w = x1 - x0;
      if (si === 0) {
        // бар
        blk(g, x0 + 3, b, 34, 16, 3, '#5a2a1c');
        g.fillStyle = '#d9b24a'; g.fillRect(x0 + 3, b - 16, 34, 1);
        g.fillStyle = '#3a1810'; g.fillRect(x0 + 5, G.by0 + 10, 30, 1.5); g.fillRect(x0 + 5, G.by0 + 20, 30, 1.5);
        for (let i = 0; i < 8; i++) { g.fillStyle = ['#3a8a4a', '#8a3a2a', '#c9a13a', '#5a3a8a'][i % 4]; rr(g, x0 + 6 + i * 3.5, G.by0 + 3 + (i % 2), 2.4, 7, 1); g.fill(); }
        for (let i = 0; i < 8; i++) { g.fillStyle = ['#c9a13a', '#3a5a8a', '#8a2a2a'][i % 3]; rr(g, x0 + 6 + i * 3.5, G.by0 + 13, 2.4, 7, 1); g.fill(); }
        A.glow.push([x0 + 20, G.by0 + 14, 20, '#ffb04a', 0.3]);
      }
      // диван и кресла
      const sx = x0 + w * (si === 0 ? 0.52 : 0.1);
      blk(g, sx, b, 34, 8, 2, '#c9a13a');
      g.fillStyle = '#d8b04a'; rr(g, sx - 1, b - 17, 36, 10, 3); g.fill();
      g.fillStyle = '#a8842a'; rr(g, sx - 2, b - 11, 4, 11, 1.5); g.fill(); rr(g, sx + 32, b - 11, 4, 11, 1.5); g.fill();
      if (si > 0 || secs.length === 1) {
        // музыкальный автомат
        const jx = x1 - 16;
        blk(g, jx, b, 13, 26, 2, '#8a2a1c');
        g.fillStyle = vgrad(g, b - 26, b - 12, ['#ffd84a', '#ff6a2a']); rr(g, jx + 1.5, b - 25, 10, 12, 5); g.fill();
        A.glow.push([jx + 6.5, b - 18, 16, '#ff9a3a', 0.45]);
        A.anc.push({ k: 'glow', x: jx + 6.5, y: b - 18, r: 14, col: '#ff7aff', ph: 1 });
      }
      poster(g, x0 + w * 0.55, G.by0 + 5, 16, 11, '#1a1a2a', '#e8c86a', 'text');
    });
  },
  gameroom(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      // бильярд
      const cx = x0 + w * 0.35;
      g.fillStyle = '#3a2412'; g.fillRect(cx - 17, b - 9, 2, 9); g.fillRect(cx + 15, b - 9, 2, 9);
      blk(g, cx - 19, b - 8, 38, 4, 5, '#2f7a4a', { noShadow: true }); contact(g, cx, b + 1, 44);
      g.fillStyle = '#5a3a1c'; g.fillRect(cx - 19, b - 8, 38, 1.3);
      for (let i = 0; i < 5; i++) { g.fillStyle = ['#f4f4f4', '#e0402a', '#f2c531', '#2a4aa8', '#1a1a1a'][i]; g.beginPath(); g.arc(cx - 8 + i * 4, b - 12.5, 1.1, 0, 7); g.fill(); }
      g.strokeStyle = '#c9a06a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(cx + 6, b - 12); g.lineTo(cx + 18, b - 18); g.stroke();
      // игровой автомат
      const ax = x1 - 17;
      blk(g, ax, b, 14, 32, 2, '#2a1a4a');
      screenBox(g, ax + 2, b - 28, 10, 9, '#ff5ad0', A);
      g.fillStyle = '#1a1030'; g.fillRect(ax + 1, b - 16, 12, 4);
      g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(ax + 4, b - 14, 1, 0, 7); g.fill(); g.fillStyle = '#3aff6a'; g.beginPath(); g.arc(ax + 8, b - 14, 1, 0, 7); g.fill();
      A.glow.push([ax + 7, b - 24, 18, '#ff5ad0', 0.35]);
      // дартс
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x0 + w * 0.62, G.by0 + 12, 6, 0, 7); g.fill();
      g.fillStyle = '#e0402a'; g.beginPath(); g.arc(x0 + w * 0.62, G.by0 + 12, 4, 0, 7); g.fill();
      g.fillStyle = '#f2e8c8'; g.beginPath(); g.arc(x0 + w * 0.62, G.by0 + 12, 2.3, 0, 7); g.fill();
      g.fillStyle = '#2a8a3a'; g.beginPath(); g.arc(x0 + w * 0.62, G.by0 + 12, 0.8, 0, 7); g.fill();
    }
  },
  barber(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0;
    for (let i = 0; i < 2; i++) {
      const cx = G.bx0 + W * (0.28 + i * 0.4);
      // зеркало
      g.fillStyle = '#c9a13a'; rr(g, cx - 9, G.by0 + 3, 18, 20, 8); g.fill();
      g.fillStyle = vgrad(g, G.by0 + 4, G.by0 + 22, ['#d8eef8', '#7a9ab0']); rr(g, cx - 8, G.by0 + 4, 16, 18, 7); g.fill();
      glassShine(g, cx - 6, G.by0 + 4, 10, 18);
      // кресло
      g.fillStyle = '#9aa0a4'; g.fillRect(cx - 1, b - 6, 2, 6); g.fillRect(cx - 5, b - 1.4, 10, 1.4);
      g.fillStyle = '#a8261e'; rr(g, cx - 7, b - 14, 14, 7, 2); g.fill(); rr(g, cx - 6, b - 24, 12, 11, 3); g.fill();
      g.fillStyle = '#d9d9d9'; g.fillRect(cx - 8, b - 13, 2, 1.2); g.fillRect(cx + 6, b - 13, 2, 1.2);
      contact(g, cx, b + 1, 20);
    }
    // полосатый столб
    const px = G.bx1 - 8;
    g.fillStyle = '#e8e8e8'; rr(g, px - 2.5, G.by0 + 8, 5, 22, 2.5); g.fill();
    g.save(); rr(g, px - 2.5, G.by0 + 8, 5, 22, 2.5); g.clip();
    for (let y = G.by0 + 4; y < G.by0 + 32; y += 5) { g.fillStyle = y % 10 < 5 ? '#d93a3a' : '#2a4a9a'; poly(g, [px - 3, y + 3, px + 3, y, px + 3, y + 2, px - 3, y + 5]); g.fill(); }
    g.restore();
    A.anc.push({ k: 'pole', x: px, y: G.by0 + 8 });
    blk(g, G.bx0 + 4, b, 12, 14, 2, '#e8e2d6');
    g.fillStyle = '#5a8aa8'; g.fillRect(G.bx0 + 6, b - 18, 2.4, 4); g.fillStyle = '#e8b42a'; g.fillRect(G.bx0 + 10, b - 17, 2.4, 3);
  },
  cola(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    for (const [x0, x1] of sections(A)) {
      const w = x1 - x0;
      // чаны
      cylV(g, x0 + 14, b - 12, 10, 26, '#c82a34');
      g.fillStyle = '#f4f0e6'; g.beginPath(); g.ellipse(x0 + 14, b - 28, 6, 3.6, 0, 0, 7); g.fill();
      g.fillStyle = '#c82a34'; g.font = `bold 3.5px ${FONT_D}`; g.textAlign = 'center'; g.fillText('АТОМ', x0 + 14, b - 26.8);
      g.fillStyle = '#5a5a5a'; g.fillRect(x0 + 5, b - 12, 2, 12); g.fillRect(x0 + 21, b - 12, 2, 12);
      A.glow.push([x0 + 14, b - 26, 18, '#ff4a5a', 0.3]);
      // конвейер
      blk(g, x0 + 28, b - 8, w - 32, 3, 2, '#3a3a3a', { noShadow: true });
      g.fillStyle = '#5a5a5a'; for (let x = x0 + 30; x < x1 - 6; x += 12) g.fillRect(x, b - 8, 1.5, 8);
      contact(g, (x0 + 28 + x1) / 2, b + 1, w - 20);
      A.anc.push({ k: 'belt', x: x0 + 29, y: b - 11, w: w - 34 });
      pipeV(g, x0 + 32, G.by0 + 4, b - 20, 1.4, '#9aa0a4');
      g.fillStyle = '#9aa0a4'; rr(g, x0 + 28, b - 22, 9, 4, 1); g.fill();
    }
  },
  door(A) {
    const { g, G } = A;
    const b = G.by1 + 2;
    const W = G.bx1 - G.bx0;
    // пульт управления дверью
    const px = G.bx0 + W * 0.62;
    blk(g, px, b, 22, 18, 3, '#4a4f55');
    screenBox(g, px + 3, b - 15, 9, 6, '#6aff9a', A);
    lightDots(g, px + 14, b - 13, 2, ['#ff4a3a', '#ffd84a'], A);
    g.fillStyle = '#c22a2a'; g.fillRect(px + 16, b - 9, 1.6, 6); g.beginPath(); g.arc(px + 16.8, b - 9.5, 1.6, 0, 7); g.fill();
    // шкафчики охраны
    blk(g, G.bx1 - 18, b, 14, 30, 2, '#5a6a5a');
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(G.bx1 - 11.5, b - 29, 0.6, 28);
    for (let i = 0; i < 3; i++) g.fillRect(G.bx1 - 16, b - 26 + i * 2, 3, 0.6);
    // жёлто-чёрная разметка
    hazard(g, G.bx0, G.by1 - 3, W, 2.2);
    poster(g, px + 2, G.by0 + 4, 16, 10, '#f2b705', '#1d1d1d', 'gear');
  },
};

// Ячейка двери: большая шестерня
function drawGearDoor(g, cx, cy, rad, rot, vault) {
  g.save(); g.translate(cx, cy); g.rotate(rot);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8 * Cam.dpr * Cam.z; g.shadowOffsetX = 2 * Cam.dpr * Cam.z;
  g.fillStyle = '#7d8284';
  g.beginPath();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2;
    const t0 = a0 + 0.06, t1 = a1 - 0.06;
    g.lineTo(Math.cos(a0) * rad * 0.9, Math.sin(a0) * rad * 0.9);
    g.lineTo(Math.cos(t0) * rad, Math.sin(t0) * rad);
    g.lineTo(Math.cos(t1) * rad, Math.sin(t1) * rad);
    g.lineTo(Math.cos(a1) * rad * 0.9, Math.sin(a1) * rad * 0.9);
  }
  g.closePath(); g.fill();
  g.shadowColor = 'transparent';
  const gr = g.createRadialGradient(-rad * 0.3, -rad * 0.35, rad * 0.1, 0, 0, rad);
  gr.addColorStop(0, '#d9dcdc'); gr.addColorStop(0.6, '#9ba0a2'); gr.addColorStop(1, '#5d6264');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad * 0.86, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = rad * 0.02; g.beginPath(); g.arc(0, 0, rad * 0.86, 0, 7); g.stroke();
  // болты
  g.fillStyle = '#4a4e50';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * rad * 0.78, Math.sin(a) * rad * 0.78, rad * 0.028, 0, 7); g.fill(); }
  // жёлтое кольцо и синий центр
  const yg = g.createRadialGradient(-rad * 0.2, -rad * 0.25, rad * 0.05, 0, 0, rad * 0.66);
  yg.addColorStop(0, '#ffe07a'); yg.addColorStop(1, '#c98f14');
  g.fillStyle = yg; g.beginPath(); g.arc(0, 0, rad * 0.66, 0, 7); g.fill();
  const bg = g.createRadialGradient(-rad * 0.15, -rad * 0.2, rad * 0.05, 0, 0, rad * 0.52);
  bg.addColorStop(0, '#4f8ad8'); bg.addColorStop(1, '#1d4585');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, rad * 0.52, 0, 7); g.fill();
  g.fillStyle = '#ffd24a'; g.font = `700 ${rad * 0.5}px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(vault, 0, rad * 0.04);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(-rad * 0.25, -rad * 0.35, rad * 0.45, rad * 0.2, -0.5, 0, 7); g.fill();
  g.restore();
}
