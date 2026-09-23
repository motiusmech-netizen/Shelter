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

// ===== Иконки (SVG path 24x24, используются и в DOM, и в canvas) =====
function gearPath(cx, cy, ro, ri2, teeth, hole) {
  let p = '';
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const r = i % 2 ? ri2 : ro;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    p += (i ? 'L' : 'M') + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'L' + x1.toFixed(2) + ' ' + y1.toFixed(2);
  }
  p += 'Z';
  if (hole) p += `M${cx + hole} ${cy}A${hole} ${hole} 0 1 0 ${cx - hole} ${cy}A${hole} ${hole} 0 1 0 ${cx + hole} ${cy}Z`;
  return p;
}
const ICON = {
  power: 'M13.5 1.5 4 13.5h6.2L9 22.5l10-12.4h-6.3z',
  food: 'M15.4 2.6a6 6 0 0 0-5.9 7.2l-5 5a2.3 2.3 0 1 0 1.9 3 2.3 2.3 0 1 0 3-1.9l5-5a6 6 0 1 0 1-8.3z',
  water: 'M12 1.8C8.2 7.6 5 11.3 5 15.2a7 7 0 0 0 14 0c0-3.9-3.2-7.6-7-13.4zM9.2 14.6a1 1 0 0 1 1 1 2.2 2.2 0 0 0 2.2 2.2 1 1 0 0 1 0 2 4.2 4.2 0 0 1-4.2-4.2 1 1 0 0 1 1-1z',
  caps: gearPath(12, 12, 10.5, 8.6, 14, 4.2),
  quantum: 'M10 1.5h4v2.8l1.6 2.6c.5.8.8 1.8.8 2.8v10.3a2.5 2.5 0 0 1-2.5 2.5H10.1a2.5 2.5 0 0 1-2.5-2.5V9.7c0-1 .3-2 .8-2.8L10 4.3zM9.6 11v5h4.8v-5z',
  stim: 'M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z',
  rad: 'M7.5 2h9v2.6L19 8.2V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8.2l2.5-3.6zM12 10.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm0 2.3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  people: 'M9 11.5a4.3 4.3 0 1 0 0-8.6 4.3 4.3 0 0 0 0 8.6zM1 21.5c0-4.4 3.6-8 8-8s8 3.6 8 8zM16.4 11a3.5 3.5 0 0 0 0-7 3.4 3.4 0 0 0-1.3.3 6 6 0 0 1 0 6.4c.4.2.8.3 1.3.3zM18.2 13.8c2.7 1 4.8 3.8 4.8 7.7h-4.1c0-3-1-5.7-2.9-7.5z',
  smile: 'M12 1.8a10.2 10.2 0 1 0 0 20.4 10.2 10.2 0 0 0 0-20.4zM8.4 7.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zm7.2 0a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM6.8 13.6h10.4a5.2 5.2 0 0 1-10.4 0z',
  build: 'M2.8 18.6l8.4-8.4 2.6 2.6-8.4 8.4a1.8 1.8 0 0 1-2.6-2.6zM9.6 5.2l3.6-3 3 .4 5.6 5.6-2.6 2.6-1.7-1.7-2.4 2.4-4.2-4.2 1-1.1z',
  box: 'M3 8.5h18V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20zM4.5 4h15L21 7H3zM9 2h6v1.4H9zM9.5 11.5h5v2.5h-5z',
  map: 'M1.5 20.5l7-10.2 4.2 6.2 3-4.3 6.8 8.3zM17.5 2.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z',
  list: 'M5 3.5h3.3a3.8 3.8 0 0 1 7.4 0H19v18.5H5zM8 10h8v2H8zm0 4h8v2H8zm0-8.3v1.6h8V5.7zM12 2.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
  menu: gearPath(12, 12, 10.5, 7.8, 8, 3.6),
  bag: 'M8 6.2V5a4 4 0 0 1 8 0v1.2h1.5A2.5 2.5 0 0 1 20 8.7V22H4V8.7a2.5 2.5 0 0 1 2.5-2.5zm2 0h4V5a2 2 0 0 0-4 0zM7.5 13h9v3.5h-9z',
  gun: 'M2 7.5h19.5v4.3h-7.7l-1.3 2.4H9.3l-1 5.8H3.7L5 11.8H2z',
  shirt: 'M8.2 2.5 2 6.5l2.3 4.4 2.9-1.2V21.5h9.6V9.7l2.9 1.2L22 6.5l-6.2-4c-.2 2-1.8 3.4-3.8 3.4S8.4 4.5 8.2 2.5z',
  heart: 'M12 21.2S3 15.8 3 9.4A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 9 2.6c0 6.4-9 11.8-9 11.8z',
  up: 'M12 2.5l8 8.6h-4.8v10.4H8.8V11.1H4z',
  radio: 'M3.5 9.5h17v12h-17zM6 8.5l11.5-5 .8 1.8L10.8 8.5zM8.5 12.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM14.5 13h4v1.6h-4zm0 3h4v1.6h-4z',
  fire: 'M12.2 1.8c1 4.2 6.3 6.4 6.3 12.6a6.5 6.5 0 0 1-13 0c0-3.2 2-5.3 3.2-6.4 0 2.1 1 3.3 2.2 3.3 0-3.4-.9-6.3 1.3-9.5z',
  alert: 'M12 2 1.5 21h21zM11 9h2v6h-2zm0 7.8h2v2h-2z',
  skull: 'M12 2a8.5 8.5 0 0 0-8.5 8.5c0 2.8 1.3 5 3.5 6.5v3.5h10V17c2.2-1.5 3.5-3.7 3.5-6.5A8.5 8.5 0 0 0 12 2zM8.5 9.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10.5 17h1.2v2h-1.2zm1.8 0h1.2v2h-1.2z',
  bolt2: 'M13.5 1.5 4 13.5h6.2L9 22.5l10-12.4h-6.3z',
  robot: 'M11 1.5h2V4h4.5a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5H15l1.5 5h-9L9 16H6.5A2.5 2.5 0 0 1 4 13.5v-7A2.5 2.5 0 0 1 6.5 4H11zM8.8 7.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zm6.4 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z',
  door: gearPath(12, 12, 11, 9.6, 12, 0),
  play: 'M6 3.5v17l14-8.5z',
  ad: 'M2.5 5h19v14h-19zM10 8.5v7l5.8-3.5z',
  x: 'M5.6 4.2 12 10.6l6.4-6.4 1.4 1.4-6.4 6.4 6.4 6.4-1.4 1.4-6.4-6.4-6.4 6.4-1.4-1.4 6.4-6.4-6.4-6.4z',
  back: 'M15.4 3.6 7 12l8.4 8.4 1.8-1.8L10.6 12l6.6-6.6z',
  sound: 'M3 9h4l5-4.5v15L7 15H3zM15.5 8a5.5 5.5 0 0 1 0 8l-1.3-1.4a3.6 3.6 0 0 0 0-5.2zm2.7-2.8a9.4 9.4 0 0 1 0 13.6l-1.3-1.4a7.5 7.5 0 0 0 0-10.8z',
  mute: 'M3 9h4l5-4.5v15L7 15H3zM15.3 8.9l1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z',
  star: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z',
  child: 'M12 3.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7.5 21.5l1-8h7l1 8z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 4h2v5.6l3.8 2.3-1 1.7-4.8-2.9z',
  junk: gearPath(12, 12, 10, 7.5, 6, 3),
  paw: 'M12 11.5c-3.4 0-6.6 4.4-6.6 7.2 0 1.8 1.5 2.8 3.2 2.8 1.5 0 2.2-.8 3.4-.8s1.9.8 3.4.8c1.7 0 3.2-1 3.2-2.8 0-2.8-3.2-7.2-6.6-7.2zM5 7.2a2.2 2.8 0 1 1 0 5.6 2.2 2.8 0 0 1 0-5.6zm14 0a2.2 2.8 0 1 1 0 5.6 2.2 2.8 0 0 1 0-5.6zM9 2.8a2.3 3 0 1 1 0 6 2.3 3 0 0 1 0-6zm6 0a2.3 3 0 1 1 0 6 2.3 3 0 0 1 0-6z',
  scissors: 'M6.5 3a3.5 3.5 0 0 1 3.2 4.9L12 10.2l7.3-7.3 1.8 1.8L9.7 16.1A3.5 3.5 0 1 1 7.9 14.3l2.3-2.3-2.3-2.3A3.5 3.5 0 1 1 6.5 3zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7.4-2.1 1.8-1.8 5.4 5.4-1.8 1.8z',
  wrench: 'M20.5 6.6a5.5 5.5 0 0 1-7.2 6.6l-7.5 7.5a2.1 2.1 0 0 1-3-3l7.5-7.5a5.5 5.5 0 0 1 6.6-7.2l-3.2 3.2.6 2.8 2.8.6z',
  sun: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z',
};
const P2D = {};
function icoPath(k) { return P2D[k] || (P2D[k] = new Path2D(ICON[k])); }
function svg(k, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${ICON[k]}"/></svg>`; }
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
  baby() { [880, 1175, 1318].forEach((f, i) => this.tone(f, 0.15, 'sine', 0.08, 0, i * 0.1)); },
};
