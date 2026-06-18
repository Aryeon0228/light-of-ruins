# 표정 차분 (Expression Diffs) 가이드

대사 화자(결정창 `vd-runner`)의 얼굴이 감정에 따라 바뀝니다.
**그림이 없어도 게임은 그대로 동작**하며, 아래 규칙대로 PNG를 떨어뜨리면 자동으로 적용됩니다.

## 파일 네이밍

```
assets/images/portraits/<id>.png            ← 베이스(= neutral). 이미 존재.
assets/images/portraits/<id>_<emotion>.png  ← 표정 차분. 새로 그려서 넣으면 됨.
```

예) `miyeon_sad.png`, `sujin_smile.png`, `jaehyeok_angry.png`

## 감정 키(emotion) 8종

| 키 | 의미 | 쓰이는 순간(예) |
|----|------|----------------|
| `neutral` | 평상 (= 베이스 `<id>.png`, 따로 안 그려도 됨) | 기본 대사 |
| `smile` | 미소·안도 | 작은 승리, 긍정 전례 반응, "다행이다" |
| `sad` | 상심·슬픔 | 추모의 아침, 출산 상실(미연), "미안" |
| `angry` | 분노·냉정한 방어 | 부정 전례에 둔감한 인물, "어쩔 수 없었어" |
| `surprise` | 놀람 | "설마…", "어떻게?!" |
| `worry` | 불안·근심 | 부정 전례에 민감한 인물, "무서워졌어요" |
| `closed` | 눈 감음·체념·차분 | "…", 담담한 각오, 묵념 |
| `pain` | 고통 | 빈사 상태 대사(체력 < 20) |

> 캐릭터별로 8종을 다 그릴 필요는 없습니다. 자주 쓰는 것부터 — 보통 `sad / smile / worry / angry` 4종이면 체감이 크게 올라갑니다.

## 규격

- **크기/캔버스**: 베이스 포트레이트와 동일하게 **1254×1254 PNG(정사각, 투명 배경)**.
- **얼굴 위치**: 베이스와 똑같이 맞출 것. 결정창은 `object-fit: cover; object-position: top center`로 얼굴 위쪽을 보여줍니다. 머리·어깨 프레이밍이 베이스와 어긋나면 전환 시 튑니다.
- 제작 팁: 베이스 1장을 깔고 **눈·눈썹·입만 바꿔** 저장하면 차분이 됩니다(레이어 분리 = "차분"의 원리).

## 캐릭터 id 목록

`sujin · yeongsu · miyeon · jeonghun · jonghyeok · dongho · hayeong · eunseo · jaehyeok · minsu`
(`bc` = 비컨 통신기, 표정 없음)

## 감정은 어떻게 정해지나 (코드)

1. **명시 우선** — 대사 비트/데이터에 `emotion: 'sad'`가 있으면 그대로 사용.
   - 엔진이 부착해 둔 곳: 추모(수진 `sad`/재혁 `closed`), 출산 상실(미연 `sad`), 빈사 대사(`pain`), 전례 반응(긍정 `smile`/`neutral`, 부정 `worry`/`angry`).
   - 시나리오 데이터(`data/*.js`)의 대사도 `{ kind:'dialog', speaker, text, emotion:'smile' }`처럼 직접 지정 가능.
2. **없으면 추론** — `inferEmotion(text)`가 한국어 키워드로 추정(웃→smile, 미안/잃→sad, 무서/걱정→worry, …). 그림이 없는 감정이면 자동으로 베이스로 폴백.

## 2인 대화 배치 (좌/우 무대)

두 인물이 대화하면 한 명은 왼쪽, 한 명은 오른쪽에 서고 **말하는 사람이 밝게**, 듣는 사람은 어둡게 표시됩니다.

- **자동**: 한 노드에 등장 화자가 2명 이하면, 직전에 말한 다른 인물이 자동으로 상대편에 섭니다(기본 `face`=마주봄).
- **명시(데이터)**: 대사 비트에 `with`/`stance`로 직접 지정. 화자 3명 이상 노드(자동 꺼짐)거나 동조 연출을 원할 때 사용.
  ```js
  { kind:'dialog', speaker:'동호', emotion:'angry', with:'jaehyeok', stance:'face', text:'…' }  // 대립 → 마주봄
  { kind:'dialog', speaker:'수진', emotion:'sad',   with:'jaehyeok', stance:'with', text:'…' }  // 동조 → 같은 방향
  ```
  - `with`: 상대 인물 **id**(이름 아님). 예: `'jaehyeok'`.
  - `stance`: `'face'`(대립, 오른쪽 인물 좌우반전 → 서로 봄) / `'with'`(동조, 반전 없음 → 같은 방향). 생략 시 `face`.
- 엔진이 이미 적용한 곳: 전례 반응(민감↔둔감 = 대립), 추모(수진·재혁 = 동조), D1 재혁↔동호(대립).

> 캐비엇: 현재 그림이 **정면 흉상**이라 좌우반전만으로 "마주봄" 시선이 강하게 살진 않습니다. 강한 신호는 좌/우 배치 + 명암. 살짝 **측면각(3/4 view)** 으로 그리면 마주봄/나란히가 확 살아납니다.

## 빠른 시작

가장 효과 큰 6장만 먼저:
`miyeon_sad.png`, `sujin_sad.png`, `jaehyeok_closed.png`, (긍정 반응용) 아무 인물 `_smile.png`,
(부정 반응용) `_worry.png` / `_angry.png`.
넣고 새로고침하면 추모·전례·출산 장면에서 바로 보입니다.
