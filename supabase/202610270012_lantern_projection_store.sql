begin;
create table if not exists public.lantern_projection_kv(
  key text primary key check(length(key) between 1 and 500),
  value text not null check(octet_length(value)<=262144),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.lantern_projection_kv enable row level security;
revoke all on public.lantern_projection_kv from anon,authenticated;
create or replace function public.lantern_projection_store(
 p_signal_key text,p_operation text,p_key text default null,p_value text default null,
 p_expires_at timestamptz default null,p_prefix text default '',p_cursor text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare answer text; names jsonb; more boolean; last_key text;
begin
 if not exists(select 1 from public.room_booths where room_id='lantern-dream' and signal_key=p_signal_key and enabled)
  then raise exception 'INVALID_ROOM_SIGNAL_KEY' using errcode='42501';end if;
 if p_operation='get' then
  select value into answer from public.lantern_projection_kv where key=p_key and(expires_at is null or expires_at>now());
  return jsonb_build_object('value',answer);
 elsif p_operation='put' then
  if p_key is null or not(p_key='feed' or p_key like 'p:%' or p_key like 'r:%' or p_key like 'app-feed:%')
    or p_value is null or length(p_key)>500 or octet_length(p_value)>262144 then raise exception 'INVALID_KV_RECORD' using errcode='22023';end if;
  insert into public.lantern_projection_kv(key,value,expires_at)values(p_key,p_value,p_expires_at)
   on conflict(key)do update set value=excluded.value,expires_at=excluded.expires_at,updated_at=now();
  return jsonb_build_object('ok',true);
 elsif p_operation='delete' then
  delete from public.lantern_projection_kv where key=p_key;return jsonb_build_object('ok',true);
 elsif p_operation='list' then
  select count(*)>500 into more from(select key from public.lantern_projection_kv
   where left(key,length(coalesce(p_prefix,'')))=coalesce(p_prefix,'') and key>coalesce(p_cursor,'')
   and(expires_at is null or expires_at>now())order by key limit 501)t;
  select coalesce(jsonb_agg(jsonb_build_object('name',key,'expiration',extract(epoch from expires_at)::bigint)order by key),'[]'),max(key)
   into names,last_key from(select key,expires_at from public.lantern_projection_kv
    where left(key,length(coalesce(p_prefix,'')))=coalesce(p_prefix,'') and key>coalesce(p_cursor,'')
    and(expires_at is null or expires_at>now())order by key limit 500)t;
  return jsonb_build_object('keys',names,'list_complete',not more,'cursor',case when more then last_key else null end);
 end if;
 raise exception 'INVALID_KV_OPERATION' using errcode='22023';
end $$;
revoke all on function public.lantern_projection_store(text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.lantern_projection_store(text,text,text,text,timestamptz,text,text) to anon,authenticated;
commit;
