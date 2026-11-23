# v5.9 효과음 시안 점검

## 1차 4종 + 2차 5종

| 파일 | 원본 길이 | 원본 피크 | 원본 평균 | 정규화 목표 | 비고 |
|---|---:|---:|---:|---:|---|
| ice_slide.mp3 | 1.23 s | -0.0 dBFS | -14.0 dB | -4 dBFS | 루프 시안; 경계 페이드 필요 |
| glass_break.mp3 | 0.52 s | -17.6 dBFS | -39.3 dB | -1 dBFS | 원본이 매우 작음 |
| jelly_bounce.mp3 | 0.52 s | -0.3 dBFS | -14.5 dB | -1 dBFS | 약간 감쇠 |
| spike_hit.mp3 | 0.52 s | -33.5 dBFS | -47.1 dB | -1 dBFS | 원본이 매우 작음 |
| boss_intro.mp3 | 1.23 s | -0.1 dBFS | -5.1 dB | -1 dBFS | 약간 감쇠 |
| boss_phase.mp3 | 1.52 s | 0.0 dBFS | -10.6 dB | -1 dBFS | 클리핑 방지 감쇠 |
| boss_defeat.mp3 | 1.65 s | -0.0 dBFS | -11.7 dB | -1 dBFS | 클리핑 방지 감쇠 |
| game_over.mp3 | 1.41 s | -4.1 dBFS | -19.1 dB | -1 dBFS | 약간 증폭 |
| countdown.mp3 | 1.23 s | 0.0 dBFS | -5.5 dB | -1 dBFS | 클리핑 방지 감쇠 |

정규화본은 `normalized/`에 만들었으며 원본과 라이브 코드는 변경하지 않았다.

## iPhone Safari 점검

- 첫 제스처 unlock: 코드에 `pointerdown` 기반 `ctx.resume()` 호출과 `pointerdown/touchstart/keydown` 기반 `resumeAudio()`·`bgmUnlock()` 호출이 확인된다. 따라서 사용자가 화면을 처음 탭하면 재개를 시도한다.
- 무음 스위치: 웹 페이지가 iPhone 하드웨어 무음 스위치를 우회할 수는 없다. `muted` 속성/앱 음소거 토글은 BGM을 끄는 기능일 뿐, 하드웨어 무음 스위치 우회 처리가 확인된 것은 아니다. 기기에서 벨소리/무음 스위치별로 직접 확인해야 한다.
- 백그라운드 복귀: `visibilitychange`는 성능 게이트용으로만 확인된다. 오디오 복귀는 다음 사용자 `pointerdown`에서 `resumeAudio()`를 호출하는 구조가 확인되며, `visibilitychange` 자체에서 `AudioContext.resume()`을 호출하는 명시적 처리는 확인되지 않는다. 백그라운드에서 돌아온 직후 첫 탭으로 재개되는지 테스트가 필요하다.
- 권장 iPhone 체크: (1) 무음 스위치 OFF 상태에서 첫 탭 후 점프음/BGM, (2) 무음 스위치 ON 상태에서 같은 테스트, (3) Safari 앱 전환 후 복귀하여 첫 탭 전후, (4) BGM OFF/ON 설정과 효과음 독립성, (5) 얼음 루프 경계 틱·볼륨.

## 최종 balanced 비교본

`balanced/`에 라우드니스 정규화본을 만들었다. 짧은 효과음은 약 -14 LUFS 부근으로 맞췄고, 얼음은 -18.4 LUFS로 낮췄다. `spike_hit`는 디지털 풀스케일 방지를 위해 추가로 -1.5 dB 감쇠했으며, 얼음은 양 끝 30 ms를 0으로 페이드해 루프 경계 틱을 줄였다. 원본과 라이브 코드는 변경하지 않았다.

| 파일 | 길이 | LUFS | 피크(정규화본 측정) | 루프 |
|---|---:|---:|---:|---|
| ice_slide.mp3 | 1.23초 | -18.4 | 약 -10.7 dBFS | 예 |
| glass_break.mp3 | 0.52초 | -14.9 | -1.5 dBFS | 아니오 |
| jelly_bounce.mp3 | 0.52초 | -14.4 | -3.4 dBFS | 아니오 |
| spike_hit.mp3 | 0.52초 | 약 -14.3 | 약 -1.5 dBFS | 아니오 |
| boss_intro.mp3 | 1.23초 | -14.4 | -7.2 dBFS | 아니오 |
| boss_phase.mp3 | 1.52초 | -14.4 | -6.1 dBFS | 아니오 |
| boss_defeat.mp3 | 1.65초 | -14.4 | -7.0 dBFS | 아니오 |
| game_over.mp3 | 1.41초 | -14.4 | -3.6 dBFS | 아니오 |
| countdown.mp3 | 1.23초 | -14.4 | -11.7 dBFS | 아니오 |

### iPhone 체크리스트

1. 첫 `pointerdown`/`touchstart` 후 점프음과 BGM이 재생되는지 확인한다. 코드에는 suspended Web Audio context에 `resume()`을 호출하는 경로가 있다.
2. iPhone 하드웨어 무음 스위치는 웹 페이지가 우회할 수 없으므로 ON/OFF 양쪽을 별도 기록한다. 페이지의 BGM `muted` 토글과 혼동하지 않는다.
3. Safari를 백그라운드로 보냈다가 돌아온 뒤 첫 사용자 탭에서 `resumeAudio()`가 재개되는지 확인한다. `visibilitychange` 자체에서 명시적 `AudioContext.resume()`은 확인되지 않았다.
4. BGM OFF/ON과 효과음이 독립적인지, 얼음 루프를 3회 반복해 틱/볼륨 튐이 없는지, 5종 보스·게임오버·카운트다운을 실제 상황에서 확인한다.
