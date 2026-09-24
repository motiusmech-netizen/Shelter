// ===== Жители: вырезная анимация (cut-out) с запечёнными атласами частей тела =====
// Каждая внешность (кожа, причёска, одежда, головной убор) один раз рисуется в атлас: туловище, голова,
// бедро/голень, плечо/предплечье (ближние и дальние), глаза и рты с разными эмоциями. В кадре части
// ставятся по суставам скелета. Контур рисуется отдельным проходом, поэтому силуэт цельный, без швов.
const INK_C = '#1c130e';
const CHR = { atl: new Map(), ow: 0.6, bakes: 0 };
const HIP_Y = -17.2, THIGH = 8.4, SHIN = 8.8, UARM = 7.0, FARM = 5.7;

// ---------- цвет ----------
function hexOf(r, g, b) { const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
function cmix(a, b, t) { const x = rgb(a), y = rgb(b); return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
function cdk(a, k) { return cmix(a, '#1d1830', k); }      // тень — темнее и холоднее
function clt(a, k) { return cmix(a, '#fff6e2', k); }      // свет — светлее и теплее
function cmul(a, k) { const x = rgb(a); return hexOf(x[0] * k, x[1] * k, x[2] * k); }

// ---------- геометрия ----------
const _M = (dx, dy) => new DOMMatrix([1, 0, 0, 1, dx, dy]);
function _inv(p, dx, dy) { const q = new Path2D(); q.rect(-300, -300, 600, 600); q.addPath(p, _M(dx, dy)); return q; }
function P2(fn) { const p = new Path2D(); fn(p); return p; }
function limbPath(x0, y0, r0, x1, y1, r1, b = 0.3) {
  return P2(p => {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    p.moveTo(x0 + r0, y0);
    p.quadraticCurveTo(mx + (r0 + r1) / 2 + b, my, x1 + r1, y1);
    p.arc(x1, y1, r1, 0, Math.PI);
    p.quadraticCurveTo(mx - (r0 + r1) / 2 - b, my, x0 - r0, y0);
    p.arc(x0, y0, r0, Math.PI, Math.PI * 2);
    p.closePath();
  });
}
function ellP(x, y, rx, ry, rot = 0) { return P2(p => p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)); }

// Объёмная заливка: основной цвет, мягкий градиент сверху вниз, собственная тень снизу-сзади и блик сверху-спереди
function cel(g, p, base, o = {}) {
  const sp = o.sp || p;
  g.save(); g.clip(p);
  g.fillStyle = base; g.fill(p);
  if (o.y0 != null) {
    const gr = g.createLinearGradient(0, o.y0, 0, o.y1);
    gr.addColorStop(0, 'rgba(255,246,226,.12)'); gr.addColorStop(1, 'rgba(24,16,36,.2)');
    g.fillStyle = gr; g.fill(p);
  }
  const d = o.d ?? 1.2;
  if (d) { g.fillStyle = o.shc || cdk(base, 0.36); g.fill(_inv(sp, d * (o.sx ?? 0.55), -d), 'evenodd'); }
  const h = o.h ?? 0.55;
  if (h) { g.fillStyle = o.hic || clt(base, 0.3); g.fill(_inv(sp, -h * (o.hx ?? 0.45), h), 'evenodd'); }
  g.restore();
}
function lineC(g, col, w, fn) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); fn(g); g.stroke(); }

// ---------- костюмы ----------
function costume(L, P) {
  const s = L.style, c1 = L.c1, c2 = L.c2;
  const C = { top: c1, sleeve: c1, cuff: null, pants: c1, boot: '#2b221c', sole: '#16110d', glove: null, trim: c2, belt: null, long: false, short: false, B: 1 };
  switch (s) {
    case 'vault': C.cuff = c2; C.belt = '#2a211b'; C.boot = '#2c241e'; break;
    case 'jump': C.cuff = c2; C.belt = '#3b2c20'; C.boot = '#3d2b1d'; break;
    case 'jacket': C.pants = '#374462'; C.boot = '#4d3322'; C.cuff = cdk(c1, 0.25); break;
    case 'formal': C.pants = cdk(c1, 0.12); C.boot = '#15151a'; C.cuff = '#eeeae0'; break;
    case 'coat': C.pants = '#4b505b'; C.boot = '#3d2c22'; C.long = true; break;
    case 'overall': C.top = c2; C.sleeve = c2; C.pants = c1; C.boot = '#5a3b22'; C.cuff = cdk(c2, 0.2); break;
    case 'shirt': C.pants = c2; C.boot = '#6d4a2e'; C.short = true; break;
    case 'uniform': C.belt = c2; C.boot = '#2a241e'; break;
    case 'armor': C.top = '#3d434a'; C.sleeve = '#3d434a'; C.pants = '#3b3f45'; C.boot = '#29251f'; C.belt = '#2a2622'; C.glove = '#2d2a26'; break;
    case 'raider': C.top = null; C.sleeve = null; C.pants = '#4a3a2c'; C.boot = '#2e241c'; C.belt = '#3a2a1c'; break;
    case 'power': C.pants = cdk(c1, 0.18); C.boot = cdk(c1, 0.3); C.glove = cdk(c1, 0.25); C.B = 1.24; break;
    case 'ninja': C.boot = '#141418'; C.glove = '#18181c'; C.belt = c2; break;
    case 'hazmat': C.boot = c2; C.glove = c2; C.belt = c2; break;
    case 'ranger': C.pants = '#2a2622'; C.boot = '#1d1916'; C.long = true; C.glove = '#231f1b'; break;
    case 'trench': C.pants = '#2e2a26'; C.boot = '#1a1614'; C.long = true; C.belt = cdk(c1, 0.3); break;
    case 'rags': C.sleeve = null; C.pants = '#4b4334'; C.boot = '#3b3226'; C.short = true; break;
  }
  return C;
}

// ---------- туловище ----------
function torsoGeo(P, C) {
  const f = P.female, B = C.B;
  const sw = (f ? 0.88 : 1) * B, ww = (f ? 0.82 : 0.96) * B, hw = (f ? 0.98 : 0.9) * B;
  const bust = f ? 0.9 : 0, belly = P.preg ? 2.6 : 0;
  const p = P2(p => {
    p.moveTo(-1.8 * B, -31.9);
    p.bezierCurveTo(-3.9 * sw, -32.0, -6.3 * sw, -31.3, -6.6 * sw, -28.7);
    p.bezierCurveTo(-6.9 * sw, -26.2, -5.3 * ww, -24.0, -4.9 * ww, -21.3);
    p.bezierCurveTo(-4.6 * ww, -19.5, -5.5 * hw, -18.0, -5.3 * hw, -15.9);
    p.bezierCurveTo(-5.1 * hw, -14.3, -3.4 * B, -13.5, 0.4, -13.5);
    p.bezierCurveTo(3.0 * B, -13.5, 5.1 * hw, -14.4, 5.3 * hw, -16.3);
    p.bezierCurveTo(5.5 * hw + belly * 0.6, -18.2, 4.4 * ww + belly, -19.2, 4.7 * ww + belly * 0.8, -21.4);
    p.bezierCurveTo(5.1 * sw + bust * 0.5, -23.0, 6.8 * sw + bust, -24.6, 6.6 * sw + bust * 0.4, -27.6);
    p.bezierCurveTo(6.4 * sw, -30.2, 4.9 * sw, -31.9, 2.6 * B, -31.9);
    p.closePath();
  });
  // линия середины груди (молния), вид 3/4
  const cx = y => y < -26 ? 2.1 + (-31.5 - y) * -0.16 + 1.0 : y < -20 ? 3.0 - (y + 26) * 0.1 : 2.4 - (y + 20) * 0.04;
  return { p, cx, sw, ww, hw, B,
    shN: [-3.7 * sw, -28.6], shF: [3.3 * sw, -29.3], hipN: [-1.8 * B, HIP_Y], hipF: [2.3 * B, HIP_Y - 0.2], neck: [0.6, -31.3] };
}
function coatTail(T, C) {
  const B = T.B;
  return P2(p => {
    p.moveTo(-5.2 * T.hw, -19);
    p.bezierCurveTo(-6.2 * T.hw, -14, -6.6 * B, -9, -6.4 * B, -5.8);
    p.lineTo(-0.2, -5.4);
    p.lineTo(1.6, -12.5);
    p.lineTo(3.4, -5.6);
    p.lineTo(5.9 * B, -6.2);
    p.bezierCurveTo(6.0 * B, -10, 5.6 * T.hw, -15, 5.0 * T.hw, -19);
    p.closePath();
  });
}
function paintTorso(g, O, P, C) {
  const T = torsoGeo(P, C);
  const L = P.look, st = L.style, skin = P.skin;
  const neck = P2(p => { p.moveTo(-1.5, -35); p.lineTo(2.9, -35); p.lineTo(3.0, -30.4); p.lineTo(-1.7, -30.4); p.closePath(); });
  const tail = C.long ? coatTail(T, C) : null;
  if (O) {
    g.fill(neck); g.stroke(neck);
    if (tail) { g.fill(tail); g.stroke(tail); }
    g.fill(T.p); g.stroke(T.p);
    return T;
  }
  // шея с тенью от подбородка
  cel(g, neck, cdk(skin, 0.12), { d: 0.8, h: 0 });
  g.save(); g.clip(neck); g.fillStyle = rgba(cdk(skin, 0.5), 0.55); g.beginPath(); g.ellipse(2.4, -34.2, 4, 2.2, 0.2, 0, 7); g.fill(); g.restore();
  // полы халата/плаща за ногами
  if (tail) {
    cel(g, tail, cdk(C.top, 0.08), { d: 1.3, h: 0.4, y0: -19, y1: -5 });
    g.save(); g.clip(tail);
    lineC(g, cdk(C.top, 0.4), 0.35, q => { q.moveTo(1.6, -12.5); q.lineTo(1.6, -18); });
    g.fillStyle = rgba(cdk(C.top, 0.6), 0.35); g.fillRect(-7, -6.6, 14, 1);
    g.restore();
  }
  const base = C.top || skin;
  cel(g, T.p, base, { d: 1.5, sx: 0.8, h: 0.6, y0: -32, y1: -13.5 });
  g.save(); g.clip(T.p);
  const cx = T.cx;
  // затенение под грудью и у пояса
  g.fillStyle = rgba(cdk(base, 0.5), 0.22); g.beginPath(); g.ellipse(-1, -21.8, 7, 1.6, 0, 0, 7); g.fill();
  // тень от головы
  g.fillStyle = rgba(cdk(base, 0.6), 0.35); g.beginPath(); g.ellipse(1.6, -31.6, 4.4, 1.8, 0, 0, 7); g.fill();
  const trimW = 1.25;
  const zip = (col, w) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(cx(-32) - w / 2, -32); for (let y = -32; y <= -13; y += 1) g.lineTo(cx(y) - w / 2, y);
    for (let y = -13; y >= -32; y -= 1) g.lineTo(cx(y) + w / 2, y); g.closePath(); g.fill();
  };
  const collarV = (col, dy = 3.6) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-2.4, -32.4); g.quadraticCurveTo(-0.4, -30.6, cx(-31) , -32 + dy); g.quadraticCurveTo(cx(-31) + 1.4, -30.2, 4.2, -32.4); g.closePath(); g.fill();
  };
  const collar = (col) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-2.9, -32.6); g.bezierCurveTo(-1.8, -30.4, 1.2, -29.6, 3.9, -31.2); g.lineTo(4.3, -32.8);
    g.bezierCurveTo(1.8, -31.4, -0.8, -31.4, -2.2, -33.4); g.closePath(); g.fill();
    g.fillStyle = rgba(cdk(col, 0.5), 0.5); g.fillRect(-3, -31.6, 8, 0.5);
  };
  const belt = (col, y = -20.2, h = 1.7, buckle = '#d9b44a') => {
    g.fillStyle = cdk(col, 0.1); g.fillRect(-9, y, 18, h);
    g.fillStyle = rgba(clt(col, 0.4), 0.4); g.fillRect(-9, y, 18, 0.35);
    if (buckle) {
      const bx = cx(y) - 1.1;
      g.fillStyle = cdk(buckle, 0.3); rr(g, bx - 0.1, y - 0.35, 2.6, h + 0.7, 0.4); g.fill();
      g.fillStyle = buckle; rr(g, bx + 0.2, y - 0.1, 2.0, h + 0.2, 0.35); g.fill();
      g.fillStyle = cdk(col, 0.2); g.fillRect(bx + 0.7, y + 0.35, 1.0, h - 0.7);
    }
  };
  const seam = (col, fn, w = 0.3) => lineC(g, col, w, fn);
  switch (st) {
    case 'vault': case 'jump': {
      zip(C.trim, trimW * (st === 'jump' ? 0.8 : 1));
      g.fillStyle = rgba(cdk(C.trim, 0.4), 0.6);
      g.beginPath(); for (let y = -30; y < -14; y += 1.1) { g.rect(cx(y) - 0.1, y, 0.2, 0.55); } g.fill();
      collar(C.trim);
      belt(C.belt, -20.4, 1.8, st === 'vault' ? '#e8c35a' : '#b9b9b9');
      // шеврон убежища на груди
      if (st === 'vault' && !P.kid) {
        const px = -2.9, py = -27.4;
        g.fillStyle = cdk(C.trim, 0.35); g.beginPath(); g.arc(px, py, 1.9, 0, 7); g.fill();
        g.fillStyle = C.trim; g.beginPath(); g.arc(px, py, 1.6, 0, 7); g.fill();
        g.fillStyle = cdk(L.c1, 0.1); g.beginPath(); g.arc(px, py, 1.05, 0, 7); g.fill();
        g.fillStyle = C.trim; g.font = `700 1.25px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.num || '', px, py + 0.1);
      } else if (st === 'jump') {
        g.fillStyle = cdk(L.c1, 0.2); rr(g, -4.4, -28.2, 3.2, 3, 0.5); g.fill();
        seam(clt(L.c1, 0.2), q => { q.moveTo(-4.3, -27.4); q.lineTo(-1.3, -27.4); });
      }
      seam(rgba(cdk(L.c1, 0.5), 0.5), q => { q.moveTo(-3.8, -18.6); q.quadraticCurveTo(-4.4, -16, -3.6, -14.2); });
      break;
    }
    case 'jacket': {
      // футболка в распахнутой куртке
      g.fillStyle = C.trim; g.beginPath(); g.moveTo(cx(-32) - 1.8, -32); g.lineTo(cx(-32) + 2.4, -32); g.lineTo(cx(-22) + 1.6, -20.6); g.lineTo(cx(-22) - 1.0, -20.6); g.closePath(); g.fill();
      g.fillStyle = rgba(cdk(C.trim, 0.4), 0.5); g.fillRect(cx(-32) - 1.8, -21.6, 4, 1);
      // лацканы
      g.fillStyle = cdk(L.c1, 0.18); g.beginPath(); g.moveTo(cx(-32) - 2.6, -32.4); g.lineTo(cx(-29) - 0.4, -26); g.lineTo(cx(-29) - 1.6, -24.8); g.lineTo(cx(-32) - 3.5, -31.2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx(-32) + 2.8, -32.2); g.lineTo(cx(-28) + 2.4, -27.2); g.lineTo(cx(-28) + 1.2, -26.4); g.closePath(); g.fill();
      g.fillStyle = cdk(L.c1, 0.3); g.fillRect(-9, -15.6, 18, 2.2);
      seam(clt(L.c1, 0.3), q => { q.moveTo(-5, -23); q.lineTo(-2.2, -23); }, 0.35);
      g.fillStyle = '#c8c8c0'; g.fillRect(cx(-24) - 1.6, -24, 0.4, 7);
      break;
    }
    case 'formal': {
      g.fillStyle = '#f1eee6'; g.beginPath(); g.moveTo(cx(-32) - 2.0, -32.2); g.lineTo(cx(-32) + 2.6, -32.2); g.lineTo(cx(-24), -21.5); g.closePath(); g.fill();
      if (L.c1 === '#17181d') { // бабочка
        g.fillStyle = C.trim; g.beginPath(); g.moveTo(cx(-31) - 1.6, -31.6); g.lineTo(cx(-31) + 1.6, -30.4); g.lineTo(cx(-31) + 1.6, -31.8); g.lineTo(cx(-31) - 1.6, -30.4); g.closePath(); g.fill();
      } else {
        g.fillStyle = C.trim; g.beginPath(); g.moveTo(cx(-31) - 0.7, -31.6); g.lineTo(cx(-31) + 0.7, -31.6); g.lineTo(cx(-26) + 0.8, -24.5); g.lineTo(cx(-25), -23.4); g.lineTo(cx(-26) - 0.7, -24.5); g.closePath(); g.fill();
        g.fillStyle = rgba(clt(C.trim, 0.5), 0.5); g.fillRect(cx(-31) - 0.3, -31, 0.4, 5);
      }
      // лацканы
      g.fillStyle = clt(L.c1, 0.1);
      g.beginPath(); g.moveTo(cx(-32) - 2.4, -32.4); g.lineTo(cx(-25) - 0.4, -22); g.lineTo(cx(-25) - 1.6, -22.4); g.lineTo(cx(-29) - 2.4, -28.6); g.lineTo(cx(-32) - 3.8, -31.2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx(-32) + 3.0, -32.2); g.lineTo(cx(-25) + 0.4, -22); g.lineTo(cx(-29) + 2.6, -28.8); g.closePath(); g.fill();
      g.fillStyle = cdk(L.c1, 0.4); g.beginPath(); g.arc(cx(-19), -19, 0.45, 0, 7); g.arc(cx(-16.5), -16.5, 0.45, 0, 7); g.fill();
      g.fillStyle = C.trim; g.beginPath(); g.moveTo(-5, -25); g.lineTo(-3, -25); g.lineTo(-3.4, -24); g.lineTo(-4.6, -24); g.closePath(); g.fill();
      seam(rgba(cdk(L.c1, 0.6), 0.6), q => { q.moveTo(-5.2, -18.2); q.lineTo(-1.8, -18.2); });
      break;
    }
    case 'coat': {
      g.fillStyle = '#8fa5b8'; g.beginPath(); g.moveTo(cx(-32) - 1.8, -32.2); g.lineTo(cx(-32) + 2.4, -32.2); g.lineTo(cx(-22) + 0.8, -20); g.lineTo(cx(-22) - 0.8, -20); g.closePath(); g.fill();
      g.fillStyle = C.trim; g.beginPath(); g.moveTo(cx(-31) - 0.6, -31.4); g.lineTo(cx(-31) + 0.6, -31.4); g.lineTo(cx(-26) + 0.6, -24); g.lineTo(cx(-25), -23); g.lineTo(cx(-26) - 0.6, -24); g.closePath(); g.fill();
      g.fillStyle = cdk(L.c1, 0.12);
      g.beginPath(); g.moveTo(cx(-32) - 2.3, -32.4); g.lineTo(cx(-22) - 0.6, -19); g.lineTo(cx(-22) - 1.8, -19.4); g.lineTo(cx(-29) - 2.2, -28.4); g.lineTo(cx(-32) - 3.6, -31.3); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx(-32) + 2.8, -32.2); g.lineTo(cx(-22) + 0.8, -19); g.lineTo(cx(-29) + 2.4, -28.8); g.closePath(); g.fill();
      // карман с ручками
      g.fillStyle = cdk(L.c1, 0.14); rr(g, -5.2, -27.4, 3.2, 3.4, 0.4); g.fill();
      g.fillStyle = '#2f5d9a'; g.fillRect(-4.6, -28.6, 0.5, 2); g.fillStyle = '#c23a2a'; g.fillRect(-3.8, -28.4, 0.5, 1.8);
      g.fillStyle = cdk(L.c1, 0.3); g.beginPath(); g.arc(cx(-18), -18, 0.4, 0, 7); g.arc(cx(-15), -15, 0.4, 0, 7); g.fill();
      break;
    }
    case 'overall': {
      // клетчатая рубашка
      g.save(); g.globalAlpha = 0.35; g.fillStyle = cdk(C.top, 0.5);
      for (let x = -8; x < 9; x += 2.2) g.fillRect(x, -33, 0.7, 20);
      for (let y = -33; y < -13; y += 2.2) g.fillRect(-9, y, 18, 0.7);
      g.restore();
      collar(clt(C.top, 0.1));
      // комбинезон с нагрудником и лямками
      const bib = P2(p => { p.moveTo(-4.4, -26.2); p.lineTo(cx(-26) + 2.8, -26.2); p.lineTo(6.2, -19); p.lineTo(6.4, -12); p.lineTo(-7, -12); p.lineTo(-6.2, -19); p.closePath(); });
      cel(g, bib, L.c1, { d: 1.3, h: 0.5 });
      g.fillStyle = L.c1; g.fillRect(-4.6, -32.5, 1.3, 6.6); g.fillRect(cx(-30) + 1.6, -32.2, 1.3, 6.2);
      g.fillStyle = '#e8c35a'; g.beginPath(); g.arc(-3.9, -25.6, 0.55, 0, 7); g.arc(cx(-26) + 2.3, -25.6, 0.55, 0, 7); g.fill();
      g.fillStyle = cdk(L.c1, 0.2); rr(g, cx(-23) - 1.8, -24.4, 3.6, 2.8, 0.4); g.fill();
      seam(rgba(clt(L.c1, 0.5), 0.6), q => { q.moveTo(-4, -26); q.lineTo(cx(-26) + 2.4, -26); });
      break;
    }
    case 'shirt': {
      collar(clt(C.top, 0.15));
      g.fillStyle = '#fff0c8';
      const fl = [[-4.2, -27], [1.6, -25], [-1.5, -21.5], [4.2, -29.5], [-4.4, -18.2], [3.4, -17.4], [0.4, -30.6], [-2.2, -15]];
      for (const [x, y] of fl) { for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.ellipse(x + Math.cos(a) * 0.75, y + Math.sin(a) * 0.75, 0.62, 0.38, a, 0, 7); g.fill(); } }
      g.fillStyle = '#f2c43a'; for (const [x, y] of fl) { g.beginPath(); g.arc(x, y, 0.38, 0, 7); g.fill(); }
      g.fillStyle = rgba('#2a7a3a', 0.8); for (const [x, y] of fl.slice(0, 5)) { g.beginPath(); g.ellipse(x + 1.3, y + 1, 0.9, 0.35, 0.6, 0, 7); g.fill(); }
      g.fillStyle = cdk(C.top, 0.35); for (let y = -29; y < -14; y += 3.4) { g.beginPath(); g.arc(cx(y), y, 0.35, 0, 7); g.fill(); }
      break;
    }
    case 'uniform': {
      collar(cdk(L.c1, 0.1));
      g.fillStyle = cdk(L.c1, 0.14); rr(g, -5.4, -28.2, 3.6, 3.4, 0.5); g.fill(); rr(g, cx(-28) + 0.6, -28.2, 3.2, 3.4, 0.5); g.fill();
      g.fillStyle = cdk(L.c1, 0.28); g.fillRect(-5.4, -28.2, 3.6, 1); g.fillRect(cx(-28) + 0.6, -28.2, 3.2, 1);
      g.fillStyle = '#d9b24a'; g.beginPath(); g.arc(-3.6, -27.6, 0.3, 0, 7); g.fill();
      g.fillStyle = cdk(L.c1, 0.3); for (let y = -29; y < -21; y += 2.6) { g.beginPath(); g.arc(cx(y), y, 0.38, 0, 7); g.fill(); }
      belt(C.belt, -20.6, 1.7, '#9aa0a4');
      break;
    }
    case 'armor': {
      collar(cdk(C.top, 0.2));
      const plate = P2(p => { p.moveTo(-6.2, -29.4); p.bezierCurveTo(-3, -31.2, 3, -31.3, 6.8, -28.8); p.bezierCurveTo(7.2, -25, 6.2, -22, 5.2, -20.6); p.lineTo(-5.4, -20.6); p.bezierCurveTo(-6.6, -23, -6.8, -26.4, -6.2, -29.4); p.closePath(); });
      cel(g, plate, L.c1, { d: 1.2, h: 0.7 });
      lineC(g, cdk(L.c1, 0.45), 0.35, q => { q.moveTo(-5.8, -24.8); q.lineTo(6.2, -24.8); q.moveTo(cx(-26), -30.6); q.lineTo(cx(-26), -20.8); });
      g.fillStyle = clt(L.c1, 0.35); for (const [x, y] of [[-4.8, -28.4], [5.4, -28.2], [-4.6, -21.6], [4.6, -21.6]]) { g.beginPath(); g.arc(x, y, 0.35, 0, 7); g.fill(); }
      belt(C.belt, -20, 1.8, '#8a9096');
      g.fillStyle = cdk(L.c1, 0.1); for (let i = 0; i < 3; i++) rr(g, -5.8 + i * 3.1, -18, 2.6, 2.6, 0.4), g.fill();
      break;
    }
    case 'raider': {
      // голый торс с ремнями и наплечником
      g.fillStyle = rgba(cdk(skin, 0.4), 0.35); g.beginPath(); g.ellipse(2, -24.8, 3, 1, 0.1, 0, 7); g.fill();
      lineC(g, cdk(skin, 0.3), 0.3, q => { q.moveTo(cx(-24), -23); q.lineTo(cx(-18), -16); });
      g.fillStyle = L.c1; g.beginPath(); g.moveTo(-6, -30); g.lineTo(-4.2, -31.6); g.lineTo(6.2, -18.6); g.lineTo(4.6, -17.4); g.closePath(); g.fill();
      g.fillStyle = '#b8b0a0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-3.6 + i * 2.6, -28.6 + i * 3.1, 0.45, 0, 7); g.fill(); }
      belt(C.belt, -18.6, 2.4, '#8a8a80');
      g.fillStyle = '#3a2a1c'; g.fillRect(-9, -16.2, 18, 3);
      break;
    }
    case 'power': {
      const pl = P2(p => { p.moveTo(-6.6, -29.8); p.bezierCurveTo(-2, -32.6, 5, -32.4, 8.2, -29); p.bezierCurveTo(8.8, -25, 7.4, -21.8, 6.4, -20.4); p.lineTo(-6, -20.4); p.bezierCurveTo(-7.8, -23.6, -7.8, -27.2, -6.6, -29.8); p.closePath(); });
      cel(g, pl, clt(L.c1, 0.06), { d: 1.4, h: 0.8 });
      lineC(g, cdk(L.c1, 0.5), 0.4, q => { q.moveTo(-6, -25.4); q.lineTo(7.8, -25.4); });
      g.fillStyle = cdk(L.c1, 0.4); rr(g, cx(-23) - 2.2, -24.6, 4.4, 3.4, 0.6); g.fill();
      g.fillStyle = '#e8b422'; rr(g, cx(-23) - 1.6, -23.8, 3.2, 1.2, 0.3); g.fill();
      g.fillStyle = cdk(L.c1, 0.35); for (let i = 0; i < 4; i++) g.fillRect(-7, -19.4 + i * 1.5, 15, 0.7);
      g.fillStyle = clt(L.c1, 0.45); for (const [x, y] of [[-5.2, -28.6], [6.6, -28.2], [-5, -21.4], [6, -21.4]]) { g.beginPath(); g.arc(x, y, 0.45, 0, 7); g.fill(); }
      break;
    }
    case 'ninja': {
      g.fillStyle = cdk(L.c1, 0.3); g.beginPath(); g.moveTo(-3, -32.4); g.lineTo(cx(-24) + 0.6, -21); g.lineTo(cx(-24) - 0.8, -21); g.lineTo(-4.4, -31.6); g.closePath(); g.fill();
      g.fillStyle = C.belt; g.fillRect(-9, -20.4, 18, 2.2);
      g.beginPath(); g.moveTo(-5, -18.4); g.lineTo(-6.4, -14.2); g.lineTo(-4.6, -14.6); g.lineTo(-3.8, -18.4); g.closePath(); g.fill();
      break;
    }
    case 'hazmat': {
      g.fillStyle = rgba(cdk(L.c1, 0.4), 0.5); for (let y = -30; y < -14; y += 3) g.fillRect(-9, y, 18, 0.4);
      zip(cdk(L.c1, 0.3), 0.6);
      belt(C.belt, -20.4, 1.8, null);
      g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(-3, -26.6, 1.6, 0, 7); g.fill();
      g.fillStyle = L.c1; for (let i = 0; i < 3; i++) { const a = i * 2.094 - 1.57; g.beginPath(); g.moveTo(-3, -26.6); g.arc(-3, -26.6, 1.3, a - 0.45, a + 0.45); g.closePath(); g.fill(); }
      break;
    }
    case 'ranger': case 'trench': {
      g.fillStyle = cdk(L.c1, 0.15);
      g.beginPath(); g.moveTo(cx(-32) - 2.6, -32.6); g.lineTo(cx(-26) - 0.2, -24.6); g.lineTo(cx(-26) - 2.6, -24); g.lineTo(-5.6, -30); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx(-32) + 3.4, -32.4); g.lineTo(cx(-26) + 0.2, -24.6); g.lineTo(cx(-28) + 4, -27.4); g.closePath(); g.fill();
      g.fillStyle = cdk(L.c1, 0.4); g.fillRect(cx(-26) - 0.25, -24.6, 0.5, 11);
      g.fillStyle = cdk(L.c1, 0.5); for (let y = -23; y < -14; y += 3) { g.beginPath(); g.arc(cx(y) + 1.3, y, 0.4, 0, 7); g.fill(); }
      if (st === 'ranger') { g.fillStyle = '#4a3a2a'; g.beginPath(); g.moveTo(-6, -30.4); g.lineTo(-4.6, -31.4); g.lineTo(5.6, -19); g.lineTo(4.2, -18.2); g.closePath(); g.fill(); }
      belt(C.belt || '#2a2420', -19.6, 1.8, '#9a8a6a');
      break;
    }
    case 'rags': {
      g.fillStyle = rgba(cdk(L.c1, 0.4), 0.6);
      g.beginPath(); g.moveTo(-9, -15); for (let x = -9; x <= 9; x += 1.5) g.lineTo(x, -15.2 + ((x * 7.3) % 2 + 2) * 0.6); g.lineTo(9, -13); g.lineTo(-9, -13); g.fill();
      g.fillStyle = cdk(skin, 0.1); g.beginPath(); g.ellipse(-2.4, -22.4, 1.6, 1.1, 0.3, 0, 7); g.fill();
      g.fillStyle = rgba(cdk(L.c1, 0.5), 0.8); rr(g, 2, -27, 2.4, 2.2, 0.3); g.fill();
      lineC(g, rgba('#e8dcc0', 0.5), 0.2, q => { q.moveTo(2, -26.6); q.lineTo(4.4, -25.2); q.moveTo(2.2, -25); q.lineTo(4.2, -26.8); });
      break;
    }
  }
  g.restore();
  return T;
}

// ---------- конечности ----------
function paintHand(g, x, y, col, O, big) {
  const k = big ? 1.28 : 1;
  const palm = P2(p => { p.ellipse(x - 0.05, y + 1.35 * k, 1.5 * k, 1.75 * k, 0.1, 0, Math.PI * 2); });
  const thumb = P2(p => { p.ellipse(x + 1.15 * k, y + 0.75 * k, 0.62 * k, 1.05 * k, -0.5, 0, Math.PI * 2); });
  if (O) { g.fill(palm); g.stroke(palm); g.fill(thumb); g.stroke(thumb); return; }
  cel(g, palm, col, { d: 0.8, h: 0.5 });
  cel(g, thumb, clt(col, 0.05), { d: 0.5, h: 0.3 });
  lineC(g, rgba(cdk(col, 0.55), 0.8), 0.22, q => { q.moveTo(x - 1.0 * k, y + 1.9 * k); q.quadraticCurveTo(x, y + 2.4 * k, x + 0.9 * k, y + 1.6 * k); });
}
function paintUArm(g, O, P, C) {
  const B = C.B, pw = P.look.style === 'power';
  const p = limbPath(0, 0, 2.25 * B, 0, UARM, 1.72 * B, 0.3);
  const sp = limbPath(0, -6, 2.25 * B, 0, UARM, 1.72 * B, 0.3);
  const pad = P.look.style === 'armor' || pw ? ellP(0.2, 0.6, 3.1 * B, 2.8 * B, 0.1) : null;
  if (O) { g.fill(p); g.stroke(p); if (pad) { g.fill(pad); g.stroke(pad); } return; }
  const sl = C.sleeve;
  if (!sl) cel(g, p, P.skin, { sp, d: 1.0, h: 0.5 });
  else if (C.short) {
    cel(g, p, P.skin, { sp, d: 1.0, h: 0.5 });
    const sh = P2(q => { q.rect(-4, -4, 8, 7.4); });
    g.save(); g.clip(p); cel(g, sh, sl, { sp, d: 1.0, h: 0.5 }); g.fillStyle = cdk(sl, 0.3); g.fillRect(-4, 3.0, 8, 0.45); g.restore();
  } else {
    cel(g, p, sl, { sp, d: 1.0, h: 0.5 });
    g.save(); g.clip(p);
    if (P.look.style === 'vault') { g.fillStyle = rgba(cdk(sl, 0.5), 0.35); g.fillRect(-3, 5.6, 6, 0.35); }
    if (P.look.style === 'overall') { g.globalAlpha = 0.35; g.fillStyle = cdk(sl, 0.5); for (let y = -3; y < 9; y += 2.2) g.fillRect(-3, y, 6, 0.7); for (let x = -3; x < 3; x += 2.2) g.fillRect(x, -3, 0.7, 12); g.globalAlpha = 1; }
    g.restore();
  }
  if (pad) {
    cel(g, pad, pw ? clt(P.look.c1, 0.05) : P.look.c1, { d: 1.1, h: 0.7 });
    g.fillStyle = clt(P.look.c1, 0.4); g.beginPath(); g.arc(-1.2, -0.4, 0.35, 0, 7); g.arc(1.6, 0, 0.35, 0, 7); g.fill();
  }
}
function paintFArm(g, O, P, C) {
  const B = C.B, pw = P.look.style === 'power';
  const p = limbPath(0, 0, 1.8 * B, 0, FARM - 0.6, 1.45 * B, 0.2);
  const sp = limbPath(0, -6, 1.8 * B, 0, FARM - 0.6, 1.45 * B, 0.2);
  const cuffP = C.cuff && !C.short && C.sleeve ? P2(q => q.roundRect ? q.roundRect(-1.75 * B, FARM - 2.1, 3.5 * B, 1.5, 0.5) : q.rect(-1.75 * B, FARM - 2.1, 3.5 * B, 1.5)) : null;
  const handC = C.glove || P.skin;
  if (O) { g.fill(p); g.stroke(p); if (cuffP) { g.fill(cuffP); g.stroke(cuffP); } paintHand(g, 0.1, FARM - 0.6, handC, true, pw); return; }
  const sl = C.short || !C.sleeve ? P.skin : C.sleeve;
  cel(g, p, sl, { sp, d: 0.9, h: 0.45 });
  if (pw) { g.save(); g.clip(p); g.fillStyle = cdk(P.look.c1, 0.3); g.fillRect(-3, 1.6, 6, 0.6); g.restore(); }
  if (cuffP) cel(g, cuffP, C.cuff, { d: 0.5, h: 0.3 });
  paintHand(g, 0.1, FARM - 0.6, handC, false, pw);
}
function paintThigh(g, O, P, C) {
  const B = C.B;
  const p = limbPath(0, 0, 2.4 * B, 0.1, THIGH, 1.98 * B, 0.35);
  const sp = limbPath(0, -8, 2.4 * B, 0.1, THIGH, 1.98 * B, 0.35);
  if (O) { g.fill(p); g.stroke(p); return; }
  cel(g, p, C.pants, { sp, d: 1.1, h: 0.5 });
  if (P.look.style === 'power') { g.save(); g.clip(p); g.fillStyle = cdk(P.look.c1, 0.25); g.fillRect(-4, 3, 8, 0.7); g.restore(); }
}
function bootPath(C, B) {
  return P2(p => {
    p.moveTo(-2.2 * B, 4.6);
    p.lineTo(1.9 * B, 4.6);
    p.lineTo(2.0 * B, 6.2);
    p.bezierCurveTo(3.4 * B, 6.3, 4.7 * B, 6.9, 4.8 * B, 8.1);
    p.lineTo(4.8 * B, 8.4);
    p.quadraticCurveTo(4.8 * B, SHIN, 4.2 * B, SHIN);
    p.lineTo(-2.0 * B, SHIN);
    p.quadraticCurveTo(-2.6 * B, SHIN, -2.6 * B, 8.2);
    p.lineTo(-2.5 * B, 5.4);
    p.closePath();
  });
}
function paintShin(g, O, P, C) {
  const B = C.B, st = P.look.style;
  const p = limbPath(0, 0, 1.98 * B, 0.05, 5.4, 1.72 * B, 0.2);
  const sp = limbPath(0, -8, 1.98 * B, 0.05, 5.4, 1.72 * B, 0.2);
  const boot = bootPath(C, B);
  const pad = st === 'armor' || st === 'power' ? ellP(0.5, 0.6, 2.4 * B, 2.3 * B) : null;
  if (O) { g.fill(p); g.stroke(p); g.fill(boot); g.stroke(boot); if (pad) { g.fill(pad); g.stroke(pad); } return; }
  cel(g, p, C.pants, { sp, d: 1.0, h: 0.5 });
  cel(g, boot, C.boot, { d: 0.9, h: 0.55, sp: P2(q => { q.addPath(boot); q.rect(-2.5 * B, -4, 4.4 * B, 9); }) });
  g.save(); g.clip(boot);
  g.fillStyle = C.sole; g.fillRect(-4, SHIN - 0.95, 12, 1.2);
  g.fillStyle = rgba(clt(C.boot, 0.5), 0.35); g.fillRect(-4, SHIN - 1.25, 12, 0.3);
  g.fillStyle = cdk(C.boot, 0.25); g.fillRect(-3, 4.6, 6 * B, 1.0);
  if (st === 'vault' || st === 'jump' || st === 'uniform' || st === 'armor') {
    lineC(g, rgba(clt(C.boot, 0.45), 0.7), 0.22, q => { for (let i = 0; i < 3; i++) { q.moveTo(0.6 + i * 0.7, 6.1 + i * 0.35); q.lineTo(1.6 + i * 0.7, 5.8 + i * 0.35); } });
  }
  g.fillStyle = 'rgba(255,250,235,.28)'; g.beginPath(); g.ellipse(3.5 * B, 7.1, 0.9, 0.45, -0.3, 0, 7); g.fill();
  g.restore();
  if (pad) {
    cel(g, pad, st === 'power' ? clt(P.look.c1, 0.05) : P.look.c1, { d: 0.9, h: 0.6 });
    g.fillStyle = clt(P.look.c1, 0.4); g.beginPath(); g.arc(0.5, 0.6, 0.4, 0, 7); g.fill();
  }
  if (C.long && st !== 'coat') { /* штанины под плащом без изменений */ }
}

// ---------- голова ----------
function headGeo(open) {
  return P2(p => {
    p.moveTo(-2.3, 0.8);
    p.bezierCurveTo(-3.6, -1.1, -6.7, -2.7, -6.9, -7.6);
    p.bezierCurveTo(-7.2, -12.8, -3.5, -15.7, 0.4, -15.7);
    p.bezierCurveTo(4.8, -15.7, 7.4, -12.7, 7.2, -9.1);
    p.bezierCurveTo(7.15, -7.9, 7.0, -7.0, 7.3, -6.3);
    p.bezierCurveTo(7.8, -5.6, 8.7, -4.8, 8.3, -4.2);
    p.bezierCurveTo(8.0, -3.8, 7.4, -3.9, 7.2, -3.5);
    p.bezierCurveTo(7.3, -1.9, 6.4, -0.3, 4.6, -0.05);
    p.bezierCurveTo(3.4, 0.15, 2.6, 0.7, 2.4, 1.5);
    if (!open) p.closePath();
  });
}
const EAR = [-2.5, -6.3];
function earPath() { return P2(p => { p.ellipse(EAR[0], EAR[1], 1.3, 1.95, 0.12, 0, Math.PI * 2); }); }

// причёски: форма шапки волос для короткой стрижки
function hairCapPath(top = 0) {
  return P2(p => {
    p.moveTo(-6.9, -4.4);
    p.bezierCurveTo(-8.3, -9.0, -7.1, -15.6 - top, -0.8, -16.5 - top);
    p.bezierCurveTo(4.2, -17.2 - top, 8.0, -14.6, 7.8, -10.5);
    p.bezierCurveTo(6.4, -11.1, 4.2, -11.5, 1.9, -11.1);
    p.bezierCurveTo(0.5, -10.8, -0.2, -9.9, -0.35, -8.7);
    p.lineTo(-0.25, -6.0);
    p.lineTo(-1.15, -6.0);
    p.bezierCurveTo(-1.5, -8.3, -3.2, -8.8, -3.95, -7.7);
    p.bezierCurveTo(-4.45, -6.6, -4.35, -5.2, -4.25, -3.9);
    p.closePath();
  });
}
function hairShapes(st) {
  // возвращает { front: [Path2D], back: Path2D|null, earOver: bool, alpha }
  const R = { front: [], back: null, earOver: true, alpha: 1, sheen: true };
  switch (st) {
    case 'buzz': R.front.push(hairCapPath(-0.5)); R.alpha = 0.62; R.sheen = false; break;
    case 'crew': R.front.push(P2(p => {
      p.addPath(hairCapPath(0.2));
      // короткие пряди-ёжик по макушке
      const pts = [[-6.6, -11.2], [-5.4, -13.8], [-3.4, -15.7], [-0.8, -16.9], [2, -16.9], [4.6, -15.8], [6.6, -13.6]];
      p.moveTo(-6.9, -9.5);
      for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; const a = Math.atan2(y + 8, x - 0.2); p.lineTo(x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2); p.lineTo(x + Math.cos(a + 0.5) * 0.2, y + Math.sin(a + 0.5) * 0.2 + 0.4); }
      p.lineTo(7.4, -11.5); p.lineTo(0, -12); p.closePath();
    })); break;
    case 'part': R.front.push(hairCapPath(0.4), P2(p => {
      p.moveTo(-1.2, -16.6);
      p.bezierCurveTo(3.8, -17.8, 8.6, -15.6, 8.6, -11.4);
      p.bezierCurveTo(8.2, -9.6, 7.2, -9.3, 6.6, -9.6);
      p.bezierCurveTo(6.9, -11.4, 5.0, -12.8, 1.8, -12.8);
      p.bezierCurveTo(0.4, -13.1, -0.6, -14.6, -1.2, -16.6);
      p.closePath();
    })); break;
    case 'slick': R.front.push(P2(p => {
      p.moveTo(-6.9, -4.4);
      p.bezierCurveTo(-8.4, -9.5, -7.0, -16.0, -0.4, -16.9);
      p.bezierCurveTo(3.6, -17.6, 7.2, -17.6, 8.6, -15.2);
      p.bezierCurveTo(9.4, -13.6, 8.6, -11.6, 7.4, -11.2);
      p.bezierCurveTo(5.8, -11.6, 3.6, -11.4, 1.9, -11.0);
      p.bezierCurveTo(0.5, -10.7, -0.2, -9.9, -0.35, -8.7);
      p.lineTo(-0.25, -6.0); p.lineTo(-1.15, -6.0);
      p.bezierCurveTo(-1.5, -8.3, -3.2, -8.8, -3.95, -7.7);
      p.bezierCurveTo(-4.45, -6.6, -4.35, -5.2, -4.25, -3.9);
      p.closePath();
    })); break;
    case 'curly': R.front.push(P2(p => {
      p.addPath(hairCapPath(0.6));
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.92 + i * (1.1 / (n - 1)));
        const x = 0.4 + Math.cos(a) * 7.6, y = -8.4 + Math.sin(a) * 8.2;
        p.moveTo(x + 2.2, y); p.arc(x, y, 2.2, 0, Math.PI * 2);
      }
    })); break;
    case 'mohawk': R.front.push(hairCapPath(-0.6), P2(p => {
      p.moveTo(-5.6, -13.4);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const bx = -5.2 + k * 11.2, by = -15.6 - Math.sin(k * Math.PI) * 1.2;
        p.lineTo(bx - 0.9, by); p.lineTo(bx + 0.9 + k * 1.2, by - 4.6 + Math.abs(k - 0.5) * 1.8); p.lineTo(bx + 1.2, by + 0.2);
      }
      p.lineTo(6.2, -12.6); p.lineTo(-5.2, -12.4); p.closePath();
    })); R.alphaMain = 0.45; break;
    case 'bob': case 'long': R.earOver = false; R.front.push(P2(p => {
      p.moveTo(-7.8, -0.6);
      p.bezierCurveTo(-9.0, -6.2, -8.6, -16.0, -0.6, -16.9);
      p.bezierCurveTo(5.3, -17.6, 8.9, -13.8, 8.4, -9.0);
      p.lineTo(7.4, -10.2); p.lineTo(6.6, -9.0); p.lineTo(5.6, -10.3); p.lineTo(4.4, -9.2);
      p.lineTo(3.4, -10.4); p.lineTo(2.2, -9.4); p.lineTo(1.2, -10.6); p.lineTo(0.2, -9.8);
      p.bezierCurveTo(-0.9, -7.6, -0.4, -3.8, -0.6, -0.2);
      p.lineTo(-1.8, -1.4); p.lineTo(-2.8, 0.4); p.lineTo(-4.0, -0.9); p.lineTo(-5.2, 0.5); p.lineTo(-6.2, -0.7);
      p.bezierCurveTo(-6.8, -0.3, -7.4, -0.3, -7.8, -0.6);
      p.closePath();
    }));
      if (st === 'long') R.back = P2(p => {
        p.moveTo(-7.6, -8);
        p.bezierCurveTo(-9.6, -2, -9.4, 5, -8.2, 11.5);
        p.bezierCurveTo(-6.2, 12.6, -3.2, 12.4, -1.2, 11.2);
        p.bezierCurveTo(-1.8, 7, -1.4, 3, -0.6, -1);
        p.lineTo(-3, -8);
        p.closePath();
      });
      break;
    case 'pony': case 'bun': R.front.push(P2(p => {
      p.addPath(hairCapPath(0.3));
      p.moveTo(-0.9, -16.5);
      p.bezierCurveTo(3.8, -17.4, 8.2, -15.2, 8.1, -11.0);
      p.bezierCurveTo(7.2, -10.2, 6.0, -10.4, 5.2, -10.8);
      p.bezierCurveTo(4.2, -12.6, 1.6, -13.4, -0.9, -16.5);
      p.closePath();
      if (st === 'bun') { p.moveTo(-2.6 + 3.3, -16.6); p.arc(-2.6, -16.6, 3.3, 0, Math.PI * 2); }
    }));
      if (st === 'pony') R.back = P2(p => {
        p.moveTo(-6.4, -12.8);
        p.bezierCurveTo(-10.4, -12.4, -11.6, -7, -10.6, -1.6);
        p.bezierCurveTo(-10.2, 0.8, -9.0, 2.4, -8.2, 2.0);
        p.bezierCurveTo(-8.6, -2, -8.4, -6.4, -5.8, -10.0);
        p.closePath();
      });
      break;
  }
  return R;
}
function paintHairShape(g, p, col, R, back, st) {
  cel(g, p, col, { d: 1.7, sx: 0.9, h: 0.6, hic: clt(col, 0.3), shc: cdk(col, 0.42) });
  if (!R.sheen) return;
  g.save(); g.clip(p);
  const dk = rgba(cdk(col, 0.55), 0.6), lt = rgba(clt(col, 0.6), 0.75);
  g.lineCap = 'round';
  if (back) {
    g.strokeStyle = dk; g.lineWidth = 0.3; g.beginPath();
    for (let i = 0; i < 4; i++) { g.moveTo(-8.4 + i * 1.6, -6); g.quadraticCurveTo(-8.8 + i * 1.9, 3, -7.6 + i * 1.8, 11.4); }
    g.stroke();
    g.strokeStyle = lt; g.lineWidth = 0.55; g.beginPath(); g.moveTo(-9, -2); g.quadraticCurveTo(-9.2, 1.5, -8.6, 4); g.moveTo(-7.6, 0); g.quadraticCurveTo(-7.8, 2, -7.4, 3.4); g.stroke();
  } else {
    // пряди расходятся от макушки
    g.strokeStyle = dk; g.lineWidth = 0.28; g.beginPath();
    const cx0 = -2.6, cy0 = -15.2;
    const long = st === 'bob' || st === 'long';
    const ends = long ? [[-7.8, -2], [-6.2, -1], [-3.4, -1.4], [-1.4, -3], [1.4, -10.4], [4, -10.4], [6.6, -10.4], [8.2, -12]] :
      [[-7.2, -6], [-5.6, -5], [-3.6, -8.2], [0.6, -11.6], [3.4, -11.8], [5.8, -11.6], [7.6, -11.8]];
    for (const [ex, ey] of ends) { g.moveTo(cx0, cy0); g.quadraticCurveTo((cx0 + ex) / 2 + (ex > cx0 ? 1.6 : -1.6), Math.min(cy0, ey) - 1.4, ex, ey); }
    g.stroke();
    if (long) { g.strokeStyle = rgba(cdk(col, 0.6), 0.8); g.lineWidth = 0.35; g.beginPath(); g.moveTo(-1.2, -16.9); g.quadraticCurveTo(-0.4, -14.6, 1.6, -13.4); g.stroke(); }
    // блики-штрихи вдоль верхней дуги
    g.strokeStyle = lt; g.lineWidth = 0.62; g.beginPath();
    const arc = long ? [[-6.6, -11.5, -5.6, -13.4], [-4.6, -14.6, -2.8, -15.4], [1.6, -15.9, 3.6, -15.4], [5.4, -14.4, 6.6, -12.8]] :
      [[-5.8, -12.2, -4.6, -13.9], [-3.2, -15.0, -1.2, -15.6], [1.8, -15.9, 3.6, -15.3], [5.2, -14.2, 6.2, -12.8]];
    for (const [a, b, c, d] of arc) { g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + 0.2, Math.min(b, d) - 0.5, c, d); }
    g.stroke();
  }
  g.restore();
}
// головные уборы: [контур/заливка]
function hatShapes(hat, L) {
  const H = [];
  if (hat === 'fedora') {
    H.push([P2(p => { p.moveTo(-5.9, -12.9); p.bezierCurveTo(-6.2, -17.2, -3.4, -19.8, 0.5, -19.2); p.bezierCurveTo(2.0, -18.2, 3.0, -18.2, 4.0, -19.2); p.bezierCurveTo(6.6, -18.6, 7.2, -16, 6.8, -12.6); p.closePath(); }), '#3a2c22', 'crown']);
    H.push([P2(p => { p.ellipse(0.6, -12.6, 11, 2.1, -0.06, 0, Math.PI * 2); }), '#33261d', 'brim']);
  } else if (hat === 'top') {
    H.push([P2(p => { p.moveTo(-5.2, -13); p.lineTo(-5.6, -25.4); p.quadraticCurveTo(0.4, -26.6, 6.4, -25.4); p.lineTo(6.0, -13); p.closePath(); }), '#16161b', 'crown']);
    H.push([P2(p => { p.ellipse(0.4, -13.0, 9.2, 1.8, -0.04, 0, Math.PI * 2); }), '#101014', 'brim']);
  } else if (hat === 'straw') {
    H.push([P2(p => { p.moveTo(-5.8, -13.2); p.bezierCurveTo(-6, -19.4, 6.4, -19.8, 6.6, -13); p.closePath(); }), '#d9b86a', 'crown']);
    H.push([P2(p => { p.ellipse(0.4, -12.9, 12.6, 2.6, -0.05, 0, Math.PI * 2); }), '#e2c47a', 'brim']);
  } else if (hat === 'cap') {
    H.push([P2(p => { p.moveTo(-7.2, -10.4); p.bezierCurveTo(-7.6, -17.4, 6.8, -18.6, 7.6, -11.4); p.lineTo(-7.2, -10.4); p.closePath(); }), L.c2, 'crown']);
    H.push([P2(p => { p.moveTo(5.4, -12.2); p.quadraticCurveTo(10.8, -12.4, 11.4, -10.6); p.quadraticCurveTo(8.6, -10.2, 5.6, -10.8); p.closePath(); }), cdk(L.c2, 0.2), 'brim']);
  } else if (hat === 'helmet') {
    H.push([P2(p => { p.moveTo(-8.4, -8.4); p.bezierCurveTo(-8.8, -19.6, 8.8, -20.4, 8.8, -9.6); p.quadraticCurveTo(1, -10.6, -8.4, -8.4); p.closePath(); }), cdk(L.c1, 0.05), 'crown']);
  }
  return H;
}
function paintHatDetail(g, hat, L) {
  if (hat === 'fedora') { g.fillStyle = '#8f2a24'; g.beginPath(); g.moveTo(-6, -14.6); g.quadraticCurveTo(0.5, -15.6, 6.9, -14.4); g.lineTo(6.8, -13.2); g.quadraticCurveTo(0.5, -14.2, -5.9, -13.2); g.closePath(); g.fill(); }
  if (hat === 'top') { g.fillStyle = '#c99a2c'; g.fillRect(-5.4, -15.8, 11.6, 1.5); }
  if (hat === 'straw') { g.fillStyle = '#b8412f'; g.fillRect(-5.8, -15, 12.4, 1.2); lineC(g, rgba('#8a6a2a', 0.5), 0.2, q => { for (let i = -10; i < 12; i += 1.6) { q.moveTo(i, -13.8); q.lineTo(i + 0.8, -11.6); } }); }
  if (hat === 'cap') { g.fillStyle = cdk(L.c2, 0.3); g.fillRect(-7.2, -11.8, 14.6, 1.2); g.fillStyle = '#d9b24a'; g.beginPath(); g.arc(3.4, -14.4, 0.8, 0, 7); g.fill(); }
  if (hat === 'helmet') { g.fillStyle = rgba(cdk(L.c1, 0.5), 0.8); g.fillRect(-9, -10.6, 18, 1.2); lineC(g, cdk(L.c1, 0.5), 0.4, q => { q.moveTo(-3.8, -9.6); q.quadraticCurveTo(-3.2, -4, 1, -0.6); }); }
}
// шлемы, закрывающие голову целиком
function fullHelmet(kind) {
  if (kind === 'power') return P2(p => { p.moveTo(-7.8, 0.8); p.bezierCurveTo(-9.6, -6, -9.2, -16.8, 0.2, -17.4); p.bezierCurveTo(7.4, -17.8, 9.8, -12.8, 9.8, -8.4); p.lineTo(10.4, -2.6); p.bezierCurveTo(10.2, 0.4, 7.6, 1.8, 4.6, 1.8); p.closePath(); });
  if (kind === 'ranger') return P2(p => { p.moveTo(-7.4, 0.6); p.bezierCurveTo(-9, -6, -8.8, -16.2, 0.2, -16.6); p.bezierCurveTo(7, -16.8, 9, -12.4, 9, -8.4); p.lineTo(10.2, -3.2); p.bezierCurveTo(10.2, -0.6, 8.4, 1.6, 5.2, 1.6); p.closePath(); });
  if (kind === 'hazmat') return P2(p => { p.moveTo(-8.2, 1.6); p.bezierCurveTo(-9.8, -6, -9.4, -17.6, 0.4, -17.8); p.bezierCurveTo(8.2, -18, 10, -12, 9.6, -6); p.bezierCurveTo(9.4, -1.6, 7.6, 1.8, 4.4, 2.2); p.closePath(); });
  return null;
}
function paintHead(g, O, P, C) {
  const L = P.look, skin = P.skin;
  const helmet = P.helmet || (L.style === 'hazmat' ? 'hazmat' : null);
  const hp = helmet ? fullHelmet(helmet) : headGeo();
  if (helmet) {
    if (O) { g.fill(hp); g.stroke(hp); return; }
    if (helmet === 'power') {
      cel(g, hp, clt(L.c1, 0.05), { d: 1.6, sx: 0.7, h: 0.9 });
      g.save(); g.clip(hp);
      g.fillStyle = cdk(L.c1, 0.35); g.beginPath(); g.moveTo(-2, -10.5); g.lineTo(10, -10.5); g.lineTo(10, -5.4); g.lineTo(-1, -5.8); g.closePath(); g.fill();
      g.fillStyle = '#141414'; rr(g, 0.4, -9.6, 9.4, 3.2, 1.2); g.fill();
      const vg = g.createLinearGradient(0, -9.4, 0, -6.6); vg.addColorStop(0, '#ffe29a'); vg.addColorStop(1, P.visor || '#ff9a2a');
      g.fillStyle = vg; rr(g, 1.2, -9.0, 8.2, 2.1, 0.9); g.fill();
      g.fillStyle = cdk(L.c1, 0.45); rr(g, 4.2, -4.4, 5.8, 5.2, 1.4); g.fill();
      g.fillStyle = cdk(L.c1, 0.7); for (let i = 0; i < 4; i++) g.fillRect(5 + i * 1.3, -3.4, 0.6, 3.2);
      g.fillStyle = clt(L.c1, 0.3); g.beginPath(); g.ellipse(-3, -12.6, 3.6, 1.6, -0.4, 0, 7); g.fill();
      g.fillStyle = cdk(L.c1, 0.3); g.fillRect(-8, -3.2, 12, 1);
      g.restore();
    } else if (helmet === 'ranger') {
      cel(g, hp, '#2d2925', { d: 1.4, h: 0.6 });
      g.save(); g.clip(hp);
      g.fillStyle = '#1a1714'; g.beginPath(); g.ellipse(4.2, -7.4, 5.8, 3.4, 0, 0, 7); g.fill();
      for (const [x, r] of [[3.2, 1.9], [7.6, 1.6]]) {
        const eg = g.createRadialGradient(x, -7.6, 0, x, -7.6, r * 1.8); eg.addColorStop(0, '#ffd0a0'); eg.addColorStop(0.35, '#ff3a22'); eg.addColorStop(1, 'rgba(120,10,0,0)');
        g.fillStyle = eg; g.beginPath(); g.arc(x, -7.6, r * 1.8, 0, 7); g.fill();
      }
      g.fillStyle = '#4a4440'; rr(g, 3.6, -3.6, 5.2, 4.4, 1.8); g.fill();
      g.fillStyle = '#2a2622'; for (let i = 0; i < 3; i++) g.fillRect(4.4 + i * 1.4, -2.8, 0.6, 2.8);
      g.fillStyle = '#3d372f'; g.beginPath(); g.ellipse(0, -13.2, 11.8, 2.6, -0.05, 0, 7); g.fill();
      g.restore();
    } else {
      cel(g, hp, L.c1, { d: 1.5, h: 0.7 });
      g.save(); g.clip(hp);
      const vp = P2(p => { p.moveTo(1.2, -13.4); p.bezierCurveTo(6.8, -14, 9.8, -11, 9.6, -6.4); p.bezierCurveTo(9.4, -2.6, 7, -1, 3.2, -1.2); p.bezierCurveTo(1.2, -4, 0.4, -9, 1.2, -13.4); p.closePath(); });
      const vg = g.createLinearGradient(1, -13, 9, -2); vg.addColorStop(0, '#a8d8e8'); vg.addColorStop(1, '#3a6a7a');
      g.fillStyle = vg; g.fill(vp);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(4.2, -10.4, 2.2, 0.8, -0.5, 0, 7); g.fill();
      g.strokeStyle = cdk(L.c1, 0.5); g.lineWidth = 0.5; g.stroke(vp);
      g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(3.4, 0.6, 1.8, 0, 7); g.fill();
      g.restore();
    }
    return;
  }
  const HR = hairShapes(P.hair);
  const hat = P.hat;
  const hats = hat ? hatShapes(hat, L) : [];
  const ninja = L.style === 'ninja';
  const hairOn = !ninja;
  // волосы под шляпой срезаются по линии полей
  const hatClip = hats.length ? P2(p => { p.rect(-20, hat === 'helmet' ? -9.6 : -12.8, 40, 30); }) : null;
  const ear = earPath();
  if (O) {
    g.fill(hp); g.stroke(headGeo(true));
    if (hairOn) for (const f of HR.front) { if (hatClip) { g.save(); g.clip(hatClip); } g.fill(f); g.stroke(f); if (hatClip) g.restore(); }
    for (const [p] of hats) { g.fill(p); g.stroke(p); }
    return;
  }
  // лицо
  cel(g, hp, skin, { d: 1.5, sx: 0.9, h: 0.55, hic: clt(skin, 0.22) });
  g.save(); g.clip(hp);
  // мягкая тень под скулой и на затылке
  g.fillStyle = rgba(cdk(skin, 0.45), 0.25); g.beginPath(); g.ellipse(-4.6, -4.2, 3.2, 3.6, 0.3, 0, 7); g.fill();
  // румянец
  g.fillStyle = rgba('#ff6a5a', P.female ? 0.26 : 0.14); g.beginPath(); g.ellipse(3.0, -4.5, 1.6, 1.0, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(6.9, -4.7, 0.8, 0.9, 0, 0, 7); g.fill();
  // нос: тень и блик
  g.fillStyle = rgba(cdk(skin, 0.4), 0.6); g.beginPath(); g.moveTo(7.3, -6.3); g.quadraticCurveTo(6.4, -4.8, 7.2, -3.6); g.quadraticCurveTo(7.8, -3.9, 8.3, -4.2); g.quadraticCurveTo(7.6, -4.6, 7.3, -6.3); g.fill();
  g.fillStyle = rgba(clt(skin, 0.6), 0.6); g.beginPath(); g.ellipse(7.9, -4.9, 0.45, 0.3, -0.5, 0, 7); g.fill();
  // щетина
  if (P.beard === 'stubble') { g.fillStyle = rgba(P.hairC, 0.3); g.beginPath(); g.moveTo(-0.4, -6); g.bezierCurveTo(-0.6, -0.6, 3, 1, 5, 0.4); g.bezierCurveTo(7.4, -0.4, 7.8, -2.6, 7.4, -3.4); g.lineTo(-0.4, -6); g.fill(); }
  if (ninja) {
    const m = P2(p => { p.moveTo(-8, -5.6); p.lineTo(9.4, -5.2); p.lineTo(9.4, 2); p.lineTo(-8, 2); p.closePath(); });
    cel(g, m, L.c1, { d: 1, h: 0.4 });
    const hood = P2(p => { p.moveTo(-8, -3); p.lineTo(-8, -18); p.lineTo(10, -18); p.lineTo(10, -9.6); p.bezierCurveTo(6, -10.4, 2, -10.6, -0.4, -9.6); p.lineTo(-1, -3); p.closePath(); });
    cel(g, hood, L.c1, { d: 1.4, h: 0.5 });
    g.fillStyle = L.c2; g.beginPath(); g.moveTo(-8, -12.4); g.lineTo(10, -12.2); g.lineTo(10, -10.8); g.lineTo(-8, -10.8); g.closePath(); g.fill();
    g.fillStyle = L.c2; g.beginPath(); g.moveTo(-6.8, -12); g.lineTo(-10.6, -9.4); g.lineTo(-9.8, -8.6); g.lineTo(-6.4, -10.8); g.fill();
  }
  g.restore();
  if (hairOn) {
    const drawFront = () => {
      HR.front.forEach((f, i) => {
        if (hatClip) { g.save(); g.clip(hatClip); }
        const a = i === 0 && HR.alphaMain ? HR.alphaMain : HR.alpha;
        if (a < 1) { g.save(); g.clip(hp); g.globalAlpha = a; g.fillStyle = P.hairC; g.fill(f); g.globalAlpha = 1; g.fillStyle = rgba(cdk(P.hairC, 0.4), 0.25); for (let k = 0; k < 40; k++) { const x = -7 + ((k * 7.31) % 15), y = -16 + ((k * 3.77) % 11); g.fillRect(x, y, 0.3, 0.3); } g.restore(); }
        else paintHairShape(g, f, P.hairC, HR, false, P.hair);
        if (hatClip) g.restore();
      });
    };
    if (!HR.earOver) drawFront();
    // ухо
    if (HR.earOver) {
      cel(g, ear, skin, { d: 0.6, h: 0.3 });
      g.fillStyle = rgba(cdk(skin, 0.45), 0.7); g.beginPath(); g.ellipse(EAR[0] + 0.2, EAR[1] + 0.1, 0.6, 1.1, 0.12, 0, 7); g.fill();
      drawFront();
    }
  }
  for (const [p, col, part] of hats) {
    cel(g, p, col, { d: part === 'brim' ? 0.7 : 1.4, h: 0.6 });
    if (part === 'crown') { g.save(); g.clip(p); paintHatDetail(g, hat, L); g.restore(); }
  }
}
function paintHairBack(g, O, P) {
  const HR = hairShapes(P.hair);
  if (!HR.back || P.helmet || P.look.style === 'hazmat' || P.look.style === 'ninja') return false;
  if (O) { g.fill(HR.back); g.stroke(HR.back); return true; }
  paintHairShape(g, HR.back, cdk(P.hairC, 0.1), HR, true, P.hair);
  return true;
}

// ---------- лицо: глаза и рты ----------
const EYES = { n: [2.3, -7.2, 1], f: [5.75, -7.25, 0.78] };
function paintEyes(g, P, mood) {
  const skin = P.skin, kid = P.kid;
  const brow = cdk(P.hairC === '#e8e8e8' || P.hairC === '#ead7a4' ? '#8a7a60' : P.hairC, 0.25);
  const lash = '#22160f';
  const ks = kid ? 1.12 : 1;
  for (const w of ['n', 'f']) {
    const [x, y, sx] = EYES[w];
    const rx = 1.3 * sx * ks, ry = 1.72 * ks;
    if (mood === 'blink') {
      lineC(g, lash, 0.5, q => { q.moveTo(x - rx, y + 0.1); q.quadraticCurveTo(x, y + 0.9, x + rx, y + 0.1); });
    } else if (mood === 'joy') {
      lineC(g, lash, 0.55, q => { q.moveTo(x - rx, y + 0.5); q.quadraticCurveTo(x, y - 1.6, x + rx, y + 0.4); });
    } else if (P.glowEyes) {
      const gg = g.createRadialGradient(x, y, 0, x, y, 2.2); gg.addColorStop(0, '#ffffe0'); gg.addColorStop(0.45, P.glowEyes); gg.addColorStop(1, rgba(P.glowEyes, 0));
      g.fillStyle = gg; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
    } else {
      const ep = ellP(x, y, rx, ry);
      g.fillStyle = '#fbf8f1'; g.fill(ep);
      g.save(); g.clip(ep);
      // радужка смотрит вперёд
      const ix = x + 0.38 * sx, iy = y + 0.12;
      g.fillStyle = P.eyeC || '#3b2616'; g.beginPath(); g.ellipse(ix, iy, 1.02 * sx * ks, 1.18 * ks, 0, 0, 7); g.fill();
      g.fillStyle = '#0e0906'; g.beginPath(); g.ellipse(ix + 0.1, iy + 0.05, 0.55 * sx * ks, 0.66 * ks, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(40,20,10,.28)'; g.fillRect(x - 3, y - ry, 6, 0.7);
      // веки по настроению
      g.fillStyle = skin;
      if (mood === 'happy') { g.beginPath(); g.ellipse(x, y + ry + 0.85, rx * 1.6, 1.25, 0, 0, 7); g.fill(); }
      if (mood === 'sad') { g.beginPath(); g.moveTo(x - rx - 1, y - ry - 1); g.lineTo(x + rx + 1, y - ry - 1); g.lineTo(x + rx + 1, y - ry * 0.1); g.lineTo(x - rx - 1, y - ry * 0.9); g.closePath(); g.fill(); }
      if (mood === 'angry') { g.beginPath(); g.moveTo(x - rx - 1, y - ry - 1); g.lineTo(x + rx + 1, y - ry - 1); g.lineTo(x + rx + 1, y - ry * 0.5 + (w === 'n' ? 0.9 : -0.1)); g.lineTo(x - rx - 1, y - ry * 0.5 + (w === 'n' ? -0.1 : 0.9)); g.closePath(); g.fill(); }
      g.restore();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 0.72 * sx, y - 0.42, 0.36 * ks, 0, 7); g.fill();
      g.beginPath(); g.arc(x + 0.1 * sx, y + 0.55, 0.16, 0, 7); g.fill();
      // линия ресниц
      const lidY = mood === 'angry' ? (w === 'n' ? 0.9 : -0.1) : 0;
      lineC(g, lash, 0.52, q => {
        if (mood === 'sad') { q.moveTo(x - rx, y - ry * 0.85); q.quadraticCurveTo(x, y - ry * 0.7, x + rx + 0.1, y - ry * 0.15); }
        else if (mood === 'angry') { q.moveTo(x - rx, y - ry * 0.5 + (w === 'n' ? -0.1 : 0.9)); q.lineTo(x + rx + 0.1, y - ry * 0.5 + lidY); }
        else { q.moveTo(x - rx - 0.05, y - 0.2); q.quadraticCurveTo(x - rx * 0.4, y - ry - 0.35, x + rx * 0.6, y - ry - 0.05); q.quadraticCurveTo(x + rx * 0.95, y - ry * 0.6, x + rx + 0.1, y - 0.4); }
      });
      if (P.female && mood !== 'angry') lineC(g, lash, 0.4, q => { q.moveTo(x + rx * 0.9, y - ry * 0.75); q.lineTo(x + rx + 0.9, y - ry - 0.3); });

    }
    // брови
    const bw = w === 'n' ? [x - 1.7, x + 1.35] : [x - 1.1, x + 1.25];
    const inner = w === 'n' ? 1 : 0; // внутренний край брови — ближе к носу
    let yl = y - 2.55 * ks, yr = y - 2.75 * ks;
    if (mood === 'angry') { if (inner) yr += 1.0; else yl += 1.0; }
    if (mood === 'sad') { if (inner) yr -= 0.7; else yl -= 0.7; }
    if (mood === 'happy') { yl -= 0.3; yr -= 0.3; }
    g.fillStyle = brow;
    g.beginPath();
    g.moveTo(bw[0], yl + 0.25); g.quadraticCurveTo((bw[0] + bw[1]) / 2, Math.min(yl, yr) - 0.7, bw[1], yr - 0.1);
    g.lineTo(bw[1] - 0.1, yr + 0.55); g.quadraticCurveTo((bw[0] + bw[1]) / 2, Math.min(yl, yr) + 0.05, bw[0] + 0.1, yl + 0.8);
    g.closePath(); g.fill();
  }
}
function paintMouth(g, P, kind) {
  const lip = cdk(cmix(P.skin, '#c0504a', 0.45), 0.25), dark = '#4a1812';
  const mx = 5.0, my = -2.5;
  const beard = P.beard, hc = P.hairC;
  if (beard === 'beard') {
    const bp = P2(p => { p.moveTo(-0.5, -6.4); p.bezierCurveTo(-0.8, -3.6, 0.2, 0.2, 3.0, 1.6); p.bezierCurveTo(5.2, 2.6, 7.6, 1.2, 8.0, -1.4); p.bezierCurveTo(8.2, -2.8, 7.6, -3.4, 7.3, -3.4); p.bezierCurveTo(6.4, -3.0, 5.2, -3.8, 4.0, -3.4); p.bezierCurveTo(3.0, -3.0, 2.0, -3.6, 1.2, -5.0); p.closePath(); });
    g.save(); g.lineWidth = CHR.ow * 2; g.strokeStyle = rgba(INK_C, 0.9); g.stroke(bp); g.restore();
    paintHairShape(g, bp, hc, { sheen: false }, false);
    g.save(); g.clip(bp); g.strokeStyle = rgba(cdk(hc, 0.5), 0.5); g.lineWidth = 0.25; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(0.6 + i * 1.2, -2 + (i % 2) * 0.4); g.lineTo(0.9 + i * 1.2, 0.2); } g.stroke(); g.restore();
  }
  switch (kind) {
    case 'smile':
      g.fillStyle = dark; g.beginPath(); g.moveTo(mx - 1.5, my - 0.3); g.quadraticCurveTo(mx, my + 0.1, mx + 1.6, my - 0.55); g.quadraticCurveTo(mx + 1.2, my + 1.9, mx - 0.1, my + 1.7); g.quadraticCurveTo(mx - 1.1, my + 1.4, mx - 1.5, my - 0.3); g.fill();
      g.save(); g.clip(); g.fillStyle = '#fbf6ec'; g.fillRect(mx - 2, my - 1, 4, 1.05); g.fillStyle = '#d0605a'; g.beginPath(); g.ellipse(mx + 0.1, my + 1.7, 1.0, 0.6, 0, 0, 7); g.fill(); g.restore();
      lineC(g, rgba(cdk(P.skin, 0.4), 0.6), 0.25, q => { q.moveTo(mx - 1.9, my - 0.6); q.quadraticCurveTo(mx - 1.6, my - 0.2, mx - 1.5, my - 0.3); });
      break;
    case 'sad':
      lineC(g, dark, 0.45, q => { q.moveTo(mx - 1.2, my + 0.6); q.quadraticCurveTo(mx, my - 0.5, mx + 1.3, my + 0.4); });
      break;
    case 'open':
      g.fillStyle = dark; g.beginPath(); g.ellipse(mx, my + 0.5, 1.1, 1.35, 0, 0, 7); g.fill();
      g.save(); g.clip(); g.fillStyle = '#fbf6ec'; g.fillRect(mx - 2, my - 1.1, 4, 0.8); g.fillStyle = '#c85850'; g.beginPath(); g.ellipse(mx, my + 1.6, 0.8, 0.5, 0, 0, 7); g.fill(); g.restore();
      break;
    case 'talk':
      g.fillStyle = dark; g.beginPath(); g.ellipse(mx, my + 0.2, 0.85, 0.65, 0, 0, 7); g.fill();
      g.fillStyle = '#fbf6ec'; g.fillRect(mx - 0.6, my - 0.4, 1.2, 0.3);
      break;
    case 'grit':
      g.fillStyle = dark; rr(g, mx - 1.5, my - 0.5, 3.0, 1.5, 0.6); g.fill();
      g.fillStyle = '#fbf6ec'; rr(g, mx - 1.3, my - 0.35, 2.6, 1.2, 0.4); g.fill();
      lineC(g, rgba(dark, 0.7), 0.18, q => { q.moveTo(mx - 1.3, my + 0.25); q.lineTo(mx + 1.3, my + 0.25); q.moveTo(mx - 0.4, my - 0.3); q.lineTo(mx - 0.4, my + 0.8); q.moveTo(mx + 0.5, my - 0.3); q.lineTo(mx + 0.5, my + 0.8); });
      break;
    default:
      lineC(g, dark, 0.42, q => { q.moveTo(mx - 1.2, my); q.quadraticCurveTo(mx, my + 0.65, mx + 1.35, my - 0.3); });
      if (P.female) { g.fillStyle = rgba(lip, 0.7); g.beginPath(); g.ellipse(mx + 0.1, my + 0.55, 0.9, 0.35, -0.1, 0, 7); g.fill(); }
  }
  if (beard === 'mustache' || beard === 'beard') {
    const mp = P2(p => { p.moveTo(mx - 1.8, my - 0.3); p.bezierCurveTo(mx - 1.2, my - 1.6, mx + 1.4, my - 1.8, mx + 2.3, my - 0.9); p.bezierCurveTo(mx + 1.6, my - 0.4, mx + 0.8, my - 0.8, mx + 0.2, my - 0.7); p.bezierCurveTo(mx - 0.6, my - 0.5, mx - 1.2, my + 0.1, mx - 1.8, my - 0.3); p.closePath(); });
    g.save(); g.lineWidth = 0.5; g.strokeStyle = rgba(INK_C, 0.8); g.stroke(mp); g.restore();
    paintHairShape(g, mp, hc, { sheen: false }, false);
  }
}

// ---------- атлас ----------
function charKey(P) {
  const L = P.look;
  return [L.style, L.c1, L.c2, P.skin, P.hairC, P.hair, P.beard || '', P.female ? 1 : 0, P.kid ? 1 : 0, P.preg ? 1 : 0, P.hat || '', P.helmet || '', P.glowEyes || '', P.visor || '', P.num || ''].join('|');
}
const EYE_V = ['calm', 'happy', 'sad', 'angry', 'blink', 'joy'];
const MOUTH_V = ['calm', 'smile', 'sad', 'open', 'talk', 'grit'];
function bakeChar(P, k) {
  const C = costume(P.look, P);
  const hasFace = !(P.helmet || P.look.style === 'hazmat');
  const parts = [
    { n: 'torso', b: [-9.8, -36, 10.2, C.long ? -4 : -11.6], fn: (g, O) => paintTorso(g, O, P, C), ol: 1 },
    { n: 'head', b: [-11.5, -28, 12, 3.2], fn: (g, O) => paintHead(g, O, P, C), ol: 1 },
    { n: 'thigh', b: [-3.8 * C.B, -3.2 * C.B, 3.9 * C.B, THIGH + 2.8 * C.B], fn: (g, O) => paintThigh(g, O, P, C), ol: 1, far: 1 },
    { n: 'shin', b: [-3.6 * C.B, -3.0 * C.B, 5.8 * C.B, SHIN + 1.2], fn: (g, O) => paintShin(g, O, P, C), ol: 1, far: 1 },
    { n: 'uarm', b: [-4.2 * C.B, -3.8 * C.B, 4.2 * C.B, UARM + 2.6 * C.B], fn: (g, O) => paintUArm(g, O, P, C), ol: 1, far: 1 },
    { n: 'farm', b: [-3.2 * C.B, -2.8 * C.B, 3.4 * C.B, FARM + 3.8 * C.B], fn: (g, O) => paintFArm(g, O, P, C), ol: 1, far: 1 },
  ];
  const HB = hairShapes(P.hair);
  if (HB.back && !P.helmet && P.look.style !== 'hazmat' && P.look.style !== 'ninja') parts.push({ n: 'hairb', b: [-12.8, -15, 1.4, 14.2], fn: (g, O) => paintHairBack(g, O, P), ol: 1 });
  if (hasFace) {
    for (const m of EYE_V) parts.push({ n: 'e_' + m, b: [-0.4, -11.8, 8.6, -4.4], fn: g => paintEyes(g, P, m) });
    if (P.look.style !== 'ninja') for (const m of MOUTH_V) parts.push({ n: 'm_' + m, b: [-1.8, -6.8, 9.2, 3.2], fn: g => paintMouth(g, P, m) });
  }
  // список спрайтов: контур + заливка (+ дальняя версия для конечностей)
  const spr = [];
  for (const p of parts) {
    if (p.ol) spr.push({ id: p.n + '_o', p, O: true });
    spr.push({ id: p.n, p, O: false });
    if (p.far) spr.push({ id: p.n + '_f', p, O: false, far: true });
  }
  const pad = 2;
  const W = Math.ceil(80 * k);
  let x = pad, y = pad, rowH = 0;
  for (const s of spr) {
    const [x0, y0, x1, y1] = s.p.b;
    s.w = Math.ceil((x1 - x0) * k); s.h = Math.ceil((y1 - y0) * k);
    if (x + s.w + pad > W) { x = pad; y += rowH + pad; rowH = 0; }
    s.sx = x; s.sy = y; x += s.w + pad; rowH = Math.max(rowH, s.h);
  }
  const H = y + rowH + pad;
  const cv = mkCanvas(W, H), g = cv.getContext('2d');
  const out = { c: cv, k, s: {}, C, face: hasFace, used: 0 };
  for (const s of spr) {
    const [x0, y0, x1, y1] = s.p.b;
    g.save();
    g.beginPath(); g.rect(s.sx, s.sy, s.w, s.h); g.clip();
    g.setTransform(k, 0, 0, k, s.sx - x0 * k, s.sy - y0 * k);
    if (s.O) { g.fillStyle = INK_C; g.strokeStyle = INK_C; g.lineWidth = CHR.ow * 2; g.lineJoin = 'round'; }
    s.p.fn(g, s.O);
    if (s.far) {
      // дальние конечности — в тени
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(28,22,44,.32)'; g.fillRect(s.sx, s.sy, s.w, s.h);
    }
    g.restore();
    out.s[s.id] = [s.sx, s.sy, s.w, s.h, x0, y0, s.w / k, s.h / k];
  }
  CHR.bakes++;
  return out;
}
function charAtlas(P, k) {
  if (P.noCache) return bakeChar(P, k);
  const key = charKey(P) + '#' + k;
  let a = CHR.atl.get(key);
  if (!a) {
    a = bakeChar(P, k);
    CHR.atl.set(key, a);
    if (CHR.atl.size > 160) { // выбрасываем самые старые
      const it = CHR.atl.keys();
      for (let i = 0; i < 40; i++) CHR.atl.delete(it.next().value);
    }
  } else if (CHR.atl.size > 100) { CHR.atl.delete(key); CHR.atl.set(key, a); }
  return a;
}
function blit(g, A, id) {
  const s = A.s[id];
  if (s) g.drawImage(A.c, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
}

// ---------- позы ----------
function rigPose(P) {
  const t = P.t || 0, id = P.id || 0;
  const Z = { hn: 0.02, kn: 0.06, hf: -0.04, kf: 0.1, sn: 0.1, en: -0.2, sf: -0.1, ef: -0.28, lean: 0, tilt: 0, lift: 0, eyes: null, mouth: null };
  const pose = P.pose || 'idle';
  const ph = P.ph || 0, s1 = Math.sin(ph), c1 = Math.cos(ph);
  switch (pose) {
    case 'walk': {
      Z.hn = -s1 * 0.46; Z.hf = s1 * 0.46;
      Z.kn = 0.06 + Math.pow(Math.max(0, c1), 1.5) * 0.85; Z.kf = 0.06 + Math.pow(Math.max(0, -c1), 1.5) * 0.85;
      Z.sn = s1 * 0.42; Z.en = -0.22 - Math.max(0, -s1) * 0.4; Z.sf = -s1 * 0.42; Z.ef = -0.22 - Math.max(0, s1) * 0.4;
      Z.lean = 0.04; Z.tilt = -Math.abs(c1) * 0.03;
      break;
    }
    case 'run': case 'hunch': {
      const a = pose === 'run' ? 0.7 : 0.4;
      Z.hn = -s1 * a - 0.1; Z.hf = s1 * a - 0.1;
      Z.kn = 0.2 + Math.pow(Math.max(0, c1), 1.2) * 1.4; Z.kf = 0.2 + Math.pow(Math.max(0, -c1), 1.2) * 1.4;
      if (pose === 'run') { Z.sn = s1 * 0.85 - 0.1; Z.en = -1.45; Z.sf = -s1 * 0.85 - 0.1; Z.ef = -1.45; Z.lean = 0.16; Z.lift = Math.abs(c1) * 1.1; }
      else { Z.sn = -1.2 + s1 * 0.15; Z.en = -0.3; Z.sf = -1.1 - s1 * 0.15; Z.ef = -0.4; Z.lean = 0.42; Z.tilt = -0.3; }
      break;
    }
    case 'work': {
      const w = P.wk || 'tool', a = t * 6 + id;
      if (w === 'type') { Z.sn = -0.55; Z.en = -0.95 + Math.sin(a * 2.2) * 0.14; Z.sf = -0.45; Z.ef = -1.05 + Math.cos(a * 2) * 0.14; Z.lean = 0.1; Z.tilt = 0.14; }
      else if (w === 'cook') { Z.sn = -0.7 + Math.sin(a * 0.7) * 0.16; Z.en = -0.95 + Math.cos(a * 0.7) * 0.28; Z.sf = -0.45; Z.ef = -1.2; Z.lean = 0.08; Z.tilt = 0.16; Z.prop = 'ladle'; }
      else { const k = Math.pow((Math.sin(a) + 1) / 2, 1.6); Z.sn = -1.35 + k * 0.55; Z.en = -1.1 + k * 0.6; Z.sf = -0.75; Z.ef = -0.9; Z.lean = 0.07; Z.hn = -0.14; Z.kn = 0.16; Z.hf = 0.14; Z.prop = 'wrench'; }
      Z.mouth = 'calm';
      break;
    }
    case 'exercise': {
      const k = (Math.sin(t * 3 + id) + 1) / 2, u = 1 - k;
      Z.hn = -0.32 * k; Z.kn = 0.06 + 0.66 * k; Z.hf = -0.28 * k; Z.kf = 0.06 + 0.62 * k; Z.lean = 0.12 * k;
      Z.sn = -0.75 - 2.2 * u; Z.en = -2.25 + 2.2 * u; Z.sf = -0.62 - 2.2 * u; Z.ef = -2.25 + 2.2 * u;
      Z.prop = 'dumbbell'; Z.propF = 'dumbbell';
      Z.eyes = k > 0.5 ? 'angry' : 'calm'; Z.mouth = k > 0.5 ? 'grit' : 'open';
      break;
    }
    case 'fight': {
      Z.hn = -0.3; Z.kn = 0.3; Z.hf = 0.26; Z.kf = 0.12;
      Z.sn = -1.42 + Math.sin(t * 22 + id) * 0.02; Z.en = -0.08; Z.sf = -1.1; Z.ef = -0.62; Z.lean = 0.06;
      Z.eyes = 'angry'; Z.mouth = 'open';
      break;
    }
    case 'melee': {
      const k = (Math.sin(t * 9 + id) + 1) / 2;
      Z.hn = -0.34; Z.kn = 0.36; Z.hf = 0.28; Z.kf = 0.14;
      Z.sn = -2.7 + k * 2.1; Z.en = -0.9 + k * 0.7; Z.sf = -0.9; Z.ef = -1.3; Z.lean = 0.12 * k;
      Z.eyes = 'angry'; Z.mouth = 'grit';
      break;
    }
    case 'dance': {
      const a = t * 6 + id, b = Math.sin(a), c = Math.cos(a);
      Z.sn = -2.4 + b * 0.5; Z.en = -0.5 - c * 0.4; Z.sf = -2.2 - b * 0.5; Z.ef = -0.5 + c * 0.4;
      Z.hn = -0.15 * b; Z.kn = 0.2 + Math.max(0, b) * 0.6; Z.hf = 0.15 * b; Z.kf = 0.2 + Math.max(0, -b) * 0.6;
      Z.lean = b * 0.06; Z.tilt = b * 0.12; Z.eyes = 'joy'; Z.mouth = 'smile';
      break;
    }
    case 'talk': {
      const a = t * 4 + id;
      Z.sn = -0.75 + Math.sin(a) * 0.3; Z.en = -0.55 + Math.cos(a * 1.3) * 0.3; Z.sf = -0.2; Z.ef = -0.6; Z.tilt = Math.sin(t * 2.3 + id) * 0.06;
      Z.mouth = Math.sin(t * 12 + id) > 0 ? 'talk' : 'calm';
      break;
    }
    default: {
      const br = Math.sin(t * 1.9 + id);
      Z.lift = br * 0.18; Z.sn = 0.1 + br * 0.03; Z.sf = -0.1 - br * 0.03;
      Z.tilt = Math.sin(t * 0.43 + id * 1.7) * 0.05;
    }
  }
  return Z;
}
function handAt(sh, a1, e) {
  const a2 = a1 + e;
  return [sh[0] - Math.sin(a1) * UARM - Math.sin(a2) * (FARM + 0.3), sh[1] + Math.cos(a1) * UARM + Math.cos(a2) * (FARM + 0.3), a2];
}
// предметы в руках: гантели, гаечный ключ, половник
function drawProp(g, kind, x, y, a, far) {
  g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
  g.lineJoin = 'round';
  const ink = rgba(INK_C, 0.9);
  if (kind === 'dumbbell') {
    g.fillStyle = ink; g.beginPath(); g.arc(0, 0, 2.3, 0, 7); g.fill();
    const gr = g.createRadialGradient(-0.6, -0.7, 0.2, 0, 0, 2); gr.addColorStop(0, far ? '#6a6e74' : '#9aa0a8'); gr.addColorStop(1, far ? '#2a2c30' : '#3a3e44');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1.75, 0, 7); g.fill();
    g.fillStyle = far ? '#1a1a1a' : '#26282c'; g.beginPath(); g.arc(0, 0, 0.6, 0, 7); g.fill();
  } else if (kind === 'wrench') {
    g.fillStyle = ink; rr(g, -1.2, -1.2, 9.6, 2.4, 1.1); g.fill(); g.beginPath(); g.arc(8.6, 0, 2.2, 0, 7); g.fill();
    const gr = g.createLinearGradient(0, -1, 0, 1); gr.addColorStop(0, '#d6dadd'); gr.addColorStop(1, '#6e7479');
    g.fillStyle = gr; rr(g, -0.6, -0.65, 8.6, 1.3, 0.6); g.fill(); g.beginPath(); g.arc(8.6, 0, 1.6, 0, 7); g.fill();
    g.fillStyle = '#3a3026'; g.beginPath(); g.moveTo(9, -0.55); g.lineTo(11.2, -1.2); g.lineTo(11.2, 1.2); g.lineTo(9, 0.55); g.closePath(); g.fill();
  } else if (kind === 'ladle') {
    g.strokeStyle = ink; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, 0); g.lineTo(7.4, 0); g.stroke();
    g.strokeStyle = '#b9bfc4'; g.lineWidth = 0.7; g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(8.6, 1.2, 2.1, 0, 7); g.fill();
    g.fillStyle = '#aeb4b9'; g.beginPath(); g.arc(8.6, 1.2, 1.5, 0, 7); g.fill();
    g.fillStyle = '#e8d8a8'; g.beginPath(); g.arc(8.6, 1.2, 1.5, 0.2, Math.PI - 0.2); g.fill();
  }
  g.restore();
}
function legExt(h, k) { return THIGH * Math.cos(h) + SHIN * Math.cos(h + k); }

// ---------- отрисовка ----------
let _chScratch = null;
function drawHuman(g, P) {
  if (P.alpha != null && P.alpha < 0.99) return drawHumanFaded(g, P);
  const tr = g.getTransform();
  const px = Math.hypot(tr.a, tr.b) * (P.s || 1);
  const k = px <= 1.2 ? 1 : px <= 2.2 ? 2 : px <= 3.2 ? 3 : px <= 4.4 ? 4 : 6;
  const A = charAtlas(P, k);
  const C = A.C, B = C.B;
  const Z = rigPose(P);
  const T = torsoGeo(P, C);
  const face = P.face || 1, s = P.s || 1;
  g.save();
  g.translate(P.x, P.y);
  g.scale(face * s, s);
  // контактная тень
  const sw = (P.look.style === 'power' ? 10 : 8.2);
  g.fillStyle = 'rgba(8,4,2,.32)'; g.beginPath(); g.ellipse(0.4, 0.2, sw, 1.9, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(8,4,2,.22)'; g.beginPath(); g.ellipse(0.4, 0.2, sw * 0.6, 1.1, 0, 0, 7); g.fill();
  // высота таза по опорной ноге
  const drop = SHIN + THIGH - Math.max(legExt(Z.hn, Z.kn), legExt(Z.hf, Z.kf));
  const dy = drop - Z.lift;
  const hip = [0.3, HIP_Y + dy];
  const legs = (h, kk, hp, far, pass) => {
    g.save(); g.translate(hp[0], hp[1] + dy); g.rotate(h); blit(g, A, far ? (pass ? 'thigh_f' : 'thigh_o') : (pass ? 'thigh' : 'thigh_o'));
    g.translate(0, THIGH); g.rotate(kk); blit(g, A, far ? (pass ? 'shin_f' : 'shin_o') : (pass ? 'shin' : 'shin_o'));
    g.restore();
  };
  const arm = (sh, a1, a2, far, pass) => {
    g.save(); g.translate(sh[0], sh[1]); g.rotate(a1); blit(g, A, pass ? (far ? 'uarm_f' : 'uarm') : 'uarm_o');
    g.translate(0, UARM); g.rotate(a2); blit(g, A, pass ? (far ? 'farm_f' : 'farm') : 'farm_o');
    g.restore();
  };
  const torsoFrame = () => { g.translate(0, dy); g.translate(hip[0], HIP_Y); g.rotate(Z.lean); g.translate(-hip[0], -HIP_Y); };
  const headFrame = () => { g.translate(T.neck[0], T.neck[1]); g.rotate(Z.tilt - Z.lean * 0.4); if (P.kid) g.scale(1.2, 1.2); };
  // волосы за спиной
  if (A.s.hairb) { g.save(); torsoFrame(); headFrame(); blit(g, A, 'hairb_o'); blit(g, A, 'hairb'); g.restore(); }
  // дальняя рука
  g.save(); torsoFrame(); arm(T.shF, Z.sf, Z.ef, true, false); arm(T.shF, Z.sf, Z.ef, true, true);
  if (Z.propF) { const h = handAt(T.shF, Z.sf, Z.ef); drawProp(g, Z.propF, h[0], h[1], h[2], true); }
  g.restore();
  // дальняя нога
  legs(Z.hf, Z.kf, T.hipF, true, false); legs(Z.hf, Z.kf, T.hipF, true, true);
  // ближняя нога + туловище (общий контур)
  legs(Z.hn, Z.kn, T.hipN, false, false);
  g.save(); torsoFrame(); blit(g, A, 'torso_o'); g.restore();
  legs(Z.hn, Z.kn, T.hipN, false, true);
  g.save(); torsoFrame(); blit(g, A, 'torso');
  // голова
  g.save(); headFrame();
  blit(g, A, 'head_o'); blit(g, A, 'head');
  if (A.face) {
    const mood = P.mood;
    const blink = ((t2 => t2 % 4.2)((P.t || 0) * 0.9 + (P.id || 0) * 0.37)) < 0.12;
    let e = Z.eyes || (mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : mood === 'fight' || mood === 'angry' ? 'angry' : 'calm');
    if (blink && !P.glowEyes && !P.noBlink) e = 'blink';
    let m = Z.mouth || (mood === 'happy' ? 'smile' : mood === 'sad' ? 'sad' : mood === 'fight' ? 'open' : mood === 'angry' ? 'grit' : 'calm');
    if (P.pose === 'talk') m = Z.mouth;
    blit(g, A, 'e_' + e);
    blit(g, A, 'm_' + m);
  }
  g.restore();
  // оружие в ближней руке
  let hand = null;
  if (P.weapon) { hand = handAt(T.shN, Z.sn, Z.en); drawWeapon(g, P.weapon, hand[0], hand[1], hand[2], P); }
  else if (Z.prop) { const h = handAt(T.shN, Z.sn, Z.en); drawProp(g, Z.prop, h[0], h[1], h[2], false); }
  // ближняя рука
  arm(T.shN, Z.sn, Z.en, false, false); arm(T.shN, Z.sn, Z.en, false, true);
  if (P.bird) drawBird(g, P.bird, T.shN[0] + 0.4, T.shN[1] - 2.2, P.t || 0);
  g.restore();
  g.restore();
  return hand;
}
function drawHumanFaded(g, P) {
  // полупрозрачный персонаж: рисуем в буфер, чтобы части не просвечивали друг через друга
  const tr = g.getTransform();
  const sc = Math.hypot(tr.a, tr.b) * (P.s || 1);
  const w = Math.ceil(64 * sc), h = Math.ceil(80 * sc);
  if (!_chScratch || _chScratch.width < w || _chScratch.height < h) _chScratch = mkCanvas(Math.max(w, _chScratch ? _chScratch.width : 0), Math.max(h, _chScratch ? _chScratch.height : 0));
  const b = _chScratch.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, h);
  b.setTransform(sc / (P.s || 1), 0, 0, sc / (P.s || 1), w / 2, h - 8 * sc);
  const Q = Object.assign({}, P, { x: 0, y: 0, alpha: null });
  drawHuman(b, Q);
  const k = Math.hypot(tr.a, tr.b);
  g.save(); g.globalAlpha *= P.alpha;
  g.drawImage(_chScratch, 0, 0, w, h, P.x - w / 2 / k, P.y - (h - 8 * sc) / k, w / k, h / k);
  g.restore();
  return null;
}

// ---------- портреты для списков ----------
const AVA = new Map();
function avatarURL(d) {
  const P = dwellerParams(d, 0, 0, 1, 'idle', 1);
  P.face = 1; P.noBlink = true; P.noCache = true; P.bird = null;
  const key = charKey(P) + (d.rar === 2 ? '|L' : '');
  let u = AVA.get(key);
  if (u) return u;
  const px = 88;
  const c = mkCanvas(px, px), g = c.getContext('2d');
  const bg = g.createRadialGradient(px * 0.5, px * 0.36, 4, px * 0.5, px * 0.5, px * 0.75);
  bg.addColorStop(0, d.rar === 2 ? '#5a4a22' : '#34503c'); bg.addColorStop(1, '#08130c');
  g.fillStyle = bg; g.fillRect(0, 0, px, px);
  const s = P.s;
  const headY = -(31.3 + 7.6 * (P.kid ? 1.2 : 1)) * s;
  const z = (px / 30) / (P.kid ? s * 1.25 : 1);
  g.setTransform(z, 0, 0, z, px * 0.46, px * 0.44 - headY * z);
  drawHuman(g, P);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const vg = g.createLinearGradient(0, px * 0.7, 0, px);
  vg.addColorStop(0, 'rgba(4,12,7,0)'); vg.addColorStop(1, 'rgba(4,12,7,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, px, px);
  u = c.toDataURL();
  AVA.set(key, u);
  if (AVA.size > 400) AVA.delete(AVA.keys().next().value);
  return u;
}
