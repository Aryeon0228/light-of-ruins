// 마을 하루 이벤트 풀 (village-days.js)
// 비스크립트 일자(비컨 '발전' 필러·템플릿 자리)를 다양한 내부 사건으로 채운다.
// 가벼운 조건(season/자원/사기 등)으로 게이팅하되 대부분 상시 발동 가능.
// 스키마: { id, title, body:[{kind,text,speaker?}], choices:[{id,label,body,deltas?,perCharDeltas?,moraleAll?,intentionalNoise?,precedentCandidate?,risk?}], canFire?(state) }

window.LR = window.LR || {};

LR.VILLAGE_DAYS = [
  {
    id: 'VD_ration_quarrel',
    title: '배급의 저울',
    body: [
      { kind: 'narration', text: '아침 배급 줄에서 언성이 높아진다. 누군가는 어제 덜 받았다고, 누군가는 일을 더 했다고 말한다.' },
      { kind: 'dialog', speaker: '동호', text: '“똑같이 나눈다는 게, 똑같이 굶자는 소리야?”' }
    ],
    choices: [
      { id: 'A', label: '균등 배급 고수', body: '원칙을 지킨다. 불만은 남지만 질서는 유지.', moraleAll: -2,
        precedentCandidate: { id: 'P-ration', type: 'pos', label: '굶어도 똑같이' } },
      { id: 'B', label: '노동 기여순 차등', body: '일한 사람을 우대. 약자의 사기 부담.', deltas: { food: +2 },
        perCharDeltas: { yeongsu: { morale: -8 }, miyeon: { morale: -6 } },
        precedentCandidate: { id: 'P-merit', type: 'neg', label: '쓸모가 몫을 정한다' } },
      { id: 'C', label: '재혁이 직접 중재', body: '리더가 시간을 쓴다. 오늘 탐색 효율 약간 감소.', moraleAll: +3,
        perCharDeltas: { jaehyeok: { morale: -3 } } }
    ]
  },
  {
    id: 'VD_minsu_fever',
    title: '민수의 미열',
    canFire: function (s) { return s.characters.minsu && s.characters.minsu.alive; },
    body: [
      { kind: 'narration', text: '민수가 밤새 끙끙 앓았다. 큰 병은 아닌 듯하지만, 아이의 열은 어른들의 마음을 흔든다.' },
      { kind: 'dialog', speaker: '수진', text: '“약을 쓸 만큼은 아니에요. 그래도… 곁에 누가 있어 주면 좋겠어요.”' }
    ],
    choices: [
      { id: 'A', label: '의약품으로 확실히', body: '의약품 -1. 민수 회복.', deltas: { medicine: -1 },
        perCharDeltas: { minsu: { health: +12, morale: +6 } }, enabled: true },
      { id: 'B', label: '교대로 곁을 지킨다', body: '약은 아끼고 마음을 쓴다. 마을 사기 +.', moraleAll: +4,
        perCharDeltas: { minsu: { health: +5, morale: +10 } } },
      { id: 'C', label: '버티게 둔다', body: '자원도 인력도 아낀다. 아이의 밤은 길다.',
        perCharDeltas: { minsu: { health: -4, morale: -8 }, miyeon: { morale: -6 } } }
    ]
  },
  {
    id: 'VD_fence_scratch',
    title: '담장의 긁힌 소리',
    body: [
      { kind: 'narration', text: '밤사이 뒷담장에서 긁는 소리가 났다. 아침에 보니 판자 하나가 헐거워져 있다. 아직은 한둘이지만.' },
      { kind: 'systemNote', text: '방치하면 소음·습격 위험이 누적된다.' }
    ],
    choices: [
      { id: 'A', label: '즉시 보강 (망치질)', body: '연료/소음 약간. 담장 안정.', deltas: { fuel: -2 }, intentionalNoise: 6 },
      { id: 'B', label: '조용히 임시 결박', body: '소음 최소. 임시방편이라 불안은 남음.', moraleAll: -2 },
      { id: 'C', label: '오늘은 못 본 척', body: '아무 비용 없음. 내일의 소리는 더 커질지도.', intentionalNoise: 3 }
    ]
  },
  {
    id: 'VD_small_song',
    title: '누군가의 노래',
    canFire: function (s) { return LR.avgMorale(s) <= 70; },
    body: [
      { kind: 'narration', text: '저녁, 은서가 낡은 멜로디를 흥얼거린다. 가사는 절반쯤 잊혔지만, 모두가 그 빈칸을 안다.' },
      { kind: 'dialog', speaker: '은서', text: '“…다음 소절이 기억 안 나요. 근데 그게 더 좋은 것 같기도 하고.”' }
    ],
    choices: [
      { id: 'A', label: '다 같이 둘러앉는다', body: '연료 -1(불 피움). 마을 사기 회복.', deltas: { fuel: -1 }, moraleAll: +7 },
      { id: 'B', label: '조용히 듣기만', body: '비용 없이 잔잔한 위로.', moraleAll: +3 },
      { id: 'C', label: '경계를 위해 자제시킨다', body: '소음을 줄인다. 마음은 조금 식는다.', moraleAll: -2 }
    ]
  },
  {
    id: 'VD_barter_stranger',
    title: '울타리 밖의 거래',
    canFire: function (s) { return s.day >= 5; },
    body: [
      { kind: 'narration', text: '낯선 생존자 둘이 정문 밖에 선다. 무기는 보이지 않는다. 통조림 몇 개를 흔들어 보인다.' },
      { kind: 'dialog', speaker: '하영', text: '“연료랑 바꾸재요. 들일지 말지는… 우리가 정해요.”' }
    ],
    choices: [
      { id: 'A', label: '연료를 내주고 식량 확보', body: '연료 -4 → 식량 +12.', deltas: { fuel: -4, food: +12 }, enabled: true },
      { id: 'B', label: '의약품 정보만 교환', body: '거래 없이 외부 소식. 사기 +.', moraleAll: +3 },
      { id: 'C', label: '문을 열지 않는다', body: '위험을 차단. 기회도 닫힌다.', moraleAll: -2,
        precedentCandidate: { id: 'P-closed', type: 'neg', label: '문은 열지 않는다' } }
    ]
  },
  {
    id: 'VD_stove_break',
    title: '꺼진 화구',
    canFire: function (s) { return s.fuel <= 60; },
    body: [
      { kind: 'narration', text: '취사용 화구의 연통이 막혔다. 정훈이 검댕을 뒤집어쓴 채 들여다본다.' },
      { kind: 'dialog', speaker: '정훈', text: '“오늘 안에 고쳐야 따뜻한 한 끼가 나와요. 아니면 다들 찬밥이고.”' }
    ],
    choices: [
      { id: 'A', label: '연료 들여 즉시 수리', body: '연료 -3. 따뜻한 식사로 사기 회복.', deltas: { fuel: -3 }, moraleAll: +4 },
      { id: 'B', label: '찬 음식으로 버틴다', body: '연료 절약. 사기 약간 하락.', moraleAll: -3 },
      { id: 'C', label: '종혁에게 손보게 한다', body: '회복 중인 손이지만 해낸다. 종혁 체력 -4, 사기 +6.',
        perCharDeltas: { jonghyeok: { health: -4, morale: +6 } } }
    ]
  },
  {
    id: 'VD_nightmare',
    title: '같은 꿈',
    canFire: function (s) { return LR.avgMorale(s) <= 55; },
    body: [
      { kind: 'narration', text: '여럿이 같은 밤에 가위에 눌렸다. 잃은 얼굴들이 돌아오는 꿈. 아침 식탁이 유난히 조용하다.' }
    ],
    choices: [
      { id: 'A', label: '둘러앉아 이야기한다', body: '말로 꺼내 누른다. 사기 회복.', moraleAll: +5,
        perCharDeltas: { dongho: { morale: +4 } } },
      { id: 'B', label: '일로 잊게 한다', body: '몸을 쓴다. 식량 약간 확보, 마음은 미뤄둔다.', deltas: { food: +4 }, moraleAll: -2 },
      { id: 'C', label: '각자 삼킨다', body: '아무 일도 하지 않는다. 침묵이 쌓인다.', moraleAll: -4 }
    ]
  },
  {
    id: 'VD_garden_harvest',
    title: '텃밭의 한 줌',
    canFire: function (s) { return s.season !== 'winter'; },
    body: [
      { kind: 'narration', text: '담벼락 밑 텃밭에서 예상보다 많은 잎채소가 났다. 작지만, 흙이 아직 우리 편이라는 증거다.' }
    ],
    choices: [
      { id: 'A', label: '오늘 다 먹는다', body: '식량 +8. 즉각적 포만과 사기.', deltas: { food: +8 }, moraleAll: +2 },
      { id: 'B', label: '절반은 말려 비축', body: '식량 +4, 비축 대비.', deltas: { food: +4, driedFood: +4 } },
      { id: 'C', label: '씨앗용으로 남긴다', body: '오늘은 적게. 다음 수확을 건다.', deltas: { food: +2 }, moraleAll: +3 } ]
  },
  {
    id: 'VD_leak_roof',
    title: '새는 지붕',
    canFire: function (s) { return s.season === 'rainy' || s.noiseToday >= 0; },
    body: [
      { kind: 'narration', text: '숙소 한쪽 지붕이 샌다. 젖은 이불은 밤의 추위를, 추위는 병을 부른다.' }
    ],
    choices: [
      { id: 'A', label: '연료 태워 말리고 수리', body: '연료 -2. 건강 유지.', deltas: { fuel: -2 } },
      { id: 'B', label: '자리만 옮겨 버틴다', body: '비용 없음. 비좁아 사기 하락.', moraleAll: -3 },
      { id: 'C', label: '취약자 우선 보호', body: '노약자를 마른 자리로. 임산부·노인 보호.',
        perCharDeltas: { miyeon: { health: +3 }, yeongsu: { health: +3 } } }
    ]
  },
  {
    id: 'VD_missing_ration',
    title: '사라진 한 끼',
    canFire: function (s) { return s.food <= 55; },
    body: [
      { kind: 'narration', text: '비축식 한 봉지가 사라졌다. 누군가 더 배고팠던 것이다. 의심의 눈초리가 식탁을 돈다.' },
      { kind: 'systemNote', text: '어떻게 처리하느냐가 마을의 규범이 된다.' }
    ],
    choices: [
      { id: 'A', label: '범인을 찾지 않는다', body: '용서를 택한다. 결속이 시험받는다.', moraleAll: +2,
        precedentCandidate: { id: 'P-forgive', type: 'pos', label: '배고픔은 죄가 아니다' } },
      { id: 'B', label: '엄히 경고한다', body: '질서를 세운다. 두려움도 함께.', moraleAll: -4,
        precedentCandidate: { id: 'P-strict', type: 'neg', label: '굶주림에도 벌이 있다' } },
      { id: 'C', label: '배급을 투명하게 공개', body: '장부를 모두에게. 신뢰는 더디지만 단단하다.', moraleAll: +4 }
    ]
  },
  {
    id: 'VD_far_voice',
    title: '잡음 속 먼 목소리',
    body: [
      { kind: 'narration', text: '수진이 라디오를 돌리다 손을 멈춘다. 잡음 사이로, 분명 사람의 목소리가 스친다. 단어는 알 수 없다.' },
      { kind: 'dialog', speaker: '수진', text: '“…우리만 남은 게 아닐지도 몰라요.”' }
    ],
    choices: [
      { id: 'A', label: '밤새 주파수를 추적', body: '연료 -1. 희망으로 사기 회복.', deltas: { fuel: -1 }, moraleAll: +6 },
      { id: 'B', label: '기록만 남기고 절약', body: '비용 없이 작은 위로.', moraleAll: +2 },
      { id: 'C', label: '헛된 기대를 경계', body: '냉정을 택한다. 마음은 식는다.', moraleAll: -2,
        perCharDeltas: { dongho: { morale: +2 } } }
    ]
  },
  {
    id: 'VD_cold_snap',
    title: '갑작스런 한기',
    canFire: function (s) { return s.season === 'winter' || s.season === 'autumn'; },
    body: [
      { kind: 'narration', text: '기온이 뚝 떨어졌다. 입김이 하얗게 서린다. 오늘 밤을 어떻게 나느냐가 내일의 건강을 정한다.' }
    ],
    choices: [
      { id: 'A', label: '연료를 넉넉히 땐다', body: '연료 -4. 모두 따뜻하게.', deltas: { fuel: -4 }, moraleAll: +3 },
      { id: 'B', label: '한 방에 모여 체온 공유', body: '연료 절약. 비좁지만 견딘다.', deltas: { fuel: -1 } },
      { id: 'C', label: '각자 버틴다', body: '연료 아낌. 약한 이들이 앓는다.', perCharDeltas: { yeongsu: { health: -6 }, minsu: { health: -5 } } }
    ]
  },
  {
    id: 'VD_baby_name',
    title: '이름 없는 아기',
    priority: true,    // 감정 비트 — 조건이 차면 다른 마을 이벤트보다 먼저
    canFire: function (s) { return s.baby.exists && s.baby.name === undefined && s.day >= (s.baby.bornDay || 7) + 1; },
    body: [
      { kind: 'narration', text: '아기는 아직 이름이 없다. 다들 "아기"라고만 부른다. 이름을 붙인다는 것은, 이 아이가 여기서 자랄 거라고 마을이 믿기 시작한다는 뜻이다.' },
      { kind: 'dialog', speaker: '미연', text: '"이름을… 지어줘야 할 것 같아요. 불러줄 이름이 있어야, 이 아이도 버틸 테니까."' },
      { kind: 'dialog', speaker: '민수', text: '"내가 그림에 이름 써줄 거야. 그러니까 빨리 정해줘."' }
    ],
    choices: [
      { id: 'A', label: '새벽 — 그 밤이 끝나고 온 시간',
        body: '아기가 태어난 새벽에서 가져온 이름. 마을 전체 사기 +3.',
        babyName: '새벽',
        moraleAll: +3 },
      { id: 'B', label: '영수 — 떠난 사람의 이름을 물려준다',
        body: '같은 밤에 떠난 장로의 이름. 죽음이 이름이 되어 돌아온다. 감수성 높은 이들에게 더 깊게.',
        babyName: '영수',
        moraleAll: +2,
        perCharDeltas: { jonghyeok: { morale: +4 }, miyeon: { morale: +3 }, minsu: { morale: +3 } } },
      { id: 'C', label: '아직 부르지 못한다',
        body: '이름은 살아남은 다음에 짓기로 한다. 아기는 이번 겨울을 이름 없이 난다.',
        babyName: '',
        moraleAll: -1 }
    ],
    keyLine: '이름을 붙이는 순간, 미래가 책임이 된다.'
  }
];

// 우선 마을 비트 — priority 표시된 감정 이벤트(이름 짓기 등)는 교차 이벤트보다 먼저 (drama.js Tier 2.7)
LR.pickPriorityVillageDay = function (state) {
  const e = LR.VILLAGE_DAYS.find(ev => ev.priority &&
    !state.recentScenarios.includes(ev.id) &&
    (typeof ev.canFire !== 'function' || ev.canFire(state)));
  return e ? Object.assign({ source: 'villageDay' }, e) : null;
};

// 발동 가능한 마을 하루 이벤트 (최근 표시 제외 + canFire 통과) 중 하나
LR.pickVillageDay = function (state) {
  const pool = LR.VILLAGE_DAYS.filter(e =>
    !state.recentScenarios.includes(e.id) &&
    (typeof e.canFire !== 'function' || e.canFire(state))
  );
  if (pool.length === 0) return null;
  // 감정 비트(이름 짓기 등)는 조건이 차면 가장 먼저
  const prio = pool.find(e => e.priority);
  if (prio) return Object.assign({ source: 'villageDay' }, prio);
  // 가벼운 의사난수 (day 기반) — 같은 날 재현 가능
  const idx = (state.day * 7 + state.noiseToday * 3) % pool.length;
  const node = pool[idx];
  return Object.assign({ source: 'villageDay' }, node);
};
