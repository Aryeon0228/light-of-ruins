// 마을 전경 화면 (village.js)
// 디스 워 이즈 마인식 거점 조망 + HUD. 실제 LR.state를 읽어 렌더링.
// 두 카메라: 'section'(측면 단면도) ↔ 'compound'(위에서 본 마당형)

window.LR = window.LR || {};

LR.village = {
  mode: 'compound',  // 'section' | 'compound'
  selected: null,    // 선택된 캐릭터 id (디테일 패널 기본값용)
  picked: false,     // 사용자가 실제로 인물을 클릭했는가 → 씬 글로우는 이때만
  state: null,       // 렌더 대상 상태 (라이브 또는 데모)
  isDemo: false
};

// ─── 캐릭터별 기본 활동 (역할 기반) ───
const ACT = {
  jaehyeok:  '마을을 둘러본다',
  sujin:     '부상자를 돌본다',
  yeongsu:   '앓으며 누워 쉰다',
  eunseo:    '탐색 채비를 한다',
  jeonghun:  '솥에 국을 끓인다',
  miyeon:    '배를 감싸 쉰다',
  dongho:    '방벽을 보강한다',
  hayeong:   '망루에서 경계한다',
  jonghyeok: '통신기를 손본다',
  minsu:     '바닥에 그림을 그린다'
};

// ─── 카메라별 캐릭터 배치 (x,y는 발끝/지면 기준 viewBox 좌표) ───
const SECTION = {
  hayeong:   { x: 852, y: 96,  pose: 'watch' },
  yeongsu:   { x: 200, y: 206, pose: 'lie'   },
  miyeon:    { x: 322, y: 206, pose: 'sit'   },
  dongho:    { x: 560, y: 332, pose: 'work'  },
  jonghyeok: { x: 770, y: 332, pose: 'work'  },
  jeonghun:  { x: 178, y: 472, pose: 'work'  },
  minsu:     { x: 372, y: 472, pose: 'sit'   },
  jaehyeok:  { x: 492, y: 472, pose: 'stand' },
  sujin:     { x: 656, y: 472, pose: 'stand' },
  eunseo:    { x: 156, y: 590, pose: 'stand' }
};

const COMPOUND = {
  hayeong:   { x: 872, y: 168, pose: 'watch' },
  eunseo:    { x: 236, y: 214, pose: 'work'  },
  jeonghun:  { x: 206, y: 392, pose: 'work'  },
  yeongsu:   { x: 792, y: 246, pose: 'lie'   },
  miyeon:    { x: 852, y: 286, pose: 'sit'   },
  jaehyeok:  { x: 470, y: 392, pose: 'stand' },
  minsu:     { x: 548, y: 414, pose: 'sit'   },
  sujin:     { x: 524, y: 344, pose: 'stand' },
  dongho:    { x: 718, y: 484, pose: 'work'  },
  jonghyeok: { x: 790, y: 496, pose: 'work'  }
};

// ─── 실사 배경/스프라이트 (사용자 제작 이미지, 2896×2172 동일 캔버스) ───
const VILLAGE_ASSET = 'assets/images/village/';
// 글로우 구역: box=[left,top,w,h] %, o=[cx,cy] % (확대 기준점). glow PNG 알파 bbox에서 산출.
const ZONES = [
  { z:'kitchen',    label:'요리시설',    box:[46.2, 32.2, 13.4, 17.5], o:[52.9, 49.7] },
  { z:'field',      label:'밭',          box:[32.7, 42.7, 11.3, 10.4], o:[38.3, 53.1] },
  { z:'barracks',   label:'숙소',        box:[61.4, 24.4, 38.6, 38.6], o:[80.7, 63.0] },
  { z:'workshop',   label:'작업장 · 통신', box:[77.0, 53.0, 19.0, 16.0], o:[86.0, 63.0] },
  { z:'infirmary',  label:'의무실',      box:[78.2, 30.0, 15.7, 15.4], o:[86.0, 45.4] },
  // watchtower_idle_guide.png 알파 bbox 측정값
  { z:'watchtower', label:'망루',        box:[56.3, 26.8, 8.9, 24.3], o:[60.7, 39.0] },
  { z:'gate',       label:'정문',        box:[46.4, 60.7, 8.4, 11.7], o:[50.6, 72.0] },
  // water_idle_guide.png 알파 bbox 측정값 (좌중앙)
  { z:'water',      label:'물 · 빗물받이', box:[21.6, 38.6, 12.3, 13.3], o:[27.8, 45.3] }
];
// 인물 스프라이트 — 전원 풀캔버스(2896×2172) 제자리. 0,0에 그대로 겹침(작가가 맞춘 위치/크기 유지).
//  (개별 크롭으로 줄 경우엔 inplace 빼고 cx/cy + h|w(%)로 배치 가능)
//  box=[l,t,w,h]% 형상 영역(호버 핫스팟), ox/oy=확대 기준점(형상 중심x·발끝y) — 인물 PNG 알파 bbox에서 산출
// box/ox/oy는 각 인물 PNG(3577×2419)의 알파 bbox에서 산출 — 새 배경(bg_ground)에 맞춰 재배치됨
const PEOPLE_FILES = [
  { file:'jeonghun',       char:'jeonghun',  inplace:true, box:[47.2,39.5,3.6,9.4], ox:49.0, oy:48.9 },
  { file:'eunseo',         char:'eunseo',    inplace:true, box:[41.6,44.3,4.1,5.7], ox:43.6, oy:50.0 },
  { file:'sujin',          char:'sujin',     inplace:true, box:[88.2,38.3,2.7,9.0], ox:89.5, oy:47.3 },
  { file:'yeongsu',        char:'yeongsu',   inplace:true, box:[90.8,41.4,5.8,6.1], ox:93.7, oy:47.5 },
  { file:'miyeon',         char:'miyeon',    inplace:true, box:[55.6,50.8,2.8,7.3], ox:57.0, oy:58.1 },
  { file:'dongho',         char:'dongho',    inplace:true, box:[74.4,56.1,4.1,9.3], ox:76.4, oy:65.4 },
  { file:'jonghyeok',      char:'jonghyeok', inplace:true, box:[84.3,60.4,3.7,8.1], ox:86.1, oy:68.5 },
  { file:'hayeong',        char:'hayeong',   inplace:true, box:[59.0,29.9,2.0,8.1], ox:60.0, oy:38.0 },
  { file:'jaehyeok',       char:'jaehyeok',  inplace:true, box:[45.0,50.7,3.2,6.8], ox:46.6, oy:57.5 },
  { file:'minsu',          char:'minsu',     inplace:true, box:[67.6,32.9,2.3,4.2], ox:68.7, oy:37.2 }
];

// ═══════════════════════════════════════════════════════
//  진입 / 표시
// ═══════════════════════════════════════════════════════
LR.village.open = function(state) {
  ensureDom();
  if (state) {
    LR.village.state = state;
    LR.village.isDemo = false;
  } else if (LR.state) {
    LR.village.state = LR.state;
    LR.village.isDemo = false;
  } else {
    LR.village.state = LR.village.makeDemoState();
    LR.village.isDemo = true;
  }
  LR.village.selected = LR.village.selected || 'jaehyeok';
  document.getElementById('villageScreen').classList.add('active');
  LR.village.render();
  LR.village.startScope();
  LR.village.startFx();
};

LR.village.close = function() {
  const el = document.getElementById('villageScreen');
  if (el) el.classList.remove('active');
  LR.village.closeZoneInfo();
  LR.village.stopScope();
  LR.village.stopFx();
};

LR.village.setMode = function(mode) {
  LR.village.mode = mode;
  LR.village.closeZoneInfo();
  document.querySelectorAll('.vh-cam-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  LR.village.renderScene();
};

LR.village.select = function(id) {
  LR.village.selected = id;
  LR.village.picked = true;   // 클릭 이후부터 씬에 선택 글로우 표시
  LR.village.popChar = id;    // 그 인물 위에 상태 팝오버
  LR.village.closeZoneInfo();  // 인물 선택 시 건물 정보창은 닫기
  LR.village.render();
};

// ─── 캐릭터 상태 팝오버 (씬에서 그 인물 바로 옆에) ───
LR.village.fillPopover = function() {
  const pop = document.getElementById('vhPop');
  if (!pop) return;
  const s = LR.village.state;
  const id = LR.village.popChar;
  if (!s || !id || LR.village.mode !== 'compound') { pop.classList.remove('open'); return; }
  const c = s.characters[id], def = LR.CHARACTER_DEFS[id];
  if (!c || !def) { pop.classList.remove('open'); return; }
  const ht = LR.healthTier(c.health), mt = LR.moraleTier(c.morale);
  pop.innerHTML = `
    <button class="vh-pop-x" id="vhPopX">✕</button>
    <div class="vh-pop-head">
      <span class="vh-pop-port" style="--cc:${def.color}">${portraitInner(id, c, def)}</span>
      <div class="vh-pop-id">
        <div class="vh-pop-name">${c.name}<em>${c.role} · ${def.age}세</em></div>
        <div class="vh-pop-act">${activityOf(c)}</div>
      </div>
    </div>
    <div class="vh-pop-stat">
      <div class="vh-pop-row">
        <span class="vh-pop-ic" style="color:${hpColor(c.health)}">${HPIC}</span>
        <span class="vh-pop-bar"><i style="width:${c.health}%;background:${hpColor(c.health)}"></i></span>
        <b style="color:${hpColor(c.health)}">${c.alive ? c.health : '—'}</b>
        <em>${c.alive ? ht.label : '사망'}</em>
      </div>
      <div class="vh-pop-row">
        <span class="vh-pop-ic" style="color:${moColor(c.morale)}">${MOIC}</span>
        <span class="vh-pop-bar"><i style="width:${c.morale}%;background:${moColor(c.morale)}"></i></span>
        <b style="color:${moColor(c.morale)}">${c.alive ? c.morale : '—'}</b>
        <em>${c.alive ? mt.label : ''}</em>
      </div>
    </div>
    <div class="vh-pop-foot">전례 감수성 · 부정 ×${def.negSens} / 긍정 ×${def.posSens}</div>
  `;
  pop.classList.add('open');
  const x = document.getElementById('vhPopX');
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); LR.village.closePopover(); });
  LR.village.positionPopover();
};

// ─── 인물 상세 카드 (좌하단) — 찢어진 노트 + 폴라로이드 (아트는 사용자 제작) ───
//  여기선 폴라로이드 사진(포트레이트 PNG)과 글만 채운다. 틀/배경 아트는 CSS .vh-dossier에 얹음.
LR.village.fillDossier = function() {
  const el = document.getElementById('vhDossier');
  if (!el) return;
  const s = LR.village.state;
  const id = LR.village.popChar;
  if (!s || !id || LR.village.mode !== 'compound') { el.classList.remove('open'); return; }
  const c = s.characters[id], def = LR.CHARACTER_DEFS[id];
  if (!c || !def) { el.classList.remove('open'); return; }
  const ht = LR.healthTier(c.health), mt = LR.moraleTier(c.morale);
  el.innerHTML = `
    <button class="vh-dossier-x" id="vhDossierX">✕</button>
    <div class="vh-dossier-photo">
      <img class="vh-dossier-port" src="assets/images/portraits/${id}.png" alt="" onerror="this.style.display='none'">
    </div>
    <div class="vh-dossier-text">
      <div class="vh-dossier-name">${c.name}<em>${c.role} · ${def.age}세</em></div>
      <div class="vh-dossier-act">${activityOf(c)}</div>
      <div class="vh-dossier-line"><span>체력</span><b style="color:${hpColor(c.health)}">${c.alive ? c.health : '—'}</b><i>${c.alive ? ht.label : '사망'}</i></div>
      <div class="vh-dossier-line"><span>사기</span><b style="color:${moColor(c.morale)}">${c.alive ? c.morale : '—'}</b><i>${c.alive ? mt.label : ''}</i></div>
      <div class="vh-dossier-foot">전례 감수성 · 부정 ×${def.negSens} / 긍정 ×${def.posSens}</div>
    </div>`;
  el.classList.add('open');
  const x = document.getElementById('vhDossierX');
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); LR.village.closePopover(); });
};

LR.village.positionPopover = function() {
  const pop = document.getElementById('vhPop');
  const host = document.getElementById('vhScene');
  if (!pop || !host || !pop.classList.contains('open')) return;
  const hot = host.querySelector('.vh-phot[data-pchar="' + LR.village.popChar + '"]');
  if (!hot) { pop.classList.remove('open'); return; }
  // 대사창(하단)에 가리지 않도록 좌측 상단 고정
  pop.classList.add('corner');
  pop.classList.remove('below');
  pop.style.left = '12px';
  pop.style.top = '12px';
  pop.style.removeProperty('--arrow');
};

LR.village.closePopover = function() {
  LR.village.popChar = null;
  const pop = document.getElementById('vhPop');
  if (pop) pop.classList.remove('open');
  const dos = document.getElementById('vhDossier');
  if (dos) dos.classList.remove('open');
};

// ─── 건물(구역) 정보창 — 구역 클릭 시 중앙에 큰 카드로 그 구역 상황 표시 ───
function vzStat(label, value, color, sub) {
  return `<div class="vz-stat">
    <span class="vz-k">${label}</span>
    <span class="vz-v"${color ? ` style="color:${color}"` : ''}>${value}</span>
    ${sub ? `<span class="vz-sub">${sub}</span>` : ''}
  </div>`;
}
function vzGauge(label, value, pct, color) {
  const w = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  return `<div class="vz-gauge">
    <span class="vz-glab">${label}</span>
    <span class="vz-gbar"><i style="width:${w}%;background:${color}"></i></span>
    <span class="vz-gval">${value}</span>
  </div>`;
}
function vzPerson(c, def) {
  const hpc = hpColor(c.health), moc = moColor(c.morale);
  return `<div class="vz-person${c.alive ? '' : ' dead'}" style="--cc:${def ? def.color : '#888'}">
    <span class="vz-pname">${c.name}<em>${c.role}</em></span>
    <span class="vz-pbars">
      <span class="vz-pbar"><i style="width:${c.alive ? c.health : 0}%;background:${hpc}"></i></span>
      <span class="vz-pbar"><i style="width:${c.alive ? c.morale : 0}%;background:${moc}"></i></span>
    </span>
    <span class="vz-pnum" style="color:${c.alive ? hpc : '#777'}">${c.alive ? c.health : '—'}</span>
  </div>`;
}

// 구역별 상황 카드 데이터 — 실제 state(신선/말린/절임 식량·계절 부패속도 등) 기반
function zonePanel(z, s) {
  const alive = LR.aliveChars(s);
  const n = alive.length;
  const seasonDef = LR.SEASONS[s.season];
  const decay = seasonDef.foodDecay;                 // 1.0 보통 / 2.0 빨리 상함(장마·폭염)
  const decayLab = decay >= 2 ? '빠름' : '느림';
  const decayVerb = decay >= 2 ? '빨리 상한다' : '천천히 상한다';
  const decayCol = decay >= 2 ? '#e07070' : '#74c074';
  const totalFood = s.food + s.driedFood + s.pickledFood;
  const days = n ? Math.floor(totalFood / n) : 99;
  const foodT = LR.foodTier(totalFood);
  const avgMo = n ? Math.round(alive.reduce((a, c) => a + c.morale, 0) / n) : 0;
  const C = id => s.characters[id];
  const D = id => LR.CHARACTER_DEFS[id];
  const lead = id => { const c = C(id); return c && c.alive ? `${c.name} · ${c.role}` : null; };
  const ZL = ZONES.reduce((m, zn) => (m[zn.z] = zn.label, m), {});
  const hurtIds = LR.CHARACTER_ORDER.filter(id => { const c = C(id); return c.alive && c.health < 60; });

  // 하루의 살림 — 오늘 돌봄 여부 + 행동버튼
  const P = LR.village._tendPlan(s);
  const tdone = key => s.tending && s.tending[key] === s.day;
  const actBtn = (action, label, ok, hint) =>
    `<button class="vz-act${ok ? '' : ' off'}" data-tend="${action}"${ok ? '' : ' disabled'}>` +
    `<span class="vz-act-l">${label}</span>${hint ? `<span class="vz-act-h">${hint}</span>` : ''}</button>`;

  switch (z) {
    case 'kitchen': return {
      title: '요리시설', desc: '솥에 국을 끓여 하루치 식사를 짓는다.', lead: lead('jeonghun'),
      html:
        vzGauge('비축 식량', totalFood, totalFood / 100, '#e0b24a') +
        `<div class="vz-grid2">` +
          vzStat('신선', s.food, '#e0b24a', '부패 ' + decayLab) +
          vzStat('말린', s.driedFood, '#cdb98a', '장기보관') +
          vzStat('절임', s.pickledFood, '#bcae7a', '장기보관') +
          vzStat('하루 소비', '−' + n, '#e8e2c4', n + '명') +
        `</div>` +
        vzStat('버틸 수 있는 일수', days + '일', days <= 2 ? '#e07070' : days <= 5 ? '#d4a14f' : '#74c074') +
        `<div class="vz-note">비축 상태 · <b style="color:${foodT.tier === 'famine' ? '#e07070' : foodT.tier === 'crisis' ? '#d4a14f' : '#cdd0a0'}">${foodT.label}</b> · ${seasonDef.name}엔 신선 식량이 <b style="color:${decayCol}">${decayVerb}</b>. 잉여 신선분은 매일 조금씩 상한다 — 저장해두면 든든하다.</div>`,
      actions: (function () {
        const kDone = tdone('kitchen');
        const canCook = !kDone && !P.waterDry && s.food >= P.cook.food && s.fuel >= P.cook.fuel && s.water >= P.cook.water;
        const canPrev = !kDone && s.food >= P.preserve.food && s.fuel >= P.preserve.fuel;
        const cookHint = kDone ? '오늘 완료' : P.waterDry ? '물이 말랐다' : (s.food < P.cook.food ? '신선 부족' : s.fuel < P.cook.fuel ? '연료 부족' : s.water < P.cook.water ? '물 부족' : `신선${P.cook.food}·연료${P.cook.fuel}·물${P.cook.water} → 사기+${P.cook.morale}${P.jeong ? ' · 정훈의 솜씨' : ''}`);
        const prevHint = kDone ? '오늘 완료' : (s.food < P.preserve.food ? '신선 부족' : s.fuel < P.preserve.fuel ? '연료 부족' : `신선${P.preserve.food} → 말림+${P.preserve.dried}·절임+${P.preserve.pickled}${P.jeong ? ' · 정훈의 솜씨' : ''}`);
        return actBtn('cook', '🍳 요리 (사기↑)', canCook, cookHint) + actBtn('preserve', '🫙 저장 가공', canPrev, prevHint);
      })()
    };
    case 'field': {
      const growing = s.water >= 30 && decay < 2;
      const note = s.water < 20 ? '물이 부족해 작물이 더디 자란다.'
        : decay >= 2 ? '더위·습기로 잎이 쉬 무른다. 거두면 바로 말리는 게 낫다.'
        : '흙은 아직 우리 편이다. 잎채소가 자라는 중.';
      return {
        title: '밭', desc: '담벼락 밑 텃밭에 잎채소를 길러 식량을 보탠다.', lead: lead('eunseo'),
        html:
          vzGauge('관개용수', s.water, s.water / 100, '#5ab0e0') +
          `<div class="vz-grid2">` +
            vzStat('계절', seasonDef.name, '#cdd0a0') +
            vzStat('생육 상태', growing ? '양호' : '더딤', growing ? '#74c074' : '#d4a14f') +
            vzStat('비축 식량', totalFood, '#e0b24a') +
            vzStat('부패 속도', decayLab, decayCol) +
          `</div>` +
          `<div class="vz-note">${note}</div>`,
        actions: actBtn('harvest', '🌱 수확하기', !tdone('field') && !P.waterDry,
          P.waterDry ? '물이 말랐다 — 물 먼저' : tdone('field') ? '오늘 완료'
            : `신선 +${P.harvest}${P.eun ? ' · 은서의 솜씨' : ''}${s.water >= 30 ? '' : ' (관개 부족·절반)'}`)
      };
    }
    case 'barracks': {
      const people = LR.CHARACTER_ORDER.map(id => vzPerson(C(id), D(id))).join('');
      return {
        title: '숙소', desc: '생존자들이 몸을 누이고 쉬는 곳. 모두의 상태를 한눈에 살핀다.', lead: null,
        html:
          `<div class="vz-grid2">` +
            vzStat('생존자', n + '/10', '#74c074') +
            vzStat('평균 사기', avgMo, moColor(avgMo)) +
          `</div>` +
          `<div class="vz-people-h"><span>이름</span><span>체력 · 사기</span></div>` +
          `<div class="vz-people">${people}</div>`
      };
    }
    case 'infirmary': {
      const list = hurtIds.length
        ? hurtIds.map(id => vzPerson(C(id), D(id))).join('')
        : `<div class="vz-empty">지금은 치료가 필요한 사람이 없다.</div>`;
      return {
        title: '의무실', desc: '다친 사람과 환자를 돌본다.', lead: lead('sujin'),
        html:
          `<div class="vz-grid2">` +
            vzStat('의약품', s.medicine, s.medicine === 0 ? '#e07070' : s.medicine <= 1 ? '#d4a14f' : '#e8e2c4') +
            vzStat('부상·환자', hurtIds.length + '명', hurtIds.length ? '#d4a14f' : '#74c074') +
          `</div>` +
          `<div class="vz-people">${list}</div>`
      };
    }
    case 'workshop': {
      const beaconDef = LR.BEACON_TYPES[s.beacon.type];
      const phaseLabel = { announce: '예고', develop: '발전', reach: '도달', resolve_pre: '해소 전야', resolve: '해소' }[s.beacon.phase] || s.beacon.phase;
      const score = Math.min(100, LR.beaconScore(s));
      return {
        title: '작업장 · 통신', desc: '통신 비컨을 손보고 구조 신호를 키운다.', lead: lead('jonghyeok'),
        html:
          vzGauge('신호 강도', score, score / 100, 'var(--c-beacon)') +
          `<div class="vz-grid2">` +
            vzStat('신호', beaconDef.name, '#cdd0a0') +
            vzStat('단계', 'D' + LR.beaconDayInWeek(s) + ' · ' + phaseLabel, '#e8e2c4') +
            vzStat('연료', s.fuel, s.fuel < 6 ? '#e07070' : s.fuel < 12 ? '#d4a14f' : '#e0823a') +
            vzStat('투입 식량', s.beacon.investedFood, '#e0b24a') +
          `</div>`
      };
    }
    case 'water': return {
      title: '물 · 빗물받이', desc: '빗물을 받아 식수를 모은다.', lead: null,
      html:
        vzGauge('식수', s.water, s.water / 100, '#5ab0e0') +
        `<div class="vz-grid2">` +
          vzStat('하루 소비', '−' + n, '#e8e2c4', n + '명') +
          vzStat('계절', seasonDef.name, s.season === 'rainy' ? '#5ab0e0' : '#cdd0a0', s.season === 'rainy' ? '보충 ↑' : '') +
        `</div>` +
        `<div class="vz-note">${s.season === 'rainy' ? '장맛비로 빗물받이가 넉넉히 찬다.' : s.water < 20 ? '물이 빠르게 줄고 있다. 아껴야 한다.' : '당장은 버틸 만하다.'} 물은 식수이자 밭 관개·요리의 바탕이다.</div>`,
      actions: actBtn('water', '🪣 물 뜨기', !tdone('water'),
        tdone('water') ? '오늘 완료' : `식수 +${P.waterDraw}`)
    };
  }
  // 그 외 구역(비어 있어도 칸은 뜬다)
  return {
    title: ZL[z] || '구역', desc: '특별히 보고된 정황은 없다.', lead: null,
    html: `<div class="vz-empty">표시할 상세 정보가 없다.</div>`
  };
}

LR.village.showZoneInfo = function(z) {
  const el = document.getElementById('vhZinfo');
  const s = LR.village.state;
  if (!el || !s) return;
  if (z === 'watchtower' || z === 'gate') return;     // 망루·정문은 외부 정찰 패널
  const d = zonePanel(z, s);
  LR.village.closePopover();                           // 인물 팝오버와 동시 표시 X
  const out = document.getElementById('vhOutside');    // 외부 정찰 패널도 닫기
  if (out) out.classList.remove('open');
  LR.village._zinfoZone = z;
  el.innerHTML = `
    <button class="vh-pop-x" id="vhZinfoX">✕</button>
    <div class="vz-head"><span class="vz-icon">⌖</span><span class="vz-title">${d.title}</span></div>
    <div class="vz-desc">${d.desc}</div>
    <div class="vz-body">${d.html}</div>
    ${d.actions ? `<div class="vz-actions"><div class="vz-actions-h">오늘의 살림</div>${d.actions}</div>` : ''}
    ${d.lead ? `<div class="vz-lead">담당 · ${d.lead}</div>` : ''}`;
  el.classList.add('open');
  const x = document.getElementById('vhZinfoX');
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); LR.village.closeZoneInfo(); });
  el.querySelectorAll('[data-tend]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    LR.village.tend(b.dataset.tend);
  }));
};

// 하루의 살림 — 행동별 효과량(패널 표시와 실제 적용이 같은 값을 쓰도록 한 곳에 정의)
//  담당 인물 보너스: 정훈(요리·가공 솜씨) · 은서(수확 솜씨). 물이 마르면 밭·요리 잠금.
LR.village._tendPlan = function(s) {
  const able = id => { const c = s.characters[id]; return !!(c && c.alive && c.health >= 35); };
  const jeong = able('jeonghun');   // 정훈 — 요리/가공
  const eun = able('eunseo');       // 은서 — 수확
  const fieldBase = ({ spring_late: 8, rainy: 7, summer_heat: 5, autumn: 9, winter: 3 })[s.season] ?? 6;
  const harvest = Math.round(fieldBase * (s.water >= 30 ? 1 : 0.5) * (eun ? 1.3 : 1));
  return {
    waterDry: s.water <= 0,
    jeong: jeong, eun: eun,
    waterDraw: s.season === 'rainy' ? 14 : 10,
    harvest: harvest,
    cook: { food: 4, fuel: 2, water: 3, morale: jeong ? 6 : 4 },
    preserve: { food: 6, fuel: 2, dried: jeong ? 5 : 4, pickled: 2 }
  };
};

// 구역 행동버튼 — 하루 1회씩 자원을 돌본다(자동 생산에 더해지는 보너스).
LR.village.tend = function(action) {
  const s = LR.village.state || LR.state;
  if (!s) return;
  if (!s.tending) s.tending = { water: 0, field: 0, kitchen: 0 };
  const today = s.day;
  const P = LR.village._tendPlan(s);
  let msg = '';
  if (action === 'water') {
    if (s.tending.water === today) return;
    s.water = Math.min(100, s.water + P.waterDraw);
    s.tending.water = today; msg = `물 뜨기 — 식수 +${P.waterDraw}`;
  } else if (action === 'harvest') {
    if (s.tending.field === today || P.waterDry) return;   // 물이 마르면 수확 불가
    s.food = Math.min(100, s.food + P.harvest);
    s.tending.field = today; msg = `수확 — 신선 채소 +${P.harvest}${P.eun ? ' (은서)' : ''}`;
  } else if (action === 'cook') {
    if (s.tending.kitchen === today) return;
    if (s.food < P.cook.food || s.fuel < P.cook.fuel || s.water < P.cook.water) return;
    s.food -= P.cook.food; s.fuel -= P.cook.fuel; s.water -= P.cook.water;
    for (const c of LR.aliveChars(s)) c.morale = Math.min(100, c.morale + P.cook.morale);
    s.tending.kitchen = today; msg = `따뜻한 한 끼 — 사기 +${P.cook.morale}`;
  } else if (action === 'preserve') {
    if (s.tending.kitchen === today) return;
    if (s.food < P.preserve.food || s.fuel < P.preserve.fuel) return;
    s.food -= P.preserve.food; s.fuel -= P.preserve.fuel;
    s.driedFood += P.preserve.dried; s.pickledFood += P.preserve.pickled;
    s.tending.kitchen = today; msg = `저장 가공 — 말림 +${P.preserve.dried} · 절임 +${P.preserve.pickled}`;
  } else return;

  if (LR.render && LR.render.toast) LR.render.toast(msg, 'smallwin');
  if (LR.save && LR.save.auto) LR.save.auto(s);
  if (LR.state === s && LR.render && LR.render.renderAll) LR.render.renderAll(s);
  LR.village.render();                                                   // 마을 패널 갱신
  if (LR.village._zinfoZone) LR.village.showZoneInfo(LR.village._zinfoZone);  // 정보창(버튼 상태) 갱신
};

LR.village.positionZinfo = function() {
  // 큰 카드는 화면 중앙 고정(CSS) — 별도 위치 계산 불필요
};

LR.village.closeZoneInfo = function() {
  LR.village._zinfoZone = null;
  const el = document.getElementById('vhZinfo');
  if (el) el.classList.remove('open');
};

// ─── 지난 기록 창 (모달) ───
LR.village.showLog = function() {
  const win = document.getElementById('vhLogWin');
  const s = LR.village.state;
  if (!win || !s) return;
  const log = (s.log || []).slice(-14).reverse();
  const rows = log.length
    ? log.map(l => `<tr>
        <td>D${l.day}</td>
        <td>${l.food}</td>
        <td>${l.avgMorale}</td>
        <td>${l.noise}${l.raided ? ' 🩸' : ''}</td>
        <td>${LR.SPIRAL_LABELS ? (LR.SPIRAL_LABELS[l.spiral] || '—') : '—'}</td>
        <td>${l.survivors}/10</td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="vz-empty">아직 기록이 없다.</td></tr>`;
  win.innerHTML = `
    <button class="vh-pop-x" id="vhLogX">✕</button>
    <div class="vz-head"><span class="vz-icon">📓</span><span class="vz-title">지난 기록</span></div>
    <div class="vz-body">
      <table class="vh-logtable">
        <thead><tr><th>일자</th><th>식량</th><th>사기</th><th>소음</th><th>나선</th><th>생존</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  win.classList.add('open');
  const x = document.getElementById('vhLogX');
  if (x) x.addEventListener('click', () => LR.village.closeLog());
};
LR.village.closeLog = function() {
  const win = document.getElementById('vhLogWin');
  if (win) win.classList.remove('open');
};

// ─── 망루 · 외부 정찰 (방어탑 클릭) ───
LR.village.showOutside = function() {
  const el = document.getElementById('vhOutside');
  const s = LR.village.state;
  if (!el || !s) return;
  const n = s.noiseToday, raid = LR.raidProbability(n), pct = Math.round(raid.p * 100);
  const ph = dayPhase(s), col = scopeColor(n);
  const desc = {
    '위험': '담장 너머에서 여러 그림자가 어슬렁댄다. 오늘 밤이 위험하다.',
    '경계': '멀리서 무리의 기척이 느껴진다. 소음을 줄여야 한다.',
    '주의': '한둘이 거리를 배회한다. 아직은 견딜 만하다.',
    '낮음': '거리는 조용하다. 바람과 빗소리뿐이다.'
  }[raid.scale] || '거리는 조용하다.';
  const lastNight = s.raidLastNightSummary
    ? `<div class="vh-out-row danger">🩸 ${s.raidLastNightSummary}</div>`
    : `<div class="vh-out-row calm">지난밤은 조용히 지나갔다.</div>`;
  // 위협도(소음)에 따라 담장 밖 좀비 수
  const OUT = 'assets/images/outside/';
  const zN = { '위험': 6, '경계': 4, '주의': 2, '낮음': 1 }[raid.scale] ?? 1;
  let zh = '';
  for (let i = 0; i < zN; i++) {
    const x = 6 + (i * 31 + i * i * 17) % 80;
    const gb = 6 + (i * 13 + i * i * 7) % 26;        // 바닥에서 띄운 정도(원근) 6~32%
    const dur = 8 + (i * 5) % 8;
    const dir = (i % 2) ? 1 : -1;
    const sc = 1.15 - gb / 32 * 0.55;                // 아래(가까움)일수록 큼
    zh += `<img class="vh-ozombie" src="${OUT}zombie01.png" alt="" style="left:${x}%; bottom:${gb}%; height:${(46 * sc).toFixed(0)}%; --od:${dur}s; transform:scaleX(${dir}); animation-delay:${-(i * 2) % 7}s">`;
  }
  el.innerHTML = `
    <button class="vh-pop-x" id="vhOutX">✕</button>
    <div class="vh-out-h">⌖ 망루 · 외부 정찰</div>
    <div class="vh-out-view ${ph.cls}">
      <img class="vh-out-bg" src="${OUT}outside_normal01.png" alt="" onerror="this.style.display='none'">
      <div class="vh-out-z">${zh}</div>
    </div>
    <div class="vh-out-grid">
      <div><span>시간</span><b>${ph.label}</b></div>
      <div><span>소음</span><b style="color:${col}">${n}</b></div>
      <div><span>위협</span><b style="color:${col}">${raid.scale}</b></div>
      <div><span>습격 확률</span><b style="color:${col}">${pct}%</b></div>
    </div>
    <div class="vh-out-desc">${desc}</div>
    ${lastNight}
  `;
  el.classList.add('open');
  const x = document.getElementById('vhOutX');
  if (x) x.addEventListener('click', () => el.classList.remove('open'));
};

// ═══════════════════════════════════════════════════════
//  오늘의 결정 — 마을을 메인 플레이 표면으로
//  loop.js의 시나리오 노드(state.pendingChoice)를 마을 안에서
//  렌더하고, 동일한 LR.engine.applyChoice()로 결정을 적용한다.
// ═══════════════════════════════════════════════════════

// 이름 → 캐릭터 id (대사 화자를 씬에서 하이라이트하기 위함)
function nameToId(name) {
  for (const id of LR.CHARACTER_ORDER) {
    if (LR.CHARACTER_DEFS[id] && LR.CHARACTER_DEFS[id].name === name) return id;
  }
  return null;
}

// 인물 고유색을 어두운 배경에서 읽히게 흰색 쪽으로 섞어 밝힘
function nameColor(id) {
  const d = LR.CHARACTER_DEFS[id];
  if (!d) return '#e8e2c4';
  const n = parseInt(d.color.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = 0.5;   // 흰색 혼합 비율
  r = Math.round(r + (255 - r) * t); g = Math.round(g + (255 - g) * t); b = Math.round(b + (255 - b) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
// 본문 텍스트 속 인물 이름을 고유색·볼드로 강조 (이름 길이 긴 것부터 치환)
function colorizeNames(text) {
  if (!text) return text;
  const ids = LR.CHARACTER_ORDER.slice().sort((a, b) =>
    (LR.CHARACTER_DEFS[b].name || '').length - (LR.CHARACTER_DEFS[a].name || '').length);
  for (const id of ids) {
    const nm = LR.CHARACTER_DEFS[id].name;
    if (!nm) continue;
    text = text.split(nm).join(`<span class="vd-nm" style="color:${nameColor(id)}">${nm}</span>`);
  }
  return text;
}

// 시나리오 노드에서 '관련 인물' 추려내기 (대사 화자 + 인물별 델타 대상)
function decisionActors(node, state) {
  const set = new Set();
  for (const part of (node.body || [])) {
    if (part.kind === 'dialog' && part.speaker) {
      const id = nameToId(part.speaker);
      if (id) set.add(id);
    }
  }
  for (const ch of (node.choices || [])) {
    let pc = ch.perCharDeltas;
    if (typeof pc === 'function') { try { pc = pc(state); } catch (e) { pc = null; } }
    if (pc) for (const id in pc) set.add(id);
  }
  return [...set];
}

// 결정 노드 → 대화 비트 배열(배너·내레이션·대사·시스템노트). 노드당 1회 구성(배너 소비).
// 화자 이름 → 포트레이트 id. 캐릭터면 그 id, 라디오/무전/신호류면 비컨 포트레이트(bc).
function speakerPortrait(name) {
  const id = nameToId(name);
  if (id) return id;
  if (/라디오|무전|신호|수신기|스피커|비컨/.test(name || '')) return 'bc';
  return null;
}
// 내레이션 본문에서 가장 먼저 등장하는 인물 → 포트레이트 id
//  (예: "하영이 제안한다. …" → 하영). 라디오/신호류면 비컨(bc).
function narrationPortrait(text) {
  if (!text) return null;
  let best = null, bestIdx = Infinity;
  for (const id of LR.CHARACTER_ORDER) {
    const nm = LR.CHARACTER_DEFS[id] && LR.CHARACTER_DEFS[id].name;
    if (!nm) continue;
    const i = text.indexOf(nm);
    if (i >= 0 && i < bestIdx) { bestIdx = i; best = id; }
  }
  if (best) return best;
  if (/라디오|무전|신호|수신기|스피커|비컨/.test(text)) return 'bc';
  return null;
}
function buildDecisionBeats(node, s) {
  const beats = [];
  // 계절 전환의 아침 — 분위기와 규칙(소음 보정 등)이 함께 바뀌는 순간을 한 번 짚는다
  if (s.day > 1 && LR.seasonOnDay(s.day) !== LR.seasonOnDay(s.day - 1)) {
    const seasonLine = {
      rainy:  '🌧 장마가 시작됐다. 빗소리가 마을의 소음을 덮는다 (소음 ×0.5) — 대신 습기가 식량과 상처를 노린다.',
      autumn: '🍂 비가 걷히고 가을이 왔다. 마른 공기가 소리를 멀리 보낸다 (소음 ×1.3) — 낙엽이 모든 발걸음을 외친다.',
      winter: '❄ 첫눈. 겨울부터는 연료가 식량만큼 무겁다. 추위는 약한 사람부터 시험한다.'
    }[s.season];
    if (seasonLine) beats.push({ kind: 'note', text: seasonLine });
  }
  // 간밤 판정 인과 — '소음 → 확률 → 결과'의 숫자 사슬을 보여줘 규칙을 추론·학습하게 한다
  const judged = LR.raidProbability(s.noiseToday);
  if (s.raidLastNightSummary) {
    beats.push({ kind: 'banner-danger',
      text: `🩸 ${s.raidLastNightSummary} (소음 ${s.noiseToday} → 습격 확률 ${Math.round(judged.p * 100)}%)` });
  } else if (s.day > 1 && judged.p >= 0.25) {
    beats.push({ kind: 'note',
      text: `🔊 간밤 판정 — 소음 ${s.noiseToday} (${judged.scale}) → 습격 확률 ${Math.round(judged.p * 100)}% → 무리가 비껴갔다.` });
  }
  // 추모의 아침 — 어제 떠난 사람의 빈자리를, 남은 사람들의 말로 한 번 더 짚는다
  if (s.pendingMourning) {
    const m = s.pendingMourning;
    beats.push({ kind: 'narration',
      text: `${m.name}의 자리가 비어 있다. 침상 위의 담요는 아무도 개지 않았다 — 개는 순간, 정말로 떠난 것이 되니까.` });
    const sujin = s.characters.sujin, jaehyeok = s.characters.jaehyeok;
    if (sujin && sujin.alive && m.id !== 'sujin') {
      beats.push({ kind: 'dialog', speaker: '수진', pid: 'sujin',
        text: '"마지막에 해줄 수 있는 게 더 있었을 거예요. 그 생각이 머리에서 떠나질 않아요."' });
    }
    if (jaehyeok && jaehyeok.alive && m.id !== 'jaehyeok') {
      beats.push({ kind: 'dialog', speaker: '재혁', pid: 'jaehyeok',
        text: '"기억해 두자. 우리가 어떤 마을이었는지는, 떠난 사람이 증명하니까."' });
    }
    s.pendingMourning = null;
  }
  // 잃어버린 울음의 아침 — 절제된 두 줄. 더 말하지 않는다.
  if (s.pendingBabyLoss) {
    beats.push({ kind: 'narration',
      text: '미연의 곁에 강보가 하나 놓여 있다. 한 번도 쓰이지 못한 채로.' });
    const mi = s.characters.miyeon;
    if (mi && mi.alive) {
      beats.push({ kind: 'dialog', speaker: '미연', pid: 'miyeon',
        text: '"이름을… 지어뒀었어요. 봄이 오면 말해주려고 했는데."' });
    }
    s.pendingBabyLoss = null;
  }
  // 유대의 아침 — 함께한 작은 순간이 3번 쌓인 두 사람 (한 번만 드러난다)
  if (s.pendingBondBeat) {
    const ba = s.characters[s.pendingBondBeat.a], bb = s.characters[s.pendingBondBeat.b];
    if (ba && bb && ba.alive && bb.alive) {
      beats.push({ kind: 'narration',
        text: `요즘 ${LR.nameWa(ba.name)} ${LR.nameGa(bb.name)} 함께 있는 시간이 늘었다. 누가 먼저랄 것도 없이, 하루의 끝이 서로의 곁이 된다.` });
    }
    s.pendingBondBeat = null;
  }
  // 빈사자의 목소리 — 죽어가는 사람은 수치가 아니라 말로 존재해야 한다 (경고이자 애착)
  const dying = LR.aliveChars(s).find(c => c.health < 20);
  if (dying) {
    beats.push({ kind: 'note', text: `🩸 ${dying.name} 빈사 (체력 ${dying.health}) — 치료 없이는 오래 버티지 못한다.` });
    const line = LR.DYING_LINES && LR.DYING_LINES[dying.id];
    if (line) beats.push({ kind: 'dialog', speaker: dying.name, pid: dying.id, text: line });
  }
  if (s.pendingBeaconResolution) {
    const r = s.pendingBeaconResolution;
    beats.push({ kind: 'banner-beacon', pid: 'bc', text: `📡 ${LR.BEACON_TYPES[r.type].name} ${r.label} — ${r.text}` });
    s.pendingBeaconResolution = null;
  }
  (node.body || []).forEach(part => {
    if (part.kind === 'narration') beats.push({ kind: 'narration', text: part.text, pid: narrationPortrait(part.text) });
    else if (part.kind === 'dialog') beats.push({ kind: 'dialog', speaker: part.speaker, text: part.text, pid: speakerPortrait(part.speaker) });
    else if (part.kind === 'systemNote') beats.push({ kind: 'note', text: part.text });
  });
  // 어제의 전례가 만든 분화 반응 — 같은 사건, 다른 기울기 (감수성 표의 체감화)
  if (s.pendingReactions && s.pendingReactions.length) {
    for (const r of s.pendingReactions) {
      beats.push({ kind: 'dialog', speaker: r.speaker, text: r.text, pid: speakerPortrait(r.speaker) });
    }
    s.pendingReactions = null;
  }
  return beats;
}

LR.village.renderDecision = function() {
  const s = LR.village.state;
  const dec = document.getElementById('vhDecision');
  if (!dec || !s) return;
  const node = s.pendingChoice;
  if (LR.village.isDemo || !node || !s.awaitingChoice) {
    dec.classList.remove('open');
    LR.village.highlightChars = [];
    LR.village._decNodeId = null;
    return;
  }
  // 노드가 바뀌면 대화 비트 새로 구성(처음부터)
  if (LR.village._decNodeId !== node.id) {
    LR.village._decNodeId = node.id;
    LR.village._decBeats = buildDecisionBeats(node, s);
    LR.village._decIdx = 0;
  }
  LR.village._renderDecisionView();
  dec.classList.toggle('open', !LR.village.decisionCollapsed);   // 접힘 상태 유지

  // 관련 인물 하이라이트
  LR.village.highlightChars = decisionActors(node, s);
  applyDecisionHighlights();
};

// 현재 비트(대사 한 줄) 또는 선택지를 결정창에 렌더 + 핸들러 연결
LR.village._renderDecisionView = function() {
  const dec = document.getElementById('vhDecision');
  const s = LR.village.state;
  const node = s && s.pendingChoice;
  if (!dec || !node) return;
  const beats = LR.village._decBeats || [];
  const idx = LR.village._decIdx || 0;
  const atChoices = idx >= beats.length;

  const head = `<div class="vd-head">
    <span class="vd-day">Day ${s.day}</span>
    <span class="vd-spacer"></span>
    <button class="vd-min" id="vdMin" title="접기">▾</button>
  </div>`;

  if (!atChoices) {
    const b = beats[idx];
    const isLast = idx === beats.length - 1;
    const portrait = b.pid
      ? `<img class="vd-port" src="assets/images/busts/${b.pid}.png" alt="" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='assets/images/portraits/${b.pid}.png';}else{const p=this.closest('.vd-portrait'); if(p) p.style.display='none';}">`
      : '';
    const spkLabel = b.kind === 'dialog' ? b.speaker
      : b.kind === 'note' ? '기록'
      : b.kind === 'banner-danger' ? '간밤'
      : b.kind === 'banner-beacon' ? '신호'
      : '상황';
    const spkCls = b.kind === 'dialog' ? '' : ' dim';
    const spkStyle = (b.kind === 'dialog' && b.pid) ? ` style="color:${nameColor(b.pid)}"` : '';
    dec.innerHTML = head + `
      <div class="vd-runner ${b.kind}" id="vdRunner">
        ${b.pid ? `<div class="vd-portrait"${((b.kind === 'dialog' || b.kind === 'narration') && b.pid !== 'bc') ? ` style="border-color:${nameColor(b.pid)}"` : ''}>${portrait}</div>` : ''}
        <div class="vd-textbox">
          <span class="vd-spk${spkCls}"${spkStyle}>${spkLabel}</span>
          <p class="vd-line">${colorizeNames(LR.breakSentences ? LR.breakSentences(b.text) : b.text)}</p>
          <div class="vd-runfoot">
            <span class="vd-progress">${idx + 1} / ${beats.length}</span>
            <span class="vd-next">${isLast ? '▸ 선택지' : '▸ 계속 (클릭)'}</span>
          </div>
        </div>
      </div>`;
    const runner = document.getElementById('vdRunner');
    if (runner) runner.addEventListener('click', () => LR.village._advanceDecision());
  } else {
    const choicesHtml = (node.choices || []).map(choice => {
      if (choice.requireSpiral && s.spiral.state !== choice.requireSpiral) return '';
      if (choice.enabled === false) return '';
      const risk = choice.risk === 'danger' ? ' danger' : choice.risk === 'warn' ? ' warn' : '';
      const sub = choice.body ? `<span class="vd-csub">${choice.body}</span>` : '';
      // 위험 예고 칩 — 이 선택의 예상 소음 → 오늘 밤 습격 확률.
      //  '사기를 올리면 위험이 커진다'는 핵심 모순을 결정을 누르기 전에 몸으로 느끼게 한다.
      const projNoise = LR.computeNoise(s, choice.intentionalNoise || 0);
      const pr = LR.raidProbability(projNoise);
      const prPct = Math.round(pr.p * 100);
      const prCls = pr.p >= 0.6 ? 'danger' : pr.p >= 0.25 ? 'warn' : 'calm';
      const noiseChip = `<span class="vd-cnoise ${prCls}">🔊 소음 ${projNoise} → 밤 습격 ${prPct}%</span>`;
      return `<button class="vd-choice${risk}" data-cid="${choice.id}">
        <span class="vd-clet">${choice.id}</span>
        <span class="vd-cbody"><b>${choice.label}</b>${sub}${noiseChip}</span>
      </button>`;
    }).join('');
    const replay = beats.length ? `<button class="vd-replay" id="vdReplay">↻ 대화 다시</button>` : '';
    dec.innerHTML = head + `
      ${node.keyLine ? `<p class="vd-key">${node.keyLine}</p>` : ''}
      <div class="vd-choices">${choicesHtml}</div>
      ${replay}`;
    dec.querySelectorAll('.vd-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (LR.village._busy) return;
        // 외출(탐색) 선택지는 바로 적용하지 않고 위험·보상 확인 패널을 먼저
        const ch = (node.choices || []).find(c => c.id === btn.dataset.cid);
        if (ch && ch.expedition) { LR.village._renderExpeditionConfirm(ch); return; }
        LR.village._busy = true;
        LR.engine.applyChoice(btn.dataset.cid);
      });
    });
    const rep = document.getElementById('vdReplay');
    if (rep) rep.addEventListener('click', () => { LR.village._decIdx = 0; LR.village._renderDecisionView(); });
  }

  const minb = document.getElementById('vdMin');
  if (minb) minb.addEventListener('click', () => LR.village.toggleDecision(false));
};

LR.village._advanceDecision = function() {
  const beats = LR.village._decBeats || [];
  LR.village._decIdx = Math.min((LR.village._decIdx || 0) + 1, beats.length);
  LR.village._renderDecisionView();
};

// 외출(탐색) 확인 패널 — "나갈 것인가". 보상·위험·남았을 때의 전망을 한눈에.
LR.village._renderExpeditionConfirm = function(choice) {
  const dec = document.getElementById('vhDecision');
  const s = LR.village.state;
  if (!dec || !s) return;
  const ex = choice.expedition;
  const aliveN = Math.max(1, LR.aliveChars(s).length);
  const totalFood = s.food + s.driedFood + s.pickledFood;
  const daysNow = Math.floor(totalFood / aliveN);
  const afterFood = Math.min(100, totalFood + (ex.foodGain || 0));
  const daysAfter = Math.floor(afterFood / aliveN);
  const pct = Math.round((ex.injuryChance || 0.35) * 100);
  const leadChar = ex.leadId && s.characters[ex.leadId];
  const leadName = ex.leadName || (leadChar && leadChar.alive ? leadChar.name : '탐색대');
  const foodT = LR.foodTier(totalFood);
  const stayLine = totalFood <= 19
    ? `보유 식량 ${totalFood} (기근) — 오늘도 전원이 체력을 잃는다`
    : `보유 식량 ${totalFood} (${foodT.label}) — 약 ${daysNow}일치. 내일 ${Math.max(0, totalFood - aliveN)}`;

  dec.innerHTML = `<div class="vd-head">
      <span class="vd-day">Day ${s.day}</span>
      <span class="vd-spacer"></span>
      <button class="vd-min" id="vdMin" title="접기">▾</button>
    </div>
    <div class="vd-confirm">
      <p class="vd-cf-title">⚑ 외출 — ${ex.spot || '바깥'}</p>
      <p class="vd-cf-sub">${LR.nameGa(leadName)} 담장 밖으로 나간다. 바깥은 안전하지 않다.</p>
      <div class="vd-cf-rows">
        <div class="vd-cf-row good">
          <span class="vd-cf-ic">🍞</span>
          <span class="vd-cf-lab">성공 보상</span>
          <span class="vd-cf-val">식량 +${ex.foodGain} → 보유 ${afterFood} (약 ${daysAfter}일치)</span>
        </div>
        <div class="vd-cf-row risk">
          <span class="vd-cf-ic">🩸</span>
          <span class="vd-cf-lab">부상 위험</span>
          <span class="vd-cf-val">${pct}% — ${leadName} 체력 -${ex.injuryMin || 6}~${ex.injuryMax || 16}</span>
        </div>
        <div class="vd-cf-row stay">
          <span class="vd-cf-ic">🏠</span>
          <span class="vd-cf-lab">남는다면</span>
          <span class="vd-cf-val">${stayLine}</span>
        </div>
      </div>
      <div class="vd-cf-actions">
        <button class="vd-cf-go" id="vdCfGo">⚑ 나간다 — 위험을 감수한다</button>
        <button class="vd-cf-stay" id="vdCfStay">남는다</button>
      </div>
    </div>`;

  const go = document.getElementById('vdCfGo');
  if (go) go.addEventListener('click', () => {
    if (LR.village._busy) return;
    LR.village._busy = true;
    LR.engine.applyChoice(choice.id);
  });
  const stay = document.getElementById('vdCfStay');
  if (stay) stay.addEventListener('click', () => LR.village._renderDecisionView());
  const minb = document.getElementById('vdMin');
  if (minb) minb.addEventListener('click', () => LR.village.toggleDecision(false));
};

function applyDecisionHighlights() {
  const host = document.getElementById('vhScene');
  if (!host) return;
  host.querySelectorAll('.vh-actorfull.vd-hl').forEach(a => a.classList.remove('vd-hl'));
  (LR.village.highlightChars || []).forEach(id => {
    const a = host.querySelector('.vh-actorfull[data-char="' + id + '"]');
    if (a) a.classList.add('vd-hl');
  });
}
LR.village._applyDecisionHighlights = applyDecisionHighlights;

LR.village.toggleDecision = function(force) {
  const dec = document.getElementById('vhDecision');
  if (!dec) return;
  const open = (force === undefined) ? !dec.classList.contains('open') : force;
  LR.village.decisionCollapsed = !open;
  dec.classList.toggle('open', open);
};

// loop.js(beginDay)에서 매일 호출 — 마을이 활성 플레이 표면이면 갱신
LR.village.syncFromGame = function(state) {
  LR.village._busy = false;
  const el = document.getElementById('villageScreen');
  if (!LR.village.playMode || !el || !el.classList.contains('active')) return;
  LR.village.state = state;
  LR.village.isDemo = false;
  LR.village.decisionCollapsed = false;   // 새 날엔 오늘의 결정 자동 표시
  LR.village.closePopover();              // 이전 선택 팝오버 닫기
  LR.village.render();          // 패널 + 씬 + 오늘의 결정 갱신
};

// 새 게임/이어하기에서 마을을 메인 플레이 표면으로 진입
LR.village.openAsPlay = function() {
  LR.village.playMode = true;
  LR.village.open(LR.state);
  LR.village._maybeTutorial();
};

// 하루의 살림 — 첫 진입 시 한 번만 뜨는 가벼운 안내(localStorage 기억)
LR.village._maybeTutorial = function() {
  let seen = false;
  try { seen = localStorage.getItem('lr_tend_tut') === '1'; } catch (e) {}
  if (seen) return;
  const scr = document.getElementById('villageScreen');
  if (!scr || scr.querySelector('.vh-tut')) return;
  const wrap = document.createElement('div');
  wrap.className = 'vh-tut';
  wrap.innerHTML = `
    <div class="vh-tut-card">
      <div class="vh-tut-kick">처음 오셨네요</div>
      <h3>오늘의 살림</h3>
      <p>마을 시설을 눌러 <b>매일 한 번씩</b> 돌보세요.</p>
      <ul>
        <li><span>🪣</span><b>물 뜨기</b> — 빗물받이에서 식수를 확보</li>
        <li><span>🌱</span><b>수확</b> — 밭에서 신선 채소를 (물이 있어야 함)</li>
        <li><span>🍳</span><b>부엌</b> — 요리(사기↑) 또는 저장 가공(말림·절임)</li>
      </ul>
      <p class="vh-tut-sub">신선식품은 쌓아두면 상해요 — 풍족할 때 <b>저장</b>해두면 위기에 든든해요. 상단 <b>오늘의 살림 N/3</b>으로 확인할 수 있어요.</p>
      <button class="vh-tut-ok">알겠어요</button>
    </div>`;
  scr.appendChild(wrap);
  const close = () => { wrap.remove(); try { localStorage.setItem('lr_tend_tut', '1'); } catch (e) {} };
  wrap.querySelector('.vh-tut-ok').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
};

// ═══════════════════════════════════════════════════════
//  렌더
// ═══════════════════════════════════════════════════════
LR.village.render = function() {
  const s = LR.village.state;
  if (!s) return;
  renderTopbar(s);
  renderTendingHud(s);
  renderRoster(s);
  renderSystems(s);
  updateScopeReadout(s);
  LR.village.renderScene();
  LR.village.renderDecision();
  LR.village.fillDossier();
  if (LR.village._syncPause) LR.village._syncPause();
  if (LR.ambience) LR.ambience.update(s);   // 환경음 — 날씨·위협과 동기화
};

// 오늘의 살림 HUD — 물/밭/부엌 돌봄 완료 여부(✓), 클릭하면 해당 구역 정보창 열기
function renderTendingHud(s) {
  const el = document.getElementById('vhTending');
  if (!el) return;
  const t = s.tending || {};
  const P = LR.village._tendPlan(s);
  const items = [
    ['water', '🪣', '물 뜨기', false],
    ['field', '🌱', '수확', P.waterDry],
    ['kitchen', '🍳', '부엌', false]
  ];
  const doneN = items.filter(it => t[it[0]] === s.day).length;
  const hasTodo = items.some(it => t[it[0]] !== s.day && !it[3]);   // 잠기지 않은 미완료가 있으면 널지
  el.classList.toggle('nudge', hasTodo);
  el.innerHTML = `<span class="vh-tend-h">오늘의 살림 <b>${doneN}/3</b></span>` +
    items.map(([zone, ic, lab, locked]) => {
      const done = t[zone] === s.day;
      const cls = done ? ' done' : locked ? ' locked' : '';
      const mark = done ? '✓' : locked ? '✕' : '○';
      return `<button class="vh-tend-chip${cls}" data-tendzone="${zone}" title="${lab} — ${done ? '완료' : locked ? '잠김(물 부족)' : '아직'}">${ic}<i>${mark}</i></button>`;
    }).join('');
  el.querySelectorAll('[data-tendzone]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    LR.village.showZoneInfo(b.dataset.tendzone);
  }));
}

function renderTopbar(s) {
  const seasonName = LR.SEASONS[s.season].name;
  const raid = LR.raidProbability(s.noiseToday);

  document.getElementById('vhDay').textContent = 'Day ' + s.day;
  document.getElementById('vhSeason').textContent = seasonName;
  document.getElementById('vhClock').textContent = dayPhase(s).label;
  const resEl = document.getElementById('vhResources');
  const pct = Math.round(raid.p * 100);
  if (resEl) {
    // 상단엔 한눈에 위급도를 읽는 핵심(식량·사기·생존자·위협).
    //  숫자만으로는 직관이 안 서므로 구간 라벨(부족/불안/…)을 함께 표기. 위급(danger)이면 빨갛게 깜빡임.
    const alive = LR.aliveChars(s).length;
    const foodT = LR.foodTier(s.food);
    const foodCls = foodT.tier === 'famine' ? 'danger' : foodT.tier === 'crisis' ? 'warn' : '';
    const avgMo = Math.round(LR.avgMorale(s));
    const moT = LR.moraleTier(avgMo);
    const moraleCls = avgMo < 30 ? 'danger' : avgMo < 50 ? 'warn' : '';
    const peopleCls = alive < 10 ? 'warn' : '';
    const threatCls = raid.p >= 0.6 ? 'danger' : raid.p >= 0.25 ? 'warn' : 'dim';
    resEl.innerHTML =
      pill('food',   '식량',   s.food + ' · ' + foodT.label, foodCls,   s.food / 100) +
      pill('morale', '사기',   avgMo + ' · ' + moT.label,    moraleCls, avgMo / 100) +
      pill('people', '생존자', alive + '/10',                peopleCls, alive / 10) +
      pill('noise',  '습격',   raid.scale + ' · ' + pct + '%', threatCls);
  }

  // 위협 배너 — '오늘 밤 무슨 일이 일어날 수 있는가'를 그대로 말해준다
  const banner = document.getElementById('vhAlert');
  if (raid.p >= 0.6) {
    banner.className = 'vh-alert danger';
    banner.textContent = '⚠ 오늘 밤 습격 확률 ' + pct + '% — ' + raid.size + ' 접근 가능';
  } else if (raid.p >= 0.25) {
    banner.className = 'vh-alert warn';
    banner.textContent = '오늘 밤 습격 확률 ' + pct + '% — 소음을 줄이는 것이 좋다';
  } else {
    banner.className = 'vh-alert calm';
    banner.textContent = raid.scale + ' — 주변은 비교적 조용하다 (습격 ' + pct + '%)';
  }

  // 위협 비네트 — 경계 이상이면 화면 가장자리가 붉게 고동친다 (긴장 가시화)
  const scr = document.getElementById('villageScreen');
  if (scr) scr.classList.toggle('threat-high', raid.p >= 0.6);
}

function pill(key, label, value, cls, pct, trend) {
  const m = RES[key];
  const fill = (pct != null)
    ? `<span class="vh-pill-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%;background:${m.color}"></i></span>`
    : '';
  const tr = trend ? `<span class="vh-pill-tr ${trend.cls}">${trend.glyph}</span>` : '';
  return `<div class="vh-pill ${cls || ''}" data-res="${key}" style="--rc:${m.color}">
    <span class="vh-pill-ic" style="color:${m.color}">${m.icon}</span>
    <span class="vh-pill-main">
      <span class="vh-pill-top"><span class="vh-pill-lab">${label}</span><span class="vh-pill-val">${value}</span>${tr}</span>
      ${fill}
    </span>
  </div>`;
}

// 우측 패널용 자원 행 (아이콘 + 라벨 + 게이지 + 값 + 추세) — 상황 파악 쉽게
function resRow(key, label, value, cls, pct, trend) {
  const m = RES[key];
  const tr = trend ? `<span class="vh-resrow-tr ${trend.cls}">${trend.glyph}</span>` : '<span class="vh-resrow-tr"></span>';
  return `<div class="vh-resrow ${cls || ''}" data-res="${key}">
    <span class="vh-resrow-ic" style="color:${m.color}">${m.icon}</span>
    <span class="vh-resrow-lab">${label}</span>
    <span class="vh-resrow-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%;background:${m.color}"></i></span>
    <b class="vh-resrow-val">${value}</b>${tr}
  </div>`;
}

// 자원 현황 카드 HTML (우측 패널 최상단). 추세는 _prevRes와 비교.
function resourceCardHtml(s) {
  const alive = LR.aliveChars(s).length;
  const raid = LR.raidProbability(s.noiseToday);
  const foodT = LR.foodTier(s.food);
  const prev = LR.village._prevRes;
  const cur = { food: s.food, water: s.water, fuel: s.fuel, med: s.medicine, noise: s.noiseToday, alive };
  function tr(key, invert) {
    if (!prev || prev[key] === undefined) return null;
    if (cur[key] === prev[key]) return { glyph: '─', cls: 'flat' };
    const up = cur[key] > prev[key];
    const good = invert ? !up : up;   // 소음·생존자감소는 반전
    return { glyph: up ? '▲' : '▼', cls: good ? 'good' : 'bad' };
  }
  const rows = [
    resRow('food',  '식량', s.food, foodT.tier === 'famine' ? 'danger' : foodT.tier === 'crisis' ? 'warn' : '', s.food / 100, tr('food')),
    resRow('water', '물',   s.water, s.water < 12 ? 'danger' : s.water < 25 ? 'warn' : '', s.water / 100, tr('water')),
    resRow('fuel',  '연료', s.fuel,  s.fuel < 6 ? 'danger' : s.fuel < 12 ? 'warn' : '', s.fuel / 100, tr('fuel')),
    resRow('med',   '의약품', s.medicine, s.medicine === 0 ? 'danger' : s.medicine <= 1 ? 'warn' : '', Math.min(1, s.medicine / 8), tr('med')),
    resRow('noise', '소음', s.noiseToday, raid.p >= 0.6 ? 'danger' : raid.p >= 0.25 ? 'warn' : '', s.noiseToday / 100, tr('noise', true)),
    resRow('people', '생존자', alive + '/10', alive < 10 ? 'warn' : '', alive / 10, tr('alive'))
  ].join('');
  return `<section class="vh-card vh-res-card"><h4>자원 현황</h4>${rows}</section>`;
}

function renderRoster(s) {
  const root = document.getElementById('vhRoster');
  root.innerHTML = LR.CHARACTER_ORDER.map(id => {
    const c = s.characters[id];
    const def = LR.CHARACTER_DEFS[id];
    const ht = LR.healthTier(c.health);
    const sel = LR.village.selected === id ? ' selected' : '';
    const dead = c.alive ? '' : ' dead';
    const hpc = hpColor(c.health), moc = moColor(c.morale);
    const danger = c.alive && (c.health < 20 || c.morale < 25) ? ' danger' : '';
    const hpLow = c.alive && c.health < 50 ? ' low' : '';
    const moLow = c.alive && c.morale < 50 ? ' low' : '';
    return `<button class="vh-rost${sel}${dead}${danger}" data-rost="${id}" style="--cc:${def.color}">
      <span class="vh-rost-top">
        <span class="vh-rost-name">${c.name}<em>${c.role}</em></span>
        <span class="vh-rost-state" style="color:${c.alive ? (c.health < 50 || c.morale < 50 ? hpc : 'var(--c-text-dim)') : '#777'}">${c.alive ? ht.label : '사망'}</span>
      </span>
      <span class="vh-rost-stats">
        <span class="vh-stat${hpLow}"><span class="vh-stat-ic" style="color:${hpc}">${HPIC}</span><span class="vh-mini"><i style="width:${c.health}%;background:${hpc}"></i></span></span>
        <span class="vh-stat${moLow}"><span class="vh-stat-ic" style="color:${moc}">${MOIC}</span><span class="vh-mini"><i style="width:${c.morale}%;background:${moc}"></i></span></span>
      </span>
    </button>`;
  }).join('');
  root.querySelectorAll('[data-rost]').forEach(b => {
    b.addEventListener('click', () => LR.village.select(b.dataset.rost));
  });
}

function renderSystems(s) {
  const sp = s.spiral;
  const spName = { none: '미형성', gyogam: '교감', gyeolsok: '결속', danhap: '단합' }[sp.state] || '미형성';
  const beaconDef = LR.BEACON_TYPES[s.beacon.type];
  const phaseLabel = { announce: '예고', develop: '발전', reach: '도달', resolve_pre: '해소 전야', resolve: '해소' }[s.beacon.phase] || s.beacon.phase;
  const avg = Math.round(LR.avgMorale(s));

  const precHtml = s.precedents.length === 0
    ? `<div class="vh-sys-empty">아직 도덕적 좌표 없음</div>`
    : s.precedents.map(p => {
        const I = LR.precedentCurrentIntensity(s, p);
        return `<div class="vh-prec ${p.type === 'pos' ? 'pos' : 'neg'}">
          <span class="vh-prec-name">${p.id} · ${p.label}</span>
          <span class="vh-prec-i">강도 ${I.toFixed(2)}</span>
        </div>`;
      }).join('');

  const swFired = Object.keys(LR.SMALL_WIN_DEFS).filter(id => s.smallWins[id] && s.smallWins[id].lastFired > 0).length;

  document.getElementById('vhSystems').innerHTML = `
    ${resourceCardHtml(s)}
    <section class="vh-card">
      <h4>상승 나선</h4>
      <div class="vh-spiral">
        <span class="${sp.state === 'gyogam' ? 'on' : ''}">교감</span>
        <span class="${sp.state === 'gyeolsok' ? 'on' : ''}">결속</span>
        <span class="${sp.state === 'danhap' ? 'on' : ''}">단합</span>
      </div>
      <div class="vh-line"><span>현재</span><b>${spName} · 평균 사기 ${avg}</b></div>
    </section>

    <section class="vh-card vh-beacon-card">
      <h4>주간 비컨</h4>
      <div class="vh-beacon-dev ${(s.beacon.phase === 'reach' || s.beacon.phase === 'resolve_pre' || s.beacon.phase === 'resolve') ? 'tx-strong' : s.beacon.phase === 'develop' ? 'tx-mid' : 'tx-idle'}">
        <img src="assets/images/portraits/bc.png" alt="비컨 통신기">
        <span class="vh-beacon-sig"></span>
      </div>
      <div class="vh-line"><span>신호</span><b>${beaconDef.name}</b></div>
      <div class="vh-line"><span>단계</span><b>D${LR.beaconDayInWeek(s)} · ${phaseLabel}</b></div>
      <div class="vh-bar"><i style="width:${Math.min(100, LR.beaconScore(s))}%;background:var(--c-beacon)"></i></div>
    </section>

    <section class="vh-card">
      <h4>전례 (P-)</h4>
      ${precHtml}
    </section>

    <section class="vh-card">
      <h4>Small Win · 긴장도</h4>
      <div class="vh-line"><span>SW 발동</span><b>${swFired} / ${Object.keys(LR.SMALL_WIN_DEFS).length}</b></div>
      <div class="vh-line"><span>TI</span><b class="${s.TI > 75 ? 'bad' : s.TI > 50 ? 'warn' : ''}">${s.TI} · ${LR.tiState(s.TI)}</b></div>
    </section>
  `;

  // 자원 변동 즉각 피드백(우측 자원 행 플래시) + 직전값 갱신
  const sysEl = document.getElementById('vhSystems');
  const prev = LR.village._prevRes;
  const cur = { food: s.food, water: s.water, fuel: s.fuel, med: s.medicine, noise: s.noiseToday, alive: LR.aliveChars(s).length };
  if (prev) {
    for (const k of ['food', 'water', 'fuel', 'med', 'noise']) {
      if (cur[k] === prev[k]) continue;
      const el = sysEl.querySelector('.vh-resrow[data-res="' + k + '"]');
      if (!el) continue;
      const rose = cur[k] > prev[k];
      el.classList.add(((k === 'noise') ? !rose : rose) ? 'flash-up' : 'flash-dn');
    }
  }
  LR.village._prevRes = cur;
}

// 인물 상세는 상시 패널 대신 클릭 팝오버(showPopover)로만 표시 — renderDetail 제거됨

// ─── 음향 감지 스코프 (소음 → 실시간 파형) ───
function scopeColor(noise) {
  const sc = LR.raidProbability(noise).scale;
  return sc === '위험' ? '#e0584e' : sc === '경계' ? '#e0823a' : sc === '주의' ? '#d9a441' : '#5fae8a';
}
function updateScopeReadout(s) {
  const v = document.getElementById('vhScopeVal');
  if (!v) return;
  const n = s.noiseToday, col = scopeColor(n);
  const raid = LR.raidProbability(n);
  v.textContent = n; v.style.color = col;
  // 소음이 무엇으로 이어지는지(오늘 밤 습격 확률)까지 한 줄에
  document.getElementById('vhScopeState').textContent =
    raid.scale + ' · 습격 ' + Math.round(raid.p * 100) + '%';
  const dot = document.getElementById('vhScopeDot');
  if (dot) { dot.style.background = col; dot.style.boxShadow = '0 0 6px ' + col; }
}

// 소음 동심원(음파) — 스코프 파형 스파이크와 같은 순간 발생시켜 직관적으로 연동
LR.village.emitWave = function(noise, strength) {
  const host = document.getElementById('vhWaves');
  if (!host || host.childElementCount > 6) return;       // 동시 개수 제한
  const intensity = Math.min(1, (noise || 0) / 100);
  const el = document.createElement('span');
  el.className = 'vh-noisewave';
  const x = 46 + Math.random() * 16;                      // 마당 가운데(불·사람) 근처
  const y = 50 + Math.random() * 12;
  const scale = 4 + intensity * 5 + (strength || 0) * 2;  // 소음 클수록 크게 퍼짐
  el.style.left = x.toFixed(1) + '%';
  el.style.top = y.toFixed(1) + '%';
  el.style.setProperty('--nwscale', scale.toFixed(1));
  el.style.setProperty('--nwdur', (1.1 + Math.random() * 0.5).toFixed(2) + 's');
  el.style.setProperty('--nwcol', scopeColor(noise));
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
};

LR.village.startScope = function() {
  const canvas = document.getElementById('vhScopeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let samples = [];
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    samples = new Array(canvas.width).fill(0);
  }
  resize();
  LR.village._scopeResize = resize;
  LR.village.stopScope();           // 중복 방지
  let t = 0, stopped = false;
  function frame() {
    if (stopped) return;
    const s = LR.village.state;
    const noise = s ? s.noiseToday : 0;
    const intensity = Math.min(1, noise / 100);
    t += 0.12 + intensity * 0.6;     // 소음 클수록 빠르게
    let v = Math.sin(t) * 0.22 + (Math.random() - 0.5) * 0.55;
    if (Math.random() < 0.015 + intensity * 0.13) {       // 돌발 소음 → 파형 스파이크 + 동심원 동시
      const spike = 0.4 + Math.random() * 0.6;
      v += (Math.random() < 0.5 ? -1 : 1) * spike;
      LR.village.emitWave(noise, spike);
    }
    v *= (0.08 + intensity * 0.9);   // 소음 클수록 진폭 ↑
    v = Math.max(-1, Math.min(1, v));
    samples.push(v); if (samples.length > canvas.width) samples.shift();
    draw(noise);
    LR.village._scopeRaf = requestAnimationFrame(frame);
  }
  function draw(noise) {
    const W = canvas.width, H = canvas.height, mid = H / 2, col = scopeColor(noise);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080b08'; ctx.fillRect(0, 0, W, H);
    // 그리드
    ctx.strokeStyle = 'rgba(120,150,110,.12)'; ctx.lineWidth = 1;
    const gx = Math.max(1, Math.floor(W / 8));
    for (let x = 0; x < W; x += gx) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    // 파형
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, (window.devicePixelRatio || 1) * 1.2);
    ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const y = mid - samples[i] * mid * 0.86;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  LR.village._scopeStop = function() { stopped = true; if (LR.village._scopeRaf) cancelAnimationFrame(LR.village._scopeRaf); };
  LR.village._scopeRaf = requestAnimationFrame(frame);
};
LR.village.stopScope = function() { if (LR.village._scopeStop) LR.village._scopeStop(); };

// ═══════════════════════════════════════════════════════
//  동적 FX — 외부 좀비 · 비 · 안개 · 모닥불 불씨 · 포인터 패럴렉스
//  영속 #vhFx 레이어에서 동작 (씬 재렌더에도 안 지워짐)
// ═══════════════════════════════════════════════════════
// (외부 좀비는 절차적 SVG 대신 도트 스프라이트로 추후 재구현 예정 — refreshZombies 제거됨)

LR.village.buildEmbers = function() {
  const host = document.getElementById('vhEmbers');
  if (!host || host.childElementCount) return;
  let html = '<span class="vh-smoke"></span>';
  for (let i = 0; i < 10; i++) {
    const dur = 2.6 + (i % 5) * 0.55;
    const dx = (i % 3 - 1) * 2;
    html += `<span class="vh-ember" style="--edur:${dur}s; --edx:${dx}; animation-delay:${(-i * 0.5).toFixed(2)}s"></span>`;
  }
  host.innerHTML = html;
};

LR.village.startRain = function() {
  const canvas = document.getElementById('vhRain');
  if (!canvas) return;
  LR.village.stopRain();   // 중복 루프 방지
  const ctx = canvas.getContext('2d');
  let drops = [], W = 1, H = 1;
  const dpr = window.devicePixelRatio || 1, wind = 2.2 * dpr;
  function newDrop(rand) {
    return { x: Math.random() * W, y: rand ? Math.random() * H : -20 * dpr,
      len: (10 + Math.random() * 16) * dpr, sp: (7 + Math.random() * 7) * dpr };
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width * dpr));
    H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    const s = LR.village.state;
    const heavy = s && dayPhase(s).cls === 'rain';
    const count = Math.round((W * H) / (heavy ? 10000 : 24000));
    drops = []; for (let i = 0; i < count; i++) drops.push(newDrop(true));
  }
  LR.village._rainResize = resize;
  resize();
  let stopped = false;
  LR.village._rainStop = () => { stopped = true; if (LR.village._rainRaf) cancelAnimationFrame(LR.village._rainRaf); };
  function frame() {
    if (stopped) return;
    if (canvas.style.display === 'none') {                 // 비 안 오는 날 — 그리지 않음
      ctx.clearRect(0, 0, W, H);
      LR.village._rainRaf = requestAnimationFrame(frame);
      return;
    }
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(184,202,222,0.22)'; ctx.lineWidth = Math.max(1, dpr * 0.9);
    ctx.beginPath();
    for (const d of drops) {
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + wind, d.y + d.len);
      d.y += d.sp; d.x += wind * 0.4;
      if (d.y > H) Object.assign(d, newDrop(false));
    }
    ctx.stroke();
    LR.village._rainRaf = requestAnimationFrame(frame);
  }
  LR.village._rainRaf = requestAnimationFrame(frame);
};
LR.village.stopRain = function() { if (LR.village._rainStop) LR.village._rainStop(); };

LR.village._zoom = LR.village._zoom || 0;   // 0 = 미초기화(fitStage가 cover줌으로 세팅)
// 카메라 적용 — contain 기준. zoom=1 이면 전체가 화면에 다 보임(양옆 레터박스),
//  zoom을 키우면 화면을 가득 채우고(cover) 넘치는 만큼 커서로 끝까지 패닝.
LR.village._applyCamera = function() {
  const cam = LR.village._cam;
  const box = document.querySelector('.vh-stagebox');
  const scr = document.getElementById('villageScreen');
  if (!cam || !box || !scr) return;
  const z = LR.village._zoom || 1;
  // 스케일된 이미지가 뷰포트를 넘치는 양(한쪽) = 패닝으로 드러낼 수 있는 최대치
  const ohX = Math.max(0, (cam.w * z - cam.cw) / 2);
  const ohY = Math.max(0, (cam.h * z - cam.ch) / 2);
  scr.style.setProperty('--zoom', z.toFixed(3));
  box.style.setProperty('--panx', ohX.toFixed(1) + 'px');
  box.style.setProperty('--pany', ohY.toFixed(1) + 'px');
  box.style.setProperty('--biasy', '0px');
  box.style.setProperty('--skx', (ohX / z).toFixed(1) + 'px');   // 하늘 상쇄(부모 scale 보정)
  box.style.setProperty('--sky', (ohY / z).toFixed(1) + 'px');
};

LR.village.bindParallax = function() {
  if (LR.village._plxBound) return;
  const stage = document.querySelector('.vh-stage');
  const screen = document.getElementById('villageScreen');
  if (!stage || !screen) return;
  LR.village._plxBound = true;
  let raf = 0, tx = 0, ty = 0;
  function apply() { raf = 0; screen.style.setProperty('--px', tx.toFixed(3)); screen.style.setProperty('--py', ty.toFixed(3)); }
  stage.addEventListener('pointermove', (e) => {
    // 일시정지(창 열림) 중엔 패럴렉스 입력 무시 → 하늘·안개가 커서 따라 어긋나 깜빡이지 않게
    if (screen.classList.contains('paused')) {
      if (tx !== 0 || ty !== 0) { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(apply); }
      return;
    }
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
  // 휠(또는 트랙패드 핀치) → 줌 인/아웃
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dz = (e.deltaY < 0 ? 0.12 : -0.12);
    const lo = LR.village._minZoom || 1;                 // contain(전체보기)
    const hi = LR.village._maxZoom || 2.4;
    LR.village._zoom = Math.max(lo, Math.min(hi, (LR.village._zoom || 1) + dz));
    LR.village._applyCamera();
  }, { passive: false });
};

LR.village.startFx = function() {
  LR.village.buildEmbers();
  LR.village.startRain();
  LR.village.bindParallax();
};
LR.village.stopFx = function() { LR.village.stopRain(); };

// ═══════════════════════════════════════════════════════
//  씬 (중앙 거점 조망)
// ═══════════════════════════════════════════════════════
LR.village.renderScene = function() {
  const s = LR.village.state;
  if (!s) return;
  const host = document.getElementById('vhScene');
  host.className = 'vh-scene ' + LR.village.mode + ' ' + dayPhase(s).cls;
  host.innerHTML = LR.village.mode === 'section' ? sceneSection(s) : sceneCompound(s);
  LR.village.syncWeather();   // 비 이펙트는 실제 비 오는 날만
  // 클릭 선택 (측면 SVG 피규어)
  host.querySelectorAll('[data-char]').forEach(g => {
    g.addEventListener('click', () => LR.village.select(g.dataset.char));
  });
  if (LR.village.mode === 'compound') {
    // 구역 호버 → 이름 라벨만 표시(빛무리 제거). 클릭 → 정보창(망루·정문은 외부 정찰)
    host.querySelectorAll('.vh-hot').forEach(h => {
      const z = h.dataset.zone;
      h.classList.add('vh-hot-act');
      h.addEventListener('mouseenter', () => h.classList.add('hot-on'));
      h.addEventListener('mouseleave', () => h.classList.remove('hot-on'));
      h.addEventListener('click', (e) => {
        e.stopPropagation();
        if (z === 'watchtower' || z === 'gate') { LR.village.closeZoneInfo(); LR.village.showOutside(); }
        else LR.village.showZoneInfo(z);
      });
    });
    // 빈 곳 클릭 → 팝오버·정보창 닫기
    host.addEventListener('click', (e) => {
      if (!e.target.closest('.vh-phot') && !e.target.closest('.vh-hot') && !e.target.closest('.vh-zinfo')) {
        LR.village.closePopover(); LR.village.closeZoneInfo();
      }
    });
    // 인물 핫스팟 — 호버 시 그 인물만 살짝 확대, 클릭 시 선택
    host.querySelectorAll('.vh-phot').forEach(h => {
      const actor = host.querySelector('.vh-actorfull[data-char="' + h.dataset.pchar + '"]');
      const pip = host.querySelector('.vh-pips[data-pchar="' + h.dataset.pchar + '"]');
      h.addEventListener('mouseenter', () => { if (actor) actor.classList.add('hover'); h.classList.add('hot-on'); if (pip) pip.classList.add('vh-pips-hidden'); });
      h.addEventListener('mouseleave', () => { if (actor) actor.classList.remove('hover'); h.classList.remove('hot-on'); if (pip) pip.classList.remove('vh-pips-hidden'); });
      h.addEventListener('click', () => LR.village.select(h.dataset.pchar));
    });
    fitStage();
    if (LR.village._applyDecisionHighlights) LR.village._applyDecisionHighlights();
  }
};

// 이미지 무대 크기 = contain(전체가 들어가게). 실제 확대/축소는 --zoom 으로.
//  zoom=1 → 전체 보임(레터박스), zoom=coverZoom → 화면 꽉 참(기본값).
function fitStage() {
  const host = document.getElementById('vhScene');
  if (!host) return;
  const box = host.querySelector('.vh-stagebox');
  if (!box) return;
  const cw = host.clientWidth, ch = host.clientHeight, ar = 3577 / 2419;
  // contain: 전체가 다 들어가게(가로/세로 중 작은 쪽 기준). 남는 가장자리는 어둡게.
  let w = cw, h = cw / ar;
  if (h > ch) { h = ch; w = ch * ar; }
  box.style.width = Math.round(w) + 'px';
  box.style.height = Math.round(h) + 'px';

  // 카메라(줌·패닝) — 박스 치수 저장
  LR.village._cam = { w: w, h: h, cw: cw, ch: ch };
  // 화면을 꽉 채우는 데 필요한 줌(cover). 기본값으로 사용.
  const coverZoom = Math.max(cw / w, ch / h);
  LR.village._minZoom = 1;                          // 전체 보기(레터박스)
  LR.village._maxZoom = Math.max(coverZoom * 2.2, 2.4);
  if (!LR.village._zoom) LR.village._zoom = coverZoom;   // 첫 진입은 꽉 찬 화면
  LR.village._zoom = Math.max(LR.village._minZoom, Math.min(LR.village._maxZoom, LR.village._zoom));
  LR.village._applyCamera();

  // FX 레이어(비·안개·좀비·불씨)를 스테이지박스(이미지 영역)에 픽셀 정렬
  const fx = document.getElementById('vhFx');
  const stage = document.querySelector('.vh-stage');
  if (fx && stage) {
    // 비·안개·불씨는 줌과 무관하게 화면(호스트) 전체를 덮음
    const hr = host.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    fx.style.left = Math.round(hr.left - sr.left) + 'px';
    fx.style.top = Math.round(hr.top - sr.top) + 'px';
    fx.style.width = Math.round(cw) + 'px';
    fx.style.height = Math.round(ch) + 'px';
    if (LR.village._rainResize) LR.village._rainResize();
  }
  if (LR.village.positionZinfo) LR.village.positionZinfo();   // 구역 정보창도 재배치
}
if (!window.__vhResizeBound) {
  window.__vhResizeBound = true;
  window.addEventListener('resize', () => {
    if (LR.village.mode === 'compound') fitStage();
    if (LR.village._scopeResize) LR.village._scopeResize();
    if (LR.village.positionPopover) LR.village.positionPopover();
    if (LR.village.positionZinfo) LR.village.positionZinfo();
  });
}

// ─── 측면 단면도 ───
function sceneSection(s) {
  const map = SECTION;
  const figs = LR.CHARACTER_ORDER.map(id => fig(s.characters[id], LR.CHARACTER_DEFS[id], map[id])).join('');
  const ph = dayPhase(s);
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="vhSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${ph.sky0}"/><stop offset="1" stop-color="${ph.sky1}"/>
      </linearGradient>
      <radialGradient id="vhGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffcd84" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#ffcd84" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="vhWall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a2922"/><stop offset="1" stop-color="#1b1a16"/>
      </linearGradient>
    </defs>

    <!-- 하늘 / 폐허 실루엣 -->
    <rect x="0" y="0" width="1000" height="640" fill="url(#vhSky)"/>
    ${ruinSkyline(0, 96, ph)}

    <!-- 건물 외벽 -->
    <rect x="58" y="92" width="884" height="512" rx="6" fill="url(#vhWall)" stroke="#3a382e" stroke-width="3"/>
    <!-- 층 바닥 -->
    ${floorSlab(70, 210)} ${floorSlab(70, 335)} ${floorSlab(70, 475)} ${floorSlab(70, 595)}
    <!-- 지붕 가장자리 -->
    <rect x="50" y="86" width="900" height="12" rx="3" fill="#34322a"/>

    <!-- 따뜻한 빛 웅덩이 -->
    <ellipse cx="185" cy="455" rx="150" ry="90" fill="url(#vhGlow)"/>
    <ellipse cx="500" cy="455" rx="120" ry="80" fill="url(#vhGlow)" opacity="0.7"/>
    <ellipse cx="770" cy="320" rx="90" ry="60" fill="url(#vhGlow)" opacity="0.5"/>

    <!-- 구역 설비 -->
    ${roomLabel(150, 130, '숙소')} ${cot(160, 206)} ${cot(282, 206)}
    ${roomLabel(150, 250, '작업장 · 통신')} ${workbench(520, 332)} ${radioSet(742, 332, s)}
    ${roomLabel(150, 360, '요리 · 공용 · 의무실')} ${stove(150, 472)} ${campfire(420, 470)} ${infirmary(620, 472)}
    ${roomLabel(150, 500, '지하 · 밭 · 정문')} ${gardenRows(560, 560)} ${gate(120, 595)}

    <!-- 망루 -->
    ${watchtower(820, 96)}

    <!-- 인물 -->
    ${figs}

    <!-- 비네트 -->
    <rect x="0" y="0" width="1000" height="640" fill="url(#vhVig)" pointer-events="none"/>
    <radialGradient id="vhVig" cx="0.5" cy="0.46" r="0.75">
      <stop offset="0.62" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </svg>`;
}

// ─── 마당형 (위에서 본 거점) — 실사 배경 + 글로우 호버 + 인물 스프라이트 ───
function sceneCompound(s) {
  const A = VILLAGE_ASSET;
  const sel = LR.village.selected;
  // 모닥불 빛무리 — 패럴렉스 배경(px3_main)에 모닥불이 baked-in이라 glow만 얹음
  const fire = `<div class="vh-layer vh-firelight"></div>`;
  const people = PEOPLE_FILES.map((p, i) => {
    const c = s.characters[p.char];
    const dead = (!c || !c.alive) ? 'display:none;' : '';
    const isSel = LR.village.picked && p.char === sel;
    // 인물마다 숨쉬기 주기/위상 살짝 다르게(동시에 안 움직이게)
    const idle = `--idle-delay:${(-i * 0.7).toFixed(1)}s;--idle-dur:${(3.6 + (i % 4) * 0.5).toFixed(1)}s;`;
    if (p.inplace) {
      // 풀캔버스 제자리 — 무대에 그대로 포갬. dx/dy(%)는 인물만 미세 이동(나머지는 투명).
      const origin = (p.ox != null) ? `transform-origin:${p.ox}% ${p.oy}%;` : '';
      // dx/dy 오프셋이 있으면 idle 애니메이션이 transform을 덮어쓰지 않게 끔
      const off = (p.dx || p.dy) ? `transform:translate(${p.dx || 0}%,${p.dy || 0}%);animation:none;` : '';
      return `<img class="vh-layer vh-actorfull${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="${origin}${off}${idle}${dead}" onerror="this.style.display='none'">`;
    }
    const size = (p.h != null) ? `height:${p.h}%` : `width:${p.w}%`;
    return `<img class="vh-actor${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="left:${p.cx}%;top:${p.cy}%;${size};${dead}" onerror="this.style.display='none'">`;
  }).join('');
  const tendIcon = { water: '🪣', field: '🌱', kitchen: '🍳' };
  const tendP = LR.village._tendPlan(s);
  const hots = ZONES.map(zn => {
    let mark = '';
    if (tendIcon[zn.z]) {
      const done = s.tending && s.tending[zn.z] === s.day;
      const locked = zn.z !== 'water' && tendP.waterDry;
      const cls = done ? 'done' : locked ? 'locked' : 'todo';
      mark = `<span class="vh-hot-mark ${cls}">${done ? '✓' : locked ? '✕' : '●'}</span>`;
    }
    return `<button class="vh-hot" data-zone="${zn.z}" style="left:${zn.box[0]}%;top:${zn.box[1]}%;width:${zn.box[2]}%;height:${zn.box[3]}%">${mark}<span class="vh-hotlab">${zn.label}</span></button>`;
  }).join('');
  // 인물 핫스팟 (형상 위) — 호버 시 확대, 클릭 시 선택
  const phots = PEOPLE_FILES.map(p => {
    const c = s.characters[p.char];
    if (!c || !c.alive || !p.box) return '';
    const pl = Math.max(0, p.box[0] - 1), pt = Math.max(0, p.box[1] - 1), pw = p.box[2] + 2, ph = p.box[3] + 2;
    const nm = c.name || '';
    return `<button class="vh-phot" data-pchar="${p.char}" style="left:${pl}%;top:${pt}%;width:${pw}%;height:${ph}%"><span class="vh-plab">${nm}</span></button>`;
  }).join('');
  // 상태 경고 핀 — 다치거나 사기 낮은 사람 머리 위 (멀쩡하면 안 뜸)
  const pips = PEOPLE_FILES.map(p => {
    const c = s.characters[p.char];
    if (!c || !c.alive || !p.box) return '';
    const items = [];
    if (c.health < 60) items.push(`<span class="vh-pip" style="color:${hpColor(c.health)}">${HPIC}</span>`);
    if (c.morale < 50) items.push(`<span class="vh-pip" style="color:${moColor(c.morale)}">${MOIC}</span>`);
    if (!items.length) return '';
    const cx = p.box[0] + p.box[2] / 2, ty = p.box[1];
    return `<div class="vh-pips" data-pchar="${p.char}" style="left:${cx}%;top:${ty}%">${items.join('')}</div>`;
  }).join('');
  // 게이트(y56~71) 바로 바깥 좀비 1~2마리 — 발끝 고정, 상체만 좌우로 기우뚱
  const OZ = 'assets/images/outside/zombie01.png';
  const gateZombies = `
    <img class="vh-gzombie" src="${OZ}" alt="" style="left:27%; top:69%; height:9.8%" onerror="this.remove()">
    <img class="vh-gzombie flip" src="${OZ}" alt="" style="left:53%; top:70%; height:8.4%; animation-duration:3.8s; animation-delay:-1.3s" onerror="this.remove()">`;
  // (식수 회수통은 이제 water_idle.png 스프라이트로 가이드 위치에 배치 — 옛 풀캔버스 water.png는 사용 안 함)
  // 건물 스프라이트 — 각 시설을 자리에 배치(잘라낸 스프라이트, 발끝 하단중앙 기준).
  //  gate는 gate_idle_guide.png 측정값, 나머지는 ZONES 박스. 파일 없으면 자동 생략.
  const BLD = 'assets/images/buildings/';
  // 건물 스프라이트 — 위치는 각 시설 ZONES 박스에서 산출(가이드 측정값이 박스에 반영됨 → 클릭영역과 동일).
  //  발끝(하단중앙) 기준 배치. 파일 없으면 onerror로 자동 생략.
  const buildings = ZONES.map(zn => {  // water_idle.png 포함(가이드 박스 위치). 파일 없으면 onerror로 생략
    const cx = zn.box[0] + zn.box[2] / 2, by = zn.box[1] + zn.box[3], h = zn.box[3];
    return `<img class="vh-bldg" src="${BLD}${zn.z}_idle.png" alt="" style="left:${cx}%;top:${by}%;height:${h}%" onerror="this.remove()">`;
  }).join('') +
    `<img class="vh-bldg" src="${BLD}fire_idle.png" alt="" style="left:53%;top:60%;height:5%" onerror="this.remove()">`;
  return `<div class="vh-stagebox">
    <img class="vh-layer vh-px vh-px-sky"    src="${A}bg_sky.png"    alt="" onerror="this.remove()">
    <img class="vh-layer vh-px vh-px-ground" src="${A}bg_ground.png" alt="" onerror="this.remove()">
    ${buildings}
    ${fire}
    ${people}
    ${pips}
    <img class="vh-layer vh-px vh-px-front" src="${A}bg_block.png" alt="" onerror="this.remove()">
    ${gateZombies}
    ${hots}
    ${phots}
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  인물 피규어
// ═══════════════════════════════════════════════════════
function fig(c, def, st) {
  if (!st) return '';
  const x = st.x, y = st.y;
  const sel = LR.village.picked && LR.village.selected === c.id;
  const col = def.color;
  const skin = '#d8b48f';

  if (!c.alive) {
    // 사망 — 작은 추모 촛불 + 흐린 이름
    return `<g class="vh-fig gone" data-char="${c.id}" transform="translate(${x},${y})">
      <ellipse cx="0" cy="0" rx="13" ry="3.5" fill="#0006"/>
      <rect x="-3" y="-22" width="6" height="20" rx="2" fill="#5a5446"/>
      <ellipse cx="0" cy="-26" rx="3.5" ry="6" fill="#ffd27a"><animate attributeName="ry" values="6;7.5;6" dur="1.4s" repeatCount="indefinite"/></ellipse>
      <text x="0" y="16" class="vh-nm dim" text-anchor="middle">${c.name}</text>
    </g>`;
  }

  const pose = posed(c, st.pose);
  let shadow, inner;
  if (pose === 'lie') {
    shadow = `<ellipse cx="0" cy="-2" rx="15" ry="4" fill="#0007"/>`;
    inner = `<rect x="-22" y="-16" width="44" height="13" rx="6" fill="${col}" stroke="#0004"/>
      <rect x="-22" y="-16" width="14" height="13" rx="6" fill="${shade(col,1.2)}"/>
      <circle cx="20" cy="-12" r="7.5" fill="${skin}"/>
      <path d="M13 -16 a7.5 7.5 0 0 1 13 0" fill="#3a322a"/>
      <path d="M16 -11 q1.5 1.5 3 0" stroke="#2a221c" stroke-width="0.9" fill="none"/>
      <text x="-26" y="-22" class="vh-zzz">z</text>`;
  } else if (pose === 'sit') {
    shadow = `<ellipse cx="0" cy="0" rx="14" ry="3.5" fill="#0007"/>`;
    inner = `<path d="M-13 0 Q-15 -20 0 -22 Q15 -20 13 0 Z" fill="${col}" stroke="#0004"/>
      <path d="M-13 0 Q-14 -14 -4 -20 L-2 0 Z" fill="${shade(col,1.15)}"/>
      <circle cx="0" cy="-30" r="9" fill="${skin}"/>
      <path d="M-9 -32 a9 9 0 0 1 18 0 q-9 -6 -18 0" fill="#3a322a"/>
      <circle cx="-3" cy="-28" r="1.1" fill="#2a221c"/><circle cx="3" cy="-28" r="1.1" fill="#2a221c"/>`;
  } else {
    // stand / work / watch
    const armR = pose === 'work' ? `<rect x="6" y="-44" width="5" height="16" rx="2.5" fill="${shade(col,0.8)}" transform="rotate(-42 8 -44)"/>`
                : pose === 'watch' ? `<rect x="7" y="-58" width="4" height="34" rx="2" fill="#6a5d44"/><rect x="6" y="-44" width="5" height="18" rx="2.5" fill="${shade(col,0.8)}"/>`
                : `<rect x="7" y="-42" width="5" height="18" rx="2.5" fill="${shade(col,0.8)}"/>`;
    shadow = `<ellipse cx="0" cy="0" rx="13" ry="3.5" fill="#0007"/>`;
    inner = `<rect x="-6" y="-24" width="5" height="24" rx="2" fill="#2c2620"/>
      <rect x="1" y="-24" width="5" height="24" rx="2" fill="#2c2620"/>
      <path d="M-11 -24 Q-13 -50 0 -52 Q13 -50 11 -24 Z" fill="${col}" stroke="#0004"/>
      <path d="M-11 -24 Q-12 -46 -3 -50 L-1 -24 Z" fill="${shade(col,1.15)}"/>
      <rect x="-12" y="-42" width="5" height="18" rx="2.5" fill="${shade(col,0.8)}"/>
      ${armR}
      <circle cx="0" cy="-60" r="9.5" fill="${skin}"/>
      <path d="M-9.5 -62 a9.5 9.5 0 0 1 19 0 q-9.5 -7 -19 0" fill="#3a322a"/>
      <circle cx="-3.2" cy="-58" r="1.2" fill="#2a221c"/><circle cx="3.2" cy="-58" r="1.2" fill="#2a221c"/>`;
  }
  // 서있는/작업하는 인물만 까딱까딱 (그림자는 지면 고정)
  const breathes = (pose === 'stand' || pose === 'work' || pose === 'watch');
  const body = breathes
    ? `${shadow}<g class="vh-bob" style="animation-delay:-${(hashId(c.id) % 13) / 10}s">${inner}</g>`
    : `${shadow}${inner}`;

  const tagY = pose === 'lie' ? -34 : pose === 'sit' ? -44 : -76;
  const ring = sel ? `<ellipse cx="0" cy="-2" rx="26" ry="9" fill="none" stroke="#ffcf86" stroke-width="2" opacity="0.9"/>` : '';
  return `<g class="vh-fig${sel ? ' sel' : ''}" data-char="${c.id}" transform="translate(${x},${y})">
    ${ring}${body}
    <g transform="translate(0,${tagY})">
      <rect x="-26" y="-13" width="52" height="13" rx="6" fill="#0b0c0fcc"/>
      <text x="0" y="-3" class="vh-nm" text-anchor="middle">${c.name}</text>
      <rect x="-22" y="2" width="44" height="3" rx="1.5" fill="#000a"/>
      <rect x="-22" y="2" width="${(44 * c.health / 100).toFixed(1)}" height="3" rx="1.5" fill="${hpColor(c.health)}"/>
      <rect x="-22" y="6" width="44" height="3" rx="1.5" fill="#000a"/>
      <rect x="-22" y="6" width="${(44 * c.morale / 100).toFixed(1)}" height="3" rx="1.5" fill="#6e8fb0"/>
    </g>
  </g>`;
}

// 작은 흉상 (디테일 패널용)
// 포트레이트: 실사 PNG가 있으면 그 위에 덮고, 없으면(onerror) 절차적 SVG로 폴백.
// assets/images/portraits/<id>.png 만 떨어뜨리면 자동 적용.
function portraitInner(id, c, def) {
  return `${portraitSvg(c, def)}<img class="vh-port-img" src="assets/images/portraits/${id}.png" alt="" onerror="this.remove()">`;
}
function portraitSvg(c, def) {
  const skin = '#d8b48f', col = def.color;
  return `<svg viewBox="-30 -64 60 64">
    <path d="M-22 0 Q-24 -34 0 -38 Q24 -34 22 0 Z" fill="${col}"/>
    <path d="M-22 0 Q-23 -28 -6 -36 L-2 0 Z" fill="${shade(col,1.15)}"/>
    <circle cx="0" cy="-44" r="14" fill="${skin}"/>
    <path d="M-14 -48 a14 14 0 0 1 28 0 q-14 -9 -28 0" fill="#3a322a"/>
    <circle cx="-5" cy="-44" r="1.4" fill="#2a221c"/><circle cx="5" cy="-44" r="1.4" fill="#2a221c"/>
  </svg>`;
}

// ═══════════════════════════════════════════════════════
//  설비/배경 프리미티브
// ═══════════════════════════════════════════════════════
function floorSlab(x, y) {
  return `<rect x="${x}" y="${y - 6}" width="860" height="8" rx="2" fill="#3a382e"/>
          <rect x="${x}" y="${y}" width="860" height="3" fill="#15140f"/>`;
}
function roomLabel(x, y, t) {
  return `<text x="${x}" y="${y}" class="vh-zt">${t}</text>`;
}
function cot(x, y) {
  return `<g>
    <rect x="${x - 26}" y="${y - 12}" width="58" height="12" rx="4" fill="#46402f"/>
    <rect x="${x - 26}" y="${y - 18}" width="20" height="8" rx="4" fill="#6a6048"/>
    <rect x="${x - 26}" y="${y}" width="4" height="8" fill="#2c281d"/>
    <rect x="${x + 28}" y="${y}" width="4" height="8" fill="#2c281d"/>
  </g>`;
}
function stove(x, y) {
  return `<g>
    <rect x="${x - 22}" y="${y - 26}" width="44" height="26" rx="4" fill="#33312a" stroke="#1c1b16"/>
    <ellipse cx="${x}" cy="${y - 26}" rx="16" ry="5" fill="#5a5340"/>
    <ellipse cx="${x}" cy="${y - 28}" rx="11" ry="3.5" fill="#caa05a"/>
    ${smoke(x, y - 30)}
    <rect x="${x - 12}" y="${y - 14}" width="24" height="10" rx="2" fill="#ff8a3c" opacity="0.85"><animate attributeName="opacity" values="0.6;0.95;0.6" dur="1.3s" repeatCount="indefinite"/></rect>
  </g>`;
}
function smoke(x, y) {
  return `<g class="vh-steam" opacity="0.5">
    <path d="M${x - 5} ${y} q-6 -14 2 -26 q8 -12 1 -26" fill="none" stroke="#cfc7b4" stroke-width="3" stroke-linecap="round">
      <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2.6s" repeatCount="indefinite"/></path>
    <path d="M${x + 6} ${y} q6 -12 -1 -24 q-6 -12 2 -24" fill="none" stroke="#cfc7b4" stroke-width="2.5" stroke-linecap="round">
      <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3.1s" repeatCount="indefinite"/></path>
  </g>`;
}
function campfire(x, y) {
  return `<g>
    <ellipse cx="${x}" cy="${y}" rx="34" ry="10" fill="#ffae54" opacity="0.18"/>
    <rect x="${x - 18}" y="${y - 2}" width="36" height="5" rx="2" fill="#4a3a26" transform="rotate(12 ${x} ${y})"/>
    <rect x="${x - 18}" y="${y - 2}" width="36" height="5" rx="2" fill="#3c2f1e" transform="rotate(-14 ${x} ${y})"/>
    <path d="M${x} ${y - 4} q-10 -14 0 -28 q10 14 0 28" fill="#ff7a2e"><animate attributeName="d" values="M${x} ${y - 4} q-10 -14 0 -28 q10 14 0 28;M${x} ${y - 4} q-12 -16 0 -32 q12 16 0 32;M${x} ${y - 4} q-10 -14 0 -28 q10 14 0 28" dur="0.9s" repeatCount="indefinite"/></path>
    <path d="M${x} ${y - 6} q-5 -8 0 -16 q5 8 0 16" fill="#ffd166"><animate attributeName="opacity" values="0.7;1;0.7" dur="0.7s" repeatCount="indefinite"/></path>
  </g>`;
}
function workbench(x, y) {
  return `<g>
    <rect x="${x - 28}" y="${y - 16}" width="60" height="9" rx="2" fill="#5a4d35"/>
    <rect x="${x - 24}" y="${y - 7}" width="5" height="10" fill="#3c331f"/>
    <rect x="${x + 22}" y="${y - 7}" width="5" height="10" fill="#3c331f"/>
    <rect x="${x - 16}" y="${y - 22}" width="14" height="6" rx="1" fill="#7a6a44"/>
    <circle cx="${x + 14}" cy="${y - 20}" r="4" fill="#8a8470"/>
  </g>`;
}
function radioSet(x, y, s) {
  const live = s && s.beacon && s.beacon.type === 'comm';
  const waves = live
    ? `<g stroke="#9be0ff" fill="none" stroke-width="2" stroke-linecap="round">
        <path d="M${x + 8} ${y - 34} q8 -8 16 0"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" repeatCount="indefinite"/></path>
        <path d="M${x + 4} ${y - 38} q12 -12 24 0"><animate attributeName="opacity" values="0.1;0.7;0.1" dur="1.6s" begin="0.3s" repeatCount="indefinite"/></path>
       </g>`
    : '';
  return `<g>
    <rect x="${x - 20}" y="${y - 18}" width="44" height="18" rx="3" fill="#2d3b3a" stroke="#16201f"/>
    <circle cx="${x - 10}" cy="${y - 9}" r="3.5" fill="#1b2423"/>
    <rect x="${x - 2}" y="${y - 13}" width="20" height="8" rx="1" fill="#0f1413"/>
    <line x1="${x + 16}" y1="${y - 18}" x2="${x + 22}" y2="${y - 40}" stroke="#7a7050" stroke-width="2"/>
    ${waves}
  </g>`;
}
function infirmary(x, y) {
  return `<g>
    <rect x="${x - 26}" y="${y - 12}" width="58" height="12" rx="4" fill="#46402f"/>
    <rect x="${x - 26}" y="${y - 18}" width="58" height="7" rx="3" fill="#8a8474"/>
    <rect x="${x + 18}" y="${y - 40}" width="14" height="14" rx="2" fill="#2a2a2e"/>
    <rect x="${x + 22}" y="${y - 38}" width="6" height="2.5" fill="#c25656"/>
    <rect x="${x + 23.5}" y="${y - 39.5}" width="2.5" height="6" fill="#c25656"/>
  </g>`;
}
function gardenRows(x, y, n) {
  n = n || 5;
  let r = '';
  for (let i = 0; i < n; i++) {
    const px = x + i * 26;
    r += `<rect x="${px}" y="${y - 4}" width="18" height="6" rx="2" fill="#3a3322"/>
          <path d="M${px + 9} ${y - 4} l-3 -9 M${px + 9} ${y - 4} l3 -9 M${px + 9} ${y - 4} l0 -11" stroke="#6f8e5a" stroke-width="2" stroke-linecap="round"/>`;
  }
  return `<g>${r}</g>`;
}
function gate(x, y) {
  return `<g>
    <rect x="${x - 6}" y="${y - 46}" width="12" height="46" fill="#3a352a"/>
    <rect x="${x - 6}" y="${y - 46}" width="60" height="46" fill="none" stroke="#4a4030" stroke-width="3"/>
    <line x1="${x - 6}" y1="${y - 30}" x2="${x + 54}" y2="${y - 30}" stroke="#4a4030" stroke-width="3"/>
    <line x1="${x - 6}" y1="${y - 46}" x2="${x + 54}" y2="${y}" stroke="#332e24" stroke-width="2"/>
  </g>`;
}
function watchtower(x, y) {
  return `<g>
    <line x1="${x - 28}" y1="${y + 70}" x2="${x - 16}" y2="${y}" stroke="#3a352a" stroke-width="6"/>
    <line x1="${x + 28}" y1="${y + 70}" x2="${x + 16}" y2="${y}" stroke="#3a352a" stroke-width="6"/>
    <line x1="${x - 24}" y1="${y + 36}" x2="${x + 24}" y2="${y + 36}" stroke="#332e24" stroke-width="4"/>
    <rect x="${x - 24}" y="${y - 10}" width="48" height="12" rx="2" fill="#46402f"/>
    <path d="M${x - 30} ${y - 10} L${x} ${y - 30} L${x + 30} ${y - 10} Z" fill="#3a352a"/>
    <text x="${x}" y="${y + 60}" class="vh-zt" text-anchor="middle">망루</text>
  </g>`;
}
function plot(x, y, w, h, label) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#211f19" stroke="#3a372c" stroke-width="2" stroke-dasharray="3 5" opacity="0.92"/>
    <text x="${x + 10}" y="${y + 20}" class="vh-zt">${label}</text>
  </g>`;
}
function wallTeeth() {
  let r = '';
  for (let i = 0; i < 14; i++) { r += `<rect x="${60 + i * 64}" y="52" width="34" height="14" rx="2" fill="#3c3a30"/>`; }
  return `<g opacity="0.8">${r}</g>`;
}
function ruinSkyline(x, y, ph) {
  // 폐허 도시 실루엣 (배경)
  let b = '';
  const seed = [60, 30, 90, 45, 110, 25, 70, 50, 95, 35, 80, 40, 120, 28, 65];
  let px = -10;
  for (let i = 0; i < seed.length; i++) {
    const w = 50 + (i % 4) * 16;
    const h = seed[i];
    b += `<rect x="${px}" y="${y - h}" width="${w}" height="${h + 8}" fill="${ph.ruin}"/>`;
    px += w + 8;
  }
  return `<g opacity="0.8">${b}</g>`;
}

// ═══════════════════════════════════════════════════════
//  유틸
// ═══════════════════════════════════════════════════════
function activityOf(c) {
  if (!c.alive) return '— 떠났다 —';
  if (c.health < 20) return '의식이 흐릿하다';
  if (c.morale < 25) return '말없이 웅크려 있다';
  return ACT[c.id] || '하루를 버틴다';
}
function posed(c, base) {
  if (c.health < 20) return 'lie';
  if (c.morale < 25 && base !== 'lie') return 'sit';
  return base;
}
function hpColor(h) {
  if (h >= 80) return '#6b9e63';
  if (h >= 50) return '#c9a24a';
  if (h >= 20) return '#cc7a3a';
  return '#c25656';
}
function moColor(m) {
  if (m >= 80) return '#6b9e63';
  if (m >= 50) return '#c9a24a';
  if (m >= 25) return '#cc7a3a';
  return '#c25656';
}
// 상태 아이콘 (한눈 인지용)
// 손그림 상태 아이콘 — 채움 대신 거친 스트로크 + #vhSketch 연필 흔들림(CSS)
const HPIC = '<svg viewBox="0 0 12 12" class="vh-ic-sketch"><path d="M6 10.3C2.4 7.9 1.1 6.1 1.1 4.3 1.1 3 2.1 2.1 3.3 2.1c1 0 1.9.6 2.7 1.8C6.7 2.7 7.6 2.1 8.6 2.1c1.3 0 2.3.9 2.3 2.2 0 1.8-1.3 3.6-4.9 6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const MOIC = '<svg viewBox="0 0 12 12" class="vh-ic-sketch"><path d="M6 1.2l1.5 3.1 3.4.4-2.6 2.2.8 3.3L6 8.4 2.9 10.2l.8-3.3L1.1 4.7l3.4-.4z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>';
function shade(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r * mul)); g = Math.min(255, Math.round(g * mul)); b = Math.min(255, Math.round(b * mul));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function dayPhase(s) {
  // 계절로 분위기(하늘/지면 톤) 결정 — 데이터 연동
  const map = {
    spring_late: { cls: 'dawn',  label: '이른 아침 · 06:40', sky0: '#3a3550', sky1: '#7a5a44', gnd0: '#2a2a24', gnd1: '#1d1d18', ruin: '#241f2e' },
    rainy:       { cls: 'rain',  label: '흐린 낮 · 13:10',  sky0: '#33363c', sky1: '#454a50', gnd0: '#262a2c', gnd1: '#1a1d1f', ruin: '#2a2e33' },
    summer_heat: { cls: 'noon',  label: '한낮 · 12:30',     sky0: '#5a6678', sky1: '#b08a52', gnd0: '#33302550', gnd1: '#26241c', ruin: '#3a3322' },
    autumn:      { cls: 'dusk',  label: '해질녘 · 18:20',   sky0: '#3a2f44', sky1: '#9a5a2e', gnd0: '#2e2820', gnd1: '#201c16', ruin: '#2c2230' },
    winter:      { cls: 'night', label: '늦은 밤 · 22:40',  sky0: '#1c2230', sky1: '#2a3346', gnd0: '#20242c', gnd1: '#15171c', ruin: '#1b2230' }
  };
  // 날씨 오버라이드 — 비 오는 날(스크립트 D4~5 포함)은 흐린 톤. '소강(overcast)'도 흐린 톤이되 비는 안 내림(syncWeather가 끔).
  const w = LR.weatherOn ? LR.weatherOn(s) : null;
  if (w === 'rain' || (w === 'overcast' && s.season === 'rainy')) {
    return Object.assign({}, map.rainy, w === 'overcast' ? { label: '비 갠 오후 · 15:30' } : null);
  }
  return map[s.season] || map.spring_late;
}

// 비 이펙트 ↔ 날씨 동기화 — 실제로 비 오는 날에만 빗줄기 캔버스를 켠다.
//  (이전: 모든 계절에 옅은 비가 상시 렌더 → "비 그쳤다는데 비가 온다" 문제)
LR.village.syncWeather = function() {
  const canvas = document.getElementById('vhRain');
  if (!canvas) return;
  const s = LR.village.state;
  const raining = !!(s && LR.weatherOn && LR.weatherOn(s) === 'rain');
  canvas.style.display = raining ? 'block' : 'none';
  if (raining && LR.village._rainResize) LR.village._rainResize();   // 밀도 재계산
};

// 자원 메타 — 고유 색 + 또렷한 실루엣 (색/형태만으로 즉시 구분)
const RES = {
  food:   { color: '#e0b24a', icon: '<svg viewBox="0 0 16 16"><path d="M2.4 8h11.2a5.6 5.6 0 0 1-11.2 0z" fill="currentColor"/><path d="M3.6 8a4.4 2.8 0 0 1 8.8 0z" fill="currentColor" opacity=".5"/><rect x="7.2" y="1.6" width="1.6" height="4" rx=".8" fill="currentColor"/></svg>' },
  water:  { color: '#5ab0e0', icon: '<svg viewBox="0 0 16 16"><path d="M8 1.4c3.3 4.3 4.5 6.6 4.5 8.6a4.5 4.5 0 0 1-9 0c0-2 1.2-4.3 4.5-8.6z" fill="currentColor"/></svg>' },
  fuel:   { color: '#e0823a', icon: '<svg viewBox="0 0 16 16"><rect x="3.3" y="5" width="8" height="9" rx="1" fill="currentColor"/><path d="M11.3 7l2.2 1.1v3.8L11.3 13z" fill="currentColor"/><rect x="5.4" y="2.4" width="4" height="2.6" rx="1" fill="currentColor"/></svg>' },
  med:    { color: '#e05a5a', icon: '<svg viewBox="0 0 16 16"><rect x="2.4" y="4.4" width="11.2" height="8.2" rx="1.6" fill="currentColor"/><rect x="7" y="6" width="2" height="5" fill="#15140d"/><rect x="5.5" y="7.5" width="5" height="2" fill="#15140d"/></svg>' },
  noise:  { color: '#b08ae0', icon: '<svg viewBox="0 0 16 16"><path d="M2.5 6h2.5l3-2.3v8.6L5 10H2.5z" fill="currentColor"/><path d="M9.6 5a4 4 0 0 1 0 6M11.6 3a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>' },
  people: { color: '#74c074', icon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="4.8" r="2.9" fill="currentColor"/><path d="M2.7 13.6c0-3.3 2.6-4.9 5.3-4.9s5.3 1.6 5.3 4.9z" fill="currentColor"/></svg>' },
  morale: { color: '#e0a64a', icon: '<svg viewBox="0 0 16 16"><path d="M8 1.6l1.9 4 4.3.5-3.2 2.9 1 4.3L8 11l-4 2.2 1-4.3L1.8 6.1l4.3-.5z" fill="currentColor"/></svg>' }
};

// ═══════════════════════════════════════════════════════
//  데모 상태 (타이틀에서 게임 없이 열었을 때)
// ═══════════════════════════════════════════════════════
LR.village.makeDemoState = function() {
  const s = LR.createInitialState();
  s.day = 6;
  s.season = LR.seasonOnDay(6);
  s.food = 57; s.water = 48; s.fuel = 22; s.medicine = 2; s.noiseToday = 8;
  // 사기/체력에 약간의 변주를 줘 바가 단조롭지 않게
  const tweak = { jaehyeok:[90,70], sujin:[85,65], yeongsu:[48,50], eunseo:[88,75], jeonghun:[80,60],
                  miyeon:[80,62], dongho:[90,48], hayeong:[85,70], jonghyeok:[60,55], minsu:[90,82] };
  for (const id in tweak) { s.characters[id].health = tweak[id][0]; s.characters[id].morale = tweak[id][1]; s.characters[id].status = LR.healthTier(tweak[id][0]).tier; }
  s.precedents = [{ id: 'P-N1', type: 'neg', name: '쓸모없으면 버린다', label: '간병 포기', bornDay: 1, targets: ['jonghyeok'] }];
  s.counters.negPrecedents = 1;
  s.beacon.type = 'comm'; s.beacon.phase = 'develop'; s.beacon.weekStartDay = 1;
  s.smallWins.SW3.lastFired = 4;
  s.TI = LR.computeTI(s);
  return s;
};

// ═══════════════════════════════════════════════════════
//  DOM 주입 + 버튼 와이어링
// ═══════════════════════════════════════════════════════
function ensureDom() {
  if (document.getElementById('villageScreen')) return;
  const el = document.createElement('div');
  el.id = 'villageScreen';
  el.innerHTML = `
    <svg class="vh-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
      <filter id="vhSketch" x="-35%" y="-35%" width="170%" height="170%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs></svg>
    <header class="vh-top">
      <div class="vh-top-day">
        <span id="vhDay">Day 1</span>
        <span class="vh-sub"><b id="vhSeason">봄 후반</b> · <i id="vhClock">아침</i></span>
      </div>
      <div class="vh-res" id="vhResources"></div>
      <div class="vh-top-acoustic" title="음향 감지 — 소음 실시간 파형">
        <span class="vh-ta-lab">음향<i>ACOUSTIC</i></span>
        <canvas id="vhScopeCanvas" class="vh-scope vh-scope-top"></canvas>
        <span class="vh-scope-read">
          <span class="vh-scope-dot" id="vhScopeDot"></span>
          소음 <b id="vhScopeVal">0</b> · <span id="vhScopeState">—</span>
        </span>
      </div>
      <div class="vh-tending" id="vhTending"></div>
      <div class="vh-cam">
        <button class="vh-cam-btn" id="vhSound" title="환경음 켜기/끄기">🔊</button>
        <button class="vh-cam-btn vh-info-toggle" id="vhPanelToggle" title="생존자 명단 · 시스템 정보 펼치기">정보</button>
        <button class="vh-cam-x" id="vhClose">닫기 ✕</button>
      </div>
    </header>

    <div class="vh-alert calm" id="vhAlert"></div>

    <div class="vh-grid">
      <aside class="vh-left">
        <div class="vh-left-h">생존자 명단</div>
        <div class="vh-roster" id="vhRoster"></div>
      </aside>

      <main class="vh-center">
        <div class="vh-stage">
          <div class="vh-scene compound" id="vhScene"></div>
          <div class="vh-fx" id="vhFx">
              <div class="vh-fx-embers" id="vhEmbers"></div>
            <div class="vh-fx-fog"></div>
            <div class="vh-fx-waves" id="vhWaves"></div>
            <canvas class="vh-fx-rain" id="vhRain"></canvas>
          </div>
          <div class="vh-paper"></div>
          <div class="vh-dim" id="vhDim"></div>
          <div class="vh-pop" id="vhPop"></div>
          <div class="vh-pop vh-zinfo" id="vhZinfo"></div>
          <div class="vh-outside" id="vhOutside"></div>
          <div class="vh-dossier" id="vhDossier"></div>
          <div class="vh-pop vh-zinfo vh-logwin" id="vhLogWin"></div>
          <div class="vh-decision" id="vhDecision"></div>
        </div>
        <div class="vh-actbar">
          <button class="vh-act vh-act-main" id="vhActDecide" title="오늘의 결정">⚑ 오늘의 결정</button>
          <button class="vh-act" title="텍스트 상세 화면" id="vhActDetail">📋 상세</button>
          <button class="vh-act" title="지난 기록" id="vhActLog">📓 기록</button>
          <span class="vh-hint" id="vhHint">인물을 클릭하면 상태를 볼 수 있어요</span>
        </div>
      </main>

      <aside class="vh-right">
        <div id="vhSystems"></div>
      </aside>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelectorAll('.vh-cam-btn[data-mode]').forEach(b => {
    b.addEventListener('click', () => LR.village.setMode(b.dataset.mode));
  });
  document.getElementById('vhClose').addEventListener('click', () => LR.village.close());

  // 환경음 토글 — 🔊/🔇
  const snd = document.getElementById('vhSound');
  if (snd) {
    if (LR.ambience && !LR.ambience.enabled) snd.textContent = '🔇';
    snd.addEventListener('click', () => {
      if (!LR.ambience) return;
      snd.textContent = LR.ambience.toggle() ? '🔊' : '🔇';
    });
  }

  // 통합 딤(일시정지) — 창이 열리면 씬을 반투명 검은색으로 가리고 패럴렉스 정지.
  //  딤 클릭 → 정보 창(건물·기록·망루) 닫기. (오늘의 결정은 진행 필요 → 닫지 않음)
  const dim = document.getElementById('vhDim');
  if (dim) dim.addEventListener('click', () => {
    LR.village.closeZoneInfo();
    LR.village.closeLog();
    const out = document.getElementById('vhOutside');
    if (out) out.classList.remove('open');
    LR.village._syncPause();
  });
  // 창 열림/닫힘을 감지해 일시정지(딤) 상태 동기화
  const watchIds = ['vhDecision', 'vhZinfo', 'vhLogWin', 'vhOutside'];
  const mo = new MutationObserver(() => LR.village._syncPause());
  watchIds.forEach(id => { const t = document.getElementById(id); if (t) mo.observe(t, { attributes: true, attributeFilter: ['class'] }); });

  // 정보 토글 — 평소엔 풍경만, 누르면 좌(명단)·우(시스템) 패널 슬라이드 노출
  const pt = document.getElementById('vhPanelToggle');
  if (pt) pt.addEventListener('click', () => {
    const open = document.getElementById('villageScreen').classList.toggle('panels-open');
    pt.classList.toggle('active', open);
  });

  // 액션바 — 오늘의 결정 토글 / 텍스트 상세 / 기록
  const ad = document.getElementById('vhActDecide');
  if (ad) ad.addEventListener('click', () => LR.village.toggleDecision());
  const adt = document.getElementById('vhActDetail');
  if (adt) adt.addEventListener('click', () => {
    // 텍스트 대시보드(상세)로 — 마을은 닫고 뒤의 #gameRoot 노출
    if (LR.state && LR.render && LR.render.renderAll) LR.render.renderAll(LR.state);
    LR.village.close();
  });
  const al = document.getElementById('vhActLog');
  if (al) al.addEventListener('click', () => LR.village.showLog());
}

// 일시정지/딤 동기화
//  · 패럴렉스+씬 애니메이션 정지(paused): 어떤 창이든(결정 포함) 열리면 — 시간 멈춤
//  · 전체 검은 딤: 중앙 정보 창(건물·기록·망루)에만. 결정창은 자체 하단 그라데이션이 대신
LR.village._syncPause = function() {
  const scr = document.getElementById('villageScreen');
  if (!scr) return;
  const isOpen = id => { const e = document.getElementById(id); return e && e.classList.contains('open'); };
  const modalOpen = isOpen('vhZinfo') || isOpen('vhLogWin') || isOpen('vhOutside');
  const anyOpen = modalOpen || isOpen('vhDecision');
  scr.classList.toggle('paused', anyOpen);
  if (anyOpen) { scr.style.setProperty('--px', '0'); scr.style.setProperty('--py', '0'); }  // 패럴렉스 중앙 고정
  const dim = document.getElementById('vhDim');
  if (dim) dim.classList.toggle('open', modalOpen);
};

document.addEventListener('DOMContentLoaded', () => {
  // 게임 내 상단 버튼 (타이틀의 마을 전경 진입 버튼은 제거됨)
  const btnG = document.getElementById('btnVillageView');
  if (btnG) btnG.addEventListener('click', () => LR.village.open(LR.state));
});
