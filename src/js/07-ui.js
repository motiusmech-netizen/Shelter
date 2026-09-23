// ===== Интерфейс =====
const $ = s => document.querySelector(s);
const UI = {
  stack: [], down: false, lastHtml: '',
  open(view, reset) {
    if (reset) this.stack = [];
    if (this.stack.length && this.stack[this.stack.length - 1].key === view.key) this.stack.pop();
    this.stack.push(view);
    this.show();
  },
  replace(view) { this.stack.pop(); this.stack.push(view); this.show(); },
  back() { this.stack.pop(); if (!this.stack.length) this.close(); else this.show(); },
  close() {
    this.stack = [];
    $('#sheet').hidden = true;
    R.selRoom = null; R.selD = null; R.sheetH = 0;
  },
  show() {
    const v = this.stack[this.stack.length - 1];
    if (!v) return this.close();
    $('#sheet').hidden = false;
    $('#sheet-t').textContent = typeof v.title === 'function' ? v.title() : v.title;
    $('#sheet-back').hidden = this.stack.length < 2;
    const b = $('#sheet-b');
    b.scrollTop = 0;
    this.lastHtml = '';
    this.render(true);
  },
  render(force) {
    const v = this.stack[this.stack.length - 1];
    if (!v) return;
    if (v.alive && !v.alive()) { this.back(); return; }
    const html = v.render();
    if (!force && html === this.lastHtml) return;
    const b = $('#sheet-b');
    const st = b.scrollTop;
    b.innerHTML = html;
    b.scrollTop = st;
    this.lastHtml = html;
    $('#sheet-t').textContent = typeof v.title === 'function' ? v.title() : v.title;
    if (v.after) v.after(b);
  },
  tick() {
    const v = this.stack[this.stack.length - 1];
    if (v && v.live && !this.down && !$('#sheet').hidden) this.render();
  },
};

function toast(msg, kind) {
  if (R.offline || !R.playing) return;
  const box = $('#toasts');
  const now = performance.now();
  if (R.lastToast === msg && now - (R.lastToastT || 0) < 2500) return;
  R.lastToast = msg; R.lastToastT = now;
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2800);
}
function modal(html, cls) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card ${cls || ''}">${html}</div>`;
  m.hidden = false;
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
function confirmBox(text, yes, onYes, danger) {
  R.confirmCb = onYes;
  modal(`<p class="confirm-t">${text}</p><div class="btn-row"><button class="btn ghost" data-a="modalClose">Отмена</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="confirmYes">${yes}</button></div>`);
}

// ===== Мелкие шаблоны =====
function av(d) {
  const suit = d.outfit ? OUTFITS[d.outfit.id][3] : '#2f6db3';
  return `<span class="av${d.child ? ' kid' : ''}" style="--skin:${d.look.skin};--suit:${suit};--hair:${d.look.hair}"><i></i><em></em></span>`;
}
function locText(d) {
  if (d.st === 'dead') return d.deadIn === 'waste' ? 'Погиб(ла) в Пустоши' : 'Погиб(ла)';
  if (d.st === 'explore') return d.ex && d.ex.home ? 'Вернулся(ась) — у двери' : 'В Пустоши';
  if (d.st === 'quest') return 'На задании';
  if (d.child) return 'Ребёнок · ' + fmtTime(d.child);
  const r = d.room ? RM(d.room) : null;
  if (!r) return 'Без дела';
  return roomName(r) + (r.t === 'door' ? ' (охрана)' : '');
}
function hpBar(d) {
  const hp = clamp(d.hp / d.mhp, 0, 1) * 100, rd = clamp(d.rad / d.mhp, 0, 1) * 100;
  return `<span class="hpbar"><i style="width:${hp.toFixed(1)}%"></i><u style="width:${rd.toFixed(1)}%"></u></span>`;
}
function spGrid(d, hl) {
  return `<div class="spg">${STAT_ABBR.map((a, i) => {
    const b = statBonus(d, i);
    return `<span class="sp${hl === i ? ' hl' : ''}"><em>${a}</em><b>${d.sp[i]}</b>${b ? `<i>+${b}</i>` : ''}</span>`;
  }).join('')}</div>`;
}
function resIco(k, cls = '') { return `<span class="ri ${cls}" style="--c:${RES_COL[k]}">${svg(RES_ICON[k] || k)}</span>`; }
function capsTxt(n) { return `<span class="cap-t">${svg('caps')}${fmt(n)}</span>`; }
function rarTag(r) { return `<span class="rar r${r}">${RAR[r]}</span>`; }
function bar(p, col) { return `<span class="pbar"><i style="width:${(clamp(p, 0, 1) * 100).toFixed(1)}%;${col ? `background:${col}` : ''}"></i></span>`; }

// ===== HUD =====
const HUDC = {};
function initHud() {
  $('#hud').innerHTML = `
    <div class="hud-top">
      <button class="chip" data-a="dwellers" aria-label="Жители">${svg('people')}<b id="h-pop"></b></button>
      <span class="chip" title="Счастье">${svg('smile')}<b id="h-hap"></b></span>
      <span class="vault-plate" id="h-vault"></span>
      <span class="chip caps">${svg('caps')}<b id="h-caps"></b></span>
      <button class="chip q" data-a="objectives" aria-label="Атом-кола">${svg('quantum')}<b id="h-q"></b></button>
    </div>
    <div class="hud-res">
      ${['power', 'food', 'water'].map(k => `<div class="res" id="h-${k}" style="--c:${RES_COL[k]}">${svg(RES_ICON[k])}<span class="meter"><i></i></span><b></b></div>`).join('')}
    </div>`;
  for (const k of ['pop', 'hap', 'caps', 'q', 'vault']) HUDC[k] = $('#h-' + k);
  for (const k of ['power', 'food', 'water']) { const el = $('#h-' + k); HUDC[k] = { el, i: el.querySelector('i'), b: el.querySelector('b') }; }
}
function setText(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
function updateHud() {
  if (!S) return;
  setText(HUDC.pop, `${popCount()}/${popCap()}`);
  const ad = S.dwellers.filter(d => d.st === 'vault' && !d.child);
  const hap = ad.length ? ad.reduce((a, d) => a + d.hap, 0) / ad.length : 0;
  setText(HUDC.hap, `${Math.round(hap)}%`);
  setText(HUDC.caps, fmt(S.res.caps));
  setText(HUDC.q, fmt(S.res.quantum));
  setText(HUDC.vault, S.vault);
  for (const k of ['power', 'food', 'water']) {
    const c = resCap(k), v = S.res[k], h = HUDC[k];
    h.i.style.width = (clamp(v / c, 0, 1) * 100).toFixed(1) + '%';
    setText(h.b, fmt(v));
    h.el.classList.toggle('low', v < c * 0.15);
  }
  // тревоги и уведомления
  const chips = [];
  if (S.incs.length) chips.push(`<button class="al bad" data-a="incident">${svg('alert')}<span>${ENEMY[S.incs[0].k].n}</span></button>`);
  if (S.arrivals.length) chips.push(`<button class="al warn${S.tut === 0 && !S.tutDone ? ' pulse' : ''}" data-a="arrivals">${svg('people')}<span>У двери: ${S.arrivals.length}</span></button>`);
  const home = S.dwellers.filter(d => d.st === 'explore' && d.ex && d.ex.home).length;
  if (home) chips.push(`<button class="al good" data-a="waste">${svg('bag')}<span>Вернулись: ${home}</span></button>`);
  const qd = S.quests.active.filter(q => q.stage === 'done').length;
  if (qd) chips.push(`<button class="al good" data-a="quests">${svg('star')}<span>Отряд вернулся</span></button>`);
  const lu = S.dwellers.filter(d => d.lu && d.st === 'vault').length;
  if (lu) chips.push(`<button class="al good" data-a="lvlall">${svg('up')}<span>Новый уровень: ${lu}</span></button>`);
  const dead = S.dwellers.filter(d => d.st === 'dead').length;
  if (dead) chips.push(`<button class="al bad" data-a="deadList">${svg('skull')}<span>Погибшие: ${dead}</span></button>`);
  if (S.lunch > 0) chips.push(`<button class="al lunch" data-a="lunch">${svg('box')}<span>Ящик ×${S.lunch}</span></button>`);
  const html = chips.join('');
  const box = $('#alerts');
  if (box._h !== html) { box._h = html; box.innerHTML = html; }
  const ready = S.objs.filter(o => o.p >= o.n).length;
  const badge = $('#obj-badge');
  setText(badge, ready ? String(ready) : '');
  badge.hidden = !ready;
  // подсказка обучения
  const tut = $('#tut');
  if (!S.tutDone && !R.place) {
    tut.hidden = false;
    setText(tut.querySelector('p'), TUT[S.tut]);
    const buildBtn = $('#bar [data-a="build"]');
    buildBtn.classList.toggle('pulse', S.tut === 1 || S.tut === 2 || S.tut === 5);
  } else {
    tut.hidden = true;
    $('#bar [data-a="build"]').classList.remove('pulse');
  }
}

// ===== Вид: комната =====
function roomView(id) {
  return {
    key: 'room' + id, live: true,
    alive: () => !!RM(id),
    title: () => { const r = RM(id); return r ? roomName(r) : ''; },
    render() {
      const r = RM(id);
      if (r.t === 'door') return doorHtml(r);
      const def = ROOMS[r.t];
      let h = `<div class="room-head" style="--rc:${def.col}"><div><div class="lvl">Уровень ${r.l}${r.s > 1 ? ` · ${r.s === 2 ? 'двойная' : 'тройная'}` : ''}</div><p class="muted">${def.desc}</p></div>${def.st >= 0 ? `<div class="stat-need"><em>${STAT_ABBR[def.st]}</em><small>${STAT_NAMES[def.st]}</small></div>` : ''}</div>`;
      const inc = incAt(r.id);
      if (inc) h += `<div class="banner bad">${svg('alert')}<span><b>${ENEMY[inc.k].n}!</b> ${inc.k === 'fire' ? 'Жители в комнате тушат пожар.' : 'Жители в комнате сражаются.'} Добавьте сильных и вооружённых.</span></div>`;
      if (r.off) h += `<div class="banner warn">${svg('power')}<span>Нет энергии — комната не работает. Соберите энергию или постройте Электростанцию.</span></div>`;
      // статус
      if (def.kind === 'prod') {
        const res = def.res;
        const out = roomOutput(r);
        if (r.rdy) h += `<div class="status"><span>${resIco(res === 'cola' ? 'quantum' : res)} Готово: <b>+${r.rdy}</b></span><button class="btn primary" data-a="collect" data-id="${r.id}">Собрать</button></div>`;
        else if (r.w.length) {
          const ct = cycleTime(r);
          h += `<div class="status col"><div class="row-sp"><span>${resIco(res === 'cola' ? 'quantum' : res)} +${out} ${res === 'cola' ? 'еды и воды' : ''} за цикл</span><span class="mono">${r.off || inc ? 'пауза' : fmtTime((1 - r.p) * ct)}</span></div>${bar(r.p, RES_COL[res])}</div>`;
        } else h += `<div class="status"><span class="muted">Назначьте жителей, чтобы начать производство.</span></div>`;
      } else if (def.kind === 'living') {
        const cap = Math.round(ROOMS.living.cap[r.l - 1] * r.s * (r.s === 1 ? 1 : r.s === 2 ? 1.05 : 1.1));
        h += `<div class="status col"><span>Вместимость убежища: <b>+${cap}</b> (всего ${popCap()})</span><small class="muted">Мужчина и женщина, назначенные сюда, могут познакомиться. Высокая Харизма ускоряет знакомство.</small></div>`;
        if (r.pair) { const m = D(r.pair.m), f = D(r.pair.f); if (m && f) h += `<div class="status">${svg('heart')}<span>${esc(m.name)} и ${esc(f.name)} ${['знакомятся', 'танцуют', 'уединились'][r.pair.ph]}…</span></div>`; }
        if (popCount() + pregnancies() >= popCap()) h += `<div class="banner warn">${svg('alert')}<span>Убежище заполнено — дети не появятся, пока не станет больше мест.</span></div>`;
      } else if (def.kind === 'train') {
        h += `<div class="status col"><span>Тренировка: <b>${STAT_NAMES[def.st]}</b> до 10. Уровень комнаты ускоряет обучение.</span></div>`;
      } else if (def.kind === 'radio') {
        h += `<div class="status col"><div class="row-sp"><span>Эфир: привлечение выживших и +счастье</span><span class="mono">${r.w.length && !r.off ? fmtTime((1 - r.p) * cycleTime(r)) : '—'}</span></div>${bar(r.p, '#c58af0')}</div>`;
      } else if (def.kind === 'storage') {
        h += `<div class="status"><span>Места для предметов: <b>+${ROOMS.storage.items[r.l - 1] * r.s}</b> (занято ${S.inv.length}/${itemCap()})</span></div>`;
      } else if (def.kind === 'craft') {
        if (r.done) h += `<div class="status"><span>Готово: <b style="color:${RAR_COL[itemRar(r.done)]}">${esc(itemName(r.done))}</b></span><button class="btn primary" data-a="collect" data-id="${r.id}">Забрать</button></div>`;
        else if (r.craft) h += `<div class="status col"><div class="row-sp"><span>Создаётся: ${esc(itemName(r.craft))}</span><span class="mono">${r.w.length && !r.off ? fmtTime((1 - r.craft.p) * r.craft.T / (0.4 + 0.12 * sumStat(r))) : 'пауза'}</span></div>${bar(r.craft.p, '#7ed957')}${S.res.quantum > 0 ? `<button class="btn q small" data-a="craftQ" data-id="${r.id}">${svg('quantum')} Завершить за 1 Атом-колу</button>` : ''}</div>`;
        else h += `<div class="status"><span>Мастерская свободна.</span><button class="btn primary" data-a="craft" data-id="${r.id}">Создать предмет</button></div>`;
      } else if (def.kind === 'overseer') {
        h += `<div class="status"><span>Отряды до 3 жителей выполняют задания за крышки, снаряжение и ящики.</span><button class="btn primary" data-a="quests">Задания</button></div>`;
      }
      // работники
      const cap = roomCap(r);
      if (cap) {
        h += `<h3 class="sub">Жители ${r.w.length}/${cap}</h3><div class="slots">`;
        for (const d of workersOf(r)) {
          let extra = def.st >= 0 ? `<span class="big-stat"><em>${STAT_ABBR[def.st]}</em>${stat(d, def.st)}</span>` : '';
          if (def.kind === 'train' && d.sp[def.st] < 10) extra += bar(d.tp, '#7ed957');
          h += `<button class="slot" data-a="dweller" data-id="${d.id}">${av(d)}<span class="nm">${esc(d.name)}${d.lu ? ` <b class="up">${svg('up')}</b>` : ''}</span>${hpBar(d)}${extra}</button>`;
        }
        for (let i = r.w.length; i < cap; i++) h += `<button class="slot empty" data-a="pick" data-id="${r.id}"><span class="plus">+</span><span class="nm">Назначить</span></button>`;
        h += `</div>`;
        const idle = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.room).length;
        if (idle && r.w.length < cap) h += `<button class="btn wide" data-a="fill" data-id="${r.id}">${svg('people')} Назначить лучших без дела (${Math.min(idle, cap - r.w.length)})</button>`;
      }
      const kids = S.dwellers.filter(d => d.child && d.room === r.id);
      if (kids.length) h += `<p class="muted small">Дети: ${kids.map(d => `${esc(d.name)} (${fmtTime(d.child)})`).join(', ')}</p>`;
      // действия
      h += `<div class="actions">`;
      if (def.kind === 'prod' || def.kind === 'radio') {
        const can = rushable(r);
        h += `<button class="btn rush" data-a="rush" data-id="${r.id}" ${can ? '' : 'disabled'}>${svg('clock')}<span>Ускорить<small>риск ${Math.round(rushFail(r) * 100)}%</small></span></button>`;
      }
      if (r.l < 3) h += `<button class="btn up" data-a="upgrade" data-id="${r.id}" ${S.res.caps < upgradeCost(r) ? 'disabled' : ''}>${svg('up')}<span>Улучшить<small>${fmt(upgradeCost(r))} крышек</small></span></button>`;
      else h += `<span class="btn ghost static">Макс. уровень</span>`;
      h += `<button class="btn ghost" data-a="destroy" data-id="${r.id}">Снести</button></div>`;
      if (!def.noMerge && r.s < 3) h += `<p class="muted small">Постройте такую же комнату рядом (того же уровня), чтобы объединить до трёх секций.</p>`;
      return h;
    },
  };
}
function doorHtml(r) {
  let h = `<div class="room-head" style="--rc:#3b4147"><div><div class="lvl">Уровень ${r.l}</div><p class="muted">Первая линия обороны. Охранники с оружием отбивают набеги ещё у двери.</p></div></div>`;
  h += `<div class="status col"><div class="row-sp"><span>Прочность двери</span><span class="mono">${fmt(r.hp)}/${fmt(DOOR_HP[r.l - 1])}</span></div>${bar(r.hp / DOOR_HP[r.l - 1], '#9aa3a8')}</div>`;
  const inc = incAt(r.id);
  if (inc) h += `<div class="banner bad">${svg('alert')}<span><b>${ENEMY[inc.k].n}</b> у двери!</span></div>`;
  h += `<h3 class="sub">Охрана ${r.w.length}/2</h3><div class="slots">`;
  for (const d of workersOf(r)) h += `<button class="slot" data-a="dweller" data-id="${d.id}">${av(d)}<span class="nm">${esc(d.name)}</span>${hpBar(d)}<span class="big-stat"><em>УРОН</em>${d.weapon ? WEAPONS[d.weapon.id][1] + '–' + WEAPONS[d.weapon.id][2] : '1'}</span></button>`;
  for (let i = r.w.length; i < 2; i++) h += `<button class="slot empty" data-a="pick" data-id="${r.id}"><span class="plus">+</span><span class="nm">Поставить охрану</span></button>`;
  h += `</div><div class="actions">`;
  if (r.l < 3) h += `<button class="btn up" data-a="upgrade" data-id="${r.id}" ${S.res.caps < upgradeCost(r) ? 'disabled' : ''}>${svg('up')}<span>Укрепить дверь<small>${fmt(upgradeCost(r))} крышек</small></span></button>`;
  if (S.arrivals.length) h += `<button class="btn primary" data-a="arrivals">У двери ждут: ${S.arrivals.length}</button>`;
  h += `</div>`;
  const idle = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.room);
  if (idle.length) h += `<p class="muted small">Без дела у двери: ${idle.map(d => esc(d.name)).join(', ')} — они тоже помогут при набеге.</p>`;
  return h;
}
function pickerView(roomId) {
  return {
    key: 'pick' + roomId, live: false, alive: () => !!RM(roomId),
    title: 'Выберите жителя',
    render() {
      const r = RM(roomId);
      const def = ROOMS[r.t];
      const si = def ? def.st : -1;
      const list = S.dwellers.filter(d => d.st === 'vault' && !d.child && d.room !== r.id);
      const score = d => (r.t === 'door' ? dmgAvg(d) * 10 + d.lvl : stat(d, si) * 100 + d.lvl);
      list.sort((a, b) => score(b) - score(a));
      if (!list.length) return `<p class="empty-t">Нет свободных жителей. Примите новых у двери или переведите из других комнат.</p>`;
      return `<p class="muted small">${r.t === 'door' ? 'Лучшие охранники — с сильным оружием.' : `Важная характеристика: <b>${STAT_NAMES[si]}</b>. Жители счастливее, когда работают по призванию.`}</p><div class="list">${list.map(d => {
        const cur = d.room ? roomName(RM(d.room)) : 'Без дела';
        const val = r.t === 'door' ? (d.weapon ? `${WEAPONS[d.weapon.id][1]}–${WEAPONS[d.weapon.id][2]}` : '1') : stat(d, si);
        return `<button class="row" data-a="assignTo" data-id="${d.id}" data-r="${r.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${esc(cur)}</small></span><span class="big-stat"><em>${r.t === 'door' ? 'УРОН' : STAT_ABBR[si]}</em>${val}</span></button>`;
      }).join('')}</div>`;
    },
  };
}

// ===== Вид: житель =====
function dwellerView(id) {
  return {
    key: 'dw' + id, live: true, alive: () => !!D(id),
    title: () => { const d = D(id); return d ? fullName(d) : ''; },
    render() {
      const d = D(id);
      if (R.renaming === id) {
        return `<form class="rename" data-form="rename"><label for="rn-name">Имя</label><input id="rn-name" maxlength="18" value="${esc(d.name)}"><label for="rn-sur">Фамилия (мужская форма)</label><input id="rn-sur" maxlength="20" value="${esc(d.sur)}"><div class="btn-row"><button type="button" class="btn ghost" data-a="renameCancel">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form>`;
      }
      const need = xpNeed(d.lvl);
      let h = `<div class="dw-head"><canvas class="portrait" id="portrait"></canvas><div class="dw-info">
        <div class="lvl">${d.rar ? rarTag(d.rar) : ''} Уровень ${d.lvl}${d.child ? ' · ребёнок' : ''}</div>
        <div class="kv"><span>Опыт</span>${bar(d.xp / need, '#7ed957')}<small class="mono">${fmt(d.xp)}/${fmt(need)}</small></div>
        <div class="kv"><span>Здоровье</span>${hpBar(d)}<small class="mono">${Math.ceil(d.hp)}/${Math.round(d.mhp)}${d.rad >= 1 ? ` · рад ${Math.round(d.rad)}` : ''}</small></div>
        <div class="kv"><span>Счастье</span>${bar(d.hap / 100, '#f0b429')}<small class="mono">${Math.round(d.hap)}%</small></div>
        <div class="muted small">${esc(locText(d))}${d.preg ? ` · беременна (${fmtTime(d.preg)})` : ''}</div>
      </div></div>`;
      if (d.lu) h += `<button class="btn primary wide" data-a="lvlup" data-id="${d.id}">${svg('up')} Повысить уровень</button>`;
      h += spGrid(d);
      if (!d.child) {
        h += `<div class="equip">
          <button class="eq" data-a="equipPick" data-id="${d.id}" data-k="w">${svg('gun')}<span><small>Оружие</small><b style="color:${d.weapon ? RAR_COL[itemRar(d.weapon)] : ''}">${d.weapon ? esc(itemName(d.weapon)) : 'Кулаки'}</b><small>${d.weapon ? itemDesc(d.weapon) : 'Урон 1'}</small></span></button>
          <button class="eq" data-a="equipPick" data-id="${d.id}" data-k="o">${svg('shirt')}<span><small>Одежда</small><b style="color:${d.outfit ? RAR_COL[itemRar(d.outfit)] : ''}">${d.outfit ? esc(itemName(d.outfit)) : 'Комбинезон убежища'}</b><small>${d.outfit ? itemDesc(d.outfit) : 'Без бонусов'}</small></span></button>
        </div>`;
      }
      if (d.st === 'vault') {
        h += `<div class="actions">
          <button class="btn" data-a="stim" data-id="${d.id}">${resIco('stim')}<span>Аптечка<small>есть ${Math.floor(S.res.stim)}</small></span></button>
          <button class="btn" data-a="radaway" data-id="${d.id}">${resIco('rad')}<span>Антирадин<small>есть ${Math.floor(S.res.rad)}</small></span></button>
        </div>`;
        if (!d.child) h += `<div class="actions">
          <button class="btn" data-a="assignPick" data-id="${d.id}">Перевести</button>
          <button class="btn" data-a="sendCfg" data-id="${d.id}">${svg('map')} В Пустошь</button>
        </div>`;
      } else if (d.st === 'explore') {
        h += `<div class="actions"><button class="btn" data-a="waste">Открыть Пустошь</button></div>`;
      } else if (d.st === 'dead') {
        h += `<div class="actions"><button class="btn primary" data-a="deadOpen" data-id="${d.id}">Воскресить…</button></div>`;
      }
      h += `<div class="actions"><button class="btn ghost" data-a="rename" data-id="${d.id}">Переименовать</button>${d.st === 'vault' ? `<button class="btn ghost danger-t" data-a="evict" data-id="${d.id}">Изгнать</button>` : ''}</div>`;
      const kids = S.dwellers.filter(k => k.par && k.par.includes(d.id));
      const parents = d.par ? d.par.map(D).filter(Boolean) : [];
      if (kids.length || parents.length) h += `<p class="muted small">${parents.length ? `Родители: ${parents.map(p => esc(p.name)).join(', ')}. ` : ''}${kids.length ? `Дети: ${kids.map(k => esc(k.name)).join(', ')}.` : ''}</p>`;
      return h;
    },
    after(b) { const c = b.querySelector('#portrait'); if (c) drawPortrait(c, D(id)); },
  };
}
function equipView(id, k) {
  return {
    key: 'eq' + id + k, alive: () => !!D(id),
    title: k === 'w' ? 'Оружие' : 'Одежда',
    render() {
      const d = D(id);
      const items = S.inv.filter(it => it.k === k);
      const power = it => (k === 'w' ? WEAPONS[it.id][1] + WEAPONS[it.id][2] : OUTFITS[it.id][1].reduce((a, b) => a + b, 0)) + itemRar(it) * 100;
      items.sort((a, b) => power(b) - power(a));
      const cur = k === 'w' ? d.weapon : d.outfit;
      let h = cur ? `<button class="row" data-a="unequip" data-id="${d.id}" data-k="${k}"><span class="grow"><b>Снять: ${esc(itemName(cur))}</b><small>Вернуть на склад</small></span></button>` : '';
      if (!items.length) return h + `<p class="empty-t">На складе нет ${k === 'w' ? 'оружия' : 'одежды'}. Ищите в Пустоши, ящиках снабжения или создайте в мастерской.</p>`;
      h += `<div class="list">${items.map(it => `<button class="row" data-a="equip" data-id="${d.id}" data-u="${it.u}">${svg(k === 'w' ? 'gun' : 'shirt', 'r' + itemRar(it))}<span class="grow"><b style="color:${RAR_COL[itemRar(it)]}">${esc(itemName(it))}</b><small>${itemDesc(it)}</small></span></button>`).join('')}</div>`;
      return h;
    },
  };
}
function assignPickView(id) {
  return {
    key: 'ap' + id, alive: () => !!D(id),
    title: 'Куда перевести?',
    render() {
      const d = D(id);
      const rooms = S.rooms.filter(r => (roomCap(r) > 0) && r.id !== d.room);
      const sc = r => { const def = ROOMS[r.t]; return def && def.st >= 0 ? stat(d, def.st) : 0; };
      rooms.sort((a, b) => sc(b) - sc(a));
      return `<div class="list">${rooms.map(r => {
        const def = ROOMS[r.t];
        const full = freeSlots(r) <= 0;
        return `<button class="row" data-a="assignTo" data-id="${d.id}" data-r="${r.id}" ${full ? 'disabled' : ''}><span class="swatch" style="--rc:${def ? def.col : '#3b4147'}"></span><span class="grow"><b>${esc(roomName(r))}</b><small>Этаж ${r.f + 1} · ${r.w.length}/${roomCap(r)}${full ? ' · мест нет' : ''}</small></span>${def && def.st >= 0 ? `<span class="big-stat"><em>${STAT_ABBR[def.st]}</em>${stat(d, def.st)}</span>` : ''}</button>`;
      }).join('')}<button class="row" data-a="assignTo" data-id="${d.id}" data-r="0"><span class="grow"><b>Снять с работы</b><small>Житель будет ждать у двери</small></span></button></div>`;
    },
  };
}
function deadView(id) {
  return {
    key: 'dead' + id, alive: () => !!D(id) && D(id).st === 'dead',
    title: 'Житель погиб',
    render() {
      const d = D(id);
      return `<div class="center-block">${svg('skull', 'huge')}<h3>${esc(fullName(d))}</h3><p class="muted">Уровень ${d.lvl}. ${d.deadIn === 'waste' ? 'Погиб(ла) в Пустоши.' : 'Погиб(ла) в убежище.'}</p></div>
      <div class="actions col">
        <button class="btn primary" data-a="revive" data-id="${d.id}" ${S.res.caps < reviveCost(d) ? 'disabled' : ''}>Воскресить за ${fmt(reviveCost(d))} крышек</button>
        <button class="btn q" data-a="reviveAd" data-id="${d.id}">${svg('ad')} Воскресить за просмотр рекламы</button>
        <button class="btn ghost danger-t" data-a="bury" data-id="${d.id}">Похоронить</button>
      </div>`;
    },
  };
}

// ===== Вид: список жителей =====
const DWF = { f: 'all', s: 'lvl' };
function dwellersView() {
  return {
    key: 'dwellers', live: true, title: () => `Жители ${popCount()}/${popCap()}`,
    render() {
      let list = S.dwellers.slice();
      if (DWF.f === 'idle') list = list.filter(d => d.st === 'vault' && !d.child && !d.room);
      if (DWF.f === 'hurt') list = list.filter(d => d.st === 'vault' && (d.hp < effMax(d) * 0.8 || d.rad > 5));
      if (DWF.f === 'out') list = list.filter(d => d.st === 'explore' || d.st === 'quest');
      if (DWF.f === 'lvl') list = list.filter(d => d.lu);
      const si = STAT_ABBR.indexOf(DWF.s);
      list.sort((a, b) => DWF.s === 'lvl' ? b.lvl - a.lvl : DWF.s === 'hap' ? b.hap - a.hap : DWF.s === 'name' ? a.name.localeCompare(b.name) : stat(b, si) - stat(a, si));
      const lu = S.dwellers.filter(d => d.lu && d.st === 'vault').length;
      let h = `<div class="seg">${[['all', 'Все'], ['idle', 'Без дела'], ['hurt', 'Раненые'], ['out', 'Снаружи'], ['lvl', 'Уровень↑']].map(([k, n]) => `<button class="${DWF.f === k ? 'on' : ''}" data-a="dwf" data-v="${k}">${n}</button>`).join('')}</div>`;
      h += `<div class="seg small">${[['lvl', 'Ур.'], ...STAT_ABBR.map(a => [a, a]), ['hap', 'Счастье']].map(([k, n]) => `<button class="${DWF.s === k ? 'on' : ''}" data-a="dws" data-v="${k}">${n}</button>`).join('')}</div>`;
      if (lu) h += `<button class="btn primary wide" data-a="lvlall">${svg('up')} Повысить уровень всем (${lu})</button>`;
      if (!list.length) return h + `<p class="empty-t">Никого нет.</p>`;
      h += `<div class="list">${list.map(d => {
        const val = si >= 0 ? `<span class="big-stat"><em>${STAT_ABBR[si]}</em>${stat(d, si)}</span>` : DWF.s === 'hap' ? `<span class="big-stat"><em>СЧАСТ.</em>${Math.round(d.hap)}</span>` : `<span class="big-stat"><em>УР.</em>${d.lvl}</span>`;
        return `<button class="row${d.st === 'dead' ? ' dead' : ''}" data-a="dweller" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}${d.lu ? ` <span class="up">${svg('up')}</span>` : ''}</b><small>${esc(locText(d))}</small>${hpBar(d)}</span>${val}</button>`;
      }).join('')}</div>`;
      return h;
    },
  };
}

// ===== Вид: строительство =====
function buildView() {
  return {
    key: 'build', live: true, title: 'Строительство',
    render() {
      const pop = popCount();
      const cards = ['elev', ...BUILD_ORDER].map(t => {
        const isE = t === 'elev';
        const def = isE ? null : ROOMS[t];
        const lock = !unlocked(t);
        const built = !isE && def.unique && hasType(t);
        const cost = buildCost(t);
        const poor = S.res.caps < cost;
        const col = isE ? '#4a4d50' : def.col;
        return `<button class="bcard${lock ? ' locked' : ''}" data-a="place" data-t="${t}" ${lock || built ? 'disabled' : ''} style="--rc:${col}">
          <span class="bc-art">${isE ? svg('up') : def.st >= 0 ? `<em>${STAT_ABBR[def.st]}</em>` : svg('star')}</span>
          <b>${isE ? 'Лифт' : def.n}</b>
          <small>${lock ? `${svg('people')} с ${def.pop} жителей` : built ? 'Уже построено' : `<span class="${poor ? 'bad-t' : ''}">${svg('caps')}${fmt(cost)}</span>`}</small>
        </button>`;
      }).join('');
      return `<p class="muted small">Комнаты ставятся рядом с другими комнатами или лифтом. Три одинаковые комнаты рядом сливаются в одну большую. Жителей: ${pop}.</p><div class="bgrid">${cards}</div>`;
    },
  };
}

// ===== Вид: склад =====
let INV_TAB = 'w';
function invView() {
  return {
    key: 'inv', live: true, title: () => `Склад ${S.inv.length}/${itemCap()}`,
    render() {
      let h = `<div class="seg">${[['w', 'Оружие'], ['o', 'Одежда'], ['j', 'Хлам'], ['x', 'Припасы']].map(([k, n]) => `<button class="${INV_TAB === k ? 'on' : ''}" data-a="invTab" data-v="${k}">${n}</button>`).join('')}</div>`;
      if (INV_TAB === 'w' || INV_TAB === 'o') {
        const items = S.inv.filter(it => it.k === INV_TAB).sort((a, b) => itemRar(b) - itemRar(a));
        const worn = S.dwellers.filter(d => (INV_TAB === 'w' ? d.weapon : d.outfit)).length;
        h += `<p class="muted small">На складе: ${items.length}. Экипировано у жителей: ${worn}. Экипировать можно в карточке жителя.</p>`;
        if (!items.length) h += `<p class="empty-t">Пусто.</p>`;
        h += `<div class="list">${items.map(it => `<div class="row">${svg(it.k === 'w' ? 'gun' : 'shirt', 'r' + itemRar(it))}<span class="grow"><b style="color:${RAR_COL[itemRar(it)]}">${esc(itemName(it))}</b><small>${itemDesc(it)} · ${RAR[itemRar(it)]}</small></span><button class="btn small" data-a="sell" data-u="${it.u}">Продать ${sellPrice(it)}</button></div>`).join('')}</div>`;
      } else if (INV_TAB === 'j') {
        const ks = Object.keys(JUNK).filter(j => S.junk[j] > 0);
        h += `<p class="muted small">Хлам нужен для создания предметов в мастерских. Его приносят из Пустоши.</p>`;
        if (!ks.length) h += `<p class="empty-t">Хлама нет.</p>`;
        h += `<div class="junk">${ks.map(j => `<span class="jk r${Math.min(2, JUNK[j][1])}">${svg('junk')}<b>${JUNK[j][0]}</b><em>×${S.junk[j]}</em></span>`).join('')}</div>`;
      } else {
        h += `<div class="list">
          <div class="row">${resIco('stim')}<span class="grow"><b>Аптечки</b><small>Лечат 45% здоровья</small></span><b class="mono">${Math.floor(S.res.stim)}/${resCap('stim')}</b></div>
          <div class="row">${resIco('rad')}<span class="grow"><b>Антирадин</b><small>Снимает облучение</small></span><b class="mono">${Math.floor(S.res.rad)}/${resCap('rad')}</b></div>
          <div class="row">${resIco('quantum')}<span class="grow"><b>Атом-кола</b><small>Мгновенно завершает походы и создание предметов</small></span><b class="mono">${S.res.quantum}</b></div>
          <div class="row">${svg('box')}<span class="grow"><b>Ящики снабжения</b><small>Внутри 4 карты с наградами</small></span><button class="btn small primary" data-a="lunch" ${S.lunch ? '' : 'disabled'}>Открыть (${S.lunch})</button></div>
        </div>`;
        if (S.robots.length) {
          h += `<h3 class="sub">Роботы-помощники</h3><div class="list">${S.robots.map((b, i) => `<div class="row">${svg('robot')}<span class="grow"><b>Робот №${i + 1}</b><small>Собирает ресурсы на этаже ${b.f + 1}</small></span><button class="btn small" data-a="robot" data-i="${i}" data-v="-1">▲</button><button class="btn small" data-a="robot" data-i="${i}" data-v="1">▼</button></div>`).join('')}</div>`;
        }
      }
      return h;
    },
  };
}

// ===== Вид: Пустошь =====
function wasteView() {
  return {
    key: 'waste', live: true, title: 'Пустошь',
    render() {
      const ex = S.dwellers.filter(d => (d.st === 'explore' || (d.st === 'dead' && d.deadIn === 'waste')) && d.ex);
      let h = `<div class="actions"><button class="btn primary" data-a="sendPick">${svg('map')} Отправить жителя</button>${hasType('overseer') ? `<button class="btn" data-a="quests">${svg('star')} Задания</button>` : ''}</div>`;
      h += `<p class="muted small">Исследователь находит крышки, хлам и снаряжение. Чем дольше поход — тем опаснее и ценнее. Обратный путь занимает половину времени похода.</p>`;
      if (!ex.length) return h + `<p class="empty-t">Сейчас в Пустоши никого нет.</p>`;
      h += `<div class="list">${ex.map(d => {
        const e = d.ex;
        const last = e.log.length ? e.log[e.log.length - 1].m : '';
        let st, btns;
        if (d.st === 'dead') { st = `<span class="bad-t">Погиб(ла)</span>`; btns = `<button class="btn small primary" data-a="deadOpen" data-id="${d.id}">Воскресить</button>`; }
        else if (e.home) { st = `<span class="good-t">У двери убежища</span>`; btns = `<button class="btn small primary" data-a="collectEx" data-id="${d.id}">Забрать</button>`; }
        else if (e.back >= 0) { st = `Возвращается: ${fmtTime(e.back)}`; btns = S.res.quantum > 0 ? `<button class="btn small q" data-a="exQ" data-id="${d.id}">${svg('quantum')} Сразу</button>` : ''; }
        else { st = `В пути ${fmtTime(e.t)}`; btns = `<button class="btn small" data-a="recall" data-id="${d.id}">Вернуть</button>`; }
        return `<div class="excard">
          <div class="row-sp">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${st}</small>${hpBar(d)}</span>${btns}</div>
          <div class="ex-stats"><span>${svg('caps')}${fmt(e.caps)}</span><span>${svg('gun')}${e.items.length}</span><span>${svg('junk')}${Object.values(e.junk).reduce((a, b) => a + b, 0)}</span><span>${resIco('stim')}${e.stim}</span><span>${resIco('rad')}${e.radw}</span></div>
          <button class="ex-log" data-a="exLog" data-id="${d.id}">«${esc(last)}» <u>Журнал</u></button>
        </div>`;
      }).join('')}</div>`;
      return h;
    },
  };
}
function sendPickView() {
  return {
    key: 'sendPick', title: 'Кого отправить?',
    render() {
      const list = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.preg);
      list.sort((a, b) => (dmgAvg(b) * 5 + b.lvl + stat(b, 2)) - (dmgAvg(a) * 5 + a.lvl + stat(a, 2)));
      if (!list.length) return `<p class="empty-t">Нет свободных взрослых жителей.</p>`;
      return `<p class="muted small">Выносливость снижает урон и радиацию, Удача приносит больше крышек, Восприятие — находки. Оружие и броня решают всё.</p><div class="list">${list.map(d => `<button class="row" data-a="sendCfg" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'}</small>${hpBar(d)}</span><span class="big-stat"><em>ВЫН</em>${stat(d, 2)}</span></button>`).join('')}</div>`;
    },
  };
}
const SENDCFG = { stim: 0, rad: 0 };
function sendCfgView(id) {
  SENDCFG.stim = Math.min(Math.floor(S.res.stim), 3);
  SENDCFG.rad = Math.min(Math.floor(S.res.rad), 2);
  return {
    key: 'sendCfg' + id, alive: () => { const d = D(id); return d && d.st === 'vault'; },
    title: 'Сборы в Пустошь',
    render() {
      const d = D(id);
      return `<div class="row-sp">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'} · ${d.outfit ? esc(itemName(d.outfit)) : 'комбинезон'}</small>${hpBar(d)}</span></div>
      ${spGrid(d)}
      <div class="stepper">${resIco('stim')}<span class="grow">Аптечки <small>на складе ${Math.floor(S.res.stim)}</small></span><button class="btn small" data-a="cfg" data-k="stim" data-v="-1">−</button><b class="mono">${SENDCFG.stim}</b><button class="btn small" data-a="cfg" data-k="stim" data-v="1">+</button></div>
      <div class="stepper">${resIco('rad')}<span class="grow">Антирадин <small>на складе ${Math.floor(S.res.rad)}</small></span><button class="btn small" data-a="cfg" data-k="rad" data-v="-1">−</button><b class="mono">${SENDCFG.rad}</b><button class="btn small" data-a="cfg" data-k="rad" data-v="1">+</button></div>
      ${!d.weapon ? `<div class="banner warn">${svg('alert')}<span>Без оружия в Пустоши очень опасно.</span></div>` : ''}
      <button class="btn primary wide" data-a="send" data-id="${d.id}">${svg('map')} Отправить</button>`;
    },
  };
}
function exLogView(id) {
  return {
    key: 'exlog' + id, live: true, alive: () => { const d = D(id); return d && d.ex; },
    title: () => `Журнал: ${D(id).name}`,
    render() {
      const d = D(id);
      return `<div class="log">${d.ex.log.slice().reverse().map(l => `<p><span class="mono">${fmtTime(l.t)}</span>${esc(l.m)}</p>`).join('')}</div>`;
    },
  };
}

// ===== Задания =====
const QSEL = { q: 0, team: [] };
function questsView() {
  return {
    key: 'quests', live: true, title: 'Задания смотрителя',
    render() {
      if (!hasType('overseer')) return `<p class="empty-t">Постройте Кабинет смотрителя (с 18 жителей).</p>`;
      let h = '';
      if (S.quests.active.length) {
        h += `<h3 class="sub">Отряды</h3><div class="list">`;
        for (const q of S.quests.active) {
          const team = q.team.map(D).filter(Boolean);
          const st = q.stage === 'go' ? `В пути к цели: ${fmtTime(q.left)}` : q.stage === 'back' ? `Возвращаются (${q.ok ? 'успех' : 'провал'}): ${fmtTime(q.left)}` : q.ok ? 'Задание выполнено!' : 'Задание провалено';
          h += `<div class="excard"><div class="row-sp"><span class="grow"><b>${esc(q.n)}</b><small>${st}</small><small>${team.map(d => esc(d.name)).join(', ')}</small></span>${q.stage === 'done' ? `<button class="btn small primary" data-a="questCollect" data-id="${q.id}">Забрать</button>` : S.res.quantum > 0 ? `<button class="btn small q" data-a="questQ" data-id="${q.id}">${svg('quantum')} Ускорить</button>` : ''}</div></div>`;
        }
        h += `</div>`;
      }
      h += `<h3 class="sub">Доступные задания <small class="muted">обновятся через ${fmtTime(S.quests.refresh - S.time)}</small></h3>`;
      if (!S.quests.list.length) h += `<p class="empty-t">Новые задания скоро появятся.</p>`;
      h += `<div class="list">${S.quests.list.map(q => `<div class="quest"><b>${esc(q.n)}</b><p class="muted small">${esc(q.desc)}</p><div class="q-meta"><span>Рек. уровень ${q.lvl}</span><span>${svg('clock')}${fmtTime(q.dur)}</span><span>${svg('caps')}${fmt(q.rw.caps)}</span>${q.rw.item ? `<span style="color:${RAR_COL[Math.min(2, q.rw.item)]}">${RAR[Math.min(2, q.rw.item)]} предмет</span>` : '<span>предмет</span>'}${q.rw.lunch ? `<span>${svg('box')}ящик</span>` : ''}${q.rw.quantum ? `<span>${svg('quantum')}${q.rw.quantum}</span>` : ''}</div><button class="btn small primary" data-a="questPick" data-id="${q.id}">Собрать отряд</button></div>`).join('')}</div>`;
      return h;
    },
  };
}
function questTeamView(qid) {
  QSEL.q = qid; QSEL.team = [];
  return {
    key: 'qteam', live: false, alive: () => S.quests.list.some(q => q.id === qid),
    title: 'Отряд (до 3 жителей)',
    render() {
      const q = S.quests.list.find(x => x.id === qid);
      const list = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.preg);
      list.sort((a, b) => teamPower([b]) - teamPower([a]));
      const team = QSEL.team.map(D).filter(Boolean);
      const ch = team.length ? Math.round(clamp(teamPower(team) / q.diff, 0.1, 0.97) * 100) : 0;
      return `<div class="status col"><div class="row-sp"><b>${esc(q.n)}</b><span class="mono">шанс ${ch}%</span></div>${bar(ch / 100, ch > 70 ? '#7ed957' : ch > 40 ? '#f0b429' : '#ef5b42')}</div>
      <div class="list">${list.map(d => `<button class="row${QSEL.team.includes(d.id) ? ' sel' : ''}" data-a="teamToggle" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'}</small></span><span class="big-stat"><em>СИЛА</em>${Math.round(teamPower([d]))}</span></button>`).join('')}</div>
      <button class="btn primary wide sticky" data-a="questGo" ${team.length ? '' : 'disabled'}>Отправить отряд (${team.length})</button>`;
    },
  };
}

// ===== Мастерская =====
function craftView(roomId) {
  return {
    key: 'craft' + roomId, live: true, alive: () => !!RM(roomId),
    title: () => RM(roomId).t === 'wshop' ? 'Создание оружия' : 'Создание одежды',
    render() {
      const r = RM(roomId);
      const k = ROOMS[r.t].craft;
      const src = k === 'w' ? WEAPONS : OUTFITS;
      const ids = Object.keys(src).sort((a, b) => recipe(k, a).caps - recipe(k, b).caps);
      return `<p class="muted small">Уровень мастерской ${r.l}: доступны ${['обычные', 'обычные и редкие', 'все, включая легендарные'][r.l - 1]} вещи. Скорость зависит от ${STAT_GEN[ROOMS[r.t].st]} работников.</p><div class="list">${ids.map(id => {
        const it = { k, id };
        const rc = recipe(k, id);
        const lockLvl = r.l < rc.lvl;
        const junkOk = Object.keys(rc.junk).every(j => (S.junk[j] || 0) >= rc.junk[j]);
        const ok = !lockLvl && junkOk && S.res.caps >= rc.caps && !r.craft && !r.done;
        return `<div class="recipe${lockLvl ? ' locked' : ''}"><div class="row-sp"><span class="grow"><b style="color:${RAR_COL[rc.rar]}">${esc(itemName(it))}</b><small>${itemDesc(it)} · ${fmtTime(rc.time)}</small></span><button class="btn small primary" data-a="craftStart" data-id="${r.id}" data-k="${k}" data-v="${id}" ${ok ? '' : 'disabled'}>${lockLvl ? `Ур. ${rc.lvl}` : 'Создать'}</button></div>
        <div class="need"><span class="${S.res.caps >= rc.caps ? '' : 'bad-t'}">${svg('caps')}${fmt(rc.caps)}</span>${Object.keys(rc.junk).map(j => `<span class="${(S.junk[j] || 0) >= rc.junk[j] ? '' : 'bad-t'}">${JUNK[j][0]} ×${rc.junk[j]} <small class="muted">(есть ${S.junk[j] || 0})</small></span>`).join('')}</div></div>`;
      }).join('')}</div>`;
    },
  };
}

// ===== Цели и ящики =====
function objView() {
  return {
    key: 'obj', live: true, title: 'Цели',
    render() {
      let h = `<div class="list">${S.objs.map((o, i) => `<div class="obj${o.p >= o.n ? ' done' : ''}"><div class="row-sp"><span class="grow"><b>${esc(o.t)}</b><small>Награда: ${rewardText(o.rw)}</small></span>${o.p >= o.n ? `<button class="btn small primary" data-a="claim" data-i="${i}">Получить</button>` : `<span class="mono">${fmt(o.p)}/${fmt(o.n)}</span>`}</div>${bar(o.p / o.n, o.p >= o.n ? '#7ed957' : '#f0b429')}</div>`).join('')}</div>`;
      const cd = Math.max(0, (S.adT || 0) - S.time);
      h += `<h3 class="sub">Ящики снабжения</h3><div class="lunch-box">
        <div class="lb-art">${svg('box')}<b>×${S.lunch}</b></div>
        <div class="grow"><p class="small muted">4 карты: крышки, ресурсы, оружие, одежда, хлам и даже легендарные жители.</p>
        <div class="btn-row"><button class="btn primary" data-a="lunch" ${S.lunch ? '' : 'disabled'}>Открыть</button>
        <button class="btn q" data-a="adLunch" ${cd > 0 ? 'disabled' : ''}>${svg('ad')} ${cd > 0 ? fmtTime(cd) : 'Ящик за рекламу'}</button></div></div></div>`;
      return h;
    },
  };
}
function showLunchbox() {
  const cards = openLunchbox();
  if (!cards) return;
  Snd.open();
  modal(`<h2 class="lb-title">Ящик снабжения</h2><div class="cards">${cards.map((c, i) => `<div class="card r${c.rar}" style="--d:${i * 0.35}s;--cc:${c.col}"><div class="card-in"><div class="card-back">${svg('box')}</div><div class="card-front"><span class="card-ic">${svg(c.icon)}</span><b>${esc(c.title)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}<em>${RAR[c.rar]}</em></div></div></div>`).join('')}</div><div class="btn-row"><button class="btn primary" data-a="modalClose">Забрать</button>${S.lunch ? `<button class="btn" data-a="lunchAgain">Ещё (${S.lunch})</button>` : ''}</div>`, 'lb');
  cards.forEach((c, i) => setTimeout(() => { if (c.rar >= 1) Snd.level(); else Snd.coin(); }, 350 * i + 300));
}

// ===== Прибывшие =====
function arrivalsView() {
  return {
    key: 'arrivals', live: true, title: 'У двери убежища',
    alive: () => S.arrivals.length > 0,
    render() {
      const full = popCount() >= popCap();
      let h = full ? `<div class="banner warn">${svg('alert')}<span>Мест нет (${popCount()}/${popCap()}). Постройте или улучшите Жилые помещения.</span></div>` : '';
      h += `<p class="muted small">Выжившие просятся внутрь. Впустите их — или прогоните.</p>`;
      h += `<div class="list">${S.arrivals.map(d => `<div class="excard"><div class="row-sp">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>${d.rar ? RAR[d.rar] + ' · ' : ''}Ур. ${d.lvl}${d.weapon ? ' · ' + esc(itemName(d.weapon)) : ''}</small></span><button class="btn small ghost" data-a="reject" data-id="${d.id}">Прогнать</button><button class="btn small primary" data-a="accept" data-id="${d.id}" ${full ? 'disabled' : ''}>Впустить</button></div>${spGrid(d, bestStat(d))}</div>`).join('')}</div>`;
      if (S.arrivals.length > 1) h += `<button class="btn primary wide" data-a="acceptAll" ${full ? 'disabled' : ''}>Впустить всех</button>`;
      return h;
    },
  };
}
function deadListView() {
  return {
    key: 'deadList', live: true, title: 'Погибшие', alive: () => S.dwellers.some(d => d.st === 'dead'),
    render() {
      return `<div class="list">${S.dwellers.filter(d => d.st === 'dead').map(d => `<button class="row dead" data-a="deadOpen" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${esc(locText(d))}</small></span><span class="btn small">Решить</span></button>`).join('')}</div>`;
    },
  };
}

// ===== Меню и справка =====
function menuView() {
  return {
    key: 'menu', title: 'Меню',
    render() {
      return `<div class="actions col">
        <button class="btn primary" data-a="close">Продолжить</button>
        <button class="btn" data-a="sound">${svg(Snd.on ? 'sound' : 'mute')} Звук: ${Snd.on ? 'вкл' : 'выкл'}</button>
        <button class="btn" data-a="saveNow">Сохранить</button>
        <button class="btn" data-a="help">Как играть</button>
        <button class="btn ghost" data-a="toMenu">Главное меню</button>
      </div>
      <p class="muted small center">Убежище ${S.vault} · в игре ${fmtTime(S.time)} · построено комнат: ${S.stats.built} · врагов повержено: ${S.stats.kills} · детей: ${S.stats.babies}</p>`;
    },
  };
}
const HELP_HTML = `
<div class="help">
<h3>Цель</h3><p>Вы — смотритель подземного убежища. Стройте комнаты, принимайте выживших, следите за энергией, едой и водой, растите население и отбивайтесь от угроз.</p>
<h3>Управление</h3><p>Перетаскивайте убежище пальцем, масштабируйте щипком (на ПК — колёсиком). Нажмите на комнату или жителя, чтобы открыть карточку. Значок над комнатой — готовый ресурс: нажмите, чтобы собрать.</p>
<h3>Ресурсы</h3><p><b>Энергия</b> питает комнаты — при нехватке гаснут самые дальние от электростанций. <b>Еда</b> — голодные теряют здоровье. <b>Вода</b> — без неё жители облучаются. <b>Крышки</b> — деньги на стройку и улучшения.</p>
<h3>Характеристики</h3><p>СИЛ — электростанции, ВОС — водоочистка, ВЫН — склад и Пустошь, ХАР — жилые помещения и радио, ИНТ — медпункт и лаборатория, ЛОВ — столовая, УДА — крышки и удачное ускорение. Жители счастливее, когда работают по своей сильной стороне.</p>
<h3>Комнаты</h3><p>Новые комнаты открываются с ростом населения. Две-три одинаковые комнаты одного уровня рядом объединяются. Улучшение повышает выработку и вместимость хранилищ. «Ускорить» даёт ресурсы сразу, но может вызвать пожар или нашествие.</p>
<h3>Жители и дети</h3><p>Мужчина и женщина в Жилых помещениях знакомятся, и через некоторое время появляется ребёнок, который вырастет в нового работника. Новые выжившие приходят к двери и на сигнал Радиостудии. Опыт копится за работу, бои и походы — нажмите на зелёную стрелку, чтобы повысить уровень.</p>
<h3>Снаряжение</h3><p>Оружие увеличивает урон в бою, одежда даёт бонусы к характеристикам. Ищите их в Пустоши, ящиках снабжения, на заданиях или создавайте в мастерских из хлама. Тренировочные комнаты поднимают характеристики до 10.</p>
<h3>Угрозы</h3><p>Пожары, мутанты-вредители, набеги рейдеров, гулей и когтистых тварей. Ставьте вооружённую охрану у двери и укрепляйте её. Раненых лечат аптечки, облучённых — антирадин. Погибших можно воскресить за крышки.</p>
<h3>Пустошь и задания</h3><p>Отправьте хорошо экипированного жителя в Пустошь с аптечками — он принесёт крышки, хлам и снаряжение. Верните его вовремя: обратный путь вдвое короче похода. Кабинет смотрителя открывает задания для отрядов до трёх жителей.</p>
</div>`;
function helpView() { return { key: 'help', title: 'Как играть', render: () => HELP_HTML }; }

// ===== Главное меню =====
function showMainMenu() {
  R.playing = false;
  R.menu = true;
  YA.gameplay(false);
  UI.close();
  closeModal();
  endPlace && R.place && endPlace();
  $('#game-ui').hidden = true;
  const m = $('#menu');
  m.hidden = false;
  const sv = pickSave();
  const cont = $('#m-continue');
  if (sv) {
    cont.hidden = false;
    cont.querySelector('small').textContent = `Убежище ${sv.vault} · жителей: ${sv.dwellers ? sv.dwellers.length : 0}`;
  } else cont.hidden = true;
  $('#m-sound').innerHTML = `${svg(Snd.on ? 'sound' : 'mute')} Звук: ${Snd.on ? 'вкл' : 'выкл'}`;
}
function startPlaying() {
  R.menu = false;
  $('#menu').hidden = true;
  $('#game-ui').hidden = false;
  R.playing = true;
  resize();
  YA.gameplay(true);
  if (!S.cam) centerOn(Cam.vw < 600 ? 90 : 200, SURF + FH * 0.8, Cam.vw < 600 ? 0.85 : 1.3);
  clampCam();
  if (R.offlineReport && R.offlineReport.sec > 60) {
    const o = R.offlineReport;
    modal(`<h2>С возвращением, смотритель!</h2><p>Вас не было ${fmtTime(o.sec)}. Жители продолжали работать.</p><p>${o.caps >= 0 ? 'Заработано' : 'Потрачено'} крышек: <b>${fmt(Math.abs(o.caps))}</b>${o.births > 0 ? ` · новых жителей: <b>${o.births}</b>` : ''}</p><div class="btn-row"><button class="btn primary" data-a="modalClose">К делу</button></div>`);
    R.offlineReport = null;
  }
}
function newGameDialog() {
  const no = String(ri(1, 999)).padStart(3, '0');
  modal(`<h2>Новое убежище</h2><form data-form="newgame"><label for="vault-no">Номер убежища (3 цифры)</label><input id="vault-no" inputmode="numeric" maxlength="3" value="${no}">${hasSave() ? '<p class="warn-t small">Текущее убежище будет заменено.</p>' : ''}<div class="btn-row"><button type="button" class="btn ghost" data-a="modalClose">Отмена</button><button class="btn primary" type="submit">Открыть убежище</button></div></form>`);
}

// ===== Обработчики действий =====
const ACT = {
  close: () => UI.close(),
  back: () => UI.back(),
  modalClose: () => closeModal(),
  confirmYes: () => { const cb = R.confirmCb; R.confirmCb = null; closeModal(); if (cb) cb(); },
  build: () => { endPlace(); UI.open(buildView(), true); },
  dwellers: () => UI.open(dwellersView(), true),
  inventory: () => UI.open(invView(), true),
  waste: () => UI.open(wasteView(), true),
  objectives: () => UI.open(objView(), true),
  menu: () => UI.open(menuView(), true),
  place: ds => startPlace(ds.t),
  cancelPlace: () => endPlace(),
  room: ds => UI.open(roomView(+ds.id)),
  dweller: ds => { R.selD = +ds.id; UI.open(dwellerView(+ds.id)); },
  pick: ds => UI.open(pickerView(+ds.id)),
  assignTo: ds => {
    const d = D(+ds.id);
    if (+ds.r === 0) { unassign(d); UI.back(); return; }
    if (assign(d, RM(+ds.r))) UI.back();
  },
  collect: ds => collectRoom(RM(+ds.id)),
  fill: ds => {
    const r = RM(+ds.id);
    const def = ROOMS[r.t];
    const idle = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.room);
    const sc = d => (def && def.st >= 0 ? stat(d, def.st) : dmgAvg(d));
    idle.sort((a, b) => sc(b) - sc(a));
    for (const d of idle) { if (freeSlots(r) <= 0) break; assign(d, r); }
    Snd.collect();
    UI.render(true);
  },
  rush: ds => { rushRoom(RM(+ds.id)); UI.render(true); },
  upgrade: ds => { upgradeRoom(RM(+ds.id)); UI.render(true); },
  destroy: ds => {
    const r = RM(+ds.id);
    const why = canDestroy(r);
    if (why) { toast(why, 'bad'); return; }
    confirmBox(`Снести «${esc(roomName(r))}»? Крышки не возвращаются.`, 'Снести', () => { if (destroyRoom(r)) UI.close(); }, true);
  },
  lvlup: ds => { levelUp(D(+ds.id)); UI.render(true); },
  lvlall: () => { for (const d of S.dwellers) if (d.lu && d.st === 'vault') levelUp(d); },
  stim: ds => { useStim(D(+ds.id)); UI.render(true); },
  radaway: ds => { useRad(D(+ds.id)); UI.render(true); },
  equipPick: ds => UI.open(equipView(+ds.id, ds.k)),
  equip: ds => {
    const d = D(+ds.id);
    const it = S.inv.find(x => x.u === +ds.u);
    if (!it) return;
    S.inv.splice(S.inv.indexOf(it), 1);
    const slot = it.k === 'w' ? 'weapon' : 'outfit';
    if (d[slot]) S.inv.push(d[slot]);
    d[slot] = it;
    if (d.hp > effMax(d)) d.hp = effMax(d);
    objProg('equip', 1);
    Snd.collect();
    UI.back();
  },
  unequip: ds => {
    const d = D(+ds.id);
    const slot = ds.k === 'w' ? 'weapon' : 'outfit';
    if (d[slot]) { S.inv.push(d[slot]); d[slot] = null; }
    UI.back();
  },
  assignPick: ds => UI.open(assignPickView(+ds.id)),
  sendPick: () => UI.open(sendPickView()),
  sendCfg: ds => UI.open(sendCfgView(+ds.id)),
  cfg: ds => {
    const k = ds.k, v = +ds.v;
    const max = Math.min(25, Math.floor(k === 'stim' ? S.res.stim : S.res.rad));
    SENDCFG[k] = clamp(SENDCFG[k] + v, 0, max);
    UI.render(true);
  },
  send: ds => { if (sendExplore(D(+ds.id), SENDCFG.stim, SENDCFG.rad)) UI.open(wasteView(), true); },
  recall: ds => recallExplorer(D(+ds.id)),
  exQ: ds => { const d = D(+ds.id); if (S.res.quantum < 1 || !d.ex || d.ex.back < 0) return; S.res.quantum--; d.ex.back = 0.01; },
  collectEx: ds => collectExplorer(D(+ds.id)),
  exLog: ds => UI.open(exLogView(+ds.id)),
  deadOpen: ds => UI.open(deadView(+ds.id)),
  deadList: () => UI.open(deadListView(), true),
  revive: ds => { if (revive(D(+ds.id))) UI.back(); },
  reviveAd: ds => YA.rewarded(() => { const d = D(+ds.id); if (d && d.st === 'dead') { revive(d, true); UI.back(); } }),
  bury: ds => {
    const d = D(+ds.id);
    confirmBox(`Похоронить ${esc(fullName(d))}? Снаряжение вернётся на склад.`, 'Похоронить', () => { removeDweller(d); UI.close(); }, true);
  },
  rename: ds => { R.renaming = +ds.id; UI.render(true); const i = $('#rn-name'); if (i) i.focus(); },
  renameCancel: () => { R.renaming = null; UI.render(true); },
  evict: ds => {
    const d = D(+ds.id);
    confirmBox(`Изгнать ${esc(fullName(d))} из убежища навсегда?`, 'Изгнать', () => { removeDweller(d); UI.close(); toast(`${fullName(d)} покинул(а) убежище`); }, true);
  },
  arrivals: () => UI.open(arrivalsView(), true),
  accept: ds => { const d = S.arrivals.find(x => x.id === +ds.id); if (d && acceptArrival(d)) { R.doorOpen = 1.5; UI.render(true); } },
  acceptAll: () => { for (const d of S.arrivals.slice()) if (!acceptArrival(d)) break; R.doorOpen = 1.5; UI.close(); },
  reject: ds => { const d = S.arrivals.find(x => x.id === +ds.id); if (d) rejectArrival(d); UI.render(true); },
  sell: ds => {
    const it = S.inv.find(x => x.u === +ds.u);
    if (!it) return;
    S.inv.splice(S.inv.indexOf(it), 1);
    addCaps(sellPrice(it));
    Snd.coin();
    UI.render(true);
  },
  invTab: ds => { INV_TAB = ds.v; UI.render(true); },
  dwf: ds => { DWF.f = ds.v; UI.render(true); },
  dws: ds => { DWF.s = ds.v; UI.render(true); },
  claim: ds => { claimObjective(+ds.i); UI.render(true); },
  lunch: () => showLunchbox(),
  lunchAgain: () => showLunchbox(),
  adLunch: () => {
    if ((S.adT || 0) > S.time) return;
    YA.rewarded(() => { S.lunch++; S.adT = S.time + 300; toast('Получен ящик снабжения!', 'good'); UI.render(true); });
  },
  quests: () => UI.open(questsView(), true),
  questPick: ds => UI.open(questTeamView(+ds.id)),
  teamToggle: ds => {
    const id = +ds.id;
    const i = QSEL.team.indexOf(id);
    if (i >= 0) QSEL.team.splice(i, 1); else if (QSEL.team.length < 3) QSEL.team.push(id); else toast('В отряде максимум 3 жителя', 'warn');
    UI.render(true);
  },
  questGo: () => {
    const q = S.quests.list.find(x => x.id === QSEL.q);
    if (q && startQuest(q, QSEL.team)) { toast(`Отряд отправился: «${q.n}»`, 'good'); UI.open(questsView(), true); }
  },
  questCollect: ds => { const q = S.quests.active.find(x => x.id === +ds.id); if (q) collectQuest(q); },
  questQ: ds => { const q = S.quests.active.find(x => x.id === +ds.id); if (!q || S.res.quantum < 1) return; S.res.quantum--; q.left = 0.01; },
  craft: ds => UI.open(craftView(+ds.id)),
  craftStart: ds => { const r = RM(+ds.id); if (startCraft(r, ds.k, ds.v)) UI.back(); },
  craftQ: ds => { const r = RM(+ds.id); if (!r.craft || S.res.quantum < 1) return; S.res.quantum--; r.craft.p = 0.999; },
  robot: ds => { const b = S.robots[+ds.i]; b.f = clamp(b.f + +ds.v, 0, maxFloor()); UI.render(true); },
  sound: () => { Snd.on = !Snd.on; try { localStorage.setItem('atom_shelter_sound', Snd.on ? '1' : '0'); } catch (e) {} if (R.menu) showMainMenu(); else UI.render(true); },
  saveNow: () => { saveGame(true); toast('Игра сохранена', 'good'); },
  help: () => { if (R.menu) modal(`<h2>Как играть</h2>${HELP_HTML}<div class="btn-row"><button class="btn primary" data-a="modalClose">Понятно</button></div>`, 'wide'); else UI.open(helpView()); },
  toMenu: () => { saveGame(true); YA.interstitial(); showMainMenu(); },
  tutSkip: () => { S.tutDone = true; },
  incident: () => {
    if (!S.incs.length) return;
    R.incIdx = ((R.incIdx || 0) + 1) % S.incs.length;
    const inc = S.incs[R.incIdx];
    const r = RM(inc.room);
    if (r) { centerOn(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2, Math.max(Cam.z, 1)); R.selRoom = r.id; UI.open(roomView(r.id), true); }
  },
  continue: () => {
    const sv = pickSave();
    if (!sv) return;
    try { loadGame(sv); } catch (e) { toast('Не удалось загрузить сохранение'); return; }
    YA.interstitial();
    startPlaying();
  },
  newgame: () => newGameDialog(),
};

function initUiEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.a];
    if (!fn) return;
    Snd.init();
    Snd.click();
    fn(el.dataset, el);
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.dataset.form;
    if (f === 'newgame') {
      let v = ($('#vault-no').value || '').replace(/\D/g, '').slice(0, 3);
      if (!v) v = String(ri(1, 999));
      v = v.padStart(3, '0');
      closeModal();
      newGame(v);
      YA.interstitial();
      startPlaying();
      saveGame(true);
    } else if (f === 'rename') {
      const d = D(R.renaming);
      const n = $('#rn-name').value.trim(), s = $('#rn-sur').value.trim();
      if (d && n) d.name = n.slice(0, 18);
      if (d && s) d.sur = s.slice(0, 20);
      R.renaming = null;
      UI.render(true);
    }
  });
  const sh = $('#sheet');
  sh.addEventListener('pointerdown', () => { UI.down = true; });
  window.addEventListener('pointerup', () => { UI.down = false; });
  window.addEventListener('pointercancel', () => { UI.down = false; });
}
