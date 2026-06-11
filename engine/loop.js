// 게임 루프 (loop.js)
// 일일 흐름: morning → 시나리오 표시 → 선택지 클릭 → 결과 적용 → 다음 날

window.LR = window.LR || {};

LR.engine = LR.engine || {};

// ─── 마을 연대기 — 이 판에서 실제로 일어난 일들의 기록 (엔딩에서 연표로) ───
LR.chron = function(state, text, kind) {
  if (!state.chronicle) state.chronicle = [];
  state.chronicle.push({ day: state.day, text: text, kind: kind || 'event' });
};

// ─── 게임 시작 ───
LR.engine.startNewGame = function() {
  LR.state = LR.createInitialState();
  // 비컨 첫 주
  LR.state.beacon.weekIndex = 0;
  LR.state.beacon.type = LR.BEACON_ROTATION[0];
  LR.state.beacon.weekStartDay = 1;
  LR.state.beacon.phase = 'announce';
  LR.state.beacon.forcedPartial = true;

  LR.engine.beginDay();
};

// ─── 하루 시작 ───
// 매일 호출되며, 오늘 표시할 시나리오 노드를 결정하고 렌더링
LR.engine.beginDay = function() {
  const state = LR.state;
  if (state.ending) {
    LR.render.showEnding(state);
    return;
  }

  // 비컨 단계 갱신
  LR.tickBeacon(state);

  // TI · 식량 구간 · 평균 사기 등 일일 휘발 상태 계산
  LR.engine.recomputeDerived(state);

  // 시나리오 선택
  const node = LR.selectScenarioNode(state);
  state.pendingChoice = node;
  state.awaitingChoice = true;

  // 최근 시나리오 추적 (반복 방지)
  state.recentScenarios.push(node.id);
  if (state.recentScenarios.length > 4) state.recentScenarios.shift();

  LR.render.renderAll(state);

  // 마을이 메인 플레이 표면이면 오늘의 결정을 마을 안에서 갱신
  if (LR.village && LR.village.syncFromGame) LR.village.syncFromGame(state);
};

LR.engine.recomputeDerived = function(state) {
  state.TI = LR.computeTI(state);
  // 위기·이완 연속 일수
  if (state.TI <= 25) {
    state.releaseStreak = (state.releaseStreak || 0) + 1;
    state.crisisStreak = 0;
  } else if (state.TI >= 51) {
    state.crisisStreak = (state.crisisStreak || 0) + 1;
    state.releaseStreak = 0;
  } else {
    state.releaseStreak = 0;
    state.crisisStreak = 0;
  }
  if (state.rescueCooldown > 0) state.rescueCooldown -= 1;
};

// ─── 선택지 적용 ───
LR.engine.applyChoice = function(choiceId) {
  const state = LR.state;
  const node = state.pendingChoice;
  if (!node) return;
  const choice = node.choices.find(c => c.id === choiceId);
  if (!choice) return;

  // 선택 직전 자원 스냅샷(결과 변화량 표시용)
  const _resSnap = (st) => ({
    food: st.food + st.driedFood + st.pickledFood, water: st.water, fuel: st.fuel,
    medicine: st.medicine, morale: Math.round(LR.avgMorale(st)), noise: st.noiseToday
  });
  const _before = _resSnap(state);

  // 1. 기본 자원 델타
  if (choice.deltas) {
    for (const k in choice.deltas) {
      state[k] = (state[k] || 0) + choice.deltas[k];
      if (k === 'food' || k === 'water' || k === 'fuel') state[k] = Math.max(0, Math.min(100, state[k]));
      if (k === 'medicine') state[k] = Math.max(0, state[k]);
    }
  }

  // 2. 인물별 델타
  let perChar = choice.perCharDeltas;
  if (typeof perChar === 'function') perChar = perChar(state);
  if (perChar) {
    for (const id in perChar) {
      const c = state.characters[id];
      if (!c) continue;
      const d = perChar[id];
      if (d.health !== undefined) c.health = Math.max(0, Math.min(100, c.health + d.health));
      if (d.morale !== undefined) c.morale = Math.max(0, Math.min(100, c.morale + d.morale));
      if (d.contagionRisk) c.flags.contagion = true;
    }
  }

  // 2b. 탐색(외출) 부상 롤 — 확정 차감 대신 확률. 다치면 전용 컷씬으로 보여준다.
  let expedWound = null;
  if (choice.expedition) {
    const ex = choice.expedition;
    let lead = (ex.leadId && state.characters[ex.leadId] && state.characters[ex.leadId].alive)
      ? state.characters[ex.leadId] : null;
    if (!lead || lead.health < 35) {
      lead = LR.aliveChars(state).find(c => c.health >= 50 && c.morale >= 25) || lead;
    }
    if (lead && Math.random() < (ex.injuryChance || 0.35)) {
      const lo = ex.injuryMin || 6, hi = ex.injuryMax || 16;
      const dmg = Math.floor(lo + Math.random() * (hi - lo + 1));
      lead.health = Math.max(0, lead.health - dmg);
      lead.flags.expedHurtDay = state.day;            // 사인(死因) 추적용
      expedWound = { lead: lead, dmg: dmg, spot: ex.spot || '폐허' };
      LR.render.toast(`탐색 부상 — ${lead.name} 체력 -${dmg}`, 'raid');
    }
  }

  // 6.5 아기 이름 — 이름 짓기 이벤트의 선택 결과
  if (choice.babyName !== undefined && state.baby.exists) {
    state.baby.name = choice.babyName;
    if (choice.babyName) {
      LR.render.toast(`아기의 이름 — ${choice.babyName}`, 'smallwin');
      LR.chron(state, `아기의 이름을 지었다 — ${choice.babyName}`, 'pos');
    }
  }

  // 3. 마을 전체 사기
  if (choice.moraleAll) {
    for (const c of LR.aliveChars(state)) {
      c.morale = Math.max(0, Math.min(100, c.morale + choice.moraleAll));
    }
  }

  // 4. 의도적 소음
  const intentionalNoise = choice.intentionalNoise || 0;
  state.yesterdayNoise = state.noiseToday;
  state.noiseToday = LR.computeNoise(state, intentionalNoise);

  // 5. 비컨 자원 투입 기록
  if (choice.beaconInvest) {
    state.beacon.investedFood += choice.beaconInvest.food || 0;
    state.beacon.investedFuel += choice.beaconInvest.fuel || 0;
  }

  // 6. 플래그
  if (choice.flags) {
    Object.assign(state, { flags: Object.assign(state.flags || {}, choice.flags) });
  }

  // 7. 전례 후보 생성 시도
  if (choice.precedentCandidate) {
    const newPrec = LR.tryGeneratePrecedent(state, choice.precedentCandidate);
    if (newPrec) {
      LR.render.toast(`${newPrec.id} 생성 — ${newPrec.name}`,
                      newPrec.type === 'neg' ? 'precedent-neg' : 'precedent-pos');
      LR.chron(state, `전례 ${newPrec.id} 『${newPrec.name}』 — ${newPrec.label}`, newPrec.type === 'neg' ? 'neg' : 'pos');
      // 같은 결정도 인물마다 다르게 읽힌다 — 감수성 분화 반응을 다음 날 아침에 보여준다
      state.pendingReactions = LR.buildPrecedentReactions(state, newPrec);
    }
  }

  // 7.5 의약품 없는 출산 시도 — 실패는 주사위의 잔인함이 아니라 '아낀 의약품 1회분'의 결과다
  let birthOutcome = null, birthLossCut = null;
  if (choice.birthAttempt && !state.baby.exists) {
    const fail = Math.random() < (choice.birthAttempt.failChance || 0.35);
    const miyeon = state.characters.miyeon;
    if (!fail) {
      // 성공 — 그러나 의약품 없이 버틴 출산은 산모를 깊이 소모시킨다
      birthOutcome = 'success';
      state.baby.exists = true;
      state.baby.bornDay = state.day;
      miyeon.hasBaby = true;
      miyeon.health = Math.max(1, miyeon.health - 22);
      LR.render.toast('아기 출생 — 의약품 없이. 미연이 깊이 소모되었다', 'beacon');
      LR.chron(state, '아기가 태어났다 — 의약품 없이, 어둠 속에서', 'pos');
    } else {
      // 실패 — 아기를 잃는다. 절제된 연출, 그러나 마을의 도덕적 좌표계에 새겨진다
      birthOutcome = 'fail';
      state.baby.lost = true;
      state.baby.lostDay = state.day;
      miyeon.health = Math.max(1, miyeon.health - 25);
      miyeon.morale = Math.max(0, miyeon.morale - 35);
      const minsu = state.characters.minsu;
      if (minsu.alive) minsu.morale = Math.max(0, minsu.morale - 12);
      for (const c of LR.aliveChars(state)) c.morale = Math.max(0, c.morale - 8);
      // 부정 전례 — 기획서 트리거 '의약품 박탈': 약을 아낀 결정이 좌표계가 된다
      const p = LR.tryGeneratePrecedent(state, {
        triggerKey: 'medicine_withheld', scriptedOverride: true, targets: ['miyeon']
      });
      if (p) {
        LR.render.toast(`${p.id} 생성 — ${p.name}`, 'precedent-neg');
        LR.chron(state, `전례 ${p.id} 『${p.name}』 — ${p.label}`, 'neg');
        state.pendingReactions = LR.buildPrecedentReactions(state, p);
      }
      state.pendingBabyLoss = true;
      birthLossCut = LR.buildBirthLossCutscene(state);
      LR.render.toast('출산 실패 — 아기를 잃었다', 'raid');
      LR.chron(state, '아기를 잃었다 — 첫 울음 대신 침묵', 'death');
    }
  }

  // 8. 스크립트 데이 특수 효과
  let yeongsuDeathCut = null;
  if (node.yeongsuDies) {
    const y = state.characters.yeongsu;
    if (y.alive) {
      y.alive = false;
      y.health = 0;
      y.morale = 0;
      y.status = 'dead';
      y.deathDay = state.day;
      y.deathCause = '사흘의 방치';
      LR.render.toast('영수 사망 — Day ' + state.day, 'raid');
      LR.chron(state, '영수가 떠났다 — 사흘의 방치', 'death');
      // 마을 사기 -15 전체
      for (const c of LR.aliveChars(state)) c.morale = Math.max(0, c.morale - 5);
      // 죽음의 의례 — 작별 컷씬 + 다음 날 추모 예약. 출산과 같은 밤이면 한 프레임에 겹친다.
      yeongsuDeathCut = LR.buildDeathCutscene(state, [y], choice.babyBorn || birthOutcome === 'success');
      state.pendingMourning = { id: 'yeongsu', name: y.name };
    }
  }
  if (choice.babyBorn) {
    state.baby.exists = true;
    state.baby.bornDay = state.day;
    state.characters.miyeon.hasBaby = true;
    LR.render.toast('아기 출생 — 통제 불가 소음원 +10/일', 'beacon');
    LR.chron(state, '아기가 태어났다', 'pos');
  }

  // 9. 비컨 D7 자동 해소 — 결과는 다음날 시나리오 상단에 표시되도록 저장
  const dayInWeek = LR.beaconDayInWeek(state);
  if (dayInWeek === 7) {
    const result = LR.resolveBeacon(state);
    const label = { full:'완전 성공', partial:'부분 성공', fail:'실패', frustration:'좌절' }[result.result];
    LR.render.toast(`비컨 ${label} — ${LR.BEACON_TYPES[result.type].name}`, 'beacon');
    LR.chron(state, `${LR.BEACON_TYPES[result.type].name} — ${label}`, 'beacon');
    // 다음 일자 시나리오 상단에 표시할 비컨 결과
    state.pendingBeaconResolution = {
      type: result.type,
      result: result.result,
      text: result.text,
      label: label
    };
  }

  // 10. Small Win 시도 — 발동 시 카드 영구 수집 + 첫 발동 카드 기억
  const fired = LR.trySmallWins(state);
  let cardSW = null, cardIsNew = false;
  for (const sw of fired) {
    LR.render.toast(`${sw.id} — ${sw.name}`, 'smallwin');
    const isNew = (LR.collection && LR.collection.add) ? LR.collection.add(sw.id) : false;
    if (!cardSW) { cardSW = sw; cardIsNew = isNew; }
  }

  // 11. 일일 마감 → (컷씬) → 다음 날
  state.awaitingChoice = false;

  // 11a. 컷씬 — 순차 체인: [스몰윈 카드(보상)] → [탐색 부상] → 없으면 선택지/자동 생성 1컷
  //  탐색 부상은 큰 사건이므로 별도 컷씬으로 반드시 보여준다 (스몰윈과 같은 날이어도 둘 다)
  const _after = _resSnap(state);
  const resultDeltas = {
    food: _after.food - _before.food, morale: _after.morale - _before.morale,
    water: _after.water - _before.water, fuel: _after.fuel - _before.fuel,
    medicine: _after.medicine - _before.medicine, noise: _after.noise - _before.noise
  };
  const cuts = [];
  if (cardSW) {
    const def = LR.SMALL_WIN_DEFS[cardSW.id];
    cuts.push({ cut: def.cutscene || LR.buildSmallWinCutscene(def, cardSW.text),   // 전용 아트 없으면 인물 포트레이트 카드
                tone: 'reward', badge: def.name, isNew: cardIsNew, deltas: resultDeltas });
  }
  if (expedWound) {
    cuts.push({ cut: LR.buildExpeditionWoundCutscene(state, expedWound),
                tone: 'bad', badge: '탐색 부상', isNew: false, deltas: { health: -expedWound.dmg } });
  }
  if (yeongsuDeathCut) {
    cuts.push({ cut: yeongsuDeathCut, tone: 'bad', badge: '상실', isNew: false, deltas: null });
  }
  if (birthLossCut) {
    cuts.push({ cut: birthLossCut, tone: 'bad', badge: '잃어버린 울음', isNew: false, deltas: null });
  }
  if (!cuts.length) {
    if (choice.cutscene) {
      cuts.push({ cut: choice.cutscene, tone: choice.cutscene.tone || 'special',
                  badge: choice.cutscene.badge, isNew: false, deltas: resultDeltas });
    } else {
      cuts.push({ cut: LR.buildChoiceCutscene(node, choice, state),
                  tone: (choice.risk === 'danger') ? 'bad' : 'plain', badge: undefined, isNew: false, deltas: resultDeltas });
    }
  } else if (!cardSW && expedWound) {
    // 부상 컷씬만 있을 때는 결과 변화량(식량 수확 포함)도 함께 보여준다
    cuts[0].deltas = Object.assign({ health: -expedWound.dmg }, resultDeltas);
  }
  const playChain = function(list) {
    if (!list.length || !LR.cutscene || !LR.cutscene.play) { LR.engine.endOfDay(); return; }
    const head = list[0];
    LR.cutscene.play(head.cut, () => playChain(list.slice(1)), head.tone, head.badge, head.isNew, head.deltas);
  };
  playChain(cuts);
};

// 선택 결과를 마을 일러스트 위에 보여주는 자동 컷씬(전용 아트가 없을 때).
//  선택지의 label(무엇을 택했나) + body(그래서 무슨 일이 벌어지나)를 시네마틱 캡션으로.
LR.villageCutsceneBg = function(season) {
  const map = { spring_late: 'bg_village_spring', autumn: 'bg_village_fall', winter: 'bg_village_winter' };
  return 'assets/images/village/' + (map[season] || 'bg_village') + '.png';
};
// 스몰윈 카드 컷씬(전용 아트가 없을 때) — 인물 포트레이트를 카드 아트로, 스몰윈 텍스트를 캡션으로.
//  textOverride: 상태 반영 텍스트(함수형 text가 만든 문장)를 우선 사용
LR.buildSmallWinCutscene = function(def, textOverride) {
  const portrait = 'assets/images/portraits/' + (def.actor || 'bc') + '.png';
  const img = def.cardImage || portrait;
  const text = textOverride || (typeof def.text === 'function' ? def.text(LR.state) : def.text);
  return { id: 'swcard_' + def.id, frames: [{ image: img, fallback: portrait, text: text }] };
};
// 습격(부상) 컷씬 — 다침은 큰 사건이므로 스몰윈처럼 컷씬 + 체력 변화 표시.
//  텍스트는 규모별 풀에서 랜덤 — 매번 같은 문장이 반복되지 않게.
//  1프레임 이미지는 전용 일러스트 슬롯(assets/images/cutscenes/raid_*.png) → 없으면 마을 배경 폴백.
LR.RAID_SLOT_KEY = { '잠잠': 'calm', '주의': 'small', '경계': 'mid', '위험': 'large' };
LR.RAID_OPENERS = {
  '잠잠': [
    '새벽, 담장 밖에서 무언가 끌리는 소리가 났다. 한두 마리. 그러나 한두 마리도 손톱은 있다.',
    '거의 조용한 밤이었다 — 거의. 뒷담장 판자 하나가 안쪽으로 휘었다.'
  ],
  '주의': [
    '간밤, 소규모 무리가 담장을 더듬었다. 손바닥으로 벽을 두드리는 소리가 새벽까지 이어졌다.',
    '서너 마리가 정문 쪽으로 몰렸다. 어둠 속에서 누군가 먼저 막아섰다.',
    '낮의 소음이 손님을 불렀다. 많지는 않다. 그러나 빈손으로 돌아가지도 않았다.'
  ],
  '경계': [
    '중규모 습격. 담장 한 구간이 무게를 못 이기고 삐걱였다. 모두가 깨어 있어야 했다.',
    '여섯, 일곱… 세다가 그만뒀다. 막는 것이 먼저였다.',
    '간밤의 소리가 무리를 끌고 왔다. 횃불과 몽둥이로 새벽을 버텼다.'
  ],
  '위험': [
    '대규모 습격. 담장 전체가 울렸다. 마을의 모든 손이 무기를 잡았다.',
    '어둠 속에서 수를 셀 수 없었다. 물러난 것은 해가 뜨고 나서였다.'
  ]
};
LR.RAID_WOUND_LINES = [
  (n) => `${LR.nameGa(n)} 앞에 나섰다가 다쳤다. 깊지는 않지만, 가볍지도 않다.`,
  (n) => `${LR.nameGa(n)} 무너지는 판자를 몸으로 받았다. 어깨에서 피가 배어 나온다.`,
  (n) => `${LR.nameGa(n)} 손을 물릴 뻔했다. 물리진 않았다 — 대신 팔이 찢어졌다.`,
  (n) => `밀려나던 ${LR.nameGa(n)} 잔해에 깔렸다. 끌어내는 데 두 사람이 붙었다.`
];
LR.buildRaidCutscene = function(state, victims, scale) {
  const bg = LR.villageCutsceneBg(state.season);
  const slotKey = LR.RAID_SLOT_KEY[scale] || 'small';
  const slot = 'assets/images/cutscenes/raid_' + slotKey + '.png';
  const openers = LR.RAID_OPENERS[scale] || LR.RAID_OPENERS['주의'];
  const opener = openers[Math.floor(Math.random() * openers.length)];
  const frames = [{ image: slot, fallback: bg, slot: slot, text: opener }];
  for (const v of victims) {
    const port = 'assets/images/portraits/' + (v.id || 'bc') + '.png';
    const line = LR.RAID_WOUND_LINES[Math.floor(Math.random() * LR.RAID_WOUND_LINES.length)];
    frames.push({ image: port, fallback: bg, text: line(v.name) });
  }
  return { id: 'raid_' + state.day, frames };
};
// 죽음의 의례 — 토스트 한 줄로 지나가던 죽음을, 그 사람만의 작별 문장으로 보낸다.
//  withBirth: 출산과 같은 밤의 죽음(D7 영수)이면 탄생과 상실을 한 호흡에 겹친다.
LR.buildDeathCutscene = function(state, deads, withBirth) {
  const bg = LR.villageCutsceneBg(state.season);
  const frames = [];
  for (const c of deads) {
    const port = 'assets/images/portraits/' + c.id + '.png';
    frames.push({ image: port, fallback: bg,
      text: (LR.DEATH_LINES && LR.DEATH_LINES[c.id]) || `${LR.nameGa(c.name)} 떠났다.` });
  }
  if (withBirth) {
    const slot = 'assets/images/cutscenes/birth_light.png';
    frames.push({ image: slot, fallback: bg, slot: slot,
      text: '같은 새벽, 아기가 태어났다. 죽음과 탄생이 한 밤에 다녀갔다. 폐공장의 어둠 속에서, 작은 울음이 빈자리를 채우려는 듯 길게 울렸다.' });
  } else {
    const slot = 'assets/images/cutscenes/death_still.png';
    frames.push({ image: slot, fallback: bg, slot: slot,
      text: '아무도 오래 말하지 못했다. 해야 할 일들이 남아 있었고, 그것이 남은 사람들의 애도 방식이었다.' });
  }
  return { id: 'death_' + state.day, frames };
};

// 출산 실패 — 절제된 연출: 첫 울음의 부재와 침묵으로만 말한다.
//  마지막 프레임은 시스템의 아이러니 — 아기 울음(+10 소음)이 없는 마을은 더 안전하고, 그 사실이 무겁다.
LR.buildBirthLossCutscene = function(state) {
  const bg = LR.villageCutsceneBg(state.season);
  const port = 'assets/images/portraits/miyeon.png';
  const slot = 'assets/images/cutscenes/birth_loss.png';
  return {
    id: 'birthloss_' + state.day,
    frames: [
      { image: slot, fallback: bg, slot: slot, text: '새벽까지 이어진 진통. 의약품 없이, 수진이 할 수 있는 일은 많지 않았다.' },
      { image: port, fallback: bg, text: '아기는 끝내 첫 울음을 울지 못했다. 미연은 새벽빛이 들 때까지 아무 말도 하지 않았다.' },
      { image: bg, text: '그날 이후 마을은 이상할 만큼 조용하다. 그 조용함이 무엇의 부재인지, 모두가 알고 있다.' }
    ]
  };
};

// 전례 분화 반응 — 같은 사건을 감수성 표가 다른 두 인물이 정반대로 읽는다.
//  v1.2 감수성 표(negSens/posSens)가 수치가 아니라 '대사'로 드러나는 순간.
//  가장 민감한 인물 + 가장 둔감한 인물의 한 마디씩, 다음 날 아침 비트로 표시.
LR.buildPrecedentReactions = function(state, prec) {
  const alive = LR.aliveChars(state).filter(c => !(prec.targets || []).includes(c.id));
  if (alive.length < 2) return null;
  const key = prec.type === 'neg' ? 'negSens' : 'posSens';
  const sorted = alive.slice().sort((a, b) => b[key] - a[key]);
  const most = sorted[0];                       // 가장 깊이 받아들이는 사람
  const least = sorted[sorted.length - 1];      // 가장 건조하게 받아들이는 사람
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let mostLine, leastLine;
  if (prec.type === 'neg') {
    mostLine = pick([
      '"…다음은 누구죠. 그런 생각을 하게 되네요."',
      '"어제의 결정을, 우리는 잊지 못할 거예요."',
      '"이제 아프면 말하기가 무서워졌어요."'
    ]);
    leastLine = pick([
      '"어쩔 수 없는 판단이었어. 누구라도 그랬을 거야."',
      '"감상은 사치야. 마을은 숫자로 버티는 거니까."',
      '"잘잘못을 따질 여유가 있으면 담장이나 한 번 더 봐."'
    ]);
  } else {
    mostLine = pick([
      '"이 마을은… 사람을 버리지 않는군요. 그게 어디예요."',
      '"어제 일 말이에요. 그거 하나로 며칠은 버틸 수 있어요."',
      '"고마워요. 누가 한 말이 아니라, 마을이 한 일이라서요."'
    ]);
    leastLine = pick([
      '"나쁘지 않은 결정이었어." 그는 그렇게만 말했다.',
      '"좋은 일이지. 자원 계산은 다시 해야겠지만."',
      '"다행이군. 내일도 이럴 수 있을지는 모르겠지만."'
    ]);
  }
  return [
    { speaker: most.name, text: mostLine },
    { speaker: least.name, text: leastLine }
  ];
};

// 탐색(외출) 부상 컷씬 — 장소를 문장에 엮어 매번 다른 장면으로.
//  1프레임: 전용 일러스트 슬롯(assets/images/cutscenes/explore_wound.png) → 마을 배경 폴백
LR.EXPED_OPENERS = [
  (spot) => `${spot}. 통로는 조용했다 — 너무 조용했다.`,
  (spot) => `${spot} 안쪽, 쓰러진 진열대 사이에서 낮은 신음 소리가 들렸다.`,
  (spot) => `${spot}의 어둠 속, 발밑에서 유리 조각이 바스러졌다. 그 소리에 무언가가 고개를 들었다.`,
  (spot) => `${spot}에서 가방을 반쯤 채웠을 때였다. 등 뒤의 공기가 달라졌다.`
];
LR.EXPED_WOUND_LINES = [
  (n) => `${LR.nameGa(n)} 좀비의 손을 피하다 무너지는 선반에 깔렸다. 팔이 찢어졌다.`,
  (n) => `${LR.nameGa(n)} 물러서다 깨진 유리 위로 넘어졌다. 소리를 삼키며 일어섰다.`,
  (n) => `좀비를 밀쳐내고 빠져나왔다. ${n}의 옷자락이 찢겨 있고, 그 아래 상처가 깊다.`,
  (n) => `좁은 통로에서 몸싸움이 있었다. ${LR.nameGa(n)} 어깨를 부딪히고도 가방을 놓지 않았다.`
];
LR.buildExpeditionWoundCutscene = function(state, wound) {
  const bg = LR.villageCutsceneBg(state.season);
  const slot = 'assets/images/cutscenes/explore_wound.png';
  const port = 'assets/images/portraits/' + (wound.lead.id || 'bc') + '.png';
  const opener = LR.EXPED_OPENERS[Math.floor(Math.random() * LR.EXPED_OPENERS.length)];
  const woundLine = LR.EXPED_WOUND_LINES[Math.floor(Math.random() * LR.EXPED_WOUND_LINES.length)];
  return {
    id: 'exped_' + state.day,
    frames: [
      { image: slot, fallback: bg, slot: slot, text: opener(wound.spot) },
      { image: port, fallback: bg, text: woundLine(wound.lead.name) },
      { image: port, fallback: bg, text: '그래도 가방은 채웠다. 식량을 등에 지고, 다리를 절며 돌아왔다.' }
    ]
  };
};
LR.buildChoiceCutscene = function(node, choice, state) {
  const bg = LR.villageCutsceneBg(state.season);
  const frames = [];
  if (choice.label) frames.push({ image: bg, text: '— ' + choice.label.replace(/\s*\(추천\)\s*$/, '') });
  if (choice.body && choice.body !== choice.label) frames.push({ image: bg, text: choice.body });
  if (!frames.length) frames.push({ image: bg, text: '결정을 내렸다. 하루가 저문다.' });
  return { id: 'choice_' + (node && node.id ? node.id : 'x') + '_' + choice.id, frames };
};

LR.engine.endOfDay = function() {
  const state = LR.state;

  // ─── 일일 자원 생산 (인프라: 밭·빗물받이) — 계절·물 의존 ───
  //  생산이 소비를 일부 상쇄해 '늘 결핍'을 완화. 물받이는 계절별 수집 − 식수 소비.
  const aliveN = LR.aliveChars(state).length;
  const farmBySeason = { spring_late: 5, rainy: 4, summer_heat: 3, autumn: 6, winter: 1 };
  const rainBySeason = { spring_late: 7, rainy: 16, summer_heat: 4, autumn: 8, winter: 5 };
  const farmYield = Math.round((farmBySeason[state.season] ?? 3) * (state.water >= 25 ? 1 : 0.5));
  state.food = Math.min(100, state.food + farmYield);
  const waterIn = rainBySeason[state.season] ?? 6;
  const waterOut = Math.ceil(aliveN * 0.5);
  state.water = Math.max(0, Math.min(100, state.water + waterIn - waterOut));
  state.dailyProduce = { farm: farmYield, water: waterIn - waterOut };  // UI 표시용

  // 일일 식량 소비 (인원수 기반) — 신선식량이 부족하면 비축식 사용
  const aliveCount = LR.aliveChars(state).length;
  let need = aliveCount;
  const fromFresh = Math.min(state.food, need);
  state.food -= fromFresh; need -= fromFresh;
  if (need > 0 && state.driedFood > 0) {
    const fromDried = Math.min(state.driedFood, need);
    state.driedFood -= fromDried; need -= fromDried;
  }
  if (need > 0 && state.pickledFood > 0) {
    const fromPickle = Math.min(state.pickledFood, need);
    state.pickledFood -= fromPickle; need -= fromPickle;
  }
  if (state.season === 'winter') {
    state.fuel = Math.max(0, state.fuel - 2);  // 겨울 추가 소비
  }

  // ─── 신선식품 부패 — 쌓아둔 잉여만 상한다(저장식으로 가공할 이유) ───
  //  팬트리 한도(SHELF) 이하는 안 상함 → 결핍 상황을 더 악화시키지 않음.
  //  한도를 넘는 신선식량만 계절 부패율(장마·폭염 ×2)로 줄어든다.
  const SHELF = 55;
  const decayMul = LR.SEASONS[state.season].foodDecay || 1;
  const surplus = Math.max(0, state.food - SHELF);
  const spoiled = Math.floor(surplus * 0.10 * decayMul);
  if (spoiled > 0) state.food = Math.max(0, state.food - spoiled);
  if (state.dailyProduce) state.dailyProduce.spoiled = spoiled;

  // 식량 부족 효과 — 모든 보유 식량(신선+비축) 합산 기준
  const totalFood = state.food + state.driedFood + state.pickledFood;
  const foodTier = LR.foodTier(totalFood);
  if (foodTier.tier === 'famine' || need > 0) {
    // 신선+비축으로도 부족 → 기근. 기획서 수치(체력 -5/일) 복원 — 기근이 실제 위협이어야 긴장이 생긴다
    for (const c of LR.aliveChars(state)) {
      c.health = Math.max(0, c.health - 5);
      c.morale = Math.max(0, c.morale - 5);
    }
  } else if (foodTier.tier === 'crisis') {
    // 체력 회복 속도 50% 감소는 회복 단계에서
  }

  // 회복 단계 — 마을 평균 + 전례 보정
  const avg = LR.avgMorale(state);
  const villageMul = LR.villageMoraleMultiplier(state.spiral.state, avg);
  for (const c of LR.aliveChars(state)) {
    const recMul = LR.recoveryMultiplier(state, c) * villageMul;
    // 체력 회복(기본 +6) — 배수 하한(0.5)으로 죽음의 나선은 차단하되,
    //  부상이 하루 만에 지워지지 않게 회복량을 낮춰 긴장을 유지(기존 +8)
    if (c.health < 100 && totalFood >= 20) {
      const heal = Math.round(6 * Math.max(0.5, recMul) * (foodTier.tier === 'crisis' ? 0.5 : 1));
      c.health = Math.min(100, c.health + heal);
    }
    // 사기: 공동체 상태가 정한 '기준선'으로 매일 조금씩 수렴.
    //   자동 100 수렴 방지(평시 ~55에서 weary) + 좋은 하루(이벤트 moraleAll+)는 위로, 방치는 기준선으로.
    //   나선 없음 60 · 교감 68 · 결속 78 · 단합 88. (긴장은 있되 영구 비참은 아니게)
    const moraleTarget = { danhap: 88, gyeolsok: 78, gyogam: 68 }[state.spiral.state] || 60;
    const drift = (moraleTarget - c.morale) * 0.22;
    c.morale = Math.max(0, Math.min(100, Math.round(c.morale + drift)));
  }
  // 사망 처리 (별도 패스 — 회복 후 체력 0이면 사망)
  const deadToday = [];
  for (const id of LR.CHARACTER_ORDER) {
    const c = state.characters[id];
    if (c.alive && c.health <= 0) {
      c.alive = false;
      c.health = 0;
      c.status = 'dead';
      c.deathDay = state.day;
      // 사인 추론 — 최근 이틀의 상처가 우선, 다음은 굶주림
      c.deathCause = (c.flags.raidHurtDay >= state.day - 2) ? '습격에서 입은 상처'
        : (c.flags.expedHurtDay >= state.day - 2) ? '탐색에서 입은 부상'
        : (foodTier.tier === 'famine') ? '굶주림'
        : '부상 악화';
      deadToday.push(c);
      for (const o of LR.aliveChars(state)) o.morale = Math.max(0, o.morale - 5);
      LR.render.toast(`${c.name} 사망 — Day ${state.day}`, 'raid');
      LR.chron(state, `${LR.nameGa(c.name)} 떠났다 — ${c.deathCause}`, 'death');
    } else if (c.alive) {
      const ht = LR.healthTier(c.health);
      c.status = ht.tier;
    }
  }
  if (deadToday.length) {
    state.pendingMourning = { id: deadToday[0].id, name: deadToday[0].name };
  }

  // 상승 나선 갱신
  const spChange = LR.updateSpiral(state);
  if (spChange.changed) {
    if (spChange.next !== 'none') {
      LR.render.toast(`상승 나선 진입: ${LR.SPIRAL_LABELS[spChange.next]}`, 'spiral');
      LR.chron(state, `상승 나선 — ${LR.SPIRAL_LABELS[spChange.next]} 진입`, 'pos');
    }
  }

  // 어제 소음 → 오늘 새벽 습격 판정
  //  습격 직후 하룻밤은 '소강' — 무리가 흩어져 연속 습격 확률이 줄어든다 (연쇄 사망 나선 방지)
  const raidProb = LR.raidProbability(state.noiseToday);
  const lull = state.raidLullUntil && state.day <= state.raidLullUntil;
  state.raidedLastNight = Math.random() < raidProb.p * (lull ? 0.35 : 1);
  state.nearMissLastNight = false;
  let raidCut = null, raidDeltas = null;
  if (state.raidedLastNight) {
    state.raidLullUntil = state.day + 1;
    // 피해 — 규모가 클수록 깊게, 경계 이상이면 부상자가 둘이 될 수 있다
    //  단, 이미 중상(체력<35)인 인원은 뒤로 빠진다 — 같은 사람이 연타당해 죽는 나선 방지
    const dmgBand = { '잠잠': [8, 18], '주의': [12, 28], '경계': [18, 40], '위험': [26, 52] }[raidProb.scale] || [12, 28];
    const defenders = LR.aliveChars(state).filter(c => (c.role === '행동가' || c.role === '리더') && c.health >= 35);
    const others = LR.aliveChars(state).filter(c => c.health >= 35 && c.role !== '행동가' && c.role !== '리더');
    const pickFrom = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const victims = [];
    const first = pickFrom(defenders) || pickFrom(others) || LR.aliveChars(state)[0];
    if (first) victims.push(first);
    const twoVictimP = raidProb.scale === '위험' ? 0.5 : raidProb.scale === '경계' ? 0.3 : 0;
    if (Math.random() < twoVictimP) {
      const second = pickFrom(others.filter(c => c !== first)) || pickFrom(defenders.filter(c => c !== first));
      if (second) victims.push(second);
    }
    let totalDmg = 0;
    const parts = [];
    for (const v of victims) {
      const dmg = Math.floor(dmgBand[0] + Math.random() * (dmgBand[1] - dmgBand[0]));
      v.health = Math.max(0, v.health - dmg);
      v.flags.raidHurtDay = state.day;               // 사인(死因) 추적용
      totalDmg += dmg;
      parts.push(`${v.name} 체력 -${dmg}`);
      LR.render.toast(`습격 — ${v.name} 부상`, 'raid');
    }
    state.raidLastNightSummary = `${raidProb.scale} 습격. ${parts.join(', ')}.`;
    LR.chron(state, state.raidLastNightSummary, 'raid');
    if (victims.length) {
      // 부상은 큰 사건 → 컷씬 + 체력 변화 표시(스몰윈처럼)
      raidCut = LR.buildRaidCutscene(state, victims, raidProb.scale);
      raidDeltas = { health: -totalDmg };
    }
  } else {
    state.raidLastNightSummary = null;
    // 습격은 비껴갔지만 가까웠다 — 다음 날 아침 내레이션용 니어미스 (피해 없음, 긴장만)
    if (raidProb.p >= 0.25 && Math.random() < 0.6) state.nearMissLastNight = true;
  }

  // 일일 로그
  state.log.push({
    day: state.day,
    food: state.food,
    avgMorale: Math.round(avg),
    noise: state.noiseToday,
    raided: state.raidedLastNight,
    spiral: state.spiral.state,
    precedents: state.precedents.length,
    survivors: LR.aliveChars(state).length
  });
  if (state.log.length > 35) state.log.shift();

  // 자동 저장
  if (LR.save) LR.save.auto(state);

  // 엔딩/다음날 진행 (습격 부상 컷씬이 있으면 그 후에)
  const proceed = function() {
    // 엔딩 판정
    const ending = LR.checkEnding(state);
    if (ending) {
      state.ending = ending;
      LR.render.showEnding(state);
      return;
    }
    // 다음 날
    state.day += 1;
    state.season = LR.seasonOnDay(state.day);
    state.pendingChoice = null;
    state.awaitingChoice = false;
    setTimeout(() => LR.engine.beginDay(), 350);
  };

  // 밤의 컷씬 체인: [습격 부상] → [죽음의 작별] → 다음 날 (또는 엔딩)
  const nightCuts = [];
  if (raidCut) nightCuts.push({ cut: raidCut, tone: 'bad', badge: '간밤의 습격', deltas: raidDeltas });
  if (deadToday.length) {
    nightCuts.push({ cut: LR.buildDeathCutscene(state, deadToday.slice(0, 3), false),
                     tone: 'bad', badge: '상실', deltas: null });
  }
  const playNight = function(list) {
    if (!list.length || !LR.cutscene || !LR.cutscene.play) { proceed(); return; }
    const head = list[0];
    LR.cutscene.play(head.cut, () => playNight(list.slice(1)), head.tone, head.badge, false, head.deltas);
  };
  playNight(nightCuts);
};
