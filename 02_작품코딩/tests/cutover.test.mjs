import test from 'node:test';
import assert from 'node:assert/strict';
import {forwardLegacyApi} from '../cloudflare-redirect/_worker.js';
test('old active mobile tabs retain POST method, body and query without opening a cross-origin proxy',async()=>{
 const request=new Request('https://sugung-roomb.pages.dev/api/app/complete?x=1',{method:'POST',headers:{Origin:'https://sugung-roomb.pages.dev','Content-Type':'application/json'},body:'{"token":"fixture"}'});
 let received;await forwardLegacyApi(request,async req=>{received=req;return Response.json({ok:true});});
 assert.equal(received.url,'https://sugung-roomb.vercel.app/api/app/complete?x=1');assert.equal(received.method,'POST');assert.equal(await received.text(),'{"token":"fixture"}');assert.equal(received.headers.get('Origin'),'https://sugung-roomb.vercel.app');
 const denied=new Request('https://sugung-roomb.pages.dev/api/app/complete',{method:'POST',headers:{Origin:'https://foreign.example'},body:'{}'});
 assert.equal((await forwardLegacyApi(denied,()=>assert.fail('must not forward'))).status,403);
});
