// 비컨 정의 (beacons.js)
// sec 6.4 — 3종 회전 (피난민 · 보급 · 통신)

window.LR = window.LR || {};

LR.BEACON_TYPES = {
  comm: {
    type: 'comm',
    name: '통신 비컨',
    rewardSummary: '안전지대 정보 (완전 성공 3회 → 엔딩 분기)',
    announce: '수진이 라디오 주파수를 돌리다 손을 멈춘다. 잡음 사이로 무언가가 섞였다 사라진다.',
    develop: [
      '저녁마다 같은 시간에 같은 주파수에 무언가 다시 잡힌다. 해석은 안 된다.',
      '수진이 노트에 파형을 그린다. "같은 송신자가 계속 보내고 있어요. 우리가 못 알아듣는 겁니다."'
    ],
    reach: '좌표 단편이 잡힌다. 자원을 좀 더 들여 송신을 강화하면 해석 가능성이 높아진다.',
    resolve: {
      full:        '좌표가 완성된다. 안전지대로 가는 경로가 종이에 그려진다.',
      partial:     '좌표 일부만 잡힌다. 다음 주에 다시 시도해야 한다. "다음 주엔 조금 더."',
      fail:        '신호가 멀어진다. 노트에 적힌 좌표 단편은 아무 의미 없는 숫자가 된다.',
      frustration: '신호가 끊긴다. 며칠 동안 라디오 앞은 비어 있다.'
    }
  },

  refugee: {
    type: 'refugee',
    name: '피난민 비컨',
    rewardSummary: '인원 +1 (식량 부담 +1.5/일)',
    announce: '마을 외곽에서 누군가 천천히 다가오는 것이 보인다. 한 사람인지, 둘인지, 더 많은지 아직 모른다.',
    develop: [
      '망원경으로 보니 두 사람. 한 사람은 다리를 절고 있다. 좀비는 아니다.',
      '하영이 정찰을 다녀온다. "젊은 여자랑 노인. 무기는 없어 보였어요."'
    ],
    reach: '도착 직전. 받아들일 것인가, 돌려보낼 것인가. 식량을 좀 나누면 신뢰가 빠르게 쌓인다.',
    resolve: {
      full:        '두 명을 받아들였다. 짧은 인사 뒤 그들이 마을 일을 돕기 시작한다.',
      partial:     '한 명만 받아들였다. 한 명은 더 갈 곳이 있다고 떠난다.',
      fail:        '조건이 맞지 않아 돌려보낸다. 며칠 뒤 마을 외곽에서 흔적이 발견된다.',
      frustration: '거부 의사를 분명히 한다. 마을 안의 누군가가 며칠을 말이 없다.'
    }
  },

  supply: {
    type: 'supply',
    name: '보급 비컨',
    rewardSummary: '식량 +20, 의약품 +2, 연료 +10',
    announce: '편의점이 더 안쪽까지 비어 있지 않을 수도 있다는 소문. 하영이 위치를 안다.',
    develop: [
      '정찰. 거리 두 블록 안쪽에 손이 안 닿은 창고가 있다.',
      '진입 경로를 확인한다. 좀비 무리가 길을 막고 있어 시간 계산이 필요하다.'
    ],
    reach: '진입 직전. 자원을 더 투입하면(연료로 우회 화재, 식량으로 미끼) 안전 확보 가능.',
    resolve: {
      full:        '창고를 비웠다. 식량과 의약품, 연료가 마차에 실린다.',
      partial:     '절반만 가져온다. 나머지는 다음 기회로.',
      fail:        '좀비에 막혀 회수 실패. 탐색대 한 명이 가벼운 부상.',
      frustration: '함정이었다. 빈 창고에서 좀비가 쏟아진다. 탐색대가 큰 부상.'
    }
  }
};

// 결과 적용 — 자원/사기/엔딩 카운터 변화
LR.applyBeaconResult = function(state, result) {
  const type = state.beacon.type;
  const moraleAvgDelta = { full: 8, partial: 4, fail: -3, frustration: -8 }[result] || 0;

  for (const c of LR.aliveChars(state)) {
    c.morale = Math.max(0, Math.min(100, c.morale + moraleAvgDelta));
  }

  if (result === 'full') {
    state.beacon.completedSuccessCount[type] = (state.beacon.completedSuccessCount[type] || 0) + 1;
  }

  // 타입별 보상
  if (result === 'full') {
    if (type === 'supply') {
      state.food = Math.min(100, state.food + 20);
      state.medicine += 2;
      state.fuel = Math.min(100, state.fuel + 10);
    } else if (type === 'refugee') {
      // 인원 추가는 단순화 — 피난민 NPC 슬롯 없이 사기 부스트로만 처리
      // (10인 + NPC 처리 복잡 회피)
    } else if (type === 'comm') {
      // 안전지대 정보 — 엔딩 카운터에 +1 (위에서 처리됨)
    }
  } else if (result === 'partial') {
    if (type === 'supply') {
      state.food = Math.min(100, state.food + 10);
    }
  } else if (result === 'fail') {
    if (type === 'supply') {
      state.food = Math.max(0, state.food - 3);
    }
  } else if (result === 'frustration') {
    // 실패의 유산
    if (type === 'comm')    state.beacon.legacyBonus.comm += 10;
    if (type === 'supply')  state.beacon.legacyBonus.supply += 10;
    if (type === 'refugee') state.beacon.legacyBonus.refugee += 10;
  }

  // 투입 자원 회수 (실패 시 일부 손실)
  if (result === 'fail' || result === 'frustration') {
    state.food = Math.max(0, state.food - state.beacon.investedFood);
    state.fuel = Math.max(0, state.fuel - state.beacon.investedFuel);
  } else {
    // 성공·부분성공 시에도 투입한 만큼은 사용된 것
    state.food = Math.max(0, state.food - state.beacon.investedFood);
    state.fuel = Math.max(0, state.fuel - state.beacon.investedFuel);
  }
  state.beacon.investedFood = 0;
  state.beacon.investedFuel = 0;
};
