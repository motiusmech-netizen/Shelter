// ===== Значки в мире: медальоны готовности, таблички комнат, шкалы =====
const BADGE = { cache: new Map() };
const KIND_COL = { power: '#f6c945', food: '#f08a3c', water: '#4fb8f0', train: '#9ad06a', storage: '#b8a488', living: '#e6a0c0', radio: '#c58af0', craft: '#7dd0b0', med: '#ef6a5a', sci: '#5ae0c8', rule: '#f2d06a' };
function roomAccent(t) {
  const d = ROOMS[t]; if (!d) return '#9aa0a4';
  if (d.res === 'power' || d.res === 'food' || d.res === 'water') return RES_COL[d.res];
  if (d.res === 'stim') return KIND_COL.med;
  if (d.res === 'rad') return KIND_COL.sci;
  if (d.kind === 'train') return KIND_COL.train;
  if (d.kind === 'craft') return KIND_COL.craft;
  if (d.kind === 'radio') return KIND_COL.radio;
  if (d.kind === 'storage') return KIND_COL.storage;
  if (t === 'living') return KIND_COL.living;
  return KIND_COL.rule;
}
function badgeK() { return Math.min(4, Math.max(1, Math.ceil(Cam.dpr * 1.1))); }
// медальон: металлический обод, цветной диск, пиктограмма, блик и хвостик-указатель
function medal(icon, col, k, tail = true, text = null) {
  const key = icon + '|' + col + '|' + k + '|' + tail + '|' + text;
  let c = BADGE.cache.get(key);
  if (c) return c;
  const R = 15, S = 40;
  c = mkCanvas(S * k, S * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, S / 2 * k, (S / 2 - 3) * k);
  // тень
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(0, 2.2, R + 0.6, R + 0.4, 0, 0, 7); g.fill();
  // обод и хвостик
  const rim = g.createLinearGradient(0, -R, 0, R + 5);
  rim.addColorStop(0, '#ffffff'); rim.addColorStop(0.45, '#d8d2c2'); rim.addColorStop(1, '#7c7666');
  g.fillStyle = rim;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2);
  if (tail) { g.moveTo(-4.2, R - 1.8); g.lineTo(0, R + 4.6); g.lineTo(4.2, R - 1.8); }
  g.fill();
  g.strokeStyle = 'rgba(20,14,8,.7)'; g.lineWidth = 0.9;
  g.beginPath(); g.arc(0, 0, R, 0.62 * Math.PI + (tail ? 0.08 : 0), 0.38 * Math.PI + 2 * Math.PI - (tail ? 0.08 : 0)); g.stroke();
  // диск
  const Rd = R - 2.6;
  const dg = g.createRadialGradient(-3, -5, 1, 0, 0, Rd);
  dg.addColorStop(0, mixc(col, '#ffffff', 0.45)); dg.addColorStop(0.55, col); dg.addColorStop(1, mixc(col, '#1a0e04', 0.45));
  g.fillStyle = dg; g.beginPath(); g.arc(0, 0, Rd, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.stroke();
  // пиктограмма
  g.save();
  g.shadowColor = 'rgba(40,20,0,.6)'; g.shadowBlur = 1.5 * k; g.shadowOffsetY = 0.8 * k;
  g.fillStyle = '#ffffff';
  if (text) { g.font = `700 17px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 1); }
  else { g.translate(-8.5, -8.5); g.scale(17 / 24, 17 / 24); g.fill(icoPath(icon)); }
  g.restore();
  // блик
  g.save(); g.beginPath(); g.arc(0, 0, Rd, 0, 7); g.clip();
  const gl = g.createLinearGradient(0, -Rd, 0, 0);
  gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.beginPath(); g.ellipse(0, -Rd * 0.55, Rd * 0.85, Rd * 0.5, 0, 0, 7); g.fill();
  g.restore();
  BADGE.cache.set(key, c);
  return c;
}
function drawMedal(x, y, icon, col, s, opt = {}) {
  const k = badgeK();
  const c = medal(icon, col, k, opt.tail !== false, opt.text || null);
  const S = 40 * s;
  ctx.drawImage(c, x - S / 2, y - (S / 2 - 3 * s), S, S);
}
// табличка с названием комнаты
function roomPlate(r, k) {
  const def = ROOMS[r.t];
  const key = r.t + '|' + r.l + '|' + k + '|' + (r.s || 1);
  let c = BADGE.cache.get(key);
  if (c) return c;
  const name = def.n.toUpperCase();
  const m = mkCanvas(4, 4).getContext('2d');
  m.font = `600 6.6px ${FONT_D}`;
  const tw = m.measureText(name).width + name.length * 0.35;
  const W = Math.ceil(tw + 26), H = 11;
  c = mkCanvas((W + 2) * k, (H + 3) * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, k, k);
  const acc = roomAccent(r.t);
  // тень и основа
  g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, 0.5, 1.2, W, H, 2.4); g.fill();
  g.fillStyle = vgrad(g, 0, H, ['#3a3f38', '#22251f', '#171914']); rr(g, 0, 0, W, H, 2.4); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 0.6; rr(g, 0, 0, W, H, 2.4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(2, 0.5, W - 4, 0.5);
  // цветная метка
  g.save(); rr(g, 0, 0, W, H, 2.4); g.clip();
  g.fillStyle = vgrad(g, 0, H, [mixc(acc, '#ffffff', 0.35), acc, mixc(acc, '#000000', 0.35)]); g.fillRect(0, 0, 3.2, H);
  g.restore();
  // текст с тиснением
  g.font = `600 6.6px ${FONT_D}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  if ('letterSpacing' in g) g.letterSpacing = '0.35px';
  g.fillStyle = 'rgba(0,0,0,.8)'; g.fillText(name, 6.4, H / 2 + 0.9);
  g.fillStyle = '#f1e8cf'; g.fillText(name, 6.4, H / 2 + 0.3);
  // уровень: три ромба
  const px = W - 17;
  for (let i = 0; i < 3; i++) {
    const cx = px + i * 4.6, cy = H / 2;
    g.beginPath(); g.moveTo(cx, cy - 2.4); g.lineTo(cx + 1.9, cy); g.lineTo(cx, cy + 2.4); g.lineTo(cx - 1.9, cy); g.closePath();
    if (i < r.l) { g.fillStyle = vgrad(g, cy - 2.4, cy + 2.4, ['#fff0b0', '#ffc24a', '#b8740a']); g.fill(); }
    else { g.fillStyle = 'rgba(0,0,0,.55)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 0.4; g.stroke(); }
  }
  c._w = W + 2; c._h = H + 3;
  BADGE.cache.set(key, c);
  return c;
}
// шкала прогресса производства: стеклянная трубка с цветной жидкостью
function drawProgress(x, y, w, p, col, t) {
  const h = 3.4;
  ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, x - 0.6, y - 0.6, w + 1.2, h + 1.2, 2.2); ctx.fill();
  ctx.fillStyle = '#0b0c0a'; rr(ctx, x, y, w, h, 1.7); ctx.fill();
  const fw = Math.max(h, w * clamp(p, 0, 1));
  ctx.fillStyle = vgrad(ctx, y, y + h, [mixc(col, '#ffffff', 0.5), col, mixc(col, '#000000', 0.35)]);
  rr(ctx, x, y, fw, h, 1.7); ctx.fill();
  // бегущий блик
  ctx.save(); rr(ctx, x, y, fw, h, 1.7); ctx.clip();
  const sx = x + ((t * 30) % (w + 30)) - 15;
  const sg = ctx.createLinearGradient(sx - 8, 0, sx + 8, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(sx - 8, y, 16, h);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 1.5, y + 0.5, w - 3, 0.5);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(col, 0.18); rr(ctx, x - 1, y - 1.5, fw + 2, h + 3, 2.5); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
