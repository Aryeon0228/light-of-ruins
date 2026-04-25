// Small Win 정의 (sec 5.7)
// 5종 자동 발동 이벤트. 비의도적·비발화·비지속 → 소음 0~+2

window.LR = window.LR || {};

LR.SMALL_WIN_DEFS = {
  SW1: {
    id: 'SW1',
    name: '민수의 그림',
    actor: 'minsu',
    text: '민수가 종이 위에 색연필로 무언가를 그린다. 한참 뒤 한 사람의 무릎 옆에 슬며시 놓고 간다. 그림 속에는 불빛이 켜진 작은 집이 있다.',
    canFire: function(state) {
      const minsu = LR.charById(state, 'minsu');
      if (!minsu.alive || minsu.morale < 60) return false;
      const avg = LR.avgMorale(state);
      if (avg < 50 || avg > 70) return false;
      const despair = LR.aliveChars(state).find(c => c.morale < 50);
      return !!despair;
    },
    apply: function(state) {
      // 지정 절망자 +5, 민수 +2, 소음 0
      const target = LR.aliveChars(state).find(c => c.morale < 50);
      if (target) target.morale = Math.min(100, target.morale + 5);
      LR.charById(state, 'minsu').morale = Math.min(100, LR.charById(state, 'minsu').morale + 2);
      return { noise: 0, targetName: target ? target.name : null };
    }
  },

  SW2: {
    id: 'SW2',
    name: '하영의 아침 운동',
    actor: 'hayeong',
    text: '하영이 마당 한쪽에서 가볍게 몸을 푼다. 누가 시킨 것도 아니다. 한 사람, 두 사람 옆에 와서 따라 한다.',
    canFire: function(state) {
      const h = LR.charById(state, 'hayeong');
      return h.alive && h.health >= 70;
    },
    apply: function(state) {
      // 전원 +1, 하영 +2, 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'hayeong').morale = Math.min(100, LR.charById(state, 'hayeong').morale + 1);
      return { noise: 1 };
    }
  },

  SW3: {
    id: 'SW3',
    name: '정훈의 작은 간식',
    actor: 'jeonghun',
    text: '정훈이 비축해둔 건조 식재료를 살짝 꺼내 작은 간식을 만든다. 누구에게 권한 것도 아닌데 다들 한 입씩 받는다.',
    cutscene: {
      id: 'sw3_jeonghun_snack',
      frames: [
        { image: 'assets/images/cutscenes/sw3_1.svg',
          text: '정훈이 창고 구석에서 비축해둔 건조 나물 한 줌을 꺼낸다. 누구도 보지 못한 척한다.' },
        { image: 'assets/images/cutscenes/sw3_2.svg',
          text: '국 한 솥. 절제된 양념. 그래도 김이 오른다.' },
        { image: 'assets/images/cutscenes/sw3_3.svg',
          text: '동호가 처음으로 한 입 떠 본다. "… 의외로 괜찮은데." 정훈이 표정 없이 고개만 끄덕인다.' }
      ]
    },
    canFire: function(state) {
      const j = LR.charById(state, 'jeonghun');
      if (!j.alive || j.morale < 55) return false;
      return state.food >= 70 || state.driedFood >= 10;
    },
    apply: function(state) {
      // 전원 +2, 정훈 +3, 소음 +2
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 2);
      LR.charById(state, 'jeonghun').morale = Math.min(100, LR.charById(state, 'jeonghun').morale + 1);
      return { noise: 2 };
    }
  },

  SW4: {
    id: 'SW4',
    name: '종혁의 손녀 사진',
    actor: 'jonghyeok',
    text: '종혁이 호주머니에서 손때 묻은 사진 한 장을 꺼낸다. 한참을 들여다보고 다시 접는다. 옆에 앉은 누군가가 그 자세를 바라본다.',
    canFire: function(state) {
      const j = LR.charById(state, 'jonghyeok');
      if (!j.alive) return false;
      if (j.morale < 40 || j.morale > 60) return false;
      const despair = LR.aliveChars(state).find(c => c.morale < 50);
      return !!despair;
    },
    apply: function(state) {
      // 종혁 +3, 근접 1인 +4, 소음 0
      LR.charById(state, 'jonghyeok').morale = Math.min(100, LR.charById(state, 'jonghyeok').morale + 3);
      const target = LR.aliveChars(state).find(c => c.morale < 50);
      if (target) target.morale = Math.min(100, target.morale + 4);
      return { noise: 0, targetName: target ? target.name : null };
    }
  },

  SW5: {
    id: 'SW5',
    name: '은서의 노래 흥얼거림',
    actor: 'eunseo',
    text: '은서가 빨래를 개다가 무심코 옛 노래를 흥얼거린다. 빗소리에 반쯤 묻혀 들릴 듯 말 듯하다.',
    canFire: function(state) {
      const e = LR.charById(state, 'eunseo');
      if (!e.alive || e.morale < 55) return false;
      const avg = LR.avgMorale(state);
      return avg >= 50 && (state.season === 'rainy');
    },
    apply: function(state) {
      // 전원 +1, 은서 +2, 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'eunseo').morale = Math.min(100, LR.charById(state, 'eunseo').morale + 1);
      return { noise: 1 };
    }
  }
};
