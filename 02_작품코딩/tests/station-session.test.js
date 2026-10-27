import test from 'node:test';
import assert from 'node:assert/strict';
import {createStationSession} from '../src/station-session.js';
import {treasureFixture} from './helpers/treasure-fixture.js';
const drain=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function setup(initial={visit_id:'one',nickname:'점검'}){
 let active=initial,last=active,starts=0,resets=0,saved=0,saveHandler;
 const calls=[];
 const session=createStationSession({onActivate:()=>starts++,onReset:()=>resets++,async request(action='state',body){
  calls.push({action,body:structuredClone(body)});
  if(action==='state')return{active,last};
  if(action==='start')return{status:'active'};
  if(action==='release'){active=null;last=null;return{};}
  if(saveHandler)return saveHandler(body);
  saved=Math.max(saved,body.result.revision);active=null;last={visit_id:body.visit_id,status:'completed'};
  return{visit_id:body.visit_id,status:'completed',saved_revision:saved};
 }});
 return{session,calls,get starts(){return starts;},get resets(){return resets;},active(value,status){active=value;last=value||(status?{visit_id:'one',status}:null);},save(fn){saveHandler=fn;}};
}
test('QR only offers a candidate; actual artwork begin binds it, and mobile stop or a new QR never resets artwork',async()=>{
 const f=setup();await f.session.sync();assert.equal(f.starts,0);assert.equal(f.session.state.active,false);f.session.begin(1000);assert.equal(f.starts,1);assert.equal(f.calls.at(-1).action,'start');
 f.active(null,'stopped');await f.session.sync();assert.equal(f.resets,0);assert.equal(f.session.state.active,false);f.active({visit_id:'two'});await f.session.sync();f.session.begin();assert.equal(f.starts,1);
 await f.session.reset();f.session.begin();assert.equal(f.starts,2);
});
test('no QR, failed DB and unpaired cloud sessions create no fabricated participant writes',async()=>{
 const f=setup(null);await f.session.sync();f.session.begin();f.session.submit(treasureFixture().initial);await drain();assert.equal(f.calls.filter(c=>c.action!=='state').length,0);
 const g=createStationSession({request:async()=>{throw Object.assign(Error('setup'),{code:'STATION_PAIRING_REQUIRED'});}});await g.sync();g.begin();g.submit(treasureFixture().initial);assert.equal(g.state.active,false);assert.equal(g.state.pairingRequired,true);
});
test('late QR cannot attach a running unlinked experience',async()=>{
 const f=setup(null);await f.session.sync();f.session.begin();f.active({visit_id:'late'});await f.session.sync();f.session.begin();f.session.submit(treasureFixture().initial);await drain();assert.equal(f.starts,0);assert.equal(f.calls.some(c=>c.action==='save'),false);
});
test('completion and revised choices preserve the original visitor, times and revision order',async()=>{
 const f=setup(),r=treasureFixture();await f.session.sync();f.session.begin();f.session.submit(r.initial);await drain();await f.session.sync();assert.equal(f.session.state.completed,true);assert.equal(f.resets,0);
 f.session.submit(r.change());await drain();f.session.submit(r.initial);await drain();assert.deepEqual(f.calls.filter(c=>c.action==='save').map(c=>c.body.result.revision),[6,7]);
 f.active({visit_id:'two'});await f.session.sync();assert.equal(f.resets,0);assert.equal(f.starts,1);assert.equal(f.session.state.active,false);f.session.submit(r.change());await drain();assert.equal(f.calls.filter(c=>c.action==='save').length,2);
});
test('edits while saving are serialized after the first revision',async()=>{
 const f=setup(),r=treasureFixture();await f.session.sync();f.session.begin();let resolve;f.save(()=>new Promise(done=>resolve=done));f.session.submit(r.initial);f.session.submit(r.change());await drain();assert.equal(f.calls.filter(c=>c.action==='save').length,1);
 f.save(undefined);resolve({visit_id:'one',status:'completed',saved_revision:6});await drain();assert.deepEqual(f.calls.filter(c=>c.action==='save').map(c=>c.body.result.revision),[6,7]);assert.equal(f.session.state.busy,false);
});
test('lost save survives immediate reset and standalone next run with exact original payload',async()=>{
 const f=setup();await f.session.sync();f.session.begin();f.save(async()=>{f.active(null,'completed');throw Error('offline');});f.session.submit(treasureFixture().initial);await drain();const original=f.calls.find(c=>c.action==='save');await f.session.reset();assert.equal(f.resets,1);f.active({visit_id:'two'});await f.session.sync();f.session.begin();assert.equal(f.session.state.active,false);f.save(undefined);await f.session.retry();const saves=f.calls.filter(c=>c.action==='save');assert.deepEqual(saves[0].body,saves[1].body);assert.deepEqual(saves[1].body,original.body);assert.equal(f.session.state.completed,false);
});
test('reset never waits for in-flight save; stopped saves detach the DB link without resetting artwork',async()=>{
 const f=setup();await f.session.sync();f.session.begin();let resolve;f.save(()=>new Promise(done=>resolve=done));f.session.submit(treasureFixture().initial);await f.session.reset();assert.equal(f.resets,1);assert.equal(f.session.state.active,false);assert.equal(f.calls.some(c=>c.action==='release'),false);f.session.begin();resolve({visit_id:'one',status:'completed',saved_revision:6});await drain();assert.equal(f.starts,1);
 const g=setup();await g.session.sync();g.session.begin();g.save(async()=>{throw Object.assign(Error('stopped'),{code:'VISIT_STOPPED'});});g.session.submit(treasureFixture().initial);await drain();assert.equal(g.session.state.active,false);assert.equal(g.resets,0);
});
test('pairing configures DB only and cannot restart an ongoing unlinked experience',async()=>{
 let paired=false,starts=0;const s=createStationSession({onActivate:()=>starts++,async request(action){if(action==='pair'){paired=true;return{ok:true};}if(!paired)throw Object.assign(Error('pair'),{code:'STATION_PAIRING_REQUIRED'});return{active:{visit_id:'one'}};}});
 await s.sync();s.begin();await s.pair('123456789012');assert.equal(s.state.pairingRequired,false);assert.equal(starts,0);await s.reset();s.begin();assert.equal(starts,1);
});
test('disposed reads cannot bind a visitor',async()=>{
 let resolve,starts=0;const s=createStationSession({request:()=>new Promise(done=>resolve=done),onActivate:()=>starts++});const read=s.sync();s.dispose();resolve({active:{visit_id:'late'}});await read;s.begin();assert.equal(starts,0);
});
