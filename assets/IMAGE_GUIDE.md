# 이미지 제작 가이드

이 폴더는 게임의 시나리오 일러스트와 컷씬 이미지를 담습니다.
지금은 SVG placeholder가 들어 있어요. 실제 일러스트로 교체하면 됩니다.

## 폴더 구조

```
assets/images/
├── scenarios/    ← 시나리오 헤더 일러스트 (1장씩)
├── cutscenes/    ← SW · 이벤트 컷씬 (시퀀스 여러 장)
└── portraits/    ← 인물 초상 (선택, 향후 캐릭터 카드 강화용)
```

## 이미지 권장 사양

| 용도 | 비율 | 권장 해상도 | 형식 |
|---|---|---|---|
| 시나리오 헤더 | 16:7 | 1600×700 또는 1920×840 | JPG / WebP |
| 컷씬 프레임 | 16:9 | 1600×900 또는 1920×1080 | JPG / WebP |
| 인물 초상 | 1:1 | 512×512 | PNG (투명 배경) |

JPG 권장 (WebP가 더 가볍지만 호환성 약간 낮음). 한 장 200~500KB 사이가 적당해요. 너무 무거우면(1MB+) 모바일 로딩이 느려져요.

## 파일명 → 게임 매핑

현재 파일럿 두 곳이 이미지 경로를 참조합니다.

| 게임 안 위치 | 파일 경로 | 톤 |
|---|---|---|
| **D26 스크립트 데이** (정점) | `scenarios/d26_soundproof.jpg` | 무거운 — 자기희생, 어두운 빛 |
| **SW-3 정훈의 작은 간식** (컷씬 1) | `cutscenes/sw3_1.jpg` | 약간 코믹 — 비축 꺼내는 정훈 |
| **SW-3 컷씬 2** | `cutscenes/sw3_2.jpg` | 따뜻 — 김 오르는 국 한 솥 |
| **SW-3 컷씬 3** | `cutscenes/sw3_3.jpg` | 코믹 — 동호의 의외의 한 입 |

**파일을 교체할 때**는 같은 이름·같은 경로로 덮어쓰기만 하면 됩니다. 코드 수정 불필요. (단, 확장자가 .svg → .jpg로 바뀐다면 두 파일을 수정해야 해요: `data/scripted.js`의 `image:` 줄, `data/small-wins.js`의 cutscene frames `image:` 줄들. 검색-바꾸기 한 번이면 끝.)

## AI 이미지 생성 프롬프트 (스타일 일관성 확보)

게임 톤이 **무거운 리얼리즘 + 한국적 정서 + 약간의 인간미**라서, 다음 베이스 프롬프트를 모든 이미지에 공통으로 사용하세요. 각 장면 묘사만 바꿔서.

### 공통 스타일 토큰 (영문 — Midjourney/DALL-E/SD)

```
korean post-apocalyptic survivors, 2020s real-world setting, abandoned urban factory shelter, muted warm-cool palette (deep blue + amber + ash), soft volumetric lighting, painterly digital illustration, cinematic composition, restrained mood, This War of Mine inspired, Studio Ghibli emotional restraint, 16:9
```

### 한국어 버전 (한국어 지원 모델용)

```
한국 좀비 종말 생존자들, 2020년대 현실 배경, 버려진 도시 외곽 폐공장 거점, 차분한 따뜻+차가운 톤(짙은 청색·호박색·재색), 부드러운 입체 조명, 페인터리 디지털 일러스트, 시네마틱 구도, 절제된 정서, This War of Mine 분위기, 16:9 비율
```

### 장면별 프롬프트 (베이스에 덧붙이세요)

#### D26 — 종혁의 방음 칸막이 (무거운 정점)

```
[base style], an older man in his 50s with a bandaged right arm, working on building a wooden soundproof partition inside a factory shelter, by lamp light at night, sawdust in air, careful concentration, sense of quiet sacrifice, baby crib visible in background, tools laid out neatly
```

> 인물 명세: 종혁(55세, 오른팔 부상). 분위기: 조용한 헌신. 배경: 폐공장 내부, 등불, 아기 요람이 멀리 보임.

#### SW-3 컷씬 1 — 정훈의 비축 꺼내기 (코믹 시작)

```
[base style], a 45-year-old man (cook) sneakily retrieving dried herbs from a cloth bag in a corner of a pantry, glancing sideways with a slight grin of guilty pleasure, warm side light from a lantern, mood: small mischief, tiny hope
```

> 인물 명세: 정훈(45세, 요리사). 분위기: 살짝 짓궂음. 살짝 웃음.

#### SW-3 컷씬 2 — 김 오르는 국 한 솥

```
[base style], a humble pot of stew steaming on a small camp stove inside the shelter, golden warm light, no people in frame, focus on rising steam swirls, restrained warmth, evening mood
```

> 분위기: 따뜻함, 절제. 인물 없이 국과 김만.

#### SW-3 컷씬 3 — 동호의 첫 한 입

```
[base style], a serious 40-year-old man in a faded jacket taking his first spoonful of stew, brow furrowed but expression softening just slightly, the cook (정훈) standing in the background nodding without expression, candlelight, mood: reluctant comfort, small humor
```

> 인물 명세: 동호(40세, 회의론자) 전경, 정훈 후경. 분위기: 마지못한 위안 + 작은 유머.

## 톤 일관성 팁

1. **같은 모델·같은 시드 / 비슷한 시간대에 일괄 생성** — 모델 업데이트되면 톤이 흔들려요.
2. **이미지 1장당 4~6개 변형 받아서 베스트 1장 고르기** — 프롬프트 가챠 줄임.
3. **Reference image 사용 가능한 모델이라면**, 첫 장이 마음에 들면 그것을 reference로 다음 장 생성. Midjourney `--cref` 또는 DALL-E "make this match style of...".
4. **사용자님 직접 그리실 부분**과 AI 생성 부분의 톤이 다르면 안 어울려요. AI 먼저 한두 장 뽑아서 톤 정한 뒤, 직접 그리실 부분의 색상·라인 두께를 거기 맞추세요.

## 라이선스 / 저작권

- AI 생성: 사용한 모델의 라이선스 확인 (Midjourney/DALL-E는 상업적 사용 OK, 일부 SD 모델은 제한)
- 직접 그리시는 부분: 본인 저작권
- 학과 과제 제출용으로는 둘 다 문제없음
- 만약 추후 외부 공개·출판한다면 모델 라이선스 재확인 권장

## 다음 단계

1. 위 4장(D26 + SW-3 cutscene 3장) 먼저 만들어 보세요.
2. 만든 일러스트를 같은 파일명으로 덮어쓰면(.jpg 또는 .svg) 즉시 게임에 반영됩니다.
3. 톤이 게임과 잘 맞으면 → 다른 시나리오·SW에도 같은 스타일로 확장.
4. 톤이 어색하면 → 프롬프트 조정 후 재생성. 4장만 다시 그리면 되니 비용 거의 없음.
