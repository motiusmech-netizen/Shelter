// ===== Утилиты =====
const FONT_D = '"Oswald", "Arial Narrow", "Roboto Condensed", sans-serif';
const FONT_M = '"IBM Plex Mono", "Consolas", monospace';
const rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pad = n => (n < 10 ? '0' : '') + n;
function fmt(n) {
  n = Math.floor(n);
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + s;
}
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function plural(n, a, b, c) {
  n = Math.abs(n) % 100;
  const m = n % 10;
  if (n > 10 && n < 20) return c;
  if (m > 1 && m < 5) return b;
  if (m === 1) return a;
  return c;
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weighted(list) { // [[item, weight], ...]
  let tot = 0;
  for (const x of list) tot += x[1];
  let r = rnd() * tot;
  for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; }
  return list[list.length - 1][0];
}
function femSurname(s) {
  if (/(ов|ев|ёв|ин|ын)$/.test(s)) return s + 'а';
  if (/ий$/.test(s)) return s.slice(0, -2) + 'ая';
  if (/ой$/.test(s)) return s.slice(0, -2) + 'ая';
  return s;
}

// ===== Иконки: собираются из геометрических примитивов на сетке 24×24 =====
// Базовые фигуры идут по часовой стрелке, вырезы — против, поэтому заливка nonzero
// даёт и объединение, и прорези. Контуры со скруглёнными углами, единая толщина деталей.
const IC = (() => {
  const f = n => +n.toFixed(2);
  const area = pts => { let a = 0; for (let i = 0; i < pts.length; i += 2) { const j = (i + 2) % pts.length; a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1]; } return a; };
  // многоугольник со скруглёнными углами
  function poly(pts, r = 0, cut = false) {
    if ((area(pts) > 0) === cut) { const q = []; for (let i = pts.length - 2; i >= 0; i -= 2) q.push(pts[i], pts[i + 1]); pts = q; }
    const n = pts.length / 2, out = [];
    for (let i = 0; i < n; i++) {
      const px = pts[((i - 1 + n) % n) * 2], py = pts[((i - 1 + n) % n) * 2 + 1];
      const x = pts[i * 2], y = pts[i * 2 + 1];
      const nx = pts[((i + 1) % n) * 2], ny = pts[((i + 1) % n) * 2 + 1];
      if (!r) { out.push([i ? 'L' : 'M', x, y]); continue; }
      const d1 = Math.hypot(px - x, py - y), d2 = Math.hypot(nx - x, ny - y);
      const k1 = Math.min(r, d1 / 2) / d1, k2 = Math.min(r, d2 / 2) / d2;
      out.push([i ? 'L' : 'M', x + (px - x) * k1, y + (py - y) * k1]);
      out.push(['Q', x, y, x + (nx - x) * k2, y + (ny - y) * k2]);
    }
    out.push(['Z']);
    return out;
  }
  function rect(x, y, w, h, r = 0, cut = false) {
    const R = Array.isArray(r) ? r : [r, r, r, r];
    const [a, b, c, d] = R.map(v => Math.min(v, w / 2, h / 2));
    const o = [['M', x + a, y], ['L', x + w - b, y]];
    if (b) o.push(['A', b, b, 0, 0, 1, x + w, y + b]);
    o.push(['L', x + w, y + h - c]);
    if (c) o.push(['A', c, c, 0, 0, 1, x + w - c, y + h]);
    o.push(['L', x + d, y + h]);
    if (d) o.push(['A', d, d, 0, 0, 1, x, y + h - d]);
    o.push(['L', x, y + a]);
    if (a) o.push(['A', a, a, 0, 0, 1, x + a, y]);
    o.push(['Z']);
    return cut ? rev(o) : o;
  }
  function ell(cx, cy, rx, ry = rx, rot = 0, cut = false) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const p = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
    const sw = cut ? 0 : 1, deg = rot * 180 / Math.PI;
    const [x0, y0] = p(rx, 0), [x1, y1] = p(-rx, 0);
    return [['M', x0, y0], ['A', rx, ry, deg, 0, sw, x1, y1], ['A', rx, ry, deg, 0, sw, x0, y0], ['Z']];
  }
  // обратный обход контура (для вырезов)
  function rev(o) {
    const pts = []; let cur = null;
    for (const c of o) { if (c[0] === 'M' || c[0] === 'L') { pts.push({ x: c[1], y: c[2], seg: c }); } else if (c[0] === 'A') pts.push({ x: c[6], y: c[7], seg: c }); }
    const out = [['M', pts[pts.length - 1].x, pts[pts.length - 1].y]];
    for (let i = pts.length - 1; i > 0; i--) {
      const s = pts[i].seg, to = pts[i - 1];
      if (s[0] === 'A') out.push(['A', s[1], s[2], s[3], s[4], s[5] ? 0 : 1, to.x, to.y]);
      else out.push(['L', to.x, to.y]);
    }
    out.push(['Z']);
    return out;
  }
  // сектор кольца (дуга с толщиной)
  function arcBand(cx, cy, r0, r1, a0, a1, cut = false) {
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); }
    for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); }
    return poly(pts, 0.5, cut);
  }
  function gear(cx, cy, ro, ri, n, tipK = 0.42, rootK = 0.62, fil = 0.7) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, st = (Math.PI * 2) / n;
      const t = st * tipK / 2, rt = st * rootK / 2;
      pts.push(cx + Math.cos(a - rt) * ri, cy + Math.sin(a - rt) * ri, cx + Math.cos(a - t) * ro, cy + Math.sin(a - t) * ro, cx + Math.cos(a + t) * ro, cy + Math.sin(a + t) * ro, cx + Math.cos(a + rt) * ri, cy + Math.sin(a + rt) * ri);
    }
    return poly(pts, fil);
  }
  // поворот группы вокруг точки
  function rot(parts, deg, cx = 12, cy = 12) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const P = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
    return parts.map(o => o.map(cmd => {
      if (cmd[0] === 'M' || cmd[0] === 'L') return [cmd[0], ...P(cmd[1], cmd[2])];
      if (cmd[0] === 'Q') return ['Q', ...P(cmd[1], cmd[2]), ...P(cmd[3], cmd[4])];
      if (cmd[0] === 'A') return ['A', cmd[1], cmd[2], cmd[3] + deg, cmd[4], cmd[5], ...P(cmd[6], cmd[7])];
      return cmd;
    }));
  }
  // сдвиг и масштаб группы вокруг центра сетки
  function fit(parts, dx, dy, k = 1) {
    const P = (x, y) => [12 + (x - 12) * k + dx, 12 + (y - 12) * k + dy];
    return parts.map(o => o.map(cmd => {
      if (cmd[0] === 'M' || cmd[0] === 'L') return [cmd[0], ...P(cmd[1], cmd[2])];
      if (cmd[0] === 'Q') return ['Q', ...P(cmd[1], cmd[2]), ...P(cmd[3], cmd[4])];
      if (cmd[0] === 'A') return ['A', cmd[1] * k, cmd[2] * k, cmd[3], cmd[4], cmd[5], ...P(cmd[6], cmd[7])];
      return cmd;
    }));
  }
  function str(parts) {
    return parts.map(o => o.map(c => c[0] === 'Z' ? 'Z' : c[0] + c.slice(1).map(f).join(' ')).join('')).join('');
  }
  return { poly, rect, ell, arcBand, gear, rot, fit, str };
})();
const ICON = (() => {
  const { poly, rect, ell, arcBand, gear, rot, fit, str } = IC;
  const D = Math.PI / 180;
  const bolt = [poly([13.8, 1.6, 4.4, 13.6, 11.1, 13.6, 9.3, 22.4, 19.6, 10.1, 12.9, 10.1], 0.9)];
  const speaker = poly([2.6, 8.6, 7.2, 8.6, 12.6, 3.8, 12.6, 20.2, 7.2, 15.4, 2.6, 15.4], 1);
  const trefoil = (cx, cy, r0, r1) => [0, 1, 2].map(i => arcBand(cx, cy, r0, r1, (-90 + i * 120 - 30) * D, (-90 + i * 120 + 30) * D, true));
  const I = {
    power: bolt,
    bolt2: bolt,
    water: [poly([12, 2, 17.76, 11.39, 6.24, 11.39], 0.7), ell(12, 15, 6.8), ell(9.3, 15.4, 1.1, 2.5, -0.35, true)],
    food: rot([ell(12, 8.3, 6.6, 6.9), rect(10.7, 13, 2.6, 6.6), ell(10.1, 19.8, 2.05), ell(13.9, 19.8, 2.05), ell(9.5, 6.4, 1.2, 2.6, 0.35, true)], 42),
    caps: (() => { const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = i % 2 ? 9.5 : 10.8; pts.push(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } return [poly(pts, 0.8), ell(12, 12, 7, 7, 0, true), ell(12, 12, 5.4), poly((() => { const q = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.5 : 3.4; q.push(12 + Math.cos(a) * r, 12.3 + Math.sin(a) * r); } return q; })(), 0.25, true)]; })(),
    quantum: [rect(10, 1.2, 4, 2.2, 0.6), poly([10.2, 3, 13.8, 3, 13.8, 5.6, 16, 9.2, 16, 12.4, 15.2, 14.8, 16, 17.2, 16, 20.8, 14.6, 22.4, 9.4, 22.4, 8, 20.8, 8, 17.2, 8.8, 14.8, 8, 12.4, 8, 9.2, 10.2, 5.6], 0.9),
      rect(9.1, 12.2, 5.8, 1.5, 0.3, true), rect(9.1, 16.4, 5.8, 1.5, 0.3, true), ell(10.6, 9.4, 0.7, 1.6, 0.4, true)],
    stim: [rect(8.2, 2.6, 7.6, 5.6, 1.8), rect(10, 4.3, 4, 2.4, 0.5, true), rect(2.4, 6.6, 19.2, 14.8, 2.6), poly([10.6, 9.4, 13.4, 9.4, 13.4, 12.6, 16.6, 12.6, 16.6, 15.4, 13.4, 15.4, 13.4, 18.6, 10.6, 18.6, 10.6, 15.4, 7.4, 15.4, 7.4, 12.6, 10.6, 12.6], 0.35, true)],
    rad: [rect(10, 1.2, 4, 3, 1), ell(12, 2.6, 0.7, 0.7, 0, true), rect(5.2, 3.4, 13.6, 15.6, 3.2), rect(11.1, 18, 1.8, 4.8, 0.6), ...trefoil(12, 11, 1.7, 4.8), ell(12, 11, 1, 1, 0, true)],
    people: [ell(8.8, 7.4, 4), rect(1.8, 13.4, 13.2, 8.6, [6, 6, 1.2, 1.2]), ell(17.2, 8.2, 3.1), rect(16.4, 14.4, 5.8, 7.6, [1.2, 4.6, 1.2, 1.2])],
    smile: [ell(12, 12, 10.2), ell(8.6, 9.2, 1.45, 1.95, 0, true), ell(15.4, 9.2, 1.45, 1.95, 0, true), poly((() => { const q = []; for (let i = 0; i <= 8; i++) { const a = (20 + i * 17.5) * D; q.push(12 + Math.cos(a) * 6.2, 12.3 + Math.sin(a) * 6.2); } for (let i = 8; i >= 0; i--) { const a = (30 + i * 15) * D; q.push(12 + Math.cos(a) * 4.6, 12.1 + Math.sin(a) * 3.6); } return q; })(), 0.4, true)],
    build: fit(rot([rect(10.8, 8.4, 2.4, 14, 1.2), rect(9.9, 7.2, 4.2, 3, 0.5), rect(2.6, 2, 5, 7.6, 1.2), rect(6.8, 3, 9.4, 5.4, 0.8), poly([15.6, 3, 19.4, 3.4, 22, 6.8, 20.8, 7.6, 18.4, 5.6, 15.6, 5.8], 0.5)], 45), -1.4, 2.2, 0.92),
    box: [rect(8.2, 2, 7.6, 5.4, 2), rect(10, 3.7, 4, 2.6, 0.7, true), rect(2.4, 7, 19.2, 14.6, 2.4), rect(3.2, 11.2, 17.6, 1.4, 0, true), rect(10.4, 9.8, 3.2, 4.2, 0.9)],
    map: [poly([2.4, 5.4, 8.6, 3, 15.4, 5.4, 21.6, 3, 21.6, 18.6, 15.4, 21, 8.6, 18.6, 2.4, 21], 0.9), poly([8.1, 4.9, 9.1, 4.9, 9.1, 17.8, 8.1, 17.8], 0, true), poly([14.9, 6.2, 15.9, 6.2, 15.9, 19.6, 14.9, 19.6], 0, true),
      ell(5.2, 15.4, 0.8, 0.8, 0, true), ell(6.4, 12.4, 0.8, 0.8, 0, true), ell(11.2, 10.6, 0.8, 0.8, 0, true), poly([17.4, 8.2, 18.2, 7.4, 19, 8.2, 19.8, 7.4, 20.6, 8.2, 19.8, 9, 20.6, 9.8, 19.8, 10.6, 19, 9.8, 18.2, 10.6, 17.4, 9.8, 18.2, 9], 0.15, true)],
    list: [rect(4.4, 3.6, 15.2, 18.6, 2.2), rect(8.4, 1.6, 7.2, 4.4, 1.3), rect(7.8, 9.2, 8.6, 1.9, 0.9, true), rect(7.8, 13, 8.6, 1.9, 0.9, true), rect(7.8, 16.8, 5.6, 1.9, 0.9, true)],
    menu: [gear(12, 12, 10.8, 8.2, 8, 0.42, 0.66, 0.8), ell(12, 12, 3.6, 3.6, 0, true)],
    bag: [rect(9.2, 1.8, 5.6, 5, 2), rect(10.8, 3.4, 2.4, 2.2, 0.6, true), rect(4.4, 5.6, 15.2, 16.6, 4.4), rect(5.6, 10.4, 12.8, 1.5, 0, true), rect(7.6, 13.8, 8.8, 6.2, 1.8, true), rect(9, 15.2, 6, 3.4, 0.8)],
    gun: [rect(2.4, 5.6, 17.6, 5, 1.2), rect(19.6, 6.6, 2.4, 3, 0.6), rect(17.2, 4.4, 1.6, 1.6, 0.3), rect(2.8, 4.2, 2.2, 1.8, 0.4), poly([5.6, 10.2, 11.4, 10.2, 10.6, 21, 4.6, 21], 1.1), poly([10.8, 10.2, 15.2, 10.2, 15.2, 12.6, 13.4, 14.8, 10.9, 14.8], 1), ell(12.6, 12.3, 1.1, 1.1, 0, true),
      rect(3.8, 6.6, 0.8, 3, 0.2, true), rect(5.3, 6.6, 0.8, 3, 0.2, true), rect(6.8, 6.6, 0.8, 3, 0.2, true)],
    shirt: [poly((() => { const q = [8.6, 2.6, 2.4, 5.6, 1.4, 10.6, 5.4, 12, 5.4, 21.6, 18.6, 21.6, 18.6, 12, 22.6, 10.6, 21.6, 5.6, 15.4, 2.6]; for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; q.push(12 + Math.cos(a) * 3.4, 2.6 + Math.sin(a) * 2.8); } return q; })(), 0.9), rect(12.6, 8.4, 2.8, 2.8, 0.5, true)],
    heart: [ell(7.6, 8.9, 4.9), ell(16.4, 8.9, 4.9), poly([2.9, 10.4, 12, 21, 21.1, 10.4, 12, 8.4], 1), ell(7.2, 8.2, 1.1, 1.9, -0.7, true)],
    up: [poly([12, 2.4, 20.6, 11, 15.2, 11, 15.2, 21.6, 8.8, 21.6, 8.8, 11, 3.4, 11], 1)],
    radio: [...rot([rect(5.6, 5.8, 13.6, 1.6, 0.8)], -24, 6.4, 7.8), ell(18.6, 3.1, 1.3), rect(2.4, 8.6, 19.2, 13.2, 2.6), ell(8.8, 15.2, 3.8, 3.8, 0, true), ell(8.8, 15.2, 1.6), rect(14.4, 11.6, 4.8, 1.7, 0.85, true), rect(14.4, 14.6, 4.8, 1.7, 0.85, true), rect(14.4, 17.6, 4.8, 1.7, 0.85, true)],
    fire: [poly([12.4, 1.6, 15.4, 5.8, 18.8, 10.6, 19.2, 15.4, 16.8, 20.2, 12, 22.4, 7.2, 20.2, 4.8, 15.4, 5.6, 11, 8.4, 7.8, 9.4, 11.6, 11, 12.2, 10.8, 6.8], 2.4), poly([12, 12.6, 14.8, 16.2, 14.4, 19.2, 12, 20.6, 9.6, 19.2, 9.4, 16.6], 1.6, true)],
    alert: [poly([12, 2, 22.8, 21, 1.2, 21], 2.2), rect(10.8, 8.4, 2.4, 7, 1.2, true), ell(12, 17.9, 1.35, 1.35, 0, true)],
    skull: [ell(12, 10.2, 8.8, 8.4), rect(7.2, 14.4, 9.6, 7.8, 2.4), ell(8.4, 10.6, 2.4, 2.7, 0, true), ell(15.6, 10.6, 2.4, 2.7, 0, true), poly([12, 13.8, 13.3, 16.2, 10.7, 16.2], 0.3, true), rect(9.3, 18.4, 1.3, 2.4, 0.4, true), rect(11.35, 18.4, 1.3, 2.4, 0.4, true), rect(13.4, 18.4, 1.3, 2.4, 0.4, true)],
    robot: [rect(11.2, 1.4, 1.6, 4.4, 0.8), ell(12, 1.9, 1.5), ell(12, 11.4, 6.8), ell(9.3, 10.4, 1.6, 1.6, 0, true), ell(14.7, 10.4, 1.6, 1.6, 0, true), rect(9.4, 13.6, 5.2, 1.4, 0.7, true), rect(1.8, 11.6, 4.6, 1.8, 0.9), rect(17.6, 11.6, 4.6, 1.8, 0.9), poly([9.2, 16.8, 14.8, 16.8, 13.6, 22.2, 10.4, 22.2], 0.8)],
    door: [gear(12, 12, 11.2, 9.4, 12, 0.46, 0.62, 0.5), ell(12, 12, 7.6, 7.6, 0, true), ell(12, 12, 6.2), ell(12, 12, 3.6, 3.6, 0, true)],
    play: [poly([7, 3.4, 20.4, 12, 7, 20.6], 1.6)],
    ad: [rect(2, 4.4, 20, 15.2, 3), poly([10, 8.4, 15.8, 12, 10, 15.6], 0.8, true)],
    x: rot([rect(2.8, 10.8, 18.4, 2.4, 1.2)], 45).concat(rot([rect(2.8, 10.8, 18.4, 2.4, 1.2)], -45)),
    back: [poly([15.6, 3.2, 17.8, 5.4, 11.2, 12, 17.8, 18.6, 15.6, 20.8, 6.8, 12], 0.7)],
    sound: [speaker, arcBand(12.6, 12, 4, 5.8, -48 * D, 48 * D), arcBand(12.6, 12, 7.6, 9.4, -52 * D, 52 * D)],
    mute: [speaker].concat(rot([rect(14, 11, 8.8, 2, 1)], 45, 18.4, 12)).concat(rot([rect(14, 11, 8.8, 2, 1)], -45, 18.4, 12)),
    star: [poly((() => { const q = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 10.6; q.push(12 + Math.cos(a) * r, 12.8 + Math.sin(a) * r); } return q; })(), 0.9)],
    child: [ell(12, 7.4, 5), ell(10.2, 7.6, 0.85, 0.85, 0, true), ell(13.8, 7.6, 0.85, 0.85, 0, true), rect(10.6, 9.8, 2.8, 1, 0.5, true), ell(12, 17.6, 6.4, 4.8)],
    clock: [ell(12, 12, 10.2), poly([11.1, 5.2, 12.9, 5.2, 12.9, 11.2, 16.8, 13.5, 15.9, 15.1, 11.1, 12.3], 0.6, true)],
    junk: [gear(12, 12, 10.4, 7.8, 6, 0.5, 0.64, 0.9), ell(12, 12, 3.4, 3.4, 0, true)],
    paw: [ell(12, 16.2, 5.6, 4.8), ell(5.4, 10.2, 2.1, 2.7, -0.35), ell(9.4, 5.8, 2.2, 2.9, -0.1), ell(14.6, 5.8, 2.2, 2.9, 0.1), ell(18.6, 10.2, 2.1, 2.7, 0.35)],
    scissors: rot([poly([11, 13.2, 9.2, 1.8, 10.6, 1.6, 12.8, 12.6], 0.4), poly([13, 13.2, 14.8, 1.8, 13.4, 1.6, 11.2, 12.6], 0.4), ell(8.2, 18.2, 3.6), ell(8.2, 18.2, 1.9, 1.9, 0, true), ell(15.8, 18.2, 3.6), ell(15.8, 18.2, 1.9, 1.9, 0, true), poly([10.6, 12.2, 13.4, 12.2, 13.8, 15.4, 10.2, 15.4], 0.3)], 0),
    wrench: fit(rot([rect(10.6, 10.4, 2.8, 12, 1.4), poly((() => { const q = [], cx = 12, cy = 6.6, r = 5.8; const a0 = Math.acos(1.7 / r), st = -a0, en = Math.PI + a0; for (let i = 0; i <= 14; i++) { const a = st + (en - st) * i / 14; q.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } q.push(10.3, 6.4, 13.7, 6.4); return q; })().map((v, i, a) => v), 0.5)], 45), 0, 0.6, 0.98),
    sun: [ell(12, 12, 4.8)].concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => rot([rect(11, 1.2, 2, 3.8, 1)], i * 45)[0])),
  };
  const out = {};
  for (const k in I) out[k] = str(I[k]);
  return out;
})();
const P2D = {};
function icoPath(k) { return P2D[k] || (P2D[k] = new Path2D(ICON[k])); }
function svg(k, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`; }
const RES_ICON = { power: 'power', food: 'food', water: 'water', caps: 'caps', quantum: 'quantum', stim: 'stim', rad: 'rad', cola: 'quantum' };
const RES_COL = { power: '#f6c945', food: '#e8914a', water: '#52b7ea', caps: '#e2c779', quantum: '#3fe0d0', stim: '#ef6a5a', rad: '#f09a3a', cola: '#ef5470' };

// ===== Звук (WebAudio, без файлов) =====
const Snd = {
  ctx: null, on: true, master: null, paused: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  pause(p) {
    this.paused = p;
    if (!this.ctx) return;
    try { p ? this.ctx.suspend() : this.ctx.resume(); } catch (e) {}
  },
  tone(f, dur, type = 'square', vol = 0.08, slide = 0, delay = 0) {
    if (!this.on || !this.ctx || this.paused) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  },
  click() { this.tone(520, 0.05, 'square', 0.04); },
  collect() { this.tone(660, 0.07, 'triangle', 0.1); this.tone(990, 0.09, 'triangle', 0.08, 0, 0.06); },
  coin() { this.tone(1200, 0.05, 'square', 0.05); this.tone(1600, 0.08, 'square', 0.05, 0, 0.05); },
  build() { this.noise(0.18, 0.12, 700); this.tone(140, 0.12, 'sawtooth', 0.06); this.tone(220, 0.1, 'square', 0.05, 0, 0.12); this.tone(330, 0.18, 'triangle', 0.07, 0, 0.24); },
  level() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, 0, i * 0.08)); },
  alarm() { for (let i = 0; i < 3; i++) this.tone(480, 0.35, 'sawtooth', 0.06, 380, i * 0.4); },
  bad() { this.tone(200, 0.2, 'square', 0.06, -80); },
  open() { this.tone(300, 0.08, 'triangle', 0.08, 300); },
  shot(beam) {
    if (!this.on || !this.ctx || this.paused) return;
    const n = performance.now();
    if (n - (this._shotT || 0) < 70) return;
    this._shotT = n;
    if (beam) this.tone(1400, 0.08, 'sawtooth', 0.025, -900);
    else this.noise(0.06, 0.05, 1800);
  },
  noise(dur, vol, freq) {
    if (!this.on || !this.ctx || this.paused) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq || 1200; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    } catch (e) {}
  },
  stranger() { [392, 523, 659, 784, 659, 523].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.06, 0, i * 0.14)); },
  door() { this.noise(0.35, 0.07, 260); this.tone(62, 0.7, 'sawtooth', 0.035, -18); this.tone(110, 0.12, 'square', 0.03, -40, 0.05); this.noise(0.5, 0.025, 3000); },
  baby() { [880, 1175, 1318].forEach((f, i) => this.tone(f, 0.15, 'sine', 0.08, 0, i * 0.1)); },
};
