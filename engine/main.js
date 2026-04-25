// 메인 진입점 (main.js)
// 타이틀 화면 → 게임 시작 → 엔딩 → 재시작 흐름

window.LR = window.LR || {};

document.addEventListener('DOMContentLoaded', () => {

  // ─── 타이틀 화면 버튼 ───
  const btnNew = document.getElementById('btnNewGame');
  const btnContinue = document.getElementById('btnContinue');
  const btnAbout = document.getElementById('btnAbout');

  if (LR.save.has()) {
    btnContinue.disabled = false;
  } else {
    btnContinue.disabled = true;
  }

  btnNew.addEventListener('click', () => {
    LR.save.clear();
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('gameRoot').classList.add('active');
    LR.engine.startNewGame();
  });

  btnContinue.addEventListener('click', () => {
    const state = LR.save.load();
    if (!state) return;
    LR.state = state;
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('gameRoot').classList.add('active');
    if (state.ending) {
      LR.render.showEnding(state);
    } else {
      LR.engine.beginDay();
    }
  });

  btnAbout.addEventListener('click', () => {
    alert(`폐허의 불빛 — Light of Ruins

대학원 게임 디자인 과제로 작성된 좀비 생존 마을 관리 게임의 웹 구현체입니다.

핵심 시스템:
· 3축 (식량 · 체력 · 사기) + 소음
· 상승 나선 (교감 → 결속 → 단합)
· 양방향 전례 시스템 (P-) — 한 번의 결정이 마을의 도덕적 좌표계가 됩니다
· 주간 비컨 — 7일 사이클의 외부 희망
· Small Win — 인물의 존재 자체가 가져오는 미세한 회복

원작 기획: 김소연 (홍익대학교 대학원 게임 디자인 v1.2)
지도: 김현석 교수`);
  });

  // ─── 상단 바 액션 ───
  document.getElementById('btnSave').addEventListener('click', () => {
    if (LR.state) LR.save.manual(LR.state);
  });

  document.getElementById('btnTitle').addEventListener('click', () => {
    if (confirm('타이틀로 돌아가시겠습니까? (현재 상태는 자동 저장됩니다)')) {
      if (LR.state) LR.save.auto(LR.state);
      location.reload();
    }
  });

  // ─── 엔딩 화면 액션 ───
  document.getElementById('btnRestart').addEventListener('click', () => {
    LR.save.clear();
    document.getElementById('endingOverlay').classList.remove('active');
    LR.engine.startNewGame();
  });

  document.getElementById('btnEndingTitle').addEventListener('click', () => {
    location.reload();
  });

  // ─── 콘솔 검증 ───
  if (LR.verifyFormulas) {
    setTimeout(() => LR.verifyFormulas(), 500);
  }
});
