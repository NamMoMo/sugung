# 2조 · 용왕님의 보물의 방 · 앱/DB 연동

기존 안개·상자·여섯 선택·봉인·탈출·결과 수정 기능을 유지합니다. QR 없이 원래 안개·문 화면에서 바로 체험합니다. 시작 전에 관객이 선택적으로 연결되어 있으면 시작·완료·결과를 DB에 기록합니다. 조 번호는 2조이며 관람 순서는 세 번째 파트입니다. DB `room_id`는 `self-knowledge`입니다.

## 설정

1. Supabase 기존 005/006 적용 후 저장소 루트 `supabase/202610260008_treasure_station.sql`을 SQL Editor에서 실행합니다.
2. `.env.example`을 `.env`로 복사하고 공개 Supabase 키를 입력합니다. `ROOM_SIGNAL_KEY`에는 `room_booths`의 `self-knowledge` 행 키만 입력합니다. 1조 키를 재사용하지 않습니다.
3. `VITE_TREASURE_STATION_ENABLED=true`를 설정하고 `npm ci`, `npm test`, `npm run build`를 실행합니다.
4. `npm run preview -- --port 4176 --strictPort`로 실행해 `http://127.0.0.1:4176/`를 엽니다. 비밀 키나 서버 코드 변경 후 서버를 재시작해야 합니다. 서버를 계속 실행해 둡니다.

`ROOM_SIGNAL_KEY`는 서버에서만 사용하며 `VITE_` 접두사를 붙이지 않습니다. `.env`와 `node_modules`, `dist`는 Git에 올리지 않습니다. 공개 키는 클라이언트 공개용 키이며 service_role 키는 사용하지 않습니다.

CLI 로그인 후에는 SQL Editor 대신 코드 폴더에서 아래 명령으로 같은 파일을 적용할 수 있습니다. CLI의 로컬 연결 캐시는 Git에서 제외합니다.

```sh
npx supabase@2.122.0 db query --linked --project-ref gdkrsirsiijdkhiwsltf --file ../supabase/202610260008_treasure_station.sql
```

## 흐름

- QR 안내·별도 대기 화면과 실행 잠금이 없습니다. QR/DB 연결이 없어도 기존 안개·문·상자 체험을 실행합니다.
- 참가자 기록이 필요하면 시작 전에 모바일 QR 또는 코드 `1003`으로 관객을 연결합니다. 실제 안개/문 첫 조작 시 연결된 visit_id를 고정하고 `room_visits.experience_started_at`에 시작을 기록합니다. QR만 인증한 시각과 구분합니다.
- 체험 중 QR이나 모바일 중지 상태가 달라져도 작품을 초기화하지 않습니다. 중간에 들어온 새 관객에게 진행 중인 결과를 붙이지 않습니다.
- 여섯 선택·봉인·탈출 후 결과 화면에서 완료와 결과를 저장합니다. 연결 관객이 없으면 임의 개인 기록을 만들지 않습니다.
- ‘선택 돌아보기’의 수정 결과 저장과 revision 순서, 최초 완료 시각·체험 시간 보존은 유지합니다.
- ‘다음 관람객’·처음으로·무입력 초기화는 DB 저장을 기다리지 않고 원래 화면으로 즉시 돌아갑니다. 미저장 결과는 원래 참가자에 고정하여 재시도합니다. 이 동안 새 실행은 단독 체험으로 진행할 수 있습니다.
- DB 연결 상태·기기 코드 입력·저장 재시도는 좌측 하단 **운영 · DB** 안에 있습니다. 전체 화면을 덮거나 조작을 잠그지 않습니다.
- 공개 PWA의 기기 인증은 서버 DB 접근용으로 유지합니다. 기기 인증을 하지 않아도 작품은 실행되며, 개인 기록 연결만 사용할 수 없습니다. 인증을 체험 중 설정해도 현재 체험을 재시작하거나 새 관객에게 연결하지 않습니다.
- 1인 방문 연결과 선행 완료 조건은 모바일/DB에 유지합니다. 해당 규칙은 전시 PC의 작품 실행을 차단하지 않습니다.

공통 시작 기록 SQL `../supabase/202610270011_optional_station_start.sql`은 중앙 DB에 적용했습니다. 코드 변경은 공개 PWA에 재배포해야 반영됩니다.

## 저장 결과

`room_visits.result`와 `room_completions.result`에 같은 최신 JSON을 저장합니다.

- `schema_version`, `room_id`, `team_id`, `revision`
- `answers`: 세 상자의 원본 선택 ID 여섯 개
- `selections`: 상자/장면/선택 ID, 분류 이름, 행동 문구, 보물 이름과 설명
- `selected_actions`: 실제 선택 행동 여섯 개. 향후 4조 변환의 원본으로 사용할 수 있습니다.
- `summary`: 분류 키워드와 보물 이름
- `result_code`: 기존 QR 결과 코드
- `history`: 최초 선택부터 결과 수정까지의 순서·선택 ID·시각·경과 시간
- `seals_count`, `seal_placements`: 여섯 봉인의 해제 결과
- `started_at`, `finished_at`, `updated_at`, `duration_ms`, `language`

실제 체험 시간은 첫 상호작용부터 최초 결과 화면 도착까지입니다. 수정 이력은 그 이후에도 추가됩니다. PNG·카메라·음성은 저장하지 않습니다.

## 운영 범위

### 공개 PWA

- 공개 주소: `https://sugung-room2.pages.dev/`
- Chrome 메뉴의 앱 설치 또는 화면의 ‘앱 설치’로 독립 창에 설치합니다. 가로 화면을 기준으로 합니다.
- 공개 버전에서 DB 연결을 사용할 때 운영 · DB 안에 처음 한 번 12자리 기기 연결 코드를 입력합니다. 연결은 Secure/HttpOnly 쿠키로 1년간 유지되며, 브라우저 데이터를 지우거나 기기 인증 비밀값을 바꾸면 재연결합니다.
- 최초 연결 코드는 운영 PC의 Git 제외 파일 `.station-pairing-code`에 보관합니다. 참가자에게 배포하는 부스 코드 `1003`과 별개입니다.
- Cloudflare Secrets에 `ROOM_SIGNAL_KEY`, `STATION_PAIRING_CODE`, `STATION_SESSION_SECRET`을 설정합니다. 이 값은 코드·manifest·서비스 워커에 포함하지 않습니다.
- Worker가 DB API를 처리하므로 공개 PWA를 실행할 때 원래 로컬 PC 서버를 켜둘 필요가 없습니다. 작품의 한 부스에는 전시 기기 한 대를 사용합니다.
- 기존 결과지 링크는 기기 연결 없이 읽기 전용으로 열립니다. 공개 주소에서 생성한 결과 QR은 다른 기기에서도 열 수 있습니다.
- 오프라인에서는 연결 안내를 표시합니다. 입장·완료·수정 결과 저장에는 인터넷이 필요하며, API 응답이나 참가자 정보를 서비스 워커에 캐시하지 않습니다. 업데이트는 진행 중인 체험을 강제로 새로고침하지 않습니다.

코드 폴더에서 `npm run build` 후 `wrangler pages deploy dist --project-name sugung-room2 --branch 2조`로 배포합니다. `wrangler.toml`에는 공개 설정만 넣고, 비밀값은 Cloudflare Secrets로 별도 저장합니다.

### 로컬 전시 PC

로컬 DB 모드는 전시 PC의 Vite 개발/preview 서버에 포함된 로컬 API가 필요합니다. 공개 배포는 생성된 `_worker.js`까지 지원하는 Cloudflare Pages 구성이 필요하며, 일반 정적 파일 서버에 `dist`만 올리면 DB API가 동작하지 않습니다. DB 설정이 누락되거나 연결이 끊겨도 다른 관객으로 임의 연결하지 않습니다.

환경변수를 설정하지 않은 기본 빌드는 기존 독립 체험입니다. 기존 `#treasures=v1.…` 결과 링크는 DB와 연결하지 않는 읽기 전용 화면을 유지합니다. 로컬 실행으로 생성한 QR의 localhost 주소는 관객 휴대전화에서 열 수 없으므로, 결과지 QR의 공개 주소 운영은 별도 배포 설정이 필요합니다.

이번 변경은 4조의 작품, KV, 결과 변환 함수, 모바일 앱의 4조 자동 이동 설정을 변경하지 않습니다. 전시 기기의 네트워크 연결과 실제 모바일 QR·터치는 현장에서 확인합니다.
