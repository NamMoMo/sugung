# 3조 마음의 물결 · 수궁야행 DB 연결

## 전시 PC 실행

1. 이 폴더 전체를 전시 PC에 복사합니다. Python 3.9 이상과 Chrome/Edge를 준비합니다.
2. `.env.example`을 `.env`로 복사합니다. `ROOM_SIGNAL_KEY`에는 Supabase `room_booths`의 **`room_id=conflict`** 전용 키를 넣습니다. 1·2·4조 키를 쓰지 않습니다.
3. `실행하기.bat`를 더블클릭합니다. 서버 창은 유지합니다. 서버는 localhost에만 열립니다.
4. QR 없이 원래 시작 화면에서 ‘카메라 연결 후 시작하기’를 누르면 바로 체험할 수 있습니다. 카메라 권한을 허용합니다. 마우스 미리보기도 그대로 사용할 수 있습니다.
5. 참가자별 기록이 필요하면 시작 전에 모바일의 두 갈래 길 QR(수동 코드 **1002**)로 관객을 연결합니다. 연결은 선택 사항이며 작품을 차단하지 않습니다.
6. 전시 PC를 바꾸면 `.env`도 별도로 옮깁니다. `.env`는 Git에 포함되지 않으며 HTTP 다운로드도 차단됩니다. 키를 QR에 넣지 않습니다.

현재 로컬 .env 설정과 중앙 Supabase의 `../supabase/202610270009_wave_station.sql`, `202610270010_wave_optional_link.sql` 적용을 마쳤습니다. 새 PC 복사 시 SQL을 반복 적용할 필요는 없습니다. 이 SQL은 기존 수궁야행 프로필·방·완료 테이블과 `booth_selections`가 있는 중앙 프로젝트를 대상으로 합니다.

## 체험 흐름

- 별도 QR 대기 화면, 참가자 선택, QR 입장에 따른 실행 잠금이 없습니다. 원래 작품의 시작 화면만 표시합니다.
- QR이나 DB 연결이 없어도 정상 카메라 체험·마우스 미리보기를 실행할 수 있습니다.
- 시작 버튼을 눌러 카메라가 준비된 시점에 이미 연결된 관객만 해당 실행에 묶습니다. `room_visits.experience_started_at`에 시작 시각을 기록합니다. QR 인증만으로는 이 시각을 기록하지 않습니다.
- 체험 도중 새로운 QR이 들어와도 작품을 초기화하거나, 진행 중인 체험을 새 관객에게 붙이지 않습니다. 새 연결은 다음 체험에서 사용합니다.
- 모바일에서 체험을 중지해도 전시 PC의 작품은 중단하지 않습니다. 해당 방문의 완료 저장만 거절됩니다.
- **7문항 → 단어 잡기(15개 또는 손이 보이는 누적 60초) → 결과 영상 → 빛의 길 → 엔딩 영상 종료** 시점에 연결된 관객의 완료와 결과를 저장합니다.
- 연결 관객이 없던 체험은 작품만 진행하며 임의 관객·완료 기록을 만들지 않습니다.
- 저장 실패 정보와 재시도는 운영 설정(D) 안에서만 표시합니다. 결과 데이터는 재시도용으로 유지하지만 완료 화면의 자동 복귀와 다음 작품 실행을 막지 않습니다.
- 운영 설정(D)에서 작품 상태, 연결 관객, 저장 오류를 확인합니다. ‘처음으로’는 화면을 즉시 초기화하고 해당 실행에 연결했던 방문의 중지를 요청합니다. DB 오류가 있어도 화면을 잡아두지 않습니다.
- 마우스 입력 전환, 2~5 단축키, 진단 훅 사용은 DB 완료에서 제외합니다. 앱 개발자 QR 입장 자체는 카메라 정상 체험 저장을 막지 않습니다.
- 관객 연결의 중복 방지를 위한 DB 단일 방문 규칙은 유지합니다. 이 규칙은 작품 실행 여부와 분리되어 있습니다.

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

- `station.js`: 선택적 관객 연결·실제 시작 기록·결과 JSON·중지·완료·재시도. 작품 실행 허가는 판단하지 않습니다.
- `station_server.py`: Python 서버의 Supabase RPC 브리지·검증.
- `serve.py`: 기존 byte-range 영상 서버 유지, 로컬 API 추가.
- `개발자료/app-main.js` 수정 후 `python 개발자료/build.py`로 `app.js` 갱신. DB 훅도 원본 템플릿에 포함됩니다.
- `python -m unittest discover -s tests -p "test_*.py" -v`
- Node가 있는 개발 PC: `node --test tests/station.test.cjs tests/app-flow.test.cjs`
- `../supabase/verify-wave-station.sql`: 검증 참가자를 만들었다가 전체 롤백합니다. 실제 관객 기록은 유지됩니다.

물리 웹캠 거리·조명·제스처 검수는 실제 전시 PC에서 진행해야 합니다. 자동 테스트는 카메라/시간/영상 모의 객체, 로컬 HTTP, 실제 Supabase의 롤백 검증을 사용합니다.
