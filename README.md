# 폐허의 불빛 — Light of Ruins (웹 구현)

대학원 게임 디자인 과제 『폐허의 불빛 v1.2』(김소연 · 홍익대학교 대학원)의 30일 풀 사이클 웹 구현체.

## 실행 방법

### 옵션 1 — 더블클릭 (가장 간단)
`index.html`을 더블클릭. 모던 브라우저에서 그대로 열림. 단, 일부 브라우저에서 `file://` 보안 제약으로 글꼴 로드 등이 제한될 수 있음.

### 옵션 2 — 로컬 정적 서버 (권장)
이 폴더에서:
```
python3 -m http.server 8765
```
브라우저에서 `http://localhost:8765` 접속.

### 옵션 3 — 깃허브 페이지 배포
이 폴더 전체를 깃허브 레포에 올리고 Pages 활성화. 별도 빌드 없이 즉시 배포.

## 게임 구조

- **30일 한 사이클** + **5개 엔딩** (빛의 마을 / 잊혀진 마을 / 흔들리는 마을 / 안전지대 도달 / 30일 생존)
- **자유 분기 선택** A/B/C
- **하이브리드 시나리오**: 손글씨 시나리오(D1~7 봄편, D14~16 가을편 압축, D24~26 겨울편 압축) + 마을 상태 기반 자동 생성 시나리오

## 구현 시스템 (모두 동작)

| 시스템 | 위치 | 검증값 |
|---|---|---|
| 3축 (식량 · 체력 · 사기) | `engine/loop.js`, `engine/formulas.js` | sec 2.1~2.3 |
| 양방향 전례 시스템 (P-) | `engine/precedents.js`, `data/scripted.js` | D5=0.55 ✓, D138=1.26025 ✓ |
| 시간 반감 곡선 | `engine/formulas.js#precedentIntensity` | D0:1.0 → D7:0.9 → ... → D90+:0.25 |
| 상승 나선 (교감/결속/단합) | `engine/spiral.js` | sec 2.4 (연속 일수 조건 포함) |
| 주간 비컨 (피난민/보급/통신) | `engine/beacon.js`, `data/beacons.js` | 7일 사이클 + 4단계 판정 |
| Drama Manager (3계층) | `engine/drama.js` | sec 6.2 비컨 > 교차 > TI |
| Small Win (5종 자동) | `engine/smallwin.js`, `data/small-wins.js` | 주간 캡 + 쿨다운 + 사기 상한 보정 |
| 교차 이벤트 5.1~5.6 | `data/cross-events.js` | 조건부 발동 |

## 폴더 구조

```
light-of-ruins/
├── index.html              # 진입점 (script 로딩 순서 고정)
├── styles.css              # 전체 스타일 (다크 테마 + Noto Sans KR)
├── README.md               # 본 문서
├── data/                   # 데이터 (캐릭터 · 시나리오 · 이벤트 · 엔딩)
│   ├── characters.js       # 10인 캐릭터 + 감수성 가중치
│   ├── scripted.js         # 13일 손글씨 시나리오
│   ├── cross-events.js     # 교차 이벤트 5.1~5.6
│   ├── small-wins.js       # SW-1~SW-5
│   ├── beacons.js          # 통신/보급/피난민 비컨 정의
│   ├── templates.js        # 비스크립트 일자 템플릿 + 헬퍼 태그
│   └── endings.js          # 5종 엔딩 + 게임 오버 (산문 포함)
└── engine/                 # 게임 엔진
    ├── state.js            # 초기 상태 + 시드 RNG + 가상 일자
    ├── formulas.js         # 회복 보정 · 소음 · TI · 비컨 점수
    ├── precedents.js       # 전례 생성/감쇠
    ├── spiral.js           # 상승 나선 전이
    ├── smallwin.js         # SW 발동 시도
    ├── beacon.js           # 비컨 7일 사이클
    ├── drama.js            # 시나리오 노드 선택 (3계층)
    ├── render.js           # DOM 렌더링
    ├── loop.js             # 일일 루프 (대시보드 → 선택 → 결과 → 다음)
    ├── save.js             # localStorage 저장/불러오기
    └── main.js             # 타이틀 화면 + 진입점
```

## 30일 압축 보정

원본 기획서는 138일 기준 페이싱(가을편 D78~80, 겨울편 D136~138). 30일 게임 압축을 위해:

- **시나리오 재배치**: 가을편 → D14~16, 겨울편 → D24~26
- **전례 시간 반감**: `state.day × 4.5`를 가상 일자로 사용 (`engine/state.js#virtualDay`) → D30에 약 135일 도덕적 무게 체감
- **엔딩 임계 조정**: 빛/잊혀진 마을 임계를 5+에서 3+로 조정 (30일 스케일 보정)

## 검증된 동작 (수동 + 자동 플레이로 확인)

- ✓ D1 → D30 풀 사이클 도달 가능 (weightedSurvival 엔딩 도달)
- ✓ 빛의 마을 엔딩 도달 (D5 간병지속 + D6 의약품투입 + D26 자기희생기여 → 긍정 전례 3개)
- ✓ collapse 게임오버 도달 (사기 0 + 3일 조건)
- ✓ README 검증값 일치: D5 종혁 회복 보정 = 0.5500, D138 = 1.26025
- ✓ 비컨 7일 사이클 자동 회전 (통신 → 보급 → 피난민 → ...)
- ✓ 영수 사망 (D7 스크립트 데이의 yeongsuDies 트리거)
- ✓ 상승 나선 전이 (교감 → 결속 → 단합)

## 기술 스택

- HTML5 + CSS3 + 순수 JavaScript (ES2017+)
- 빌드 도구 없음, 의존성 없음
- 모든 파일 클래식 스크립트로 로드 (단일 `LR` 글로벌 네임스페이스)
- 한국어 폰트: Noto Sans KR (Google Fonts)
- localStorage 자동 저장 (매일 마감 시점)

## 원작 크레딧

- 기획: 김소연 (홍익대학교 대학원 게임 디자인)
- 지도: 김현석 교수
- 시스템 기획서: v1.2 (2026.04.23)
- 13일 시나리오: v3 (2026.04.23)
