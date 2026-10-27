(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.WaveStation=value;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  function resultForExperience(config,s){
    if(s.mode!=='camera'||s.test||s.chosen.length!==7||!s.chosen.every((w,i)=>config.questions[i][2].includes(w)))throw new Error('TEST_OR_INCOMPLETE_EXPERIENCE');
    const captureTotal=Object.values(s.caught).reduce((n,v)=>n+v,0);
    if(captureTotal!==s.caughtTotal||captureTotal>15||captureTotal<0||!Object.entries(s.caught).every(([w,n])=>s.chosen.includes(w)&&Number.isInteger(n)&&n>0)||!(captureTotal===15||s.rainActive>=60))throw new Error('INCOMPLETE_RAIN');
    if(captureTotal?s.caught[s.lastCaught]===undefined:!!s.lastCaught)throw new Error('INVALID_LAST_CAPTURE');
    if(!Number.isFinite(s.startedAt)||!Number.isFinite(s.finishedAt)||s.finishedAt<s.startedAt)throw new Error('INVALID_TIME');
    const r=config.resolveResult(s.caught,s.lastCaught,s.chosen);
    return {
      schema_version:1,room_id:'conflict',team_id:3,completion_mode:'normal',input_mode:'camera',
      started_at:new Date(s.startedAt).toISOString(),finished_at:new Date(s.finishedAt).toISOString(),duration_ms:s.finishedAt-s.startedAt,
      questions:s.chosen.map((word,i)=>({question_index:i,category:config.questions[i][0],word,side:config.sideFor(word)})),
      selected_keywords:[...s.chosen],captured_counts:{...s.caught},captured_total:captureTotal,last_captured_word:s.lastCaught,
      rain_active_ms:Math.round(s.rainActive*1000),rain_end_reason:captureTotal===15?'capture_target':'active_time_limit',
      scores:{development:r.development,stability:r.stability,selection:r.selection,capture:r.capture,total:r.total,tie:r.tie},
      outcome:{side:r.side,label:r.label,value:r.value,realm:r.realm,bias:r.bias,strength:r.strength},
      summary:{keywords:[...s.chosen],result:r.value},history:s.history.map(e=>({...e})),
    };
  }
  class Controller{
    constructor({request,onChange=()=>{},onAssignment=()=>{},onLost=()=>{}}){this.request=request;this.onChange=onChange;this.onAssignment=onAssignment;this.onLost=onLost;this.active=null;this.preview=false;this.pending=null;this.saved=false;this.error='';this.epoch=0;this.polling=false;this.saving=false;this.releasing=false;}
    get allowed(){return this.preview||!!this.active;}
    get held(){return !!this.pending;}
    notify(){this.onChange(this);}
    async refresh(){
      if(this.polling||this.releasing)return;this.polling=true;const epoch=this.epoch;
      try{const data=await this.request('state');if(epoch!==this.epoch)return;
        // Keep a failed completion bound to its original visit; never reuse it for a newcomer.
        if(this.pending){
          if(data.last?.visit_id===this.pending.visit_id&&data.last.status==='stopped'){this.pending=null;this.active=null;this.saved=false;this.epoch++;this.error='모바일에서 체험이 중지되었습니다.';this.onLost();this.notify();}
          return;
        }
        const next=data.active||null;
        if(next?.visit_id!==this.active?.visit_id){const previous=this.active;this.active=next;this.epoch++;this.saved=false;this.preview=false;this.error='';
          if(next)this.onAssignment(next);else if(previous)this.onLost();
        }
        this.error='';this.notify();
      }catch(e){if(epoch===this.epoch){this.error=e.message;this.notify();}}
      finally{this.polling=false;}
    }
    enterPreview(){if(this.active||this.pending)return false;this.preview=true;this.error='';this.notify();return true;}
    leavePreview(){this.preview=false;this.notify();}
    async finish(result){if(!this.active||this.preview||this.pending)return false;this.pending={visit_id:this.active.visit_id,result:JSON.parse(JSON.stringify(result))};this.epoch++;this.notify();return this.retry();}
    async retry(){
      if(!this.pending||this.saving)return false;this.saving=true;this.error='';this.notify();
      try{const reply=await this.request('complete',this.pending);if(reply.status!=='completed')throw new Error('완료 저장 응답을 확인하지 못했습니다.');this.pending=null;this.active=null;this.saved=true;this.epoch++;this.error='';this.notify();return true;}
      catch(e){this.error=e.message;if(['VISIT_STOPPED','VISIT_NOT_CURRENT'].includes(e.code)){this.pending=null;this.active=null;this.epoch++;this.onLost();}this.notify();return false;}
      finally{this.saving=false;this.notify();}
    }
    async release(){
      if(this.pending||this.releasing)return false;
      if(!this.active){this.leavePreview();return true;}
      const id=this.active.visit_id;this.releasing=true;this.epoch++;
      try{await this.request('release',{visit_id:id});this.active=null;this.saved=false;this.preview=false;this.error='';this.onLost();this.notify();return true;}
      catch(e){this.error=e.message;this.notify();return false;}
      finally{this.releasing=false;}
    }
  }
  async function request(action='state',body){
    const response=await fetch('/api/wave-station/'+(action==='state'?'':action),{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw new Error('전시 서버를 실행하기.bat로 열었는지 확인해 주세요.');}
    if(!response.ok){const error=new Error(data.error||'DB 연결을 확인해 주세요.');error.code=data.code;throw error;}return data;
  }
  return {Controller,resultForExperience,request};
});
