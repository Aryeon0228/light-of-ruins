// 게임 상태 모델 (state.js)
// 단일 LR.state 객체로 모든 게임 상태를 보관. JSON 직렬화 가능.

window.LR = window.LR || {};

LR.SEASONS = {
  spring_late:  { name: '봄 후반', noiseMod: 1.0, foodDecay: 1.0 },
  rainy:        { name: '장마',   noiseMod: 0.5, foodDecay: 2.0 },
  summer_heat:  { name: '폭염',   noiseMod: 1.0, foodDecay: 2.0 },
  autumn:       { name: '가을',   noiseMod: 1.3, foodDecay: 1.0 },
  winter:       { name: '겨울',   noiseMod: 1.0, foodDecay: 1.0, fuelDouble: true }
};

// 30일 게임의 계절 배치
// 봄(D1~9) → 장마(D10~13) → 가을(D14~19) → 겨울(D20~30)
// 가을편/겨울편 스크립트 데이가 D14~16, D24~26에 떨어지도록 배치
LR.seasonOnDay = function(day) {
  if (day <= 9)  return 'spring_late';
  if (day <= 13) return 'rainy';
  if (day <= 19) return 'autumn';
  return 'winter';
};

LR.createInitialState = function() {
  const characters = {};
  for (const id of LR.CHARACTER_ORDER) {
    const def = LR.CHARACTER_DEFS[id];
    characters[id] = {
      id: def.id,
      name: def.name,
      role: def.role,
      health: def.health,
      morale: def.morale,
      status: def.status,           // healthy | injured | critical | dying | dead
      negSens: def.negSens,
      posSens: def.posSens,
      alive: true,
      flags: {}                      // 인물별 스토리 플래그
    };
    if (def.hasBaby !== undefined) characters[id].hasBaby = def.hasBaby;
  }

  return {
    day: 1,
    season: 'spring_late',
    rngSeed: Math.floor(Math.random() * 0x7fffffff),

    // 마을 자원 (sec 2.1, sec 3)
    food: 65,
    water: 60,
    fuel: 40,
    medicine: 3,
    driedFood: 0,
    pickledFood: 0,

    characters: characters,
    baby: { exists: false, bornDay: null, ageMonths: 0 },

    // 상승 나선 (sec 2.4)
    spiral: {
      state: 'none',                 // none | gyogam | gyeolsok | danhap
      enteredDay: null,
      avgMoraleHistory: [],          // 최근 5일 평균 사기
      streak60: 0,                   // 60+ 연속
      streak65: 0,                   // 65+ 연속
      streak70: 0                    // 70+ 연속
    },

    // 전례 (sec 2.6) — 최대 3개 누적
    precedents: [],                  // {id, type, name, bornDay, intensity, targets}

    // 비컨 (sec 6.4) — 7일 사이클
    beacon: {
      type: 'comm',                  // comm | refugee | supply
      weekStartDay: 1,
      weekIndex: 0,                  // 0,1,2,3,...
      phase: 'announce',             // announce | develop | reach | resolve | resolved
      investedFood: 0,
      investedFuel: 0,
      forcedPartial: true,           // 첫 주 약한 신호
      legacyBonus: { comm: 0, refugee: 0, supply: 0 },
      completedSuccessCount: { comm: 0, refugee: 0, supply: 0 },
      lastResolvedText: null
    },

    // Small Win 쿨다운 (sec 5.7)
    smallWins: {
      SW1: { lastFired: 0, weekCount: 0 },
      SW2: { lastFired: 0, weekCount: 0 },
      SW3: { lastFired: 0, weekCount: 0 },
      SW4: { lastFired: 0, weekCount: 0 },
      SW5: { lastFired: 0, weekCount: 0 }
    },

    // 일일 휘발 상태
    noiseToday: 6,
    yesterdayNoise: 0,
    TI: 0,
    raidedLastNight: false,
    raidLastNightSummary: null,
    releaseStreak: 0,                // 이완 연속 일수
    crisisStreak: 0,                 // 위기 연속 일수
    rescueCooldown: 0,               // 구원 후 3일 압박 억제

    // 카운터 + 엔딩
    counters: {
      posPrecedents: 0,
      negPrecedents: 0,
      moraleZeroDays: 0
    },
    ending: null,
    log: [],                         // 일일 요약 로그
    pendingChoice: null,             // 현재 시나리오 노드
    awaitingChoice: false,           // UI 상태
    recentScenarios: []              // 최근 3개 시나리오 ID (반복 방지)
  };
};

// 시드 RNG (mulberry32) — 결정적 재현
LR.makeRng = function(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// 가상 일자 — 138일 원본 페이싱을 30일에 압축하기 위한 보정
// 전례 시간 반감 곡선이 138일 기준이므로, day × 4.5로 가상 일자 계산
LR.virtualDay = function(day) {
  return Math.round(day * 4.5);
};
