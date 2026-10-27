-- Team 3 (conflict), NOT team 2/self-knowledge. Existing visits/results are preserved.
begin;
lock table public.room_visits in share row exclusive mode;
do $$ begin
  if (select count(*) from public.room_visits where room_id='conflict' and status='active')>1
    then raise exception 'CONFLICT_STATION_MULTIPLE_ACTIVE_VISITS'; end if;
end $$;
insert into public.booth_selections(room_id,visit_id)
select 'conflict',id from public.room_visits where room_id='conflict' and status='active'
on conflict(room_id) do update set visit_id=excluded.visit_id,selected_at=now();

create or replace function public.wave_admit_on_entry()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='conflict' and enabled for no key update;
  if not found then raise exception 'INVALID_BOOTH_QR' using errcode='22023'; end if;
  if exists(select 1 from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    where s.room_id='conflict' and v.status='active' and v.id<>new.id)
    then raise exception 'ROOM_BUSY' using errcode='22023'; end if;
  insert into public.booth_selections(room_id,visit_id) values('conflict',new.id)
    on conflict(room_id) do update set visit_id=excluded.visit_id,selected_at=now();
  return new;
end $$;
revoke all on function public.wave_admit_on_entry() from public,anon,authenticated;
drop trigger if exists wave_direct_entry on public.room_visits;
create trigger wave_direct_entry after insert on public.room_visits
for each row when (new.room_id='conflict') execute function public.wave_admit_on_entry();

create or replace function public.wave_station_state(p_signal_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_visit jsonb;
begin
  if not exists(select 1 from public.room_booths where room_id='conflict' and signal_key=p_signal_key and enabled)
    then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  select jsonb_build_object('visit_id',v.id,'status',v.status,'nickname',p.nickname,
    'participant_code',p.participant_code,'entry_mode',v.entry_mode,'entered_at',v.entered_at)
    into current_visit from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    join public.visitor_profiles p on p.id=v.visitor_id where s.room_id='conflict';
  return jsonb_build_object('active',case when current_visit->>'status'='active' then current_visit else null end,'last',current_visit);
end $$;

create or replace function public.wave_station_release(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='conflict' and signal_key=p_signal_key and enabled for no key update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  update public.room_visits v set status='stopped',stopped_at=now()
    where v.id=p_visit_id and v.room_id='conflict' and v.status='active'
      and exists(select 1 from public.booth_selections s where s.room_id=v.room_id and s.visit_id=v.id);
  delete from public.booth_selections where room_id='conflict' and visit_id=p_visit_id;
  return public.wave_station_state(p_signal_key);
end $$;

create or replace function public.wave_validate_result(r jsonb)
returns void language plpgsql set search_path='' as $$
declare
  stable text[]:=array['높은 연봉','고용 안정','워라밸','체계성','타인의 인정','정당한 보상','원칙 준수','공정성','인간적 배려','규칙적인 업무','경제적 여유','시간적 자유','경제적 독립','명예'];
  catalog jsonb:='[["높은 연봉","고용 안정","워라밸","성장 기회"],["자율성","체계성","협력","독립성"],["목표 달성","타인의 인정","정당한 보상","자기발전"],["원칙 준수","융통성","공정성","인간적 배려"],["아이디어 실현","깊이 있는 연구","규칙적인 업무","협업 프로젝트"],["경제적 여유","전문성","사회적 영향력","시간적 자유"],["자아실현","경제적 독립","사회적 기여","명예"]]';
  i integer; word text; entry record; n integer; sl integer:=0; sr integer:=0; cl integer:=0; cr integer:=0;
  caught integer; active_ms integer; left_score integer; right_score integer; side text; last_word text;
  choice_history jsonb; capture_history jsonb; started timestamptz; finished timestamptz;
begin
  if r is null or jsonb_typeof(r) is distinct from 'object' or octet_length(r::text)>65536
    or r->>'room_id' is distinct from 'conflict' or r->>'team_id' is distinct from '3'
    or r->>'schema_version' is distinct from '1' or r->>'completion_mode' is distinct from 'normal'
    or r->>'input_mode' is distinct from 'camera'
    or jsonb_typeof(r->'selected_keywords') is distinct from 'array'
    or jsonb_typeof(r->'questions') is distinct from 'array'
    or jsonb_typeof(r->'captured_counts') is distinct from 'object'
    or jsonb_typeof(r->'history') is distinct from 'array'
    then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
  if jsonb_array_length(r->'selected_keywords')<>7 or jsonb_array_length(r->'questions')<>7
    then raise exception 'INCOMPLETE_RESULT' using errcode='22023'; end if;
  for i in 0..6 loop
    word:=r->'selected_keywords'->>i;
    if word is null or not (catalog->i ? word)
      or r->'questions'->i->>'question_index' is distinct from i::text
      or r->'questions'->i->>'word' is distinct from word
      or r->'questions'->i->>'side' is distinct from (case when word=any(stable) then 'right' else 'left' end)
      then raise exception 'INVALID_ANSWER' using errcode='22023'; end if;
    if word=any(stable) then sr:=sr+1; else sl:=sl+1; end if;
  end loop;
  for entry in select * from jsonb_each_text(r->'captured_counts') loop
    if not(r->'selected_keywords' ? entry.key) or entry.value !~ '^[1-9][0-9]?$'
      then raise exception 'INVALID_CAPTURE' using errcode='22023'; end if;
    n:=entry.value::integer;
    if n>15 then raise exception 'INVALID_CAPTURE' using errcode='22023'; end if;
    if entry.key=any(stable) then cr:=cr+n; else cl:=cl+n; end if;
  end loop;
  caught:=cl+cr;
  if coalesce(r->>'rain_active_ms','') !~ '^[0-9]{1,5}$'
    then raise exception 'INVALID_TIME' using errcode='22023'; end if;
  active_ms:=(r->>'rain_active_ms')::integer;
  if caught>15 or r->>'captured_total' is distinct from caught::text or active_ms>60100 or (caught<15 and active_ms<60000)
    or r->>'rain_end_reason' is distinct from (case when caught=15 then 'capture_target' else 'active_time_limit' end)
    then raise exception 'INCOMPLETE_RAIN' using errcode='22023'; end if;
  last_word:=r->>'last_captured_word';
  if last_word is null or (caught=0 and last_word<>'') or (caught>0 and not(r->'captured_counts' ? last_word))
    then raise exception 'INVALID_LAST_CAPTURE' using errcode='22023'; end if;
  left_score:=sl+cl;right_score:=sr+cr;
  if left_score=right_score then
    side:=case when coalesce(nullif(last_word,''),r->'selected_keywords'->>6)=any(stable) then 'right' else 'left' end;
  else side:=case when left_score>right_score then 'left' else 'right' end; end if;
  if r->'scores' is distinct from jsonb_build_object('development',left_score,'stability',right_score,
    'selection',jsonb_build_object('left',sl,'right',sr),'capture',jsonb_build_object('left',cl,'right',cr),
    'total',left_score+right_score,'tie',left_score=right_score)
    or r->'outcome'->>'side' is distinct from side
    or r->'outcome'->>'value' is distinct from (case when side='left' then '발전의 물결' else '안정의 물결' end)
    or r->'summary'->'keywords' is distinct from r->'selected_keywords'
    or r->'summary'->>'result' is distinct from r->'outcome'->>'value'
    then raise exception 'INVALID_SCORE' using errcode='22023'; end if;
  select coalesce(jsonb_agg(value order by ordinality),'[]') into choice_history
    from jsonb_array_elements(r->'history') with ordinality where value->>'type'='choice';
  select coalesce(jsonb_agg(value order by ordinality),'[]') into capture_history
    from jsonb_array_elements(r->'history') with ordinality where value->>'type'='capture';
  if jsonb_array_length(r->'history')<>7+caught or jsonb_array_length(choice_history)<>7 or jsonb_array_length(capture_history)<>caught
    then raise exception 'INVALID_HISTORY' using errcode='22023'; end if;
  for i in 0..6 loop
    if choice_history->i->>'word' is distinct from r->'selected_keywords'->>i
      or choice_history->i->>'question_index' is distinct from i::text
      then raise exception 'INVALID_HISTORY' using errcode='22023'; end if;
  end loop;
  if caught>0 and capture_history->-1->>'word' is distinct from last_word
    then raise exception 'INVALID_HISTORY' using errcode='22023'; end if;
  for entry in select * from jsonb_each_text(r->'captured_counts') loop
    if (select count(*) from jsonb_array_elements(capture_history) e where e->>'word'=entry.key)<>entry.value::integer
      then raise exception 'INVALID_HISTORY' using errcode='22023'; end if;
  end loop;
  if coalesce(r->>'duration_ms','') !~ '^[0-9]{1,8}$' or r->>'started_at' is null or r->>'finished_at' is null
    then raise exception 'INVALID_TIME' using errcode='22023'; end if;
  started:=(r->>'started_at')::timestamptz;finished:=(r->>'finished_at')::timestamptz;
  if finished<started or (r->>'duration_ms')::bigint>86400000
    or abs(extract(epoch from finished-started)*1000-(r->>'duration_ms')::bigint)>1
    then raise exception 'INVALID_TIME' using errcode='22023'; end if;
end $$;
revoke all on function public.wave_validate_result(jsonb) from public,anon,authenticated;

create or replace function public.wave_station_complete(p_signal_key text,p_visit_id uuid,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.room_visits%rowtype;
begin
  perform 1 from public.room_booths where room_id='conflict' and signal_key=p_signal_key and enabled for no key update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  perform public.wave_validate_result(p_result);
  select * into v from public.room_visits where id=p_visit_id and room_id='conflict' for update;
  if not found then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
  if v.status='stopped' then raise exception 'VISIT_STOPPED' using errcode='22023'; end if;
  if v.status='completed' then
    if v.result is distinct from p_result then raise exception 'RESULT_CONFLICT' using errcode='22023'; end if;
    return jsonb_build_object('visit_id',v.id,'room_id',v.room_id,'status',v.status,'completed_at',v.completed_at);
  end if;
  if not exists(select 1 from public.booth_selections where room_id='conflict' and visit_id=v.id)
    then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
  return public.complete_room_visit(v.id,p_signal_key,p_result);
end $$;
revoke all on function public.wave_station_state(text) from public,anon,authenticated;
revoke all on function public.wave_station_release(text,uuid) from public,anon,authenticated;
revoke all on function public.wave_station_complete(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wave_station_state(text) to anon,authenticated;
grant execute on function public.wave_station_release(text,uuid) to anon,authenticated;
grant execute on function public.wave_station_complete(text,uuid,jsonb) to anon,authenticated;
commit;
