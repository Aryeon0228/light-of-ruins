// 게임 루프 (loop.js)
// 일일 흐름: morning → 시나리오 표시 → 선택지 클릭 → 결과 적용 → 다음 날

window.LR = window.LR || {};

LR.engine = LR.engine || {};

// ─── 게임 시작 ───
LR.engine.startNewGame = function() {
  LR.state = LR.createInitialState();
  // 비컨 첫 주
  LR.state.beacon.weekIndex = 0;
  LR.state.beacon.type = LR.BEACON_ROTATION[0];
  LR.state.beacon.weekStartDay = 1;
  LR.state.beacon.phase = 'announce';
  LR.state.beacon.forcedPartial = true;

  LR.engine.beginDay();
};

// ─── 하루 시작 ───
// 매일 호출되며, 오늘 표시할 시나리오 노드를 결정하고 렌더링
LR.engine.beginDay = function() {
  const state = LR.state;
  if (state.ending) {
    LR.render.showEnding(state);
    return;
  }

  // 비컨 단계 갱신
  LR.tickBeacon(state);

  // TI · 식량 구간 · 평균 사기 등 일일 휘발 상태 계산
  LR.engine.recomputeDerived(state);

  // 시나리오 선택
  const node = LR.selectScenarioNode(state);
  state.pendingChoice = node;
  state.awaitingChoice = true;

  // 최근 시나리오 추적 (반복 방지)
  state.recentScenarios.push(node.id);
  if (state.recentScenarios.length > 4) state.recentScenarios.shift();

  LR.render.renderAll(state);
};

LR.engine.recomputeDerived = function(state) {
  state.TI = LR.computeTI(state);
  // 위기·이완 연속 일수
  if (state.TI <= 25) {
    state.releaseStreak = (state.releaseStreak || 0) + 1;
    state.crisisStreak = 0;
  } else if (state.TI >= 51) {
    state.crisisStreak = (state.crisisStreak || 0) + 1;
    state.releaseStreak = 0;
  } else {
    state.releaseStreak = 0;
    state.crisisStreak = 0;
  }
  if (state.rescueCooldown > 0) state.rescueCooldown -= 1;
};

// ─── 선택지 적용 ───
LR.engine.applyChoice = function(choiceId) {
  const state = LR.state;
  const node = state.pendingChoice;
  if (!node) return;
  const choice = node.choices.find(c => c.id === choiceId);
  if (!choice) return;

  // 1. 기본 자원 델타
  if (choice.deltas) {
    for (const k in choice.deltas) {
      state[k] = (state[k] || 0) + choice.deltas[k];
      if (k === 'food' || k === 'water' || k === 'fuel') state[k] = Math.max(0, Math.min(100, state[k]));
      if (k === 'medicine') state[k] = Math.max(0, state[k]);
    }
  }

  // 2. 인물별 델타
  let perChar = choice.perCharDeltas;
  if (typeof perChar === 'function') perChar = perChar(state);
  if (perChar) {
    for (const id in perChar) {
      const c = state.characters[id];
      if (!c) continue;
      const d = perChar[id];
      if (d.health !== undefined) c.health = Math.max(0, Math.min(100, c.health + d.health));
      if (d.morale !== undefined) c.morale = Math.max(0, Math.min(100, c.morale + d.morale));
      if (d.contagionRisk) c.flags.contagion = true;
    }
  }

  // 3. 마을 전체 사기
  if (choice.moraleAll) {
    for (const c of LR.aliveChars(state)) {
      c.morale = Math.max(0, Math.min(100, c.morale + choice.moraleAll));
    }
  }

  // 4. 의도적 소음
  const intentionalNoise = choice.intentionalNoise || 0;
  state.yesterdayNoise = state.noiseToday;
  state.noiseToday = LR.computeNoise(state, intentionalNoise);

  // 5. 비컨 자원 투입 기록
  if (choice.beaconInvest) {
    state.beacon.investedFood += choice.beaconInvest.food || 0;
    state.beacon.investedFuel += choice.beaconInvest.fuel || 0;
  }

  // 6. 플래그
  if (choice.flags) {
    Object.assign(state, { flags: Object.assign(state.flags || {}, choice.flags) });
  }

  // 7. 전례 후보 생성 시도
  if (choice.precedentCandidate) {
    const newPrec = LR.tryGeneratePrecedent(state, choice.precedentCandidate);
    if (newPrec) {
      LR.render.toast(`${newPrec.id} 생성 — ${newPrec.name}`,
                      newPrec.type === 'neg' ? 'precedent-neg' : 'precedent-pos');
    }
  }

  // 8. 스크립트 데이 특수 효과
  if (node.yeongsuDies) {
    const y = state.characters.yeongsu;
    if (y.alive) {
      y.alive = false;
      y.health = 0;
      y.morale = 0;
      y.status = 'dead';
      LR.render.toast('영수 사망 — Day ' + state.day, 'raid');
      // 마을 사기 -15 전체
      for (const c of LR.aliveChars(state)) c.morale = Math.max(0, c.morale - 5);
    }
  }
  if (choice.babyBorn) {
    state.baby.exists = true;
    state.baby.bornDay = state.day;
    state.characters.miyeon.hasBaby = true;
    LR.render.toast('아기 출생 — 통제 불가 소음원 +10/일', 'beacon');
  }

  // 9. 비컨 D7 자동 해소 — 결과는 다음날 시나리오 상단에 표시되도록 저장
  const dayInWeek = LR.beaconDayInWeek(state);
  if (dayInWeek === 7) {
    const result = LR.resolveBeacon(state);
    const label = { full:'완전 성공', partial:'부분 성공', fail:'실패', frustration:'좌절' }[result.result];
    LR.render.toast(`비컨 ${label} — ${LR.BEACON_TYPES[result.type].name}`, 'beacon');
    // 다음 일자 시나리오 상단에 표시할 비컨 결과
    state.pendingBeaconResolution = {
      type: result.type,
      result: result.result,
      text: result.text,
      label: label
    };
  }

  // 10. Small Win 시도
  const fired = LR.trySmallWins(state);
  for (const sw of fired) {
    LR.render.toast(`${sw.id} — ${sw.name}`, 'smallwin');
  }

  // 11. 일일 마감 → 다음 날
  state.awaitingChoice = false;

  // 11a. SW 컷씬이 있으면 컷씬 끝난 뒤 endOfDay
  const cutsceneSW = fired.find(sw => LR.SMALL_WIN_DEFS[sw.id] && LR.SMALL_WIN_DEFS[sw.id].cutscene);
  if (cutsceneSW) {
    LR.cutscene.play(LR.SMALL_WIN_DEFS[cutsceneSW.id].cutscene, () => LR.engine.endOfDay());
  } else {
    LR.engine.endOfDay();
  }
};

LR.engine.endOfDay = function() {
  const state = LR.state;

  // 일일 식량 소비 (인원수 기반) — 신선식량이 부족하면 비축식 사용
  const aliveCount = LR.aliveChars(state).length;
  let need = aliveCount;
  const fromFresh = Math.min(state.food, need);
  state.food -= fromFresh; need -= fromFresh;
  if (need > 0 && state.driedFood > 0) {
    const fromDried = Math.min(state.driedFood, need);
    state.driedFood -= fromDried; need -= fromDried;
  }
  if (need > 0 && state.pickledFood > 0) {
    const fromPickle = Math.min(state.pickledFood, need);
    state.pickledFood -= fromPickle; need -= fromPickle;
  }
  if (state.season === 'winter') {
    state.fuel = Math.max(0, state.fuel - 2);  // 겨울 추가 소비
  }

  // 식량 부족 효과 — 모든 보유 식량(신선+비축) 합산 기준
  const totalFood = state.food + state.driedFood + state.pickledFood;
  const foodTier = LR.foodTier(totalFood);
  if (foodTier.tier === 'famine' || need > 0) {
    // 신선+비축으로도 부족 → 기근
    for (const c of LR.aliveChars(state)) {
      c.health = Math.max(0, c.health - 4);
      c.morale = Math.max(0, c.morale - 8);
    }
  } else if (foodTier.tier === 'crisis') {
    // 체력 회복 속도 50% 감소는 회복 단계에서
  }

  // 회복 단계 — 마을 평균 + 전례 보정
  const avg = LR.avgMorale(state);
  const villageMul = LR.villageMoraleMultiplier(state.spiral.state, avg);
  for (const c of LR.aliveChars(state)) {
    const recMul = LR.recoveryMultiplier(state, c) * villageMul;
    // 휴식: +5/일, 충분한 식사: +3/일, 사기 회복: +2/일
    if (c.health < 100 && totalFood >= 40 * 0.5) {
      const heal = Math.round((5 + 3) * recMul * (foodTier.tier === 'crisis' ? 0.5 : 1));
      c.health = Math.min(100, c.health + heal);
    }
    if (c.morale < 100) {
      const moraleHeal = Math.round(2 * recMul);
      c.morale = Math.min(100, c.morale + moraleHeal);
    }
  }
  // 사망 처리 (별도 패스 — 회복 후 체력 0이면 사망)
  for (const id of LR.CHARACTER_ORDER) {
    const c = state.characters[id];
    if (c.alive && c.health <= 0) {
      c.alive = false;
      c.health = 0;
      c.status = 'dead';
      for (const o of LR.aliveChars(state)) o.morale = Math.max(0, o.morale - 5);
      LR.render.toast(`${c.name} 사망 — Day ${state.day}`, 'raid');
    } else if (c.alive) {
      const ht = LR.healthTier(c.health);
      c.status = ht.tier;
    }
  }

  // 상승 나선 갱신
  const spChange = LR.updateSpiral(state);
  if (spChange.changed) {
    if (spChange.next !== 'none') {
      LR.render.toast(`상승 나선 진입: ${LR.SPIRAL_LABELS[spChange.next]}`, 'spiral');
    }
  }

  // 어제 소음 → 오늘 새벽 습격 판정
  const raidProb = LR.raidProbability(state.noiseToday);
  state.raidedLastNight = Math.random() < raidProb.p;
  if (state.raidedLastNight) {
    // 피해
    const targets = LR.aliveChars(state).filter(c => c.role === '행동가' || c.role === '리더');
    const victim = targets[Math.floor(Math.random() * targets.length)] || LR.aliveChars(state)[0];
    if (victim) {
      const dmg = Math.floor(15 + Math.random() * 25);
      victim.health = Math.max(0, victim.health - dmg);
      state.raidLastNightSummary = `${raidProb.scale} 습격. ${victim.name} 체력 -${dmg}.`;
      LR.render.toast(`습격 — ${victim.name} 부상`, 'raid');
    }
  } else {
    state.raidLastNightSummary = null;
  }

  // 일일 로그
  state.log.push({
    day: state.day,
    food: state.food,
    avgMorale: Math.round(avg),
    noise: state.noiseToday,
    raided: state.raidedLastNight,
    spiral: state.spiral.state,
    precedents: state.precedents.length,
    survivors: LR.aliveChars(state).length
  });
  if (state.log.length > 35) state.log.shift();

  // 자동 저장
  if (LR.save) LR.save.auto(state);

  // 엔딩 판정
  const ending = LR.checkEnding(state);
  if (ending) {
    state.ending = ending;
    LR.render.showEnding(state);
    return;
  }

  // 다음 날
  state.day += 1;
  state.season = LR.seasonOnDay(state.day);
  state.pendingChoice = null;
  state.awaitingChoice = false;

  setTimeout(() => LR.engine.beginDay(), 350);
};
