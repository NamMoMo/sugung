-- Run after 005 and 006. QR entry admits one visitor immediately; there is no waiting list.
begin;
lock table public.room_visits in share row exclusive mode;

-- Cancel only legacy waiting registrations, preserving the selected visitor and all history/results.
update public.room_visits v set status='stopped',stopped_at=now()
where v.room_id='beliefs' and v.status='active'
  and not exists(select 1 from public.booth_selections s where s.room_id='beliefs' and s.visit_id=v.id);

create or replace function public.beliefs_admit_on_entry()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Both normal and developer entry pass through this trigger in the same transaction.
  -- NO KEY UPDATE serializes admissions while remaining compatible with the visit's FK key-share lock.
  perform 1 from public.room_booths where room_id='beliefs' and enabled for no key update;
  if not found then raise exception 'INVALID_BOOTH_QR' using errcode='22023'; end if;
  if exists(select 1 from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    where s.room_id='beliefs' and v.status='active' and v.id<>new.id)
    then raise exception 'ROOM_BUSY' using errcode='22023'; end if;
  insert into public.booth_selections(room_id,visit_id) values('beliefs',new.id)
    on conflict(room_id) do update set visit_id=excluded.visit_id,selected_at=now();
  return new;
end; $$;
revoke all on function public.beliefs_admit_on_entry() from public,anon,authenticated;
drop trigger if exists beliefs_direct_entry on public.room_visits;
create trigger beliefs_direct_entry after insert on public.room_visits
for each row when (new.room_id='beliefs') execute function public.beliefs_admit_on_entry();

-- Keep the existing local API name for compatible exhibition PCs; never return a waiting roster.
create or replace function public.beliefs_queue_state(p_signal_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active jsonb;
begin
  if not exists(select 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled)
    then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  select jsonb_build_object('visit_id',v.id,'nickname',p.nickname,'participant_code',p.participant_code,'entered_at',v.entered_at)
    into active from public.booth_selections s join public.room_visits v on v.id=s.visit_id
    join public.visitor_profiles p on p.id=v.visitor_id
    where s.room_id='beliefs' and v.status='active';
  return jsonb_build_object('active',active,'waiting','[]'::jsonb);
end; $$;

create or replace function public.beliefs_queue_claim(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled)
    then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  raise exception 'MANUAL_SELECTION_DISABLED' using errcode='22023';
end; $$;

create or replace function public.beliefs_queue_release(p_signal_key text,p_visit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.room_booths where room_id='beliefs' and signal_key=p_signal_key and enabled for update;
  if not found then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501'; end if;
  -- Stop the admitted visit rather than putting it back into a queue. Completed results stay intact.
  update public.room_visits v set status='stopped',stopped_at=now()
    where v.id=p_visit_id and v.room_id='beliefs' and v.status='active'
      and exists(select 1 from public.booth_selections s where s.room_id='beliefs' and s.visit_id=v.id);
  delete from public.booth_selections where room_id='beliefs' and visit_id=p_visit_id;
  return public.beliefs_queue_state(p_signal_key);
end; $$;
commit;
