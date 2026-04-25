// Drama Manager (drama.js)
// sec 6.2 — 3계층 우선순위로 시나리오 선택

window.LR = window.LR || {};

LR.selectScenarioNode = function(state) {
  // ── Tier 1: 비컨 강제 슬롯 (D1 예고, D7 해소는 스크립트와 함께) ──
  // 비컨 D1과 D7은 스크립트 데이가 있으면 스크립트가 우선
  // 스크립트가 없는 비컨 사이클(2~5주)에서는 비컨이 announce/resolve 단계일 때 비컨 노드

  // ── Tier 1.5: 스크립트 데이 (가장 우선) ──
  const scripted = LR.scriptedDayFor(state.day);
  if (scripted) return scripted;

  // ── 비컨 announce / resolve 단계 (스크립트 없을 때) ──
  if (state.beacon.phase === 'announce' || state.beacon.phase === 'resolve') {
    return LR.beaconScenarioNode(state);
  }

  // ── Tier 2: 교차 이벤트 5.1~5.6 ──
  const eligible = LR.eligibleCrossEvents(state)
    .filter(e => !state.recentScenarios.includes(e.id));
  if (eligible.length > 0) {
    // 가중치 기반 픽
    const totalW = eligible.reduce((s, e) => s + (e.weight || 1), 0);
    let r = Math.random() * totalW;
    for (const e of eligible) {
      r -= (e.weight || 1);
      if (r <= 0) return e;
    }
    return eligible[0];
  }

  // ── Tier 2.5: 비컨 develop / reach ──
  if (state.beacon.phase === 'develop' || state.beacon.phase === 'reach') {
    return LR.beaconScenarioNode(state);
  }

  // ── Tier 3: TI 기반 ──
  const ti = state.TI;
  if (ti >= 76 && state.rescueCooldown === 0) {
    return LR.tiRescueNode(state);
  }
  if (ti >= 51 && state.crisisStreak >= 2 && state.rescueCooldown === 0) {
    return LR.tiRescueNode(state);
  }
  if (ti <= 25 && state.releaseStreak >= 3) {
    return LR.tiPressureNode(state);
  }

  // ── Fallback: 템플릿 데이 ──
  return LR.generateTemplatedDay(state);
};

// 비컨 시나리오 노드
LR.beaconScenarioNode = function(state) {
  const def = LR.BEACON_TYPES[state.beacon.type];
  const dayInWeek = LR.beaconDayInWeek(state);
  const phase = state.beacon.phase;

  let title = `Day ${state.day} — ${def.name}`;
  let body = [];
  let choices = [];

  if (phase === 'announce') {
    title += ' · 예고';
    body.push({ kind: 'narration', text: def.announce });
    body.push({ kind: 'narration', text: '오늘은 평범하게 운영하면서 신호를 모은다.' });
    choices = LR.generateTemplateChoices(state);
  } else if (phase === 'develop') {
    title += ' · 발전';
    const idx = Math.min(dayInWeek - 2, def.develop.length - 1);
    body.push({ kind: 'narration', text: def.develop[idx] });
    choices = LR.generateTemplateChoices(state);
  } else if (phase === 'reach') {
    title += ' · 도달';
    body.push({ kind: 'narration', text: def.reach });
    body.push({ kind: 'systemNote', text: '자원을 투입하면 성공 확률이 오릅니다.' });
    choices = [
      { id: 'A', label: '자원 적극 투입 (식량 -5, 연료 -5)',
        body: '비컨 성공도 +30. 즉각적 식량/연료 손실.',
        deltas: { food: -5, fuel: -5 },
        beaconInvest: { food: 5, fuel: 5 },
        enabled: state.food >= 5 && state.fuel >= 5 },
      { id: 'B', label: '소액 투입 (식량 -2)',
        body: '비컨 성공도 +6. 안전한 절충.',
        deltas: { food: -2 },
        beaconInvest: { food: 2, fuel: 0 },
        enabled: state.food >= 2 },
      { id: 'C', label: '투입 없이 대기',
        body: '비컨은 자연 점수로만 판정.',
        deltas: {} }
    ];
  } else if (phase === 'resolve' || phase === 'resolve_pre') {
    // 해소 단계 — 자동 해소 처리는 게임 루프에서. 여기서는 결과 텍스트 표시.
    title += ' · 해소';
    if (state.beacon.lastResolvedText) {
      body.push({ kind: 'narration', text: state.beacon.lastResolvedText });
    } else {
      body.push({ kind: 'narration', text: '결과를 기다리는 밤. 마을의 모든 시선이 라디오 쪽으로 향한다.' });
    }
    choices = LR.generateTemplateChoices(state);
  }

  return {
    id: `BEACON_${state.beacon.type}_W${state.beacon.weekIndex}_${phase}`,
    source: 'beacon',
    title: title,
    body: body,
    choices: choices,
    isBeaconNode: true
  };
};

// TI 구원 이벤트
LR.tiRescueNode = function(state) {
  return {
    id: `RESCUE_D${state.day}`,
    source: 'rescue',
    title: `Day ${state.day} — 보급품 소문`,
    body: [
      { kind: 'narration', text: '긴장이 정점에 다다른 마을. 그때 누군가 외곽에서 보급품 더미를 봤다고 보고한다.' },
      { kind: 'systemNote', text: '구원 이벤트 — 위기·궤멸 구간 발동. 단, 공짜는 없다.' }
    ],
    choices: [
      { id: 'A', label: '탐색대 즉시 파견',
        body: '식량 +20, 의약품 +1. 탐색원 부상 위험.',
        deltas: { food: +20, medicine: +1 },
        perCharDeltas: { hayeong: { health: -10 } },
        flags: { rescueTriggered: true } },
      { id: 'B', label: '신중한 정찰 후 결정',
        body: '식량 +10. 안전 우선.',
        deltas: { food: +10 },
        flags: { rescueTriggered: true } },
      { id: 'C', label: '소문 무시',
        body: '아무 일 없이 하루.',
        moraleAll: -2 }
    ]
  };
};

// TI 외부 압박 이벤트
LR.tiPressureNode = function(state) {
  const opts = ['water_pollution', 'zombie_pass', 'cache_rumor'];
  const choice = opts[Math.floor(Math.random() * opts.length)];

  if (choice === 'water_pollution') {
    return {
      id: `PRESSURE_WATER_D${state.day}`,
      source: 'tiEvent',
      title: `Day ${state.day} — 물 오염`,
      body: [
        { kind: 'narration', text: '아침에 길어 온 물이 탁하다. 상류에서 무언가 흘러내린 모양이다. 물 자원 50% 손실.' }
      ],
      choices: [
        { id: 'A', label: '의료용 물만 분리 보존',
          body: '음용·조리용 물 손실. 위생 부담 증가.',
          deltas: { water: -15 },
          moraleAll: -2 },
        { id: 'B', label: '연료를 써서 끓여 사용',
          body: '연료 -3. 물 손실 최소화. 소음 +5.',
          deltas: { water: -5, fuel: -3 },
          intentionalNoise: 5 },
        { id: 'C', label: '탐색대로 새 수원 찾기',
          body: '연료 -2. 시간 소비. 운에 맡긴다.',
          deltas: { water: -8, fuel: -2 } }
      ]
    };
  }
  if (choice === 'zombie_pass') {
    return {
      id: `PRESSURE_ZOMBIE_D${state.day}`,
      source: 'tiEvent',
      title: `Day ${state.day} — 좀비 통과`,
      body: [
        { kind: 'narration', text: '망원경에 좀비 무리가 마을 외곽을 천천히 지나가는 것이 보인다. 대규모. 조용히 있어야 한다.' }
      ],
      choices: [
        { id: 'A', label: '완전 침묵 — 모든 활동 정지',
          body: '소음 0. 사기 -3.',
          moraleAll: -3 },
        { id: 'B', label: '소량 활동만 유지',
          body: '소음 약간. 활동 유지.',
          moraleAll: -1,
          intentionalNoise: 5 },
        { id: 'C', label: '평소대로 — 위험 감수',
          body: '평상 운영. 큰 위험.',
          intentionalNoise: 15 }
      ]
    };
  }
  // cache_rumor
  return {
    id: `PRESSURE_CACHE_D${state.day}`,
    source: 'tiEvent',
    title: `Day ${state.day} — 폐기물 발견 소문`,
    body: [
      { kind: 'narration', text: '근처 폐기물 더미에 비축 식량이 있을 수 있다는 소문. 기대감이 마을에 잠시 번진다.' }
    ],
    choices: [
      { id: 'A', label: '탐색 — 기대 vs 위험',
        body: '식량 +5~+15. 부상 위험.',
        deltas: { food: +Math.floor(5 + Math.random() * 10) },
        perCharDeltas: { hayeong: { health: -5 } },
        moraleAll: +1 },
      { id: 'B', label: '소문 확인만 — 정찰',
        body: '식량 +3.',
        deltas: { food: +3 } },
      { id: 'C', label: '관심 끄고 평소대로',
        body: '아무 일 없음.' }
    ]
  };
};
