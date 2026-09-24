// ===== Интерфейс новых механик: исследования, события, торговец =====
function researchView() {
  return {
    key: 'research', live: true, title: 'Исследования',
    render() {
      const Rs = S.research;
      let h = `<p class="t-p">Проекты навсегда улучшают убежище. Работники Лаборатории с высоким Интеллектом ускоряют исследования (сейчас ×${rsSpeed().toFixed(2)}).</p>`;
      if (Rs.cur) {
        const T = RESEARCH[Rs.cur];
        const left = (1 - Rs.p) * RS_TIME[T[2]] / rsSpeed();
        h += `<div class="status col rs-cur"><div class="row-sp"><span>${svg(T[3])} <b>${esc(T[0])}</b></span><span class="mono">${fmtTime(left)}</span></div>${bar(Rs.p)}${S.res.quantum > 0 ? `<button class="t-btn q small" data-a="rsQ">${svg('quantum')} Завершить за 1 Атом-колу</button>` : ''}</div>`;
      }
      for (const tier of [1, 2, 3]) {
        const open = rsTierOpen(tier);
        h += `<h3 class="t-h">Ярус ${['I', 'II', 'III'][tier - 1]} <small>${RS_COST[tier]} крышек · ${fmtTime(RS_TIME[tier])}</small></h3>`;
        if (!open) h += `<p class="t-p muted small">${rsLockText(tier)}</p>`;
        h += `<div class="rs-grid">`;
        for (const k of Object.keys(RESEARCH).filter(k => RESEARCH[k][2] === tier)) {
          const T = RESEARCH[k], done = rsDone(k), cur = Rs.cur === k;
          const can = open && !done && !Rs.cur;
          h += `<button class="rs${done ? ' done' : ''}${cur ? ' cur' : ''}${!open ? ' lock' : ''}" data-a="rsStart" data-k="${k}" ${can ? '' : 'disabled'}>
            <span class="rs-ic">${svg(T[3])}</span><b>${esc(T[0])}</b><small>${esc(T[1])}</small>
            <em>${done ? 'Изучено' : cur ? 'Идёт…' : !open ? 'Закрыто' : Rs.cur ? 'Ждёт' : `${svg('caps')} ${RS_COST[tier]}`}</em></button>`;
        }
        h += `</div>`;
      }
      return h;
    },
  };
}
function eventCardHtml(result) {
  const e = eventDef();
  if (result != null) {
    return `<div class="ev-card"><div class="ev-art" style="--ec:${R.lastEvCol || '#7dff95'}"><span class="ev-medal">${svg(R.lastEvIcon || 'star')}</span></div>
      <div class="ev-body"><small>ИТОГ</small><h2>${esc(R.lastEvTitle || '')}</h2><p>${esc(result)}</p>
      <div class="t-row-btns col"><button class="t-btn pri" data-a="modalClose">Хорошо</button></div></div></div>`;
  }
  if (!e) return '';
  const d = S.event.d;
  const ch = e.choices(d);
  return `<div class="ev-card"><div class="ev-art" style="--ec:${e.col}"><span class="ev-medal">${svg(e.icon)}</span><i class="ev-timer">${fmtTime(S.event.t)}</i></div>
    <div class="ev-body"><small>СООБЩЕНИЕ СМОТРИТЕЛЮ</small><h2>${esc(e.title)}</h2><p>${esc(e.text(d))}</p>
    <div class="t-row-btns col">${ch.map((c, i) => `<button class="t-btn${i === 0 ? ' pri' : ''}" data-a="eventPick" data-i="${i}" ${c.dis || !costOk(c.cost) ? 'disabled' : ''}><span>${esc(c.l)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</span></button>`).join('')}</div>
    <button class="link ev-later" data-a="modalClose">Решить позже</button></div></div>`;
}
function showEvent(result) { modal(eventCardHtml(result), 'raw'); $('#modal').classList.add('ev'); }
function traderView() {
  return {
    key: 'trader', live: true, title: () => S.trader ? `Торговец: ${S.trader.name}` : 'Торговец', alive: () => !!S.trader,
    render() {
      const tr = S.trader;
      const tab = TRADE_TAB;
      let h = `<div class="trader-hd"><canvas class="tr-portrait" id="tr-portrait"></canvas><div><p class="t-p">«Всё честно, смотритель. Крышки вперёд — товар ваш.»</p><p class="t-p muted small">Уйдёт через ${fmtTime(tr.t)} · у вас ${svg('caps')} <b class="mono">${fmt(S.res.caps)}</b></p></div></div>`;
      h += `<div class="seg"><button class="${tab === 'buy' ? 'on' : ''}" data-a="tradeTab" data-v="buy">Купить</button><button class="${tab === 'sell' ? 'on' : ''}" data-a="tradeTab" data-v="sell">Продать</button></div>`;
      if (tab === 'buy') {
        h += `<div class="list">${tr.stock.map((o, i) => {
          let ic, nm, sub, cls = '';
          if (o.k === 'item') { ic = o.it.k === 'w' ? 'gun' : 'shirt'; nm = itemName(o.it); sub = itemDesc(o.it); cls = rarCls(itemRar(o.it)); }
          else if (o.k === 'junk') { ic = 'junk'; nm = `${JUNK[o.id][0]} ×${o.n}`; sub = 'Хлам для мастерских'; }
          else if (o.k === 'stim') { ic = 'stim'; nm = `Аптечки ×${o.n}`; sub = 'Лечение'; }
          else if (o.k === 'rad') { ic = 'rad'; nm = `Антирадин ×${o.n}`; sub = 'Снимает облучение'; }
          else { ic = 'paw'; nm = petName(o.p); sub = petDesc(o.p); cls = rarCls(o.p.rar); }
          return `<div class="row${o.sold ? ' dead' : ''}">${svg(ic, 'r' + (o.it ? itemRar(o.it) : 0))}<span class="grow"><b class="${cls}">${esc(nm)}</b><small>${esc(sub)}</small></span>${o.sold ? '<span class="muted small">Продано</span>' : `<button class="t-btn small pri" data-a="tradeBuy" data-i="${i}" ${S.res.caps < o.price ? 'disabled' : ''}>${svg('caps')} ${fmt(o.price)}</button>`}</div>`;
        }).join('')}</div>`;
      } else {
        const items = S.inv.slice().sort((a, b) => traderBuyPrice(b) - traderBuyPrice(a));
        h += items.length ? `<p class="t-p muted small">Торговец платит на 40% больше, чем скупщик на складе.</p><div class="list">${items.map(it => `<div class="row">${svg(it.k === 'w' ? 'gun' : 'shirt', 'r' + itemRar(it))}<span class="grow"><b class="${rarCls(itemRar(it))}">${esc(itemName(it))}</b><small>${esc(itemDesc(it))}</small></span><button class="t-btn small" data-a="tradeSell" data-u="${it.u}">+${fmt(traderBuyPrice(it))}</button></div>`).join('')}</div>` : '<p class="empty-t">На складе нечего продать.</p>';
      }
      return h;
    },
    after(b) { const c = b.querySelector('#tr-portrait'); if (c) drawTraderPortrait(c); },
  };
}
let TRADE_TAB = 'buy';
const TRADER_LOOK = { style: 'trench', c1: '#6a5236', c2: '#3a2a1a', hat: 'straw' };
function traderParams(x, y, t, s) {
  return { x, y, face: 1, s: s || 1, id: 913, t, pose: 'idle', look: TRADER_LOOK, skin: '#d9a47a', hairC: '#7a5a3a', hair: 'curly', beard: 'beard', mood: 'happy', hat: 'straw' };
}
function drawTraderPortrait(canvas) {
  const g = canvas.getContext('2d');
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 84, h = canvas.clientHeight || 96;
  canvas.width = w * dpr; canvas.height = h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#6a5a44'); bg.addColorStop(1, '#2a221a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  drawHuman(g, traderParams(w / 2, h + 26, performance.now() / 1000, 2.2));
}
Object.assign(ACT, {
  research: () => UI.open(researchView(), true),
  rsStart: ds => { if (startResearch(ds.k)) UI.render(true); },
  rsQ: () => { if (!S.research.cur || S.res.quantum < 1) return; S.res.quantum--; S.research.p = 0.999; UI.render(true); },
  eventOpen: () => { if (S.event) showEvent(); },
  eventPick: ds => {
    const e = eventDef(); if (!e) return closeModal();
    R.lastEvIcon = e.icon; R.lastEvCol = e.col; R.lastEvTitle = e.title;
    const res = resolveEvent(+ds.i);
    if (res != null) { Snd.collect(); showEvent(res); }
  },
  trader: () => { TRADE_TAB = 'buy'; UI.open(traderView(), true); },
  tradeTab: ds => { TRADE_TAB = ds.v; UI.render(true); },
  tradeBuy: ds => { if (buyFromTrader(+ds.i)) { toast('Покупка совершена', 'good'); UI.render(true); } },
  tradeSell: ds => {
    const it = S.inv.find(x => x.u === +ds.u); if (!it || !S.trader) return;
    S.inv.splice(S.inv.indexOf(it), 1); addCaps(traderBuyPrice(it)); Snd.coin(); UI.render(true);
  },
});
