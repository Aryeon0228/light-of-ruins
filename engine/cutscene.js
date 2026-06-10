// 컷씬 엔진 (cutscene.js)
// 일러스트 + 캡션 시퀀스를 모달로 재생
// 컷씬 정의 형식:
//   { id: 'sw3_jeonghun', frames: [
//       { image: 'assets/images/cutscenes/sw3_1.jpg', text: '정훈이 비축해둔 건조 식재료를 살짝 꺼낸다.' },
//       { image: 'assets/images/cutscenes/sw3_2.jpg', text: '맛을 보고 고개를 끄덕인다. 표정이 잠깐 풀린다.' },
//       ...
//   ]}

window.LR = window.LR || {};

LR.cutscene = LR.cutscene || {};
LR.cutscene._activeFrames = null;
LR.cutscene._activeIdx = 0;
LR.cutscene._onComplete = null;

LR.cutscene.play = function(cutsceneDef, onComplete, tone, badgeText, isNew, resultDeltas) {
  if (!cutsceneDef || !cutsceneDef.frames || cutsceneDef.frames.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  LR.cutscene._activeFrames = cutsceneDef.frames;
  LR.cutscene._activeIdx = 0;
  LR.cutscene._onComplete = onComplete;

  // 결과 변화량 칩(식량·사기 등) — 크게 표시
  const res = document.getElementById('cutsceneResult');
  if (res) {
    const labels = { food: '식량', morale: '사기', water: '물', fuel: '연료', medicine: '의약품', health: '체력', noise: '소음' };
    let chips = '';
    if (resultDeltas) {
      for (const k in labels) {
        const v = resultDeltas[k];
        if (!v) continue;
        const good = (k === 'noise') ? v < 0 : v > 0;   // 소음은 +가 나쁨
        chips += '<span class="cs-rchip ' + (good ? 'up' : 'down') + '">' + labels[k] +
          ' <b>' + (v > 0 ? '+' : '') + v + '</b></span>';
      }
    }
    res.innerHTML = chips;
    res.style.display = chips ? 'flex' : 'none';
  }

  const overlay = document.getElementById('cutsceneOverlay');
  // 톤별 연출(plain=담백 / reward=스몰윈 금색 보상 / bad=붉은 경고 / special=전용 아트)
  const t = tone || cutsceneDef.tone || 'plain';
  overlay.classList.remove('tone-plain', 'tone-reward', 'tone-bad', 'tone-special');
  overlay.classList.add('tone-' + t);
  const badge = document.getElementById('cutsceneBadge');
  if (badge) {
    const name = badgeText || cutsceneDef.badge || '';
    if (t === 'reward') {
      const kick = isNew ? '✦ 새 카드 획득! · NEW' : '✦ 작은 승리 · SMALL WIN';
      badge.innerHTML = '<span class="cb-kicker' + (isNew ? ' cb-new' : '') + '">' + kick + '</span>' +
        (name ? '<span class="cb-name">' + name + '</span>' : '');
    } else if (t === 'bad') {
      badge.innerHTML = '<span class="cb-kicker">⚠ 무거운 선택</span>' +
        (name ? '<span class="cb-name">' + name + '</span>' : '');
    } else {
      badge.textContent = name;
    }
  }
  overlay.classList.add('active');
  LR.cutscene._renderFrame();
};

LR.cutscene._renderFrame = function() {
  const frames = LR.cutscene._activeFrames;
  const idx = LR.cutscene._activeIdx;
  const frame = frames[idx];

  const img = document.getElementById('cutsceneImg');
  const ph = document.getElementById('cutscenePlaceholder');
  // re-trigger fade-in by reassigning src after blanking
  img.style.animation = 'none';
  img.offsetHeight;  // force reflow
  img.style.animation = '';
  // 폴백 체인: 지정 이미지 → frame.fallback → 빈 프레임(일러스트 슬롯 표시)
  //  마지막 폴백은 깨진 이미지 대신 점선 프레임 + 기대 파일명을 보여줘서
  //  '여기에 그림을 올리면 들어간다'를 알 수 있게 한다.
  img.style.display = '';
  if (ph) ph.classList.remove('show');
  const showPlaceholder = function() {
    img.onerror = null;
    img.style.display = 'none';
    if (ph) {
      ph.classList.add('show');
      const f = document.getElementById('cutscenePhFile');
      if (f) f.textContent = frame.slot || frame.image || '';
    }
  };
  img.onerror = function() {
    if (frame.fallback && img.src.indexOf(frame.fallback) === -1) {
      img.src = frame.fallback;   // 1차 폴백 — 이것도 실패하면 빈 프레임
      return;
    }
    showPlaceholder();
  };
  img.src = frame.image;
  img.alt = frame.text || '';

  const txt = document.getElementById('cutsceneText');
  txt.style.animation = 'none';
  txt.offsetHeight;
  txt.style.animation = '';
  txt.textContent = frame.text || '';

  // 진행 도트
  const prog = document.getElementById('cutsceneProgress');
  prog.innerHTML = '';
  for (let i = 0; i < frames.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === idx ? ' active' : '');
    prog.appendChild(dot);
  }
};

LR.cutscene._next = function() {
  if (!LR.cutscene._activeFrames) return;
  LR.cutscene._activeIdx += 1;
  if (LR.cutscene._activeIdx >= LR.cutscene._activeFrames.length) {
    LR.cutscene._end();
  } else {
    LR.cutscene._renderFrame();
  }
};

LR.cutscene._end = function() {
  const overlay = document.getElementById('cutsceneOverlay');
  overlay.classList.remove('active');
  const cb = LR.cutscene._onComplete;
  LR.cutscene._activeFrames = null;
  LR.cutscene._activeIdx = 0;
  LR.cutscene._onComplete = null;
  if (cb) cb();
};

LR.cutscene.isPlaying = function() {
  return !!LR.cutscene._activeFrames;
};

// 입력 핸들러 — 클릭 / 스페이스 / 오른쪽 화살표
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('cutsceneOverlay');
  if (overlay) {
    overlay.addEventListener('click', () => LR.cutscene._next());
  }
  document.addEventListener('keydown', (e) => {
    if (!LR.cutscene.isPlaying()) return;
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      LR.cutscene._next();
    } else if (e.key === 'Escape') {
      LR.cutscene._end();
    }
  });
});
