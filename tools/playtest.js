// 헤드리스 플레이테스트 하니스 (개발용)
//  엔진 순수 로직만 로드하고 UI(render/village/cutscene/save)는 noop으로 대체한 뒤,
//  여러 전략으로 30일 사이클을 수백 번 자동 플레이 → 크래시·막다른 길·밸런스(엔딩 분포·생존율) 점검.
//  실행:  node tools/playtest.js [게임수]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// ── 브라우저 전역 최소 스텁 ──
globalThis.window = globalThis;
const noopEl = () => ({
  style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
  querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, getContext: () => null,
  textContent: '', innerHTML: '', style_: {},
});
globalThis.document = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => noopEl(), addEventListener() {}, body: noopEl(),
};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.setTimeout = (fn) => { if (typeof fn === 'function') fn(); return 0; }; // 동기 진행
globalThis.clearTimeout = () => {};
globalThis.alert = () => {};
globalThis.confirm = () => true;

// ── 로드 순서 (index.html과 동일, 단 UI 파일 제외) ──
const FILES = [
  'data/characters.js', 'data/scripted.js', 'data/cross-events.js', 'data/village-days.js',
  'data/small-wins.js', 'data/beacons.js', 'data/templates.js', 'data/endings.js',
  'engine/state.js', 'engine/formulas.js', 'engine/precedents.js', 'engine/spiral.js',
  'engine/smallwin.js', 'engine/beacon.js', 'engine/drama.js', 'engine/loop.js',
];
const src = FILES.map(f => `\n//# ${f}\n` + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
vm.runInThisContext(src, { filename: 'engine-bundle.js' });

const LR = globalThis.LR;
// ── UI 모듈 noop 스텁 ──
LR.render = new Proxy({}, { get: () => () => {} });
LR.village = { syncFromGame() {} };
LR.save = { auto() {}, manual() {}, clear() {}, has: () => false, load: () => null };
LR.cutscene = { play: (seq, cb) => { if (typeof cb === 'function') cb(); } };

// ── 선택 전략 ──
function validChoices(node, state) {
  return (node.choices || []).filter(ch => {
    if (ch.requireSpiral && state.spiral.state !== ch.requireSpiral) return false;
    if (ch.enabled === false) return false;
    return true;
  });
}
const pick = {
  random: (cs) => cs[Math.floor(Math.random() * cs.length)],
  safe:   (cs) => cs.find(c => c.risk !== 'danger' && !(c.intentionalNoise > 8)) || cs[0],
  // 도덕 축을 직접 미는 전략: 마을 이로운(긍정 전례) vs 이기적/방치(부정 전례)
  kind:   (cs) => cs.find(c => c.precedentCandidate && c.precedentCandidate.villageBenefit) || cs.find(c => c.risk !== 'danger') || cs[0],
  harsh:  (cs) => cs.find(c => c.precedentCandidate && c.precedentCandidate.villageBenefit === false) || cs[cs.length - 1],
};

function playOne(strategy) {
  LR.engine.startNewGame();
  const s = LR.state;
  let guard = 0, deadEnd = false;
  while (!s.ending && guard++ < 80) {
    const node = s.pendingChoice;
    if (!node || !s.awaitingChoice) break;
    const cs = validChoices(node, s);
    if (!cs.length) { deadEnd = { day: s.day, node: node.id }; break; }
    LR.engine.applyChoice(pick[strategy](cs).id);
  }
  const alive = LR.aliveChars(s);
  return {
    ending: s.ending ? s.ending.id : (deadEnd ? '(DEAD-END)' : '(NO-END@' + s.day + ')'),
    day: s.day, survivors: alive.length,
    avgMorale: Math.round(LR.avgMorale(s)),
    food: s.food, water: s.water, pos: s.counters.posPrecedents, neg: s.counters.negPrecedents,
    commSucc: s.beacon.completedSuccessCount.comm,
    deadEnd,
  };
}

// ── 실행 ──
const N = parseInt(process.argv[2], 10) || 200;
const strategies = ['random', 'safe', 'kind', 'harsh'];
const errors = [];
console.log(`\n=== 플레이테스트: 전략 4종 × ${N}게임 ===\n`);

for (const strat of strategies) {
  const endings = {}, deadEnds = [];
  let survSum = 0, survivedCycle = 0, daySum = 0, foodZero = 0, waterZero = 0, posSum = 0, negSum = 0, commSum = 0;
  for (let i = 0; i < N; i++) {
    let r;
    try { r = playOne(strat); }
    catch (e) { if (errors.length < 6) errors.push(`[${strat}#${i}] ${e.stack || e}`); continue; }
    endings[r.ending] = (endings[r.ending] || 0) + 1;
    survSum += r.survivors; daySum += r.day;
    posSum += r.pos; negSum += r.neg; commSum += r.commSucc;
    if (r.day >= 30) survivedCycle++;
    if (r.food === 0) foodZero++;
    if (r.water === 0) waterZero++;
    if (r.deadEnd) deadEnds.push(r.deadEnd);
  }
  console.log(`■ [${strat}]  평균 생존자 ${(survSum / N).toFixed(1)}/10 · 30일 완주 ${survivedCycle}/${N} · 식량0 종료 ${foodZero} · 물0 종료 ${waterZero}`);
  console.log(`   전례 누적: 긍정 ${(posSum / N).toFixed(2)} · 부정 ${(negSum / N).toFixed(2)} (엔딩 분기 임계 2) · 비컨(통신) 성공 ${(commSum / N).toFixed(2)} (안전지대 임계 2)`);
  const dist = Object.entries(endings).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${(v / N * 100).toFixed(0)}%`).join(' · ');
  console.log(`   엔딩: ${dist}`);
  if (deadEnds.length) console.log(`   ⚠ 막다른 길 ${deadEnds.length}회 (예: day ${deadEnds[0].day}, node ${deadEnds[0].node})`);
  console.log('');
}

if (errors.length) {
  console.log('=== ⚠ 런타임 에러 ===');
  errors.forEach(e => console.log(e + '\n'));
  process.exitCode = 1;
} else {
  console.log('✅ 크래시 없음 — 모든 게임이 엔딩까지 도달');
}
