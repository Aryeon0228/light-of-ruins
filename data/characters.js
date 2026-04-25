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
