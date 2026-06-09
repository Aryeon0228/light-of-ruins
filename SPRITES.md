# 🎞️ 캐릭터 스프라이트 시트 가이드

마을 인물을 **풀캔버스 정지 그림 → 애니메이션 스프라이트**로 교체하기 위한 포맷·네이밍.
위치는 이미 코드(`PEOPLE_FILES`)에 좌표로 기억돼 있어서, 시트만 규격대로 올리면 그 자리에 앉아 움직여요.

## 📂 올릴 폴더
```
assets/images/sprites/
```
👉 업로드: https://github.com/aryeon0228/light-of-ruins/upload/main/assets/images/sprites

## 📐 시트 포맷 (중요)
- **가로 스트립**: 프레임을 **왼쪽→오른쪽**으로 이어붙임.
- **정사각 프레임** (권장 **256×256**, 다른 크기도 OK — 단 한 시트 안 프레임은 전부 동일 크기).
  - 정사각이면 프레임 수를 **자동 인식**해요 (시트 가로 ÷ 세로 = 프레임 수). 예: `1024×256` → 4프레임.
- **인물 발끝 = 프레임 하단 중앙**에 고정. 모든 프레임에서 같은 위치·같은 크기 (안 그러면 애니가 덜덜 떨려요).
- **배경 투명** PNG.
- 프레임 수: idle 2~4장, 동작 4~8장 (자유 — 정사각이면 몇 장이든 인식).

## 🗂️ 네이밍 — 인물별

| 인물 | idle (숨쉬기) | 특수 동작 (직업/사연) |
|---|---|---|
| 재혁 (리더·소방관) | `jaehyeok_idle.png` | `jaehyeok_watch.png` (망보기/지휘) |
| 수진 (의료·간호사) | `sujin_idle.png` | `sujin_tend.png` (간병) |
| 영수 (장로·지병) | `yeongsu_idle.png` | `yeongsu_rest.png` (자리에 누움) |
| 은서 (미래세대·탐색) | `eunseo_idle.png` | `eunseo_harvest.png` (텃밭 수확) |
| 정훈 (요리사) | `jeonghun_idle.png` | `jeonghun_cook.png` (솥 요리) |
| 미연 (임산부) | `miyeon_idle.png` | `miyeon_sit.png` (앉아 쉼) |
| 동호 (건축기사) | `dongho_idle.png` | `dongho_build.png` (망치질/수리) |
| 하영 (체육교사·행동가) | `hayeong_idle.png` | `hayeong_exercise.png` (아침 운동) |
| 종혁 (전기기사·부상) | `jonghyeok_idle.png` | `jonghyeok_fix.png` (전기 수리) |
| 민수 (아이) | `minsu_idle.png` | `minsu_draw.png` (그림 그리기) |

- **idle은 전원 공통** — 한 명만 있어도 다른 idle 없는 인물은 정지 그림으로 폴백돼요(안 깨짐).
- 특수 동작 이름은 바꿔도 됨 — 올린 파일명 그대로 코드에 매핑할게요.

## ⏱️ 재생 (코드에서 처리)
- idle: 느리게 루프(약 0.7~1s/프레임 느낌)
- 특수 동작: 빠르게 루프(약 0.12~0.2s/프레임) — 작업하는 느낌
- 속도·루프 방식은 올라온 거 보고 인물별로 맞출게요.

## ✅ 순서
1. 위 이름으로 시트를 `assets/images/sprites/`에 올림 (idle부터, 한 명씩이라도 OK)
2. 제가 **스프라이트 렌더 시스템**으로 전환 + 각 인물 좌표(이미 기억함)에 앉히고 애니 속도 튜닝
3. 정지 그림(풀캔버스)은 폴백으로 유지 → 점진 교체, 안 깨짐
