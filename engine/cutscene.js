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

LR.cutscene.play = function(cutsceneDef, onComplete) {
  if (!cutsceneDef || !cutsceneDef.frames || cutsceneDef.frames.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  LR.cutscene._activeFrames = cutsceneDef.frames;
  LR.cutscene._activeIdx = 0;
  LR.cutscene._onComplete = onComplete;

  const overlay = document.getElementById('cutsceneOverlay');
  overlay.classList.add('active');
  LR.cutscene._renderFrame();
};

LR.cutscene._renderFrame = function() {
  const frames = LR.cutscene._activeFrames;
  const idx = LR.cutscene._activeIdx;
  const frame = frames[idx];

  const img = document.getElementById('cutsceneImg');
  // re-trigger fade-in by reassigning src after blanking
  img.style.animation = 'none';
  img.offsetHeight;  // force reflow
  img.style.animation = '';
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
