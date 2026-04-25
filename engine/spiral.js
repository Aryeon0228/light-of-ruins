// 상승 나선 (spiral.js)
// sec 2.4 — 교감 → 결속 → 단합 (연속 일수 조건)

window.LR = window.LR || {};

LR.SPIRAL_STAGES = ['none','gyogam','gyeolsok','danhap'];
LR.SPIRAL_LABELS = {
  none: '미활성',
  gyogam: '교감',
  gyeolsok: '결속',
  danhap: '단합'
};

// 매일 종료 시 호출. 마을 평균 사기와 연속 일수 추적, 단계 전이.
LR.updateSpiral = function(state) {
  const avg = LR.avgMorale(state);
  const sp = state.spiral;

  // 평균 사기 히스토리 갱신 (최근 5일)
  sp.avgMoraleHistory.push(avg);
  if (sp.avgMoraleHistory.length > 7) sp.avgMoraleHistory.shift();

  // 빈사·붕괴자 카운트 (단합 진입 invariant)
  let nearDeath = 0;
  for (const c of LR.aliveChars(state)) {
    if (c.health < 20) nearDeath++;
    if (c.morale < 25) nearDeath++;
  }

  // 연속 일수 카운터 갱신
  if (avg >= 60) sp.streak60 = (sp.streak60 || 0) + 1; else sp.streak60 = 0;
  if (avg >= 65) sp.streak65 = (sp.streak65 || 0) + 1; else sp.streak65 = 0;
  if (avg >= 70 && nearDeath === 0) sp.streak70 = (sp.streak70 || 0) + 1; else sp.streak70 = 0;

  const prev = sp.state;
  let next = 'none';
  if (sp.streak70 >= 3) next = 'danhap';
  else if (sp.streak65 >= 3) next = 'gyeolsok';
  else if (sp.streak60 >= 2) next = 'gyogam';

  if (next !== prev) {
    sp.state = next;
    sp.enteredDay = state.day;
    return { changed: true, prev: prev, next: next };
  }
  return { changed: false, prev: prev, next: next };
};

LR.spiralActive = function(state) {
  return state.spiral.state !== 'none';
};

// 결속·단합 시 내부 압박 억제 비율 (sec 2.4)
LR.internalPressureSuppressionRate = function(state) {
  if (state.spiral.state === 'danhap') return 1.0;       // -100%
  if (state.spiral.state === 'gyeolsok') return 0.5;     // -50%
  return 0;
};

// 결속·단합 공짜 사기 옵션 활성 여부
LR.freeMoraleOptionsAvailable = function(state) {
  return state.spiral.state === 'gyeolsok' || state.spiral.state === 'danhap';
};
