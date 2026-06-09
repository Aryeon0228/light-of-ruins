// 작은 승리 카드 수집 — 영속(localStorage) + 갤러리 UI
//  카드 = 스몰윈 1개. 처음 보면 영구 수집(판이 끝나도 유지). 갤러리에서 모은 카드/잠긴 카드 표시.
window.LR = window.LR || {};
LR.collection = LR.collection || {};
LR.COLLECTION_KEY = 'light-of-ruins.v1.collection';

LR.collection.get = function() {
  try { return JSON.parse(localStorage.getItem(LR.COLLECTION_KEY)) || []; }
  catch (e) { return []; }
};
LR.collection.has = function(id) { return LR.collection.get().indexOf(id) !== -1; };
// 추가. 새로 추가됐으면(=처음 본 카드) true 반환.
LR.collection.add = function(id) {
  const list = LR.collection.get();
  if (list.indexOf(id) !== -1) return false;
  list.push(id);
  try { localStorage.setItem(LR.COLLECTION_KEY, JSON.stringify(list)); } catch (e) {}
  return true;
};
LR.collection.count = function() { return LR.collection.get().length; };

// 카드 아트: 전용(def.cardImage) > 인물 포트레이트(임시)
LR.collection.cardArt = function(def) {
  if (def && def.cardImage) return def.cardImage;
  return 'assets/images/portraits/' + ((def && def.actor) || 'bc') + '.png';
};

LR.collection.renderGallery = function() {
  const grid = document.getElementById('collectionGrid');
  if (!grid) return;
  const defs = LR.SMALL_WIN_DEFS || {};
  const ids = Object.keys(defs);
  const got = LR.collection.get();
  grid.innerHTML = ids.map(id => {
    const def = defs[id];
    if (got.indexOf(id) === -1) {
      return '<div class="coll-card locked"><div class="coll-art">?</div>'
        + '<div class="coll-name">???</div>'
        + '<div class="coll-desc">아직 보지 못한 작은 승리</div></div>';
    }
    const portrait = 'assets/images/portraits/' + ((def && def.actor) || 'bc') + '.png';
    const art = (def && def.cardImage) || portrait;
    return '<div class="coll-card">'
      + '<div class="coll-art"><img src="' + art + '" alt="" onerror="this.onerror=null;this.src=\'' + portrait + '\'"></div>'
      + '<div class="coll-name">' + def.name + '</div>'
      + '<div class="coll-desc">' + def.text + '</div></div>';
  }).join('');
  const cnt = document.getElementById('collectionCount');
  if (cnt) cnt.textContent = got.length + ' / ' + ids.length;
};

LR.collection.open = function() {
  const ov = document.getElementById('collectionOverlay');
  if (!ov) return;
  LR.collection.renderGallery();
  ov.classList.add('active');
};
LR.collection.close = function() {
  const ov = document.getElementById('collectionOverlay');
  if (ov) ov.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnCollection');
  if (btn) btn.addEventListener('click', () => LR.collection.open());
  const x = document.getElementById('collectionClose');
  if (x) x.addEventListener('click', () => LR.collection.close());
  const ov = document.getElementById('collectionOverlay');
  if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) LR.collection.close(); });
  document.addEventListener('keydown', (e) => {
    const ov2 = document.getElementById('collectionOverlay');
    if (e.key === 'Escape' && ov2 && ov2.classList.contains('active')) LR.collection.close();
  });
});
