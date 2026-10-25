-- SQL Editor에서 실행. 테스트 데이터 및 선택 변경은 전부 롤백됩니다.
begin;
do $$
declare
  one uuid:=gen_random_uuid(); two uuid:=gen_random_uuid();
  visit_one uuid; visit_two uuid; code text; signal text;
  state jsonb; reply jsonb; blocked boolean;
begin
  select qr_code,signal_key into code,signal from public.room_booths where room_id='beliefs' for update;
  delete from public.booth_selections where room_id='beliefs';
  insert into auth.users(id,aud,role,is_anonymous,created_at,updated_at)
    values(one,'authenticated','authenticated',true,now(),now()),(two,'authenticated','authenticated',true,now(),now());
  insert into public.visitor_profiles(id,name,student_id,department,nickname)
    values(one,'대기 테스트1',left(one::text,30),'테스트','먼저 입장'),(two,'대기 테스트2',left(two::text,30),'테스트','나중 입장');
  perform set_config('request.jwt.claim.sub',one::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',one,'role','authenticated')::text,true);
  reply:=public.enter_room('beliefs',code,gen_random_uuid()); visit_one:=(reply->>'visit_id')::uuid;
  perform set_config('request.jwt.claim.sub',two::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',two,'role','authenticated')::text,true);
  reply:=public.enter_room('beliefs',code,gen_random_uuid()); visit_two:=(reply->>'visit_id')::uuid;
  update public.room_visits set entered_at='2000-01-01T00:00:00Z' where id=visit_one;
  update public.room_visits set entered_at='2000-01-01T00:00:01Z' where id=visit_two;
  state:=public.beliefs_queue_state(signal);
  if state->'waiting'->0->>'visit_id'<>visit_one::text then raise exception 'ASSERT oldest first'; end if;
  perform public.beliefs_queue_claim(signal,visit_one);
  state:=public.beliefs_queue_state(signal);
  if state->'active'->>'visit_id'<>visit_one::text or state->'waiting'->0->>'visit_id'<>visit_two::text then raise exception 'ASSERT claim removal'; end if;
  blocked:=false;
  begin perform public.beliefs_queue_claim(signal,visit_two);
  exception when others then if sqlerrm<>'STATION_BUSY' then raise; end if; blocked:=true; end;
  if not blocked then raise exception 'ASSERT duplicate selection'; end if;
  perform public.beliefs_queue_release(signal,visit_one);
  state:=public.beliefs_queue_state(signal);
  if state->'waiting'->0->>'visit_id'<>visit_one::text then raise exception 'ASSERT release preserves order'; end if;
  perform public.beliefs_queue_claim(signal,visit_one);
  reply:=public.beliefs_queue_complete(signal,visit_one,'{"test":true}');
  if reply<>public.beliefs_queue_complete(signal,visit_one,'{"retry":true}') then raise exception 'ASSERT retry'; end if;
  if (select result ? 'retry' from public.room_visits where id=visit_one) then raise exception 'ASSERT immutable result'; end if;
  state:=public.beliefs_queue_state(signal);
  if state->'active'<>'null'::jsonb or state->'waiting'->0->>'visit_id'<>visit_two::text then raise exception 'ASSERT next person'; end if;
  perform public.beliefs_queue_claim(signal,visit_two);
  perform public.stop_room_visit(visit_two);
  blocked:=false;
  begin perform public.beliefs_queue_complete(signal,visit_two,'{}');
  exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'ASSERT stopped completion'; end if;
  blocked:=false;
  begin perform public.beliefs_queue_state('invalid');
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'ASSERT signal authentication'; end if;
end $$;
rollback;
select 'PASS: oldest first, claim, busy rejection, release, completion retry, next participant, stopped rejection, signal authentication. All test data rolled back.' as result;
