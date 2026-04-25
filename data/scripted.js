// 스크립트 데이 (scripted.js)
// v3 시나리오 원본을 30일 게임으로 압축 재배치:
//   D1~7: 봄편 그대로
//   D14~16: 가을편 (원본 D78~80) — 압축 배치 시점에 P-1 자연 감소
//   D24~26: 겨울편 (원본 D136~138) — P-2 생성, P-1 상쇄 정점

window.LR = window.LR || {};

LR.SCRIPTED_DAYS = {

  // ═══════════ 봄편 D1~7 ═══════════

  1: {
    id: 'D1_radio_signal',
    day: 1,
    title: 'Day 1 — 봄바람의 불안, 그리고 지지직거리는 라디오',
    body: [
      { kind: 'narration', text: '폐공장 창고에 아침 햇빛이 들어온다. 식량 65. 오늘 10을 소비하면 55. 이대로면 6일 후 위기 구간이다.' },
      { kind: 'narration', text: '재혁이 탐색대를 보내야 한다고 판단한다. 그때 동호가 미연을 보며 투덜거린다.' },
      { kind: 'dialog', speaker: '동호', text: '"배 속에 애가 있다고 식량 부족한데도 배급 예전과 똑같이 받는 거 아니겠지?"' },
      { kind: 'narration', text: '가족을 잃은 동호의 사기는 절망 구간이다.' },
      { kind: 'narration', text: '그때 수진이 의무실 라디오 주파수를 돌리다 손을 멈춘다. 지지직. 잡음 사이로 사람의 목소리 같은 무언가가 섞였다가 사라진다.' },
      { kind: 'dialog', speaker: '수진', text: '"이게… 무슨 신호 같은데요."' },
      { kind: 'systemNote', text: '약한 신호 비컨 — 7일을 관통할 하나의 실이 걸리는 순간.' }
    ],
    choices: [
      { id: 'A', label: '동호를 달래고 현 배급 유지',
        body: '동호의 불만을 단어로 누른다. 분배는 그대로. 식량 절약 효과는 없다.',
        perCharDeltas: { dongho: { morale: -3 } },
        flags: { factionRisk: true } },
      { id: 'B', label: '전원 배급 균등 조정 (추천)',
        body: '공평한 배급으로 동호의 불만을 누그러뜨린다. 미연의 영양은 약간 부담.',
        perCharDeltas: { dongho: { morale: +3 }, miyeon: { health: -1 } },
        precedentCandidate: { triggerKey: 'equal_distribution', healthCost: 1, resourceCost: 0, villageBenefit: false } },
      { id: 'C', label: '미연에게 배급 추가 지급(+1)',
        body: '미연의 체력을 우선. 동호가 잠자코 있지 않을 것이다.',
        deltas: { food: -1 },
        perCharDeltas: { dongho: { morale: -5 }, miyeon: { health: +2 } } }
    ],
    keyLine: 'D1은 비컨이라는 7일짜리 외부 실을 마을에 걸어놓는 날이다.'
  },

  2: {
    id: 'D2_storage_dilemma',
    day: 2,
    title: 'Day 2 — 정훈의 제안, 그리고 해석 불가 신호',
    body: [
      { kind: 'narration', text: '식량이 계속 줄고 있다.' },
      { kind: 'dialog', speaker: '정훈', text: '"신선식품이 사흘 후면 상합니다. 오늘 조리해서 먹을지, 가공해서 저장할지 결정해야 합니다."' },
      { kind: 'narration', text: '저녁, 수진이 라디오 앞에 다시 앉는다. 두 번째 송신. 이번엔 단어가 들리는 듯하지만 해석이 안 된다.' }
    ],
    choices: [
      { id: 'A', label: '조리해서 먹기 — 사기 회복',
        body: '신선 20을 전부 조리. 사기가 오르지만 소음과 연료를 소비. 다음날부터 저장식품만.',
        deltas: { fuel: -3 },
        moraleAll: +5,
        intentionalNoise: 15 },
      { id: 'B', label: '가공 저장 — 미래 대비',
        body: '신선 20 → 건조 10 + 절임 4. 효율은 떨어지지만 오래 간다. 조용함.',
        deltas: { fuel: -5, driedFood: +10, pickledFood: +4 } },
      { id: 'C', label: '반반 — 균형 (추천)',
        body: '반은 조리해 사기를 올리고, 반은 가공 저장. 지속 가능한 절충안.',
        deltas: { fuel: -3, driedFood: +5, pickledFood: +2 },
        moraleAll: +3,
        intentionalNoise: 15 }
    ],
    keyLine: '"밥 한 끼 해 먹었을 뿐인데, 좀비가 찾아왔다." 사기의 모순.'
  },

  3: {
    id: 'D3_jaehyeok_injury',
    day: 3,
    title: 'Day 3 — 부상의 대가, 계속되는 지지직',
    body: [
      { kind: 'narration', text: '어젯밤 주변 좀비를 보고 긴장한 마을. 재혁이 다시 탐색을 결정한다.' },
      { kind: 'narration', text: '편의점에서 식량을 회수하다 좀비를 만난다. 재혁이 은서를 먼저 안전한 쪽으로 보내다가 무너지는 선반에 다리를 다친다.' },
      { kind: 'narration', text: '돌아온 탐색대 — 식량 +18. 재혁 체력 90 → 55. 은서 체력 -5, 사기 -15.' },
      { kind: 'systemNote', text: '재혁의 부상 치료에 의약품 1회분 + 수진의 간병이 필요하다.' }
    ],
    choices: [
      { id: 'A', label: '수진을 간병에 투입 (추천)',
        body: '리더를 빨리 복귀시킨다. 의약품 -1. 탐색 인력 감소.',
        deltas: { food: +18, medicine: -1 },
        perCharDeltas: { jaehyeok: { health: +15 }, eunseo: { health: -5, morale: -15 } },
        flags: { sujinNursing: true } },
      { id: 'B', label: '의약품 절약, 휴식만',
        body: '의약품 보존. 회복은 느리다.',
        deltas: { food: +18 },
        perCharDeltas: { jaehyeok: { health: +5 }, eunseo: { health: -5, morale: -15 } } },
      { id: 'C', label: '수진+의약품 투입, 하영을 탐색으로 전환',
        body: '빠른 회복. 방어 인력 감소 위험.',
        deltas: { food: +18, medicine: -1 },
        perCharDeltas: { jaehyeok: { health: +15 }, hayeong: { health: -3 }, eunseo: { health: -5, morale: -15 } } }
    ],
    keyLine: '하루의 반짝임으로는 마을의 대사가 바뀌지 않는다 — 상승 나선의 연속 일수 조건.'
  },

  4: {
    id: 'D4_rain_arrives',
    day: 4,
    title: 'Day 4 — 빗소리가 온다, 비컨이 멈춘다',
    body: [
      { kind: 'narration', text: '오후부터 비가 내리기 시작한다. 빗소리 마스킹으로 소음 보정 ×0.5.' },
      { kind: 'narration', text: '수진이 라디오 앞에 앉지만 빗소리에 신호가 묻혀 송신이 어렵다. 비컨은 발전 단계에서 잠시 멈춘다.' },
      { kind: 'narration', text: '하영이 제안한다 — "오늘은 조용히 모여 함께 식사하면 어떨까."' }
    ],
    choices: [
      { id: 'A', label: '함께 식사 — 사기 활동 (추천)',
        body: '빗소리에 묻혀 소음 부담이 적다. 마을이 잠시 단단해진다.',
        deltas: { food: -2 },
        moraleAll: +5,
        intentionalNoise: 5 },
      { id: 'B', label: '평소대로 — 자원 보존',
        body: '아무 일 없이 하루가 간다.',
        moraleAll: -1 },
      { id: 'C', label: '큰 모임 — 위험 감수',
        body: '오랜만의 활기. 빗소리에도 약간은 들린다.',
        deltas: { food: -4, fuel: -2 },
        moraleAll: +8,
        intentionalNoise: 18 }
    ],
    keyLine: '"내일 사기가 이만큼 유지되어야 한다. 그런데 내일은 무슨 일이 벌어질까."'
  },

  5: {
    id: 'D5_yeongsu_food_poisoning',
    day: 5,
    title: 'Day 5 — 썩은 빵, 새겨지는 전례',
    body: [
      { kind: 'narration', text: '식량 위기 구간. 영수가 곰팡이 핀 육포를 먹고 배탈을 호소한다. 체력 55 → 35, 중상.' },
      { kind: 'narration', text: '수진은 이미 재혁의 간병에 매여 있다.' },
      { kind: 'systemNote', text: '간병 분산은 두 환자를 다 해칠 수 있다. 그러나 방치는 영수의 사망 가능성을 키운다.' }
    ],
    choices: [
      { id: 'A', label: '수진을 분리해서 영수도 간병',
        body: '의약품 1회분과 시간을 영수에게 나눈다. 재혁의 회복이 느려진다.',
        deltas: { medicine: -1 },
        perCharDeltas: { yeongsu: { health: +10 }, jaehyeok: { health: -5 } },
        flags: { caregiveSplit: true },
        precedentCandidate: { triggerKey: 'caregiving_sustained', healthCost: 5, resourceCost: 3, villageBenefit: true, targets: ['yeongsu'], scriptedOverride: true } },
      { id: 'B', label: '비전투원(민수·미연)을 간병에 투입',
        body: '체력 회복은 미미. 그러나 형식적으로 간병 중. 결정의 무게는 분산.',
        perCharDeltas: { yeongsu: { health: +2 } } },
      { id: 'C', label: '영수 간병 포기 — 재혁 우선 (위험)',
        body: '리더의 빠른 복귀를 우선. 영수는 하루하루 약해진다.',
        perCharDeltas: { yeongsu: { health: -10, morale: -10 } },
        flags: { yeongsuAbandoned: true },
        precedentCandidate: { triggerKey: 'caregiving_abandoned', healthCost: 10, resourceCost: 0, villageBenefit: false, targets: ['yeongsu'], scriptedOverride: true },
        risk: 'danger' }
    ],
    keyLine: '"쓸모없으면 버린다"는 전례가 마을에 새겨진다. 다음은 누구인가.'
  },

  6: {
    id: 'D6_rain_clearing',
    day: 6,
    title: 'Day 6 — 비가 그친다, 결속이 일시 진입한다',
    body: [
      { kind: 'narration', text: '비가 그쳤다. 빗소리 마스킹이 사라지고 마을의 모든 소음이 드러난다.' },
      { kind: 'narration', text: '영수의 신음이 약해지고 있다. 아무도 그것이 무엇을 의미하는지 모른 척한다.' },
      { kind: 'narration', text: '저녁, 비컨 신호가 다시 잡힌다. 좌표 단편이 한 줄 적힌다 — 다음 날 해소까지.' }
    ],
    choices: [
      { id: 'A', label: '조용한 모임 — 공짜 사기 옵션 (결속 시 해금)',
        body: '결속 상태라면 침묵만으로도 사기가 오른다.',
        moraleAll: +2,
        intentionalNoise: 0,
        requireSpiral: 'gyeolsok' },
      { id: 'B', label: '평상 운영',
        body: '내일을 준비한다.',
        moraleAll: 0 },
      { id: 'C', label: '영수에게 마지막 의약품 (위험)',
        body: '의약품 1회분을 영수에게 쓴다. 다른 부상자에게 쓸 자원은 사라진다.',
        deltas: { medicine: -1 },
        perCharDeltas: { yeongsu: { health: +15 } },
        precedentCandidate: { triggerKey: 'medicine_to_dying', healthCost: 0, resourceCost: 3, villageBenefit: true, targets: ['yeongsu'], scriptedOverride: true } }
    ],
    keyLine: '빗소리가 사라진 순간, 마을의 모든 소음이 드러난다.'
  },

  7: {
    id: 'D7_birth_and_death',
    day: 7,
    title: 'Day 7 — 불빛의 선택, 결속은 소실되고 비컨은 부분 성공',
    body: [
      { kind: 'narration', text: '새벽. 미연의 진통이 시작된다. 수진이 출산을 돕는다.' },
      { kind: 'narration', text: '같은 새벽, 영수가 사망해 있다. 방치 3일차의 결과.' },
      { kind: 'narration', text: '낮. 비컨 신호 해소 — 좌표 단편 부분 성공. 다음 주 재시도 플래그.' },
      { kind: 'narration', text: '저녁, 아기 울음소리가 폐공장에 울려 퍼진다. 화재로 좀비를 막는 선택의 시간.' }
    ],
    choices: [
      { id: 'A', label: '조용한 출산 + 침묵 방어',
        body: '연료를 아끼고 어둠 속에서 버틴다. 위험하다.',
        moraleAll: -3,
        intentionalNoise: 5 },
      { id: 'B', label: '의약품 + 화재 방어',
        body: '의약품 1로 산모 회복, 연료 5로 화재 방어. 균형.',
        deltas: { medicine: -1, fuel: -5 },
        perCharDeltas: { miyeon: { health: -10 } },
        babyBorn: true },
      { id: 'C', label: '의약품 + 화재 + 모닥불 + 모두 모임 (시도)',
        body: '의약품, 연료, 식량을 모두 투입. 전 마을 합심. 자기희생적 기여 후보지만 마을 분화 위험.',
        deltas: { medicine: -1, fuel: -8, food: -3 },
        perCharDeltas: { miyeon: { health: -5 }, dongho: { morale: -5 }, jonghyeok: { morale: -3 } },
        babyBorn: true,
        precedentCandidate: { triggerKey: 'selfless_contribution', healthCost: 0, resourceCost: 12, villageBenefit: false, targets: ['miyeon'], scriptedOverride: true } }
    ],
    yeongsuDies: true,
    keyLine: '아기의 울음소리가 폐공장에 울려 퍼진다. 영수의 빈자리가 아직 차갑다.'
  },

  // ═══════════ 가을편 D14~16 (원본 D78~80 압축 배치) ═══════════
  // 이 시점에서 P-1은 30일 게임 가상 일자 보정으로 강도 0.35~0.5 부근

  14: {
    id: 'D14_autumn_arrives',
    day: 14,
    title: 'Day 14 — 가을, 낙엽이 발소리를 만든다',
    body: [
      { kind: 'narration', text: '계절이 바뀌었다. 가을. 건조한 공기가 소리를 멀리 옮긴다 (소음 ×1.3).' },
      { kind: 'narration', text: '낙엽이 발 밑에서 부서진다. 정찰을 나가는 길마다 발자국 소리가 따라붙는다.' },
      { kind: 'narration', text: '종혁이 오른팔의 부상을 정리한다. 봄편의 P-1이 그의 회복을 가장 깊이 깎고 있다.' },
      { kind: 'dialog', speaker: '종혁', text: '"내가 더 나빠지면… 어떻게 할 거예요?"' },
      { kind: 'systemNote', text: '종혁이 자신이 P-1의 다음 후보임을 자각하는 순간.' }
    ],
    choices: [
      { id: 'A', label: '재혁이 직접 종혁에게 답한다 (추천)',
        body: '"우리는 너를 두지 않을 거다." 리더가 자기 결정에 답을 거는 첫 시도. SW-4 트리거 후보.',
        moraleAll: +2,
        perCharDeltas: { jonghyeok: { morale: +5 }, jaehyeok: { morale: -2 } },
        flags: { jongRyeokAnswered: true } },
      { id: 'B', label: '말없이 손만 잡는다',
        body: '말로 하지 않는 위로. 종혁 본인은 안다.',
        perCharDeltas: { jonghyeok: { morale: +2 } } },
      { id: 'C', label: '말을 흐린다 (위험)',
        body: '아무도 답하지 못한다. 종혁이 자기 신음이 소음 수치에 더해지는 걸 안다.',
        perCharDeltas: { jonghyeok: { morale: -8 } } }
    ],
    keyLine: 'P-1의 문장이 자기 결정에서 비롯된 것임을 재혁은 알고 있다.'
  },

  15: {
    id: 'D15_jeonghun_mushroom',
    day: 15,
    title: 'Day 15 — 정훈의 시식, 작은 회복',
    body: [
      { kind: 'narration', text: '하영이 가져온 버섯 한 묶음. 식용인지 독버섯인지 확실하지 않다.' },
      { kind: 'dialog', speaker: '정훈', text: '"제가 먼저 한 입만 먹어볼게요. 의사 선생, 옆에 좀 있어줘요."' },
      { kind: 'narration', text: '한 시간이 지난다. 정훈은 멀쩡하다. 식용 판정. 마을 전체에 작은 회복이 번진다.' },
      { kind: 'systemNote', text: 'SW-3 (정훈의 작은 간식) 트리거 가능. 전례 단계는 아니지만 마을의 미세한 온기.' }
    ],
    choices: [
      { id: 'A', label: '버섯국으로 함께 식사',
        body: '식량 +6. 사기 회복. 소음 약간.',
        deltas: { food: +6 },
        moraleAll: +3,
        intentionalNoise: 8 },
      { id: 'B', label: '말려서 비축',
        body: '건조 식품 +6. 오늘은 평상 식사.',
        deltas: { driedFood: +6 } },
      { id: 'C', label: '절반 조리, 절반 비축',
        body: '균형. 조용한 식사 + 비축.',
        deltas: { food: +3, driedFood: +3 },
        moraleAll: +1 }
    ],
    keyLine: '정훈이 자기 몸으로 위험을 받아낸 것이 마을의 신뢰가 된다.'
  },

  16: {
    id: 'D16_leaf_burning_raid',
    day: 16,
    title: 'Day 16 — 낙엽 소각, 하영의 부상',
    body: [
      { kind: 'narration', text: '겨울 대비. 낙엽을 모아 소각해 연료로 비축하기로 한다. 그러나 화재의 빛과 연기가 좀비를 부른다.' },
      { kind: 'narration', text: '저녁, 좀비 무리가 마을 외곽을 두드린다. 하영이 방어를 맡는다.' },
      { kind: 'narration', text: '소규모 습격을 격퇴. 하영 체력 -25. 부상 구간 진입.' },
      { kind: 'systemNote', text: '하영의 부상은 봄편 종혁·재혁의 부상과 다른 의미 — 행동가가 다친다는 것은 마을 방어선이 무너진다는 것.' }
    ],
    choices: [
      { id: 'A', label: '의약품으로 빠른 치료 (추천)',
        body: '의약품 1회분. 하영 빠른 복귀.',
        deltas: { medicine: -1 },
        perCharDeltas: { hayeong: { health: +15 } } },
      { id: 'B', label: '휴식만',
        body: '의약품 보존. 회복 느림.',
        perCharDeltas: { hayeong: { health: +5 } } },
      { id: 'C', label: '수진 집중 간병 + 의약품',
        body: '수진의 시간이 하영에 묶인다. 다른 일 보류.',
        deltas: { medicine: -1 },
        perCharDeltas: { hayeong: { health: +20 } },
        flags: { sujinNursingHayeong: true } }
    ],
    keyLine: '봄의 부상이 누구를 다치게 했는지를 가을의 부상이 다시 묻는다.'
  },

  // ═══════════ 겨울편 D24~26 (원본 D136~138 압축 배치) — 정점 ═══════════

  24: {
    id: 'D24_winter_fuel_triage',
    day: 24,
    title: 'Day 24 — 연료 삼분할, 긴 겨울의 회계',
    body: [
      { kind: 'narration', text: '겨울 한가운데. 연료 소비 2배. 난방·방어·조리 삼분할이 매일의 회계다.' },
      { kind: 'dialog', speaker: '동호', text: '"비상 2를 남기는 게 합리적이에요."' },
      { kind: 'narration', text: '봄편의 동호와 다르다. 같은 인물의 합리가 이번에는 누군가를 버리는 쪽이 아니라 내일을 조금 더 버티게 하는 쪽에 붙는다.' }
    ],
    choices: [
      { id: 'A', label: '난방 우선',
        body: '동사 방지. 방어력 최소화. 습격 시 큰 피해.',
        deltas: { fuel: -8 } },
      { id: 'B', label: '방어 우선',
        body: '화재로 방어벽 강화. 동상 위험 지속. 체력 -3/일 전원.',
        deltas: { fuel: -8 },
        perCharDeltas: { jaehyeok: { health: -3 }, sujin: { health: -3 }, eunseo: { health: -3 } } },
      { id: 'C', label: '동호 제안 — 비상분 보존, 삼분할 (추천)',
        body: '난방 4 / 방어 3 / 비상 1. 모두 부족하지만 모두 살아남는다.',
        deltas: { fuel: -7 } }
    ],
    keyLine: '동호의 합리가 누군가를 버리는 쪽이 아니라 내일을 버티게 하는 쪽에 붙는 날.'
  },

  25: {
    id: 'D25_winter_traps',
    day: 25,
    title: 'Day 25 — 눈 위 발자국, 함정의 귀환',
    body: [
      { kind: 'narration', text: '아침. 눈 위에 어제 없던 발자국이 있다. 좀비의 것은 아니다.' },
      { kind: 'narration', text: '하영이 가장 먼저 움직인다. 봄·가을의 부상에서 회복한 행동가가 다시 정찰에 나선다.' },
      { kind: 'narration', text: '발자국은 한 사람의 것. 마을 외곽에서 사라진다. 함정 회수 — 식량 +5, 의약품 +1.' }
    ],
    choices: [
      { id: 'A', label: '추격 — 위험 감수',
        body: '발자국을 따라간다. 함정이거나, 새 식구일 수도 있다.',
        deltas: { food: +8 },
        perCharDeltas: { hayeong: { health: -10 } } },
      { id: 'B', label: '함정만 회수, 추격 보류 (추천)',
        body: '안전. 작은 보상으로 만족.',
        deltas: { food: +5, medicine: +1 } },
      { id: 'C', label: '추격 + 동호의 분석',
        body: '동호가 발자국 패턴을 분석한다. 인물 1명이 마을을 살피는 중. 다음 주에 다시 올 가능성.',
        deltas: { food: +5, medicine: +1 },
        flags: { strangerPattern: true } }
    ],
    keyLine: '회복한 자가 다시 움직인다는 것은 마을의 행동 영역이 회복됐다는 뜻.'
  },

  26: {
    id: 'D26_jonghyeok_soundproof',
    day: 26,
    image: 'assets/images/scenarios/d26_soundproof.svg',
    title: 'Day 26 — 종혁의 방음 칸막이, 긍정 전례 P-2 생성',
    body: [
      { kind: 'narration', text: '아기가 자라며 울음이 점점 커진다. 마을의 통제 불가 소음원이 생리적 소음 +10/일을 매일 기록하고 있다.' },
      { kind: 'narration', text: '종혁이 도면을 그린다. 전기기사의 직업 지식이 방음 패널 구조 계산에 정확히 맞물린다.' },
      { kind: 'dialog', speaker: '종혁', text: '"내가 합니다. 팔 하나는 멀쩡해요."' },
      { kind: 'narration', text: '체력 -5를 감수하고 마을 전체 이익을 달성한다. 자기희생 기여.' },
      { kind: 'systemNote', text: '긍정 전례 P-2 생성 — 강도 1.0. 종혁 본인의 회복 보정이 0.55에서 점프한다.' }
    ],
    choices: [
      { id: 'A', label: '종혁이 단독으로 작업 (역사적 무게)',
        body: '종혁 체력 -5. P-2 생성 — 마을의 도덕적 좌표계가 바뀐다.',
        perCharDeltas: { jonghyeok: { health: -5 } },
        precedentCandidate: { triggerKey: 'selfless_contribution', healthCost: 5, resourceCost: 3, villageBenefit: true, targets: ['jonghyeok','miyeon','baby'], scriptedOverride: true } },
      { id: 'B', label: '재혁이 함께 — 리더의 거리감',
        body: '재혁이 옆에서 공구를 건넨다. 거리감이 P-1 상쇄의 핵심. P-2 생성.',
        perCharDeltas: { jonghyeok: { health: -3 }, jaehyeok: { health: -2 } },
        precedentCandidate: { triggerKey: 'selfless_contribution', healthCost: 5, resourceCost: 3, villageBenefit: true, targets: ['jonghyeok','jaehyeok'], scriptedOverride: true } },
      { id: 'C', label: '민수가 공구를 건넨다 — 다음 세대',
        body: '아이가 겨울의 맨 처음 긍정 전례를 몸으로 체험한다. 마을의 다음 세대 좌표계가 P-2 쪽에 정착.',
        perCharDeltas: { jonghyeok: { health: -5 }, minsu: { morale: +5 } },
        precedentCandidate: { triggerKey: 'selfless_contribution', healthCost: 5, resourceCost: 3, villageBenefit: true, targets: ['jonghyeok','minsu'], scriptedOverride: true } }
    ],
    keyLine: '아기를 지켜준 사람이 봄편 P-1의 바로 다음 후보였다는 사실 — 이 게임의 정점.'
  }
};

// 시점별 트리거 헬퍼
LR.scriptedDayFor = function(day) {
  return LR.SCRIPTED_DAYS[day] || null;
};
