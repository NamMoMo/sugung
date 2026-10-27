-- Test participants and all writes are rolled back. No real participant data is modified.
begin;
do $$
declare
 one uuid:=gen_random_uuid(); two uuid:=gen_random_uuid(); visit_one uuid; visit_two uuid; code text; signal text; wrong_signal text;
 state jsonb; reply jsonb; prior jsonb; started_time timestamptz; blocked boolean; normal jsonb:='{"schema_version": 1, "room_id": "conflict", "team_id": 3, "completion_mode": "normal", "input_mode": "camera", "started_at": "2025-10-09T08:53:20.000Z", "finished_at": "2025-10-09T08:57:20.000Z", "duration_ms": 240000, "questions": [{"question_index": 0, "category": "직장 선택", "word": "높은 연봉", "side": "right"}, {"question_index": 1, "category": "업무 방식", "word": "자율성", "side": "left"}, {"question_index": 2, "category": "직업적 보람", "word": "목표 달성", "side": "left"}, {"question_index": 3, "category": "직업적 윤리", "word": "원칙 준수", "side": "right"}, {"question_index": 4, "category": "몰입하는 순간", "word": "아이디어 실현", "side": "left"}, {"question_index": 5, "category": "미래의 목표", "word": "경제적 여유", "side": "right"}, {"question_index": 6, "category": "포기할 수 없는 가치", "word": "자아실현", "side": "left"}], "selected_keywords": ["높은 연봉", "자율성", "목표 달성", "원칙 준수", "아이디어 실현", "경제적 여유", "자아실현"], "captured_counts": {"높은 연봉": 15}, "captured_total": 15, "last_captured_word": "높은 연봉", "rain_active_ms": 30000, "rain_end_reason": "capture_target", "scores": {"development": 4, "stability": 18, "selection": {"left": 4, "right": 3}, "capture": {"left": 0, "right": 15}, "total": 22, "tie": false}, "outcome": {"side": "right", "label": "안정적인 삶", "value": "안정의 물결", "realm": "육지", "bias": 0.6363636363636364, "strength": 0.6363636363636364}, "summary": {"keywords": ["높은 연봉", "자율성", "목표 달성", "원칙 준수", "아이디어 실현", "경제적 여유", "자아실현"], "result": "안정의 물결"}, "history": [{"type": "choice", "question_index": 0, "word": "높은 연봉", "at": "2025-10-09T08:53:21.000Z"}, {"type": "choice", "question_index": 1, "word": "자율성", "at": "2025-10-09T08:53:22.000Z"}, {"type": "choice", "question_index": 2, "word": "목표 달성", "at": "2025-10-09T08:53:23.000Z"}, {"type": "choice", "question_index": 3, "word": "원칙 준수", "at": "2025-10-09T08:53:24.000Z"}, {"type": "choice", "question_index": 4, "word": "아이디어 실현", "at": "2025-10-09T08:53:25.000Z"}, {"type": "choice", "question_index": 5, "word": "경제적 여유", "at": "2025-10-09T08:53:26.000Z"}, {"type": "choice", "question_index": 6, "word": "자아실현", "at": "2025-10-09T08:53:27.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:30.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:31.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:32.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:33.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:34.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:35.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:36.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:37.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:38.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:39.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:40.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:41.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:42.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:43.000Z"}, {"type": "capture", "word": "높은 연봉", "gesture": "주먹", "at": "2025-10-09T08:53:44.000Z"}]}'::jsonb; timeout_result jsonb:='{"schema_version": 1, "room_id": "conflict", "team_id": 3, "completion_mode": "normal", "input_mode": "camera", "started_at": "2025-10-09T08:53:20.000Z", "finished_at": "2025-10-09T08:57:20.000Z", "duration_ms": 240000, "questions": [{"question_index": 0, "category": "직장 선택", "word": "높은 연봉", "side": "right"}, {"question_index": 1, "category": "업무 방식", "word": "자율성", "side": "left"}, {"question_index": 2, "category": "직업적 보람", "word": "목표 달성", "side": "left"}, {"question_index": 3, "category": "직업적 윤리", "word": "원칙 준수", "side": "right"}, {"question_index": 4, "category": "몰입하는 순간", "word": "아이디어 실현", "side": "left"}, {"question_index": 5, "category": "미래의 목표", "word": "경제적 여유", "side": "right"}, {"question_index": 6, "category": "포기할 수 없는 가치", "word": "자아실현", "side": "left"}], "selected_keywords": ["높은 연봉", "자율성", "목표 달성", "원칙 준수", "아이디어 실현", "경제적 여유", "자아실현"], "captured_counts": {}, "captured_total": 0, "last_captured_word": "", "rain_active_ms": 60000, "rain_end_reason": "active_time_limit", "scores": {"development": 4, "stability": 3, "selection": {"left": 4, "right": 3}, "capture": {"left": 0, "right": 0}, "total": 7, "tie": false}, "outcome": {"side": "left", "label": "발전하고자 하는 삶", "value": "발전의 물결", "realm": "용궁", "bias": -0.14285714285714285, "strength": 0.14285714285714285}, "summary": {"keywords": ["높은 연봉", "자율성", "목표 달성", "원칙 준수", "아이디어 실현", "경제적 여유", "자아실현"], "result": "발전의 물결"}, "history": [{"type": "choice", "question_index": 0, "word": "높은 연봉", "at": "2025-10-09T08:53:21.000Z"}, {"type": "choice", "question_index": 1, "word": "자율성", "at": "2025-10-09T08:53:22.000Z"}, {"type": "choice", "question_index": 2, "word": "목표 달성", "at": "2025-10-09T08:53:23.000Z"}, {"type": "choice", "question_index": 3, "word": "원칙 준수", "at": "2025-10-09T08:53:24.000Z"}, {"type": "choice", "question_index": 4, "word": "아이디어 실현", "at": "2025-10-09T08:53:25.000Z"}, {"type": "choice", "question_index": 5, "word": "경제적 여유", "at": "2025-10-09T08:53:26.000Z"}, {"type": "choice", "question_index": 6, "word": "자아실현", "at": "2025-10-09T08:53:27.000Z"}]}'::jsonb;
begin
 select qr_code,signal_key into code,signal from public.room_booths where room_id='conflict' for no key update;
 select signal_key into wrong_signal from public.room_booths where room_id='beliefs';
 -- Temporarily isolate this room inside the rolled-back transaction.
 delete from public.booth_selections where room_id='conflict';
 insert into auth.users(id,aud,role,is_anonymous,created_at,updated_at)
 values(one,'authenticated','authenticated',true,now(),now()),(two,'authenticated','authenticated',true,now(),now());
 insert into public.visitor_profiles(id,name,student_id,department,nickname)
 values(one,'물결 DB 검증1',left(one::text,30),'테스트','물결1'),(two,'물결 DB 검증2',left(two::text,30),'테스트','물결2');
 perform set_config('request.jwt.claim.sub',one::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',one,'role','authenticated')::text,true);
 reply:=public.enter_room('conflict',code,gen_random_uuid()); visit_one:=(reply->>'visit_id')::uuid;
 state:=public.wave_station_state(signal);
 if state->'active'->>'visit_id' is distinct from visit_one::text then raise exception 'ASSERT QR auto admission'; end if;
 if (select experience_started_at from public.room_visits where id=visit_one) is not null then raise exception 'ASSERT QR alone is not artwork start'; end if;
 reply:=public.wave_station_start(signal,visit_one,now());started_time:=(reply->>'experience_started_at')::timestamptz;
 if started_time is null or (select experience_started_at from public.room_visits where id=visit_one)<>started_time then raise exception 'ASSERT actual artwork start'; end if;
 if (public.wave_station_start(signal,visit_one,now()+interval '1 second')->>'experience_started_at')::timestamptz<>started_time then raise exception 'ASSERT idempotent start'; end if;
 blocked:=false;
 begin perform public.wave_station_start(wrong_signal,visit_one,now());
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'ASSERT start room key'; end if;

 if public.enter_room_developer('conflict',code,gen_random_uuid())->>'visit_id'<>visit_one::text then raise exception 'ASSERT same visitor retry'; end if;
 perform set_config('request.jwt.claim.sub',two::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',two,'role','authenticated')::text,true);
 blocked:=false;
 begin perform public.enter_room('conflict',code,gen_random_uuid());
 exception when invalid_parameter_value then if sqlerrm<>'ROOM_BUSY' then raise; end if; blocked:=true; end;
 if not blocked then raise exception 'ASSERT normal busy'; end if;
 blocked:=false;
 begin perform public.enter_room_developer('conflict',code,gen_random_uuid());
 exception when invalid_parameter_value then if sqlerrm<>'ROOM_BUSY' then raise; end if; blocked:=true; end;
 if not blocked or exists(select 1 from public.room_visits where visitor_id=two) then raise exception 'ASSERT developer busy without waiting'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(wrong_signal,visit_one,normal);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'ASSERT room key isolation'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(signal,visit_one,jsonb_set(normal,'{input_mode}','"mouse"'));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'ASSERT mouse preview exclusion'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(signal,visit_one,jsonb_set(normal,'{scores,total}','999'));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'ASSERT score validation'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(signal,visit_one,jsonb_set(timeout_result,'{rain_active_ms}','59000'));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'ASSERT incomplete rain'; end if;
 reply:=public.wave_station_complete(signal,visit_one,normal);prior:=reply;
 if reply->>'status'<>'completed' then raise exception 'ASSERT completion'; end if;
 if public.wave_station_complete(signal,visit_one,normal)<>reply then raise exception 'ASSERT exact retry'; end if;
 if (public.wave_station_start(signal,visit_one,now())->>'experience_started_at')::timestamptz<>started_time then raise exception 'ASSERT completed start unchanged'; end if;
 if (select result from public.room_visits where id=visit_one)<>normal
 or (select result from public.room_completions where visit_id=visit_one)<>normal then raise exception 'ASSERT both result tables'; end if;
 if public.wave_station_state(signal)->'active'<>'null'::jsonb then raise exception 'ASSERT free station'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(signal,visit_one,timeout_result);
 exception when invalid_parameter_value then if sqlerrm<>'RESULT_CONFLICT' then raise; end if; blocked:=true; end;
 if not blocked then raise exception 'ASSERT immutable completion'; end if;
 reply:=public.enter_room_developer('conflict',code,gen_random_uuid());visit_two:=(reply->>'visit_id')::uuid;
 if public.wave_station_state(signal)->'active'->>'visit_id'<>visit_two::text then raise exception 'ASSERT next participant'; end if;
 if public.wave_station_complete(signal,visit_one,normal)<>prior then raise exception 'ASSERT old retry after handoff'; end if;
 perform public.stop_room_visit(visit_two);
 blocked:=false;begin perform public.wave_station_start(signal,visit_two,now());exception when invalid_parameter_value then if sqlerrm<>'VISIT_STOPPED' then raise; end if;blocked:=true;end;
 if not blocked then raise exception 'ASSERT stopped start'; end if;
 blocked:=false;
 begin perform public.wave_station_complete(signal,visit_two,normal);
 exception when invalid_parameter_value then if sqlerrm<>'VISIT_STOPPED' then raise; end if;blocked:=true; end;
 if not blocked then raise exception 'ASSERT mobile stop race'; end if;
 reply:=public.enter_room('conflict',code,gen_random_uuid());visit_two:=(reply->>'visit_id')::uuid;
 reply:=public.wave_station_complete(signal,visit_two,timeout_result);
 if reply->>'status'<>'completed' then raise exception 'ASSERT 60 second zero capture result'; end if;
 reply:=public.enter_room('conflict',code,gen_random_uuid());visit_two:=(reply->>'visit_id')::uuid;
 perform public.wave_station_release(signal,visit_two);
 if (select status from public.room_visits where id=visit_two)<>'stopped' then raise exception 'ASSERT release'; end if;
 if not exists(select 1 from public.room_completions where visitor_id=one and room_id='conflict') then raise exception 'ASSERT mobile completion row'; end if;
end $$;
rollback;
select 'PASS: optional-link start event, idempotent start, QR alone not start, completed/stopped start safety, QR admission, normal/developer busy rejection, no queue, participant identity, room key, camera-only completion, score validation, both result tables, retries, immutable result, next participant, mobile stop race, 60-second timeout, release. All test data rolled back.' as result;
