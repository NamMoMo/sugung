-- 2조: single-visitor QR admission, completion and explicit result revisions. Run after 005/006.
begin;
lock table public.room_visits in share row exclusive mode;
update public.room_visits v set status='stopped',stopped_at=now()
where v.room_id='self-knowledge' and v.status='active'
  and not exists(select 1 from public.booth_selections s where s.room_id=v.room_id and s.visit_id=v.id);

create or replace function public.treasure_admit_on_entry()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='self-knowledge' and enabled for no key update;
  if not found then raise exception 'INVALID_BOOTH_QR' using errcode='22023'; end if;
  if exists(select 1 from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    where s.room_id='self-knowledge' and v.status='active' and v.id<>new.id)
    then raise exception 'ROOM_BUSY' using errcode='22023'; end if;
  insert into public.booth_selections(room_id,visit_id) values('self-knowledge',new.id)
    on conflict(room_id) do update set visit_id=excluded.visit_id,selected_at=now();
  return new;
end; $$;
revoke all on function public.treasure_admit_on_entry() from public,anon,authenticated;
drop trigger if exists treasure_direct_entry on public.room_visits;
create trigger treasure_direct_entry after insert on public.room_visits
for each row when (new.room_id='self-knowledge') execute function public.treasure_admit_on_entry();

create or replace function public.treasure_station_state(p_signal_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_visit jsonb;
begin
  if not exists(select 1 from public.room_booths where room_id='self-knowledge' and signal_key=p_signal_key and enabled)
    then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  select jsonb_build_object('visit_id',v.id,'status',v.status,'nickname',p.nickname,
    'participant_code',p.participant_code,'entry_mode',v.entry_mode,'entered_at',v.entered_at,
    'saved_revision',coalesce((v.result->>'revision')::integer,0)) into current_visit
    from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    join public.visitor_profiles p on p.id=v.visitor_id where s.room_id='self-knowledge';
  return jsonb_build_object('active',case when current_visit->>'status'='active' then current_visit else null end,'last',current_visit);
end; $$;

create or replace function public.treasure_station_release(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='self-knowledge' and signal_key=p_signal_key and enabled for no key update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  update public.room_visits v set status='stopped',stopped_at=now()
    where v.id=p_visit_id and v.room_id='self-knowledge' and v.status='active'
      and exists(select 1 from public.booth_selections s where s.room_id=v.room_id and s.visit_id=v.id);
  delete from public.booth_selections where room_id='self-knowledge' and visit_id=p_visit_id;
  return public.treasure_station_state(p_signal_key);
end; $$;

create or replace function public.treasure_station_save(p_signal_key text,p_visit_id uuid,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.room_visits%rowtype; revision integer; saved integer; item record; answer text; prefix jsonb;
begin
  perform 1 from public.room_booths where room_id='self-knowledge' and signal_key=p_signal_key and enabled for no key update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  if p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>65536
    then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
  if p_result->>'room_id' is distinct from 'self-knowledge' or p_result->>'team_id' is distinct from '2'
    or p_result->>'schema_version' is distinct from '1' or p_result->>'seals_count' is distinct from '6'
    or coalesce(p_result->>'revision','') !~ '^[1-9][0-9]{0,4}$'
    then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
  revision:=(p_result->>'revision')::integer;
  if revision<6 or revision>10000 or jsonb_typeof(p_result->'history') is distinct from 'array'
    or jsonb_typeof(p_result->'selections') is distinct from 'array'
    or jsonb_typeof(p_result->'selected_actions') is distinct from 'array'
    then raise exception 'INCOMPLETE_RESULT' using errcode='22023'; end if;
  if jsonb_array_length(p_result->'history')<>revision or jsonb_array_length(p_result->'selections')<>6
    or jsonb_array_length(p_result->'selected_actions')<>6
    then raise exception 'INCOMPLETE_RESULT' using errcode='22023'; end if;
  for item in select * from (values
    ('outfit',0,'birthday-before',array['discover','create','make','help','teach']),
    ('outfit',1,'birthday-after',array['explore','express','plan','connect','protect']),
    ('strength',0,'tidy-before',array['observe','analysis','creative','empathy','execute']),
    ('strength',1,'tidy-after',array['craft','organize','explain','cooperate','persist']),
    ('aura',0,'break-before',array['people','nature','music','numbers','story']),
    ('aura',1,'break-after',array['tools','taste','movement','art','play'])
  ) as catalog(chest,scene_index,scene,allowed) loop
    answer:=p_result->'answers'->item.chest->>item.scene_index;
    if answer is null or not(answer=any(item.allowed)) or not exists(select 1 from jsonb_array_elements(p_result->'selections') choice
      where choice->>'chest_id'=item.chest and choice->>'scene_id'=item.scene and choice->>'option_id'=answer)
      then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
  end loop;
  select * into v from public.room_visits where id=p_visit_id and room_id='self-knowledge' for update;
  if not found then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
  if v.status='stopped' then raise exception 'VISIT_STOPPED' using errcode='22023'; end if;
  saved:=coalesce((v.result->>'revision')::integer,0);
  if v.status='completed' and revision<=saved then
    if revision=saved and p_result<>v.result then raise exception 'RESULT_REVISION_CONFLICT' using errcode='22023'; end if;
    return jsonb_build_object('visit_id',v.id,'status','completed','saved_revision',saved,'completed_at',v.completed_at);
  end if;
  if not exists(select 1 from public.booth_selections where room_id='self-knowledge' and visit_id=v.id)
    then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
  if v.status='active' then
    perform public.complete_room_visit(v.id,p_signal_key,p_result);
  else
    select jsonb_agg(value order by ordinality) into prefix
      from jsonb_array_elements(p_result->'history') with ordinality where ordinality<=saved;
    if prefix is distinct from v.result->'history'
      or p_result->'started_at' is distinct from v.result->'started_at'
      or p_result->'finished_at' is distinct from v.result->'finished_at'
      or p_result->'duration_ms' is distinct from v.result->'duration_ms'
      then raise exception 'RESULT_REVISION_CONFLICT' using errcode='22023'; end if;
    update public.room_visits set result=p_result where id=v.id;
    update public.room_completions set result=p_result where visit_id=v.id and visitor_id=v.visitor_id and room_id=v.room_id;
  end if;
  select * into v from public.room_visits where id=v.id;
  return jsonb_build_object('visit_id',v.id,'status','completed','saved_revision',revision,'completed_at',v.completed_at);
end; $$;

revoke all on function public.treasure_station_state(text) from public,anon,authenticated;
revoke all on function public.treasure_station_release(text,uuid) from public,anon,authenticated;
revoke all on function public.treasure_station_save(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.treasure_station_state(text) to anon,authenticated;
grant execute on function public.treasure_station_release(text,uuid) to anon,authenticated;
grant execute on function public.treasure_station_save(text,uuid,jsonb) to anon,authenticated;
commit;
