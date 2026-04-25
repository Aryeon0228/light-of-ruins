// 전례 시스템 (precedents.js)
// sec 2.6 — 양방향 전례, 시간 반감, 최대 3개 누적

window.LR = window.LR || {};

// 전례 생성 트리거 종류
LR.PRECEDENT_TRIGGERS = {
  // 부정 5종 (sec 2.6)
  caregiving_abandoned:  { type: 'neg', name: '쓸모없으면 버린다',         label: '간병 포기' },
  medicine_withheld:     { type: 'neg', name: '약은 쓸모 있는 자에게',      label: '의약품 박탈' },
  refugee_rejected:      { type: 'neg', name: '낯선 자는 받지 않는다',      label: '피난민 거부' },
  unequal_distribution:  { type: 'neg', name: '쓸모로 사람을 잰다',         label: '차별 분배' },
  quarantine_neglected:  { type: 'neg', name: '아픈 자를 방치한다',         label: '격리 포기' },

  // 긍정 6종 (sec 2.6)
  caregiving_sustained:  { type: 'pos', name: '약자를 끝까지 본다',         label: '간병 지속' },
  medicine_to_dying:     { type: 'pos', name: '마지막 약은 빈사에게',       label: '의약품 투입' },
  refugee_accepted:      { type: 'pos', name: '낯선 자도 식구가 된다',      label: '피난민 수용' },
  equal_distribution:    { type: 'pos', name: '한 사람도 굶기지 않는다',    label: '균등 분배' },
  quarantine_supported:  { type: 'pos', name: '격리한 자에게도 손이 닿는다', label: '격리 지원' },
  selfless_contribution: { type: 'pos', name: '자기 몸을 깎아 마을을 짓는다', label: '자기희생적 기여' }
};

// ─── 전례 생성 시도 (sec 2.6 規模 게이트) ───
// trigger: { triggerKey, healthCost, resourceCost, villageBenefit, targets[], scriptedOverride }
LR.tryGeneratePrecedent = function(state, trigger) {
  if (!trigger || !trigger.triggerKey) return null;
  const def = LR.PRECEDENT_TRIGGERS[trigger.triggerKey];
  if (!def) {
    console.warn('Unknown precedent trigger:', trigger.triggerKey);
    return null;
  }

  // 規模 게이트 (sec 2.6) — 스크립트 오버라이드 있으면 게이트 무시
  if (!trigger.scriptedOverride) {
    const meetsScale = (trigger.healthCost || 0) >= 5 || (trigger.resourceCost || 0) >= 3;
    const meetsImpact = !!trigger.villageBenefit;
    if (!meetsScale || !meetsImpact) {
      // 規模 미달 — Small Win 영역으로 떨어짐
      return null;
    }
  }

  // 누적 캡 (FIFO)
  if (state.precedents.length >= LR.PRECEDENT_CAP) {
    state.precedents.shift();
  }

  const idNumber = (def.type === 'neg' ? ++state.counters.negPrecedents : ++state.counters.posPrecedents);
  const id = (def.type === 'neg' ? 'P-N' : 'P-P') + idNumber;

  const p = {
    id: id,
    type: def.type,
    name: def.name,
    label: def.label,
    triggerKey: trigger.triggerKey,
    bornDay: state.day,
    targets: trigger.targets || []
  };
  state.precedents.push(p);
  return p;
};

// ─── 현재 시점 강도 (시간 반감 + 가상 일자) ───
LR.precedentCurrentIntensity = function(state, p) {
  const vAge = LR.virtualDay(state.day) - LR.virtualDay(p.bornDay);
  return LR.precedentIntensity(vAge);
};

// ─── 전례 활성 텍스트 (UI용) ───
LR.precedentLabelWithIntensity = function(state, p) {
  const I = LR.precedentCurrentIntensity(state, p);
  return `${p.id} · ${p.label} (강도 ${I.toFixed(2)})`;
};
