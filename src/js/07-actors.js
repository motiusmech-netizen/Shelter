// ===== Персонажи: жители, враги, питомцы, незнакомец =====
const INK = 'rgba(26,18,12,.72)';
function outfitLook(o) {
  if (!o) return { style: 'vault', c1: '#2d63b5', c2: '#f2c531' };
  const d = OUTFITS[o.id];
  return { style: d[4], c1: d[3], c2: d[5], hat: d[6] };
}
function drawWeapon(g, id, hx, hy, armA, P) {
  const w = WEAPONS[id]; if (!w) return;
  const kind = w[4], beam = w[5], rar = w[3];
  const rot = armA + Math.PI / 2;
  g.save(); g.translate(hx, hy); g.rotate(rot);
  const metal = rar === 2 ? '#8a8f96' : '#3a3d42', wood = '#7a4e28';
  const parts = []; // [path, color]
  const R = (x, y, w2, h, r) => P2(p => p.roundRect ? p.roundRect(x, y, w2, h, r) : p.rect(x, y, w2, h));
  let muzzle = 0;
  switch (kind) {
    case 'pistol':
      parts.push([R(-1, -2.4, 8.6, 2.8, 0.7), beam ? '#b8bec4' : metal], [P2(p => { p.moveTo(-0.6, 0.2); p.lineTo(1.8, 0.2); p.lineTo(1.2, 4.2); p.lineTo(-1.2, 4.2); p.closePath(); }), beam ? '#4a4e54' : '#5a3a20']);
      if (beam) parts.push([R(4.8, -2, 2.6, 2, 0.4), beam]);
      muzzle = 7.8; break;
    case 'smg':
      parts.push([R(-2.4, -2.6, 12.4, 3.2, 0.8), metal], [R(2.2, 0.4, 1.8, 4.6, 0.4), '#2a2c30'], [R(-1.2, 0.2, 1.8, 3, 0.4), '#2a2c30']);
      muzzle = 10.4; break;
    case 'rifle': case 'sniper': {
      const L = kind === 'sniper' ? 17 : 14;
      parts.push([P2(p => { p.moveTo(-7.4, -1.4); p.lineTo(0, -1.8); p.lineTo(0, 1.4); p.lineTo(-7, 2.2); p.closePath(); }), beam ? '#aab0b6' : wood]);
      parts.push([R(-0.6, -2.4, L, 2.8, 0.6), beam ? '#6e757c' : metal]);
      if (kind === 'sniper') parts.push([R(2, -5, 7.4, 2.2, 1), '#1c1d20']);
      if (beam) parts.push([R(7.5, -1.9, 4.2, 1.6, 0.6), beam]);
      muzzle = L - 0.6; break;
    }
    case 'shotgun':
      parts.push([P2(p => { p.moveTo(-6.4, -1.2); p.lineTo(0.4, -1.6); p.lineTo(0.4, 1.6); p.lineTo(-6, 2.2); p.closePath(); }), wood], [R(0, -2.8, 12.4, 1.7, 0.5), metal], [R(0, -1.2, 12.4, 1.7, 0.5), metal]);
      muzzle = 12.4; break;
    case 'minigun':
      parts.push([R(-4, -4.2, 8.4, 7.6, 2), '#3a3c40']);
      for (let i = 0; i < 3; i++) parts.push([R(3.4, -3.8 + i * 2.3, 12, 1.7, 0.5), metal]);
      muzzle = 15.4; break;
    case 'launcher':
      parts.push([R(-6, -3.4, 18.6, 6.6, 2.6), '#56663e'], [R(8.6, -3.6, 1.6, 7, 0.4), '#e8b422']);
      muzzle = 12.6; break;
    case 'bat':
      parts.push([P2(p => { p.moveTo(0, -1); p.lineTo(0, 1); p.lineTo(15.4, 2.3); p.quadraticCurveTo(16.8, 0, 15.4, -2.3); p.closePath(); }), '#c89254']);
      break;
    case 'knife':
      parts.push([R(-1.2, -0.9, 3.4, 1.8, 0.4), '#2a2a2a'], [P2(p => { p.moveTo(2.2, -1); p.lineTo(9, -0.3); p.lineTo(2.2, 1); p.closePath(); }), '#dfe4e6']);
      break;
  }
  crInk(g, parts.map(x => x[0]), 0.45);
  for (const [p, c] of parts) cel(g, p, c, { d: 0.6, h: 0.35, sx: 0.2 });
  if (kind === 'bat') { g.strokeStyle = 'rgba(80,40,10,.4)'; g.lineWidth = 0.25; g.beginPath(); g.moveTo(3, -0.4); g.lineTo(14, -0.9); g.stroke(); g.fillStyle = '#3a2410'; g.fillRect(0, -1.1, 2.4, 2.2); }
  // вспышка выстрела
  if (P.firing && muzzle) {
    g.globalCompositeOperation = 'lighter';
    const c = beam || '#ffd070';
    const gr = g.createRadialGradient(muzzle + 1.5, -1, 0, muzzle + 1.5, -1, 7);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, rgba(c, 0.95)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(muzzle + 1.5, -1, 7, 0, 7); g.fill();
    g.fillStyle = rgba(c, 0.9); g.beginPath(); g.moveTo(muzzle, -2.2); g.lineTo(muzzle + 9, -1); g.lineTo(muzzle, 0.2); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
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
  const atk = inc.en.length && S.dwellers.some(d => d.room === inc.room && d.st === 'vault');
  if (k === 'roach') drawRoach(g, x, y, face, t, en.tg * 1.7);
  else if (k === 'molerat') drawMolerat(g, x, y, face, t, en.tg * 2.3, atk);
  else if (k === 'scorp') drawScorp(g, x, y, face, t, en.tg * 1.1);
  else if (k === 'beast') drawBeast(g, x, y, face, t, en.tg * 0.9, atk);
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
