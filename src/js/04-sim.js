// ===== Комнаты: размещение, постройка, улучшение =====
function countType(t) { let n = 0; for (const r of S.rooms) if (r.t === t) n += r.t === 'elev' ? 1 : r.s; return n; }
function hasKind(k) { return S.rooms.some(r => ROOMS[r.t] && ROOMS[r.t].kind === k); }
function hasType(t) { return S.rooms.some(r => r.t === t); }
function buildCost(t) {
  if (t === 'elev') return ELEV.cost + ELEV.inc * Math.max(0, countType('elev') - 2);
  const def = ROOMS[t];
  return def.cost + def.inc * countType(t);
}
function unlocked(t) { return t === 'elev' || popCount() >= ROOMS[t].pop; }
function canPlace(t, f, c) {
  const w = t === 'elev' ? 1 : 3;
  if (c < 0 || c + w > GW || f < 0 || f >= MAXF) return false;
  for (let i = 0; i < w; i++) if (at(f, c + i)) return false;
  const L = at(f, c - 1), Rn = at(f, c + w);
  if (t === 'elev') {
    const up = at(f - 1, c), dn = at(f + 1, c);
    if ((up && up.t === 'elev') || (dn && dn.t === 'elev')) return true;
  }
  return !!(L || Rn);
}
function spotsFor(t) {
  const out = [];
  const w = t === 'elev' ? 1 : 3;
  const mf = Math.min(MAXF - 1, maxFloor() + 1);
  for (let f = 0; f <= mf; f++) for (let c = 0; c + w <= GW; c++) if (canPlace(t, f, c)) out.push({ f, c, w });
  return out;
}
function buildRoom(t, f, c) {
  const cost = buildCost(t);
  if (S.res.caps < cost) { toast('Не хватает крышек', 'bad'); Snd.bad(); return null; }
  if (!canPlace(t, f, c)) return null;
  if (t !== 'elev' && ROOMS[t].unique && hasType(t)) { toast('Такая комната уже есть', 'bad'); return null; }
  S.res.caps -= cost;
  let r = { id: uid(), t, f, c, l: 1, s: 1, w: [], p: 0, rdy: 0, heat: 0 };
  S.rooms.push(r);
  reindex();
  if (t !== 'elev') r = tryMerge(r);
  S.stats.built++;
  objProg('build', 1);
  Snd.build();
  sparks((c + (t === 'elev' ? 0.5 : 1.5)) * CW, roomY(r) + FH / 2, '#f0b429', 24);
  return r;
}
function tryMerge(r) {
  const def = ROOMS[r.t];
  if (!def || def.noMerge) return r;
  let again = true;
  while (again) {
    again = false;
    const cand = [at(r.f, r.c - 1), at(r.f, r.c + roomW(r))];
    for (const o of cand) {
      if (!o || o === r || o.t !== r.t || o.l !== r.l || o.s + r.s > 3 || incAt(o.id) || incAt(r.id) || o.craft || r.craft) continue;
      const oLeft = o.c < r.c;
      const shiftR = oLeft ? roomW(o) * CW : 0, shiftO = oLeft ? 0 : roomW(r) * CW;
      for (const d of S.dwellers) {
        if (d.room === r.id) d.px += shiftR;
        else if (d.room === o.id) { d.px += shiftO; d.room = r.id; }
      }
      r.p = (r.p * r.s + (o.p || 0) * o.s) / (r.s + o.s);
      r.rdy = (r.rdy || 0) + (o.rdy || 0);
      r.heat = Math.max(r.heat || 0, o.heat || 0);
      r.c = Math.min(r.c, o.c);
      r.s += o.s;
      r.w = oLeft ? o.w.concat(r.w) : r.w.concat(o.w);
      if (o.pair) o.pair = null;
      S.rooms.splice(S.rooms.indexOf(o), 1);
      reindex();
      again = true;
      break;
    }
  }
  return r;
}
function upgradeCost(r) {
  if (r.t === 'door') return DOOR_UP[r.l - 1];
  return ROOMS[r.t].up[r.l - 1] * r.s;
}
function upgradeRoom(r) {
  if (r.l >= 3) return;
  const cost = upgradeCost(r);
  if (S.res.caps < cost) { toast('Не хватает крышек', 'bad'); Snd.bad(); return; }
  S.res.caps -= cost;
  r.l++;
  if (r.t === 'door') r.hp = DOOR_HP[r.l - 1];
  objProg('upgrade', 1);
  Snd.build();
  sparks(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2, '#7ed957', 30);
  toast(`${roomName(r)}: уровень ${r.l}`, 'good');
  tryMerge(r);
}
function neighbors(r) {
  const res = [];
  const L = at(r.f, r.c - 1), Rn = at(r.f, r.c + roomW(r));
  if (L) res.push(L);
  if (Rn) res.push(Rn);
  if (r.t === 'elev') {
    const u = at(r.f - 1, r.c), dn = at(r.f + 1, r.c);
    if (u && u.t === 'elev') res.push(u);
    if (dn && dn.t === 'elev') res.push(dn);
  }
  return res;
}
function bfsFromDoor(ex) {
  const seen = new Set([door().id]);
  const order = [door()];
  for (let i = 0; i < order.length; i++) {
    for (const n of neighbors(order[i])) if (n !== ex && !seen.has(n.id)) { seen.add(n.id); order.push(n); }
  }
  return order;
}
function canDestroy(r) {
  if (r.t === 'door') return 'Дверь нельзя снести';
  if (S.dwellers.some(d => d.room === r.id)) return 'Сначала переведите всех жителей';
  if (incAt(r.id)) return 'Идёт происшествие';
  if (r.craft || r.done) return 'Идёт производство';
  if (r.t === 'elev' && r.f <= 1 && r.c === DOOR_W) return 'Главный лифт нельзя снести';
  if (bfsFromDoor(r).length !== S.rooms.length - 1) return 'Нельзя: другие комнаты потеряют связь';
  return null;
}
function destroyRoom(r) {
  const why = canDestroy(r);
  if (why) { toast(why, 'bad'); return false; }
  S.rooms.splice(S.rooms.indexOf(r), 1);
  reindex();
  sparks(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2, '#8a6a4a', 30);
  return true;
}

// ===== Назначение жителей =====
function workersOf(r) { return r.w.map(D).filter(Boolean); }
function freeSlots(r) { return roomCap(r) - r.w.length; }
function unassign(d) {
  if (d.room) {
    const r = RM(d.room);
    if (r) {
      const i = r.w.indexOf(d.id);
      if (i >= 0) r.w.splice(i, 1);
      if (r.pair && (r.pair.m === d.id || r.pair.f === d.id)) r.pair = null;
    }
  }
  d.room = null;
}
function assign(d, r) {
  if (d.child || d.st !== 'vault') return false;
  if (r && r.t !== 'door' && roomCap(r) === 0) return false;
  if (r && d.room === r.id && r.w.includes(d.id)) return true;
  if (r && freeSlots(r) <= 0) { toast('В комнате нет мест', 'bad'); return false; }
  const prev = d.room;
  unassign(d);
  if (r) {
    r.w.push(d.id);
    d.room = r.id;
    if (prev !== r.id) { d.px = rf(12, roomW(r) * CW - 12); d.tx = d.px; d.tp = 0; }
  }
  d.wait = 0;
  return true;
}
function autoAssign(d, prefer) {
  if (prefer) { const r = RM(prefer); if (r && freeSlots(r) > 0 && r.t !== 'door') return assign(d, r); }
  const bs = bestStat(d);
  let best = null, bestScore = -1;
  for (const r of S.rooms) {
    const def = ROOMS[r.t];
    if (!def || freeSlots(r) <= 0 || def.st < 0) continue;
    let sc = 0;
    if (def.kind === 'prod') sc = 3;
    else if (def.kind === 'living') sc = 1;
    else if (def.kind === 'radio' || def.kind === 'craft') sc = 2;
    else continue;
    if (def.st === bs) sc += 5;
    sc += stat(d, def.st) * 0.2 - r.w.length * 0.3;
    if (sc > bestScore) { bestScore = sc; best = r; }
  }
  if (best) return assign(d, best);
  d.room = null;
  return false;
}

// ===== Производство =====
function sumStat(r) {
  const def = ROOMS[r.t];
  if (!def || def.st < 0) return 0;
  let s = 0;
  for (const id of r.w) { const d = D(id); if (d && d.st === 'vault') s += stat(d, def.st); }
  return s;
}
function hapMult(r) {
  if (!r.w.length) return 1;
  let h = 0;
  for (const id of r.w) { const d = D(id); if (d) h += d.hap; }
  return 0.85 + 0.25 * (h / r.w.length) / 100;
}
const SIZE_MULT = [1, 2.1, 3.3];
function cycleTime(r) {
  const def = ROOMS[r.t];
  const ss = sumStat(r);
  if (!ss) return Infinity;
  return (def.time * r.s) / (0.3 * r.s + 0.12 * ss) / hapMult(r);
}
function roomOutput(r) { const def = ROOMS[r.t]; return Math.max(1, Math.round(def.out[r.l - 1] * SIZE_MULT[r.s - 1])); }
function luckAvg(r) {
  if (!r.w.length) return 0;
  let s = 0;
  for (const id of r.w) { const d = D(id); if (d) s += stat(d, 6); }
  return s / r.w.length;
}
function gainXp(d, n) {
  if (d.lvl >= 50 || d.st === 'dead') return;
  d.xp += n;
  if (!d.lu && d.xp >= xpNeed(d.lvl)) {
    d.lu = true;
    if (R.offline) levelUp(d, true);
  }
}
function levelUp(d, silent) {
  if (!d.lu) return;
  d.xp -= xpNeed(d.lvl);
  d.lvl++;
  const inc = 2.5 + stat(d, 2) * 0.5;
  d.mhp += inc;
  d.hp = Math.min(effMax(d), d.hp + inc);
  d.hap = 100;
  d.lu = false;
  const caps = 5 * d.lvl;
  addCaps(caps);
  objProg('levelup', 1);
  if (d.lvl < 50 && d.xp >= xpNeed(d.lvl)) d.lu = true;
  if (!silent) {
    Snd.level();
    const p = dwellerWorldPos(d);
    if (p) { floatText(p.x, p.y - 40, `Ур. ${d.lvl}`, '#7ed957'); floatText(p.x, p.y - 24, `+${caps}`, RES_COL.caps, 'caps'); }
  }
}
function finishCycle(r) {
  const def = ROOMS[r.t];
  r.p = 0;
  for (const id of r.w) { const d = D(id); if (d) gainXp(d, 8 + 3 * r.l); }
  if (def.kind === 'radio') {
    const chance = 0.35 + 0.1 * r.l;
    if (rnd() < chance && S.arrivals.length < 5 && popCount() + S.arrivals.length < popCap()) {
      spawnArrival(rollRarity(luckAvg(r) + 2) >= 1 && rnd() < 0.3 ? 1 : 0);
      if (!R.offline) toast('Радиосигнал привлёк нового выжившего!', 'good');
    }
    return;
  }
  r.rdy = roomOutput(r);
  if (R.offline) collectRoom(r, true);
}
function collectRoom(r, auto) {
  if (r.done) {
    if (S.inv.length >= itemCap()) { if (!auto) toast('Склад полон — продайте что-нибудь или постройте Склад', 'bad'); return false; }
    S.inv.push(r.done);
    if (!auto) { toast(`Создано: ${itemName(r.done)}`, 'good'); Snd.collect(); }
    r.done = null;
    objProg('craft', 1);
    return true;
  }
  if (!r.rdy) return false;
  const def = ROOMS[r.t];
  const amt = r.rdy;
  let got = 0;
  if (def.res === 'cola') got = addRes('food', amt) + addRes('water', amt);
  else got = addRes(def.res, amt);
  if (got <= 0) {
    if (!auto) { toast('Хранилище заполнено — улучшите комнаты или постройте новые', 'warn'); Snd.bad(); }
    return false;
  }
  r.rdy = 0;
  const L = luckAvg(r);
  let caps = Math.round(amt * 0.25 * (1 + L * 0.05));
  let lucky = false;
  if (def.res === 'stim' || def.res === 'rad') caps = 2 * amt;
  if (rnd() < L * 0.015) { caps += amt; lucky = true; }
  addCaps(caps);
  if (def.res === 'cola') { objProg('c_food', amt); objProg('c_water', amt); } else objProg('c_' + def.res, got);
  if (!auto || !R.offline) {
    const x = roomX(r) + roomW(r) * CW / 2, y = roomY(r) + 16;
    floatText(x, y, `+${Math.round(got)}`, RES_COL[def.res], RES_ICON[def.res]);
    floatText(x, y + 16, (lucky ? 'Удача! ' : '') + `+${caps}`, RES_COL.caps, 'caps');
    if (!auto) Snd.collect();
  }
  if (S.tut === 4) S.tut = 5;
  return true;
}
function rushable(r) {
  const def = ROOMS[r.t];
  return def && (def.kind === 'prod' || def.kind === 'radio') && r.w.length && !r.rdy && !incAt(r.id) && !r.off;
}
function rushFail(r) { return clamp(0.3 + (r.heat || 0) * 0.12 - luckAvg(r) * 0.025, 0.04, 0.95); }
function rushRoom(r) {
  if (!rushable(r)) return;
  const fail = rnd() < rushFail(r);
  r.heat = (r.heat || 0) + 1;
  if (!fail) {
    const def = ROOMS[r.t];
    finishCycle(r);
    const bonus = def.kind === 'radio' ? 30 : roomOutput(r) * 2;
    addCaps(bonus);
    for (const id of r.w) { const d = D(id); if (d) gainXp(d, 20); }
    objProg('rush', 1);
    toast(`Ускорение удалось! +${bonus} крышек`, 'good');
    Snd.coin();
  } else {
    const pop = popCount();
    let k = pick(['fire', 'roach']);
    if (pop >= 30 && rnd() < 0.4) k = 'molerat';
    if (pop >= 50 && rnd() < 0.2) k = 'scorp';
    toast('Ускорение провалилось!', 'bad');
    startIncident(k, r);
  }
}

// ===== Энергия =====
function consumes(r) { return r.t === 'elev' || r.t === 'door' || (ROOMS[r.t] && ROOMS[r.t].res !== 'power'); }
function powerUse(r) { if (r.t === 'elev') return 0.004; if (r.t === 'door') return 0.01; return 0.025 * r.s; }
function isPowerRoom(r) { return ROOMS[r.t] && ROOMS[r.t].res === 'power'; }
function updatePower() {
  if (S.res.power > 0.5) { for (const r of S.rooms) r.off = false; return; }
  let budget = 0;
  const gens = S.rooms.filter(isPowerRoom);
  for (const r of gens) { r.off = false; if (r.w.length) budget += roomOutput(r) / cycleTime(r); }
  const cons = S.rooms.filter(consumes);
  const dist = r => {
    let m = 1e9;
    for (const g of gens) m = Math.min(m, Math.abs(g.f - r.f) * 4 + Math.abs(g.c - r.c) / 3);
    return m;
  };
  cons.sort((a, b) => dist(a) - dist(b));
  for (const r of cons) {
    if (r.t === 'door' || r.t === 'elev') { r.off = false; continue; }
    if (budget >= powerUse(r)) { r.off = false; budget -= powerUse(r); } else r.off = true;
  }
}

// ===== Главный цикл симуляции =====
function sim(dt) {
  S.time += dt;
  R.tick1 += dt;
  for (const r of S.rooms) updateRoom(r, dt);
  consume(dt);
  for (let i = 0; i < S.dwellers.length; i++) updateDweller(S.dwellers[i], dt);
  updatePairs(dt);
  updateIncidents(dt);
  updateQuests(dt);
  updateRobots(dt);
  if (R.tick1 >= 1) { R.tick1 -= 1; slowTick(); }
}
function consume(dt) {
  let p = 0;
  for (const r of S.rooms) if (consumes(r) && !r.off) p += powerUse(r);
  S.res.power = Math.max(0, S.res.power - p * dt);
  let eaters = 0;
  for (const d of S.dwellers) if (d.st === 'vault') eaters += d.child ? 0.5 : 1;
  S.res.food = Math.max(0, S.res.food - eaters * 0.03 * dt);
  S.res.water = Math.max(0, S.res.water - eaters * 0.03 * dt);
}
function updateRoom(r, dt) {
  const def = ROOMS[r.t];
  if (!def) return;
  if (r.heat > 0) r.heat = Math.max(0, r.heat - dt / 60);
  if (r.off || incAt(r.id) || !r.w.length) return;
  if (def.kind === 'prod' || def.kind === 'radio') {
    if (r.rdy) return;
    r.p += dt / cycleTime(r);
    if (r.p >= 1) finishCycle(r);
  } else if (def.kind === 'train') {
    const mult = [1, 1.2, 1.4][r.l - 1] * hapMult(r);
    for (const id of r.w) {
      const d = D(id);
      if (!d || d.sp[def.st] >= 10) continue;
      d.tp += (dt * mult) / (40 * (1 + d.sp[def.st] * 0.45));
      if (d.tp >= 1) {
        d.tp = 0;
        d.sp[def.st]++;
        objProg('train', 1);
        gainXp(d, 10);
        if (!R.offline) {
          toast(`${fullName(d)}: ${STAT_NAMES[def.st]} ${d.sp[def.st]}`, 'good');
          const p = dwellerWorldPos(d);
          if (p) floatText(p.x, p.y - 36, `${STAT_ABBR[def.st]} +1`, '#7ed957');
        }
      }
    }
  } else if (def.kind === 'craft' && r.craft && !r.done) {
    const ss = sumStat(r);
    r.craft.p += (dt * (0.4 + 0.12 * ss)) / r.craft.T;
    if (r.craft.p >= 1) {
      r.done = newItem(r.craft.k, r.craft.id);
      r.craft = null;
      for (const id of r.w) { const d = D(id); if (d) gainXp(d, 25); }
      if (R.offline) collectRoom(r, true); else toast('Предмет готов — заберите в мастерской', 'good');
    }
  }
}
function startCraft(r, k, id) {
  const rc = recipe(k, id);
  if (r.l < rc.lvl) { toast(`Нужна мастерская ${rc.lvl} уровня`, 'bad'); return false; }
  if (S.res.caps < rc.caps) { toast('Не хватает крышек', 'bad'); return false; }
  for (const j in rc.junk) if ((S.junk[j] || 0) < rc.junk[j]) { toast(`Не хватает: ${JUNK[j][0]}`, 'bad'); return false; }
  S.res.caps -= rc.caps;
  for (const j in rc.junk) S.junk[j] -= rc.junk[j];
  r.craft = { k, id, p: 0, T: rc.time };
  Snd.build();
  return true;
}

// ===== Жители: движение, здоровье, дети =====
function incAt(roomId) { for (const i of S.incs) if (i.room === roomId) return i; return null; }
function dwellerRoom(d) { return d.room ? RM(d.room) : door(); }
function dwellerWorldPos(d) {
  if (d.st !== 'vault' && d.st !== 'dead') return null;
  if (d.st === 'dead' && d.deadIn !== 'vault') return null;
  const r = dwellerRoom(d);
  if (!r) return null;
  return { x: roomX(r) + d.px, y: roomY(r) + FH - 7, r };
}
function updateDweller(d, dt) {
  if (d.st === 'explore') { updateExplorer(d, dt); return; }
  if (d.st !== 'vault') return;
  // здоровье
  const r = dwellerRoom(d);
  const inc = r ? incAt(r.id) : null;
  if (S.res.food > 0 && !inc) d.hp = Math.min(effMax(d), d.hp + 0.25 * dt);
  else if (S.res.food <= 0) d.hp = Math.max(Math.min(5, d.hp), d.hp - 0.12 * dt);
  if (S.res.water <= 0) d.rad = Math.min(d.mhp - 1, d.rad + 0.08 * dt);
  if (d.hp > effMax(d)) d.hp = effMax(d);
  // беременность и дети
  if (d.preg > 0) { d.preg -= dt; if (d.preg <= 0) { d.preg = 0; giveBirth(d); } }
  if (d.child > 0) { d.child -= dt; if (d.child <= 0) { d.child = 0; growUp(d); } }
  if (R.offline) return;
  moveDweller(d, dt, r, inc);
}
function moveDweller(d, dt, r, inc) {
  if (!r) return;
  const wpx = roomW(r) * CW;
  let lo = 10, hi = wpx - 10;
  if (r.t === 'door') { lo = 1.7 * CW; hi = wpx - 10; }
  let speed = 22;
  const pair = r.pair && (r.pair.m === d.id || r.pair.f === d.id) ? r.pair : null;
  const fightable = inc && !(inc.ext && r.t === 'door' && door().hp > 0) && inc.en.some(x => x.hp > 0);
  if (pair) {
    if (pair.ph === 2) { d.hide = true; return; }
    d.hide = false;
    const cx = clamp(wpx / 2, lo + 14, hi - 14);
    d.tx = pair.m === d.id ? cx - 11 : cx + 11;
    speed = 30;
  } else {
    d.hide = false;
    if (fightable && !d.child && !d.preg) {
      const alive = inc.en.filter(x => x.hp > 0);
      const e = alive[d.id % alive.length];
      d.tx = clamp(e.x + (d.px < e.x ? -16 : 16), lo, hi);
      speed = 45;
    } else if (fightable) {
      d.tx = inc.en[0].x > wpx / 2 ? lo : hi;
      speed = 50;
    } else if (d.wait > 0) {
      d.wait -= dt;
    } else if (Math.abs(d.px - d.tx) < 2) {
      const idx = r.w.indexOf(d.id);
      if (idx >= 0 && r.t !== 'door') {
        const slot = ((idx + 0.5) * wpx) / Math.max(1, roomCap(r));
        d.tx = clamp(slot + rf(-16, 16), lo, hi);
        d.wait = rf(3, 9);
      } else {
        d.tx = rf(lo, hi);
        d.wait = rf(1, 5);
      }
    }
  }
  d.tx = clamp(d.tx, lo, hi);
  const dx = d.tx - d.px;
  if (Math.abs(dx) > 1) {
    const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    d.px += step;
    d.face = Math.sign(dx);
    d.walk += Math.abs(step);
  } else if (pair) {
    d.face = pair.m === d.id ? 1 : -1;
  } else if (fightable && !d.child) {
    const alive = inc.en.filter(x => x.hp > 0);
    if (alive.length) d.face = Math.sign(alive[d.id % alive.length].x - d.px) || 1;
  }
  d.px = clamp(d.px, lo, hi);
}
function giveBirth(m) {
  const f = D(m.father);
  const kid = genDweller();
  const base = (i) => (m.sp[i] + (f ? f.sp[i] : 3)) / 2;
  kid.sp = kid.sp.map((_, i) => clamp(Math.round(base(i) * 0.35 + rf(0.5, 3.5)), 1, 10));
  const rr = (m.rar || 0) + (f ? f.rar || 0 : 0);
  kid.rar = rnd() < rr * 0.12 ? 1 : 0;
  if (kid.rar) for (let i = 0; i < 7; i++) kid.sp[i] = Math.min(10, kid.sp[i] + ri(0, 2));
  kid.sur = f ? f.sur : m.sur;
  kid.par = [m.id, f ? f.id : 0];
  kid.child = 150;
  kid.hp = kid.mhp;
  kid.room = m.room;
  kid.px = m.px;
  kid.look.skin = rnd() < 0.5 ? m.look.skin : f ? f.look.skin : m.look.skin;
  kid.look.hair = rnd() < 0.5 ? m.look.hair : f ? f.look.hair : m.look.hair;
  S.dwellers.push(kid);
  R.dmap.set(kid.id, kid);
  S.stats.babies++;
  objProg('baby', 1);
  if (!R.offline) { toast(`Родился ребёнок: ${fullName(kid)}!`, 'good'); Snd.baby(); }
}
function growUp(d) {
  const r = d.room ? RM(d.room) : null;
  d.room = null;
  if (r && freeSlots(r) > 0 && roomCap(r) > 0 && r.t !== 'door') assign(d, r);
  else autoAssign(d);
  if (!R.offline) toast(`${fullName(d)} вырос(ла) и готов(а) к работе`, 'good');
}

// ===== Знакомства в жилых помещениях =====
function updatePairs(dt) {
  for (const r of S.rooms) {
    if (r.t !== 'living') continue;
    const p = r.pair;
    if (!p) continue;
    const m = D(p.m), f = D(p.f);
    if (!m || !f || m.room !== r.id || f.room !== r.id || m.st !== 'vault' || f.st !== 'vault' || incAt(r.id)) { r.pair = null; if (m) m.hide = false; if (f) f.hide = false; continue; }
    p.t += dt;
    const talk = Math.max(5, 14 - (stat(m, 3) + stat(f, 3)) * 0.35);
    if (p.ph === 0 && p.t > talk) { p.ph = 1; p.t = 0; }
    else if (p.ph === 1 && p.t > 5) {
      if (popCount() + pregnancies() >= popCap()) { r.pair = null; m.cd = f.cd = S.time + 60; continue; }
      p.ph = 2; p.t = 0;
    } else if (p.ph === 2 && p.t > 4) {
      m.hide = f.hide = false;
      f.preg = 120; f.father = m.id;
      m.cd = S.time + 60; f.cd = S.time + 60;
      m.hap = Math.min(100, m.hap + 15); f.hap = Math.min(100, f.hap + 15);
      r.pair = null;
      if (!R.offline) { toast(`${fullName(f)} ждёт ребёнка!`, 'good'); floatHeart(roomX(r) + f.px, roomY(r) + 20); }
    }
  }
}
function tryPairing(r) {
  if (r.pair || incAt(r.id) || r.off) return;
  if (popCount() + pregnancies() >= popCap()) return;
  const ws = workersOf(r).filter(d => d.st === 'vault' && !d.child && !d.preg && S.time >= (d.cd || 0));
  const ms = ws.filter(d => d.g === 'm'), fs = ws.filter(d => d.g === 'f');
  for (const m of ms) for (const f of fs) {
    if (related(m, f)) continue;
    const ch = 0.06 * (1 + (stat(m, 3) + stat(f, 3)) * 0.05);
    if (rnd() < ch) { r.pair = { m: m.id, f: f.id, ph: 0, t: 0 }; return; }
  }
}

// ===== Медицина =====
function useStim(d) {
  if (S.res.stim < 1) { toast('Нет аптечек — постройте Медпункт', 'bad'); return; }
  if (d.hp >= effMax(d) - 0.5) { toast('Житель полностью здоров'); return; }
  S.res.stim--;
  d.hp = Math.min(effMax(d), d.hp + d.mhp * 0.45);
  objProg('heal', 1);
  Snd.collect();
}
function useRad(d) {
  if (S.res.rad < 1) { toast('Нет антирадина — постройте Лабораторию', 'bad'); return; }
  if (d.rad < 1) { toast('Житель не облучён'); return; }
  S.res.rad--;
  d.rad = Math.max(0, d.rad - d.mhp * 0.45);
  Snd.collect();
}
function reviveCost(d) { return 100 + d.lvl * 25; }
function revive(d, free) {
  if (!free) {
    const c = reviveCost(d);
    if (S.res.caps < c) { toast('Не хватает крышек', 'bad'); return false; }
    S.res.caps -= c;
  }
  d.rad = 0;
  d.hp = d.mhp;
  if (d.deadIn === 'waste') { d.st = 'explore'; }
  else {
    d.st = 'vault';
    const r = d.room ? RM(d.room) : null;
    d.room = null;
    if (r && freeSlots(r) > 0 && r.t !== 'elev') assign(d, r); else autoAssign(d);
  }
  d.deadIn = null;
  toast(`${fullName(d)} снова в строю`, 'good');
  Snd.level();
  return true;
}
function removeDweller(d) {
  unassign(d);
  for (const r of S.rooms) if (r.pair && (r.pair.m === d.id || r.pair.f === d.id)) r.pair = null;
  for (const q of S.quests.active) q.team = q.team.filter(id => id !== d.id);
  if (d.weapon) addItem(d.weapon, true);
  if (d.outfit) addItem(d.outfit, true);
  d.weapon = d.outfit = null;
  S.dwellers.splice(S.dwellers.indexOf(d), 1);
  R.dmap.delete(d.id);
}
function dieDweller(d, where) {
  d.hp = 0;
  const r = d.room ? RM(d.room) : null;
  if (r) {
    const i = r.w.indexOf(d.id);
    if (i >= 0) r.w.splice(i, 1);
    if (r.pair && (r.pair.m === d.id || r.pair.f === d.id)) r.pair = null;
  }
  d.st = 'dead';
  d.deadIn = where;
  d.preg = 0;
  if (!R.offline) { toast(`${fullName(d)} погиб(ла)`, 'bad'); Snd.bad(); }
}

// ===== Прибытие новых жителей =====
function spawnArrival(rar) {
  const d = rar === 2 ? genLegend() : genDweller({ rarity: rar || 0 });
  d.st = 'arrive';
  S.arrivals.push(d);
  return d;
}
function acceptArrival(d) {
  if (popCount() >= popCap()) { toast('Нет мест! Постройте или улучшите Жилые помещения', 'bad'); Snd.bad(); return false; }
  S.arrivals.splice(S.arrivals.indexOf(d), 1);
  d.st = 'vault';
  d.room = null;
  S.dwellers.push(d);
  R.dmap.set(d.id, d);
  autoAssign(d);
  objProg('accept', 1);
  if (S.tut === 0) S.tut = 1;
  Snd.open();
  return true;
}
function rejectArrival(d) { S.arrivals.splice(S.arrivals.indexOf(d), 1); }

// ===== Происшествия =====
function threat() {
  let n = 0, l = 0;
  for (const d of S.dwellers) if (d.st === 'vault' && !d.child) { n++; l += d.lvl; }
  const avg = n ? l / n : 1;
  return 1 + (avg - 1) * 0.07 + Math.max(0, popCount() - 10) * 0.012;
}
function makeEnemies(k, r, n, outside) {
  const e = ENEMY[k], th = threat();
  const w = roomW(r) * CW;
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ hp: e.hp * th, m: e.hp * th, x: outside ? -rf(20, 90) : rf(14, w - 14), ph: rnd() * 6, tg: i });
  return arr;
}
function startIncident(k, r, silent, gen) {
  if (!r || incAt(r.id)) return null;
  const e = ENEMY[k];
  const n = e.int ? e.per * r.s : e.num + Math.floor(popCount() / 20);
  const inc = { id: uid(), k, room: r.id, en: makeEnemies(k, r, n, !!e.ext), t: 0, ext: !!e.ext, path: null, pi: -1, stolen: 0, gen: gen || 0 };
  S.incs.push(inc);
  if (!R.offline && !silent) {
    Snd.alarm();
    toast(`Тревога! ${e.n}: ${roomName(r)}`, 'bad');
    R.flash = 1.2;
  }
  return inc;
}
function startRaid(k) {
  const inc = startIncident(k, door());
  if (!inc) return;
  inc.path = bfsFromDoor().filter(r => r.t !== 'door' && r.t !== 'elev').slice(0, k === 'beast' ? 12 : 7).map(r => r.id);
}
function defenders(r) {
  const out = [];
  for (const d of S.dwellers) {
    if (d.st !== 'vault' || d.child || d.preg || d.hide) continue;
    if (d.room === r.id || (r.t === 'door' && !d.room)) out.push(d);
  }
  return out;
}
function hurt(d, dmg, rad) {
  const red = 1 - clamp(stat(d, 2), 0, 17) * 0.025;
  d.hp -= dmg * red;
  if (rad) d.rad = Math.min(d.mhp - 1, d.rad + rad);
  if (d.hp > effMax(d)) d.hp = effMax(d);
  d.hurt = 0.25;
  if (d.hp <= 0) dieDweller(d, 'vault');
}
function updateIncidents(dt) {
  for (let i = S.incs.length - 1; i >= 0; i--) {
    const inc = S.incs[i];
    const r = RM(inc.room);
    if (!r) { S.incs.splice(i, 1); continue; }
    const e = ENEMY[inc.k];
    const th = threat();
    const dpsMul = 0.7 + 0.3 * th;
    inc.t += dt;
    const defs = defenders(r);
    const alive = inc.en.filter(x => x.hp > 0);
    const breach = inc.ext && r.t === 'door' && r.hp > 0;
    // жители атакуют
    for (const d of defs) {
      if (!alive.length) break;
      const tgt = alive[d.id % alive.length];
      const dmg = inc.k === 'fire' ? (1.5 + 0.05 * d.lvl + stat(d, 2) * 0.05) : dwellerDps(d);
      tgt.hp -= dmg * dt;
      d.fight = 0.3;
      if (tgt.hp <= 0) {
        S.stats.kills++;
        if (inc.k !== 'fire') objProg('kill', 1);
        for (const x of defs) gainXp(x, 4);
        alive.splice(alive.indexOf(tgt), 1);
      }
    }
    // пожар без людей постепенно выгорает
    if (inc.k === 'fire' && !defs.length) {
      for (const x of alive) x.hp -= 0.5 * dt;
      for (let j = alive.length - 1; j >= 0; j--) if (alive[j].hp <= 0) alive.splice(j, 1);
    }
    // враги атакуют
    if (breach) {
      let dps = 0;
      for (const x of alive) dps += e.dps * dpsMul;
      r.hp = Math.max(0, r.hp - dps * dt);
      if (r.hp <= 0 && !R.offline) { toast(`${e.n} выломали дверь!`, 'bad'); Snd.alarm(); for (const x of alive) x.x = rf(20, 60); }
    } else if (defs.length) {
      if (inc.k === 'fire') {
        for (const d of defs) hurt(d, e.dps * dpsMul * alive.length * dt * 0.6);
      } else {
        for (const x of alive) {
          const d = defs[x.tg % defs.length];
          hurt(d, e.dps * dpsMul * dt, e.rad ? e.rad * dt : 0);
        }
      }
    }
    // исход
    if (!alive.length) {
      S.incs.splice(i, 1);
      const reward = defs.length ? Math.round(e.reward * (inc.ext ? inc.en.length : Math.max(1, r.s)) * (0.8 + th * 0.2)) : 0;
      addCaps(reward);
      if (inc.k === 'fire') objProg('fire', 1);
      for (const d of defs) gainXp(d, 15);
      if (inc.ext) door().hp = DOOR_HP[door().l - 1];
      if (!R.offline) {
        if (reward) {
          toast(`${e.n} — угроза устранена! +${reward} крышек`, 'good');
          floatText(roomX(r) + roomW(r) * CW / 2, roomY(r) + 20, `+${reward}`, RES_COL.caps, 'caps');
          Snd.coin();
        } else toast(`${e.n}: огонь выгорел в «${roomName(r)}»`, 'warn');
      }
      continue;
    }
    if (inc.ext) {
      if (breach) continue;
      const stay = defs.length ? 22 : 6;
      if (inc.t >= stay) {
        if (!defs.length && e.steal) {
          const s = Math.min(600, Math.floor(S.res.caps * e.steal));
          S.res.caps -= s; inc.stolen += s;
        }
        let next = null;
        while (inc.path && ++inc.pi < inc.path.length) {
          const c = RM(inc.path[inc.pi]);
          if (c && !incAt(c.id)) { next = c; break; }
        }
        if (!next) {
          S.incs.splice(i, 1);
          door().hp = DOOR_HP[door().l - 1];
          if (!R.offline) toast(`${e.n} ушли${inc.stolen ? `, украв ${inc.stolen} крышек` : ''}`, 'warn');
          continue;
        }
        inc.room = next.id;
        inc.t = 0;
        const w = roomW(next) * CW;
        for (const x of inc.en) x.x = rf(14, Math.min(60, w - 14));
      }
    } else {
      const spreadT = defs.length ? 30 : 16;
      if (inc.t >= spreadT) {
        inc.t = 0;
        if (S.incs.length < 5 && (inc.gen || 0) < 2) {
          const nb = neighbors(r).filter(n => n.t !== 'elev' && n.t !== 'door' && !incAt(n.id));
          if (nb.length) {
            const n = pick(nb);
            startIncident(inc.k, n, true, (inc.gen || 0) + 1);
            if (!R.offline) toast(`${e.n} распространяется: ${roomName(n)}`, 'bad');
          }
        }
      }
    }
    // анимация врагов
    const w = roomW(r) * CW;
    for (const x of inc.en) {
      if (x.hp <= 0) continue;
      x.ph += dt;
      if (breach) x.x = clamp(x.x + Math.sin(x.ph * 2) * dt * 10, -110, -8);
      else if (inc.k !== 'fire') x.x = clamp(x.x + Math.sin(x.ph * 1.3 + x.tg) * dt * 30, 10, w - 10);
    }
  }
}

// ===== Пустошь =====
function sendExplore(d, stims, rads) {
  if (d.st !== 'vault' || d.child) return false;
  stims = Math.min(stims, Math.floor(S.res.stim));
  rads = Math.min(rads, Math.floor(S.res.rad));
  S.res.stim -= stims;
  S.res.rad -= rads;
  d.prev = d.room;
  unassign(d);
  d.st = 'explore';
  d.ex = { t: 0, back: -1, caps: 0, items: [], junk: {}, log: [], stim: stims, radw: rads, nev: 6, xp: 0, home: false };
  exLog(d, 'Покинул(а) убежище. Пустошь ждёт.');
  objProg('explore', 1);
  Snd.open();
  return true;
}
function exLog(d, msg) {
  d.ex.log.push({ t: d.ex.t, m: msg });
  if (d.ex.log.length > 60) d.ex.log.shift();
}
function recallExplorer(d) {
  if (d.st !== 'explore' || d.ex.back >= 0) return;
  d.ex.back = d.ex.t / 2;
  d.ex.backT = d.ex.back;
  exLog(d, 'Возвращаюсь домой.');
}
function updateExplorer(d, dt) {
  const ex = d.ex;
  if (!ex || ex.home) return;
  if (ex.back >= 0) {
    ex.back -= dt;
    if (ex.back <= 0) {
      ex.back = 0;
      ex.home = true;
      exLog(d, 'Вернулся(ась) к двери убежища.');
      if (!R.offline) { toast(`${fullName(d)} вернулся(ась) из Пустоши`, 'good'); Snd.open(); }
    }
    return;
  }
  ex.t += dt;
  // радиация пустоши
  d.rad = Math.min(d.mhp - 1, d.rad + dt * 0.03 * (1 - clamp(stat(d, 2), 0, 15) * 0.05));
  if (d.hp > effMax(d)) d.hp = effMax(d);
  ex.nev -= dt;
  if (ex.nev <= 0) { ex.nev = rf(10, 17); wasteEvent(d); }
  if (d.st !== 'explore') return;
  if (d.hp < effMax(d) * 0.45 && ex.stim > 0) {
    ex.stim--; d.hp = Math.min(effMax(d), d.hp + d.mhp * 0.45);
    exLog(d, 'Использовал(а) аптечку.');
  }
  if (d.rad > d.mhp * 0.35 && ex.radw > 0) {
    ex.radw--; d.rad = Math.max(0, d.rad - d.mhp * 0.45);
    exLog(d, 'Принял(а) антирадин.');
  }
}
function wasteEvent(d) {
  const ex = d.ex;
  const lv = 1 + ex.t / 120;
  const L = stat(d, 6), P = stat(d, 1), C = stat(d, 3), I = stat(d, 4);
  const place = pick(WASTE_PLACES);
  const kind = weighted([['caps', 26 + L], ['junk', 16 + P], ['item', 9 + P * 0.6 + L * 0.4], ['fight', 15 + lv * 1.2], ['friend', 6 + C], ['loc', 8 + I], ['none', 8]]);
  if (kind === 'caps') {
    const n = Math.round(ri(3, 12) * (1 + L * 0.08) * (1 + ex.t / 400));
    ex.caps += n;
    exLog(d, `Нашёл(а) ${n} крышек ${place}.`);
  } else if (kind === 'junk') {
    const rar = rnd() < 0.02 + L * 0.004 ? 3 : rnd() < 0.08 + L * 0.01 ? 2 : rnd() < 0.3 ? 1 : 0;
    const ids = Object.keys(JUNK).filter(j => JUNK[j][1] === rar);
    const j = pick(ids);
    const n = ri(1, 2);
    ex.junk[j] = (ex.junk[j] || 0) + n;
    exLog(d, `Подобрал(а) хлам: ${JUNK[j][0]} ×${n} ${place}.`);
  } else if (kind === 'item') {
    const it = randomItem(rollRarity(L, ex.t / 8000));
    ex.items.push(it);
    exLog(d, `${['Нашёл(а)', 'Отыскал(а) редкую вещь:', 'ЛЕГЕНДАРНАЯ находка:'][itemRar(it)]} ${itemName(it)}!`);
  } else if (kind === 'fight') {
    const pool = WASTE_ENEMY.filter(e => e.lv <= lv);
    const e = pool[Math.min(pool.length - 1, Math.floor(Math.pow(rnd(), 1.3) * pool.length))];
    const eHp = e.hp * (0.8 + lv * 0.15);
    const myDps = dwellerDps(d) * (1 + stat(d, 0) * 0.02);
    const tkill = eHp / myDps;
    let dmg = 0.45 * e.dps * (0.8 + lv * 0.08) * Math.min(tkill, 8 + lv * 2) * (1 - clamp(stat(d, 2), 0, 17) * 0.03) * (1 - clamp(stat(d, 5), 0, 17) * 0.02);
    dmg = Math.max(1, Math.round(dmg));
    d.hp -= dmg;
    if (e.rad) d.rad = Math.min(d.mhp - 1, d.rad + e.rad);
    const xp = Math.round(e.xp * (0.8 + lv * 0.2));
    if (d.hp <= 0) {
      d.hp = 0;
      exLog(d, `Погиб(ла) в схватке: ${e.n}.`);
      d.st = 'dead';
      d.deadIn = 'waste';
      if (!R.offline) { toast(`${fullName(d)} погиб(ла) в Пустоши`, 'bad'); Snd.bad(); }
      return;
    }
    ex.xp += xp;
    let msg = `Бой: ${e.n}. Победа! Потеряно ${dmg} ОЗ.`;
    if (rnd() < 0.35) { const n = ri(5, 20); ex.caps += n; msg += ` +${n} крышек.`; }
    exLog(d, msg);
  } else if (kind === 'friend') {
    const r = rnd();
    if (r < 0.4) { const n = Math.round(ri(10, 30) * (1 + C * 0.1)); ex.caps += n; exLog(d, `Встретил(а) торговца и выгодно сторговался(ась): +${n} крышек.`); }
    else if (r < 0.7) { ex.stim++; exLog(d, 'Путник поделился аптечкой.'); }
    else { ex.xp += 20; exLog(d, 'Помог(ла) поселенцам починить водокачку. Опыт +20.'); }
  } else if (kind === 'loc') {
    ex.xp += Math.round(10 + I * 2);
    const r = rnd();
    if (r < 0.3) { ex.radw++; exLog(d, `Исследовал(а) ${place.replace(/^(в|у|на) /, '')} и нашёл(ла) антирадин.`); }
    else if (r < 0.55) { ex.stim++; exLog(d, `Обыскал(а) аптечку ${place}: +1 аптечка.`); }
    else exLog(d, `Изучил(а) довоенные записи ${place}. Опыт +${Math.round(10 + I * 2)}.`);
  } else {
    exLog(d, pick(WASTE_FLAVOR));
  }
}
function collectExplorer(d) {
  const ex = d.ex;
  if (!ex || !ex.home) return;
  addCaps(ex.caps);
  let sold = 0;
  for (const it of ex.items) if (!addItem(it, true)) sold++;
  for (const j in ex.junk) S.junk[j] = Math.min(99, (S.junk[j] || 0) + ex.junk[j]);
  S.res.stim = Math.min(Math.max(resCap('stim'), S.res.stim), S.res.stim + ex.stim);
  S.res.rad = Math.min(Math.max(resCap('rad'), S.res.rad), S.res.rad + ex.radw);
  gainXp(d, ex.xp);
  toast(`${fullName(d)}: +${ex.caps} крышек, предметов: ${ex.items.length}${sold ? ` (продано из-за склада: ${sold})` : ''}`, 'good');
  Snd.coin();
  d.ex = null;
  d.st = 'vault';
  d.room = null;
  autoAssign(d, d.prev);
}

// ===== Задания смотрителя =====
function avgLevel() {
  const a = S.dwellers.filter(d => !d.child && d.st !== 'dead');
  return a.length ? a.reduce((s, d) => s + d.lvl, 0) / a.length : 1;
}
function refreshQuests() {
  const used = new Set(S.quests.active.map(q => q.n));
  const al = avgLevel();
  const list = [];
  const pool = QUESTS.filter(q => !used.has(q[0]));
  for (let i = 0; i < 3 && pool.length; i++) {
    const q = pool.splice(ri(0, pool.length - 1), 1)[0];
    const lvl = Math.max(1, Math.round(al + i * 2 + rf(-1, 2)));
    const rar = i === 2 ? 1 : 0;
    list.push({
      id: uid(), n: q[0], desc: q[1], lvl, dur: ri(50, 90) + i * 30, diff: 30 + lvl * 22 + i * 25,
      rw: { caps: Math.round((120 + lvl * 40) * (1 + i * 0.4)), item: rar + (rnd() < 0.1 ? 1 : 0), lunch: rnd() < 0.2 + i * 0.1 ? 1 : 0, quantum: rnd() < 0.2 ? ri(1, 3) : 0 },
    });
  }
  S.quests.list = list;
  S.quests.refresh = S.time + 600;
}
function teamPower(team) {
  let p = 0;
  for (const d of team) p += dwellerDps(d) * 6 + d.lvl * 4 + effMax(d) * 0.15 + stat(d, 0) + stat(d, 2) + stat(d, 5);
  return p;
}
function startQuest(q, ids) {
  const team = ids.map(D).filter(d => d && d.st === 'vault' && !d.child);
  if (!team.length) return false;
  for (const d of team) { d.prev = d.room; unassign(d); d.st = 'quest'; }
  S.quests.list = S.quests.list.filter(x => x !== q);
  q.team = team.map(d => d.id);
  q.stage = 'go';
  q.left = q.dur;
  q.chance = clamp(teamPower(team) / q.diff, 0.1, 0.97);
  S.quests.active.push(q);
  Snd.open();
  return true;
}
function updateQuests(dt) {
  if (!hasType('overseer')) return;
  if (S.time > S.quests.refresh || (!S.quests.list.length && S.quests.active.length < 3)) refreshQuests();
  for (const q of S.quests.active) {
    if (q.stage === 'done') continue;
    q.left -= dt;
    if (q.left > 0) continue;
    if (q.stage === 'go') {
      const team = q.team.map(D).filter(Boolean);
      q.ok = rnd() < q.chance;
      for (const d of team) {
        const loss = (q.ok ? rf(0.1, 0.4) : rf(0.5, 0.8)) * d.mhp;
        d.hp = Math.max(1, d.hp - loss);
      }
      q.stage = 'back';
      q.left = q.dur / 2;
    } else if (q.stage === 'back') {
      q.stage = 'done';
      if (!R.offline) { toast(`Отряд вернулся: «${q.n}» — ${q.ok ? 'успех!' : 'провал'}`, q.ok ? 'good' : 'bad'); Snd.open(); }
    }
  }
}
function collectQuest(q) {
  const team = q.team.map(D).filter(Boolean);
  const xp = q.ok ? 60 + q.lvl * 15 : 20;
  for (const d of team) { gainXp(d, xp); d.st = 'vault'; d.room = null; autoAssign(d, d.prev); }
  const got = [];
  if (q.ok) {
    addCaps(q.rw.caps); got.push(`${q.rw.caps} крышек`);
    const it = randomItem(Math.min(2, q.rw.item));
    addItem(it); got.push(itemName(it));
    if (q.rw.lunch) { S.lunch += q.rw.lunch; got.push('ящик снабжения'); }
    if (q.rw.quantum) { S.res.quantum += q.rw.quantum; got.push(`${q.rw.quantum} Атом-колы`); }
    objProg('quest', 1);
  }
  S.quests.active.splice(S.quests.active.indexOf(q), 1);
  toast(q.ok ? `Награда: ${got.join(', ')}` : 'Отряд вернулся ни с чем, но набрался опыта', q.ok ? 'good' : 'warn');
  Snd.coin();
}

// ===== Цели =====
function objNeed(n) {
  if (!n) return true;
  if (n === 'living') return hasType('living');
  if (n === 'overseer') return hasType('overseer');
  return hasKind(n);
}
function addObjective() {
  const avail = OBJ_T.filter(o => !S.objs.some(x => x.k === o.k) && objNeed(o.need));
  const o = pick(avail);
  const tier = Math.floor(S.objN / 3);
  const n = o.b + o.g * tier;
  let rw;
  if (S.objN % 4 === 3) rw = { lunch: 1 };
  else if (rnd() < 0.15) rw = { quantum: ri(1, 3) };
  else rw = { caps: 50 + 25 * tier + ri(0, 5) * 10 };
  S.objs.push({ k: o.k, t: o.t.replace('{n}', fmt(n)), n, p: 0, rw });
  S.objN++;
}
function objProg(k, n) {
  if (!S || !S.objs) return;
  for (const o of S.objs) {
    if (o.k !== k || o.p >= o.n) continue;
    o.p = Math.min(o.n, o.p + n);
    if (o.p >= o.n && !R.offline) { toast(`Цель выполнена: ${o.t}`, 'good'); Snd.coin(); }
  }
}
function claimObjective(i) {
  const o = S.objs[i];
  if (!o || o.p < o.n) return;
  if (o.rw.caps) addCaps(o.rw.caps);
  if (o.rw.quantum) S.res.quantum += o.rw.quantum;
  if (o.rw.lunch) S.lunch += o.rw.lunch;
  S.objs.splice(i, 1);
  addObjective();
  Snd.coin();
}
function rewardText(rw) {
  if (rw.caps) return `${rw.caps} крышек`;
  if (rw.quantum) return `${rw.quantum} Атом-колы`;
  if (rw.lunch) return 'Ящик снабжения';
  return '';
}

// ===== Ящики снабжения =====
function openLunchbox() {
  if (S.lunch < 1) return null;
  S.lunch--;
  const cards = [];
  for (let i = 0; i < 4; i++) {
    const t = weighted([['caps', 28], ['res', 22], ['w', 16], ['o', 16], ['junk', 9], ['dw', 5], ['q', 3], ['robot', 1.2]]);
    cards.push(makeCard(t));
  }
  if (!cards.some(c => c.rar >= 1)) cards[3] = makeCard(rnd() < 0.5 ? 'w' : 'o', 1);
  for (const c of cards) c.apply();
  return cards;
}
function makeCard(t, forceRar) {
  if (t === 'caps') {
    const n = weighted([[100, 30], [250, 30], [500, 20], [1000, 6]]);
    return { t, rar: n >= 1000 ? 2 : n >= 500 ? 1 : 0, icon: 'caps', col: RES_COL.caps, title: `${n} крышек`, apply: () => addCaps(n) };
  }
  if (t === 'res') {
    const k = pick(['power', 'food', 'water', 'stim', 'rad']);
    const n = k === 'stim' || k === 'rad' ? 3 : 150;
    return { t, rar: 0, icon: RES_ICON[k], col: RES_COL[k], title: `${RES_NAMES[k]} +${n}`, apply: () => { S.res[k] = Math.max(S.res[k], Math.min(S.res[k] + n, Math.max(resCap(k), S.res[k] + n))); } };
  }
  if (t === 'w' || t === 'o') {
    const it = randomItem(forceRar != null ? forceRar : rollRarity(2, 0.12), t);
    return { t, rar: itemRar(it), icon: t === 'w' ? 'gun' : 'shirt', col: RAR_COL[itemRar(it)], title: itemName(it), sub: itemDesc(it), apply: () => addItem(it) };
  }
  if (t === 'junk') {
    const js = {};
    for (let i = 0; i < 3; i++) { const j = pick(Object.keys(JUNK)); js[j] = (js[j] || 0) + ri(1, 2); }
    return { t, rar: 0, icon: 'junk', col: '#b9a57a', title: 'Хлам', sub: Object.keys(js).map(j => `${JUNK[j][0]} ×${js[j]}`).join(', '), apply: () => { for (const j in js) S.junk[j] = Math.min(99, (S.junk[j] || 0) + js[j]); } };
  }
  if (t === 'dw') {
    const rar = rnd() < 0.35 ? 2 : 1;
    const d = rar === 2 ? genLegend() : genDweller({ rarity: 1 });
    d.st = 'arrive';
    return { t, rar, icon: 'people', col: RAR_COL[rar], title: fullName(d), sub: rar === 2 ? 'Легендарный житель ждёт у двери' : 'Редкий житель ждёт у двери', apply: () => S.arrivals.push(d) };
  }
  if (t === 'q') {
    const n = ri(2, 5);
    return { t, rar: 1, icon: 'quantum', col: RES_COL.quantum, title: `Атом-кола ×${n}`, apply: () => { S.res.quantum += n; } };
  }
  if (S.robots.length >= 3) return makeCard('caps');
  return { t: 'robot', rar: 2, icon: 'robot', col: RAR_COL[2], title: 'Робот-помощник', sub: 'Сам собирает ресурсы на своём этаже', apply: () => S.robots.push({ f: 0, x: 200, dir: 1, cd: 0 }) };
}

// ===== Роботы-помощники =====
function updateRobots(dt) {
  for (const b of S.robots) {
    const rooms = S.rooms.filter(r => r.f === b.f && r.t !== 'elev');
    if (!rooms.length) { b.f = 0; continue; }
    const minX = Math.min(...rooms.map(r => roomX(r))) + 20, maxX = Math.max(...rooms.map(r => roomX(r) + roomW(r) * CW)) - 20;
    b.x += b.dir * 30 * dt;
    if (b.x > maxX) { b.x = maxX; b.dir = -1; }
    if (b.x < minX) { b.x = minX; b.dir = 1; }
    b.cd -= dt;
    if (b.cd <= 0) {
      b.cd = 3;
      for (const r of rooms) if ((r.rdy || r.done) && b.x >= roomX(r) && b.x <= roomX(r) + roomW(r) * CW) collectRoom(r, true);
    }
  }
}

// ===== Медленный тик (1 раз в секунду) =====
function slowTick() {
  updatePower();
  // радио
  let radio = 0;
  for (const r of S.rooms) if (r.t === 'radio' && r.w.length && !r.off) radio += 4 + r.l * 2;
  radio = Math.min(20, radio);
  // счастье
  for (const d of S.dwellers) {
    if (d.st !== 'vault') continue;
    let t;
    if (d.child) t = 85;
    else {
      t = 50;
      const r = d.room ? RM(d.room) : null;
      if (!r) t -= 15;
      else {
        const def = ROOMS[r.t];
        if (def && def.st >= 0) { const v = stat(d, def.st), b = stat(d, bestStat(d)); t += 10 + 25 * (v / Math.max(1, b)); if (def.kind === 'train') t += 5; }
        else if (r.t === 'door') t += 20;
        if (r.off) t -= 15;
        if (incAt(r.id)) t -= 10;
      }
      if (d.preg) t += 10;
    }
    if (S.res.food <= 0) t -= 25;
    if (S.res.water <= 0) t -= 25;
    if (d.hp < effMax(d) * 0.5) t -= 10;
    if (d.rad > d.mhp * 0.3) t -= 10;
    t = clamp(t + radio, 5, 100);
    d.hap += (t - d.hap) * 0.012;
  }
  // знакомства
  for (const r of S.rooms) if (r.t === 'living') tryPairing(r);
  // прибытия
  const pop = popCount();
  S.timers.arrive -= 1;
  if (S.timers.arrive <= 0) {
    if (pop < 40 && S.arrivals.length < 4 && pop + S.arrivals.length < popCap() + 2) {
      spawnArrival(rnd() < 0.08 ? 1 : 0);
      if (!R.offline) toast('У двери новый выживший', 'good');
    }
    S.timers.arrive = pop < 20 ? ri(60, 120) : ri(200, 360);
  }
  // случайные происшествия и набеги
  if (S.tutDone && !R.offline) {
    S.timers.inc -= 1;
    if (S.timers.inc <= 0) {
      S.timers.inc = ri(240, 480);
      const cand = S.rooms.filter(r => ROOMS[r.t] && r.w.length && !incAt(r.id));
      if (cand.length && pop >= 6) {
        let k = pick(['fire', 'roach']);
        if (pop >= 30 && rnd() < 0.3) k = 'molerat';
        if (pop >= 50 && rnd() < 0.15) k = 'scorp';
        startIncident(k, pick(cand));
      }
    }
    S.timers.raid -= 1;
    if (S.timers.raid <= 0) {
      S.timers.raid = ri(360, 660);
      if (pop >= 6 && !S.incs.some(i => i.ext)) {
        let k = 'raider';
        if (pop >= 35 && rnd() < 0.35) k = 'ghoul';
        if (pop >= 60 && rnd() < 0.3) k = 'beast';
        startRaid(k);
      }
    }
  }
  // обучение
  if (!S.tutDone) {
    if (S.tut === 0 && S.dwellers.length > 0) S.tut = 1;
    if (S.tut === 1 && S.rooms.some(r => ROOMS[r.t] && ROOMS[r.t].res === 'power')) S.tut = 2;
    if (S.tut === 2 && hasType('diner') && hasType('water')) S.tut = 3;
    if (S.tut === 3 && ['power', 'diner', 'water'].every(t => S.rooms.some(r => r.t === t && r.w.length))) S.tut = 4;
    if (S.tut === 5 && hasType('living')) { S.tut = 6; S.tutT = 14; }
    if (S.tut === 6) { S.tutT = (S.tutT || 14) - 1; if (S.tutT <= 0) S.tutDone = true; }
  }
}

// ===== Офлайн-прогресс =====
function simOffline(sec) {
  const before = { caps: S.res.caps, food: S.res.food, water: S.res.water, power: S.res.power, pop: popCount() };
  R.offline = true;
  const step = 1;
  for (let t = 0; t < sec; t += step) sim(step);
  R.offline = false;
  R.offlineReport = { sec, caps: Math.round(S.res.caps - before.caps), births: popCount() - before.pop };
}
