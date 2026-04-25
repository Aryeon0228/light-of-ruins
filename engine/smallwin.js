// Small Win 엔진 (smallwin.js)
// sec 5.7 — 3중 캡 (주간 캡 / 쿨다운 / 사기 상한 보정)

window.LR = window.LR || {};

LR.trySmallWins = function(state) {
  const fired = [];
  const avg = LR.avgMorale(state);
  // 사기 상한 보정 — 마을 평균 75+면 효과 50% 감소 (그러나 발동 자체는 가능)
  // 여기서는 우선 발동만 제어 (적용은 apply에서)
  const dampening = avg >= 75 ? 0.5 : 1.0;

  for (const id of ['SW1','SW2','SW3','SW4','SW5']) {
    const cd = state.smallWins[id];
    if (state.day - cd.lastFired < LR.SW_COOLDOWN_DAYS) continue;
    if (cd.weekCount >= LR.SW_WEEK_CAP) continue;

    const def = LR.SMALL_WIN_DEFS[id];
    if (!def.canFire(state)) continue;

    // 발동
    const result = def.apply(state);
    cd.lastFired = state.day;
    cd.weekCount += 1;
    fired.push({
      id: id,
      name: def.name,
      text: def.text,
      noise: result.noise || 0,
      targetName: result.targetName,
      dampening: dampening
    });
  }
  return fired;
};

// 주간 카운터 리셋 (D8, D15, D22, D29 시작 시 호출)
LR.resetWeeklySmallWinCounters = function(state) {
  for (const id of ['SW1','SW2','SW3','SW4','SW5']) {
    state.smallWins[id].weekCount = 0;
  }
};
