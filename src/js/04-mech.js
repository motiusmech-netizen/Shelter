// ===== Глубокие механики: черты характера, события с выбором, исследования, торговец, соседство комнат =====

// ---------- черты характера ----------
// [название, описание, знак: 1 — достоинство, -1 — недостаток, 0 — нейтрально, цвет]
const TRAITS = {
  worker:  ['Трудяга', 'Работает на 15% продуктивнее', 1, '#8dffa4'],
  lazy:    ['Лентяй', 'Работает на 10% медленнее, но всегда в духе', -1, '#ffb070'],
  brave:   ['Храбрец', 'Урон в бою +25%, не теряет счастье при тревоге', 1, '#ff8a6a'],
  coward:  ['Трусишка', 'Урон в бою −20%', -1, '#b0a0ff'],
  charmer: ['Душа компании', 'Соседи по комнате счастливее, быстрее знакомится', 1, '#ff9ad0'],
  grump:   ['Ворчун', 'Портит настроение соседям по комнате', -1, '#9aa0a8'],
  lucky:   ['Везунчик', 'Шанс удвоить собранный ресурс, больше крышек в Пустоши', 1, '#ffd24a'],
  glutton: ['Обжора', 'Ест за полтора', -1, '#e8914a'],
  ascetic: ['Аскет', 'Нужно на 40% меньше еды и воды', 1, '#7fe0ff'],
  medic:   ['Санитар', 'Понемногу лечит всех в своей комнате', 1, '#ff6a6a'],
  scav:    ['Барахольщик', 'Приносит из Пустоши больше хлама и вещей', 1, '#c8b07a'],
  owl:     ['Сова', 'Ночью +20% к работе, днём −10%', 0, '#8aa0ff'],
  lark:    ['Жаворонок', 'Днём +20% к работе, ночью −10%', 0, '#ffe07a'],
  tough:   ['Крепыш', 'Здоровье +20%', 1, '#ff7a5a'],
  genius:  ['Самоучка', 'Тренируется на 30% быстрее', 1, '#5ae0c8'],
  radres:  ['Радиоустойчивый', 'Получает вдвое меньше радиации', 1, '#b6ff5a'],
  firefly: ['Огнеборец', 'Тушит пожары вдвое быстрее', 1, '#ffa040'],
  sprinter:['Проныра', 'Возвращается из Пустоши на 30% быстрее', 1, '#a0e0ff'],
};
const TRAIT_GOOD = Object.keys(TRAITS).filter(k => TRAITS[k][2] >= 0);
const TRAIT_BAD = Object.keys(TRAITS).filter(k => TRAITS[k][2] < 0);
function rollTraits(d) {
  const n = d.rar === 2 ? 2 : d.rar === 1 ? (rnd() < 0.6 ? 2 : 1) : (rnd() < 0.25 ? 2 : 1);
  const out = [];
  while (out.length < n) {
    const bad = d.rar === 2 ? false : rnd() < (d.rar ? 0.12 : 0.3);
    const k = pick(bad ? TRAIT_BAD : TRAIT_GOOD);
    if (out.includes(k)) continue;
    if ((k === 'owl' && out.includes('lark')) || (k === 'lark' && out.includes('owl'))) continue;
    if ((k === 'brave' && out.includes('coward')) || (k === 'coward' && out.includes('brave'))) continue;
    if ((k === 'glutton' && out.includes('ascetic')) || (k === 'ascetic' && out.includes('glutton'))) continue;
    out.push(k);
  }
  d.tr = out;
  return out;
}
function hasTr(d, k) { return !!(d && d.tr && d.tr.includes(k)); }
function isNightNow() { const st = WORLD && WORLD.st; if (st) return isNight(st); const h = new Date().getHours(); return h < 6 || h >= 21; }
// множитель вклада жителя в работу комнаты
function workMult(d) {
  let m = 1;
  if (hasTr(d, 'worker')) m *= 1.15;
  if (hasTr(d, 'lazy')) m *= 0.9;
  if (hasTr(d, 'owl')) m *= isNightNow() ? 1.2 : 0.9;
  if (hasTr(d, 'lark')) m *= isNightNow() ? 0.9 : 1.2;
  return m;
}
function traitChips(d, small) {
  if (!d.tr || !d.tr.length) return '';
  return `<span class="traits${small ? ' sm' : ''}">${d.tr.map(k => { const T = TRAITS[k]; return `<span class="trait ${T[2] > 0 ? 'good' : T[2] < 0 ? 'bad' : 'neu'}" style="--tc:${T[3]}" title="${T[1]}">${T[0]}</span>`; }).join('')}</span>`;
}

// ---------- временные эффекты ----------
function buffMult(k) { let m = 1; for (const b of S.buffs || []) if (b.k === k && b.m) m *= b.m; return m; }
function buffAdd(k) { let a = 0; for (const b of S.buffs || []) if (b.k === k && b.a) a += b.a; return a; }
function addBuff(k, o, sec, name) { S.buffs = S.buffs || []; S.buffs.push(Object.assign({ k, t: sec, n: name }, o)); }
function tickBuffs(dt) { if (!S.buffs) return; for (const b of S.buffs) b.t -= dt; S.buffs = S.buffs.filter(b => b.t > 0); }

// ---------- исследования ----------
// [название, описание, ярус, иконка]
const RESEARCH = {
  wiring:    ['Изоляция проводки', 'Комнаты потребляют на 10% меньше энергии', 1, 'power'],
  hydro:     ['Гидропоника', '+10% к производству еды', 1, 'food'],
  filters:   ['Тонкие фильтры', '+10% к производству воды', 1, 'water'],
  bolts:     ['Усиленные засовы', 'Прочность двери +50%', 1, 'door'],
  shifts:    ['Сменный график', '+10% к производству во всех комнатах', 2, 'clock'],
  fieldmed:  ['Полевая медицина', 'Аптечки лечат на 50% сильнее', 2, 'stim'],
  logistics: ['Логистика складов', 'Хранилища вмещают на 25% больше, склад +10 мест', 2, 'box'],
  turret:    ['Турель у двери', 'Автоматическая турель стреляет по налётчикам у двери', 2, 'gun'],
  reactor:   ['Автоматика реакторов', '+15% к выработке энергии', 3, 'bolt2'],
  genetics:  ['Генетика', 'Дети растут в полтора раза быстрее', 3, 'child'],
  survey:    ['Геологоразведка', '+25% крышек и хлама из Пустоши', 3, 'map'],
  alarm:     ['Сигнализация', 'Враги приходят ослабленными (−20% здоровья)', 3, 'alert'],
};
const RS_COST = [0, 400, 1400, 3500], RS_TIME = [0, 90, 240, 480];
function rsDone(k) { return !!(S.research && S.research.done[k]); }
function rsTierOpen(t) {
  if (t === 1) return true;
  const prev = Object.keys(RESEARCH).filter(k => RESEARCH[k][2] === t - 1 && rsDone(k)).length;
  if (t === 2) return prev >= 2 && popCount() >= 12;
  return prev >= 2 && popCount() >= 25 && hasType('overseer');
}
function rsLockText(t) {
  if (t === 2) return 'Нужно: 2 проекта I яруса и 12 жителей';
  if (t === 3) return 'Нужно: 2 проекта II яруса, 25 жителей и Кабинет смотрителя';
  return '';
}
function rsSpeed() {
  let s = 1;
  for (const r of S.rooms) if (r.t === 'science' && !r.off) for (const id of r.w) { const d = D(id); if (arrived(d)) s += stat(d, 4) * 0.012; }
  return s;
}
function startResearch(k) {
  const T = RESEARCH[k]; if (!T || rsDone(k) || S.research.cur) return false;
  if (!rsTierOpen(T[2])) { toast(rsLockText(T[2]), 'warn'); return false; }
  const c = RS_COST[T[2]];
  if (S.res.caps < c) { toast('Не хватает крышек', 'bad'); Snd.bad(); return false; }
  S.res.caps -= c;
  S.research.cur = k; S.research.p = 0;
  toast(`Начато исследование: ${T[0]}`, 'good');
  Snd.build();
  return true;
}
function updateResearch(dt) {
  const R2 = S.research; if (!R2 || !R2.cur) return;
  const T = RESEARCH[R2.cur];
  R2.p += dt * rsSpeed() / RS_TIME[T[2]];
  if (R2.p >= 1) {
    R2.done[R2.cur] = true;
    if (R2.cur === 'bolts') { const d0 = door(); if (d0) d0.hp = doorMaxHp(d0); }
    if (!R.offline) { toast(`Исследование завершено: ${T[0]}!`, 'good'); Snd.level(); }
    R2.cur = null; R2.p = 0;
  }
}
function doorMaxHp(r) { return Math.round(DOOR_HP[r.l - 1] * (rsDone('bolts') ? 1.5 : 1)); }

// ---------- соседство комнат ----------
const SYNERGY = [
  ['diner', 'garden', 0.1, 'Кухня рядом с оранжереей'],
  ['water', 'purifier', 0.1, 'Общий водопровод'],
  ['medbay', 'science', 0.12, 'Медики и учёные помогают друг другу'],
  ['power', 'reactor', 0.1, 'Общая энергосеть'],
  ['wshop', 'oshop', 0.15, 'Мастерские делятся инструментом'],
  ['diner', 'cola', 0.08, 'Буфет с газировкой'],
  ['radio', 'overseer', 0.15, 'Прямая линия со смотрителем'],
  ['gym', 'athletic', 0.1, 'Спортивный блок'],
  ['classroom', 'science', 0.1, 'Учебная лаборатория'],
  ['lounge', 'gameroom', 0.1, 'Зона отдыха'],
];
function synergy(r) {
  const out = { m: 1, list: [] };
  if (!ROOMS[r.t]) return out;
  for (const n of neighbors(r)) {
    for (const [a, b, v, name] of SYNERGY) {
      if ((r.t === a && n.t === b) || (r.t === b && n.t === a)) {
        if (!out.list.some(x => x.id === n.id)) { out.m += v; out.list.push({ id: n.id, v, name, t: n.t }); }
      }
    }
  }
  return out;
}
// итоговый множитель скорости производства комнаты
function prodMult(r) {
  const def = ROOMS[r.t];
  let m = synergy(r).m * buffMult('prod');
  if (rsDone('shifts')) m *= 1.1;
  if (def.res === 'food' && rsDone('hydro')) m *= 1.1;
  if (def.res === 'water' && rsDone('filters')) m *= 1.1;
  if (def.res === 'power') { m *= buffMult('power'); if (rsDone('reactor')) m *= 1.15; }
  return m;
}

// ---------- события с выбором ----------
const EVENTS = [
  {
    id: 'pipe', icon: 'water', col: '#4fb8f0', title: 'Прорыв трубы',
    when: () => S.rooms.some(r => ROOMS[r.t] && ROOMS[r.t].res === 'water'),
    setup: () => { const r = pick(S.rooms.filter(r => ROOMS[r.t] && ROOMS[r.t].res === 'water')); return { room: r.id }; },
    text: e => `В комнате «${roomName(RM(e.room) || { t: 'water' })}» лопнула магистраль. Вода хлещет на пол, давление падает.`,
    choices: e => {
      const r = RM(e.room); const best = r ? workersOf(r).reduce((m, d) => Math.max(m, stat(d, 0)), 0) : 0;
      return [
        { l: 'Вызвать ремонтную бригаду', sub: '−120 крышек', cost: { caps: 120 }, run: () => 'Бригада заварила трубу за пару минут. Всё в порядке.' },
        { l: 'Пусть чинят сами', sub: `Шанс ${Math.round(chance(0.35 + best * 0.06) * 100)}% · по Силе`, run: () => {
          if (rnd() < chance(0.35 + best * 0.06)) { if (r) for (const d of workersOf(r)) gainXp(d, 40); return 'Жители справились сами и получили опыт!'; }
          S.res.water = Math.max(0, S.res.water - 25); addBuff('prod', { m: 0.85 }, 90, 'Потоп'); return 'Не вышло: утечка съела 25 воды, работа убежища замедлилась на полторы минуты.';
        } },
      ];
    },
  },
  {
    id: 'surge', icon: 'power', col: '#f6c945', title: 'Скачок напряжения',
    when: () => S.rooms.some(r => ROOMS[r.t] && ROOMS[r.t].res === 'power'),
    setup: () => ({}),
    text: () => 'Генераторы гудят на пределе: стрелки приборов в красной зоне. Можно снизить нагрузку — или рискнуть и выжать максимум.',
    choices: () => [
      { l: 'Снизить нагрузку', sub: 'Энергия −25% на 2 мин', run: () => { addBuff('power', { m: 0.75 }, 120, 'Щадящий режим'); return 'Генераторы переведены в щадящий режим.'; } },
      { l: 'Выжать максимум', sub: 'Энергия +40% на 2 мин · риск пожара 40%', run: () => {
        addBuff('power', { m: 1.4 }, 120, 'Форсаж генераторов');
        if (rnd() < 0.4) { const r = pick(S.rooms.filter(r => ROOMS[r.t] && ROOMS[r.t].res === 'power')); if (r) startIncident('fire', r); return 'Форсаж! Но один из генераторов вспыхнул — тушите пожар!'; }
        return 'Генераторы выдержали. Энергия течёт рекой!';
      } },
    ],
  },
  {
    id: 'party', icon: 'smile', col: '#ffd24a', title: 'Предложение устроить праздник',
    when: () => popCount() >= 6,
    setup: () => ({}),
    text: () => 'Жители просят разрешения устроить вечеринку в честь годовщины закрытия убежища. Музыка, танцы, двойная порция пайка.',
    choices: () => [
      { l: 'Устроить праздник', sub: '−20 еды, −20 воды · счастье +15 на 5 мин', cost: { food: 20, water: 20 }, run: () => { addBuff('hap', { a: 15 }, 300, 'Праздник'); for (const d of S.dwellers) if (d.st === 'vault') d.hap = Math.min(100, d.hap + 10); return 'Отличная вечеринка! Убежище гудит от смеха.'; } },
      { l: 'Не сейчас', sub: 'Счастье −5', run: () => { for (const d of S.dwellers) if (d.st === 'vault') d.hap = Math.max(0, d.hap - 5); return 'Жители немного расстроились.'; } },
    ],
  },
  {
    id: 'doctor', icon: 'stim', col: '#ef6a5a', title: 'Бродячий доктор',
    when: () => S.dwellers.some(d => d.st === 'vault' && (d.hp < effMax(d) * 0.8 || d.rad > 5)),
    setup: () => ({}),
    text: () => 'У двери стоит доктор с потёртым саквояжем. Предлагает осмотреть жителей — за разумную плату.',
    choices: () => [
      { l: 'Вылечить всех', sub: '−150 крышек · здоровье и радиация', cost: { caps: 150 }, run: () => { for (const d of S.dwellers) if (d.st === 'vault') { d.rad = 0; d.hp = effMax(d); } return 'Доктор вылечил всех и ушёл дальше по Пустоши.'; } },
      { l: 'Купить аптечки', sub: '−100 крышек · +3 аптечки', cost: { caps: 100 }, run: () => { S.res.stim += 3; return 'Получено 3 аптечки.'; } },
      { l: 'Отказаться', sub: '', run: () => 'Доктор пожал плечами и ушёл.' },
    ],
  },
  {
    id: 'signal', icon: 'radio', col: '#c58af0', title: 'Сигнал бедствия',
    when: () => S.dwellers.some(d => d.st === 'vault' && !d.child && d.room),
    setup: () => ({}),
    text: () => 'Рация ловит слабый сигнал: «…кто-нибудь… мы у старой заправки… помогите…». Можно отправить одного жителя на короткую вылазку.',
    choices: () => {
      const best = S.dwellers.filter(d => d.st === 'vault' && !d.child).sort((a, b) => stat(b, 2) + stat(b, 0) - stat(a, 2) - stat(a, 0))[0];
      const ch = best ? chance(0.45 + (stat(best, 2) + stat(best, 0)) * 0.025) : 0;
      return [
        { l: best ? `Послать: ${fullName(best)}` : 'Некого послать', sub: best ? `Успех ${Math.round(ch * 100)}% · по Выносливости и Силе` : '', dis: !best, run: () => {
          if (rnd() < ch) {
            if (S.arrivals.length < 5) { spawnArrival(rnd() < 0.2 ? 1 : 0); gainXp(best, 60); return `${fullName(best)} привёл(а) выжившего — он ждёт у двери!`; }
            addCaps(150); return `${fullName(best)} нашёл(ла) только тайник: +150 крышек.`;
          }
          hurt(best, best.mhp * 0.35, 12); return `Это была засада! ${fullName(best)} вернулся(ась) раненым(ой).`;
        } },
        { l: 'Не рисковать', sub: '', run: () => 'Сигнал затих.' },
      ];
    },
  },
  {
    id: 'quarrel', icon: 'people', col: '#ff9a6a', title: 'Ссора жителей',
    when: () => S.dwellers.filter(d => d.st === 'vault' && !d.child).length >= 4,
    setup: () => { const ds = S.dwellers.filter(d => d.st === 'vault' && !d.child); const a = pick(ds); let b = pick(ds); if (b === a) b = ds.find(x => x !== a); return { a: a.id, b: b.id }; },
    text: e => { const a = D(e.a), b = D(e.b); return a && b ? `${fullName(a)} и ${fullName(b)} поссорились из-за последней банки тушёнки. Страсти накаляются.` : 'Жители поссорились.'; },
    choices: e => {
      const judge = S.dwellers.filter(d => d.st === 'vault' && !d.child).sort((x, y) => stat(y, 3) - stat(x, 3))[0];
      const ch = judge ? chance(0.4 + stat(judge, 3) * 0.06) : 0.3;
      return [
        { l: judge ? `Рассудить (${judge.name})` : 'Рассудить', sub: `Успех ${Math.round(ch * 100)}% · по Харизме`, run: () => {
          const a = D(e.a), b = D(e.b);
          if (rnd() < ch) { for (const d of [a, b]) if (d) d.hap = Math.min(100, d.hap + 20); if (judge) gainXp(judge, 50); return 'Помирились и даже пожали руки. Счастье выросло.'; }
          for (const d of [a, b]) if (d) d.hap = Math.max(0, d.hap - 20); return 'Спор перерос в драку. Оба ходят мрачнее тучи.';
        } },
        { l: 'Выдать по банке', sub: '−10 еды', cost: { food: 10 }, run: () => { for (const d of [D(e.a), D(e.b)]) if (d) d.hap = Math.min(100, d.hap + 10); return 'Сытые — значит, довольные.'; } },
      ];
    },
  },
  {
    id: 'cache', icon: 'box', col: '#ffb84a', title: 'Слухи о тайнике',
    when: () => popCount() >= 5,
    setup: () => ({}),
    text: () => 'Старый торговец шепчет о довоенном тайнике неподалёку. Карту отдаст за бутылку Атом-колы — или можно поискать самим.',
    choices: () => {
      const scout = S.dwellers.filter(d => d.st === 'vault' && !d.child).sort((a, b) => stat(b, 1) - stat(a, 1))[0];
      const ch = scout ? chance(0.3 + stat(scout, 1) * 0.06) : 0;
      return [
        { l: 'Купить карту', sub: '−1 Атом-кола · ящик снабжения', cost: { quantum: 1 }, run: () => { S.lunch++; return 'Тайник найден: ящик снабжения ждёт вас!'; } },
        { l: scout ? `Искать (${scout.name})` : 'Искать самим', sub: `Шанс ${Math.round(ch * 100)}% · по Восприятию`, dis: !scout, run: () => {
          if (rnd() < ch) { const j = pick(Object.keys(JUNK).filter(k => JUNK[k][1] <= 2)); S.junk[j] = Math.min(99, (S.junk[j] || 0) + 3); addCaps(80); return `Нашли немного: +80 крышек и хлам (${JUNK[j][0]} ×3).`; }
          return 'Тайник давно разграблен.';
        } },
        { l: 'Отказаться', sub: '', run: () => 'Торговец разочарованно сплюнул.' },
      ];
    },
  },
  {
    id: 'pet', icon: 'paw', col: '#e0b070', title: 'Бездомный питомец',
    when: () => popCount() >= 8,
    setup: () => ({ pet: genPet(rnd() < 0.2 ? 1 : 0) }),
    text: e => `У двери скулит ${PET_TYPES.find(p => p.id === e.pet.type).n.toLowerCase()}. Худой, но с умными глазами. Кажется, ему нужен дом.`,
    choices: e => [
      { l: 'Приютить', sub: '−15 еды · питомец в убежище', cost: { food: 15 }, run: () => { S.pets.push(e.pet); return `${petName(e.pet)} теперь живёт в убежище! Назначьте его жителю.`; } },
      { l: 'Прогнать', sub: '', run: () => 'Питомец убежал в Пустошь.' },
    ],
  },
  {
    id: 'experiment', icon: 'rad', col: '#5ae0c8', title: 'Смелый эксперимент',
    when: () => hasType('science') || hasType('medbay'),
    setup: () => ({}),
    text: () => 'Учёные предлагают опыт с облучёнными культурами. В случае успеха — запас лекарств. В случае неудачи — утечка радиации.',
    choices: () => {
      let I = 0; for (const r of S.rooms) if (r.t === 'science' || r.t === 'medbay') for (const id of r.w) { const d = D(id); if (d) I = Math.max(I, stat(d, 4)); }
      const ch = chance(0.35 + I * 0.06);
      return [
        { l: 'Разрешить', sub: `Успех ${Math.round(ch * 100)}% · по Интеллекту`, run: () => {
          if (rnd() < ch) { S.res.stim += 2; S.res.rad += 2; return 'Эксперимент удался: +2 аптечки и +2 антирадина.'; }
          for (const d of S.dwellers) if (d.st === 'vault') d.rad = Math.min(d.mhp - 1, d.rad + 8); return 'Утечка! Все жители получили немного радиации.';
        } },
        { l: 'Запретить', sub: '', run: () => 'Учёные вздохнули и вернулись к работе.' },
      ];
    },
  },
  {
    id: 'caravan', icon: 'bag', col: '#c8b07a', title: 'Караван на горизонте',
    when: () => !S.trader && popCount() >= 6,
    setup: () => ({}),
    text: () => 'Дозорный заметил торговый караван. Можно подать сигнал ракетой — торговец свернёт к убежищу.',
    choices: () => [
      { l: 'Подать сигнал', sub: 'Торговец придёт к двери', run: () => { spawnTrader(); return 'Караван свернул к убежищу. Торговец ждёт у двери!'; } },
      { l: 'Пусть идут мимо', sub: '', run: () => 'Караван скрылся за холмом.' },
    ],
  },
];
function chance(p) { return clamp(p, 0.05, 0.95); }
function payCost(c) {
  if (!c) return true;
  for (const k in c) if ((S.res[k] || 0) < c[k]) return false;
  for (const k in c) S.res[k] -= c[k];
  return true;
}
function costOk(c) { if (!c) return true; for (const k in c) if ((S.res[k] || 0) < c[k]) return false; return true; }
function spawnEvent(force) {
  const pool = EVENTS.filter(e => e.when());
  if (!pool.length) return;
  const e = force ? EVENTS.find(x => x.id === force) : pick(pool);
  if (!e) return;
  S.event = { id: e.id, d: e.setup(), t: 240 };
  if (!R.offline) { toast(`Сообщение смотрителю: ${e.title}`, 'warn'); Snd.open(); }
}
function eventDef() { return S.event ? EVENTS.find(e => e.id === S.event.id) : null; }
function resolveEvent(i) {
  const e = eventDef(); if (!e) return null;
  const ch = e.choices(S.event.d)[i];
  if (!ch || ch.dis) return null;
  if (!payCost(ch.cost)) { toast('Не хватает ресурсов', 'bad'); Snd.bad(); return null; }
  const res = ch.run();
  S.stats.events = (S.stats.events || 0) + 1;
  S.event = null;
  return res;
}

// ---------- торговец ----------
function spawnTrader() {
  const stock = [];
  const luckBonus = S.dwellers.some(d => hasTr(d, 'lucky')) ? 0.05 : 0;
  for (let i = 0; i < 4; i++) {
    const it = randomItem(rnd() < 0.08 + luckBonus ? 2 : rnd() < 0.35 ? 1 : 0);
    stock.push({ k: 'item', it, price: Math.round(sellPrice(it) * 2.6) });
  }
  const j = pick(Object.keys(JUNK).filter(k => JUNK[k][1] >= 1 && JUNK[k][1] <= 3));
  stock.push({ k: 'junk', id: j, n: 3, price: [40, 90, 200, 450][JUNK[j][1]] });
  stock.push({ k: 'stim', n: 2, price: 140 });
  stock.push({ k: 'rad', n: 2, price: 120 });
  if (rnd() < 0.35) { const p = genPet(rnd() < 0.2 ? 1 : 0); stock.push({ k: 'pet', p, price: p.rar ? 1400 : 600 }); }
  S.trader = { t: 240, stock, name: pick(['Бартер Билл', 'Мама Лу', 'Шестерня', 'Старый Мэйсон', 'Кэт-Хромоножка']) };
  if (!R.offline) { toast(`Торговец ${S.trader.name} у двери убежища!`, 'good'); Snd.coin(); }
}
function buyFromTrader(i) {
  const tr = S.trader; if (!tr) return false;
  const o = tr.stock[i]; if (!o || o.sold) return false;
  if (S.res.caps < o.price) { toast('Не хватает крышек', 'bad'); Snd.bad(); return false; }
  if (o.k === 'item' && S.inv.length >= itemCap()) { toast('Склад полон', 'bad'); return false; }
  S.res.caps -= o.price;
  if (o.k === 'item') S.inv.push(o.it);
  else if (o.k === 'junk') S.junk[o.id] = Math.min(99, (S.junk[o.id] || 0) + o.n);
  else if (o.k === 'stim') S.res.stim += o.n;
  else if (o.k === 'rad') S.res.rad += o.n;
  else if (o.k === 'pet') S.pets.push(o.p);
  o.sold = true;
  Snd.coin();
  return true;
}
function traderBuyPrice(it) { return Math.round(sellPrice(it) * 1.4); }

// ---------- тик механик (раз в секунду) ----------
function mechTick() {
  tickBuffs(1);
  updateResearch(1);
  // санитары лечат соседей
  for (const r of S.rooms) {
    if (!r.w.length) continue;
    const ws = workersOf(r).filter(arrived);
    const medics = ws.filter(d => hasTr(d, 'medic')).length;
    if (medics) for (const d of ws) d.hp = Math.min(effMax(d), d.hp + 0.35 * medics);
  }
  // торговец
  if (S.trader) { S.trader.t -= 1; if (S.trader.t <= 0) { S.trader = null; if (!R.offline) toast('Торговец ушёл дальше по Пустоши'); } }
  if (!R.offline && S.tutDone) {
    S.timers.trader = (S.timers.trader == null ? 420 : S.timers.trader) - 1;
    if (S.timers.trader <= 0) { S.timers.trader = ri(600, 900); if (!S.trader && popCount() >= 6) spawnTrader(); }
    if (S.event) { S.event.t -= 1; if (S.event.t <= 0) { S.event = null; } }
    S.timers.event = (S.timers.event == null ? 150 : S.timers.event) - 1;
    if (S.timers.event <= 0) { S.timers.event = ri(200, 380); if (!S.event && popCount() >= 5) spawnEvent(); }
  }
}
// влияние черт и эффектов на счастье (добавка к целевому значению)
function hapTraitAdd(d) {
  let a = buffAdd('hap');
  if (hasTr(d, 'lazy')) a += 8;
  const r = d.room ? RM(d.room) : null;
  if (r) for (const id of r.w) {
    if (id === d.id) continue;
    const o = D(id); if (!o || !arrived(o)) continue;
    if (hasTr(o, 'charmer')) a += 6;
    if (hasTr(o, 'grump')) a -= 5;
  }
  return a;
}
function migrateMech() {
  S.buffs = S.buffs || [];
  S.research = S.research || { done: {}, cur: null, p: 0 };
  if (S.event === undefined) S.event = null;
  if (S.trader === undefined) S.trader = null;
  for (const d of S.dwellers.concat(S.arrivals)) if (!d.tr) rollTraits(d);
}
