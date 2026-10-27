-- Shared optional start tracking for team 1/2; the artwork runs without a visitor.
begin;
alter table public.room_visits add column if not exists experience_started_at timestamptz;
create or replace function public.record_station_start(p_room_id text,p_signal_key text,p_visit_id uuid,p_started_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.room_visits%rowtype;
begin
  if p_room_id not in ('beliefs','self-knowledge') then raise exception 'INVALID_ROOM' using errcode='22023'; end if;
  perform 1 from public.room_booths where room_id=p_room_id and signal_key=p_signal_key and enabled for no key update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  if p_started_at is null then raise exception 'INVALID_START_TIME' using errcode='22023'; end if;
  select * into v from public.room_visits where id=p_visit_id and room_id=p_room_id for update;
  if not found then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
  if v.status='stopped' then raise exception 'VISIT_STOPPED' using errcode='22023'; end if;
  if v.status='active' then
    if not exists(select 1 from public.booth_selections where room_id=p_room_id and visit_id=v.id)
      then raise exception 'VISIT_NOT_CURRENT' using errcode='22023'; end if;
    update public.room_visits set experience_started_at=coalesce(experience_started_at,p_started_at) where id=v.id returning * into v;
  end if;
  return jsonb_build_object('visit_id',v.id,'status',v.status,'experience_started_at',v.experience_started_at);
end $$;
revoke all on function public.record_station_start(text,text,uuid,timestamptz) from public,anon,authenticated;
create or replace function public.beliefs_queue_start(p_signal_key text,p_visit_id uuid,p_started_at timestamptz)
returns jsonb language sql security definer set search_path='' as $$
  select public.record_station_start('beliefs',p_signal_key,p_visit_id,p_started_at);
$$;
create or replace function public.treasure_station_start(p_signal_key text,p_visit_id uuid,p_started_at timestamptz)
returns jsonb language sql security definer set search_path='' as $$
  select public.record_station_start('self-knowledge',p_signal_key,p_visit_id,p_started_at);
$$;
revoke all on function public.beliefs_queue_start(text,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.treasure_station_start(text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.beliefs_queue_start(text,uuid,timestamptz) to anon,authenticated;
grant execute on function public.treasure_station_start(text,uuid,timestamptz) to anon,authenticated;
commit;
