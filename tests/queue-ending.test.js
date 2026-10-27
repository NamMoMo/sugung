import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
import {useParticipantQueue} from '../src/useParticipantQueue.js';
import {LIMIT,newSession} from '../src/interaction.js';

async function fixture(initialActive={visit_id:'one',nickname:'점검'}){
 const old={fetch:globalThis.fetch,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,act:globalThis.IS_REACT_ACT_ENVIRONMENT};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let poll,queue,renderer,active=initialActive,fail=false,offline=false;
 const calls=[];
 globalThis.setInterval=fn=>{poll=fn;return 1;};globalThis.clearInterval=()=>{};
 globalThis.fetch=async(url,options)=>{
  if(offline)throw Error('offline');
  if(options.method==='GET')return{ok:true,json:async()=>({active})};
  const body=JSON.parse(options.body);calls.push({url,body:structuredClone(body)});
  if(url.endsWith('/start'))return{ok:true,json:async()=>({status:'active'})};
  if(url.endsWith('/complete')){active=null;if(fail)throw Error('lost response');return{ok:true,json:async()=>({status:'completed'})};}
  if(url.endsWith('/release')){active=null;return{ok:true,json:async()=>({})};}
  assert.fail(url);
 };
 let current=newSession(),mode='camera';
 function Harness(){queue=useParticipantQueue(current.scene,current,mode);return React.createElement('main',null,current.scene);}
 const render=async()=>{await act(async()=>{renderer.update(React.createElement(Harness));});};
 await act(async()=>{renderer=create(React.createElement(Harness));});
 return{get queue(){return queue;},calls,setActive(value){active=value;},fail(value){fail=value;},offline(value){offline=value;},
  async start(input='camera'){mode=input;current={...newSession(),scene:'intro',startedAt:1000};await render();},
  async end(count=LIMIT){current={...current,scene:'escaped',count,finishedAt:10000};await render();},
  async poll(){await act(async()=>{await poll();});},
  async reset(){await act(async()=>{const release=queue.release();current=newSession();renderer.update(React.createElement(Harness));await release;});},
  async close(){await act(async()=>renderer.unmount());globalThis.fetch=old.fetch;globalThis.setInterval=old.setInterval;globalThis.clearInterval=old.clearInterval;if(old.act===undefined)delete globalThis.IS_REACT_ACT_ENVIRONMENT;else globalThis.IS_REACT_ACT_ENVIRONMENT=old.act;}
 };
}
test('QR is optional: empty/offline station exposes no artwork lock and awards no fabricated completion',async()=>{
 for(const offline of [false,true]){const f=await fixture(null);try{f.offline(offline);await f.poll();assert.equal('show' in f.queue,false);assert.equal('blocked' in f.queue,false);await f.start();await f.end();assert.equal(f.calls.length,0);}finally{await f.close();}}
});
test('real start freezes the optional visitor; 09 saves exactly once and remains owned by the artwork',async()=>{
 const f=await fixture();try{assert.equal(f.calls.length,0);await f.start();assert.equal(f.calls[0].url.endsWith('/start'),true);assert.equal(f.calls[0].body.visit_id,'one');await f.end();await f.poll();assert.equal(f.calls.filter(c=>c.url.endsWith('/complete')).length,1);assert.equal(f.queue.completionError,false);assert.equal('show' in f.queue,false);}finally{await f.close();}
});
test('QR arriving after artwork start cannot acquire that run; mobile stop does not create completion',async()=>{
 const f=await fixture(null);try{await f.start();f.setActive({visit_id:'late'});await f.poll();await f.end();assert.equal(f.calls.length,0);}finally{await f.close();}
 const g=await fixture();try{await g.start();g.setActive(null);await g.poll();await g.end();assert.equal(g.calls.filter(c=>c.url.endsWith('/complete')).length,0);}finally{await g.close();}
});
test('failed completion survives reset and next standalone run with original visitor and frozen payload',async()=>{
 const f=await fixture();try{await f.start();f.fail(true);await f.end();assert.equal(f.queue.completionError,true);const original=f.calls.find(c=>c.url.endsWith('/complete'));await f.reset();f.setActive({visit_id:'two'});await f.poll();await f.start();await f.end();f.fail(false);await act(async()=>{await f.queue.retryFinish();});const saves=f.calls.filter(c=>c.url.endsWith('/complete'));assert.equal(saves.length,2);assert.deepEqual(saves[1],original);}finally{await f.close();}
});
test('mouse/admin skip runs never award completion, and release failure has no artwork reset dependency',async()=>{
 const f=await fixture();try{await f.start('demo');await f.end();assert.equal(f.calls.length,0);}finally{await f.close();}
 const g=await fixture();try{await g.start();g.queue.valid.current=false;await g.end(0);assert.equal(g.calls.filter(c=>c.url.endsWith('/complete')).length,0);g.offline(true);await g.reset();assert.match(g.queue.error,/offline/);assert.equal('blocked' in g.queue,false);}finally{await g.close();}
});

test('stale DB state cannot rebind an already completed visitor to the next artwork run',async()=>{
 const f=await fixture();try{await f.start();await f.end();f.setActive({visit_id:'one'});await f.poll();await f.reset();await f.start();assert.equal(f.calls.filter(c=>c.url.endsWith('/start')).length,1);}finally{await f.close();}
});
