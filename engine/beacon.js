// 비컨 7일 사이클 (beacon.js)
// sec 6.4 — D1 예고 → D2~3 발전 → D4~5 도달 → D6~7 해소

window.LR = window.LR || {};

// 비컨 사이클: D1, D8, D15, D22, D29 시작
// 30일 게임에서는 4주 + 일부 = 4번의 비컨 + D29의 미완 비컨
LR.BEACON_ROTATION = ['comm','supply','refugee','comm','supply'];  // 첫 주는 통신(약한 신호)

LR.beaconDayInWeek = function(state) {
  return state.day - state.beacon.weekStartDay + 1;  // 1..7
};

LR.beaconPhaseForDay = function(dayInWeek) {
  if (dayInWeek === 1) return 'announce';
  if (dayInWeek <= 3)  return 'develop';
  if (dayInWeek <= 5)  return 'reach';
  if (dayInWeek === 6) return 'resolve_pre';
  return 'resolve';
};

// 매일 호출 — 비컨 단계 갱신, 새 주 시작 시 새 비컨 시작
LR.tickBeacon = function(state) {
  const b = state.beacon;
  const dayInWeek = LR.beaconDayInWeek(state);

  if (dayInWeek > 7 || dayInWeek < 1) {
    // 새 주 시작
    b.weekStartDay = state.day;
    b.weekIndex += 1;
    b.type = LR.BEACON_ROTATION[Math.min(b.weekIndex, LR.BEACON_ROTATION.length - 1)];
    b.phase = 'announce';
    b.investedFood = 0;
    b.investedFuel = 0;
    b.forcedPartial = false;  // 첫 주만 강제 부분성공
    b.lastResolvedText = null;
    LR.resetWeeklySmallWinCounters(state);
    return;
  }

  b.phase = LR.beaconPhaseForDay(dayInWeek);
};

// D7 해소 처리 (게임 루프에서 별도 호출)
LR.resolveBeacon = function(state) {
  const b = state.beacon;
  let result;
  if (b.forcedPartial) {
    result = 'partial';   // 첫 주 약한 신호 — 부분성공 고정
  } else {
    const score = LR.beaconScore(state);
    result = LR.beaconJudgment(score);
  }
  const def = LR.BEACON_TYPES[b.type];
  b.lastResolvedText = def.resolve[result];
  LR.applyBeaconResult(state, result);
  return { result: result, type: b.type, text: b.lastResolvedText };
};

// 도달 단계(D4~5) — 자원 투입 옵션 텍스트
LR.beaconReachOptions = function(state) {
  const b = state.beacon;
  const def = LR.BEACON_TYPES[b.type];
  return {
    title: `${def.name} — 도달 단계`,
    body: def.reach,
    canInvestFood: state.food >= 5,
    canInvestFuel: state.fuel >= 5
  };
};
