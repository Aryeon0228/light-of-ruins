// 엔딩 카드 수집 — 영속(localStorage) + 갤러리 UI
//  '작은 승리' 카드(collection.js)와 같은 구조. 카드 = 엔딩 1개.
//  한 번이라도 도달한 엔딩은 영구 수집(판이 끝나도 유지). 갤러리에서 모은 결말/잠긴 결말 표시.
window.LR = window.LR || {};
LR.endingCollection = LR.endingCollection || {};
LR.ENDING_COLLECTION_KEY = 'light-of-ruins.v1.endings';

// 갤러리 표시 순서 — 도달의 무게 순(안전지대 → 빛 → 흔들림 → 잊혀짐 → 게임오버 3종)
LR.ENDING_CARD_ORDER = [
  'safezone', 'lightVillage', 'weightedSurvival', 'shakingVillage', 'forgottenVillage',
  'contagion', 'collapse', 'totalDeath'
];
// 갤러리용 한 줄 — '어떻게 이 결말에 닿는가'를 잠긴 카드에도 힌트로 흘려준다
LR.ENDING_CARD_HINT = {
  safezone:         '통신 비컨을 두 번 이상 완성해, 마을이 안전지대 좌표를 손에 넣는다.',
  lightVillage:     '약자를 버리지 않은 결정(긍정 전례)만 새기며 30일을 버틴다.',
  weightedSurvival: '큰 사건 없이, 매일의 반복을 끌어안고 30일을 채운다.',
  shakingVillage:   '살린 순간과 버린 순간이 함께 새겨진 채로 30일을 넘긴다.',
  forgottenVillage: '쓸모로만 사람을 재던 결정(부정 전례)을 남기며 살아남는다.',
  contagion:        '격리하지 못한 전염이 마을의 모든 폐를 적신다.',
  collapse:         '마을의 사기가 사흘 동안 0에 머무른다.',
  totalDeath:       '마지막 한 사람의 숨까지 끊긴다.'
};
LR.ENDING_TYPE_LABEL = { survival: '생존', gameover: '게임오버' };

LR.endingCollection.get = function() {
  try { return JSON.parse(localStorage.getItem(LR.ENDING_COLLECTION_KEY)) || []; }
  catch (e) { return []; }
};
LR.endingCollection.has = function(id) { return LR.endingCollection.get().indexOf(id) !== -1; };
// 추가. 새로 추가됐으면(=처음 본 엔딩) true 반환.
LR.endingCollection.add = function(id) {
  const list = LR.endingCollection.get();
  if (list.indexOf(id) !== -1) return false;
  list.push(id);
  try { localStorage.setItem(LR.ENDING_COLLECTION_KEY, JSON.stringify(list)); } catch (e) {}
  return true;
};
LR.endingCollection.count = function() { return LR.endingCollection.get().length; };

// 엔딩 카드 아트: assets/images/endings/{id소문자}.png (render.showEnding의 히어로와 동일)
LR.endingCollection.cardArt = function(id) {
  return 'assets/images/endings/' + String(id).toLowerCase() + '.png';
};

LR.endingCollection.renderGallery = function() {
  const grid = document.getElementById('endingCollectionGrid');
  if (!grid) return;
  const defs = LR.ENDINGS || {};
  const order = LR.ENDING_CARD_ORDER.filter(id => defs[id]);
  const got = LR.endingCollection.get();
  grid.innerHTML = order.map(id => {
    const def = defs[id];
    const hint = LR.ENDING_CARD_HINT[id] || '';
    const typeLab = LR.ENDING_TYPE_LABEL[def.type] || '';
    const typeCls = def.type === 'gameover' ? 'gameover' : 'survival';
    if (got.indexOf(id) === -1) {
      return '<div class="coll-card ec-card locked">'
        + '<div class="coll-art">?</div>'
        + '<div class="ec-type ' + typeCls + '">' + typeLab + '</div>'
        + '<div class="coll-name">??? — 아직 보지 못한 결말</div>'
        + '<div class="coll-desc">' + hint + '</div></div>';
    }
    const art = LR.endingCollection.cardArt(id);
    return '<div class="coll-card ec-card ' + typeCls + '">'
      + '<div class="coll-art"><img src="' + art + '" alt="" onerror="this.onerror=null;this.closest(\'.coll-art\').textContent=\'★\'"></div>'
      + '<div class="ec-type ' + typeCls + '">' + typeLab + '</div>'
      + '<div class="coll-name">' + def.title + '</div>'
      + '<div class="ec-sub">' + (def.subtitle || '') + '</div>'
      + '<div class="coll-desc">' + hint + '</div></div>';
  }).join('');
  const cnt = document.getElementById('endingCollectionCount');
  if (cnt) cnt.textContent = got.length + ' / ' + order.length;
};

LR.endingCollection.open = function() {
  const ov = document.getElementById('endingCollectionOverlay');
  if (!ov) return;
  LR.endingCollection.renderGallery();
  ov.classList.add('active');
};
LR.endingCollection.close = function() {
  const ov = document.getElementById('endingCollectionOverlay');
  if (ov) ov.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnEndingCollection');
  if (btn) btn.addEventListener('click', () => LR.endingCollection.open());
  const view = document.getElementById('btnEndingViewCollection');
  if (view) view.addEventListener('click', () => LR.endingCollection.open());
  const x = document.getElementById('endingCollectionClose');
  if (x) x.addEventListener('click', () => LR.endingCollection.close());
  const ov = document.getElementById('endingCollectionOverlay');
  if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) LR.endingCollection.close(); });
  document.addEventListener('keydown', (e) => {
    const ov2 = document.getElementById('endingCollectionOverlay');
    if (e.key === 'Escape' && ov2 && ov2.classList.contains('active')) LR.endingCollection.close();
  });
});
