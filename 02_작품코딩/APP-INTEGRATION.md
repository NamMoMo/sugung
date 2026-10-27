# 3조 마음의 물결 · 수궁야행 DB 연결

## 전시 PC 실행

1. 이 폴더 전체를 전시 PC에 복사합니다. Python 3.9 이상과 Chrome/Edge를 준비합니다.
2. `.env.example`을 `.env`로 복사합니다. `ROOM_SIGNAL_KEY`에는 Supabase `room_booths`의 **`room_id=conflict`** 전용 키를 넣습니다. 1·2·4조 키를 쓰지 않습니다.
3. `실행하기.bat`를 더블클릭합니다. 서버 창은 유지합니다. 서버는 localhost에만 열립니다.
4. 모바일 앱에서 두 갈래 길의 QR(수동 부스 코드 **1002**)을 인증하면 해당 관객이 연결됩니다. PC에서 ‘카메라 연결 후 시작하기’를 누르고 웹캠을 허용합니다. 카메라 권한/소리 활성화를 위한 브라우저 사용자 동작입니다.
5. 전시 PC를 바꾸면 `.env`도 별도로 옮깁니다. `.env`는 Git에 포함되지 않으며 HTTP 다운로드도 차단됩니다. 키를 QR에 넣지 않습니다.

현재 로컬 .env 설정과 중앙 Supabase의 `../supabase/202610270009_wave_station.sql` 적용을 마쳤습니다. 새 PC 복사 시 SQL을 반복 적용할 필요는 없습니다. 이 SQL은 기존 수궁야행 프로필·방·완료 테이블과 `booth_selections`가 있는 중앙 프로젝트를 대상으로 합니다.

## 체험 흐름

- 대기자 명단이나 운영자 참가자 선택은 없습니다. 빈 부스 QR 인증 시 즉시 방문 기록이 연결됩니다.
- 체험 중 다른 관객의 일반/개발자 QR 입장은 `ROOM_BUSY`로 거절합니다. 모바일의 기존 한·영 안내가 표시됩니다.
- 모바일 ‘체험중지’를 약 2초 간격 상태 조회로 확인하고 초기 화면으로 돌아갑니다.
- 운영 설정(D)에서 닉네임·참가자 코드를 확인합니다. ‘처음으로’는 연결 체험을 중지하고 완료는 기록하지 않습니다.
- **7문항 → 단어 잡기(15개 또는 손이 보이는 누적 60초) → 결과 영상 → 빛의 길 → 엔딩 영상 종료** 시점에 완료를 저장합니다. 점수가 보이는 순간에는 아직 완료하지 않습니다.
- 저장 실패 시 결과 화면을 유지하고 재시도 버튼을 표시합니다. 동일 참가자·동일 결과 재전송은 중복 완료를 만들지 않습니다. 저장 중에는 새로고침하지 마세요.
- 저장 후 원래 완료 화면을 유지하고 처음으로 돌아갑니다. 새 QR을 받으면 새 참가자로 초기화합니다.
- 마우스 미리보기/입력 전환, 2~5 단축키, 진단 훅 사용은 DB 완료에서 제외합니다. 앱 개발자 QR 입장 자체는 카메라 체험의 정상 저장을 막지 않습니다.

## 저장 데이터

`room_visits.result`와 `room_completions.result`에 같은 JSON을 저장합니다.

| 필드 | 내용 |
|---|---|
| schema_version / room_id / team_id | 1 / conflict / 3 |
| completion_mode / input_mode | normal / camera |
| started_at / finished_at / duration_ms | 체험 시작·엔딩 종료·소요 시간 |
| questions | 문항 인덱스·분류·선택 단어·방향 7개 |
| selected_keywords | 질문 순서의 단어 7개 |
| captured_counts / captured_total | 단어별 횟수·총 수집 횟수(0~15) |
| last_captured_word | 마지막 수집 단어, 수집이 없으면 빈 문자열 |
| rain_active_ms / rain_end_reason | 손이 보인 단어 잡기 시간 / capture_target 또는 active_time_limit |
| scores | development·stability·selection·capture·total·tie |
| outcome | side·label·value·realm·bias·strength |
| summary | keywords와 최종 result |
| history | 시간순 choice(질문 인덱스·단어·시각) / capture(단어·제스처·시각) |

질문 1개 선택=1점, 단어 1회 수집=1점, 최대 22점입니다. 60초 종료 시 0~14개 수집도 정상 결과입니다. 동점이면 마지막 수집 단어, 없으면 마지막 질문의 방향을 따릅니다. 학생 최종본의 `config.js`·`word-scores.json`을 유지하고 서버/DB에서 점수를 재검증합니다. 카메라 영상이나 사진은 저장하지 않습니다. 2조 결과를 4조에 넘기는 항목 변환은 별개입니다.

전체 JSON 예시는 `tests/result-fixtures.json`에 있습니다. 실제 관객 정보가 없는 자동 테스트용 예시입니다.

## 코드 및 검증

- `station.js`: 관객 연결·결과 JSON·중지·완료·재시도.
- `station_server.py`: Python 서버의 Supabase RPC 브리지·검증.
- `serve.py`: 기존 byte-range 영상 서버 유지, 로컬 API 추가.
- `개발자료/app-main.js` 수정 후 `python 개발자료/build.py`로 `app.js` 갱신. DB 훅도 원본 템플릿에 포함됩니다.
- `python -m unittest discover -s tests -p "test_*.py" -v`
- Node가 있는 개발 PC: `node --test tests/station.test.cjs tests/app-flow.test.cjs`
- `../supabase/verify-wave-station.sql`: 검증 참가자를 만들었다가 전체 롤백합니다. 실제 관객 기록은 유지됩니다.

물리 웹캠 거리·조명·제스처 검수는 실제 전시 PC에서 진행해야 합니다. 자동 테스트는 카메라/시간/영상 모의 객체, 로컬 HTTP, 실제 Supabase의 롤백 검증을 사용합니다.
