# 스토리 모드용 신규 배경 19종 (마누스 산출물)

2026-11-21, 공용 채팅방에 마누스가 올린 ZIP
`https://files.manuscdn.com/user_upload_by_module/session_file/310519663912573806/wwHUxYHENOoonrdz.zip`
을 내려받아 검수·반영한 파일들입니다. **아직 어느 코드에서도 참조하지 않습니다**(맵 id가 MAPHAS/MAP_DEFS에 없음).

## 파일

- 본 이미지: `assets/maps/{id}.jpg` — 720×1280 JPEG(RGB), 15~27KB
- 썸네일: `assets/maps/t/{id}.jpg` — 240×427 JPEG, 기존 썸네일 규격(240×427)에 맞춰 LANCZOS 리사이즈로 생성
- id 19종: `alley` `pond` `burrow` `hatchery` `wheatfield` `octocave` `fruitfarm` `savanna`
  `halloween` `slimemarsh` `boxing` `mansionclean` `ruins` `oldinn` `hospital`
  `sharkbay` `trench` `vcastle` `demonking`

## v2 (2026-11-21) — 16비트 픽셀아트로 전면 교체

- 마누스의 도형 플레이스홀더 19장을 **16비트 SNES/GBA 픽셀아트 배경 19장으로 다시 그려 교체**했습니다.
  기존 정식 45맵(`fuji.jpg` 등)과 같은 톤·픽셀 밀도·세로 구도(아래→위로 올라가는 층 구성)를 맞췄습니다.
- 규격: 본 이미지 `assets/maps/{id}.jpg` — 720×1280 RGB JPEG(4:2:0), 238~278KB / 썸네일 `assets/maps/t/{id}.jpg` — 240×427, 34~38KB
- 19장 비교 시트: `/workspace/tmp_story_bg_v2/contact_sheet_v2.png` (작업 워크스페이스)
- 검수: 전 19장 텍스트·UI·인물 없음(석상·허수아비·잠수정 등 배경 소품만), 어두운 테마(동굴·심해·마왕성)도
  발판이 묻히지 않도록 중간 톤과 발광 하이라이트를 남겼습니다.
- `burrow`는 맵 기믹(굴 구간 암흑 시야)에 맞춰 하단부가 어둡습니다.

## 참고

- 아래는 v1(마누스 ZIP) 당시 기록입니다. 파일은 위 v2로 덮어썼습니다.
- 경로가 루트 `assets/` 인 이유: `muse-v5-9/index.html`이 `<base href="../">`라 상대 경로 `assets/maps/…`가
  저장소 루트로 해석됩니다. `muse-v5-9/assets/` 아래에 두면 로드되지 않습니다.
- 효과음 5종(`dlg_tick`, `boss_warn`, `boss_hit`, `boss_ko`, `unlock`)은 `audio/sfx/`에 함께 반영했습니다.
