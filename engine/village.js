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
  { z:'kitchen',    label:'요리시설',    box:[42.0, 43.0, 15.0, 12.0], o:[50.0, 52.0] },
  { z:'field',      label:'밭',          box:[17.0, 44.0, 30.0, 17.0], o:[32.0, 55.0] },
  { z:'barracks',   label:'숙소',        box:[63.0, 29.0, 22.0, 17.0], o:[74.0, 40.0] },
  { z:'workshop',   label:'작업장 · 통신', box:[77.0, 53.0, 19.0, 16.0], o:[86.0, 63.0] },
  { z:'storage',    label:'정문 · 울타리', box:[24.0, 64.0, 16.0, 14.0], o:[32.0, 73.0] },
  { z:'infirmary',  label:'의무실',      box:[82.0, 39.0, 16.0, 18.0], o:[90.0, 51.0] },
  { z:'watchtower', label:'망루',        box:[49.0, 21.0, 15.0, 24.0], o:[57.0, 35.0] },
  { z:'gate',       label:'보강문',      box:[37.0, 56.0, 24.0, 15.0], o:[49.0, 67.0] },
  { z:'water',      label:'물 · 빗물받이', box:[2.0, 62.0, 13.0, 16.0], o:[8.0, 72.0] }
];
// 인물 스프라이트 — 전원 풀캔버스(2896×2172) 제자리. 0,0에 그대로 겹침(작가가 맞춘 위치/크기 유지).
//  (개별 크롭으로 줄 경우엔 inplace 빼고 cx/cy + h|w(%)로 배치 가능)
//  box=[l,t,w,h]% 형상 영역(호버 핫스팟), ox/oy=확대 기준점(형상 중심x·발끝y) — 인물 PNG 알파 bbox에서 산출
// box/ox/oy는 각 인물 PNG(3577×2419)의 알파 bbox에서 산출 — 새 배경(bg_ground)에 맞춰 재배치됨
const PEOPLE_FILES = [
  { file:'jeonghun',       char:'jeonghun',  inplace:true, box:[48.6,41.4,3.2,8.6], ox:50.2, oy:50.0 },
  { file:'eunseo',         char:'eunseo',    inplace:true, box:[38.1,43.7,4.1,5.7], ox:40.2, oy:49.4 },
  { file:'sujin',          char:'sujin',     inplace:true, box:[68.3,50.9,2.5,8.6], ox:69.6, oy:59.5 },
  { file:'yeongsu',        char:'yeongsu',   inplace:true, box:[90.8,42.1,5.1,5.4], ox:93.3, oy:47.5 },
  { file:'miyeon',         char:'miyeon',    inplace:true, box:[52.9,49.2,2.8,7.3], ox:54.3, oy:56.6 },
  { file:'dongho',         char:'dongho',    inplace:true, box:[74.9,50.7,4.1,9.3], ox:76.9, oy:60.0 },
  { file:'jonghyeok',      char:'jonghyeok', inplace:true, box:[85.0,59.2,4.0,8.7], ox:87.0, oy:67.9 },
  { file:'hayeong',        char:'hayeong',   inplace:true, box:[60.2,30.0,1.9,7.6], ox:61.1, oy:37.6 },
  { file:'jaehyeok',       char:'jaehyeok',  inplace:true, box:[42.5,50.7,3.5,7.4], ox:44.3, oy:58.0 },
  { file:'minsu',          char:'minsu',     inplace:true, box:[45.4,54.9,2.6,4.9], ox:46.7, oy:59.8 }
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
  const stage = document.querySelector('.vh-stage');
  const host = document.getElementById('vhScene');
  if (!pop || !stage || !host || !pop.classList.contains('open')) return;
  const hot = host.querySelector('.vh-phot[data-pchar="' + LR.village.popChar + '"]');
  if (!hot) { pop.classList.remove('open'); return; }
  const sr = stage.getBoundingClientRect(), hr = hot.getBoundingClientRect();
  const cx = hr.left + hr.width / 2 - sr.left;       // 인물 중앙 x (스테이지 기준)
  const headTop = hr.top - sr.top;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.max(6, Math.min(sr.width - pw - 6, cx - pw / 2));
  let top = headTop - ph - 12, below = false;
  if (top < 4) { top = (hr.bottom - sr.top) + 12; below = true; }   // 위 공간 부족 → 아래로
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
  pop.classList.toggle('below', below);
  pop.style.setProperty('--arrow', Math.round(cx - left) + 'px');   // 말풍선 꼬리 위치
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
        `<div class="vz-note">비축 상태 · <b style="color:${foodT.tier === 'famine' ? '#e07070' : foodT.tier === 'crisis' ? '#d4a14f' : '#cdd0a0'}">${foodT.label}</b> · ${seasonDef.name}엔 신선 식량이 <b style="color:${decayCol}">${decayVerb}</b>.</div>`
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
          `<div class="vz-note">${note}</div>`
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
    case 'storage': return {
      title: '정문 · 울타리', desc: '물자를 보관하고 울타리를 보강한다.', lead: lead('dongho'),
      html:
        vzGauge('식량', totalFood, totalFood / 100, '#e0b24a') +
        vzGauge('물', s.water, s.water / 100, '#5ab0e0') +
        vzGauge('연료', s.fuel, s.fuel / 100, '#e0823a') +
        vzStat('의약품', s.medicine, '#e05a5a')
    };
    case 'water': return {
      title: '물 · 빗물받이', desc: '빗물을 받아 식수를 모은다.', lead: null,
      html:
        vzGauge('식수', s.water, s.water / 100, '#5ab0e0') +
        `<div class="vz-grid2">` +
          vzStat('하루 소비', '−' + n, '#e8e2c4', n + '명') +
          vzStat('계절', seasonDef.name, s.season === 'rainy' ? '#5ab0e0' : '#cdd0a0', s.season === 'rainy' ? '보충 ↑' : '') +
        `</div>` +
        `<div class="vz-note">${s.season === 'rainy' ? '장맛비로 빗물받이가 넉넉히 찬다.' : s.water < 20 ? '물이 빠르게 줄고 있다. 아껴야 한다.' : '당장은 버틸 만하다.'}</div>`
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
  const back = document.getElementById('vhZback');
  const s = LR.village.state;
  if (!el || !s) return;
  if (z === 'watchtower' || z === 'gate') return;     // 망루·보강문은 외부 정찰 패널
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
    ${d.lead ? `<div class="vz-lead">담당 · ${d.lead}</div>` : ''}`;
  el.classList.add('open');
  if (back) back.classList.add('open');
  const x = document.getElementById('vhZinfoX');
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); LR.village.closeZoneInfo(); });
};

LR.village.positionZinfo = function() {
  // 큰 카드는 화면 중앙 고정(CSS) — 별도 위치 계산 불필요
};

LR.village.closeZoneInfo = function() {
  LR.village._zinfoZone = null;
  const el = document.getElementById('vhZinfo');
  if (el) el.classList.remove('open');
  const back = document.getElementById('vhZback');
  if (back) back.classList.remove('open');
};

// ─── 지난 기록 창 (모달) ───
LR.village.showLog = function() {
  const win = document.getElementById('vhLogWin');
  const back = document.getElementById('vhLogBack');
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
  if (back) back.classList.add('open');
  const x = document.getElementById('vhLogX');
  if (x) x.addEventListener('click', () => LR.village.closeLog());
};
LR.village.closeLog = function() {
  const win = document.getElementById('vhLogWin');
  if (win) win.classList.remove('open');
  const back = document.getElementById('vhLogBack');
  if (back) back.classList.remove('open');
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
      <img class="vh-out-bg" src="${OUT}outside_normal01.png" alt="">
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

LR.village.renderDecision = function() {
  const s = LR.village.state;
  const dec = document.getElementById('vhDecision');
  if (!dec || !s) return;
  const node = s.pendingChoice;
  if (LR.village.isDemo || !node || !s.awaitingChoice) {
    dec.classList.remove('open');
    LR.village.highlightChars = [];
    return;
  }

  // 본문 조각
  const bodyHtml = (node.body || []).map(part => {
    if (part.kind === 'narration') return `<p class="vd-narr">${part.text}</p>`;
    if (part.kind === 'dialog')   return `<p class="vd-dlg"><span class="vd-spk">${part.speaker}</span>${part.text}</p>`;
    if (part.kind === 'systemNote') return `<p class="vd-note">※ ${part.text}</p>`;
    return '';
  }).join('');

  // 어젯밤 습격 / 비컨 해소 결과 (텍스트 화면 대신 여기서 소비)
  let banners = '';
  if (s.raidLastNightSummary) banners += `<p class="vd-banner danger">🩸 ${s.raidLastNightSummary}</p>`;
  if (s.pendingBeaconResolution) {
    const r = s.pendingBeaconResolution;
    banners += `<p class="vd-banner beacon">📡 <b>${LR.BEACON_TYPES[r.type].name} ${r.label}</b> — ${r.text}</p>`;
    s.pendingBeaconResolution = null;
  }

  // 선택지 (render.js와 동일한 필터 규칙)
  const choicesHtml = (node.choices || []).map(choice => {
    if (choice.requireSpiral && s.spiral.state !== choice.requireSpiral) return '';
    if (choice.enabled === false) return '';
    const risk = choice.risk === 'danger' ? ' danger' : choice.risk === 'warn' ? ' warn' : '';
    const sub = choice.body ? `<span class="vd-csub">${choice.body}</span>` : '';
    return `<button class="vd-choice${risk}" data-cid="${choice.id}">
      <span class="vd-clet">${choice.id}</span>
      <span class="vd-cbody"><b>${choice.label}</b>${sub}</span>
    </button>`;
  }).join('');

  dec.innerHTML = `
    <div class="vd-head">
      <span class="vd-day">DAY ${s.day}</span>
      <h3 class="vd-title">${node.title || '오늘의 결정'}</h3>
      <button class="vd-min" id="vdMin" title="접기">▾</button>
    </div>
    <div class="vd-scroll">
      ${banners}
      <div class="vd-body">${bodyHtml}</div>
      ${node.keyLine ? `<p class="vd-key">${node.keyLine}</p>` : ''}
    </div>
    <div class="vd-choices">${choicesHtml}</div>
  `;
  dec.classList.toggle('open', !LR.village.decisionCollapsed);   // 접힘 상태 유지

  dec.querySelectorAll('.vd-choice').forEach(b => {
    b.addEventListener('click', () => {
      if (LR.village._busy) return;
      LR.village._busy = true;
      LR.engine.applyChoice(b.dataset.cid);
      // endOfDay → (350ms) → beginDay → syncFromGame 가 다음 결정을 그림
    });
  });
  const minb = document.getElementById('vdMin');
  if (minb) minb.addEventListener('click', () => LR.village.toggleDecision(false));

  // 관련 인물 하이라이트
  LR.village.highlightChars = decisionActors(node, s);
  applyDecisionHighlights();
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
};

// ═══════════════════════════════════════════════════════
//  렌더
// ═══════════════════════════════════════════════════════
LR.village.render = function() {
  const s = LR.village.state;
  if (!s) return;
  renderTopbar(s);
  renderRoster(s);
  renderSystems(s);
  updateScopeReadout(s);
  LR.village.renderScene();
  LR.village.renderDecision();
  LR.village.fillDossier();
};

function renderTopbar(s) {
  const seasonName = LR.SEASONS[s.season].name;
  const raid = LR.raidProbability(s.noiseToday);

  document.getElementById('vhDay').textContent = 'Day ' + s.day;
  document.getElementById('vhSeason').textContent = seasonName;
  document.getElementById('vhClock').textContent = dayPhase(s).label;
  const resEl = document.getElementById('vhResources');
  if (resEl) {
    // 상단엔 한눈에 위급도를 읽는 핵심 3개만(식량·생존자·위협). 나머지는 '정보' 토글 패널에서.
    const alive = LR.aliveChars(s).length;
    const foodT = LR.foodTier(s.food);
    const foodCls = foodT.tier === 'famine' ? 'danger' : foodT.tier === 'crisis' ? 'warn' : '';
    const peopleCls = alive < 10 ? 'warn' : '';
    const threatCls = raid.p >= 0.6 ? 'danger' : raid.p >= 0.25 ? 'warn' : 'dim';
    resEl.innerHTML =
      pill('food',   '식량',   s.food,        foodCls,   s.food / 100) +
      pill('people', '생존자', alive + '/10', peopleCls, alive / 10) +
      pill('noise',  '위협',   raid.scale,    threatCls);
  }

  // 위협 배너
  const banner = document.getElementById('vhAlert');
  if (raid.p >= 0.6) {
    banner.className = 'vh-alert danger';
    banner.textContent = '⚠ ' + raid.scale + ' — ' + raid.size + ' 접근 가능';
  } else if (raid.p >= 0.25) {
    banner.className = 'vh-alert warn';
    banner.textContent = raid.scale + ' — 소음을 줄이는 것이 좋다';
  } else {
    banner.className = 'vh-alert calm';
    banner.textContent = raid.scale + ' — 주변은 비교적 조용하다';
  }
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

  const swFired = ['SW1','SW2','SW3','SW4','SW5'].filter(id => s.smallWins[id].lastFired > 0).length;

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
      <div class="vh-line"><span>SW 발동</span><b>${swFired} / 5</b></div>
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
  v.textContent = n; v.style.color = col;
  document.getElementById('vhScopeState').textContent = LR.raidProbability(n).scale;
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

LR.village.bindParallax = function() {
  if (LR.village._plxBound) return;
  const stage = document.querySelector('.vh-stage');
  const screen = document.getElementById('villageScreen');
  if (!stage || !screen) return;
  LR.village._plxBound = true;
  let raf = 0, tx = 0, ty = 0;
  function apply() { raf = 0; screen.style.setProperty('--px', tx.toFixed(3)); screen.style.setProperty('--py', ty.toFixed(3)); }
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
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
  // 클릭 선택 (측면 SVG 피규어)
  host.querySelectorAll('[data-char]').forEach(g => {
    g.addEventListener('click', () => LR.village.select(g.dataset.char));
  });
  if (LR.village.mode === 'compound') {
    // 구역 호버 → 이름 라벨만 표시(빛무리 제거). 클릭 → 정보창(망루·보강문은 외부 정찰)
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

// 이미지 무대를 컨테이너에 가득 채움(cover) — 핀치줌처럼 넘치는 가장자리는 잘라냄
function fitStage() {
  const host = document.getElementById('vhScene');
  if (!host) return;
  const box = host.querySelector('.vh-stagebox');
  if (!box) return;
  const cw = host.clientWidth, ch = host.clientHeight, ar = 3577 / 2419;
  // cover: 너비를 채우되 높이가 모자라면 높이 기준으로 채움(가로 넘침은 좌우로 잘림)
  let w = cw, h = cw / ar;
  if (h < ch) { h = ch; w = ch * ar; }
  box.style.width = Math.round(w) + 'px';
  box.style.height = Math.round(h) + 'px';

  // 패닝 폭 = '실제로 잘린 양(오버행)'의 일부만(damp) — 멀미 안 나게 살짝씩만 움직임.
  //  평소엔 시선을 약간 아래로(biasY) 둬서 정문·땅이 보이고, 위로 올리면 하늘이 드러난다.
  const S = 1.12;                 // ※ styles-village.css .vh-stagebox scale(1.12)와 일치
  const damp = 0.4;               // 움직임 세기(0~1) — 작을수록 차분함
  const ohX = Math.max(0, (S * w - cw) / 2);
  const ohY = Math.max(0, (S * h - ch) / 2);
  const panX = ohX * damp;
  const panY = ohY * damp;
  const biasY = ohY * 0.42;       // 평소 살짝 아래(정문·땅) 보이게
  box.style.setProperty('--panx', panX.toFixed(1) + 'px');
  box.style.setProperty('--pany', panY.toFixed(1) + 'px');
  box.style.setProperty('--biasy', biasY.toFixed(1) + 'px');
  box.style.setProperty('--skx', (panX / S).toFixed(1) + 'px');   // 하늘 상쇄(부모 scale 보정)
  box.style.setProperty('--sky', (panY / S).toFixed(1) + 'px');

  // FX 레이어(비·안개·좀비·불씨)를 스테이지박스(이미지 영역)에 픽셀 정렬
  const fx = document.getElementById('vhFx');
  const stage = document.querySelector('.vh-stage');
  if (fx && stage) {
    const offX = (cw - w) / 2, offY = (ch - h) / 2;
    const hr = host.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    fx.style.left = Math.round((hr.left - sr.left) + offX) + 'px';
    fx.style.top = Math.round((hr.top - sr.top) + offY) + 'px';
    fx.style.width = Math.round(w) + 'px';
    fx.style.height = Math.round(h) + 'px';
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
      const off = (p.dx || p.dy) ? `transform:translate(${p.dx || 0}%,${p.dy || 0}%);` : '';
      return `<img class="vh-layer vh-actorfull${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="${origin}${off}${idle}${dead}" onerror="this.style.display='none'">`;
    }
    const size = (p.h != null) ? `height:${p.h}%` : `width:${p.w}%`;
    return `<img class="vh-actor${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="left:${p.cx}%;top:${p.cy}%;${size};${dead}" onerror="this.style.display='none'">`;
  }).join('');
  const hots = ZONES.map(zn =>
    `<button class="vh-hot" data-zone="${zn.z}" style="left:${zn.box[0]}%;top:${zn.box[1]}%;width:${zn.box[2]}%;height:${zn.box[3]}%"><span class="vh-hotlab">${zn.label}</span></button>`
  ).join('');
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
  // 식수 회수통(빗물받이) — water.png는 배경/인물과 같은 풀캔버스(3577×2419)라
  //  제자리에 그려져 있음 → 풀캔버스 레이어로 그대로 덮음. z2 = 인물(z5)·정문보다 뒤(키친 뒤쪽).
  const waterTank = `<img class="vh-layer vh-water" src="${A}water.png" alt="" onerror="this.remove()">`;
  return `<div class="vh-stagebox">
    <img class="vh-layer vh-px vh-px-sky"    src="${A}bg_sky.png"    alt="" onerror="this.remove()">
    <img class="vh-layer vh-px vh-px-ground" src="${A}bg_ground.png" alt="" onerror="this.remove()">
    ${waterTank}
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
  return map[s.season] || map.spring_late;
}

// 자원 메타 — 고유 색 + 또렷한 실루엣 (색/형태만으로 즉시 구분)
const RES = {
  food:   { color: '#e0b24a', icon: '<svg viewBox="0 0 16 16"><path d="M2.4 8h11.2a5.6 5.6 0 0 1-11.2 0z" fill="currentColor"/><path d="M3.6 8a4.4 2.8 0 0 1 8.8 0z" fill="currentColor" opacity=".5"/><rect x="7.2" y="1.6" width="1.6" height="4" rx=".8" fill="currentColor"/></svg>' },
  water:  { color: '#5ab0e0', icon: '<svg viewBox="0 0 16 16"><path d="M8 1.4c3.3 4.3 4.5 6.6 4.5 8.6a4.5 4.5 0 0 1-9 0c0-2 1.2-4.3 4.5-8.6z" fill="currentColor"/></svg>' },
  fuel:   { color: '#e0823a', icon: '<svg viewBox="0 0 16 16"><rect x="3.3" y="5" width="8" height="9" rx="1" fill="currentColor"/><path d="M11.3 7l2.2 1.1v3.8L11.3 13z" fill="currentColor"/><rect x="5.4" y="2.4" width="4" height="2.6" rx="1" fill="currentColor"/></svg>' },
  med:    { color: '#e05a5a', icon: '<svg viewBox="0 0 16 16"><rect x="2.4" y="4.4" width="11.2" height="8.2" rx="1.6" fill="currentColor"/><rect x="7" y="6" width="2" height="5" fill="#15140d"/><rect x="5.5" y="7.5" width="5" height="2" fill="#15140d"/></svg>' },
  noise:  { color: '#b08ae0', icon: '<svg viewBox="0 0 16 16"><path d="M2.5 6h2.5l3-2.3v8.6L5 10H2.5z" fill="currentColor"/><path d="M9.6 5a4 4 0 0 1 0 6M11.6 3a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>' },
  people: { color: '#74c074', icon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="4.8" r="2.9" fill="currentColor"/><path d="M2.7 13.6c0-3.3 2.6-4.9 5.3-4.9s5.3 1.6 5.3 4.9z" fill="currentColor"/></svg>' }
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
      <div class="vh-cam">
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
          <section class="vh-card vh-scope-card vh-scope-float">
            <h4>음향 감지 · ACOUSTIC</h4>
            <canvas id="vhScopeCanvas" class="vh-scope"></canvas>
            <div class="vh-scope-read">
              <span class="vh-scope-dot" id="vhScopeDot"></span>
              소음 <b id="vhScopeVal">0</b> · <span id="vhScopeState">—</span>
            </div>
          </section>
          <div class="vh-pop" id="vhPop"></div>
          <div class="vh-zback" id="vhZback"></div>
          <div class="vh-pop vh-zinfo" id="vhZinfo"></div>
          <div class="vh-outside" id="vhOutside"></div>
          <div class="vh-dossier" id="vhDossier"></div>
          <div class="vh-zback" id="vhLogBack"></div>
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

  // 건물 정보창 백드롭 클릭 → 닫기
  const zback = document.getElementById('vhZback');
  if (zback) zback.addEventListener('click', () => LR.village.closeZoneInfo());

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

  // 기록 창 백드롭 클릭 → 닫기
  const lback = document.getElementById('vhLogBack');
  if (lback) lback.addEventListener('click', () => LR.village.closeLog());
}

document.addEventListener('DOMContentLoaded', () => {
  // 타이틀 진입 버튼
  const btnT = document.getElementById('btnVillage');
  if (btnT) btnT.addEventListener('click', () => LR.village.open(null));
  // 게임 내 상단 버튼
  const btnG = document.getElementById('btnVillageView');
  if (btnG) btnG.addEventListener('click', () => LR.village.open(LR.state));
});
