import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {cp,mkdir,readdir,rm} from 'node:fs/promises';
const root=fileURLToPath(new URL('.',import.meta.url)),source=path.join(root,'main'),output=path.resolve(root,'public');
if(path.relative(root,output)!=='public')throw new Error('Unsafe build output');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const excluded=new Set(['_worker.js','app-bridge-server.js','setup.mjs','wrangler.toml','_routes.json','_headers','수정위치_안내.md']);
for(const entry of await readdir(source,{withFileTypes:true})){if(entry.name.startsWith('.')||excluded.has(entry.name))continue;await cp(path.join(source,entry.name),path.join(output,entry.name),{recursive:true});}
console.log('Original mobile/display/staff assets prepared for Vercel. Server sources excluded.');
