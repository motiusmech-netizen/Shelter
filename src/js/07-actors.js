// ===== Персонажи: жители, враги, питомцы, незнакомец =====
const INK = 'rgba(26,18,12,.72)';
function outfitLook(o) {
  if (!o) return { style: 'vault', c1: '#2d63b5', c2: '#f2c531' };
  const d = OUTFITS[o.id];
  return { style: d[4], c1: d[3], c2: d[5], hat: d[6] };
}
function drawWeapon(g, id, hx, hy, armA, P) {
  const w = WEAPONS[id]; if (!w) return;
  const kind = w[4], beam = w[5];
  const rot = armA + Math.PI / 2;
  g.save(); g.translate(hx, hy); g.rotate(rot);
  const metal = '#2b2d30', wood = '#6a4424';
  g.strokeStyle = INK; g.lineWidth = 0.6;
  let muzzle = 0;
  switch (kind) {
    case 'pistol': g.fillStyle = beam ? '#8a8f94' : metal; rr(g, -1.2, -2.2, 8.5, 2.6, 0.8); g.fill(); g.stroke(); g.fillStyle = metal; rr(g, -0.6, -0.4, 2.2, 4, 0.6); g.fill(); if (beam) { g.fillStyle = beam; g.fillRect(5.5, -1.8, 2, 1.6); } muzzle = 7.6; break;
    case 'smg': g.fillStyle = metal; rr(g, -2, -2.4, 12, 3, 0.8); g.fill(); g.stroke(); g.fillRect(2, 0, 2, 5); g.fillRect(-1, -0.2, 1.8, 3); muzzle = 10.4; break;
    case 'rifle': case 'sniper':
      g.fillStyle = beam ? '#9aa0a6' : wood; rr(g, -7, -1.6, 7, 3, 1); g.fill(); g.stroke();
      g.fillStyle = beam ? '#6a7076' : metal; rr(g, -0.5, -2.2, kind === 'sniper' ? 17 : 14, 2.6, 0.6); g.fill(); g.stroke();
      if (kind === 'sniper') { g.fillStyle = '#1a1a1a'; rr(g, 2, -4.6, 7, 2, 0.8); g.fill(); }
      if (beam) { g.fillStyle = beam; g.fillRect(8, -1.6, 4, 1.4); }
      muzzle = kind === 'sniper' ? 16.5 : 13.5; break;
    case 'shotgun': g.fillStyle = wood; rr(g, -6, -1.4, 6.5, 3, 1); g.fill(); g.stroke(); g.fillStyle = metal; rr(g, 0, -2.6, 12, 1.5, 0.5); g.fill(); rr(g, 0, -1.1, 12, 1.5, 0.5); g.fill(); muzzle = 12; break;
    case 'minigun': g.fillStyle = '#3a3c40'; rr(g, -4, -4, 8, 7, 2); g.fill(); g.stroke(); g.fillStyle = metal; for (let i = 0; i < 3; i++) rr(g, 3, -3.5 + i * 2.2, 12, 1.6, 0.5), g.fill(); muzzle = 15; break;
    case 'launcher': g.fillStyle = '#4a5a3a'; rr(g, -6, -3.2, 18, 6, 2.5); g.fill(); g.stroke(); g.fillStyle = '#e8b422'; g.fillRect(8, -3.2, 1.4, 6); muzzle = 12; break;
    case 'bat': g.fillStyle = '#b8864a'; poly(g, [0, -1, 0, 1, 16, 2.2, 16, -2.2]); g.fill(); g.stroke(); break;
    case 'knife': g.fillStyle = '#2a2a2a'; g.fillRect(-1, -0.8, 3, 1.6); g.fillStyle = '#d8dcdc'; poly(g, [2, -0.9, 8.5, -0.3, 2, 0.9]); g.fill(); break;
  }
  // вспышка выстрела
  if (P.firing && muzzle) {
    g.globalCompositeOperation = 'lighter';
    const c = beam || '#ffd070';
    const gr = g.createRadialGradient(muzzle + 1, -1, 0, muzzle + 1, -1, 6);
    gr.addColorStop(0, rgba(c, 0.95)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(muzzle + 1, -1, 6, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}
function drawBird(g, pet, x, y, t) {
  const T = PET_TYPES.find(p => p.id === pet.type) || PET_TYPES[7];
  g.save(); g.translate(x, y);
  const bob = Math.sin(t * 4) * 0.4;
  g.fillStyle = T.c2; poly(g, [-2, 1 + bob, -6, 7, -3.5, 7.5]); g.fill();
  g.fillStyle = T.c1; g.beginPath(); g.ellipse(0, -1 + bob, 2.6, 3.4, 0.3, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.5; g.stroke();
  g.beginPath(); g.arc(1.5, -4.4 + bob, 2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(2.2, -4.8 + bob, 0.5, 0, 7); g.fill();
  g.fillStyle = '#e8c35a'; poly(g, [3.3, -4.6 + bob, 5.2, -3.8 + bob, 3.3, -3.2 + bob]); g.fill();
  g.restore();
}
function drawPet(g, pet, x, y, face, moving, t, s = 1) {
  const T = PET_TYPES.find(p => p.id === pet.type);
  if (!T || T.k === 'bird') return;
  g.save(); g.translate(x, y); g.scale(face * s, s);
  g.strokeStyle = INK; g.lineWidth = 0.6;
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0.2, 7, 1.5, 0, 0, 7); g.fill();
  const ph = t * 12, lg = moving ? Math.sin(ph) * 1.8 : 0;
  const cat = T.k === 'cat';
  const bodyY = cat ? -5 : -6;
  g.fillStyle = shade(T.c1, -0.2);
  for (const [lx, o] of [[-3.5, lg], [3, -lg]]) g.fillRect(lx + o * 0.4, bodyY + 1, 1.6, -bodyY - 1);
  // хвост
  g.strokeStyle = T.c1; g.lineWidth = cat ? 1.3 : 1.6; g.lineCap = 'round';
  const wag = Math.sin(t * (cat ? 2 : 14)) * (cat ? 2 : 3);
  g.beginPath(); g.moveTo(-5, bodyY - 1);
  if (cat) g.quadraticCurveTo(-9, bodyY - 4, -8 + wag * 0.5, bodyY - 9); else g.quadraticCurveTo(-8, bodyY - 3, -9, bodyY - 4 + wag);
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 0.6;
  g.fillStyle = T.c1; g.beginPath(); g.ellipse(0, bodyY, cat ? 5.6 : 6.2, cat ? 2.6 : 3.2, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = T.c1;
  for (const [lx, o] of [[-2.4, -lg], [4.2, lg]]) { g.fillRect(lx + o * 0.4, bodyY + 1, 1.7, -bodyY - 1); }
  g.fillStyle = T.c2; g.beginPath(); g.ellipse(-1, bodyY - 1.2, 3, 1.6, 0, 0, 7); g.fill();
  // голова
  const hx = cat ? 5.6 : 6.4, hy = bodyY - (cat ? 3.2 : 3.4);
  g.fillStyle = T.c1; g.beginPath(); g.arc(hx, hy, cat ? 2.6 : 3, 0, 7); g.fill(); g.stroke();
  if (cat) { g.beginPath(); g.moveTo(hx - 2, hy - 1.5); g.lineTo(hx - 1.4, hy - 4.6); g.lineTo(hx, hy - 2.4); g.moveTo(hx + 0.6, hy - 2.4); g.lineTo(hx + 1.8, hy - 4.6); g.lineTo(hx + 2.4, hy - 1.2); g.fill(); }
  else { g.fillStyle = T.c1; rr(g, hx + 1, hy - 0.4, 3.6, 2.4, 1); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(hx + 4.4, hy + 0.2, 0.8, 0, 7); g.fill(); g.fillStyle = T.c2; g.beginPath(); g.ellipse(hx - 1.4, hy - 0.4, 1.2, 2.6, 0.3, 0, 7); g.fill(); }
  g.fillStyle = '#1a1410'; g.beginPath(); g.arc(hx + 1.1, hy - 0.8, 0.55, 0, 7); g.fill();
  g.restore();
}

// ===== Жители в мире =====
function moodOf(d) { if (d.fight > 0) return 'fight'; if (d.hap >= 70) return 'happy'; if (d.hap < 35) return 'sad'; return 'calm'; }
const WORK_KIND = { diner: 'cook', garden: 'cook', science: 'type', medbay: 'type', radio: 'type', overseer: 'type', water: 'type', purifier: 'type' };
function dwellerParams(d, x, y, t, pose, s) {
  const L = outfitLook(d.outfit);
  const sc = (d.child ? 0.62 : 1);
  const rm = d.room ? RM(d.room) : null;
  const hat = L.hat === 'helmet' || L.hat === 'ranger' ? null : L.hat;
  const P = {
    x, y, face: d.face || 1, s: sc * (s || 1), id: d.id, t, ph: d.walk * (pose === 'run' ? 0.14 : 0.194) / sc, pose, look: L,
    wk: rm ? WORK_KIND[rm.t] || 'tool' : 'tool',
    skin: d.look.skin, hairC: d.look.hair, hair: d.look.hs2 || 'crew', beard: d.g === 'm' ? d.look.beard : null, female: d.g === 'f',
    kid: d.child > 0, preg: d.preg > 0, mood: moodOf(d), hat, num: S ? S.vault : '',
    helmet: L.style === 'power' ? 'power' : L.hat === 'ranger' ? 'ranger' : null,
    weapon: (pose === 'fight' || pose === 'melee') && d.weapon ? d.weapon.id : null, firing: d.fireT > 0,
    bird: d.pet && PET_TYPES.find(p => p.id === d.pet.type && p.k === 'bird') ? d.pet : null,
  };
  if (L.hat === 'helmet') P.hat = 'helmet';
  return P;
}
function drawDwellerAt(d, x, y, t, pose, o = {}) {
  if (d.rar === 2 && !o.noGlow) {
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y - 18, 2, x, y - 18, 26);
    gr.addColorStop(0, 'rgba(255,200,80,.28)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 26, y - 44, 52, 52);
    ctx.globalCompositeOperation = 'source-over';
  }
  drawHuman(ctx, dwellerParams(d, x, y, t, pose, o.s));
}

// ===== Враги =====
function drawEnemy(inc, en, x, y, t) {
  const face = en.face || 1;
  const k = inc.k;
  const g = ctx;
  if (k === 'raider' || k === 'ghoul') {
    const raider = k === 'raider';
    drawHuman(g, {
      x, y, face, s: 1, id: en.tg * 7 + 3, t, ph: t * 8 + en.tg, pose: raider ? 'fight' : 'hunch',
      look: raider ? { style: 'raider', c1: '#5a3a26', c2: '#3a2a1a' } : { style: 'rags', c1: '#5b5040', c2: '#3a3226' },
      skin: raider ? ['#d8a07a', '#b07650', '#e8b690'][en.tg % 3] : '#9aa36a', hairC: raider ? '#c0301c' : '#5a5a3a', hair: raider ? 'mohawk' : 'buzz',
      mood: 'angry', weapon: raider ? ['pipe', 'bat', 'rifle', 'p10'][en.tg % 4] : null, firing: raider && Math.sin(t * 7 + en.tg) > 0.7,
      glowEyes: raider ? null : '#e8f070',
    });
    return;
  }
  g.save(); g.translate(x, y); g.scale(face, 1);
  g.strokeStyle = INK; g.lineWidth = 0.7;
  if (k === 'roach') {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0, 9, 1.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a180c'; g.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) { const l = Math.sin(t * 24 + i * 2) * 1.8; g.beginPath(); g.moveTo(-3 + i * 3.5, -2.5); g.lineTo(-5 + i * 3.5 + l, -0.3); g.lineTo(-6 + i * 3.5 + l, 0); g.stroke(); }
    g.fillStyle = vgrad(g, -8, 0, ['#a0703a', '#5a3818']); g.beginPath(); g.ellipse(0, -4, 8, 3.8, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.stroke();
    g.fillStyle = 'rgba(255,230,180,.35)'; g.beginPath(); g.ellipse(-1, -5.8, 4.5, 1.2, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a220e'; g.beginPath(); g.moveTo(-0.5, -7.6); g.lineTo(-0.5, -0.5); g.stroke();
    g.fillStyle = '#4a2c12'; g.beginPath(); g.arc(7.6, -3.6, 2.4, 0, 7); g.fill();
    g.strokeStyle = '#3a220e'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(9, -5); g.quadraticCurveTo(14, -12, 17, -9 + Math.sin(t * 9) * 2); g.moveTo(9, -4); g.quadraticCurveTo(15, -8, 18, -5); g.stroke();
  } else if (k === 'molerat') {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0, 11, 2, 0, 0, 7); g.fill();
    const lg = Math.sin(t * 16 + en.tg) * 1.5;
    g.fillStyle = '#9a6e62'; g.fillRect(-6 + lg, -4, 2.4, 4); g.fillRect(5 - lg, -4, 2.4, 4);
    g.strokeStyle = '#b88a7a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -6); g.quadraticCurveTo(-18, -4, -20, -9 + Math.sin(t * 6) * 2); g.stroke();
    g.fillStyle = vgrad(g, -14, 0, ['#d8a898', '#9a6e62']); g.strokeStyle = INK; g.lineWidth = 0.7;
    g.beginPath(); g.ellipse(0, -7, 11, 6, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(11, -8, 5.4, 4.2, 0.25, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#f2ecd8'; g.fillRect(14, -6, 1.4, 4); g.fillRect(15.6, -6, 1.4, 4.3);
    g.fillStyle = '#1a0e0a'; g.beginPath(); g.arc(12.5, -10, 0.9, 0, 7); g.fill();
    g.fillStyle = 'rgba(80,40,30,.35)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-6 + i * 4, -9, 1.2, 0, 7); g.fill(); }
  } else if (k === 'scorp') {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 0, 18, 2.5, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a2410'; g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { const l = Math.sin(t * 14 + i) * 2; g.beginPath(); g.moveTo(-8 + i * 5, -5); g.lineTo(-11 + i * 5 + l, -1); g.lineTo(-12 + i * 5 + l, 0); g.stroke(); }
    g.fillStyle = vgrad(g, -16, 0, ['#b8884a', '#6a4418']); g.strokeStyle = INK; g.lineWidth = 0.8;
    g.beginPath(); g.ellipse(0, -8, 14, 6, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.2)'; for (let i = -8; i < 12; i += 4.5) g.fillRect(i, -13.5, 0.8, 11);
    // хвост
    g.strokeStyle = '#8a5a28'; g.lineWidth = 4.2; g.lineCap = 'round';
    const tw2 = Math.sin(t * 5) * 2;
    g.beginPath(); g.moveTo(-12, -10); g.quadraticCurveTo(-26, -28, -10 + tw2, -34); g.stroke();
    g.fillStyle = '#d8f04a'; g.beginPath(); g.arc(-8 + tw2, -33, 2.6, 0, 7); g.fill();
    // клешни
    g.fillStyle = '#9a6a30'; g.strokeStyle = INK; g.lineWidth = 0.8;
    const cl = Math.sin(t * 7) * 0.2;
    g.save(); g.translate(14, -8); g.rotate(-0.3 + cl); g.beginPath(); g.ellipse(6, 0, 7, 3.4, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(12, -2); g.lineTo(16, -4); g.lineTo(12, 0); g.moveTo(12, 1); g.lineTo(16, 3); g.stroke(); g.restore();
  } else if (k === 'beast') {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 0, 16, 3, 0, 0, 7); g.fill();
    const st = Math.sin(t * 6 + en.tg);
    g.fillStyle = '#3a3224'; g.strokeStyle = INK; g.lineWidth = 0.9;
    // хвост
    g.beginPath(); g.moveTo(-6, -18); g.quadraticCurveTo(-22, -12, -26, -2 + st * 2); g.lineTo(-24, -1 + st * 2); g.quadraticCurveTo(-18, -9, -4, -12); g.fill(); g.stroke();
    // ноги
    g.fillStyle = '#2e281c'; g.save(); g.translate(-3, -14); g.rotate(st * 0.25); rr(g, -3, 0, 6, 14, 3); g.fill(); g.stroke(); g.restore();
    g.fillStyle = '#3a3224'; g.save(); g.translate(4, -14); g.rotate(-st * 0.25); rr(g, -3, 0, 6, 14, 3); g.fill(); g.stroke(); g.restore();
    // тело
    g.fillStyle = vgrad(g, -40, -10, ['#5a5038', '#2e281c']);
    g.beginPath(); g.ellipse(2, -26, 10, 15, 0.35, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-4 + i * 2, -34 + i * 3, 1.3, 0, 7); g.fill(); }
    // руки с когтями
    g.fillStyle = '#3a3224';
    g.save(); g.translate(8, -30); g.rotate(-0.6 + st * 0.5); rr(g, -2.5, 0, 5, 14, 2.5); g.fill(); g.stroke();
    g.fillStyle = '#e8e0c8'; for (let i = 0; i < 3; i++) { poly(g, [-2 + i * 2, 13, -1 + i * 2, 21, 0 + i * 2, 13]); g.fill(); } g.restore();
    // голова
    g.fillStyle = '#4a4230'; g.beginPath(); g.ellipse(12, -42, 7.5, 5.5, 0.25, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#e8e0c8'; poly(g, [8, -46, 3, -58, 10, -47]); g.fill(); g.stroke(); poly(g, [13, -46, 11, -56, 15, -46]); g.fill();
    g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(15, -43.5, 1.2, 0, 7); g.fill();
    g.fillStyle = '#f2ecd8'; for (let i = 0; i < 4; i++) poly(g, [14 + i * 1.6, -39, 14.8 + i * 1.6, -36.5, 15.6 + i * 1.6, -39]), g.fill();
  }
  g.restore();
}
function drawFire(en, x, y, t, hpk) {
  const g = ctx;
  const h = 12 + 22 * hpk;
  g.save(); g.translate(x, y);
  g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(0, -h * 0.4, 0, 0, -h * 0.4, h * 1.6);
  gl.addColorStop(0, 'rgba(255,140,40,.55)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = gl; g.fillRect(-h * 1.6, -h * 2, h * 3.2, h * 2.6);
  g.globalCompositeOperation = 'source-over';
  const cols = ['#b8301a', '#ff6a1a', '#ffb23a', '#fff0a0'];
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.22;
    const fl = Math.sin(t * 13 + en.tg * 3 + i * 2) * 3 * k, fl2 = Math.cos(t * 11 + en.tg + i) * 2;
    g.fillStyle = cols[i];
    g.beginPath(); g.moveTo(-11 * k, 0);
    g.bezierCurveTo(-12 * k, -h * 0.4 * k, -4 * k + fl2, -h * 0.55 * k, fl, -h * k);
    g.bezierCurveTo(4 * k + fl2, -h * 0.6 * k, 12 * k, -h * 0.35 * k, 11 * k, 0);
    g.closePath(); g.fill();
  }
  g.restore();
  if (Math.random() < 0.15) R.parts.push({ x: x + rf(-6, 6), y: y - h * 0.8, vx: rf(-6, 6), vy: rf(-30, -14), t: 0, life: rf(1, 1.8), col: 'rgba(60,55,50,.35)', s: rf(3, 6), smoke: true });
  if (Math.random() < 0.2) R.parts.push({ x: x + rf(-6, 6), y: y - h * 0.5, vx: rf(-10, 10), vy: rf(-50, -20), t: 0, life: rf(0.5, 1), col: '#ffc24a', s: rf(0.8, 1.6), ember: true });
}
function drawStranger(x, y, t, a) {
  drawHuman(ctx, {
    x, y, face: -1, s: 1, id: 777, t, pose: 'idle', look: { style: 'trench', c1: '#4a4038', c2: '#2a2420' },
    skin: '#c9a88a', hairC: '#2a2420', hair: 'crew', mood: 'calm', hat: 'fedora', alpha: a,
  });
}
function drawCar(x, y, t, lit) {
  const g = ctx;
  const w = 34, h = FH - 16;
  const x0 = x - w / 2, y0 = y + 4;
  g.fillStyle = '#2e3134'; rr(g, x0, y0, w, h, 2); g.fill();
  g.fillStyle = vgrad(g, y0, y0 + h, ['#5a5f64', '#3a3e42']); g.fillRect(x0 + 2, y0 + 3, w - 4, h - 6);
  g.fillStyle = lit ? 'rgba(255,240,200,.9)' : '#8a8a80'; g.fillRect(x0 + 8, y0 + 2, w - 16, 1.4);
  g.fillStyle = '#1e2124'; g.fillRect(x0, y0 + h - 4, w, 4);
  g.strokeStyle = '#8a9096'; g.lineWidth = 0.8;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x0 + i * (w / 6), y0 + 3); g.lineTo(x0 + i * (w / 6), y0 + h - 4); g.stroke(); }
}
