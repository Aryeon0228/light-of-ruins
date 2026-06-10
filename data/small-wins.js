// Small Win 정의 (sec 5.7)
// 5종 자동 발동 이벤트. 비의도적·비발화·비지속 → 소음 0~+2

window.LR = window.LR || {};

LR.SMALL_WIN_DEFS = {
  SW1: {
    id: 'SW1',
    name: '민수의 그림',
    actor: 'minsu',
    cardImage: 'assets/images/cards/sw1_minsu.png',
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
    cardImage: 'assets/images/cards/sw2_hayeong.png',
    text: '하영이 마당 한쪽에서 가볍게 몸을 푼다. 누가 시킨 것도 아니다. 한 사람, 두 사람 옆에 와서 따라 한다.',
    canFire: function(state) {
      const h = LR.charById(state, 'hayeong');
      // 너무 자주 뜨지 않게 — 하영이 건강하고 '마을 사기가 처질 때(<65)'만 활력 부여
      return h.alive && h.health >= 70 && h.morale >= 55 && LR.avgMorale(state) < 65;
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
    cardImage: 'assets/images/cards/sw3_jeonghun.png',
    text: '정훈이 비축해둔 건조 식재료를 살짝 꺼내 작은 간식을 만든다. 누구에게 권한 것도 아닌데 다들 한 입씩 받는다.',
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
    cardImage: 'assets/images/cards/sw4_jonghyeok.png',
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
    cardImage: 'assets/images/cards/sw5_eunseo_song.png',
    text: '은서가 빨래를 개다가 무심코 옛 노래를 흥얼거린다. 빗소리에 반쯤 묻혀 들릴 듯 말 듯하다.',
    canFire: function(state) {
      const e = LR.charById(state, 'eunseo');
      if (!e.alive || e.morale < 55) return false;
      const avg = LR.avgMorale(state);
      // 빗소리에 묻히는 흥얼거림 — 비 오는 날(스크립트 D4~5 포함)이면 계절 무관
      const raining = LR.weatherOn ? LR.weatherOn(state) === 'rain' : state.season === 'rainy';
      return avg >= 50 && raining;
    },
    apply: function(state) {
      // 전원 +1, 은서 +2, 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'eunseo').morale = Math.min(100, LR.charById(state, 'eunseo').morale + 1);
      return { noise: 1 };
    }
  },

  SW6: {
    id: 'SW6',
    name: '은서의 첫 수확',
    actor: 'eunseo',
    cardImage: 'assets/images/cards/sw6_eunseo_harvest.png',
    text: '은서가 담벼락 밑 텃밭에서 첫 잎채소를 거둔다. 흙 묻은 손으로 한 줌을 들어 올리자, 누군가 "오…" 하고 작게 웃는다. 폐허에서도 무언가는 자란다.',
    canFire: function(state) {
      const e = LR.charById(state, 'eunseo');
      if (!e.alive || e.morale < 50) return false;
      if (state.season === 'winter') return false;          // 겨울엔 수확 없음
      return state.day >= 4 && state.water >= 30;            // 며칠 키운 뒤 · 물이 받쳐줄 때
    },
    apply: function(state) {
      // 첫 수확 — 식량 +6, 은서 +3, 전원 +2, 소음 0
      state.food = Math.min(100, state.food + 6);
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 2);
      LR.charById(state, 'eunseo').morale = Math.min(100, LR.charById(state, 'eunseo').morale + 3);
      return { noise: 0 };
    }
  },

  SW7: {
    id: 'SW7',
    name: '영수의 옛이야기',
    actor: 'yeongsu',
    cardImage: 'assets/images/cards/sw7_yeongsu_story.png',
    text: '영수가 모닥불 가에서 폐허 이전의 세상 이야기를 풀어놓는다. 전등이 켜진 거리, 늦은 밤의 라디오, 흔하던 것들. 젊은 사람들이 하나둘 둘러앉는다. 잠시, 바깥의 추위도 그림자도 잊는다. 쓸모란 무엇인가.',
    canFire: function(state) {
      const y = LR.charById(state, 'yeongsu');
      if (!y.alive || y.morale < 40) return false;   // 체력은 보지 않음 — 약해도 이야기는 남는다
      return LR.avgMorale(state) >= 45;
    },
    apply: function(state) {
      // 둘러앉은 사람들 +2, 영수 +1(쓸모를 되묻다), 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 2);
      LR.charById(state, 'yeongsu').morale = Math.min(100, LR.charById(state, 'yeongsu').morale + 1);
      return { noise: 1 };
    }
  },

  // ═══ v1.3 확장 — SW8~SW17: 10인 전원 + 계절·상황 변주 ═══

  SW8: {
    id: 'SW8',
    name: '재혁의 분필 한 줄',
    actor: 'jaehyeok',
    cardImage: 'assets/images/cards/sw8_jaehyeok.png',
    text: '새벽 순찰을 끝낸 재혁이 담장 안쪽에 분필로 짧게 적는다 — "오늘도 이상 없음." 아침에 그 글씨를 본 사람들이 말없이 하루를 시작한다.',
    canFire: function(state) {
      const j = LR.charById(state, 'jaehyeok');
      return j.alive && j.health >= 55 && !state.raidedLastNight && state.day >= 2;
    },
    apply: function(state) {
      // 전원 +1, 재혁 +2, 소음 0
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'jaehyeok').morale = Math.min(100, LR.charById(state, 'jaehyeok').morale + 1);
      return { noise: 0 };
    }
  },

  SW9: {
    id: 'SW9',
    name: '수진의 약상자 정리',
    actor: 'sujin',
    cardImage: 'assets/images/cards/sw9_sujin.png',
    text: '수진이 의무실 약상자를 다시 정리한다. 남은 약을 세고, 붕대를 개고, 라벨을 새로 붙인다. 부상자들이 그 손길을 본다 — 아직 우리를 돌볼 준비가 되어 있는 사람이 있다.',
    canFire: function(state) {
      const s2 = LR.charById(state, 'sujin');
      if (!s2.alive || state.medicine < 1) return false;
      return LR.aliveChars(state).some(c => c.health < 50);   // 돌볼 부상자가 있을 때
    },
    apply: function(state) {
      // 부상자(체력<50) 각 +3, 수진 +2, 소음 0
      for (const c of LR.aliveChars(state)) {
        if (c.health < 50) c.morale = Math.min(100, c.morale + 3);
      }
      LR.charById(state, 'sujin').morale = Math.min(100, LR.charById(state, 'sujin').morale + 2);
      return { noise: 0 };
    }
  },

  SW10: {
    id: 'SW10',
    name: '동호의 보강 도면',
    actor: 'dongho',
    cardImage: 'assets/images/cards/sw10_dongho.png',
    text: '동호가 폐자재 더미 앞에 쪼그려 앉아 못 쓰는 종이 뒷면에 담장 보강 도면을 그린다. 누가 시킨 일이 아니다. "이 정도면 제대로 지을 수 있겠군." 혼잣말이 그답지 않게 가볍다.',
    canFire: function(state) {
      const d = LR.charById(state, 'dongho');
      return d.alive && d.morale >= 30 && d.morale <= 55;   // 바닥은 아니되 회의가 남아 있을 때
    },
    apply: function(state) {
      // 동호 +4 (스스로 만든 회복), 소음 0
      LR.charById(state, 'dongho').morale = Math.min(100, LR.charById(state, 'dongho').morale + 4);
      return { noise: 0 };
    }
  },

  SW11: {
    id: 'SW11',
    name: '미연의 자장가',
    actor: 'miyeon',
    cardImage: 'assets/images/cards/sw11_miyeon.png',
    text: '미연이 아기를 안고 아주 작은 소리로 자장가를 부른다. 곡조는 반쯤 잊었지만 박자는 남아 있다. 가까이 있던 사람들의 어깨가 조금 풀린다.',
    canFire: function(state) {
      const m = LR.charById(state, 'miyeon');
      return m.alive && state.baby.exists && state.noiseToday <= 25;
    },
    apply: function(state) {
      // 전원 +1, 미연 +2, 소음 0 (속삭임 수준)
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'miyeon').morale = Math.min(100, LR.charById(state, 'miyeon').morale + 1);
      return { noise: 0 };
    }
  },

  SW12: {
    id: 'SW12',
    name: '종혁의 라디오 손질',
    actor: 'jonghyeok',
    cardImage: 'assets/images/cards/sw12_jonghyeok.png',
    text: '종혁이 성한 왼손으로 라디오 뒷판을 열고 접점을 닦는다. 지지직거리던 잡음이 조금 맑아진다. 수진이 옆에서 고개를 끄덕인다. "오늘 밤엔 더 잘 들리겠어요."',
    canFire: function(state) {
      const j = LR.charById(state, 'jonghyeok');
      if (!j.alive) return false;
      return state.beacon.phase === 'develop' || state.beacon.phase === 'reach';
    },
    apply: function(state) {
      // 종혁 +3, 수진 +2, 소음 +1
      LR.charById(state, 'jonghyeok').morale = Math.min(100, LR.charById(state, 'jonghyeok').morale + 3);
      const su = LR.charById(state, 'sujin');
      if (su.alive) su.morale = Math.min(100, su.morale + 2);
      return { noise: 1 };
    }
  },

  SW13: {
    id: 'SW13',
    name: '민수와 아기',
    actor: 'minsu',
    cardImage: 'assets/images/cards/sw13_minsu_baby.png',
    text: '민수가 아기 앞에서 손가락 그림자로 토끼를 만든다. 아기가 울음을 멈추고 그림자를 따라 눈을 굴린다. 미연이 처음으로 소리 내지 않고 웃는다.',
    canFire: function(state) {
      const m = LR.charById(state, 'minsu');
      return m.alive && state.baby.exists && m.morale >= 50;
    },
    apply: function(state) {
      // 민수 +3, 미연 +3, 소음 +1
      LR.charById(state, 'minsu').morale = Math.min(100, LR.charById(state, 'minsu').morale + 3);
      const mi = LR.charById(state, 'miyeon');
      if (mi.alive) mi.morale = Math.min(100, mi.morale + 3);
      return { noise: 1 };
    }
  },

  SW14: {
    id: 'SW14',
    name: '마당의 새 한 마리',
    actor: 'yeongsu',
    cardImage: 'assets/images/cards/sw14_bird.png',
    text: '영수가 창틀에 마른 곡식 부스러기를 한 줌 놓아둔다. 한낮에 작은 새 한 마리가 내려앉아 쪼아 먹는다. 좀비가 지나간 거리에도 새는 온다 — 모두가 잠깐 그쪽을 본다.',
    canFire: function(state) {
      const y = LR.charById(state, 'yeongsu');
      return y.alive && state.season !== 'winter' && state.food >= 25;
    },
    apply: function(state) {
      // 전원 +1, 영수 +2, 소음 0
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'yeongsu').morale = Math.min(100, LR.charById(state, 'yeongsu').morale + 1);
      return { noise: 0 };
    }
  },

  SW15: {
    id: 'SW15',
    name: '은서와 민수의 그림자놀이',
    actor: 'eunseo',
    cardImage: 'assets/images/cards/sw15_shadowplay.png',
    text: '모닥불 빛에 비친 벽 그림자로 은서와 민수가 늑대와 토끼를 만든다. 쫓고 쫓기는 그림자극. 소리는 거의 없는데, 둘러앉은 어른들의 입꼬리가 올라간다.',
    canFire: function(state) {
      const e = LR.charById(state, 'eunseo'), m = LR.charById(state, 'minsu');
      return e.alive && m.alive && state.fuel >= 5 && e.morale >= 45 && m.morale >= 45;
    },
    apply: function(state) {
      // 전원 +1, 민수 +3, 은서 +2, 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 1);
      LR.charById(state, 'minsu').morale = Math.min(100, LR.charById(state, 'minsu').morale + 2);
      LR.charById(state, 'eunseo').morale = Math.min(100, LR.charById(state, 'eunseo').morale + 1);
      return { noise: 1 };
    }
  },

  SW16: {
    id: 'SW16',
    name: '하영의 망루 일몰',
    actor: 'hayeong',
    cardImage: 'assets/images/cards/sw16_hayeong_sunset.png',
    text: '경계 교대 직전, 하영이 망루 난간에 기대 해가 지는 폐허를 본다. 올라온 교대자에게 한마디 — "오늘 노을은 봐 둘 만해요." 두 사람이 잠시 같은 방향을 본다.',
    canFire: function(state) {
      const h = LR.charById(state, 'hayeong');
      return h.alive && h.health >= 55 && (state.season === 'autumn' || state.season === 'spring_late');
    },
    apply: function(state) {
      // 하영 +3, 근접 1인(사기 최저자) +2, 소음 0
      LR.charById(state, 'hayeong').morale = Math.min(100, LR.charById(state, 'hayeong').morale + 3);
      const sorted = LR.aliveChars(state).slice().sort((a, b) => a.morale - b.morale);
      const target = sorted.find(c => c.id !== 'hayeong');
      if (target) target.morale = Math.min(100, target.morale + 2);
      return { noise: 0, targetName: target ? target.name : null };
    }
  },

  SW17: {
    id: 'SW17',
    name: '정훈의 남은 국물',
    actor: 'jeonghun',
    cardImage: 'assets/images/cards/sw17_jeonghun_soup.png',
    text: '겨울 저녁, 정훈이 식은 솥 바닥의 국물을 다시 데워 한 모금씩 돌린다. 새 식량을 쓴 것도 아닌데, 따뜻한 것이 목을 넘어가는 순간 모두의 입김이 조금 느려진다.',
    canFire: function(state) {
      const j = LR.charById(state, 'jeonghun');
      return j.alive && state.season === 'winter' && state.fuel >= 3;
    },
    apply: function(state) {
      // 전원 +2, 정훈 +2, 소음 +1
      for (const c of LR.aliveChars(state)) c.morale = Math.min(100, c.morale + 2);
      LR.charById(state, 'jeonghun').morale = Math.min(100, LR.charById(state, 'jeonghun').morale + 0);
      return { noise: 1 };
    }
  }
};
