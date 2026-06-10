// Small Win 엔진 (smallwin.js)
// sec 5.7 — 3중 캡 (주간 캡 / 쿨다운 / 사기 상한 보정)
// v1.3 — 하루 최대 1건 · 가중 랜덤 선택(미발동 SW 우대, 최근 발동 SW 페널티)
//        같은 SW가 반복해서 나오는 문제를 '다양성 가중치'로 해결

window.LR = window.LR || {};

LR.trySmallWins = function(state) {
  if (!state.swMeta) state.swMeta = { weekTotal: 0 };       // 구버전 세이브 호환
  const avg = LR.avgMorale(state);
  // 사기 상한 보정 — 마을 평균 75+면 효과 50% 감소 (그러나 발동 자체는 가능)
  const dampening = avg >= 75 ? 0.5 : 1.0;

  // 주간 전체 캡 — 기획서 '주간 최대 2회'는 마을 전체 기준으로 해석
  if (state.swMeta.weekTotal >= LR.SW_WEEK_CAP) return [];

  // 1) 발동 가능 후보 수집
  const eligible = [];
  for (const id of Object.keys(LR.SMALL_WIN_DEFS)) {
    const cd = state.smallWins[id] || (state.smallWins[id] = { lastFired: 0, weekCount: 0 });  // 신규 SW(구버전 세이브) 자동 초기화
    // 쿨다운 — 같은 SW의 단기 재발동 차단 (반복감의 주범이라 기본값보다 길게)
    const cool = Math.max(LR.SW_COOLDOWN_DAYS, 5);
    if (cd.lastFired && state.day - cd.lastFired < cool) continue;
    if (cd.weekCount >= LR.SW_WEEK_CAP) continue;

    const def = LR.SMALL_WIN_DEFS[id];
    if (!def.canFire(state)) continue;

    // 2) 다양성 가중치 — 한 번도 안 나온 SW는 ×3, 최근에 나왔던 SW일수록 작게
    let w = 1.0;
    if (!cd.lastFired) w = 3.0;
    else w = Math.min(2.0, 0.3 + (state.day - cd.lastFired) * 0.15);
    eligible.push({ id, def, cd, w });
  }
  if (eligible.length === 0) return [];

  // 3) 하루 1건만 — 가중 랜덤으로 뽑는다
  let r = Math.random() * eligible.reduce((sum, e) => sum + e.w, 0);
  let pick = eligible[0];
  for (const e of eligible) {
    r -= e.w;
    if (r <= 0) { pick = e; break; }
  }

  // 4) 발동
  const result = pick.def.apply(state);
  pick.cd.lastFired = state.day;
  pick.cd.weekCount += 1;
  state.swMeta.weekTotal += 1;
  return [{
    id: pick.id,
    name: pick.def.name,
    text: pick.def.text,
    noise: result.noise || 0,
    targetName: result.targetName,
    dampening: dampening
  }];
};

// 주간 카운터 리셋 (D8, D15, D22, D29 시작 시 호출)
LR.resetWeeklySmallWinCounters = function(state) {
  for (const id of Object.keys(state.smallWins)) {
    state.smallWins[id].weekCount = 0;
  }
  if (state.swMeta) state.swMeta.weekTotal = 0;
  else state.swMeta = { weekTotal: 0 };
};
