# 수궁야행 공통 결과 저장 기준

각 작품은 선택된 참가자의 `visit_id`에 결과 JSON을 연결합니다. 참가자 코드나 닉네임으로 새 결과를 임의 생성하지 않습니다. 서버의 방 전용 signal_key로 `complete_room_visit`를 호출하면 `room_visits.result`(방문별 이력)와 `room_completions.result`(참가자·방별 최신 완료 결과)에 같은 JSON이 저장됩니다. 실제 참가자와 방의 식별 기준은 JSON 안의 값이 아닌 DB 행의 visitor_id/room_id입니다.

## 신규 결과 공통 필드

| 필드 | 형식 | 의미 |
| --- | --- | --- |
| schema_version | 정수 | 결과 해석용 버전. 1조 확장 결과는 2 |
| room_id | 문자열 | beliefs / self-knowledge / conflict / lantern-dream |
| team_id | 정수 | GitHub 조 번호 1 / 2 / 3 / 4 |
| started_at | ISO UTC 문자열 또는 null | 작품 시작 시각. QR 대기 시간 제외 |
| finished_at | ISO UTC 문자열 또는 null | 작품 종료 시각 |
| duration_ms | 정수 또는 null | 작품 시작부터 종료까지의 밀리초. 입력값 부재 시 임의 추정하지 않음 |
| completion_mode | 문자열 | 현재 1조는 normal. 테스트·관리자 건너뛰기는 완료 저장에서 제외 |
| summary.keywords | 문자열 배열 | 리포트·최종 이미지에 활용할 작품 결과 키워드 |

이 필드 외에 작품별 결과를 같은 JSON에 추가할 수 있습니다. 모든 조에 같은 선택 항목이나 결과 알고리즘을 강제하지 않습니다. 기존 결과는 그대로 보존하며 없는 필드를 채우려고 과거 데이터를 추정하지 않습니다.

## 1조에서 저장하는 값

- interaction_count: 유효한 버리기·추가 횟수.
- remaining_keywords: 처음 제공된 단어 중 최종 화면에 남은 단어.
- added_keywords: 직접 추가한 단어 중 최종 화면에 남은 단어.
- discarded_initial_keywords: 버린 기본 단어.
- discarded_keywords: 직접 추가했다가 버린 단어까지 포함한 전체 버린 단어.
- all_added_keywords: 최종적으로 버렸더라도 모든 유효한 추가 단어. 중복 입력 횟수도 보존.
- final_keywords: 최종 화면의 전체 단어.
- history: 시간순 행동 배열. sequence, type(add/discard), label_id, text, source(initial/participant), at(ISO UTC), elapsed_ms.

시간은 전시 PC 시계를 사용하며 DB completed_at은 서버의 완료 저장 시각입니다. 둘은 의미가 다릅니다. 최종 화면을 넘긴 뒤 엔딩 종료까지 포함한 전체 작품 시간을 저장합니다. 참가자 선택 대기 시간은 포함하지 않습니다. 새로고침하면 진행 중인 메모리 이력은 복원하지 않으며 같은 참가자로 시작한 새 체험의 결과를 저장합니다.

실패 요청은 재시도할 수 있고 이미 완료된 방문의 결과는 덮어쓰지 않습니다. 새 참가자 시작 시 이전 행동·시각을 초기화합니다. 이미지·웹캠 원본·실루엣 영상은 저장하지 않습니다.

## 다른 조에 적용할 때

- 2조(self-knowledge): 실제 결과 형식 확정 후 해당 항목을 JSON에 연결. 4조 시작값 변환은 별도 어댑터에서 수행.
- 3조(conflict): 실제 선택·분기 결과 확정 후 해당 항목을 연결.
- 4조(lantern-dream): 기존 연동이 이미 완료 결과를 Supabase에 저장하고 KV에 스크린용 데이터를 전송합니다. 1조 변경으로 기존 4조 결과 형식을 자동 변경하지 않습니다.

다른 조는 위 공통 필드와 자신들의 결과만 제공하면 됩니다. 각 작품의 실제 저장 코드 연결·테스트는 해당 조 연동 단계에서 적용합니다.
