// 교차 이벤트 5.1~5.6 (cross-events.js)
// system_design_v1_2.docx 5.1~5.6 — 비스크립트 일자에 조건부 발동

window.LR = window.LR || {};

LR.CROSS_EVENTS = [
  // 5.1 — 굶주린 간병인
  {
    id: 'CE51_hungry_caregiver',
    name: '5.1 굶주린 간병인',
    canFire: function(state) {
      const food = state.food;
      const critical = LR.aliveChars(state).some(c => c.health < 50);
      return food >= 20 && food <= 39 && critical;
    },
    weight: 3,
    title: '굶주린 간병인',
    body: [
      { kind: 'narration', text: '식량 위기 구간. 그런데 마을엔 간병이 필요한 부상자가 있다. 간병 인력은 식량을 모으러 나갈 수 없다.' },
      { kind: 'systemNote', text: '간병을 중단하면 체력이 떨어지고, 유지하면 식량이 줄어든다.' }
    ],
    choices: [
      { id: 'A', label: '간병 유지',
        body: '탐색 인력 -1. 식량 회복 느림. 중상자 체력 +2/일.',
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 50);
          return c ? { [c.id]: { health: +2 } } : {};
        }
      },
      { id: 'B', label: '간병 중단, 탐색 투입',
        body: '식량 회복 가능. 중상자 체력 -3/일.',
        deltas: { food: +8 },
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 50);
          return c ? { [c.id]: { health: -3 } } : {};
        }
      },
      { id: 'C', label: '배급 반감 — 모두가 조금씩 굶는다',
        body: '간병+탐색 병행. 사기 전체 -5.',
        deltas: { food: +5 },
        moraleAll: -5
      }
    ]
  },

  // 5.2 — 마지막 만찬
  {
    id: 'CE52_last_supper',
    name: '5.2 마지막 만찬',
    canFire: function(state) {
      const food = state.food;
      const avg = LR.avgMorale(state);
      return food >= 40 && food <= 69 && avg >= 50 && avg <= 79;
    },
    weight: 2,
    title: '마지막 만찬',
    body: [
      { kind: 'narration', text: '누군가가 신선식품으로 만찬을 제안한다. 사기 회복 기회이지만, 조리 소음과 식량 소비가 대가다.' }
    ],
    choices: [
      { id: 'A', label: '만찬 허가',
        body: '사기 +5 전원. 식량 -6. 소음 +15.',
        deltas: { food: -6, fuel: -3 },
        moraleAll: +5,
        intentionalNoise: 15 },
      { id: 'B', label: '거부',
        body: '식량 보존. 제안자 사기 -8. 내분 위험.',
        moraleAll: -2 },
      { id: 'C', label: '조용히, 작게',
        body: '소음 +5만. 부분적 회복.',
        deltas: { food: -3, fuel: -1 },
        moraleAll: +3,
        intentionalNoise: 5 }
    ]
  },

  // 5.3 — 짐은 보초
  {
    id: 'CE53_burden_watch',
    name: '5.3 짐은 보초',
    canFire: function(state) {
      const dying = LR.aliveChars(state).some(c => c.health < 20);
      const avg = LR.avgMorale(state);
      return dying && avg >= 25 && avg <= 49 && state.medicine <= 1;
    },
    weight: 4,
    title: '짐은 보초',
    body: [
      { kind: 'narration', text: '빈사 상태의 동료가 있다. 마지막 의약품을 쓰면 다른 부상자를 치료할 수 없다.' }
    ],
    choices: [
      { id: 'A', label: '빈사자에게 투입',
        body: '빈사자 체력 +15. 다른 부상자 치료 불가. 긍정 전례 후보.',
        deltas: { medicine: -1 },
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 20);
          return c ? { [c.id]: { health: +15 } } : {};
        },
        precedentCandidate: { triggerKey: 'medicine_to_dying', healthCost: 0, resourceCost: 3, villageBenefit: true }
      },
      { id: 'B', label: '부상자 우선',
        body: '빈사자 3일 내 사망 위험. 사기 -15.',
        moraleAll: -10,
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 20);
          return c ? { [c.id]: { health: -10 } } : {};
        },
        precedentCandidate: { triggerKey: 'medicine_withheld', healthCost: 10, resourceCost: 0, villageBenefit: false }
      },
      { id: 'C', label: '탐색대 긴급 파견',
        body: '의약품 탐색. 은신 성공 시 양쪽 치료. 실패 시 빈사자 사망.',
        deltas: { medicine: +1 },
        perCharDeltas: { hayeong: { health: -5 } }
      }
    ]
  },

  // 5.4 — 겨울 밤의 불빛
  {
    id: 'CE54_winter_night_light',
    name: '5.4 겨울 밤의 불빛',
    canFire: function(state) {
      return state.season === 'winter' && state.food <= 39
          && LR.aliveChars(state).some(c => c.health < 50)
          && LR.avgMorale(state) <= 49;
    },
    weight: 4,
    title: '겨울 밤의 불빛',
    body: [
      { kind: 'narration', text: '겨울. 식량 위기. 중상자. 절망. 연료 배분이 매일의 도덕이 된다.' }
    ],
    choices: [
      { id: 'A', label: '난방 우선',
        body: '동사 방지. 방어력 최소화.',
        deltas: { fuel: -8 } },
      { id: 'B', label: '방어 우선',
        body: '화재로 방어. 동상 위험. 체력 -3/일 전원.',
        deltas: { fuel: -8 },
        perCharDeltas: { jaehyeok: { health: -3 }, sujin: { health: -3 } } },
      { id: 'C', label: '모닥불 작전',
        body: '연료 -10. 퇴치+난방+조리 동시. 소음 +20.',
        deltas: { fuel: -10 },
        moraleAll: +3,
        intentionalNoise: 20 }
    ]
  },

  // 5.5 — 침묵의 밤
  {
    id: 'CE55_silent_night',
    name: '5.5 침묵의 밤',
    canFire: function(state) {
      const avg = LR.avgMorale(state);
      return state.noiseToday >= 51 && state.noiseToday <= 80 && avg >= 25 && avg <= 49;
    },
    weight: 2,
    title: '침묵의 밤',
    body: [
      { kind: 'narration', text: '사기는 바닥인데 생리적 소음은 높다. 사기 회복 활동이 거의 불가능한 곤경.' }
    ],
    choices: [
      { id: 'A', label: '침묵 유지',
        body: '활동 제한. 사기 계속 하락.',
        moraleAll: -3 },
      { id: 'B', label: '조용히 이야기',
        body: '사기 +3. 소음 +5. 소규모 습격 위험.',
        moraleAll: +3,
        intentionalNoise: 5 },
      { id: 'C', label: '위험 감수 축하',
        body: '사기 +10. 소음 +30. 거의 확실한 습격.',
        moraleAll: +10,
        intentionalNoise: 30 }
    ]
  },

  // 5.6 — 격리 안의 적
  {
    id: 'CE56_quarantine_enemy',
    name: '5.6 격리 안의 적',
    canFire: function(state) {
      // 좀비 습격 후 부상자 발생 + 접촉 여부 불확실 — 단순화: 어제 습격이 있고 부상자
      return state.raidedLastNight && LR.aliveChars(state).some(c => c.health < 50);
    },
    weight: 2,
    title: '격리 안의 적',
    body: [
      { kind: 'narration', text: '어제 습격 중 부상자가 발생했다. 접촉 전염 의심. 확인까지 격리 필요하지만, 격리하면 간병이 불가능하다.' }
    ],
    choices: [
      { id: 'A', label: '즉시 격리',
        body: '감염 위험 제거. 부상자 체력 -5/일.',
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 50);
          return c ? { [c.id]: { health: -5 } } : {};
        }
      },
      { id: 'B', label: '격리 + 치료 (자원 투입)',
        body: '물·의약품을 격리 공간에 투입. 자원 소모 크지만 안전. 긍정 전례 후보.',
        deltas: { water: -5, medicine: -1 },
        precedentCandidate: { triggerKey: 'quarantine_supported', healthCost: 0, resourceCost: 3, villageBenefit: true }
      },
      { id: 'C', label: '격리 없이 치료',
        body: '자원 절약. 감염 판정. 감염 시 공기전염 트리거. 부정 전례.',
        deltas: { medicine: -1 },
        perCharDeltas: function(state) {
          const c = LR.aliveChars(state).find(x => x.health < 50);
          return c ? { [c.id]: { health: +5 }, [c.id]: { health: +5, contagionRisk: true } } : {};
        },
        flags: { contagionRisk: true },
        precedentCandidate: { triggerKey: 'quarantine_neglected', healthCost: 5, resourceCost: 0, villageBenefit: false }
      }
    ]
  }
];

LR.eligibleCrossEvents = function(state) {
  return LR.CROSS_EVENTS.filter(e => e.canFire(state));
};
