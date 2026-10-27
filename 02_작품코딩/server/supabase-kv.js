// Compatibility adapter: preserve the original ROOMB KV contract on Supabase.
export class SupabaseKV{
  constructor(env,fetcher=fetch){this.env=env;this.fetcher=fetcher;}
  async rpc(operation,args={}){
    const env=this.env;
    if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.ROOM_SIGNAL_KEY)throw new Error('STORAGE_NOT_CONFIGURED');
    const response=await this.fetcher(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/lantern_projection_store',{
      method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({p_signal_key:env.ROOM_SIGNAL_KEY,p_operation:operation,...args}),signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)throw new Error('STORAGE_REQUEST_FAILED');
    return response.json();
  }
  async get(key,type){const result=await this.rpc('get',{p_key:key});const value=result?.value??null;return value===null?null:(type==='json'?JSON.parse(value):value);}
  async put(key,value,options={}){const expiration=options.expirationTtl?new Date(Date.now()+options.expirationTtl*1000).toISOString():null;await this.rpc('put',{p_key:key,p_value:String(value),p_expires_at:expiration});}
  async delete(key){await this.rpc('delete',{p_key:key});}
  async list({prefix='',cursor=''}={}){return this.rpc('list',{p_prefix:prefix,p_cursor:cursor||''});}
}
