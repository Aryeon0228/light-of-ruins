// 폐허의 불빛 — 10인 캐릭터 정의
// 감수성 가중치는 sec 2.6 인물별 전례 감수성 표(system_design_v1_2.docx)에서 직접 인용

window.LR = window.LR || {};

LR.CHARACTER_ORDER = [
  'jaehyeok','sujin','yeongsu','eunseo','jeonghun',
  'miyeon','dongho','hayeong','jonghyeok','minsu'
];

LR.CHARACTER_DEFS = {
  jaehyeok: {
    id: 'jaehyeok', name: '재혁', age: 35, role: '리더',
    bio: '전직 소방관. 마을 결정의 주체.',
    health: 90, morale: 70, status: 'healthy',
    negSens: 1.2, posSens: 1.2,
    color: '#1B3A5C'
  },
  sujin: {
    id: 'sujin', name: '수진', age: 28, role: '의료',
    bio: '간호사 출신. 생명 결정과 직결.',
    health: 85, morale: 65, status: 'healthy',
    negSens: 1.3, posSens: 1.3,
    color: '#7A4A6A'
  },
  yeongsu: {
    id: 'yeongsu', name: '영수', age: 62, role: '장로',
    bio: '지병으로 체력 낮음. 코골이.',
    health: 55, morale: 50, status: 'injured',
    negSens: 1.5, posSens: 1.3,
    color: '#6E5A3F'
  },
  eunseo: {
    id: 'eunseo', name: '은서', age: 17, role: '미래세대',
    bio: '고등학생. 탐색이 빠르다.',
    health: 85, morale: 75, status: 'healthy',
    negSens: 1.0, posSens: 1.2,
    color: '#3F7A8E'
  },
  jeonghun: {
    id: 'jeonghun', name: '정훈', age: 45, role: '요리사',
    bio: '식량 관리. 기여로 존재 증명.',
    health: 80, morale: 55, status: 'healthy',
    negSens: 1.0, posSens: 1.3,
    color: '#8E6B3F'
  },
  miyeon: {
    id: 'miyeon', name: '미연', age: 32, role: '임산부',
    bio: '임신 8개월. 활동 제한. 아기의 미래를 읽음.',
    health: 80, morale: 60, status: 'healthy',
    negSens: 1.3, posSens: 1.5,
    color: '#9F5870',
    hasBaby: false
  },
  dongho: {
    id: 'dongho', name: '동호', age: 40, role: '회의론자',
    bio: '건축기사. 가족 사별. 합리 해석.',
    health: 90, morale: 45, status: 'healthy',
    negSens: 0.7, posSens: 0.8,
    color: '#4F4F58'
  },
  hayeong: {
    id: 'hayeong', name: '하영', age: 26, role: '행동가',
    bio: '체육교사 출신. 방어 담당.',
    health: 85, morale: 70, status: 'healthy',
    negSens: 0.8, posSens: 1.0,
    color: '#3F8A5C'
  },
  jonghyeok: {
    id: 'jonghyeok', name: '종혁', age: 55, role: '회복자',
    bio: '전기기사. 오른팔 부상. 손녀 사진을 품에 둠.',
    health: 60, morale: 55, status: 'injured',
    negSens: 1.5, posSens: 1.4,
    color: '#5C3F6E'
  },
  minsu: {
    id: 'minsu', name: '민수', age: 8, role: '아이',
    bio: '미연의 아들. 비전투원. 그림 그리기를 좋아함.',
    health: 90, morale: 80, status: 'healthy',
    negSens: 0.8, posSens: 1.5,
    color: '#D49A4F'
  }
};

// ═══ 감정 텍스트 — 죽음·빈사·에필로그 (인물별 맞춤) ═══

// 작별 — 사망 컷씬에 표시되는 그 사람만의 마지막 문장
LR.DEATH_LINES = {
  jaehyeok:  '재혁이 쓰러졌다. 마을의 결정을 떠맡던 어깨가 내려앉았다. 내일 아침, 담장의 분필 글씨는 누가 적을까.',
  sujin:     '수진이 눈을 감았다. 약상자는 가지런히 정리된 채로 남았다 — 그녀가 마지막으로 한 일이 그것이었다.',
  yeongsu:   '영수의 코골이가 더는 들리지 않는다. 마을은 그 소음이 사라진 만큼 조용해졌고, 꼭 그만큼 무거워졌다.',
  eunseo:    '은서가 돌아오지 못했다. 텃밭의 첫 수확을 가장 기뻐하던 손이었다. 두 번째 이랑은 파다 만 채로 남았다.',
  jeonghun:  '정훈의 솥이 식었다. 의심스러운 것을 먼저 삼키던 한 입의 용기를, 이제 아무도 대신하지 못한다.',
  miyeon:    '미연이 떠났다. 아기는 남았다. 그 밤부터 마을 전체가 그 울음의 보호자가 되었다.',
  dongho:    '동호가 죽었다. 끝까지 감상 없이, 도면처럼 정확하게 살다 갔다. 벽에 그의 보강 도면이 남아 있다.',
  hayeong:   '하영이 쓰러졌다. 망루가 비었다. 노을을 봐 두라던 사람이 없는 저녁이 온다.',
  jonghyeok: '종혁이 눈을 감았다. 방음 칸막이는 남아 오늘 밤도 아기의 울음을 덮는다. 기여는 사람보다 오래 남는다.',
  minsu:     '민수가 떠났다. 색연필 그림 속 불빛 켜진 집은, 끝내 그려지다 만 채로 남았다.'
};

// 빈사 — 체력이 바닥난 사람이 아침에 흘리는 한 마디 (경고이자 애착)
LR.DYING_LINES = {
  jaehyeok:  '"…괜찮다. 오늘 할 일부터 말해줘."',
  sujin:     '"내 가방, 정리해 뒀어요. 누가 써도 알아볼 수 있게."',
  yeongsu:   '"늙은이 걱정은 말고… 아침이나 챙겨 먹어."',
  eunseo:    '"나, 다시 나갈 수 있죠? 며칠만 지나면."',
  jeonghun:  '"솥에 어제 국물 남아 있어. 데워 먹어, 다들."',
  miyeon:    '"아기가 울면… 안아 줘요. 내가 못 일어나면."',
  dongho:    '"엄살 아니야. 계산상… 좀 안 좋을 뿐이지."',
  hayeong:   '"망루 비워서 미안. 금방 올라갈게."',
  jonghyeok: '"나도 영수 씨처럼 되는 건가. …농담이야."',
  minsu:     '"…엄마, 나 안 아파."'
};

// 에필로그 — 엔딩 화면에서 생존자 이름 밑에 붙는 '그 후' 한 줄
LR.EPILOGUE_LINES = {
  jaehyeok:  '아침마다 담장에 같은 문장을 적는다 — 오늘도 이상 없음.',
  sujin:     '약상자에 새 라벨을 붙였다. 다음 계절의 것이다.',
  yeongsu:   '모닥불 가의 옛이야기가 하나 더 늘었다.',
  eunseo:    '텃밭에 두 번째 이랑을 팠다. 내년 봄의 일을 말하기 시작했다.',
  jeonghun:  '솥 바닥까지 비운 날이 늘었다 — 좋은 뜻으로.',
  miyeon:    '아기의 무게가 조금 늘었다. 꼭 그만큼의 내일이 생겼다.',
  dongho:    '보강 도면 두 장째를 그리고 있다. 이번 것은 더 제대로다.',
  hayeong:   '망루의 노을을 여전히 혼자 보지 않는다.',
  jonghyeok: '방음 칸막이 너머로, 오늘 밤도 아기 울음이 무사히 묻힌다.',
  minsu:     '그림 속 집에 창문이 하나 더 생겼다. 불은 켜져 있다.'
};
