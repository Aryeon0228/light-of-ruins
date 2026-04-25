// 저장 / 불러오기 (save.js)
// localStorage 단일 슬롯 + 매일 자동 저장

window.LR = window.LR || {};

LR.save = LR.save || {};

LR.SAVE_KEY = 'light-of-ruins.v1.auto';

LR.save.auto = function(state) {
  try {
    const blob = JSON.stringify({ v: 1, ts: Date.now(), state: state });
    localStorage.setItem(LR.SAVE_KEY, blob);
  } catch (e) {
    console.warn('저장 실패:', e);
  }
};

LR.save.manual = function(state) {
  LR.save.auto(state);
  LR.render.toast('수동 저장 완료', 'beacon');
};

LR.save.load = function() {
  try {
    const raw = localStorage.getItem(LR.SAVE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.v !== 1) return null;
    return obj.state;
  } catch (e) {
    console.warn('불러오기 실패:', e);
    return null;
  }
};

LR.save.has = function() {
  return !!localStorage.getItem(LR.SAVE_KEY);
};

LR.save.clear = function() {
  localStorage.removeItem(LR.SAVE_KEY);
};
