const test=require('node:test'),assert=require('node:assert/strict');
const {Controller,resultForExperience}=require('../station.js');
const {config,experience}=require('./fixture.cjs');
const id='5c0fc382-9eb0-42fd-98f6-c9f4b10a287c',other='8b1d7c57-e2bc-4c0d-8c02-c24a59034464';
test('normal result preserves seven answers, 15 catches, score classification and history',()=>{
 const r=resultForExperience(config,experience());assert.equal(r.room_id,'conflict');assert.equal(r.team_id,3);assert.equal(r.questions.length,7);assert.equal(r.history.length,22);assert.equal(r.outcome.side,'right');assert.equal(r.scores.total,22);assert.equal(r.duration_ms,240000);
});
test('60 seconds may finish with zero captures and still scores initial choices',()=>{const r=resultForExperience(config,experience({timeout:true}));assert.equal(r.scores.total,7);assert.equal(r.rain_end_reason,'active_time_limit');assert.equal(r.outcome.side,'left');});
test('mouse, debug, incomplete answers and incomplete rain cannot produce DB results',()=>{
 for(const changes of [{mode:'mouse'},{test:true},{chosen:['고용 안정']},{caught:{},caughtTotal:0,lastCaught:'',rainActive:59},{caught:{'미지의 단어':15}},{finishedAt:0}])assert.throws(()=>resultForExperience(config,{...experience(),...changes}));
});
test('first choice point plus capture point, including final-capture tie break, match final catalog',()=>{
 for(const q of config.questions)for(const word of q[2])assert.equal(config.wordScores[word].side,config.sideFor(word));
 const chosen=config.questions.map(q=>q[2][0]);const r=config.resolveResult({'높은 연봉':1},'높은 연봉',chosen);assert.equal(r.left,r.right);assert.equal(r.side,'right');
});
test('polling binds the QR visitor once, no waiting selection, and removes stopped visitor',async()=>{
 let active={visit_id:id},starts=0,stops=0;const c=new Controller({request:async()=>({active}),onAssignment:()=>starts++,onLost:()=>stops++});await c.refresh();await c.refresh();assert.equal(starts,1);assert.equal(c.allowed,true);assert.equal(c.enterPreview(),false);active=null;await c.refresh();assert.equal(stops,1);assert.equal(c.allowed,false);
});
test('preview never writes completion',async()=>{const c=new Controller({request:()=>{throw Error('unexpected')}});assert.equal(c.enterPreview(),true);assert.equal(await c.finish({}),false);c.leavePreview();assert.equal(c.allowed,false);});
test('lost completion response retains exact original participant and immutable result for retry',async()=>{
 let active={visit_id:id},fail=true,writes=[];const r=resultForExperience(config,experience());const c=new Controller({request:async(action,body)=>{if(action==='state')return{active};writes.push(structuredClone(body));if(fail)throw Error('offline');return{status:'completed'};}});
 await c.refresh();assert.equal(await c.finish(r),false);r.summary.keywords[0]='changed';active={visit_id:other};await c.refresh();assert.equal(c.active.visit_id,id);assert.equal(await c.release(),false);fail=false;assert.equal(await c.retry(),true);assert.deepEqual(writes[0],writes[1]);assert.equal(writes[1].visit_id,id);assert.equal(c.saved,true);await c.refresh();assert.equal(c.active.visit_id,other);
});
test('late poll cannot restore a participant after completion or release',async()=>{
 let resolve;const c=new Controller({request:async(action)=>action==='state'?new Promise(r=>resolve=r):{status:'completed'}});c.active={visit_id:id};const read=c.refresh();await c.finish(resultForExperience(config,experience()));resolve({active:{visit_id:id}});await read;assert.equal(c.active,null);assert.equal(c.saved,true);
});
test('release failure keeps the active participant; success returns to QR gate',async()=>{
 let fail=true;const c=new Controller({request:async()=>{if(fail)throw Error('offline');return{active:null};}});c.active={visit_id:id};assert.equal(await c.release(),false);assert.equal(c.active.visit_id,id);fail=false;assert.equal(await c.release(),true);assert.equal(c.active,null);
});
test('a mobile stop after a failed save releases the held screen without awarding completion',async()=>{
 let actionState={active:null,last:{visit_id:id,status:'stopped'}},stops=0;
 const c=new Controller({request:async(action)=>{if(action==='state')return actionState;throw Error('offline');},onLost:()=>stops++});
 c.active={visit_id:id};await c.finish(resultForExperience(config,experience()));assert.equal(c.held,true);await c.refresh();assert.equal(c.held,false);assert.equal(c.active,null);assert.equal(stops,1);
});
test('terminal stopped completion response cannot leave a new participant blocked behind an old failed save',async()=>{
 let stops=0;const c=new Controller({request:async()=>{const error=Error('stopped');error.code='VISIT_STOPPED';throw error;},onLost:()=>stops++});c.active={visit_id:id};await c.finish(resultForExperience(config,experience()));assert.equal(c.held,false);assert.equal(c.active,null);assert.equal(stops,1);
});
