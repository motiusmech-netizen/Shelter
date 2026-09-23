// ===== Персонажи: жители, враги, питомцы, незнакомец =====
const INK = 'rgba(26,18,12,.72)';
function outfitLook(o) {
  if (!o) return { style: 'vault', c1: '#2d63b5', c2: '#f2c531' };
  const d = OUTFITS[o.id];
  return { style: d[4], c1: d[3], c2: d[5], hat: d[6] };
}
function pantsOf(L) {
  switch (L.style) {
    case 'jacket': return '#39405a';
    case 'coat': return '#4a4f5a';
    case 'shirt': return L.c2;
    case 'armor': return '#3b3f44';
    case 'raider': return '#3a2e26';
    case 'rags': return '#4a4234';
    case 'trench': return '#2e2a26';
    default: return L.c1;
  }
}
function sleeveOf(L) {
  switch (L.style) {
    case 'overall': return L.c2;
    case 'armor': return '#3b3f44';
    case 'rags': return null;
    default: return L.c1;
  }
}

// Универсальный рисовальщик человека. P — параметры, вид справа, ноги в (0,0)
function drawHuman(g, P) {
  const L = P.look;
  const s = P.s;
  const ph = P.ph || 0, t = P.t || 0;
  let legA = 0, legB = 0, armN = 0.12, armF = -0.1, bob = 0, lean = 0, headTilt = 0;
  switch (P.pose) {
    case 'walk': legA = Math.sin(ph) * 0.55; legB = -legA; armN = -Math.sin(ph) * 0.5; armF = -armN; bob = Math.abs(Math.cos(ph)) * 0.9; break;
    case 'run': legA = Math.sin(ph) * 0.8; legB = -legA; armN = -Math.sin(ph) * 0.9 - 0.3; armF = Math.sin(ph) * 0.9 - 0.3; bob = Math.abs(Math.cos(ph)) * 1.4; lean = 0.12; break;
    case 'work': armN = -0.9 + Math.sin(t * 7 + P.id) * 0.45; armF = -0.6 + Math.cos(t * 5 + P.id) * 0.25; bob = Math.sin(t * 3.5 + P.id) * 0.35; lean = 0.05; break;
    case 'exercise': { const k = (Math.sin(t * 3 + P.id) + 1) / 2; armN = -2.9 + k * 1.3; armF = armN + 0.1; bob = k * 1.8; legA = k * 0.3; legB = -k * 0.3; break; }
    case 'fight': armN = -1.5 + Math.sin(t * 22 + P.id) * 0.04; armF = -1.15; legA = 0.28; legB = -0.22; lean = 0.06; break;
    case 'melee': armN = -2.4 + (Math.sin(t * 9 + P.id) + 1) * 1.1; armF = -0.8; legA = 0.3; legB = -0.25; lean = 0.1; break;
    case 'dance': armN = -2.5 + Math.sin(t * 6 + P.id) * 0.5; armF = -2.2 - Math.sin(t * 6 + P.id) * 0.5; bob = Math.abs(Math.sin(t * 6 + P.id)) * 1.6; legA = Math.sin(t * 6) * 0.3; legB = -legA; headTilt = Math.sin(t * 6) * 0.12; break;
    case 'talk': armN = -0.6 + Math.sin(t * 4 + P.id) * 0.35; armF = 0.1; headTilt = Math.sin(t * 2.3 + P.id) * 0.06; bob = Math.sin(t * 2 + P.id) * 0.3; break;
    case 'hunch': armN = -1.35 + Math.sin(t * 5 + P.id) * 0.15; armF = -1.2 + Math.cos(t * 5 + P.id) * 0.15; lean = 0.32; legA = Math.sin(ph) * 0.4; legB = -legA; break;
    default: bob = Math.sin(t * 2 + P.id) * 0.35; armN = 0.1 + Math.sin(t * 2 + P.id) * 0.04; armF = -0.06;
  }
  const power = L.style === 'power';
  const pants = pantsOf(L), sleeve = sleeveOf(L);
  const skin = P.skin;
  g.save();
  g.translate(P.x, P.y);
  g.scale(P.face * s, s);
  if (P.alpha != null) g.globalAlpha = P.alpha;
  // тень
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0.2, power ? 10 : 8, 2, 0, 0, 7); g.fill();
  const lw = 0.9 / Math.max(0.6, s);
  g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round';
  const legW = power ? 3.2 : 2.35;
  const leg = (xo, a, dark) => {
    g.save(); g.translate(xo, -12 + bob * 0.2); g.rotate(a);
    g.fillStyle = dark ? shade(pants, -0.22) : pants;
    rr(g, -legW, -1, legW * 2, 11.5, legW * 0.8); g.fill(); g.stroke();
    g.fillStyle = dark ? '#221810' : '#33251a';
    rr(g, -legW - 0.3, 8.6, legW * 2 + 2.4, 3.4, 1.4); g.fill(); g.stroke();
    if (L.style === 'armor' && !dark) { g.fillStyle = L.c1; rr(g, -legW, 3, legW * 2, 3, 1); g.fill(); }
    g.restore();
  };
  const armW = power ? 2.6 : 1.85;
  const hand = (a, dark) => {
    const px = dark ? -3.6 : 3.6, py = -23.5 - bob;
    g.save(); g.translate(px, py); g.rotate(a);
    if (sleeve) { g.fillStyle = dark ? shade(sleeve, -0.22) : sleeve; rr(g, -armW, -1, armW * 2, 9.5, armW); g.fill(); g.stroke(); }
    else { g.fillStyle = dark ? shade(skin, -0.2) : skin; rr(g, -armW * 0.8, -1, armW * 1.6, 9.5, armW); g.fill(); g.stroke(); }
    if (L.style === 'vault' || L.style === 'jump') { g.fillStyle = L.c2; g.fillRect(-armW, 6.8, armW * 2, 1.4); }
    g.fillStyle = power ? shade(L.c1, -0.3) : (L.style === 'hazmat' || L.style === 'ninja' ? '#2a2a2a' : skin);
    g.beginPath(); g.arc(0, 9.6, power ? 2.5 : 1.9, 0, 7); g.fill(); g.stroke();
    g.restore();
    const hx = px - Math.sin(a) * 9.6, hy = py + Math.cos(a) * 9.6;
    return [hx, hy];
  };
  // длинные волосы сзади
  const hx = 0.8 + lean * 10, hy = -32.8 - bob;
  if (!P.helmet && (P.hair === 'long')) { g.fillStyle = shade(P.hairC, -0.1); rr(g, hx - 9, hy - 2, 9, 15, 3.5); g.fill(); g.stroke(); }
  if (!P.helmet && P.hair === 'pony') {
    const sw = Math.sin(t * 3 + P.id) * 1.5 + (P.pose === 'walk' ? Math.sin(ph) * 1.5 : 0);
    g.fillStyle = P.hairC; g.beginPath(); g.moveTo(hx - 6, hy - 4); g.quadraticCurveTo(hx - 14 + sw, hy + 1, hx - 11 + sw, hy + 9); g.quadraticCurveTo(hx - 8, hy + 3, hx - 5, hy + 1); g.fill(); g.stroke();
  }
  leg(-1.4, legB, true);
  const fh = hand(armF, true);
  leg(1.5, legA, false);
  // туловище
  g.save();
  g.translate(0, -bob); g.rotate(lean);
  const tw = power ? 8.2 : 6.2;
  if (L.style === 'coat' || L.style === 'ranger' || L.style === 'trench') {
    g.fillStyle = shade(L.c1, -0.1);
    poly(g, [-tw - 0.5, -24, tw + 0.5, -24, tw + 2, -4, -tw - 2, -4]); g.fill(); g.stroke();
  }
  g.fillStyle = L.c1;
  rr(g, -tw, -26.5, tw * 2, 15.5, power ? 4.5 : 3.6); g.fill(); g.stroke();
  // объём туловища
  g.fillStyle = 'rgba(255,255,255,.14)'; rr(g, -tw + 1, -25.5, tw * 0.7, 13.5, 2.5); g.fill();
  g.fillStyle = 'rgba(0,0,0,.14)'; rr(g, tw * 0.35, -25.5, tw * 0.6, 13.5, 2.5); g.fill();
  if (P.preg) { g.fillStyle = L.c1; g.beginPath(); g.ellipse(tw - 1.5, -16.5, 3.6, 4.4, 0, 0, 7); g.fill(); g.stroke(); }
  switch (L.style) {
    case 'vault': case 'jump':
      g.fillStyle = L.c2; g.fillRect(1.2, -26, 1.6, 13.8);
      poly(g, [-3.6, -26.6, 4.2, -26.6, 2.8, -24.2, 0.6, -23, -1.8, -24.4]); g.fill();
      g.fillStyle = '#2a2320'; g.fillRect(-tw, -13.4, tw * 2, 1.8);
      g.fillStyle = L.c2; g.fillRect(1, -13.6, 2.2, 2.2);
      if (L.style === 'vault' && !P.kid) { g.fillStyle = L.c2; g.font = `700 3.6px ${FONT_D}`; g.textAlign = 'center'; g.fillText(P.num || '', -2.4, -17); }
      break;
    case 'jacket':
      g.fillStyle = L.c2; poly(g, [0, -26.2, 5, -26.2, 3.4, -12]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(0.4, -26); g.lineTo(3, -12); g.stroke(); g.strokeStyle = INK;
      break;
    case 'formal':
      g.fillStyle = '#f2efe6'; poly(g, [0.6, -26.4, 5.4, -26.4, 3, -17]); g.fill();
      g.fillStyle = L.c2;
      if (L.c1 === '#17181d') { poly(g, [1.4, -25.6, 4.6, -25.6, 3, -24.2]); g.fill(); poly(g, [1.4, -23, 4.6, -23, 3, -24.2]); g.fill(); }
      else { poly(g, [2.4, -25.8, 3.6, -25.8, 4, -19.5, 3, -18, 2, -19.5]); g.fill(); }
      g.fillStyle = shade(L.c1, 0.15); poly(g, [-1, -26.4, 0.8, -26.4, 2.6, -16.5, 1.2, -16.5]); g.fill();
      break;
    case 'coat':
      g.fillStyle = '#8aa0b4'; poly(g, [0.4, -26.4, 5.2, -26.4, 3, -16]); g.fill();
      g.fillStyle = shade(L.c1, -0.08); poly(g, [-0.6, -26.4, 1.2, -26.4, 3.2, -14, 1.6, -12]); g.fill();
      g.fillStyle = L.c2; g.fillRect(-3.4, -21, 2.6, 0.9);
      break;
    case 'overall':
      g.fillStyle = L.c2; rr(g, -tw, -26.5, tw * 2, 7, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = -5; i < 6; i += 2.2) g.fillRect(i, -26.4, 0.6, 7);
      g.fillStyle = L.c1; rr(g, -3.5, -21.5, 8, 10, 1.5); g.fill(); g.fillRect(-4, -26.5, 1.3, 6); g.fillRect(3.3, -26.5, 1.3, 6);
      g.fillStyle = '#e8c35a'; g.fillRect(-3.8, -21.4, 1, 1); g.fillRect(3.5, -21.4, 1, 1);
      break;
    case 'shirt':
      g.fillStyle = 'rgba(255,245,200,.85)'; for (const [a, b] of [[-3, -22], [2, -19], [-1, -15], [4, -24], [-4, -16]]) { g.beginPath(); g.arc(a, b, 1.2, 0, 7); g.fill(); }
      g.fillStyle = '#f2d24a'; for (const [a, b] of [[-3, -22], [2, -19], [-1, -15]]) { g.beginPath(); g.arc(a, b, 0.5, 0, 7); g.fill(); }
      break;
    case 'uniform':
      g.fillStyle = L.c2; g.fillRect(-tw, -14, tw * 2, 1.8); rr(g, 1, -24, 4, 3.5, 0.8); g.fill(); rr(g, -4.5, -24, 4, 3.5, 0.8); g.fill();
      g.fillStyle = '#d9b24a'; g.fillRect(2.4, -13.8, 1.4, 1.4);
      break;
    case 'armor': case 'raider':
      g.fillStyle = L.style === 'raider' ? '#6a4a30' : L.c1;
      rr(g, -tw + 0.4, -26, tw * 2 - 0.8, 11, 2.5); g.fill(); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-tw + 1, -20.6, tw * 2 - 2, 0.7);
      g.fillStyle = L.style === 'raider' ? '#5a4030' : shade(L.c1, 0.12);
      g.beginPath(); g.ellipse(2.8, -25, 4.4, 2.8, 0.2, 0, 7); g.fill(); g.stroke();
      if (L.style === 'raider') { g.fillStyle = '#b8b0a0'; for (let i = 0; i < 3; i++) { poly(g, [0.5 + i * 2.2, -27, 1.6 + i * 2.2, -30.5, 2.6 + i * 2.2, -27]); g.fill(); } }
      break;
    case 'power':
      g.fillStyle = shade(L.c1, -0.25); rr(g, -tw + 1, -20, tw * 2 - 2, 3, 1); g.fill();
      g.fillStyle = shade(L.c1, 0.1); g.beginPath(); g.ellipse(3.2, -25.5, 6, 3.8, 0.15, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#e8b422'; g.fillRect(-2, -18.6, 5, 1.2);
      break;
    case 'ninja':
      g.fillStyle = L.c2; g.fillRect(-tw, -14, tw * 2, 2);
      break;
    case 'hazmat':
      g.fillStyle = L.c2; g.fillRect(-tw, -14, tw * 2, 1.8); g.fillStyle = '#2a2a2a'; rr(g, -2, -24, 5, 5, 1); g.fill();
      break;
    case 'ranger': case 'trench':
      g.fillStyle = shade(L.c1, 0.12); poly(g, [-1, -26.4, 1.2, -26.4, 3.6, -12, 2, -11]); g.fill();
      g.fillStyle = '#2a2420'; g.fillRect(-tw, -15, tw * 2, 1.6);
      break;
    case 'rags':
      g.fillStyle = shade(L.c1, -0.2); poly(g, [-tw, -12, -3, -8.5, 0, -12, 3, -9, tw, -12, tw, -14, -tw, -14]); g.fill();
      g.fillStyle = shade(skin, -0.1); g.beginPath(); g.arc(-2, -20, 1.8, 0, 7); g.fill();
      break;
  }
  g.restore();
  // голова
  g.save();
  g.translate(hx, hy); g.rotate(headTilt + lean * 0.5);
  const hr = P.kid ? 8.6 : 8;
  g.fillStyle = skin; g.fillRect(-2.2, 5, 4.4, 4);
  const helmet = P.helmet;
  if (helmet === 'power') {
    g.fillStyle = vgrad(g, -10, 9, [shade(L.c1, 0.2), shade(L.c1, -0.3)]);
    rr(g, -9, -10, 18, 19, 7); g.fill(); g.stroke();
    g.fillStyle = '#1a1a1a'; rr(g, 1, -3.5, 8.6, 4.5, 1.8); g.fill();
    g.fillStyle = P.visor || '#ffb43a'; rr(g, 2, -2.8, 7, 2.6, 1.2); g.fill();
    g.fillStyle = shade(L.c1, -0.35); for (let i = 0; i < 3; i++) g.fillRect(3 + i * 2, 3, 1, 4);
    g.restore(); postHead(); return;
  }
  if (helmet === 'ranger') {
    g.fillStyle = '#2a2622'; rr(g, -8.8, -9.6, 17.6, 18, 7); g.fill(); g.stroke();
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(3, -1.5, 1.9, 0, 7); g.arc(7.6, -1.5, 1.6, 0, 7); g.fill();
    g.fillStyle = '#4a4440'; rr(g, 3, 2, 5, 5, 2); g.fill();
    g.fillStyle = '#3a342c'; g.beginPath(); g.ellipse(0, -8, 12, 3, 0, 0, 7); g.fill(); g.stroke(); rr(g, -6, -15, 12, 8, 3); g.fill(); g.stroke();
    g.restore(); postHead(); return;
  }
  // лицо
  g.fillStyle = skin;
  g.beginPath(); g.arc(0, 0, hr, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(1.5, -2.5, hr * 0.6, 0, 7); g.fill();
  g.fillStyle = shade(skin, -0.18); g.beginPath(); g.ellipse(-2.4, 0.8, 1.6, 2.1, 0, 0, 7); g.fill(); g.stroke();
  if (L.style === 'hazmat') { g.fillStyle = L.c1; g.beginPath(); g.arc(0, 0, hr + 1.6, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(160,210,230,.55)'; rr(g, 0.5, -5, 8, 8.5, 3); g.fill(); g.fillStyle = skin; }
  const blink = ((t * 0.9 + P.id * 0.37) % 4) < 0.1;
  const mood = P.mood;
  const eyeY = -1.2;
  const eye = (ex, near) => {
    if (blink) { g.strokeStyle = '#2a1a12'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(ex - 1.2, eyeY); g.lineTo(ex + 1.2, eyeY); g.stroke(); g.strokeStyle = INK; g.lineWidth = lw; return; }
    g.fillStyle = P.glowEyes || '#ffffff'; g.beginPath(); g.ellipse(ex, eyeY, near ? 1.6 : 1.3, 2, 0, 0, 7); g.fill();
    if (!P.glowEyes) { g.fillStyle = '#20150e'; g.beginPath(); g.arc(ex + 0.5, eyeY + 0.3, near ? 1 : 0.85, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(ex + 0.6, eyeY - 0.5, 0.5, 0.5); }
    if (P.female) { g.strokeStyle = '#20150e'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ex + 0.8, eyeY - 1.8); g.lineTo(ex + 1.9, eyeY - 2.5); g.stroke(); g.strokeStyle = INK; g.lineWidth = lw; }
  };
  eye(2.2, false); eye(5.8, true);
  // брови
  g.strokeStyle = shade(P.hairC || '#3a2a1a', -0.2); g.lineWidth = 0.8;
  const bro = mood === 'angry' ? 0.6 : mood === 'sad' ? -0.5 : 0;
  g.beginPath(); g.moveTo(1, -4.3 - bro * 0.3); g.lineTo(3.3, -4 + bro); g.moveTo(4.6, -4 + bro); g.lineTo(7, -4.4 - bro * 0.3); g.stroke();
  // нос
  g.fillStyle = shade(skin, -0.12); g.beginPath(); g.ellipse(8.1, 1.4, 1.3, 1.1, 0, 0, 7); g.fill();
  // рот
  g.strokeStyle = '#5a2418'; g.lineWidth = 0.8;
  const talk = P.pose === 'talk' && Math.sin(t * 12 + P.id) > 0;
  if (mood === 'fight' || talk) { g.fillStyle = '#4a1a14'; g.beginPath(); g.ellipse(5, 4.4, 1.3, talk ? 0.9 : 1.3, 0, 0, 7); g.fill(); }
  else if (mood === 'happy') { g.beginPath(); g.arc(4.8, 2.8, 2.3, 0.35, Math.PI - 0.35); g.stroke(); }
  else if (mood === 'sad') { g.beginPath(); g.arc(4.8, 6, 2, Math.PI + 0.5, -0.5); g.stroke(); }
  else { g.beginPath(); g.moveTo(3.4, 4.4); g.lineTo(6.2, 4.2); g.stroke(); }
  if (P.female || mood === 'happy') { g.fillStyle = 'rgba(255,110,110,.25)'; g.beginPath(); g.arc(6.4, 2.2, 1.5, 0, 7); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = lw;
  // борода
  if (P.beard && P.beard !== 'none') {
    g.fillStyle = P.beard === 'stubble' ? rgba(P.hairC, 0.35) : P.hairC;
    if (P.beard === 'mustache') { rr(g, 3.2, 2.6, 5.4, 1.5, 0.7); g.fill(); }
    else { g.beginPath(); g.moveTo(-2, 2); g.quadraticCurveTo(0, 8.5, 5, 8.2); g.quadraticCurveTo(8.5, 6, 8.2, 3.4); g.lineTo(6.5, 3.8); g.quadraticCurveTo(4.5, 5.8, 2.5, 3.8); g.closePath(); g.fill(); if (P.beard === 'beard') g.stroke(); }
  }
  if (L.style === 'ninja') { g.fillStyle = L.c1; g.beginPath(); g.arc(0, 0, hr + 0.2, -0.1, Math.PI + 0.35); g.fill(); g.fillStyle = L.c2; g.fillRect(-8, -5.6, 16, 1.6); }
  // волосы спереди
  if (L.style !== 'hazmat' && L.style !== 'ninja') drawHair(g, P.hair, P.hairC, lw);
  // головные уборы
  const hat = P.hat;
  if (hat === 'fedora') { g.fillStyle = '#3a2c22'; g.beginPath(); g.ellipse(0, -6, 12, 2.4, -0.05, 0, 7); g.fill(); g.stroke(); rr(g, -6.5, -13, 13, 7.5, 3); g.fill(); g.stroke(); g.fillStyle = '#9a2a2a'; g.fillRect(-6.5, -8, 13, 1.4); }
  else if (hat === 'top') { g.fillStyle = '#141418'; g.beginPath(); g.ellipse(0, -6.5, 11, 2, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(-6, -18, 12, 12); g.strokeRect(-6, -18, 12, 12); g.fillStyle = '#c79a2a'; g.fillRect(-6, -9, 12, 1.4); }
  else if (hat === 'straw') { g.fillStyle = '#d8b86a'; g.beginPath(); g.ellipse(0, -6, 13, 2.6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -8, 6.5, 4, 0, Math.PI, 0); g.fill(); g.stroke(); }
  else if (hat === 'cap') { g.fillStyle = L.c2; g.beginPath(); g.arc(0, -4, 8.4, Math.PI, 0); g.fill(); g.stroke(); rr(g, 4, -5, 7, 2, 1); g.fill(); }
  else if (hat === 'helmet') { g.fillStyle = shade(L.c1, -0.1); g.beginPath(); g.arc(0, -3, 9.2, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(-1, -7, 4, Math.PI, 0); g.fill(); }
  g.restore();
  postHead();
  function postHead() {
    // ближняя рука и оружие
    const nh = hand(armN, false);
    if (P.weapon) drawWeapon(g, P.weapon, nh[0], nh[1], armN, P);
    if (P.bird) drawBird(g, P.bird, -3.2, -27 - bob, t);
    g.restore();
  }
}
function drawHair(g, st, col, lw) {
  if (!st) return;
  g.fillStyle = col;
  g.strokeStyle = INK;
  const top = () => { g.beginPath(); g.moveTo(-8.3, 1.5); g.quadraticCurveTo(-9.3, -8.5, -0.5, -9.2); g.quadraticCurveTo(7.4, -9.6, 8.4, -3); g.lineTo(6.2, -4.4); g.quadraticCurveTo(1.5, -5.6, -2.6, -2.6); g.lineTo(-4.4, 1.8); g.closePath(); };
  switch (st) {
    case 'crew': top(); g.fill(); g.stroke(); g.fillStyle = shade(col, 0.2); g.fillRect(-4, -8, 6, 1); break;
    case 'buzz': g.globalAlpha *= 0.6; top(); g.fill(); g.globalAlpha /= 0.6; break;
    case 'part': top(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-1, -9); g.quadraticCurveTo(7, -10, 9, -2.2); g.quadraticCurveTo(5, -6, 1, -5); g.fill(); g.stroke(); break;
    case 'slick': g.beginPath(); g.moveTo(-8.3, 1.5); g.quadraticCurveTo(-9.6, -9.5, 0, -10.2); g.quadraticCurveTo(8, -11.5, 9.2, -5); g.quadraticCurveTo(5, -6, 2, -5.4); g.quadraticCurveTo(-2, -4, -4.4, 1.8); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(1, -8.5, 4, 0.8, -0.1, 0, 7); g.fill(); break;
    case 'mohawk': g.globalAlpha *= 0.4; top(); g.fill(); g.globalAlpha /= 0.4; g.beginPath(); g.moveTo(-6, -6); for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.16); g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); g.lineTo(Math.cos(a + 0.08) * 8, Math.sin(a + 0.08) * 8); } g.closePath(); g.fill(); g.stroke(); break;
    case 'curly': for (let i = 0; i < 9; i++) { const a = Math.PI * (0.85 + i * 0.16); g.beginPath(); g.arc(Math.cos(a) * 7.2 - 0.5, Math.sin(a) * 7.2 - 1, 3.4, 0, 7); g.fill(); g.stroke(); } top(); g.fill(); break;
    case 'bob': g.beginPath(); g.moveTo(7.6, -3); g.quadraticCurveTo(6, -10.5, -1, -9.8); g.quadraticCurveTo(-10.5, -9, -9.2, 6.5); g.lineTo(-3, 6.8); g.lineTo(-3.2, 0); g.quadraticCurveTo(1, -4.5, 8.8, -1.4); g.closePath(); g.fill(); g.stroke(); break;
    case 'long': case 'pony': case 'bun':
      top(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-0.5, -9); g.quadraticCurveTo(8, -9, 9, -1.6); g.quadraticCurveTo(4.5, -6, 0.5, -5.2); g.fill();
      if (st === 'bun') { g.beginPath(); g.arc(-5.5, -8.5, 3.8, 0, 7); g.fill(); g.stroke(); }
      break;
  }
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
function dwellerParams(d, x, y, t, pose, s) {
  const L = outfitLook(d.outfit);
  const hat = L.hat === 'helmet' || L.hat === 'ranger' ? null : L.hat;
  const P = {
    x, y, face: d.face || 1, s: (d.child ? 0.62 : 1) * (s || 1), id: d.id, t, ph: d.walk * 0.22, pose, look: L,
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
