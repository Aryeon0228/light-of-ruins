// 렌더 (render.js)
// DOM 갱신 — 대시보드 + 시나리오 + 인물 카드 + 토스트 + 엔딩 화면

window.LR = window.LR || {};

LR.render = LR.render || {};

LR.render.renderAll = function(state) {
  LR.render.topBar(state);
  LR.render.leftPanel(state);
  LR.render.rightPanel(state);
  LR.render.scenario(state);
  LR.render.characters(state);
};

// ─── 상단 바 ───
LR.render.topBar = function(state) {
  document.getElementById('topDay').textContent = `Day ${state.day}`;
  document.getElementById('topSeason').textContent = LR.SEASONS[state.season].name;

  const avg = LR.avgMorale(state);
  const food = state.food;
  const tier = LR.foodTier(food);
  const moraleTier = LR.moraleTier(avg);

  document.getElementById('topAxes').innerHTML = `
    <div class="axis">
      <span class="label">식량</span>
      <span class="value" style="color: var(--c-axis-food)">${food}</span>
      <span class="qual">${tier.label}</span>
    </div>
    <div class="axis">
      <span class="label">사기</span>
      <span class="value" style="color: var(--c-axis-morale)">${Math.round(avg)}</span>
      <span class="qual">${moraleTier.label}</span>
    </div>
    <div class="axis">
      <span class="label">소음</span>
      <span class="value" style="color: var(--c-axis-noise)">${state.noiseToday}</span>
      <span class="qual">${LR.raidProbability(state.noiseToday).scale}</span>
    </div>
    <div class="axis">
      <span class="label">생존</span>
      <span class="value">${LR.aliveChars(state).length}</span>
      <span class="qual">/ 10</span>
    </div>
  `;
};

// ─── 좌측 패널 ───
LR.render.leftPanel = function(state) {
  // 상승 나선
  const sp = state.spiral;
  document.getElementById('spiralStages').innerHTML = `
    <div class="spiral-stage ${sp.state === 'gyogam' ? 'active' : ''}">
      <span class="lbl">교감</span>
      <span class="val">${sp.streak60 || 0}일${sp.state === 'gyogam' ? ' · 활성' : ''}</span>
    </div>
    <div class="spiral-stage ${sp.state === 'gyeolsok' ? 'active' : ''}">
      <span class="lbl">결속</span>
      <span class="val">${sp.streak65 || 0}일${sp.state === 'gyeolsok' ? ' · 활성' : ''}</span>
    </div>
    <div class="spiral-stage ${sp.state === 'danhap' ? 'active' : ''}">
      <span class="lbl">단합</span>
      <span class="val">${sp.streak70 || 0}일${sp.state === 'danhap' ? ' · 활성' : ''}</span>
    </div>
  `;

  // 자원
  document.getElementById('resourceList').innerHTML = `
    <div class="row"><span class="lbl">물</span><span class="val">${state.water}</span></div>
    <div class="row"><span class="lbl">연료</span><span class="val ${state.fuel < 10 ? 'warn' : ''}">${state.fuel}</span></div>
    <div class="row"><span class="lbl">의약품</span><span class="val ${state.medicine === 0 ? 'danger' : ''}">${state.medicine}</span></div>
    <div class="row"><span class="lbl">건조식품</span><span class="val dim">${state.driedFood}</span></div>
    <div class="row"><span class="lbl">절임식품</span><span class="val dim">${state.pickledFood}</span></div>
  `;

  // 비컨
  const def = LR.BEACON_TYPES[state.beacon.type];
  const phaseLabel = {
    announce: '예고', develop: '발전', reach: '도달',
    resolve_pre: '해소 전야', resolve: '해소'
  }[state.beacon.phase] || state.beacon.phase;
  document.getElementById('beaconInfo').innerHTML = `
    <div class="row"><span class="lbl">타입</span><span class="val">${def.name}</span></div>
    <div class="row"><span class="lbl">단계</span><span class="val">D${LR.beaconDayInWeek(state)} · ${phaseLabel}</span></div>
    <div class="row"><span class="lbl">투입 식량</span><span class="val dim">${state.beacon.investedFood}</span></div>
    <div class="row"><span class="lbl">투입 연료</span><span class="val dim">${state.beacon.investedFuel}</span></div>
    <div class="row"><span class="lbl">통신 누적</span><span class="val good">${state.beacon.completedSuccessCount.comm}/3</span></div>
  `;
};

// ─── 우측 패널 ───
LR.render.rightPanel = function(state) {
  // 전례
  const list = document.getElementById('precedentList');
  if (state.precedents.length === 0) {
    list.innerHTML = '<div class="row"><span class="lbl">없음</span></div>';
  } else {
    list.innerHTML = state.precedents.map(p => {
      const I = LR.precedentCurrentIntensity(state, p);
      return `<div class="precedent-item ${p.type === 'pos' ? 'pos' : ''}">
        <span class="name">${p.id} · ${p.label}</span>
        <span class="meta">강도 ${I.toFixed(2)} · D${p.bornDay} 생성</span>
      </div>`;
    }).join('');
  }

  // Small Win
  document.getElementById('smallwinList').innerHTML = ['SW1','SW2','SW3','SW4','SW5'].map(id => {
    const cd = state.smallWins[id];
    const def = LR.SMALL_WIN_DEFS[id];
    const since = cd.lastFired === 0 ? '미발동' : `D${cd.lastFired} · 주 ${cd.weekCount}/2`;
    return `<div class="row"><span class="lbl">${id}</span><span class="val dim">${since}</span></div>`;
  }).join('');

  // TI
  document.getElementById('tiInfo').innerHTML = `
    <div class="row"><span class="lbl">TI</span><span class="val ${state.TI > 75 ? 'danger' : state.TI > 50 ? 'warn' : ''}">${state.TI}</span></div>
    <div class="row"><span class="lbl">상태</span><span class="val">${LR.tiState(state.TI)}</span></div>
    <div class="row"><span class="lbl">위기 연속</span><span class="val dim">${state.crisisStreak}일</span></div>
    <div class="row"><span class="lbl">이완 연속</span><span class="val dim">${state.releaseStreak}일</span></div>
  `;
};

// ─── 시나리오 영역 ───
LR.render.scenario = function(state) {
  const node = state.pendingChoice;
  if (!node) return;

  document.getElementById('sceneTitle').textContent = node.title;

  // 본문
  const bodyEl = document.getElementById('sceneBody');
  bodyEl.innerHTML = '';
  for (const part of node.body) {
    const div = document.createElement('div');
    if (part.kind === 'narration') {
      div.className = 'narration';
      div.textContent = part.text;
    } else if (part.kind === 'dialog') {
      div.className = 'dialog';
      div.innerHTML = `<span class="speaker">${part.speaker}</span>${part.text}`;
    } else if (part.kind === 'systemNote') {
      div.className = 'system-note';
      div.textContent = '※ ' + part.text;
    }
    bodyEl.appendChild(div);
  }

  // 어제 습격 요약
  if (state.raidLastNightSummary) {
    const div = document.createElement('div');
    div.className = 'system-note';
    div.style.borderLeftColor = 'var(--c-danger)';
    div.textContent = '🩸 ' + state.raidLastNightSummary;
    bodyEl.insertBefore(div, bodyEl.firstChild);
  }

  // 어제 비컨 해소 요약
  if (state.pendingBeaconResolution) {
    const r = state.pendingBeaconResolution;
    const div = document.createElement('div');
    div.className = 'system-note';
    div.style.borderLeftColor = 'var(--c-beacon)';
    div.innerHTML = `📡 <strong>${LR.BEACON_TYPES[r.type].name} ${r.label}</strong> — ${r.text}`;
    bodyEl.insertBefore(div, bodyEl.firstChild);
    state.pendingBeaconResolution = null;
  }

  // 키 라인
  if (node.keyLine) {
    const div = document.createElement('div');
    div.className = 'key-line';
    div.textContent = node.keyLine;
    bodyEl.appendChild(div);
  }

  // 선택지
  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  for (const choice of node.choices) {
    if (choice.requireSpiral && state.spiral.state !== choice.requireSpiral) continue;
    if (choice.enabled === false) continue;
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    if (choice.risk === 'warn') btn.classList.add('risk-warn');
    if (choice.risk === 'danger') btn.classList.add('risk-danger');
    btn.innerHTML = `<span class="letter">${choice.id}</span><span class="body"><strong>${choice.label}</strong>${choice.body ? '<br><span style="color:var(--c-text-dim);font-size:0.88em">' + choice.body + '</span>' : ''}</span>`;
    btn.addEventListener('click', () => {
      LR.engine.applyChoice(choice.id);
    });
    choicesEl.appendChild(btn);
  }
};

// ─── 인물 카드 ───
LR.render.characters = function(state) {
  const root = document.getElementById('characterCards');
  root.innerHTML = '';
  for (const id of LR.CHARACTER_ORDER) {
    const c = state.characters[id];
    const def = LR.CHARACTER_DEFS[id];
    const card = document.createElement('div');
    card.className = 'char-card' + (c.alive ? '' : ' dead');
    card.style.setProperty('--char-color', def.color);
    const ht = LR.healthTier(c.health);
    const mt = LR.moraleTier(c.morale);
    card.innerHTML = `
      <div class="name">${c.name}<span class="role">${c.role}</span></div>
      <div class="bar health"><div class="bar-fill" style="width:${c.health}%"></div></div>
      <div class="bar-label"><span>체력</span><span>${c.health}</span></div>
      <div class="bar morale"><div class="bar-fill" style="width:${c.morale}%"></div></div>
      <div class="bar-label"><span>사기</span><span>${c.morale}</span></div>
      <div class="status ${c.alive ? ht.tier : 'dead'}">${c.alive ? ht.label : '사망'}</div>
    `;
    root.appendChild(card);
  }
};

// ─── 토스트 ───
LR.render.toast = function(text, kind) {
  const root = document.getElementById('toastContainer');
  const div = document.createElement('div');
  div.className = 'toast ' + (kind || '');
  div.textContent = text;
  root.appendChild(div);
  setTimeout(() => div.remove(), 4500);
};

// ─── 엔딩 화면 ───
LR.render.showEnding = function(state) {
  const ending = state.ending;
  document.getElementById('endingOverlay').classList.add('active');
  document.getElementById('endingTitle').textContent = ending.title;
  document.getElementById('endingSubtitle').textContent = ending.subtitle;

  // 내레이션
  const lines = ending.narration(state);
  document.getElementById('endingNarration').innerHTML =
    lines.map(l => `<p>${l.replace(/\n/g, '<br>')}</p>`).join('');

  // 생존자
  const roster = document.getElementById('endingRoster');
  roster.innerHTML = LR.CHARACTER_ORDER.map(id => {
    const c = state.characters[id];
    return `<div class="row ${c.alive ? '' : 'dead'}">
      <span>${c.name}</span>
      <span>${c.alive ? `체력 ${c.health} · 사기 ${c.morale}` : '사망'}</span>
    </div>`;
  }).join('');

  // 전례 원장
  const ledger = document.getElementById('endingLedger');
  if (state.precedents.length === 0 && state.counters.posPrecedents === 0 && state.counters.negPrecedents === 0) {
    ledger.innerHTML = '<div class="row"><span>전례 없음 — 도덕적 좌표계는 미정</span></div>';
  } else {
    ledger.innerHTML = state.precedents.map(p => {
      const I = LR.precedentCurrentIntensity(state, p);
      return `<div class="item ${p.type === 'pos' ? 'pos' : ''}">
        <strong>${p.id}</strong> · ${p.name}<br>
        <small>D${p.bornDay} 생성 · 현재 강도 ${I.toFixed(2)}${p.targets.length ? ' · 대상: ' + p.targets.map(t => state.characters[t]?.name || t).join(', ') : ''}</small>
      </div>`;
    }).join('');
    ledger.innerHTML += `<div style="margin-top:0.8rem;color:var(--c-text-dim);font-size:0.85rem">긍정 전례 ${state.counters.posPrecedents}회 · 부정 전례 ${state.counters.negPrecedents}회</div>`;
  }

  // 30일 타임라인
  const tl = document.getElementById('endingTimeline');
  tl.innerHTML = '<table style="width:100%;font-size:0.78rem;border-collapse:collapse">' +
    '<thead><tr style="color:var(--c-text-dim);text-align:left;border-bottom:1px solid var(--c-border)">' +
    '<th>일자</th><th>식량</th><th>사기</th><th>소음</th><th>나선</th><th>전례</th><th>생존</th></tr></thead>' +
    '<tbody>' +
    state.log.map(l => `<tr style="border-bottom:1px solid var(--c-border)">
      <td>D${l.day}</td><td>${l.food}</td><td>${l.avgMorale}</td>
      <td>${l.noise}${l.raided ? ' 🩸' : ''}</td>
      <td>${LR.SPIRAL_LABELS[l.spiral] || '-'}</td>
      <td>${l.precedents}</td>
      <td>${l.survivors}</td>
    </tr>`).join('') +
    '</tbody></table>';
};

LR.render.hideEnding = function() {
  document.getElementById('endingOverlay').classList.remove('active');
};
