// Deterministic camera/clock/media doubles; no real camera or database is used.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {config}=require('./fixture.cjs');
async function app({linked=true,offline=false,failComplete=false}={}){
 let time=1760000000000,raf,camera,poll,participant=linked?{visit_id:'5c0fc382-9eb0-42fd-98f6-c9f4b10a287c',nickname:'fixture',participant_code:'fixture'}:null;const nodes=new Map(),listeners={},writes=[];
 const paint=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'||key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 function element(id=''){
  return{id,hidden:true,disabled:false,value:id==='gestureMode'?'both':'camera',checked:true,dataset:{},style:{},textContent:'',readyState:4,currentTime:0,duration:10,paused:true,
   classList:{add(){},remove(){},toggle(){},contains(){return true;}},getContext:()=>paint,addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:720,height:1280}),
   querySelectorAll:()=>[],getAttribute(name){return this[name];},setAttribute(name,value){this[name]=value;},load(){},async play(){this.paused=false;},pause(){this.paused=true;},requestFullscreen:async()=>{}};
 }
 const document={hidden:false,activeElement:null,getElementById:id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);},createElement:()=>element(),addEventListener:(name,fn)=>listeners[name]=fn};
 class Camera{constructor(video,onResult){camera=this;this.onResult=onResult;this.gestures={reset(){}};}clear(){this.onResult({hands:[],events:[]});}stop(){this.ready=false;this.clear();}async connect(){this.ready=true;return true;}tick(){}}
 class Sound{setScene(){}play(){}pause(){}resume(){}setEnabled(){}setVolume(){}async unlock(){}}
 const ctx={console,document,WaveConfig:config,CameraInput:Camera,WaveSound:Sound,Image:class{constructor(){this.complete=false;}},performance:{now:()=>time},Date:class extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}},setInterval(fn){poll=fn;},setTimeout(){},requestAnimationFrame:fn=>raf=fn,location:{protocol:'http:'},AbortSignal,fetch:async(url,options)=>{
  if(offline)throw Error('offline');
  if(options.method==='POST'){writes.push({url,body:JSON.parse(options.body)});if(failComplete&&url.endsWith('/complete'))throw Error('offline');return{ok:true,json:async()=>({status:url.endsWith('/start')?'active':'completed'})};}
  return{ok:true,json:async()=>({active:participant})};
 }};
 ctx.window=ctx;ctx.globalThis=ctx;ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../station.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};await flush();
 return{nodes,writes,listeners,flush,async poll(){poll();await flush();},setParticipant(value){participant=value;},hand(visible){camera.onResult({hands:visible?[{id:'Left',x:205/720,y:570/1280}]:[],events:[]});},tick(seconds){for(let i=0;i<Math.ceil(seconds/.05);i++){time+=50;raf(time);}},async start(){await nodes.get('begin').onclick();await flush();nodes.get('opening').onended();await flush();}};
}
async function journey(a){
 await a.start();
 for(let i=0;i<7;i++){a.hand(false);a.tick(.1);a.hand(true);a.tick(1.85);}
 assert.equal(a.nodes.get('count').textContent.startsWith('7 / 7'),true);
 a.tick(6.1);a.hand(true);a.tick(60.1);a.tick(6.1);await a.flush();
 assert.equal(a.writes.filter(w=>w.url.endsWith('/complete')).length,0);
 a.nodes.get('film').onended();a.tick(4.1);await a.flush();
 assert.equal(a.writes.filter(w=>w.url.endsWith('/complete')).length,0);
 a.nodes.get('ending').onended();await a.flush();
}
test('linked camera run records start immediately and saves once only AFTER ending, then returns to original intro',async()=>{
 const a=await app();await journey(a);
 assert.equal(a.writes.length,2);assert.equal(a.writes[0].url.endsWith('/start'),true);
 assert.equal(a.writes[1].body.visit_id,'5c0fc382-9eb0-42fd-98f6-c9f4b10a287c');
 const r=a.writes[1].body.result;assert.equal(r.input_mode,'camera');assert.equal(r.questions.length,7);assert.equal(r.captured_total,0);assert.equal(r.rain_end_reason,'active_time_limit');assert.equal(r.history.length,7);
 assert.equal(a.nodes.get('complete').hidden,false);a.tick(12.1);await a.flush();assert.equal(a.nodes.get('intro').hidden,false);
});
test('keyboard branch preview cannot award a real QR visitor completion',async()=>{
 const a=await app();await a.start();a.listeners.keydown({key:'4'});await a.flush();a.nodes.get('film').onended();a.tick(4.1);await a.flush();a.nodes.get('ending').onended();await a.flush();assert.equal(a.writes.filter(w=>w.url.endsWith('/complete')).length,0);assert.match(a.nodes.get('notice').textContent,/테스트/);
});
test('no QR and offline DB both allow the whole normal camera artwork without participant writes',async()=>{
 for(const settings of [{linked:false},{linked:false,offline:true}]){const a=await app(settings);assert.equal(a.nodes.get('intro').hidden,false);await journey(a);assert.equal(a.writes.length,0);assert.equal(a.nodes.get('complete').hidden,false);a.tick(12.1);await a.flush();assert.equal(a.nodes.get('intro').hidden,false);}
});
test('QR arrival or mobile stop during artwork does not reset it or attach the current unlinked run to a new visitor',async()=>{
 const a=await app({linked:false});await a.start();a.hand(true);a.tick(.4);const label=a.nodes.get('count').textContent;
 a.setParticipant({visit_id:'8b1d7c57-e2bc-4c0d-8c02-c24a59034464',nickname:'next',participant_code:'next'});await a.poll();assert.equal(a.nodes.get('question').hidden,false);assert.equal(a.nodes.get('count').textContent,label);
 a.setParticipant(null);await a.poll();assert.equal(a.nodes.get('question').hidden,false);assert.equal(a.writes.length,0);
});
test('completion DB failure does not hold the ending or prevent the next standalone run',async()=>{
 const a=await app({failComplete:true});await journey(a);a.tick(12.1);await a.flush();assert.equal(a.nodes.get('intro').hidden,false);await a.start();assert.equal(a.nodes.get('question').hidden,false);assert.equal(a.writes.filter(w=>w.url.endsWith('/start')).length,1);
});
