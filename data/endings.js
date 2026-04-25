// 엔딩 정의 (endings.js)
// sec 6.5 — 5개 엔딩 + 게임 오버

window.LR = window.LR || {};

LR.ENDINGS = {

  // 게임 오버 (D30 이전 가능)
  totalDeath: {
    id: 'totalDeath',
    title: '꺼진 등불',
    subtitle: 'TOTAL EXTINCTION',
    type: 'gameover',
    narration: function(state) {
      return [
        `Day ${state.day}. 마을에 마지막 숨이 끊겼다.`,
        '폐공장의 등은 더 이상 켜지지 않는다. 좀비는 바깥에서 잠시 코를 들고 다시 떠났다.',
        '아무도 이 마을을 기억하지 못할 것이다.'
      ];
    }
  },

  collapse: {
    id: 'collapse',
    title: '흩어진 사람들',
    subtitle: 'MORALE COLLAPSE',
    type: 'gameover',
    narration: function(state) {
      return [
        `Day ${state.day}. 마을의 사기가 사흘 동안 0에 머물렀다.`,
        '한 사람씩 짐을 쌌다. 누구도 누구를 붙잡지 않았다.',
        '폐공장의 문은 열린 채로 남는다. 봄바람도 가을바람도 더 이상 의미가 없다.'
      ];
    }
  },

  contagion: {
    id: 'contagion',
    title: '말 없는 마을',
    subtitle: 'CONTAGION',
    type: 'gameover',
    narration: function(state) {
      return [
        `Day ${state.day}. 격리 결정의 그림자가 마을 전체를 덮었다.`,
        '한 사람의 기침에서 시작된 것이 모든 폐를 적시기까지 걸린 시간은 짧았다.',
        '의무실의 등은 마지막까지 켜져 있었다.'
      ];
    }
  },

  // 30일 생존 엔딩 (5종)
  lightVillage: {
    id: 'lightVillage',
    title: '빛의 마을',
    subtitle: 'A VILLAGE OF LIGHT',
    type: 'survival',
    narration: function(state) {
      const surv = LR.aliveChars(state).length;
      const posLines = state.precedents.filter(p => p.type === 'pos').map(p => `· ${p.name}`).join('\n');
      return [
        `30일이 지났다. ${surv}명이 함께 아침을 맞았다.`,
        '약자를 버리지 않은 마을은 살아남았다. 결속·단합의 흔적이 마을의 매일에 새겨져 있다.',
        '이 30일 동안 새겨진 빛:',
        posLines || '· (없음)',
        '바깥은 여전히 위험하다. 그러나 안에서는 누구도 누구의 쓸모를 묻지 않았다. 그것이 이 마을이 다음 30일을 시작할 자격이 된다.'
      ];
    }
  },

  forgottenVillage: {
    id: 'forgottenVillage',
    title: '잊혀진 마을',
    subtitle: 'A VILLAGE THAT FORGOT',
    type: 'survival',
    narration: function(state) {
      const surv = LR.aliveChars(state).length;
      const negLines = state.precedents.filter(p => p.type === 'neg').map(p => `· ${p.name}`).join('\n');
      return [
        `30일이 지났다. ${surv}명이 살아남았다.`,
        '쓸모로만 사람을 재던 마을은 살아남았지만, 차가운 기록을 남겼다.',
        '이 30일 동안 새겨진 그림자:',
        negLines || '· (없음)',
        '식량 창고는 비어 있지 않다. 의무실에는 의약품이 남아 있다. 그러나 누군가의 빈자리는 채워지지 않을 것이다.'
      ];
    }
  },

  shakingVillage: {
    id: 'shakingVillage',
    title: '흔들리는 마을',
    subtitle: 'A VILLAGE STILL SHAKING',
    type: 'survival',
    narration: function(state) {
      const surv = LR.aliveChars(state).length;
      const pos = state.precedents.filter(p => p.type === 'pos').length;
      const neg = state.precedents.filter(p => p.type === 'neg').length;
      return [
        `30일이 지났다. ${surv}명이 함께, 그러나 같은 마음은 아니다.`,
        `살렸던 순간(${pos}회)과 버렸던 순간(${neg}회)이 함께 기억되는 마을.`,
        '한 사람의 빛이 다른 사람의 그림자를 완전히 가리지는 못한다. 그 반대도 마찬가지다.',
        '이 마을은 다음 30일에도 같은 흔들림을 안고 갈 것이다.'
      ];
    }
  },

  safezone: {
    id: 'safezone',
    title: '안전지대 도달',
    subtitle: 'BEACON COMPLETED',
    type: 'survival',
    narration: function(state) {
      const surv = LR.aliveChars(state).length;
      const profileLine = state.precedents.length > 0
        ? `이 마을이 떠난 자리에는 ${state.precedents.length}개의 결정이 남아 있다 — 다음에 올 사람이 그 흔적을 어떻게 읽을지는 모른다.`
        : '이 마을이 떠난 자리는 깨끗하다. 그것 자체가 한 종류의 기록이다.';
      return [
        `30일째. 통신 비컨의 좌표가 완성되었다. 안전지대로 가는 경로가 종이 한 장에 그려져 있다.`,
        `${surv}명이 폐공장을 떠난다. 짐은 가볍다 — 살아남은 자들에겐 가져갈 것이 별로 없다.`,
        profileLine,
        '바깥의 길은 멀다. 그러나 처음으로, "다음 주엔 조금 더"가 아니라 "다음 주엔 도착한다"가 된다.'
      ];
    }
  },

  weightedSurvival: {
    id: 'weightedSurvival',
    title: '30일 생존',
    subtitle: '30 DAYS · WEIGHTED',
    type: 'survival',
    narration: function(state) {
      const surv = LR.aliveChars(state).length;
      const pos = state.precedents.filter(p => p.type === 'pos').length;
      const neg = state.precedents.filter(p => p.type === 'neg').length;
      let line;
      if (pos > neg) line = '약간의 빛이 그림자보다 무거운 마을이다.';
      else if (neg > pos) line = '약간의 그림자가 빛보다 무거운 마을이다.';
      else line = '빛과 그림자가 정확히 같은 무게로 남은 마을이다.';
      return [
        `30일이 지났다. ${surv}명이 함께 아침을 맞는다.`,
        line,
        '큰 사건은 없었다. 큰 결정은 더 적었다. 그러나 매일 누군가는 누군가에게 한 마디를 건넸고, 매일 식사가 차려졌다.',
        '그 반복 자체가 이 마을의 30일이다.'
      ];
    }
  }
};

// 엔딩 검사 — 우선순위 순서
LR.checkEnding = function(state) {
  // 게임 오버 (언제든)
  const alive = LR.aliveChars(state);
  if (alive.length === 0) return LR.ENDINGS.totalDeath;

  if (LR.avgMorale(state) === 0) {
    state.counters.moraleZeroDays = (state.counters.moraleZeroDays || 0) + 1;
    if (state.counters.moraleZeroDays >= 3) return LR.ENDINGS.collapse;
  } else {
    state.counters.moraleZeroDays = 0;
  }

  const allInfected = alive.every(c => c.flags.contagion);
  if (allInfected && alive.length > 0) return LR.ENDINGS.contagion;

  if (state.day < 30) return null;

  // 30일 생존 분기
  const pos = state.counters.posPrecedents;
  const neg = state.counters.negPrecedents;
  const safezoneEligible = state.beacon.completedSuccessCount.comm >= 3;

  if (safezoneEligible) return LR.ENDINGS.safezone;
  if (pos >= 3 && neg === 0) return LR.ENDINGS.lightVillage;
  if (neg >= 3 && pos === 0) return LR.ENDINGS.forgottenVillage;
  if (pos >= 3 && neg >= 3) return LR.ENDINGS.shakingVillage;
  return LR.ENDINGS.weightedSurvival;
};
