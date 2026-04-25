// 템플릿 시나리오 (templates.js)
// 비스크립트 일자 + 비조건충족 일자에 마을 상태 기반 자동 생성

window.LR = window.LR || {};

LR.tpl = {
  food_status_phrase: function(state) {
    if (state.food >= 70) return '곡물 자루가 아직 어깨를 누른다';
    if (state.food >= 40) return '식량은 아직 있다, 그러나 조금씩 줄고 있다';
    if (state.food >= 20) return '창고 바닥이 보이기 시작한다';
    return '오늘 저녁의 분량이 손바닥에 들어온다';
  },

  worst_morale_character: function(state) {
    const sorted = LR.aliveChars(state).slice().sort((a,b) => a.morale - b.morale);
    return sorted[0] || null;
  },

  best_morale_character: function(state) {
    const sorted = LR.aliveChars(state).slice().sort((a,b) => b.morale - a.morale);
    return sorted[0] || null;
  },

  noise_phrase: function(state) {
    if (state.raidedLastNight) return '어젯밤 습격이 마을을 흔들었다';
    if (state.yesterdayNoise <= 20) return '어젯밤은 조용했다';
    if (state.yesterdayNoise <= 50) return '어젯밤 멀리서 발걸음 소리가 몇 번 났다';
    return '어젯밤 신음과 발소리가 새벽까지 멈추지 않았다';
  },

  season_atmosphere: function(state) {
    const s = state.season;
    if (s === 'spring_late') return '봄바람이 폐공장 창틈으로 들어온다';
    if (s === 'rainy')       return '비가 천막 위로 끊임없이 떨어진다';
    if (s === 'summer_heat') return '한낮의 열기가 모든 것을 무겁게 누른다';
    if (s === 'autumn')      return '낙엽 위로 발자국이 메마른 소리를 낸다';
    if (s === 'winter')      return '입김이 하얗게 흩어진다. 손끝이 곱는다';
    return '';
  },

  injured_list: function(state) {
    const inj = LR.aliveChars(state).filter(c => c.health < 50);
    if (inj.length === 0) return null;
    return inj.map(c => `${c.name}(${LR.healthTier(c.health).label})`).join(', ');
  },

  beacon_phase_line: function(state) {
    const def = LR.BEACON_TYPES[state.beacon.type];
    const dayInWeek = LR.beaconDayInWeek(state);
    if (state.beacon.phase === 'announce') return `${def.name} 시작 — ${def.announce}`;
    if (state.beacon.phase === 'develop') {
      const idx = Math.min(dayInWeek - 2, def.develop.length - 1);
      return `${def.name} 발전 — ${def.develop[idx]}`;
    }
    if (state.beacon.phase === 'reach') return `${def.name} 도달 — ${def.reach}`;
    if (state.beacon.phase === 'resolve_pre') return `${def.name} 결과를 기다리는 밤.`;
    return null;
  },

  spiral_line: function(state) {
    if (state.spiral.state === 'gyogam')   return '마을의 공기가 어제보다 약간 따뜻하다 (교감).';
    if (state.spiral.state === 'gyeolsok') return '마을이 단단해졌다는 감각이 있다 (결속). 침묵만으로도 사기가 오른다.';
    if (state.spiral.state === 'danhap')   return '마을이 하나로 움직인다 (단합). 외부 압박이 잠시 비껴간다.';
    return null;
  },

  precedent_shadow: function(state) {
    if (state.precedents.length === 0) return null;
    const lines = state.precedents.map(p => {
      const sign = p.type === 'neg' ? '"' + p.name + '"의 그림자가' : '"' + p.name + '"의 빛이';
      return `${sign} 마을 위에 있다 (${p.id}).`;
    });
    return lines.join(' ');
  }
};

// 템플릿 일자 시나리오 생성
LR.generateTemplatedDay = function(state) {
  const t = LR.tpl;
  const body = [];

  // 아침 오프닝
  body.push({ kind: 'narration',
    text: `${t.season_atmosphere(state)}. ${t.food_status_phrase(state)}.`
  });

  // 어젯밤 회상
  body.push({ kind: 'narration', text: t.noise_phrase(state) + '.' });

  // 부상자 보고
  const inj = t.injured_list(state);
  if (inj) {
    body.push({ kind: 'systemNote', text: '부상자: ' + inj });
  }

  // 비컨 라인
  const bl = t.beacon_phase_line(state);
  if (bl) body.push({ kind: 'narration', text: bl });

  // 사기 인물 라인
  const worst = t.worst_morale_character(state);
  if (worst && worst.morale < 40) {
    body.push({ kind: 'dialog', speaker: worst.name,
      text: '"… 오늘은 그냥 좀 가만히 있고 싶어요."' });
  }

  // 나선 라인
  const sp = t.spiral_line(state);
  if (sp) body.push({ kind: 'narration', text: sp });

  // 전례 그림자
  const ps = t.precedent_shadow(state);
  if (ps) body.push({ kind: 'systemNote', text: ps });

  // 선택지 — 마을 상태에 따라 다른 세트
  const choices = LR.generateTemplateChoices(state);

  // 제목
  let title = `Day ${state.day} — `;
  if (state.food < 20) title += '굶주림의 회계';
  else if (state.noiseToday > 50) title += '소음의 그림자';
  else if (state.spiral.state === 'gyeolsok' || state.spiral.state === 'danhap') title += '단단해지는 마을';
  else if (state.precedents.length > 0) title += '그림자 위의 하루';
  else title += '하루를 버틴다';

  return {
    id: `TPL_D${state.day}`,
    source: 'template',
    title: title,
    body: body,
    choices: choices
  };
};

// 템플릿 선택지 생성 — 상태 기반 3개 세트
LR.generateTemplateChoices = function(state) {
  const choices = [];

  // 결속·단합 시 공짜 사기 옵션
  if (LR.freeMoraleOptionsAvailable(state)) {
    choices.push({
      id: 'A', label: '조용한 모임 — 공짜 사기 (결속/단합)',
      body: '침묵 속 식사. 소음 0.',
      moraleAll: +2,
      intentionalNoise: 0
    });
  } else {
    choices.push({
      id: 'A', label: '사기 활동 — 신선식품 조리',
      body: '연료 -3, 식량 -2. 사기 +5. 소음 +15.',
      deltas: { fuel: -3, food: -2 },
      moraleAll: +5,
      intentionalNoise: 15,
      enabled: state.food >= 5 && state.fuel >= 3
    });
  }

  // 탐색 옵션 — 체력 50+면 출동 가능 (관대)
  const explorers = LR.aliveChars(state).filter(c => c.health >= 50 && c.morale >= 25);
  const lead = explorers[0];
  const foodGain = 10 + Math.floor(Math.random() * 12);
  choices.push({
    id: 'B', label: '탐색 — 식량 회수 시도',
    body: lead ? `탐색대 ${lead.name} 출동. 식량 +${foodGain} 기대. 부상 위험.` : '출동 가능 인원 없음.',
    deltas: { food: +foodGain },
    perCharDeltas: lead ? { [lead.id]: { health: -3 - Math.floor(Math.random() * 8) } } : {},
    enabled: !!lead
  });

  // 휴식 / 보존
  choices.push({
    id: 'C', label: '오늘은 휴식',
    body: '아무것도 하지 않는다. 회복은 자연 페이스.',
    moraleAll: +1
  });

  return choices;
};
