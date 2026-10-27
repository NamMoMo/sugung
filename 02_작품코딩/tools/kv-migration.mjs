// Recovery tool for remaining Cloudflare keys after its daily list quota resets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const [command,input,output]=process.argv.slice(2);
function privateOutput(name){
 if(!name)throw Error('Specify an output path outside the web project.');
 const target=path.resolve(name);if(!path.relative(root,target).startsWith('..'))throw Error('Keep backups outside the deployable project.');
 return target;
}
if(command==='backup'){
 const file=privateOutput(input),cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
 function run(args){const result=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',windowsHide:true});if(result.status!==0)throw Error('Cloudflare read failed; check CLI login, account and quota. Original data was not changed.');return result.stdout.trim();}
 const scope=['--namespace-id','51a5c1f9f1714f238c1e8f281c1732a4','--remote'];
 const keys=JSON.parse(run(['kv','key','list',...scope]));
 const records=keys.map(item=>({key:item.name,value:run(['kv','key','get',item.name,...scope,'--text']),expiration:item.expiration||null}));
 fs.writeFileSync(file,JSON.stringify(records,null,2));console.log(JSON.stringify({backedUp:records.length,sourceDeleted:false}));
}else if(command==='prepare-import'){
 const file=privateOutput(output),records=JSON.parse(fs.readFileSync(input,'utf8')),quote=value=>"'"+String(value).replaceAll("'","''")+"'";
 const rows=records.map(item=>`(${quote(item.key)},${quote(item.value)},${item.expiration?quote(new Date(item.expiration*1000).toISOString())+'::timestamptz':'null'})`);
 if(!rows.length)throw Error('Empty backup');
 fs.writeFileSync(file,'begin;\ninsert into public.lantern_projection_kv(key,value,expires_at) values\n'+rows.join(',\n')+'\non conflict(key) do nothing;\ncommit;\n');
 console.log(JSON.stringify({preparedRecords:rows.length,overwritesExistingKeys:false}));
}else throw Error('Usage: node tools/kv-migration.mjs backup <private-json> | prepare-import <private-json> <private-sql>');
