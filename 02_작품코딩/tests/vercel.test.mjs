import test from 'node:test';
import assert from 'node:assert/strict';
import {SupabaseKV} from '../server/supabase-kv.js';
import {handleVercelRequest} from '../api/handler.js';
function fixture(){
 const values=new Map(),calls=[];
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',ROOM_SIGNAL_KEY:'private-fixture',STAFF_PIN:'123456'};
 const fetcher=async(url,options)=>{
  const a=JSON.parse(options.body);calls.push(a);
  if(url.endsWith('/get_room_waiting_visits'))return Response.json([]);
  const key=a.p_key;
  if(a.p_operation==='put')values.set(key,{value:a.p_value,expires:a.p_expires_at});
  if(a.p_operation==='delete')values.delete(key);
  if(a.p_operation==='get'){const row=values.get(key);return Response.json({value:row&&(!row.expires||Date.parse(row.expires)>Date.now())?row.value:null});}
  if(a.p_operation==='list')return Response.json({keys:[...values.keys()].filter(k=>k.startsWith(a.p_prefix)).map(name=>({name})),list_complete:true,cursor:null});
  return Response.json({ok:true});
 };
 return{env,values,calls,fetcher,kv:new SupabaseKV(env,fetcher)};
}
test('KV adapter preserves string/JSON/get/put/delete/list and TTL semantics',async()=>{
 const f=fixture();await f.kv.put('p:0417',JSON.stringify({items:['휴식','도전']}));
 assert.deepEqual(await f.kv.get('p:0417','json'),{items:['휴식','도전']});assert.equal(typeof await f.kv.get('p:0417'),'string');assert.equal(await f.kv.get('missing'),null);
 await f.kv.put('app-feed:visit','{}',{expirationTtl:604800});assert(Date.parse(f.values.get('app-feed:visit').expires)>Date.now());
 assert.equal((await f.kv.list({prefix:'p:'})).keys.length,1);await f.kv.delete('p:0417');assert.equal(await f.kv.get('p:0417'),null);
 assert(f.calls.every(a=>a.p_signal_key==='private-fixture'));
});
test('Vercel rewrite preserves API pathname, body, query and staff authentication',async()=>{
 const f=fixture();
 const req=new Request('https://room.vercel.app/api/handler?__room_route=participants/0417',{method:'PUT',headers:{'Content-Type':'application/json','x-staff-pin':'123456'},body:JSON.stringify({items:['휴식','도전']})});
 assert.equal((await handleVercelRequest(req,f.env,f.fetcher)).status,200);
 const response=await handleVercelRequest(new Request('https://room.vercel.app/api/handler?__room_route=participants/0417'),f.env,f.fetcher);
 assert.deepEqual((await response.json()).items,['휴식','도전']);
 assert.equal((await handleVercelRequest(new Request('https://room.vercel.app/api/staff/check'),f.env,f.fetcher)).status,401);
});
test('original feed endpoint reads imported data and app projection without Cloudflare',async()=>{
 const f=fixture();await f.kv.put('feed',JSON.stringify([{k:'0417/100',at:100,item:'휴식'}]));await f.kv.put('app-feed:visit',JSON.stringify({k:'app/visit',at:50,item:'도전'}));
 const response=await handleVercelRequest(new Request('https://room.vercel.app/api/feed?after=80'),f.env,f.fetcher);
 assert.deepEqual((await response.json()).items.map(i=>i.k),['app/visit','0417/100']);
});
test('legacy result saving and staff recolor contract remain usable',async()=>{
 const f=fixture();const record={nickname:'토끼',kept:{item:'휴식'},finishedAt:100};
 const r=await handleVercelRequest(new Request('https://room.vercel.app/api/participants/0417/roomB',{method:'POST',body:JSON.stringify(record)}),f.env,f.fetcher);
 assert.equal(r.status,200);assert.equal((await f.kv.get('r:0417/100','json')).nickname,'토끼');
});
test('storage failure cannot report successful persistence or leak server credentials',async()=>{
 const f=fixture();const response=await handleVercelRequest(new Request('https://room.vercel.app/api/feed'),f.env,async()=>Response.json({message:'private-fixture'},{status:403}));
 assert.equal(response.status,500);assert.equal((await response.text()).includes('private-fixture'),false);
});
