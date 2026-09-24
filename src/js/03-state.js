// ===== Состояние игры =====
let S = null;              // сохраняемое состояние
const R = {                // рантайм (не сохраняется)
  dmap: new Map(), rmap: new Map(), grid: [], floaters: [], parts: [],
  tick1: 0, saveT: 0, offline: false, playing: false, paused: false,
  place: null, sel: null, flash: 0, powerCheck: 0,
  carF: {}, labelW: {}, tracers: [], say: null, stranger: null, doorHold: 0, doorOpen: 0,
};
const SAVE_KEY = 'atom_shelter_save_v1';

function uid() { return ++S.nid; }
function D(id) { return R.dmap.get(id); }
function RM(id) { return R.rmap.get(id); }
function door() { return S.rooms[0]; }

function roomW(r) { return r.t === 'door' ? DOOR_W : r.t === 'elev' ? 1 : r.s * 3; }
function roomX(r) { return r.c * CW; }
function roomY(r) { return SURF + r.f * FH; }
function roomCap(r) {
  if (r.t === 'door') return 2;
  if (r.t === 'elev' || r.t === 'overseer') return 0;
  return r.s * 2;
}
function roomName(r) {
  if (r.t === 'door') return 'Дверь убежища';
  if (r.t === 'elev') return 'Лифт';
  return ROOMS[r.t].n;
}

function reindex() {
  R.dmap.clear();
  for (const d of S.dwellers) R.dmap.set(d.id, d);
  R.rmap.clear();
  for (const r of S.rooms) R.rmap.set(r.id, r);
  rebuildGrid();
}
function rebuildGrid() {
  R.grid = [];
  for (let f = 0; f < MAXF; f++) R.grid.push(new Array(GW).fill(null));
  for (const r of S.rooms) {
    const w = roomW(r);
    for (let i = 0; i < w; i++) if (R.grid[r.f]) R.grid[r.f][r.c + i] = r;
  }
}
function at(f, c) { return f >= 0 && f < MAXF && c >= 0 && c < GW ? R.grid[f][c] : null; }
function maxFloor() { let m = 0; for (const r of S.rooms) if (r.f > m) m = r.f; return m; }

// ===== Жители =====
function statBonus(d, i) { return d.outfit ? OUTFITS[d.outfit.id][1][i] : 0; }
function stat(d, i) { return d.sp[i] + statBonus(d, i); }
function bestStat(d) { let b = 0; for (let i = 1; i < 7; i++) if (stat(d, i) > stat(d, b)) b = i; return b; }
function xpNeed(l) { return Math.floor(40 + 30 * Math.pow(l, 1.4)); }
function maxHp(d) { return d.mhp * (hasTr(d, 'tough') ? 1.2 : 1); }
function effMax(d) { return Math.max(1, maxHp(d) - d.rad); }
function isAdult(d) { return !d.child; }
function fullName(d) { return d.name + ' ' + (d.g === 'f' ? femSurname(d.sur) : d.sur); }
function dmgAvg(d) { if (!d.weapon) return 1.2; const w = WEAPONS[d.weapon.id]; return (w[1] + w[2]) / 2; }
function dwellerDps(d) { return dmgAvg(d) * (0.9 + 0.02 * d.lvl) * (1 + stat(d, 0) * 0.015) * (1 + petBonus(d, 'dmg')) * (hasTr(d, 'brave') ? 1.25 : hasTr(d, 'coward') ? 0.8 : 1); }

function genDweller(o = {}) {
  const g = o.g || (rnd() < 0.5 ? 'm' : 'f');
  const rarity = o.rarity || 0;
  const sp = [1, 1, 1, 1, 1, 1, 1];
  let extra = rarity === 2 ? 30 : rarity === 1 ? ri(14, 20) : ri(4, 9);
  while (extra > 0) { const i = ri(0, 6); if (sp[i] < 10) { sp[i]++; extra--; } }
  const d = {
    id: uid(), name: pick(g === 'm' ? NAMES_M : NAMES_F), sur: pick(SURNAMES), g, rar: rarity,
    lvl: 1, xp: 0, sp, mhp: 105, hp: 105, rad: 0, hap: 60, lu: false,
    outfit: null, weapon: null, pet: null, room: null, st: 'vault', child: 0, preg: 0, father: 0, par: null, cd: 0, tp: 0,
    look: { skin: pick(SKINS), hair: pick(HAIRS), hs2: pick(g === 'm' ? HAIR_M : HAIR_F), beard: g === 'm' && rnd() < 0.35 ? pick(['stubble', 'mustache', 'beard']) : 'none' },
    x: 120, fy: 0, tx: 120, path: null, wait: 0, face: 1, walk: 0,
  };
  if (o.lvl) { d.lvl = o.lvl; d.mhp = 105 + (d.lvl - 1) * (2.5 + d.sp[2] * 0.5); d.hp = d.mhp; }
  rollTraits(d);
  d.hp = maxHp(d);
  return d;
}
function genLegend() {
  const L = pick(LEGENDS);
  const d = genDweller({ g: L.g, rarity: 2, lvl: ri(3, 8) });
  d.name = L.n; d.sur = L.s; d.sp = L.sp.slice(); d.leg = true;
  d.look.hs2 = L.hair; d.look.beard = L.beard || 'none';
  d.mhp = 105 + (d.lvl - 1) * (2.5 + d.sp[2] * 0.5); rollTraits(d); d.hp = maxHp(d);
  d.weapon = { u: uid(), k: 'w', id: L.w };
  d.outfit = { u: uid(), k: 'o', id: L.o };
  return d;
}
function related(a, b) {
  if (a.par && a.par.includes(b.id)) return true;
  if (b.par && b.par.includes(a.id)) return true;
  if (a.par && b.par && a.par.some(p => b.par.includes(p))) return true;
  return false;
}

// Живые жители, находящиеся в убежище
function inVault(d) { return d.st === 'vault'; }
function popCount() { return S.dwellers.length; }
function popCap() {
  let c = 10;
  for (const r of S.rooms) if (r.t === 'living') c += ROOMS.living.cap[r.l - 1] * r.s * (r.s === 1 ? 1 : r.s === 2 ? 1.05 : 1.1);
  return Math.min(200, Math.floor(c));
}
function pregnancies() { return S.dwellers.filter(d => d.preg > 0).length; }

// ===== Хранилища =====
function resCap(k) {
  if (k === 'caps') return 999999;
  if (k === 'quantum') return 9999;
  let c = 0;
  if (k === 'stim' || k === 'rad') {
    c = 5;
    const t = k === 'stim' ? 'medbay' : 'science';
    for (const r of S.rooms) if (r.t === t) c += ROOMS[t].store[r.l - 1] * r.s;
    return rsDone('logistics') ? Math.round(c * 1.25) : c;
  }
  c = 100;
  for (const r of S.rooms) {
    const def = ROOMS[r.t];
    if (!def || def.kind !== 'prod') continue;
    if (def.res === k || (def.res === 'cola' && (k === 'food' || k === 'water'))) c += def.store[r.l - 1] * r.s;
  }
  for (const r of S.rooms) if (r.t === 'storage') c += 25 * r.s * r.l;
  return rsDone('logistics') ? Math.round(c * 1.25) : c;
}
function itemCap() {
  let c = 10;
  for (const r of S.rooms) if (r.t === 'storage') c += ROOMS.storage.items[r.l - 1] * r.s;
  return c + (rsDone('logistics') ? 10 : 0);
}
function addRes(k, n) {
  const cap = resCap(k);
  const before = S.res[k];
  S.res[k] = clamp(S.res[k] + n, 0, Math.max(cap, before));
  if (n > 0 && S.res[k] > cap) S.res[k] = Math.max(cap, before);
  return S.res[k] - before;
}
function addCaps(n) { S.res.caps += n; if (n > 0) { S.stats.capsEarned += n; objProg('caps', n); } }
function addItem(it, silent) {
  if (S.inv.length >= itemCap()) {
    const p = sellPrice(it);
    addCaps(p);
    if (!silent) toast(`Склад полон: ${itemName(it)} продан за ${p} крышек`, 'warn');
    return false;
  }
  S.inv.push(it);
  return true;
}
function newItem(k, id) { return { u: uid(), k, id }; }
function itemName(it) { return it.k === 'w' ? WEAPONS[it.id][0] : OUTFITS[it.id][0]; }
function itemRar(it) { return it.k === 'w' ? WEAPONS[it.id][3] : OUTFITS[it.id][2]; }
function sellPrice(it) {
  const r = itemRar(it);
  if (it.k === 'w') { const w = WEAPONS[it.id]; return [10, 60, 250][r] + (w[1] + w[2]) * 2; }
  const o = OUTFITS[it.id]; return [10, 60, 250][r] + o[1].reduce((a, b) => a + b, 0) * 8;
}
function itemDesc(it) {
  if (it.k === 'w') { const w = WEAPONS[it.id]; return `Урон ${w[1]}–${w[2]}`; }
  const b = OUTFITS[it.id][1];
  return b.map((v, i) => (v ? `${STAT_ABBR[i]} +${v}` : '')).filter(Boolean).join(' · ');
}
function randomItem(rar, kind) {
  const k = kind || (rnd() < 0.5 ? 'w' : 'o');
  const src = k === 'w' ? WEAPONS : OUTFITS;
  const ids = Object.keys(src).filter(id => (k === 'w' ? src[id][3] : src[id][2]) === rar);
  return newItem(k, pick(ids));
}
function rollRarity(luck, bonus = 0) {
  const r = rnd();
  if (r < 0.015 + luck * 0.003 + bonus * 0.5) return 2;
  if (r < 0.12 + luck * 0.012 + bonus) return 1;
  return 0;
}

// ===== Рецепты =====
function recipe(k, id) {
  const rar = k === 'w' ? WEAPONS[id][3] : OUTFITS[id][2];
  const rng = seeded(hashStr(k + id));
  const pool = Object.keys(JUNK).filter(j => JUNK[j][1] <= rar + 1);
  const need = {};
  const types = 2 + rar;
  for (let i = 0; i < types; i++) {
    const j = pool[Math.floor(rng() * pool.length)];
    need[j] = (need[j] || 0) + 1 + Math.floor(rng() * (2 + rar));
  }
  if (rar === 2) need[rng() < 0.5 ? 'crystal' : 'nuclear'] = 1;
  const power = k === 'w' ? WEAPONS[id][1] + WEAPONS[id][2] : OUTFITS[id][1].reduce((a, b) => a + b, 0) * 3;
  return { rar, caps: [80, 400, 1500][rar] + power * [8, 15, 25][rar], junk: need, time: [60, 150, 300][rar], lvl: rar + 1 };
}

// ===== Новая игра =====
function newGame(vaultNo) {
  S = {
    v: 1, vault: vaultNo, time: 0, saved: Date.now(), nid: 0,
    res: { power: 70, food: 70, water: 70, caps: 1200, quantum: 5, stim: 3, rad: 2 },
    rooms: [], dwellers: [], arrivals: [], inv: [], junk: {}, lunch: 1, robots: [], pets: [], todMode: 'auto',
    objs: [], objN: 0, quests: { list: [], active: [], refresh: 0 }, incs: [],
    timers: { arrive: 25, inc: 360, raid: 420, stranger: 200, event: 150, trader: 420 },
    buffs: [], research: { done: {}, cur: null, p: 0 }, event: null, trader: null,
    stats: { capsEarned: 0, kills: 0, babies: 0, built: 0 },
    tut: 0, tutDone: false, adT: 0, cam: null, lastRush: 0,
  };
  S.rooms.push({ id: uid(), t: 'door', f: 0, c: 0, l: 1, s: 1, w: [], hp: DOOR_HP[0] });
  S.rooms.push({ id: uid(), t: 'elev', f: 0, c: DOOR_W, l: 1, s: 1, w: [] });
  S.rooms.push({ id: uid(), t: 'elev', f: 1, c: DOOR_W, l: 1, s: 1, w: [] });
  for (let i = 0; i < 5; i++) {
    const d = genDweller(i === 0 ? { g: 'm' } : i === 1 ? { g: 'f' } : {});
    d.st = 'arrive';
    S.arrivals.push(d);
  }
  S.inv.push(newItem('w', 'p10'), newItem('w', 'bat'), newItem('w', 'pipe'), newItem('o', 'robe'), newItem('o', 'vest'));
  S.junk = { tape: 2, glue: 2, screw: 3, steel: 2 };
  reindex();
  for (let i = 0; i < 3; i++) addObjective();
  refreshQuests();
}

// ===== Сохранение =====
function serialize() {
  S.saved = Date.now();
  S.cam = { x: Cam.x, y: Cam.y, z: Cam.z };
  return JSON.stringify(S);
}
function saveGame(cloud) {
  if (!S) return;
  let json;
  try { json = serialize(); } catch (e) { return; }
  try { localStorage.setItem(SAVE_KEY, json); } catch (e) {}
  if (cloud) YA.save(json);
}
function readLocal() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function hasSave() { return !!(R.cloudSave || readLocal()); }
function pickSave() {
  const a = readLocal(), b = R.cloudSave;
  if (a && b) return (b.saved || 0) > (a.saved || 0) ? b : a;
  return a || b;
}
function migrate() {
  // сохранения первой версии: координаты жителей и внешность
  for (const d of S.dwellers.concat(S.arrivals)) {
    if (!d.look.hs2) { d.look.hs2 = pick(d.g === 'm' ? HAIR_M : HAIR_F); d.look.beard = 'none'; }
    if (d.x == null) {
      const r = d.room ? S.rooms.find(q => q.id === d.room) : S.rooms[0];
      d.x = r ? r.c * CW + clamp((d.px || 30) * (CW / 40), 12, roomW(r) * CW - 12) : 120;
      if (r && r.t === 'door') d.x = Math.max(d.x, 80);
      d.fy = r ? r.f : 0; d.tx = d.x; d.path = null;
    }
    delete d.px;
    if (d.pet === undefined) d.pet = null;
  }
  for (const q of S.quests.list.concat(S.quests.active)) { if (q.mx == null) { q.mx = rnd(); q.my = rnd(); } }
}
function loadGame(data) {
  S = data;
  S.incs = S.incs || [];
  S.robots = S.robots || [];
  S.junk = S.junk || {};
  S.pets = S.pets || [];
  S.todMode = S.todMode || 'auto';
  migrate();
  migrateMech();
  S.stats = S.stats || { capsEarned: 0, kills: 0, babies: 0, built: 0 };
  reindex();
  if (S.cam) { Cam.x = S.cam.x; Cam.y = S.cam.y; Cam.z = S.cam.z; }
  const away = clamp((Date.now() - (S.saved || Date.now())) / 1000, 0, 7200);
  if (away > 20) simOffline(away);
}
