// 앰비언스 (ambience.js) — 에셋 없이 Web Audio로 합성하는 미니멀 환경음
//  · 빗소리: 비 오는 날(LR.weatherOn === 'rain')에만 — 노이즈 + 로우패스
//  · 모닥불: 마을 화면이 열려 있는 동안 낮게 — 저역 노이즈 + 불규칙한 크래클
//  · 심장박동: 오늘 밤 습격 확률 60%+ — 시스템1 긴장 신호
//  브라우저 정책상 첫 클릭 이후에 시작. 🔊 버튼으로 켜고 끔(설정 저장).

window.LR = window.LR || {};

LR.ambience = {
  enabled: (function() { try { return localStorage.getItem('lr_ambience') !== 'off'; } catch (e) { return true; } })(),
  _ctx: null,
  _rain: null,
  _fire: null,
  _crackleTimer: null,
  _heartTimer: null,
  _bgm: null,
  _bgmStarted: false,
  _bgmFailed: false,

  // ─── 초기화 (첫 사용자 입력 후) ───
  _ensure: function() {
    if (this._ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this._ctx = new AC();

    // 공용 노이즈 버퍼 (2초 화이트노이즈 루프)
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;

    // 빗소리 — 노이즈 → 로우패스 1200Hz
    this._rain = this._makeNoiseVoice(1200);
    // 모닥불 베이스 — 노이즈 → 로우패스 220Hz (깊은 웅웅거림)
    this._fire = this._makeNoiseVoice(220);
    // 불꽃 크래클 — 불규칙한 짧은 틱
    this._scheduleCrackle();
    return true;
  },

  _makeNoiseVoice: function(cutoff) {
    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start();
    return { gain: gain };
  },

  // 모닥불 크래클 — 무작위 간격의 아주 짧은 고역 틱
  _scheduleCrackle: function() {
    const self = this;
    function tick() {
      if (self._ctx && self.enabled && self._fireOn) {
        const ctx = self._ctx;
        const src = ctx.createBufferSource();
        src.buffer = self._noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 2500;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.02 + Math.random() * 0.025, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + 0.12);
      }
      self._crackleTimer = setTimeout(tick, 120 + Math.random() * 700);
    }
    tick();
  },

  // 심장박동 — 쿵-쿵(60Hz 사인 두 번), 긴장의 맥박
  _heartBeat: function() {
    if (!this._ctx || !this.enabled) return;
    const ctx = this._ctx;
    const thump = (at, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 58;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(at); osc.stop(at + 0.3);
    };
    const t = ctx.currentTime;
    thump(t, 0.09);
    thump(t + 0.28, 0.06);
  },

  // ─── 상태 동기화 — 매 렌더마다 호출 ───
  update: function(state) {
    if (!this.enabled || !this._ctx || !state) return;
    const t = this._ctx.currentTime;
    // 빗소리 — 실제 비 오는 날만
    const raining = LR.weatherOn ? LR.weatherOn(state) === 'rain' : false;
    this._rain.gain.gain.setTargetAtTime(raining ? 0.085 : 0, t, 0.8);
    // 모닥불 — 마을 화면이 열려 있을 때 낮게
    const scr = document.getElementById('villageScreen');
    this._fireOn = !!(scr && scr.classList.contains('active'));
    this._fire.gain.gain.setTargetAtTime(this._fireOn ? 0.035 : 0, t, 0.6);
    // 심장박동 — 오늘 밤 습격 확률 60%+
    const threat = LR.raidProbability(state.noiseToday).p >= 0.6;
    if (threat && !this._heartTimer) {
      const self = this;
      this._heartTimer = setInterval(() => self._heartBeat(), 1300);
    } else if (!threat && this._heartTimer) {
      clearInterval(this._heartTimer);
      this._heartTimer = null;
    }
  },

  _silenceAll: function() {
    if (this._heartTimer) { clearInterval(this._heartTimer); this._heartTimer = null; }
    this._stopBgm();
    if (!this._ctx) return;
    const t = this._ctx.currentTime;
    this._rain.gain.gain.setTargetAtTime(0, t, 0.1);
    this._fire.gain.gain.setTargetAtTime(0, t, 0.1);
  },

  // ─── 배경음악 (assets/audio/bgm.mp3 가 있으면 루프 재생, 없으면 조용히 무시) ───
  _startBgm: function() {
    if (!this.enabled || this._bgmStarted || this._bgmFailed) return;
    if (!this._bgm) {
      this._bgm = new Audio('assets/audio/bgm.mp3');
      this._bgm.loop = true; this._bgm.preload = 'auto'; this._bgm.volume = 0;
      this._bgm.addEventListener('error', () => { this._bgmFailed = true; this._bgm = null; });
    }
    const el = this._bgm; if (!el) return;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});   // 자동재생 차단 시 다음 제스처에서 재시도됨
    this._bgmStarted = true;
    let v = 0; el.volume = 0;
    clearInterval(this._bgmFade);
    this._bgmFade = setInterval(() => {
      v = Math.min(0.3, v + 0.03);
      if (this._bgm) this._bgm.volume = v;
      if (v >= 0.3) clearInterval(this._bgmFade);
    }, 120);
  },
  _stopBgm: function() {
    this._bgmStarted = false;
    clearInterval(this._bgmFade);
    if (this._bgm) { try { this._bgm.pause(); } catch (e) {} }
  },

  // ─── UI 클릭음 (버튼·선택지) — 짧은 절차적 블립 ───
  clickUI: function() {
    if (!this.enabled || !this._ensure()) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const mk = (freq, dur, type, vol) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    };
    mk(520, 0.07, 'triangle', 0.05);
    mk(780, 0.05, 'sine', 0.02);
  },

  _updateButtons: function() {
    const ic = this.enabled ? '🔊' : '🔇';
    document.querySelectorAll('.sound-toggle, #vhSound').forEach(b => {
      b.textContent = ic; b.classList.toggle('muted', !this.enabled);
    });
  },

  toggle: function() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('lr_ambience', this.enabled ? 'on' : 'off'); } catch (e) {}
    if (this.enabled) {
      if (this._ensure() && this._ctx.state === 'suspended') this._ctx.resume();
      this._startBgm();
      this.update(LR.state || (LR.village && LR.village.state));
    } else {
      this._silenceAll();
    }
    this._updateButtons();
    return this.enabled;
  }
};

// 첫 사용자 입력에서 오디오 컨텍스트 기동 + 배경음악 시작 (브라우저 자동재생 정책)
document.addEventListener('pointerdown', function bootAmbience() {
  if (LR.ambience.enabled) {
    if (LR.ambience._ensure() && LR.ambience._ctx.state === 'suspended') LR.ambience._ctx.resume();
    LR.ambience._startBgm();
    LR.ambience.update(LR.state || (LR.village && LR.village.state));
  }
  document.removeEventListener('pointerdown', bootAmbience);
});

// 버튼·선택지 클릭음(델리게이트) + 사운드 토글 버튼 와이어링
document.addEventListener('DOMContentLoaded', () => {
  LR.ambience._updateButtons();
  document.addEventListener('click', (e) => {
    if (e.target.closest('.sound-toggle, #vhSound')) return;   // 토글 자체는 클릭음 제외
    if (e.target.closest('button, .vd-choice, .vh-pill, .collection-card, .vh-hot')) LR.ambience.clickUI();
  }, true);
  document.querySelectorAll('.sound-toggle').forEach(b =>
    b.addEventListener('click', (e) => { e.stopPropagation(); LR.ambience.toggle(); }));
});
