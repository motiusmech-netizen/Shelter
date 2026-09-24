// ===== Интерфейс (терминал смотрителя) =====
const $ = s => document.querySelector(s);
const UI = {
  stack: [], down: false, lastHtml: '',
  open(view, reset) {
    if (reset) this.stack = [];
    if (this.stack.length && this.stack[this.stack.length - 1].key === view.key) this.stack.pop();
    this.stack.push(view);
    this.show();
  },
  back() { this.stack.pop(); if (!this.stack.length) this.close(); else this.show(); },
  close() {
    this.stack = [];
    $('#sheet').hidden = true;
    R.selRoom = null; R.selD = null; R.sheetH = 0; R.renaming = null;
  },
  show() {
    const v = this.stack[this.stack.length - 1];
    if (!v) return this.close();
    const sh = $('#sheet');
    const was = sh.hidden;
    sh.hidden = false;
    if (was) { sh.style.animation = 'none'; void sh.offsetWidth; sh.style.animation = ''; }
    $('#sheet-back').hidden = this.stack.length < 2;
    $('#sheet-b').scrollTop = 0;
    this.lastHtml = '';
    this.render(true);
  },
  render(force) {
    const v = this.stack[this.stack.length - 1];
    if (!v) return;
    if (v.alive && !v.alive()) { this.back(); return; }
    const html = v.render();
    $('#sheet-t').textContent = typeof v.title === 'function' ? v.title() : v.title;
    if (!force && html === this.lastHtml) return;
    const b = $('#sheet-b');
    const st = b.scrollTop;
    b.innerHTML = html;
    b.scrollTop = st;
    this.lastHtml = html;
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
  el.innerHTML = `<span class="t-ic">${svg(kind === 'bad' ? 'alert' : kind === 'warn' ? 'alert' : 'star')}</span><span class="t-tx"></span>`;
  el.querySelector('.t-tx').textContent = msg;
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2800);
}
function modal(html, cls) {
  const m = $('#modal');
  if (cls === 'raw') m.innerHTML = html;
  else m.innerHTML = `<div class="term modal-card ${cls || ''}"><div class="term-scr">${html}</div></div>`;
  m.hidden = false;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; m.classList.remove('ev'); }
function confirmBox(text, yes, onYes, danger) {
  R.confirmCb = onYes;
  modal(`<p class="confirm-t">${text}</p><div class="t-row-btns"><button class="t-btn" data-a="modalClose">Отмена</button><button class="t-btn ${danger ? 'danger' : 'pri'}" data-a="confirmYes">${yes}</button></div>`);
}

// ===== Мелкие шаблоны =====
function av(d) {
  return `<span class="ava${d.child ? ' kid' : ''}${d.rar === 2 ? ' leg' : ''}"><img src="${avatarURL(d)}" alt=""></span>`;
}
function locText(d) {
  if (d.st === 'dead') return d.deadIn === 'waste' ? 'Погиб(ла) в Пустоши' : 'Погиб(ла)';
  if (d.st === 'explore') return d.ex && d.ex.home ? 'Вернулся(ась) — у двери' : 'В Пустоши';
  if (d.st === 'quest') return 'На задании';
  if (d.child) return 'Ребёнок · ' + fmtTime(d.child);
  const r = d.room ? RM(d.room) : null;
  if (!r) return 'Без дела';
  return roomName(r) + (r.t === 'door' ? ' (охрана)' : '') + (d.path ? ' · идёт' : '');
}
function hpBar(d) {
  const hp = clamp(d.hp / d.mhp, 0, 1) * 100, rd = clamp(d.rad / d.mhp, 0, 1) * 100;
  return `<span class="hpbar"><i style="width:${hp.toFixed(1)}%"></i><u style="width:${rd.toFixed(1)}%"></u></span>`;
}
function bar(p, col) { return `<span class="bar"${col ? ` style="--bc:${col}"` : ''}><i style="width:${(clamp(p, 0, 1) * 100).toFixed(1)}%"></i></span>`; }
function pips(l) { return `<span class="pips">${[1, 2, 3].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span>`; }
function spList(d, hl) {
  return `<div class="spl">${STAT_NAMES.map((n, i) => {
    const b = statBonus(d, i);
    return `<div class="sp${hl === i ? ' hl' : ''}"><b>${STAT_ABBR[i][0]}</b><span>${n}</span>${bar(Math.min(1, stat(d, i) / 10))}<em>${d.sp[i]}${b ? `<small>+${b}</small>` : ''}</em></div>`;
  }).join('')}</div>`;
}
function rarCls(r) { return r === 2 ? 'r2-t' : r === 1 ? 'r1-t' : ''; }
function rarTag(r) { return `<span class="rar r${r}">${RAR[r]}</span>`; }
function pic(k, c1, c2, g) { return `<span class="p-ic" style="--c:${c1};--c2:${c2};${g ? `--g:${g}` : ''}">${svg(k)}</span>`; }
const RES_GRAD = {
  power: ['#8a5a00', '#ffd84a', 'rgba(255,210,70,.7)', '#fff2a8', '#b88400'],
  food: ['#7a3a10', '#ff9a4a', 'rgba(255,150,70,.6)', '#ffd0a0', '#a84a14'],
  water: ['#0a4a7a', '#5ac8ff', 'rgba(90,200,255,.6)', '#c8f0ff', '#1a6aa8'],
};

// ===== HUD: приборная панель с аналоговыми стрелочными индикаторами =====
const HUDC = {};
const DIAL_ARC = 'M10.14 32A16 16 0 1 1 37.86 32', DIAL_LEN = 67.02;
const RES_LABEL = { power: 'Энергия', food: 'Еда', water: 'Вода' };
function dialSvg(k) {
  let ticks = '';
  for (let i = 0; i <= 8; i++) {
    const a = (-120 + i * 30) * Math.PI / 180, r0 = i % 2 ? 19.2 : 17.6, r1 = 20.6;
    ticks += `M${(24 + Math.sin(a) * r0).toFixed(2)} ${(24 - Math.cos(a) * r0).toFixed(2)}L${(24 + Math.sin(a) * r1).toFixed(2)} ${(24 - Math.cos(a) * r1).toFixed(2)}`;
  }
  return `<svg class="dial" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="23.4" fill="url(#hudRim)"/><circle cx="24" cy="24" r="21.2" fill="#070806"/>
    <circle cx="24" cy="24" r="20.6" fill="url(#hudFace)"/>
    <path d="${ticks}" stroke="rgba(255,236,200,.5)" stroke-width="1" stroke-linecap="round"/>
    <path d="${DIAL_ARC}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="4.2" stroke-linecap="round"/>
    <path class="d-arc" d="${DIAL_ARC}" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${DIAL_LEN}" stroke-dashoffset="${DIAL_LEN}"/>
    <path d="M${10.14} 32A16 16 0 0 1 14.2 16.8" fill="none" stroke="#ff4a3a" stroke-width="1.1" opacity=".75"/>
    <g transform="translate(18.9 26.8) scale(.43)" fill="var(--c)" opacity=".85"><path d="${ICON[RES_ICON[k]]}"/></g>
    <g class="d-needle"><path d="M22.9 25.2 24 6.6l1.1 18.6z" fill="#ff5130"/><path d="M24 6.6l.45 17.8h-.5z" fill="#ffd2c4" opacity=".7"/></g>
    <circle cx="24" cy="24" r="3.3" fill="url(#hudCap)"/><circle cx="24" cy="24" r="1" fill="#2a2c28"/>
    <ellipse cx="19" cy="15" rx="13" ry="7.5" fill="url(#hudGlass)" transform="rotate(-28 19 15)"/>
  </svg>`;
}
function initHud() {
  $('#hud').innerHTML = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <radialGradient id="hudFace" cx="50%" cy="32%" r="72%"><stop offset="0" stop-color="#2e332c"/><stop offset=".72" stop-color="#121510"/><stop offset="1" stop-color="#050605"/></radialGradient>
      <linearGradient id="hudRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe39a"/><stop offset=".42" stop-color="#c4912e"/><stop offset=".58" stop-color="#8e6012"/><stop offset="1" stop-color="#3a2604"/></linearGradient>
      <radialGradient id="hudCap" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#bfc3bd"/><stop offset="1" stop-color="#34362f"/></radialGradient>
      <linearGradient id="hudGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs></svg>
    <div class="hud-bar">
      <button class="chip" data-a="dwellers" aria-label="Жители">${pic('people', '#14532a', '#8dffa4', 'rgba(120,255,150,.35)')}<span class="nix"><b id="h-pop"></b><small id="h-cap"></small></span></button>
      <span class="chip hap">${pic('smile', '#7a4c06', '#ffd966', 'rgba(255,200,70,.3)')}<span class="nix"><b id="h-hap"></b></span></span>
      <span class="plate"><small>УБЕЖИЩЕ</small><span id="h-vault"></span></span>
      <span class="chip">${pic('caps', '#6a5418', '#f2dc8a', 'rgba(240,210,120,.3)')}<span class="nix"><b id="h-caps"></b></span></span>
      <button class="chip" data-a="objectives" aria-label="Атом-кола">${pic('quantum', '#0b4f52', '#6af6e6', 'rgba(90,240,224,.4)')}<span class="nix"><b id="h-q"></b></span></button>
    </div>
    <div class="gauges">
      ${['power', 'food', 'water'].map(k => `<div class="gauge" id="h-${k}" style="--c:${RES_COL[k]}">${dialSvg(k)}<div class="g-val"><b></b><small>${RES_LABEL[k]}</small></div></div>`).join('')}
    </div>`;
  for (const k of ['pop', 'cap', 'hap', 'caps', 'q', 'vault']) HUDC[k] = $('#h-' + k);
  for (const k of ['power', 'food', 'water']) { const el = $('#h-' + k); HUDC[k] = { el, arc: el.querySelector('.d-arc'), nd: el.querySelector('.d-needle'), b: el.querySelector('b'), f: -1 }; }
}
function setText(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
function railBtn(a, cls, icon, label, cnt, extra) {
  return `<button class="rb ${cls}" data-a="${a}" aria-label="${label || ''}"${extra || ''}>${pic(icon)}${cnt ? `<span class="cnt">${cnt}</span>` : ''}${label ? `<span class="lb">${label}</span>` : ''}</button>`;
}
function updateHud() {
  if (!S) return;
  setText(HUDC.pop, String(popCount()));
  setText(HUDC.cap, '/' + popCap());
  const ad = S.dwellers.filter(d => d.st === 'vault' && !d.child);
  const hap = ad.length ? ad.reduce((a, d) => a + d.hap, 0) / ad.length : 0;
  setText(HUDC.hap, `${Math.round(hap)}%`);
  setText(HUDC.caps, fmt(S.res.caps));
  setText(HUDC.q, fmt(S.res.quantum));
  setText(HUDC.vault, S.vault);
  for (const k of ['power', 'food', 'water']) {
    const c = resCap(k), v = S.res[k], h = HUDC[k];
    const f = Math.round(clamp(v / c, 0, 1) * 200) / 200;
    if (f !== h.f) {
      h.f = f;
      h.arc.style.strokeDashoffset = (DIAL_LEN * (1 - f)).toFixed(2);
      h.nd.style.transform = `rotate(${(-120 + 240 * f).toFixed(1)}deg)`;
    }
    setText(h.b, fmt(v));
    h.el.classList.toggle('low', v < c * 0.15);
  }
  const chips = [];
  const ready = S.objs.filter(o => o.p >= o.n).length;
  chips.push(railBtn('objectives', 'obj' + (ready ? ' good' : ''), 'list', 'Цели', ready || ''));
  if (S.incs.length) chips.push(railBtn('incident', 'bad', 'alert', ENEMY[S.incs[0].k].n, S.incs.length > 1 ? S.incs.length : ''));
  if (S.arrivals.length) chips.push(railBtn('arrivals', 'warn' + (S.tut === 0 && !S.tutDone ? ' pulse wide' : ''), 'people', 'Впустить', S.arrivals.length));
  const home = S.dwellers.filter(d => d.st === 'explore' && d.ex && d.ex.home).length;
  if (home) chips.push(railBtn('waste', 'good', 'bag', 'Вернулись', home));
  const qd = S.quests.active.filter(q => q.stage === 'done').length;
  if (qd) chips.push(railBtn('quests', 'good', 'star', 'Отряд', qd));
  const lu = S.dwellers.filter(d => d.lu && d.st === 'vault').length;
  if (lu) chips.push(railBtn('lvlall', 'good', 'up', 'Уровень', lu));
  const dead = S.dwellers.filter(d => d.st === 'dead').length;
  if (dead) chips.push(railBtn('deadList', 'bad', 'skull', 'Погибшие', dead));
  if (S.lunch > 0) chips.push(railBtn('lunch', 'lunch', 'box', 'Ящик', S.lunch));
  if (S.event) { const e = eventDef(); if (e) chips.push(railBtn('eventOpen', 'warn wide pulse', e.icon, 'Сообщение')); }
  if (S.trader) chips.push(railBtn('trader', 'good wide', 'bag', 'Торговец'));
  const html = chips.join('');
  const box = $('#rail');
  if (box._h !== html) { box._h = html; box.innerHTML = html; }
  const tut = $('#tut');
  const buildBtn = $('#bar [data-a="build"]');
  if (!S.tutDone && !R.place) {
    tut.hidden = false;
    setText(tut.querySelector('p'), TUT[S.tut]);
    buildBtn.classList.toggle('pulse', S.tut === 1 || S.tut === 2 || S.tut === 5);
  } else {
    tut.hidden = true;
    buildBtn.classList.remove('pulse');
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
      let h = `<div class="hdr"><div><div class="lvl">Уровень ${r.l} ${pips(r.l)}${r.s > 1 ? ` · ${r.s === 2 ? 'двойная' : 'тройная'}` : ''}</div><p>${def.desc}</p></div>${def.st >= 0 ? `<div class="need"><em>${STAT_ABBR[def.st]}</em><small>${STAT_NAMES[def.st]}</small></div>` : ''}</div>`;
      const syn = synergy(r);
      if (syn.list.length) h += `<div class="syn">${svg('star')}<span>${syn.list.map(x => `<b>${esc(x.name)}</b> +${Math.round(x.v * 100)}%`).join(' · ')}</span></div>`;
      else { const hint = SYNERGY.find(([a, b]) => a === r.t || b === r.t); if (hint) h += `<div class="syn off">${svg('star')}<span>Поставьте рядом «${esc(ROOMS[hint[0] === r.t ? hint[1] : hint[0]].n)}» — бонус +${Math.round(hint[2] * 100)}%</span></div>`; }
      const inc = incAt(r.id);
      if (inc) h += `<div class="banner bad">${svg('alert')}<span><b>${ENEMY[inc.k].n}!</b> ${inc.k === 'fire' ? 'Жители тушат пожар.' : 'Жители сражаются.'} Отправьте сюда сильных и вооружённых.</span></div>`;
      if (r.off) h += `<div class="banner warn">${svg('power')}<span>Нет энергии — комната обесточена. Соберите энергию или постройте Электростанцию.</span></div>`;
      if (def.kind === 'prod') {
        const res = def.res, out = roomOutput(r);
        if (r.rdy) h += `<div class="status"><span>${svg(RES_ICON[res])} Готово: <b>+${r.rdy}</b></span><button class="t-btn pri small" data-a="collect" data-id="${r.id}">Собрать</button></div>`;
        else if (r.w.length) {
          const ct = cycleTime(r);
          h += `<div class="status col"><div class="row-sp"><span>${svg(RES_ICON[res])} +${out} ${res === 'cola' ? 'еды и воды' : RES_NAMES[res].toLowerCase()} за цикл</span><span class="mono">${r.off || inc || ct === Infinity ? 'пауза' : fmtTime((1 - r.p) * ct)}</span></div>${bar(r.p)}</div>`;
        } else h += `<div class="status"><span class="muted">Назначьте жителей, чтобы начать работу.</span></div>`;
      } else if (def.kind === 'living') {
        const cap = Math.round(ROOMS.living.cap[r.l - 1] * r.s * (r.s === 1 ? 1 : r.s === 2 ? 1.05 : 1.1));
        h += `<div class="status col"><span>Вместимость убежища: <b>+${cap}</b> (всего ${popCap()})</span><span class="muted small">Мужчина и женщина здесь знакомятся. Высокая Харизма ускоряет знакомство.</span></div>`;
        if (r.pair) { const m = D(r.pair.m), f = D(r.pair.f); if (m && f) h += `<div class="status">${svg('heart')}<span>${esc(m.name)} и ${esc(f.name)} ${['знакомятся', 'танцуют', 'уединились'][r.pair.ph]}…</span></div>`; }
        if (popCount() + pregnancies() >= popCap()) h += `<div class="banner warn">${svg('alert')}<span>Убежище заполнено — дети не появятся, пока не станет больше мест.</span></div>`;
      } else if (def.kind === 'train') {
        h += `<div class="status col"><span>Тренировка: <b>${STAT_NAMES[def.st]}</b> до 10. Уровень зала ускоряет обучение.</span></div>`;
      } else if (def.kind === 'radio') {
        const ct = cycleTime(r);
        h += `<div class="status col"><div class="row-sp"><span>${svg('radio')} Эфир: привлекает выживших, +счастье</span><span class="mono">${r.w.length && !r.off && ct !== Infinity ? fmtTime((1 - r.p) * ct) : '—'}</span></div>${bar(r.p)}</div>`;
      } else if (def.kind === 'storage') {
        h += `<div class="status"><span>Места для предметов: <b>+${ROOMS.storage.items[r.l - 1] * r.s}</b> · занято ${S.inv.length}/${itemCap()}</span></div>`;
      } else if (def.kind === 'craft') {
        if (r.done) h += `<div class="status"><span>Готово: <b class="${rarCls(itemRar(r.done))}">${esc(itemName(r.done))}</b></span><button class="t-btn pri small" data-a="collect" data-id="${r.id}">Забрать</button></div>`;
        else if (r.craft) { const ss = sumStat(r); h += `<div class="status col"><div class="row-sp"><span>Создаётся: ${esc(itemName(r.craft))}</span><span class="mono">${r.w.length && !r.off && ss ? fmtTime((1 - r.craft.p) * r.craft.T / (0.4 + 0.12 * ss)) : 'пауза'}</span></div>${bar(r.craft.p)}${S.res.quantum > 0 ? `<button class="t-btn q small" data-a="craftQ" data-id="${r.id}">${svg('quantum')} Завершить за 1 Атом-колу</button>` : ''}</div>`; }
        else h += `<div class="status"><span>Мастерская свободна.</span><button class="t-btn pri small" data-a="craft" data-id="${r.id}">Создать предмет</button></div>`;
      } else if (def.kind === 'overseer') {
        h += `<div class="status"><span>Одновременно отрядов: <b>${questSlots()}</b></span><button class="t-btn pri small" data-a="quests">Задания</button></div>`;
      } else if (def.kind === 'barber') {
        h += `<div class="status"><span>Смена причёски и цвета волос — бесплатно.</span><button class="t-btn pri small" data-a="dwellers">Выбрать жителя</button></div>`;
      }
      const cap = roomCap(r);
      if (cap) {
        h += `<h3 class="t-h">Жители ${r.w.length}/${cap}</h3><div class="slots">`;
        for (const d of workersOf(r)) {
          let extra = def.st >= 0 ? `<span class="big"><em>${STAT_ABBR[def.st]}</em>${stat(d, def.st)}</span>` : '';
          if (def.kind === 'train' && d.sp[def.st] < 10) extra += bar(d.tp);
          h += `<button class="slot" data-a="dweller" data-id="${d.id}">${av(d)}<span class="nm">${esc(d.name)}${d.lu ? ` <span class="up">${svg('up')}</span>` : ''}</span>${hpBar(d)}${extra}</button>`;
        }
        for (let i = r.w.length; i < cap; i++) h += `<button class="slot empty" data-a="pick" data-id="${r.id}"><span class="plus">+</span><span class="nm">Назначить</span></button>`;
        h += `</div>`;
        const idle = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.room).length;
        if (idle && r.w.length < cap) h += `<button class="t-btn wide" data-a="fill" data-id="${r.id}">${svg('people')} Лучших без дела (${Math.min(idle, cap - r.w.length)})</button>`;
      }
      const kids = S.dwellers.filter(d => d.child && d.room === r.id);
      if (kids.length) h += `<p class="t-p">Дети: ${kids.map(d => `${esc(d.name)} (${fmtTime(d.child)})`).join(', ')}</p>`;
      h += `<div class="t-row-btns">`;
      if (def.kind === 'prod' || def.kind === 'radio') h += `<button class="t-btn q" data-a="rush" data-id="${r.id}" ${rushable(r) ? '' : 'disabled'}>${svg('clock')}<span>Ускорить<small>риск ${Math.round(rushFail(r) * 100)}%</small></span></button>`;
      if (r.l < 3) h += `<button class="t-btn" data-a="upgrade" data-id="${r.id}" ${S.res.caps < upgradeCost(r) ? 'disabled' : ''}>${svg('up')}<span>Улучшить<small>${fmt(upgradeCost(r))} крышек</small></span></button>`;
      h += `<button class="t-btn danger" data-a="destroy" data-id="${r.id}">Снести</button></div>`;
      if (!def.noMerge && r.s < 3) h += `<p class="t-p muted">Постройте такую же комнату того же уровня рядом — они объединятся (до трёх секций).</p>`;
      return h;
    },
  };
}
function doorHtml(r) {
  let h = `<div class="hdr"><div><div class="lvl">Уровень ${r.l} ${pips(r.l)}</div><p>Первая линия обороны. Охрана с оружием отбивает набеги ещё у двери.</p></div></div>`;
  h += `<div class="status col"><div class="row-sp"><span>Прочность двери</span><span class="mono">${fmt(r.hp)}/${fmt(doorMaxHp(r))}</span></div>${bar(r.hp / doorMaxHp(r))}</div>`;
  const inc = incAt(r.id);
  if (inc) h += `<div class="banner bad">${svg('alert')}<span><b>${ENEMY[inc.k].n}</b> у двери!</span></div>`;
  h += `<h3 class="t-h">Охрана ${r.w.length}/2</h3><div class="slots">`;
  for (const d of workersOf(r)) h += `<button class="slot" data-a="dweller" data-id="${d.id}">${av(d)}<span class="nm">${esc(d.name)}</span>${hpBar(d)}<span class="big"><em>УРОН</em>${d.weapon ? WEAPONS[d.weapon.id][1] + '–' + WEAPONS[d.weapon.id][2] : '1'}</span></button>`;
  for (let i = r.w.length; i < 2; i++) h += `<button class="slot empty" data-a="pick" data-id="${r.id}"><span class="plus">+</span><span class="nm">Охрана</span></button>`;
  h += `</div><div class="t-row-btns">`;
  if (r.l < 3) h += `<button class="t-btn" data-a="upgrade" data-id="${r.id}" ${S.res.caps < upgradeCost(r) ? 'disabled' : ''}>${svg('up')}<span>Укрепить<small>${fmt(upgradeCost(r))} крышек</small></span></button>`;
  if (S.arrivals.length) h += `<button class="t-btn pri" data-a="arrivals">У двери: ${S.arrivals.length}</button>`;
  h += `</div>`;
  const idle = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.room);
  if (idle.length) h += `<p class="t-p muted">Без дела у двери: ${idle.map(d => esc(d.name)).join(', ')} — они тоже встанут на защиту.</p>`;
  return h;
}
function pickerView(roomId) {
  return {
    key: 'pick' + roomId, alive: () => !!RM(roomId), title: 'Выбор жителя',
    render() {
      const r = RM(roomId);
      const def = ROOMS[r.t];
      const si = def ? def.st : -1;
      const list = S.dwellers.filter(d => d.st === 'vault' && !d.child && d.room !== r.id);
      const score = d => (r.t === 'door' ? dmgAvg(d) * 10 + d.lvl : stat(d, si) * 100 + d.lvl);
      list.sort((a, b) => score(b) - score(a));
      if (!list.length) return `<p class="empty-t">Нет свободных жителей. Примите новых у двери или переведите из других комнат.</p>`;
      return `<p class="t-p">${r.t === 'door' ? 'Лучшие охранники — с сильным оружием.' : `Важно: <b>${STAT_NAMES[si]}</b>. По призванию жители работают охотнее.`}</p><div class="list">${list.map(d => {
        const cur = d.room ? roomName(RM(d.room)) : 'Без дела';
        const val = r.t === 'door' ? (d.weapon ? `${WEAPONS[d.weapon.id][1]}–${WEAPONS[d.weapon.id][2]}` : '1') : stat(d, si);
        return `<button class="row" data-a="assignTo" data-id="${d.id}" data-r="${r.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${esc(cur)}</small></span><span class="big"><em>${r.t === 'door' ? 'УРОН' : STAT_ABBR[si]}</em>${val}</span></button>`;
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
        return `<form class="rename" data-form="rename"><label for="rn-name">Имя</label><input id="rn-name" maxlength="18" value="${esc(d.name)}"><label for="rn-sur">Фамилия (мужская форма)</label><input id="rn-sur" maxlength="20" value="${esc(d.sur)}"><div class="t-row-btns"><button type="button" class="t-btn" data-a="renameCancel">Отмена</button><button class="t-btn pri" type="submit">Сохранить</button></div></form>`;
      }
      const need = xpNeed(d.lvl);
      let h = `<div class="dw-head"><canvas class="portrait" id="portrait"></canvas><div class="dw-info">
        <div class="lvl">${d.rar ? rarTag(d.rar) : ''} Уровень ${d.lvl}${d.child ? ' · ребёнок' : ''}</div>
        ${traitChips(d)}
        <div class="kv"><span>Опыт</span>${bar(d.xp / need)}<small class="mono">${fmt(d.xp)}/${fmt(need)}</small></div>
        <div class="kv"><span>Здоровье</span>${hpBar(d)}<small class="mono">${Math.ceil(d.hp)}/${Math.round(maxHp(d))}</small></div>
        <div class="kv"><span>Радиация</span>${bar(d.rad / d.mhp, '#ff5f4a')}<small class="mono">${Math.round(d.rad)}</small></div>
        <div class="kv"><span>Счастье</span>${bar(d.hap / 100, '#ffc24a')}<small class="mono">${Math.round(d.hap)}%</small></div>
        <div class="muted small">${esc(locText(d))}${d.preg ? ` · беременна (${fmtTime(d.preg)})` : ''}</div>
      </div></div>`;
      if (d.lu) h += `<button class="t-btn pri wide" data-a="lvlup" data-id="${d.id}">${svg('up')} Повысить уровень</button>`;
      h += spList(d);
      if (!d.child) {
        h += `<div class="eqs">
          <button class="eq" data-a="equipPick" data-id="${d.id}" data-k="w">${svg('gun')}<span><small>Оружие</small><b class="${d.weapon ? rarCls(itemRar(d.weapon)) : ''}">${d.weapon ? esc(itemName(d.weapon)) : 'Кулаки'}</b><small>${d.weapon ? itemDesc(d.weapon) : 'Урон 1'}</small></span></button>
          <button class="eq" data-a="equipPick" data-id="${d.id}" data-k="o">${svg('shirt')}<span><small>Одежда</small><b class="${d.outfit ? rarCls(itemRar(d.outfit)) : ''}">${d.outfit ? esc(itemName(d.outfit)) : 'Комбинезон убежища'}</b><small>${d.outfit ? itemDesc(d.outfit) : 'Без бонусов'}</small></span></button>
          <button class="eq full" data-a="petPick" data-id="${d.id}">${svg('paw')}<span><small>Питомец</small><b class="${d.pet ? rarCls(d.pet.rar) : ''}">${d.pet ? esc(petName(d.pet)) : 'Нет'}</b><small>${d.pet ? petDesc(d.pet) : S.pets.length ? `Свободных питомцев: ${S.pets.length}` : 'Питомцы попадаются в ящиках снабжения и заданиях'}</small></span></button>
        </div>`;
      }
      if (d.st === 'vault') {
        h += `<div class="t-row-btns">
          <button class="t-btn" data-a="stim" data-id="${d.id}">${svg('stim')}<span>Аптечка<small>есть ${Math.floor(S.res.stim)}</small></span></button>
          <button class="t-btn" data-a="radaway" data-id="${d.id}">${svg('rad')}<span>Антирадин<small>есть ${Math.floor(S.res.rad)}</small></span></button>
        </div>`;
        if (!d.child) h += `<div class="t-row-btns">
          <button class="t-btn" data-a="assignPick" data-id="${d.id}">Перевести</button>
          <button class="t-btn" data-a="sendCfg" data-id="${d.id}">${svg('map')} В Пустошь</button>
        </div>`;
        const tr = d.room ? RM(d.room) : null;
        if (tr && ROOMS[tr.t] && ROOMS[tr.t].kind === 'train' && d.sp[ROOMS[tr.t].st] < 10 && S.res.quantum > 0) h += `<button class="t-btn q wide" data-a="trainQ" data-id="${d.id}">${svg('quantum')} Завершить тренировку за 1 Атом-колу</button>`;
      } else if (d.st === 'explore') {
        h += `<div class="t-row-btns"><button class="t-btn" data-a="waste">Открыть Пустошь</button></div>`;
      } else if (d.st === 'dead') {
        h += `<div class="t-row-btns"><button class="t-btn pri" data-a="deadOpen" data-id="${d.id}">Воскресить…</button></div>`;
      }
      h += `<div class="t-row-btns">${hasType('barber') && !d.child ? `<button class="t-btn" data-a="barber" data-id="${d.id}">${svg('scissors')} Причёска</button>` : ''}<button class="t-btn" data-a="rename" data-id="${d.id}">Имя</button>${d.st === 'vault' ? `<button class="t-btn danger" data-a="evict" data-id="${d.id}">Изгнать</button>` : ''}</div>`;
      const kids = S.dwellers.filter(k => k.par && k.par.includes(d.id));
      const parents = d.par ? d.par.map(D).filter(Boolean) : [];
      if (kids.length || parents.length) h += `<p class="t-p muted">${parents.length ? `Родители: ${parents.map(p => esc(p.name)).join(', ')}. ` : ''}${kids.length ? `Дети: ${kids.map(k => esc(k.name)).join(', ')}.` : ''}</p>`;
      return h;
    },
    after(b) { const c = b.querySelector('#portrait'); if (c) drawPortrait(c, D(id)); },
  };
}
function equipView(id, k) {
  return {
    key: 'eq' + id + k, alive: () => !!D(id), title: k === 'w' ? 'Оружие' : 'Одежда',
    render() {
      const d = D(id);
      const items = S.inv.filter(it => it.k === k);
      const power = it => (k === 'w' ? WEAPONS[it.id][1] + WEAPONS[it.id][2] : OUTFITS[it.id][1].reduce((a, b) => a + b, 0)) + itemRar(it) * 100;
      items.sort((a, b) => power(b) - power(a));
      const cur = k === 'w' ? d.weapon : d.outfit;
      let h = cur ? `<button class="row" data-a="unequip" data-id="${d.id}" data-k="${k}">${svg('x')}<span class="grow"><b>Снять: ${esc(itemName(cur))}</b><small>Вернуть на склад</small></span></button>` : '';
      if (!items.length) return h + `<p class="empty-t">На складе нет ${k === 'w' ? 'оружия' : 'одежды'}. Ищите в Пустоши, ящиках снабжения или создайте в мастерской.</p>`;
      h += `<div class="list">${items.map(it => `<button class="row" data-a="equip" data-id="${d.id}" data-u="${it.u}">${svg(k === 'w' ? 'gun' : 'shirt', 'r' + itemRar(it))}<span class="grow"><b class="${rarCls(itemRar(it))}">${esc(itemName(it))}</b><small>${itemDesc(it)}</small></span></button>`).join('')}</div>`;
      return h;
    },
  };
}
function petPickView(id) {
  return {
    key: 'pet' + id, alive: () => !!D(id), title: 'Питомец',
    render() {
      const d = D(id);
      let h = d.pet ? `<button class="row" data-a="petOff" data-id="${d.id}">${svg('x')}<span class="grow"><b>Отпустить в вольер: ${esc(d.pet.name)}</b><small>${petDesc(d.pet)}</small></span></button>` : '';
      if (!S.pets.length) return h + `<p class="empty-t">Свободных питомцев нет. Их приносят ящики снабжения и задания смотрителя.</p>`;
      h += `<div class="list">${S.pets.map(p => `<button class="row" data-a="petOn" data-id="${d.id}" data-u="${p.u}">${svg('paw', 'r' + p.rar)}<span class="grow"><b class="${rarCls(p.rar)}">${esc(petName(p))}</b><small>${petDesc(p)} — ${PET_BONUS[p.b][1].toLowerCase()}</small></span></button>`).join('')}</div>`;
      return h;
    },
  };
}
function barberView(id) {
  return {
    key: 'barber' + id, alive: () => !!D(id), title: 'Парикмахерская', live: false,
    render() {
      const d = D(id);
      const styles = d.g === 'm' ? HAIR_M : HAIR_F;
      let h = `<div class="dw-head"><canvas class="portrait" id="portrait"></canvas><div class="dw-info"><div class="lvl">${esc(fullName(d))}</div><p class="t-p">Выберите стиль и цвет — изменения бесплатны.</p></div></div>`;
      h += `<h3 class="t-h">Причёска</h3><div class="opts">${styles.map(s => `<button class="t-btn small${d.look.hs2 === s ? ' on' : ''}" data-a="setLook" data-id="${d.id}" data-k="hs2" data-v="${s}">${HAIR_NAMES[s]}</button>`).join('')}</div>`;
      h += `<h3 class="t-h">Цвет волос</h3><div class="swatches">${HAIRS.map(c => `<button class="sw${d.look.hair === c ? ' on' : ''}" style="--c:${c}" data-a="setLook" data-id="${d.id}" data-k="hair" data-v="${c}" aria-label="Цвет"></button>`).join('')}</div>`;
      if (d.g === 'm') h += `<h3 class="t-h">Борода</h3><div class="opts">${Object.keys(BEARDS).map(b => `<button class="t-btn small${(d.look.beard || 'none') === b ? ' on' : ''}" data-a="setLook" data-id="${d.id}" data-k="beard" data-v="${b}">${BEARDS[b]}</button>`).join('')}</div>`;
      h += `<h3 class="t-h">Тон кожи</h3><div class="swatches">${SKINS.map(c => `<button class="sw${d.look.skin === c ? ' on' : ''}" style="--c:${c}" data-a="setLook" data-id="${d.id}" data-k="skin" data-v="${c}" aria-label="Тон"></button>`).join('')}</div>`;
      return h;
    },
    after(b) { const c = b.querySelector('#portrait'); if (c) drawPortrait(c, D(id)); },
  };
}
function assignPickView(id) {
  return {
    key: 'ap' + id, alive: () => !!D(id), title: 'Куда перевести?',
    render() {
      const d = D(id);
      const rooms = S.rooms.filter(r => roomCap(r) > 0 && r.id !== d.room);
      const sc = r => { const def = ROOMS[r.t]; return def && def.st >= 0 ? stat(d, def.st) : 0; };
      rooms.sort((a, b) => sc(b) - sc(a));
      return `<div class="list">${rooms.map(r => {
        const def = ROOMS[r.t];
        const full = freeSlots(r) <= 0;
        return `<button class="row" data-a="assignTo" data-id="${d.id}" data-r="${r.id}" ${full ? 'disabled' : ''}><span class="grow"><b>${esc(roomName(r))}</b><small>Этаж ${r.f + 1} · ${r.w.length}/${roomCap(r)}${full ? ' · мест нет' : ''}</small></span>${def && def.st >= 0 ? `<span class="big"><em>${STAT_ABBR[def.st]}</em>${stat(d, def.st)}</span>` : ''}</button>`;
      }).join('')}<button class="row" data-a="assignTo" data-id="${d.id}" data-r="0"><span class="grow"><b>Снять с работы</b><small>Житель пойдёт к двери</small></span></button></div>`;
    },
  };
}
function deadView(id) {
  return {
    key: 'dead' + id, alive: () => !!D(id) && D(id).st === 'dead', title: 'Житель погиб',
    render() {
      const d = D(id);
      return `<div class="center-block">${svg('skull', 'huge')}<h3>${esc(fullName(d))}</h3><p class="t-p muted">Уровень ${d.lvl}. ${d.deadIn === 'waste' ? 'Погиб(ла) в Пустоши.' : 'Погиб(ла) в убежище.'}</p></div>
      <div class="t-row-btns col">
        <button class="t-btn pri" data-a="revive" data-id="${d.id}" ${S.res.caps < reviveCost(d) ? 'disabled' : ''}>Воскресить за ${fmt(reviveCost(d))} крышек</button>
        <button class="t-btn q" data-a="reviveAd" data-id="${d.id}">${svg('ad')} Воскресить за рекламу</button>
        <button class="t-btn danger" data-a="bury" data-id="${d.id}">Похоронить</button>
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
      list.sort((a, b) => DWF.s === 'lvl' ? b.lvl - a.lvl : DWF.s === 'hap' ? b.hap - a.hap : stat(b, si) - stat(a, si));
      const lu = S.dwellers.filter(d => d.lu && d.st === 'vault').length;
      let h = `<div class="seg">${[['all', 'Все'], ['idle', 'Без дела'], ['hurt', 'Раненые'], ['out', 'Снаружи'], ['lvl', 'Ур.↑']].map(([k, n]) => `<button class="${DWF.f === k ? 'on' : ''}" data-a="dwf" data-v="${k}">${n}</button>`).join('')}</div>`;
      h += `<div class="seg small">${[['lvl', 'Ур.'], ...STAT_ABBR.map(a => [a, a]), ['hap', '☺']].map(([k, n]) => `<button class="${DWF.s === k ? 'on' : ''}" data-a="dws" data-v="${k}">${n}</button>`).join('')}</div>`;
      if (lu) h += `<button class="t-btn pri wide" data-a="lvlall">${svg('up')} Повысить уровень всем (${lu})</button>`;
      if (!list.length) return h + `<p class="empty-t">Никого нет.</p>`;
      h += `<div class="list">${list.map(d => {
        const val = si >= 0 ? `<span class="big"><em>${STAT_ABBR[si]}</em>${stat(d, si)}</span>` : DWF.s === 'hap' ? `<span class="big"><em>СЧАСТ.</em>${Math.round(d.hap)}</span>` : `<span class="big"><em>УР.</em>${d.lvl}</span>`;
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
      const cards = ['elev', ...BUILD_ORDER].map(t => {
        const isE = t === 'elev';
        const def = isE ? null : ROOMS[t];
        const lock = !unlocked(t);
        const built = !isE && def.unique && hasType(t);
        const cost = buildCost(t);
        const poor = S.res.caps < cost;
        return `<button class="bcard${lock ? ' locked' : ''}" data-a="place" data-t="${t}" ${lock || built ? 'disabled' : ''}>
          <canvas data-room="${t}"></canvas>${!isE && def.st >= 0 ? `<span class="st">${STAT_ABBR[def.st]}</span>` : ''}
          <b>${isE ? 'Лифт' : def.n}</b>
          <small>${lock ? `${svg('people')} с ${def.pop} жителей` : built ? 'Уже построено' : `<span class="${poor ? 'bad-t' : ''}">${svg('caps')} ${fmt(cost)}</span>`}</small>
        </button>`;
      }).join('');
      return `<p class="t-p">Комнаты ставятся рядом с другими комнатами или лифтом. Одинаковые комнаты рядом сливаются в большую. Жителей: ${popCount()}.</p><div class="bgrid">${cards}</div>`;
    },
    after(b) {
      b.querySelectorAll('canvas[data-room]').forEach(c => {
        const t = c.dataset.room;
        const a = t === 'elev' ? artFor({ t: 'elev' }) : artFor({ t, s: 1, l: 1 });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = c.clientWidth || 100, h = c.clientHeight || 64;
        c.width = w * dpr; c.height = h * dpr;
        const g = c.getContext('2d');
        g.fillStyle = '#120e0a'; g.fillRect(0, 0, c.width, c.height);
        const sw = a.W * a.k, sh = a.H * a.k, sx = a.pad * a.k, sy = a.pad * a.k;
        if (t === 'elev') g.drawImage(a.cv, sx, sy, sw, sh, c.width / 2 - (c.height * a.W / a.H) / 2, 0, c.height * a.W / a.H, c.height);
        else g.drawImage(a.cv, sx, sy, sw, sh, 0, 0, c.width, c.height);
      });
    },
  };
}

// ===== Вид: склад =====
let INV_TAB = 'w';
function invView() {
  return {
    key: 'inv', live: true, title: () => `Склад ${S.inv.length}/${itemCap()}`,
    render() {
      let h = `<div class="seg">${[['w', 'Оружие'], ['o', 'Одежда'], ['p', 'Питомцы'], ['j', 'Хлам'], ['x', 'Припасы']].map(([k, n]) => `<button class="${INV_TAB === k ? 'on' : ''}" data-a="invTab" data-v="${k}">${n}</button>`).join('')}</div>`;
      if (INV_TAB === 'w' || INV_TAB === 'o') {
        const items = S.inv.filter(it => it.k === INV_TAB).sort((a, b) => itemRar(b) - itemRar(a));
        const worn = S.dwellers.filter(d => (INV_TAB === 'w' ? d.weapon : d.outfit)).length;
        h += `<p class="t-p">На складе: ${items.length}. Экипировано: ${worn}. Экипировка — в карточке жителя. Ненужное можно продать или разобрать на хлам.</p>`;
        if (!items.length) h += `<p class="empty-t">Пусто.</p>`;
        h += `<div class="list">${items.map(it => `<div class="row">${svg(it.k === 'w' ? 'gun' : 'shirt', 'r' + itemRar(it))}<span class="grow"><b class="${rarCls(itemRar(it))}">${esc(itemName(it))}</b><small>${itemDesc(it)} · ${RAR[itemRar(it)]}</small></span><button class="t-btn small" data-a="scrap" data-u="${it.u}">${svg('wrench')}</button><button class="t-btn small" data-a="sell" data-u="${it.u}">${sellPrice(it)}</button></div>`).join('')}</div>`;
      } else if (INV_TAB === 'p') {
        const withPet = S.dwellers.filter(d => d.pet);
        h += `<p class="t-p">Питомец ходит за хозяином и даёт бонус. Назначить — в карточке жителя.</p>`;
        if (!S.pets.length && !withPet.length) h += `<p class="empty-t">Питомцев пока нет.</p>`;
        h += `<div class="list">${S.pets.map(p => `<div class="row">${svg('paw', 'r' + p.rar)}<span class="grow"><b class="${rarCls(p.rar)}">${esc(petName(p))}</b><small>${petDesc(p)} · в вольере</small></span></div>`).join('')}
        ${withPet.map(d => `<button class="row" data-a="dweller" data-id="${d.id}">${svg('paw', 'r' + d.pet.rar)}<span class="grow"><b class="${rarCls(d.pet.rar)}">${esc(petName(d.pet))}</b><small>${petDesc(d.pet)} · с жителем ${esc(d.name)}</small></span></button>`).join('')}</div>`;
      } else if (INV_TAB === 'j') {
        const ks = Object.keys(JUNK).filter(j => S.junk[j] > 0);
        h += `<p class="t-p">Хлам нужен для создания предметов. Его приносят из Пустоши или получают, разбирая снаряжение.</p>`;
        if (!ks.length) h += `<p class="empty-t">Хлама нет.</p>`;
        h += `<div class="junk">${ks.map(j => `<span class="jk">${svg('junk', 'r' + Math.min(2, JUNK[j][1]))}<b>${JUNK[j][0]}</b><em>×${S.junk[j]}</em></span>`).join('')}</div>`;
      } else {
        h += `<div class="list">
          <div class="row">${svg('stim')}<span class="grow"><b>Аптечки</b><small>Лечат 45% здоровья</small></span><b class="mono">${Math.floor(S.res.stim)}/${resCap('stim')}</b></div>
          <div class="row">${svg('rad')}<span class="grow"><b>Антирадин</b><small>Снимает облучение</small></span><b class="mono">${Math.floor(S.res.rad)}/${resCap('rad')}</b></div>
          <div class="row">${svg('quantum')}<span class="grow"><b>Атом-кола</b><small>Мгновенно завершает походы, тренировки и создание</small></span><b class="mono">${S.res.quantum}</b></div>
          <div class="row">${svg('box')}<span class="grow"><b>Ящики снабжения</b><small>4 карты с наградами</small></span><button class="t-btn small pri" data-a="lunch" ${S.lunch ? '' : 'disabled'}>Открыть (${S.lunch})</button></div>
        </div>`;
        if (S.robots.length) h += `<h3 class="t-h">Роботы-помощники</h3><div class="list">${S.robots.map((b, i) => `<div class="row">${svg('robot')}<span class="grow"><b>Робот №${i + 1}</b><small>Собирает ресурсы на этаже ${b.f + 1}</small></span><button class="t-btn small" data-a="robot" data-i="${i}" data-v="-1">▲</button><button class="t-btn small" data-a="robot" data-i="${i}" data-v="1">▼</button></div>`).join('')}</div>`;
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
      let h = `<div class="t-row-btns"><button class="t-btn pri" data-a="sendPick">${svg('map')} Отправить жителя</button>${hasType('overseer') ? `<button class="t-btn" data-a="quests">${svg('star')} Задания</button>` : ''}</div>`;
      h += `<p class="t-p">Исследователь приносит крышки, хлам и снаряжение. Чем дольше поход — тем опаснее и ценнее. Обратный путь занимает половину времени похода.</p>`;
      if (!ex.length) return h + `<p class="empty-t">Сейчас в Пустоши никого нет.</p>`;
      h += ex.map(d => {
        const e = d.ex;
        const last = e.log.length ? e.log[e.log.length - 1].m : '';
        let st, btns;
        if (d.st === 'dead') { st = `<span class="bad-t">Погиб(ла)</span>`; btns = `<button class="t-btn small pri" data-a="deadOpen" data-id="${d.id}">Воскресить</button>`; }
        else if (e.home) { st = `<span class="good-t">У двери убежища</span>`; btns = `<button class="t-btn small pri" data-a="collectEx" data-id="${d.id}">Забрать</button>`; }
        else if (e.back >= 0) { st = `Возвращается: ${fmtTime(e.back)}`; btns = S.res.quantum > 0 ? `<button class="t-btn small q" data-a="exQ" data-id="${d.id}">${svg('quantum')} Сразу</button>` : ''; }
        else { st = `В пути ${fmtTime(e.t)}`; btns = `<button class="t-btn small" data-a="recall" data-id="${d.id}">Вернуть</button>`; }
        return `<div class="card">
          <div class="row-sp">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${st}</small>${hpBar(d)}</span>${btns}</div>
          <div class="ex-stats"><span>${svg('caps')}${fmt(e.caps)}</span><span>${svg('gun')}${e.items.length}/${packCap(d)}</span><span>${svg('junk')}${Object.values(e.junk).reduce((a, b) => a + b, 0)}</span><span>${svg('stim')}${e.stim}</span><span>${svg('rad')}${e.radw}</span></div>
          <button class="ex-log" data-a="exLog" data-id="${d.id}">«${esc(last)}» <u>Журнал</u></button>
        </div>`;
      }).join('');
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
      return `<p class="t-p">Выносливость снижает урон и радиацию, Удача приносит крышки, Восприятие — находки, Сила — место в рюкзаке.</p><div class="list">${list.map(d => `<button class="row" data-a="sendCfg" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'}</small>${hpBar(d)}</span><span class="big"><em>ВЫН</em>${stat(d, 2)}</span></button>`).join('')}</div>`;
    },
  };
}
const SENDCFG = { stim: 0, rad: 0 };
function sendCfgView(id) {
  SENDCFG.stim = Math.min(Math.floor(S.res.stim), 3);
  SENDCFG.rad = Math.min(Math.floor(S.res.rad), 2);
  return {
    key: 'sendCfg' + id, alive: () => { const d = D(id); return d && d.st === 'vault'; }, title: 'Сборы в Пустошь',
    render() {
      const d = D(id);
      return `<div class="row-sp">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'} · рюкзак на ${packCap(d)}</small>${hpBar(d)}</span></div>
      ${spList(d)}
      <h3 class="t-h">Припасы</h3>
      <div class="stepper">${svg('stim')}<span class="grow">Аптечки <small>на складе ${Math.floor(S.res.stim)}</small></span><button class="t-btn small" data-a="cfg" data-k="stim" data-v="-1">−</button><b>${SENDCFG.stim}</b><button class="t-btn small" data-a="cfg" data-k="stim" data-v="1">+</button></div>
      <div class="stepper">${svg('rad')}<span class="grow">Антирадин <small>на складе ${Math.floor(S.res.rad)}</small></span><button class="t-btn small" data-a="cfg" data-k="rad" data-v="-1">−</button><b>${SENDCFG.rad}</b><button class="t-btn small" data-a="cfg" data-k="rad" data-v="1">+</button></div>
      ${!d.weapon ? `<div class="banner warn">${svg('alert')}<span>Без оружия в Пустоши очень опасно.</span></div>` : ''}
      <button class="t-btn pri wide" data-a="send" data-id="${d.id}">${svg('map')} Отправить</button>`;
    },
  };
}
function exLogView(id) {
  return {
    key: 'exlog' + id, live: true, alive: () => { const d = D(id); return d && d.ex; },
    title: () => `Журнал: ${D(id).name}`,
    render() { const d = D(id); return `<div class="log">${d.ex.log.slice().reverse().map(l => `<p><span class="mono">${fmtTime(l.t)}</span>${esc(l.m)}</p>`).join('')}</div>`; },
  };
}

// ===== Задания =====
const QSEL = { q: 0, team: [] };
function questMap() {
  const all = S.quests.list.map(q => [q, false]).concat(S.quests.active.map(q => [q, true]));
  const hx = 50, hy = 50;
  return `<div class="qmap"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${all.map(([q]) => `<line x1="${hx}" y1="${hy}" x2="${q.mx * 90 + 5}" y2="${q.my * 80 + 10}" stroke="rgba(157,255,178,.25)" stroke-width=".6" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>`).join('')}</svg><span class="home" style="left:${hx}%;top:${hy}%"></span>${all.map(([q, act]) => `<span class="mk${act ? ' act' : ''}" style="left:${q.mx * 90 + 5}%;top:${q.my * 80 + 10}%"><span>${esc(q.n)}</span></span>`).join('')}</div>`;
}
function questsView() {
  return {
    key: 'quests', live: true, title: 'Задания смотрителя',
    render() {
      if (!hasType('overseer')) return `<p class="empty-t">Постройте Кабинет смотрителя (с 18 жителей).</p>`;
      let h = questMap();
      h += `<p class="t-p">Отрядов одновременно: <b>${questsRunning()}/${questSlots()}</b>. Улучшайте Кабинет, чтобы отправлять больше.</p>`;
      if (S.quests.active.length) {
        h += `<h3 class="t-h">Отряды</h3>`;
        for (const q of S.quests.active) {
          const team = q.team.map(D).filter(Boolean);
          const st = q.stage === 'go' ? `В пути к цели: ${fmtTime(q.left)}` : q.stage === 'back' ? `Возвращаются (${q.ok ? 'успех' : 'провал'}): ${fmtTime(q.left)}` : q.ok ? 'Задание выполнено!' : 'Задание провалено';
          h += `<div class="card"><div class="row-sp"><span class="grow"><b>${esc(q.n)}</b><small>${st}</small><small>${team.map(d => esc(d.name)).join(', ')}</small></span>${q.stage === 'done' ? `<button class="t-btn small pri" data-a="questCollect" data-id="${q.id}">Забрать</button>` : S.res.quantum > 0 ? `<button class="t-btn small q" data-a="questQ" data-id="${q.id}">${svg('quantum')}</button>` : ''}</div></div>`;
        }
      }
      h += `<h3 class="t-h">Доступно <small>обновятся через ${fmtTime(S.quests.refresh - S.time)}</small></h3>`;
      if (!S.quests.list.length) h += `<p class="empty-t">Новые задания скоро появятся.</p>`;
      h += S.quests.list.map(q => `<div class="card"><div class="grow"><b>${esc(q.n)}</b></div><p class="t-p">${esc(q.desc)}</p><div class="q-meta"><span>Рек. ур. ${q.lvl}</span><span>${svg('clock')}${fmtTime(q.dur)}</span><span>${svg('caps')}${fmt(q.rw.caps)}</span><span class="${rarCls(Math.min(2, q.rw.item))}">${RAR[Math.min(2, q.rw.item)]} предмет</span>${q.rw.lunch ? `<span>${svg('box')}ящик</span>` : ''}${q.rw.quantum ? `<span>${svg('quantum')}${q.rw.quantum}</span>` : ''}${q.rw.pet ? `<span>${svg('paw')}питомец</span>` : ''}</div><button class="t-btn small pri" data-a="questPick" data-id="${q.id}" ${questsRunning() >= questSlots() ? 'disabled' : ''}>Собрать отряд</button></div>`).join('');
      return h;
    },
  };
}
function questTeamView(qid) {
  QSEL.q = qid; QSEL.team = [];
  return {
    key: 'qteam', alive: () => S.quests.list.some(q => q.id === qid), title: 'Отряд (до 3)',
    render() {
      const q = S.quests.list.find(x => x.id === qid);
      const list = S.dwellers.filter(d => d.st === 'vault' && !d.child && !d.preg);
      list.sort((a, b) => teamPower([b]) - teamPower([a]));
      const team = QSEL.team.map(D).filter(Boolean);
      const ch = team.length ? Math.round(clamp(teamPower(team) / q.diff, 0.1, 0.97) * 100) : 0;
      return `<div class="status col"><div class="row-sp"><b>${esc(q.n)}</b><span class="mono">шанс ${ch}%</span></div>${bar(ch / 100, ch > 70 ? '#9dffb2' : ch > 40 ? '#ffc24a' : '#ff5f4a')}</div>
      <div class="list">${list.map(d => `<button class="row${QSEL.team.includes(d.id) ? ' sel' : ''}" data-a="teamToggle" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${d.weapon ? esc(itemName(d.weapon)) : 'без оружия'}</small></span><span class="big"><em>МОЩЬ</em>${Math.round(teamPower([d]))}</span></button>`).join('')}</div>
      <button class="t-btn pri wide sticky" data-a="questGo" ${team.length ? '' : 'disabled'}>Отправить отряд (${team.length})</button>`;
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
      return `<p class="t-p">Мастерская ${r.l} ур.: ${['обычные', 'обычные и редкие', 'все, включая легендарные'][r.l - 1]} вещи. Скорость зависит от ${STAT_GEN[ROOMS[r.t].st]} работников.</p>${ids.map(id => {
        const it = { k, id };
        const rc = recipe(k, id);
        const lockLvl = r.l < rc.lvl;
        const junkOk = Object.keys(rc.junk).every(j => (S.junk[j] || 0) >= rc.junk[j]);
        const ok = !lockLvl && junkOk && S.res.caps >= rc.caps && !r.craft && !r.done;
        return `<div class="card recipe${lockLvl ? ' locked' : ''}"><div class="row-sp"><span class="grow"><b class="${rarCls(rc.rar)}">${esc(itemName(it))}</b><small>${itemDesc(it)} · ${fmtTime(rc.time)}</small></span><button class="t-btn small pri" data-a="craftStart" data-id="${r.id}" data-k="${k}" data-v="${id}" ${ok ? '' : 'disabled'}>${lockLvl ? `Ур. ${rc.lvl}` : 'Создать'}</button></div>
        <div class="reqs"><span class="${S.res.caps >= rc.caps ? '' : 'bad-t'}">${svg('caps')}${fmt(rc.caps)}</span>${Object.keys(rc.junk).map(j => `<span class="${(S.junk[j] || 0) >= rc.junk[j] ? '' : 'bad-t'}">${JUNK[j][0]} ×${rc.junk[j]} (${S.junk[j] || 0})</span>`).join('')}</div></div>`;
      }).join('')}`;
    },
  };
}

// ===== Цели и ящики =====
function objView() {
  return {
    key: 'obj', live: true, title: 'Цели',
    render() {
      let h = S.objs.map((o, i) => `<div class="card obj${o.p >= o.n ? ' done' : ''}"><div class="row-sp"><span class="grow"><b>${esc(o.t)}</b><small>Награда: ${rewardText(o.rw)}</small></span>${o.p >= o.n ? `<button class="t-btn small pri" data-a="claim" data-i="${i}">Получить</button>` : `<span class="mono">${fmt(o.p)}/${fmt(o.n)}</span>`}</div>${bar(o.p / o.n)}</div>`).join('');
      const cd = Math.max(0, (S.adT || 0) - S.time);
      h += `<h3 class="t-h">Ящики снабжения</h3><div class="lunch-box">${svg('box')}<div class="grow"><b>В наличии: ${S.lunch}</b><small>Крышки, ресурсы, снаряжение, питомцы и даже легендарные жители.</small>
        <div class="t-row-btns"><button class="t-btn pri" data-a="lunch" ${S.lunch ? '' : 'disabled'}>Открыть</button>
        <button class="t-btn q" data-a="adLunch" ${cd > 0 ? 'disabled' : ''}>${svg('ad')} ${cd > 0 ? fmtTime(cd) : 'За рекламу'}</button></div></div></div>`;
      return h;
    },
  };
}
function showLunchbox() {
  const cards = openLunchbox();
  if (!cards) return;
  Snd.open();
  const html = `<div class="lb-modal"><div class="lb-title">Ящик снабжения</div><div class="lunchbox"><div class="handle"></div><div class="body"></div><div class="lid"></div></div>
  <div class="cards">${cards.map((c, i) => `<div class="card3 r${c.rar}" style="--cc:${c.rar === 2 ? '#e0a01a' : c.rar === 1 ? '#3a8ad8' : '#7a7466'}"><div class="card-in" style="--d:${1.1 + i * 0.3}s"><div class="card-back"></div><div class="card-front"><span class="band">${RAR[c.rar]}</span><span class="art" style="--cc:${c.col}">${svg(c.icon)}</span><b>${esc(c.title)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</div></div></div>`).join('')}</div>
  <div class="lb-btns"><button class="t-btn pri" data-a="modalClose">Забрать</button>${S.lunch ? `<button class="t-btn" data-a="lunchAgain">Ещё (${S.lunch})</button>` : ''}</div></div>`;
  modal(html, 'raw');
  cards.forEach((c, i) => setTimeout(() => { if (c.rar >= 1) Snd.level(); else Snd.coin(); }, 1100 + 300 * i + 300));
}

// ===== Прибывшие и погибшие =====
function arrivalsView() {
  return {
    key: 'arrivals', live: true, title: 'У двери убежища', alive: () => S.arrivals.length > 0,
    render() {
      const full = popCount() >= popCap();
      let h = full ? `<div class="banner warn">${svg('alert')}<span>Мест нет (${popCount()}/${popCap()}). Постройте или улучшите Жилые помещения.</span></div>` : '';
      h += `<p class="t-p">Выжившие просятся внутрь. Впустите — или прогоните.</p>`;
      h += S.arrivals.map(d => `<div class="card"><div class="row-sp">${av(d)}<span class="grow"><b class="${rarCls(d.rar)}">${esc(fullName(d))}</b><small>${d.rar ? RAR[d.rar] + ' · ' : ''}Ур. ${d.lvl}${d.weapon ? ' · ' + esc(itemName(d.weapon)) : ''}</small>${traitChips(d, true)}</span></div>${spList(d, bestStat(d))}<div class="t-row-btns"><button class="t-btn small danger" data-a="reject" data-id="${d.id}">Прогнать</button><button class="t-btn small pri" data-a="accept" data-id="${d.id}" ${full ? 'disabled' : ''}>Впустить</button></div></div>`).join('');
      if (S.arrivals.length > 1) h += `<button class="t-btn pri wide" data-a="acceptAll" ${full ? 'disabled' : ''}>Впустить всех</button>`;
      return h;
    },
  };
}
function deadListView() {
  return {
    key: 'deadList', live: true, title: 'Погибшие', alive: () => S.dwellers.some(d => d.st === 'dead'),
    render() { return `<div class="list">${S.dwellers.filter(d => d.st === 'dead').map(d => `<button class="row dead" data-a="deadOpen" data-id="${d.id}">${av(d)}<span class="grow"><b>${esc(fullName(d))}</b><small>Ур. ${d.lvl} · ${esc(locText(d))}</small></span></button>`).join('')}</div>`; },
  };
}

// ===== Меню и справка =====
const TOD_NAMES = { auto: 'Как на часах', day: 'День', dusk: 'Закат', night: 'Ночь' };
function menuView() {
  return {
    key: 'menu', title: 'Пип-бой',
    render() {
      return `<div class="t-row-btns col">
        <button class="t-btn pri" data-a="close">Продолжить</button>
        <button class="t-btn" data-a="research">${svg('robot')} Исследования${S.research && S.research.cur ? ` <small>· идёт: ${esc(RESEARCH[S.research.cur][0])}</small>` : ''}</button>
        <button class="t-btn" data-a="objectives">${svg('list')} Цели и ящики</button>
        <button class="t-btn" data-a="sound">${svg(Snd.on ? 'sound' : 'mute')} Звук: ${Snd.on ? 'вкл' : 'выкл'}</button>
        <button class="t-btn" data-a="saveNow">Сохранить</button>
        <button class="t-btn" data-a="help">Как играть</button>
        <button class="t-btn danger" data-a="toMenu">Главное меню</button>
      </div>
      <h3 class="t-h">Время суток на поверхности</h3>
      <div class="opts">${Object.keys(TOD_NAMES).map(k => `<button class="t-btn small${S.todMode === k ? ' on' : ''}" data-a="tod" data-v="${k}">${TOD_NAMES[k]}</button>`).join('')}</div>
      <p class="t-p muted center">Убежище ${S.vault} · в игре ${fmtTime(S.time)} · комнат построено: ${S.stats.built} · врагов повержено: ${S.stats.kills} · детей: ${S.stats.babies}</p>`;
    },
  };
}
const HELP_HTML = `
<div class="help">
<h3>Цель</h3><p>Вы — смотритель подземного убежища. Стройте комнаты, принимайте выживших, следите за энергией, едой и водой, растите население и отбивайтесь от угроз.</p>
<h3>Управление</h3><p>Перетаскивайте убежище пальцем, масштабируйте щипком (на ПК — колёсиком). Нажмите на комнату или жителя, чтобы открыть карточку. Значок над комнатой — готовый ресурс: нажмите, чтобы собрать.</p>
<h3>Ресурсы</h3><p>Энергия питает комнаты — при нехватке гаснут самые дальние от электростанций. Без еды жители теряют здоровье, без воды — облучаются. Крышки — деньги на стройку и улучшения.</p>
<h3>Характеристики</h3><p>СИЛ — электростанции, ВОС — водоочистка, ВЫН — Пустошь, ХАР — жилые помещения и радио, ИНТ — медпункт и лаборатория, ЛОВ — столовая, УДА — крышки и удачное ускорение. По призванию жители работают охотнее.</p>
<h3>Комнаты</h3><p>Новые комнаты открываются с ростом населения. Одинаковые соседние комнаты одного уровня объединяются. «Ускорить» даёт ресурс сразу, но может вызвать пожар или нашествие.</p>
<h3>Жители и дети</h3><p>Мужчина и женщина в Жилых помещениях знакомятся, танцуют — и вскоре появляется ребёнок. Выжившие приходят к двери и на сигнал Радиостудии. Нажмите на зелёную стрелку над жителем, чтобы повысить уровень.</p>
<h3>Снаряжение и питомцы</h3><p>Оружие увеличивает урон, одежда — характеристики. Питомцы ходят за хозяином и дают бонусы. Ненужное можно разобрать на хлам и создать новое в мастерских.</p>
<h3>Угрозы</h3><p>Пожары, мутанты, набеги рейдеров, гулей и когтистых тварей. Ставьте вооружённую охрану у двери. Радскорпионы зарываются и вылезают в другой комнате. Погибших можно воскресить.</p>
<h3>Пустошь и задания</h3><p>Отправьте экипированного жителя в Пустошь с аптечками. Верните вовремя — обратный путь вдвое короче. Кабинет смотрителя открывает задания для отрядов.</p>
<h3>Секреты</h3><p>Иногда в убежище появляется таинственный незнакомец в плаще. Успейте нажать на него — он оставит крышки.</p>
</div>`;
function helpView() { return { key: 'help', title: 'Как играть', render: () => HELP_HTML }; }

// ===== Главное меню =====
function showMainMenu() {
  R.playing = false;
  R.menu = true;
  YA.gameplay(false);
  UI.close();
  closeModal();
  if (R.place) endPlace();
  $('#game-ui').hidden = true;
  $('#menu').hidden = false;
  const sv = pickSave();
  const cont = $('#m-continue');
  if (sv) { cont.hidden = false; cont.querySelector('small').textContent = `№${sv.vault} · ${sv.dwellers ? sv.dwellers.length : 0} жит.`; }
  else cont.hidden = true;
  $('#m-sound').innerHTML = `<span>Звук: ${Snd.on ? 'вкл' : 'выкл'}</span>${svg(Snd.on ? 'sound' : 'mute')}`;
}
function startPlaying() {
  R.menu = false;
  $('#menu').hidden = true;
  $('#game-ui').hidden = false;
  R.playing = true;
  resize();
  YA.gameplay(true);
  WORLD.key = -1;
  if (!S.cam) centerOn(Cam.vw < 600 ? 70 : 200, SURF + FH * 0.6, Cam.vw < 600 ? 0.95 : 1.35);
  clampCam();
  if (R.offlineReport && R.offlineReport.sec > 60) {
    const o = R.offlineReport;
    modal(`<h2>С возвращением!</h2><p>Вас не было ${fmtTime(o.sec)}. Жители продолжали работать.</p><p>${o.caps >= 0 ? 'Заработано' : 'Потрачено'} крышек: <b>${fmt(Math.abs(o.caps))}</b>${o.births > 0 ? ` · новых жителей: <b>${o.births}</b>` : ''}</p><div class="t-row-btns"><button class="t-btn pri" data-a="modalClose">К делу</button></div>`);
    R.offlineReport = null;
  }
}
function newGameDialog() {
  const no = String(ri(1, 999)).padStart(3, '0');
  modal(`<h2>Новое убежище</h2><form data-form="newgame"><label for="vault-no">Номер убежища (3 цифры)</label><input id="vault-no" inputmode="numeric" maxlength="3" value="${no}">${hasSave() ? '<p class="warn-t small">Текущее убежище будет заменено.</p>' : ''}<div class="t-row-btns"><button type="button" class="t-btn" data-a="modalClose">Отмена</button><button class="t-btn pri" type="submit">Открыть</button></div></form>`);
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
    if (+ds.r === 0) { unassign(d); routeTo(d, door()); UI.back(); return; }
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
  trainQ: ds => {
    const d = D(+ds.id); const r = d && d.room ? RM(d.room) : null;
    if (!r || !ROOMS[r.t] || ROOMS[r.t].kind !== 'train' || S.res.quantum < 1) return;
    S.res.quantum--; trainUp(d, ROOMS[r.t].st); UI.render(true);
  },
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
  petPick: ds => UI.open(petPickView(+ds.id)),
  petOn: ds => {
    const d = D(+ds.id); const p = S.pets.find(x => x.u === +ds.u);
    if (!d || !p) return;
    S.pets.splice(S.pets.indexOf(p), 1);
    if (d.pet) S.pets.push(d.pet);
    d.pet = p; d.petX = null;
    objProg('pet', 1);
    Snd.baby();
    UI.back();
  },
  petOff: ds => { const d = D(+ds.id); if (d && d.pet) { S.pets.push(d.pet); d.pet = null; } UI.back(); },
  barber: ds => UI.open(barberView(+ds.id)),
  setLook: ds => { const d = D(+ds.id); if (!d) return; d.look[ds.k] = ds.v; Snd.click(); UI.render(true); },
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
  accept: ds => { const d = S.arrivals.find(x => x.id === +ds.id); if (d && acceptArrival(d)) UI.render(true); },
  acceptAll: () => { for (const d of S.arrivals.slice()) if (!acceptArrival(d)) break; UI.close(); },
  reject: ds => { const d = S.arrivals.find(x => x.id === +ds.id); if (d) rejectArrival(d); UI.render(true); },
  sell: ds => {
    const it = S.inv.find(x => x.u === +ds.u);
    if (!it) return;
    S.inv.splice(S.inv.indexOf(it), 1);
    addCaps(sellPrice(it));
    Snd.coin();
    UI.render(true);
  },
  scrap: ds => { const it = S.inv.find(x => x.u === +ds.u); if (it) { scrapItem(it); UI.render(true); } },
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
  tod: ds => { S.todMode = ds.v; WORLD.key = -1; UI.render(true); },
  saveNow: () => { saveGame(true); toast('Игра сохранена', 'good'); },
  help: () => { if (R.menu) modal(`<h2>Как играть</h2>${HELP_HTML}<div class="t-row-btns"><button class="t-btn pri" data-a="modalClose">Понятно</button></div>`, 'wide'); else UI.open(helpView()); },
  toMenu: () => { saveGame(true); YA.interstitial(); showMainMenu(); },
  tutSkip: () => { S.tutDone = true; },
  incident: () => {
    if (!S.incs.length) return;
    R.incIdx = ((R.incIdx || 0) + 1) % S.incs.length;
    const inc = S.incs[R.incIdx];
    const r = RM(inc.room);
    if (r) { centerOn(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2, Math.max(Cam.z, 1.1)); R.selRoom = r.id; UI.open(roomView(r.id), true); revealAbove(roomX(r) + roomW(r) * CW / 2, roomY(r) + FH / 2); }
  },
  continue: () => {
    const sv = pickSave();
    if (!sv) return;
    try { loadGame(sv); } catch (e) { console.error(e); toast('Не удалось загрузить сохранение'); return; }
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
