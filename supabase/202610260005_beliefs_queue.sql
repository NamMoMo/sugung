-- 1조 전시 PC 참가자 선택. 기존 입장/완료 기록 유지.
begin;
create table if not exists public.booth_selections (
  room_id text primary key references public.room_booths(room_id),
  visit_id uuid not null unique references public.room_visits(id),
  selected_at timestamptz not null default now()
);
alter table public.booth_selections enable row level security;
revoke all on public.booth_selections from anon,authenticated;

create or replace function public.beliefs_queue_state(p_signal_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active jsonb; waiting jsonb;
begin
  if not exists(select 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled)
    then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  select jsonb_build_object('visit_id',v.id,'nickname',p.nickname,'participant_code',p.participant_code,'entered_at',v.entered_at)
    into active from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    join public.visitor_profiles p on p.id=v.visitor_id
    where s.room_id='beliefs' and v.status='active';
  select coalesce(jsonb_agg(row_to_json(t) order by t.entered_at,t.visit_id),'[]'::jsonb) into waiting from (
    select v.id visit_id,p.nickname,p.participant_code,v.entered_at
    from public.room_visits v join public.visitor_profiles p on p.id=v.visitor_id
    where v.room_id='beliefs' and v.status='active'
      and (active is null or v.id::text<>(active->>'visit_id'))
    order by v.entered_at,v.id limit 200
  ) t;
  return jsonb_build_object('active',active,'waiting',waiting);
end; $$;

create or replace function public.beliefs_queue_claim(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb; person jsonb;
begin
  perform 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled for update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  state:=public.beliefs_queue_state(p_signal_key);
  if state->'active'<>'null'::jsonb then raise exception 'STATION_BUSY'; end if;
  perform 1 from public.room_visits where id=p_visit_id and room_id='beliefs' and status='active' for update;
  if not found then raise exception 'VISIT_NOT_WAITING'; end if;
  insert into public.booth_selections(room_id,visit_id) values('beliefs',p_visit_id)
    on conflict(room_id) do update set visit_id=excluded.visit_id,selected_at=now();
  state:=public.beliefs_queue_state(p_signal_key);
  return state->'active';
end; $$;

create or replace function public.beliefs_queue_release(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled for update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  delete from public.booth_selections where room_id='beliefs' and visit_id=p_visit_id;
  return public.beliefs_queue_state(p_signal_key);
end; $$;

create or replace function public.beliefs_queue_complete(p_signal_key text,p_visit_id uuid,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled for update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  -- Retain completed selection until next claim: retry after a lost response is idempotent.
  if not exists(select 1 from public.booth_selections where room_id='beliefs' and visit_id=p_visit_id)
    then raise exception 'VISIT_NOT_SELECTED'; end if;
  result:=public.complete_room_visit(p_visit_id,p_signal_key,p_result);
  return result;
end; $$;

revoke all on function public.beliefs_queue_state(text) from public,anon,authenticated;
revoke all on function public.beliefs_queue_claim(text,uuid) from public,anon,authenticated;
revoke all on function public.beliefs_queue_release(text,uuid) from public,anon,authenticated;
revoke all on function public.beliefs_queue_complete(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.beliefs_queue_state(text) to anon,authenticated;
grant execute on function public.beliefs_queue_claim(text,uuid) to anon,authenticated;
grant execute on function public.beliefs_queue_release(text,uuid) to anon,authenticated;
grant execute on function public.beliefs_queue_complete(text,uuid,jsonb) to anon,authenticated;
commit;
