// ===== Яндекс Игры SDK =====
// На Яндекс Играх SDK подключается из /sdk.js. Вне платформы игра работает автономно:
// сохранения — в localStorage, реклама — заглушка с мгновенной наградой.
const YA = {
  sdk: null, player: null, started: false, adBusy: false,
  onYandex() { return !!window.YaGames || /yandex|playhop|games\.s3/.test(location.hostname); },
  init() {
    return new Promise(resolve => {
      const done = () => resolve();
      const withSdk = () => {
        if (!window.YaGames) return done();
        window.YaGames.init().then(sdk => {
          this.sdk = sdk;
          try {
            sdk.on('game_api_pause', () => pauseGame(true, 'sdk'));
            sdk.on('game_api_resume', () => pauseGame(false, 'sdk'));
          } catch (e) {}
          return sdk.getPlayer({ scopes: false }).then(p => {
            this.player = p;
            return p.getData(['save']).then(d => {
              if (d && d.save) { try { R.cloudSave = JSON.parse(d.save); } catch (e) {} }
            });
          }).catch(() => {});
        }).catch(() => {}).finally(done);
      };
      if (window.YaGames) return withSdk();
      if (!this.onYandex()) return done();
      const s = document.createElement('script');
      s.src = '/sdk.js';
      s.async = true;
      s.onload = withSdk;
      s.onerror = done;
      document.head.appendChild(s);
      setTimeout(done, 6000);
    });
  },
  ready() {
    try { this.sdk && this.sdk.features && this.sdk.features.LoadingAPI && this.sdk.features.LoadingAPI.ready(); } catch (e) {}
  },
  gameplay(on) {
    if (!this.sdk) return;
    try {
      const g = this.sdk.features && this.sdk.features.GameplayAPI;
      if (!g) return;
      if (on && !this.started) { g.start(); this.started = true; }
      else if (!on && this.started) { g.stop(); this.started = false; }
    } catch (e) {}
  },
  save(json) {
    if (!this.player) return;
    try { this.player.setData({ save: json }, false).catch(() => {}); } catch (e) {}
  },
  interstitial() {
    if (!this.sdk || this.adBusy) return;
    this.adBusy = true;
    try {
      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => pauseGame(true, 'ad'),
          onClose: () => { this.adBusy = false; pauseGame(false, 'ad'); },
          onError: () => { this.adBusy = false; pauseGame(false, 'ad'); },
        },
      });
    } catch (e) { this.adBusy = false; }
  },
  rewarded(onReward) {
    if (!this.sdk) {
      // вне Яндекс Игр — тестовый режим без рекламы
      toast('Тестовый режим: реклама пропущена', 'warn');
      onReward();
      return;
    }
    if (this.adBusy) return;
    this.adBusy = true;
    let got = false;
    try {
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => pauseGame(true, 'ad'),
          onRewarded: () => { got = true; },
          onClose: () => { this.adBusy = false; pauseGame(false, 'ad'); if (got) onReward(); },
          onError: () => { this.adBusy = false; pauseGame(false, 'ad'); toast('Реклама недоступна, попробуйте позже', 'warn'); },
        },
      });
    } catch (e) { this.adBusy = false; }
  },
};

const PAUSE = new Set();
function pauseGame(on, why) {
  if (on) PAUSE.add(why); else PAUSE.delete(why);
  R.paused = PAUSE.size > 0;
  Snd.pause(R.paused);
  if (R.playing) YA.gameplay(!R.paused);
}
