import worker from '../main/_worker.js';
import {SupabaseKV} from '../server/supabase-kv.js';

export async function handleVercelRequest(request,settings=process.env,fetcher=fetch){
  const url=new URL(request.url),route=url.searchParams.get('__room_route');
  if(route!==null){url.pathname='/api/'+route;url.searchParams.delete('__room_route');request=new Request(url,request);}
  if(!url.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
  const env={SUPABASE_URL:settings.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:settings.SUPABASE_PUBLISHABLE_KEY,ROOM_SIGNAL_KEY:settings.ROOM_SIGNAL_KEY,STAFF_PIN:settings.STAFF_PIN};
  env.ROOMB=new SupabaseKV(env,fetcher);
  return worker.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{}),passThroughOnException(){}});
}
export default {fetch:request=>handleVercelRequest(request)};
