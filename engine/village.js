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
  { z:'kitchen',    label:'요리시설',    box:[3.2, 32.9, 29.5, 35.9], o:[18.0, 50.8] },
  { z:'field',      label:'밭',          box:[8.6, 16.3, 31.9, 20.4], o:[24.6, 26.5] },
  { z:'barracks',   label:'숙소',        box:[52.1, 15.3, 35.2, 30.6], o:[69.6, 30.6] },
  { z:'workshop',   label:'작업장 · 통신', box:[68.5, 52.9, 31.5, 30.6], o:[84.3, 68.2] },
  { z:'storage',    label:'정문 · 울타리', box:[38.6, 77.0, 22.6, 23.0], o:[49.9, 88.5] },
  { z:'infirmary',  label:'의무실',      box:[77.8, 35.1, 21.8, 25.4], o:[88.7, 47.8] },
  { z:'watchtower', label:'망루',        box:[80.7, 0.0, 18.3, 39.1], o:[89.9, 19.6] },
  { z:'gate',       label:'보강문',      box:[44.2, 14.0, 11.0, 22.1], o:[49.7, 25.0] },
  { z:'water',      label:'물 · 빗물받이', box:[0.0, 88.4, 7.5, 11.6], o:[2.9, 94.2] }
];
// 인물 스프라이트 — 전원 풀캔버스(2896×2172) 제자리. 0,0에 그대로 겹침(작가가 맞춘 위치/크기 유지).
//  (개별 크롭으로 줄 경우엔 inplace 빼고 cx/cy + h|w(%)로 배치 가능)
const PEOPLE_FILES = [
  { file:'jeonghun',       char:'jeonghun',  inplace:true },
  { file:'eunseo',         char:'eunseo',    inplace:true },
  { file:'sujin',          char:'sujin',     inplace:true },
  { file:'yeongsu',        char:'yeongsu',   inplace:true },
  { file:'miyeon',         char:'miyeon',    inplace:true },
  { file:'dongho',         char:'dongho',    inplace:true },
  { file:'jonghyeok',      char:'jonghyeok', inplace:true },
  { file:'hayeong',        char:'hayeong',   inplace:true },
  { file:'jaehyeok_minsu', char:'jaehyeok',  inplace:true }
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
};

LR.village.close = function() {
  const el = document.getElementById('villageScreen');
  if (el) el.classList.remove('active');
};

LR.village.setMode = function(mode) {
  LR.village.mode = mode;
  document.querySelectorAll('.vh-cam-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  LR.village.renderScene();
};

LR.village.select = function(id) {
  LR.village.selected = id;
  LR.village.picked = true;   // 클릭 이후부터 씬에 선택 글로우 표시
  LR.village.render();
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
  renderDetail(s);
  LR.village.renderScene();
};

function renderTopbar(s) {
  const seasonName = LR.SEASONS[s.season].name;
  const alive = LR.aliveChars(s).length;
  const raid = LR.raidProbability(s.noiseToday);
  const foodT = LR.foodTier(s.food);

  document.getElementById('vhDay').textContent = 'Day ' + s.day;
  document.getElementById('vhSeason').textContent = seasonName;
  document.getElementById('vhClock').textContent = dayPhase(s).label;

  const pills = [
    pill(ICON.food,  '식량', s.food, foodT.tier === 'famine' || foodT.tier === 'crisis' ? 'warn' : ''),
    pill(ICON.water, '물',   s.water, s.water < 20 ? 'warn' : ''),
    pill(ICON.fuel,  '연료', s.fuel,  s.fuel < 10 ? 'warn' : ''),
    pill(ICON.med,   '의약품', s.medicine, s.medicine === 0 ? 'danger' : ''),
    pill(ICON.noise, '소음', s.noiseToday, raid.p >= 0.6 ? 'danger' : raid.p >= 0.25 ? 'warn' : ''),
    pill(ICON.people, '생존자', alive + '/10', alive < 10 ? 'dim' : '')
  ].join('');
  document.getElementById('vhResources').innerHTML = pills;

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

function pill(icon, label, value, cls) {
  return `<div class="vh-pill ${cls || ''}">
    <span class="vh-pill-ic">${icon}</span>
    <span class="vh-pill-lab">${label}</span>
    <span class="vh-pill-val">${value}</span>
  </div>`;
}

function renderRoster(s) {
  const root = document.getElementById('vhRoster');
  root.innerHTML = LR.CHARACTER_ORDER.map(id => {
    const c = s.characters[id];
    const def = LR.CHARACTER_DEFS[id];
    const ht = LR.healthTier(c.health);
    const sel = LR.village.selected === id ? ' selected' : '';
    const dead = c.alive ? '' : ' dead';
    return `<button class="vh-rost${sel}${dead}" data-rost="${id}" style="--cc:${def.color}">
      <span class="vh-rost-dot" style="background:${c.alive ? hpColor(c.health) : '#555'}"></span>
      <span class="vh-rost-body">
        <span class="vh-rost-name">${c.name}<em>${c.role}</em></span>
        <span class="vh-rost-bars">
          <span class="vh-mini"><i style="width:${c.health}%;background:${hpColor(c.health)}"></i></span>
          <span class="vh-mini"><i style="width:${c.morale}%;background:var(--c-axis-morale)"></i></span>
        </span>
      </span>
      <span class="vh-rost-state">${c.alive ? ht.label : '사망'}</span>
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
    <section class="vh-card">
      <h4>상승 나선</h4>
      <div class="vh-spiral">
        <span class="${sp.state === 'gyogam' ? 'on' : ''}">교감</span>
        <span class="${sp.state === 'gyeolsok' ? 'on' : ''}">결속</span>
        <span class="${sp.state === 'danhap' ? 'on' : ''}">단합</span>
      </div>
      <div class="vh-line"><span>현재</span><b>${spName} · 평균 사기 ${avg}</b></div>
    </section>

    <section class="vh-card">
      <h4>주간 비컨</h4>
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
}

function renderDetail(s) {
  const id = LR.village.selected;
  const c = s.characters[id];
  const def = LR.CHARACTER_DEFS[id];
  if (!c || !def) return;
  const ht = LR.healthTier(c.health);
  const mt = LR.moraleTier(c.morale);
  document.getElementById('vhDetail').innerHTML = `
    <div class="vh-det-head">
      <span class="vh-det-port" style="--cc:${def.color}">${portraitSvg(c, def)}</span>
      <div class="vh-det-id">
        <div class="vh-det-name">${c.name}<em>${c.role} · ${def.age}세</em></div>
        <div class="vh-det-act">${activityOf(c)}</div>
      </div>
    </div>
    <div class="vh-det-bio">${def.bio}</div>
    <div class="vh-det-stat">
      <div class="vh-det-row"><span>체력</span><span class="vh-detbar"><i style="width:${c.health}%;background:${hpColor(c.health)}"></i></span><b>${c.health} · ${c.alive ? ht.label : '사망'}</b></div>
      <div class="vh-det-row"><span>사기</span><span class="vh-detbar"><i style="width:${c.morale}%;background:var(--c-axis-morale)"></i></span><b>${c.morale} · ${mt.label}</b></div>
    </div>
    <div class="vh-det-sens">전례 감수성 · 부정 ×${def.negSens} / 긍정 ×${def.posSens}</div>
  `;
}

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
    // 구역 호버 → 해당 글로우 켜기 + 살짝 확대
    host.querySelectorAll('.vh-hot').forEach(h => {
      const glow = host.querySelector('.vh-glow[data-zone="' + h.dataset.zone + '"]');
      h.addEventListener('mouseenter', () => { if (glow) glow.classList.add('on'); h.classList.add('hot-on'); });
      h.addEventListener('mouseleave', () => { if (glow) glow.classList.remove('on'); h.classList.remove('hot-on'); });
    });
    fitStage();
  }
};

// 이미지 무대를 컨테이너에 4:3(2896×2172)로 맞춤 — 핫스팟 % 정렬 보장
function fitStage() {
  const host = document.getElementById('vhScene');
  if (!host) return;
  const box = host.querySelector('.vh-stagebox');
  if (!box) return;
  const cw = host.clientWidth, ch = host.clientHeight, ar = 2896 / 2172;
  let w = cw, h = cw / ar;
  if (h > ch) { h = ch; w = ch * ar; }
  box.style.width = Math.round(w) + 'px';
  box.style.height = Math.round(h) + 'px';
}
if (!window.__vhResizeBound) {
  window.__vhResizeBound = true;
  window.addEventListener('resize', () => { if (LR.village.mode === 'compound') fitStage(); });
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
  const glows = ZONES.map(zn =>
    `<img class="vh-layer vh-glow" data-zone="${zn.z}" src="${A}glow_${zn.z}.png" alt="" style="transform-origin:${zn.o[0]}% ${zn.o[1]}%" onerror="this.remove()">`
  ).join('');
  const fire = `<img class="vh-layer vh-campfire" src="${A}campfire.png" alt="" onerror="this.remove()">`;
  const people = PEOPLE_FILES.map(p => {
    const c = s.characters[p.char];
    const dead = (!c || !c.alive) ? 'display:none;' : '';
    const isSel = LR.village.picked && (p.char === sel || (p.file === 'jaehyeok_minsu' && (sel === 'jaehyeok' || sel === 'minsu')));
    if (p.inplace) {
      // 풀캔버스 제자리 — 무대에 그대로 포갬. dx/dy(%)는 인물만 미세 이동(나머지는 투명).
      const off = (p.dx || p.dy) ? `transform:translate(${p.dx || 0}%,${p.dy || 0}%);` : '';
      return `<img class="vh-layer vh-actorfull${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="${off}${dead}" onerror="this.style.display='none'">`;
    }
    const size = (p.h != null) ? `height:${p.h}%` : `width:${p.w}%`;
    return `<img class="vh-actor${isSel ? ' sel' : ''}" data-char="${p.char}" src="${A}${p.file}.png" alt="" style="left:${p.cx}%;top:${p.cy}%;${size};${dead}" onerror="this.style.display='none'">`;
  }).join('');
  const hots = ZONES.map(zn =>
    `<button class="vh-hot" data-zone="${zn.z}" style="left:${zn.box[0]}%;top:${zn.box[1]}%;width:${zn.box[2]}%;height:${zn.box[3]}%"><span class="vh-hotlab">${zn.label}</span></button>`
  ).join('');
  return `<div class="vh-stagebox">
    <img class="vh-layer vh-bg" src="${A}bg_village.png" alt="">
    ${glows}
    ${fire}
    ${people}
    ${hots}
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

// 자원 아이콘 (16x16 인라인 SVG)
const ICON = {
  food:  '<svg viewBox="0 0 16 16"><path d="M3 7h10a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M5 3v3M8 2v4M11 3v3" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  water: '<svg viewBox="0 0 16 16"><path d="M8 2c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="currentColor"/></svg>',
  fuel:  '<svg viewBox="0 0 16 16"><path d="M8 2c2 3 3.5 4.5 3.5 7a3.5 3.5 0 0 1-7 0c0-1.6 1-2.6 1.8-1.4C7 8 6.5 5 8 2z" fill="currentColor"/></svg>',
  med:   '<svg viewBox="0 0 16 16"><rect x="6.5" y="3" width="3" height="10" rx="1" fill="currentColor"/><rect x="3" y="6.5" width="10" height="3" rx="1" fill="currentColor"/></svg>',
  noise: '<svg viewBox="0 0 16 16"><path d="M3 6h2l3-2v8L5 10H3z" fill="currentColor"/><path d="M10 5a4 4 0 0 1 0 6M12 3a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
  people:'<svg viewBox="0 0 16 16"><circle cx="8" cy="5" r="2.6" fill="currentColor"/><path d="M3 13c0-3 2.4-4.5 5-4.5S13 10 13 13z" fill="currentColor"/></svg>'
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
    <header class="vh-top">
      <div class="vh-top-day">
        <span id="vhDay">Day 1</span>
        <span class="vh-sub"><b id="vhSeason">봄 후반</b> · <i id="vhClock">아침</i></span>
      </div>
      <div class="vh-res" id="vhResources"></div>
      <div class="vh-cam">
        <button class="vh-cam-btn" data-mode="section">측면</button>
        <button class="vh-cam-btn active" data-mode="compound">마당</button>
        <button class="vh-cam-x" id="vhClose">닫기 ✕</button>
      </div>
    </header>

    <div class="vh-alert calm" id="vhAlert"></div>

    <div class="vh-grid">
      <aside class="vh-left">
        <div class="vh-left-h">생존자 명단</div>
        <div class="vh-roster" id="vhRoster"></div>
        <div class="vh-detail" id="vhDetail"></div>
      </aside>

      <main class="vh-center">
        <div class="vh-scene compound" id="vhScene"></div>
        <div class="vh-actbar">
          <button class="vh-act" title="오늘의 결정 화면으로">⚑ 행동</button>
          <button class="vh-act" title="보유 물자">🎒 인벤토리</button>
          <button class="vh-act" title="거점 지도">🗺 지도</button>
          <button class="vh-act" title="지난 기록">📓 기록</button>
          <span class="vh-hint">인물을 클릭하면 상태를 볼 수 있어요</span>
        </div>
      </main>

      <aside class="vh-right" id="vhSystems"></aside>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelectorAll('.vh-cam-btn').forEach(b => {
    b.addEventListener('click', () => LR.village.setMode(b.dataset.mode));
  });
  document.getElementById('vhClose').addEventListener('click', () => LR.village.close());
}

document.addEventListener('DOMContentLoaded', () => {
  // 타이틀 진입 버튼
  const btnT = document.getElementById('btnVillage');
  if (btnT) btnT.addEventListener('click', () => LR.village.open(null));
  // 게임 내 상단 버튼
  const btnG = document.getElementById('btnVillageView');
  if (btnG) btnG.addEventListener('click', () => LR.village.open(LR.state));
});
