begin;
do $$
declare signal text; wrong_signal text; data jsonb; blocked boolean; prefix text:='p:verify-'||gen_random_uuid()::text; i integer;
begin
 select signal_key into signal from public.room_booths where room_id='lantern-dream';
 select signal_key into wrong_signal from public.room_booths where room_id='beliefs';
 blocked:=false;begin perform public.lantern_projection_store(wrong_signal,'get',prefix);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'ASSERT room key isolation';end if;
 perform public.lantern_projection_store(signal,'put',prefix,'{"items":["휴식","도전"]}');
 data:=public.lantern_projection_store(signal,'get',prefix);
 if data->>'value' is distinct from '{"items":["휴식","도전"]}' then raise exception 'ASSERT value preservation';end if;
 perform public.lantern_projection_store(signal,'put',prefix||'-expired','{}',now()-interval '1 second');
 if public.lantern_projection_store(signal,'get',prefix||'-expired')->'value'<>'null'::jsonb then raise exception 'ASSERT expiration';end if;
 for i in 1..501 loop perform public.lantern_projection_store(signal,'put',prefix||'-'||lpad(i::text,4,'0'),'{}');end loop;
 data:=public.lantern_projection_store(signal,'list',p_prefix=>prefix);
 if (data->>'list_complete')::boolean or jsonb_array_length(data->'keys')<>500 then raise exception 'ASSERT page 1';end if;
 data:=public.lantern_projection_store(signal,'list',p_prefix=>prefix,p_cursor=>data->>'cursor');
 if not(data->>'list_complete')::boolean or jsonb_array_length(data->'keys')<>2 then raise exception 'ASSERT page 2';end if;
 perform public.lantern_projection_store(signal,'delete',prefix);
 if public.lantern_projection_store(signal,'get',prefix)->'value'<>'null'::jsonb then raise exception 'ASSERT delete';end if;
end $$;
rollback;
select 'PASS: room-scoped key, exact JSON value, TTL, pagination, deletion. All test data rolled back.' as result;
