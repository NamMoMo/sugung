# 수궁야행 앱 ↔ 4조 연결 기반

## 구현 상태

Supabase는 참가자·입장·결과·완료의 원본입니다. Cloudflare KV는 앱 연동 참가자의 스크린 표시 데이터만 보관합니다. 기존 직원 화면과 시험용 참가 번호는 그대로 유지합니다.

앱 → 부스 QR 입장 → Supabase 발급 4시간 유효 입장 티켓 → 작품 → 결과 저장 → KV 스크린 표시 → 완료 버튼 → 앱 방 선택 화면.

아직 3번 방 결과 규격이 미정입니다. 실제 연결에서는 항목을 임의 생성하지 않고 ‘3번 방 결과 연결 준비 중’을 표시합니다. 따라서 현재 준비한 것은 연결 기반이며 실제 관객의 전체 체험 개통은 아닙니다.

## 담당자 설정 순서

1. 수궁야행 앱 저장소의 `supabase/migrations/202610240004_lantern_bridge.sql`을 Supabase SQL Editor에서 실행합니다. 기존 001~003 이후에 적용합니다.
2. 같은 저장소의 `supabase/verify-lantern-bridge.sql`을 실행합니다. 테스트 데이터는 전부 롤백됩니다. 결과가 PASS인지 확인합니다.
3. Cloudflare Pages `sugung-roomb`의 Production 환경변수에 `.env.example`의 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ROOM_SIGNAL_KEY`를 설정합니다. 마지막 값은 Supabase `room_booths`의 `lantern-dream` 행에 있는 `signal_key`입니다. `service_role`은 필요하지 않습니다. 비밀 키를 GitHub, HTML, 채팅 회신에 넣지 않습니다.
4. `02_작품코딩`에서 `npm ci` 후 `npm run deploy`로 기존 Cloudflare 프로젝트를 업데이트합니다. `main/_worker.js`와 새 JS 모듈을 함께 배포해야 합니다. GitHub 저장소 소스 변경만으로 배포됐다고 간주하지 않습니다.
5. 운영 앱은 `VITE_LANTERN_BRIDGE_ENABLED=true`로 빌드·배포해야 QR 후 외부 작품으로 이동합니다. 현재는 서버 설정 전의 깨진 이동을 방지하도록 기본 비활성화입니다.
6. 3번 방 규격 확정 후 Supabase `lantern_items_for_visitor(uuid)`의 NULL 반환 부분만 실제 결과 조회·변환으로 교체합니다. 규격은 중복 없는 문자열 2~9개, 각 최대 40자로 합의할 예정이며 현재 확정된 3번 방 결과 규격은 아닙니다.

## 데이터 계약

작품 URL: `/?from=sugung&lang=ko#launch=<opaque-ticket>`

학번·앱 로그인 토큰·서버 키는 전달하지 않습니다. URL fragment의 방 티켓은 같은 탭의 sessionStorage로 옮긴 뒤 주소창에서 제거합니다. 티켓은 해당 방 방문 하나만 가리킵니다.

`POST /api/app/launch`: `{ "token": "64자리 티켓" }`

응답 예시 (항목은 설명용이며 운영 데이터에 자동 입력되지 않습니다):

```json
{
  "visit_id": "UUID",
  "participant_code": "SG-012345abcdef",
  "nickname": "앱 닉네임",
  "items": ["산책하기", "물 마시기"],
  "status": "active",
  "ready": true
}
```

미연결 결과는 `items: null, ready: false`. 작품은 참가 번호 입력이나 샘플 데이터로 우회하지 않습니다.

`POST /api/app/complete`: `{ "token": "...", "record": { ...작품 결과 } }`

서버는 방 키로 방문을 확인하고 선택 항목·닉네임을 검증한 뒤 `complete_room_visit`를 호출합니다. 저장 성공 후 KV `app-feed:<visit_id>`에 닉네임·최종 항목·초롱 색·참가 코드·완료 시각만 기록합니다. 한 방문에 하나의 키를 사용해 동시 참가자의 덮어쓰기를 피합니다. DB 성공 후 KV 실패 시 같은 티켓으로 재시도하며 최초 완료 결과를 유지합니다.

앱 연동으로 입장한 경우 닉네임은 앱에서 미리 채우고 작품에서 수정 가능합니다(최대 40 UTF-16 코드 단위). 기존 일반 접속은 원본의 6글자 제한과 안내를 유지합니다. 수정된 이름은 작품 결과와 스크린에만 사용하며 앱 프로필은 갱신하지 않습니다. 긴 이름의 실제 프로젝터 줄바꿈과 가독성은 현장 검수가 필요합니다.

운영 점검: `GET /api/app/health`가 200과 `ok: true, supabase: true, kv: true`를 반환하면 해당 방의 서버 비밀 키로 Supabase RPC 인증과 기존 KV 읽기 연결이 확인됩니다. 이 점검은 관객 기록을 생성·완료하거나 실제 관객 목록을 반환하지 않습니다.

스크린은 기존 `GET /api/feed`로 연동 기록도 읽습니다. KV 특성상 표시 지연이 있을 수 있으며 실시간 즉시 표시를 보장하지 않습니다. 스크린은 키로 중복을 제거하고 앱 피드는 타임스탬프 커서와 관계없이 재조회해 늦게 보이는 기록도 받습니다. 앱 연동 피드는 7일 후 자동 만료합니다. 기존 KV 참가자·결과 기록은 삭제하지 않습니다.

완료 버튼은 서버 확인 성공 후 고정된 수궁야행 앱 주소 `/?room_return=lantern-dream`으로 이동합니다. 임의 return URL을 받지 않습니다. 앱은 기존 로그인 세션을 확인하고 DB에서 완료 상태를 다시 읽습니다. URL 파라미터만으로 완료 처리하지 않습니다. PWA와 외부 브라우저의 저장소가 분리된 기기에서는 같은 로그인 세션이 유지되는지 실기기 확인이 필요합니다.

## 검증

`node --test tests/app-bridge.test.mjs` : 연결, 결과 미정 차단, 최초 완료 유지, DB/KV 실패 재시도, 잘못된 항목·중지 방문·잘못된 티켓 거절, 두 참가자 동시 기록.

실제 Cloudflare 배포, SQL 적용과 운영 기기 전체 흐름은 별도 확인이 필요합니다. 현재 완료 신호는 작품 화면에서 결과 저장 시 보내며 완료 버튼은 재확인 후 복귀합니다.
