export async function stationRequest(action = 'state', data, fetcher = fetch) {
  const response = await fetcher(`/api/treasure-station/${action === 'state' ? '' : action}`, {
    method: action === 'state' ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  });
  const body = await response.json();
  if (!response.ok) { const error = new Error(body.error || '체험 서버에 연결하지 못했습니다.'); error.code = body.code; throw error; }
  return body;
}

// The artwork owns its lifecycle; this session only associates optional DB records.
export function createStationSession({request=stationRequest,onChange=()=>{},onActivate=()=>{},onReset=()=>{}}={}){
  let disposed=false,serial=0,epoch=0,candidate=null,person=null,owner=null,pending=null,saving=false,resetting=false,running=false,holdResult=false,savedRevision=0;
  const ignored=new Set();
  let state={ready:false,active:false,busy:false,completed:false,error:'',participant:null,pairingRequired:false,pairingBusy:false};
  const emit=patch=>{if(!disposed){state={...state,...patch};onChange(state);}};
  function detach(){person=null;emit({active:false,completed:false,participant:candidate});}
  async function sync(){
    if(disposed||saving||resetting)return;
    const read=++serial,version=epoch;
    try{
      const data=await request();if(disposed||read!==serial||version!==epoch)return;
      candidate=data.active||null;
      emit({ready:true,pairingRequired:false,...(!pending?{error:''}:{}),participant:person||candidate});
      if(pending&&data.last?.visit_id===owner?.visit_id&&data.last.status==='stopped'){pending=null;owner=null;detach();emit({error:'해당 방문은 모바일에서 중지되었습니다.'});}
      if(person&&candidate?.visit_id!==person.visit_id){
        const ownCompleted=holdResult&&!candidate&&data.last?.visit_id===person.visit_id&&data.last.status==='completed';
        if(!ownCompleted){detach();if(!pending)owner=null;}
      }
    }catch(error){emit({error:error.message,...(error.code==='STATION_PAIRING_REQUIRED'?{pairingRequired:true}:{})});}
  }
  function begin(startedAt=Date.now()){
    if(disposed||running)return;
    running=true;person=!pending&&!saving&&!resetting&&!state.pairingRequired&&candidate&&!ignored.has(candidate.visit_id)?candidate:null;
    if(person){owner=person;holdResult=false;savedRevision=0;epoch++;onActivate(person);
      void request('start',{visit_id:person.visit_id,started_at:new Date(startedAt).toISOString()}).catch(error=>emit({error:error.message,...(error.code==='STATION_PAIRING_REQUIRED'?{pairingRequired:true}:{})}));
    }
    emit({active:!!person,participant:person||candidate,completed:false});
  }
  async function pair(code){
    if(disposed||state.pairingBusy)return;
    serial++;emit({pairingBusy:true,error:''});
    try{const reply=await request('pair',{code:String(code).trim()});if(!reply.ok)throw new Error('기기 연결을 확인하지 못했습니다.');emit({pairingRequired:false,error:''});await sync();void flush();}
    catch(error){emit({pairingRequired:true,error:error.message});}
    finally{emit({pairingBusy:false});}
  }
  async function flush(){
    if(saving||disposed||!pending||!owner)return;
    saving=true;const version=epoch,id=owner.visit_id;emit({busy:true,error:''});
    try{
      while(pending&&!disposed&&epoch===version){
        const snapshot=pending,reply=await request('save',{visit_id:id,result:snapshot});
        if(disposed||epoch!==version)return;
        if(reply.visit_id!==id||reply.status!=='completed'||reply.saved_revision<snapshot.revision)throw new Error('완료 기록을 확인하지 못했습니다. 다시 저장해 주세요.');
        savedRevision=reply.saved_revision;if(pending.revision<=savedRevision)pending=null;
        emit({completed:person?.visit_id===id,error:''});
      }
    }catch(error){
      if(epoch===version&&!disposed){
        if(['VISIT_STOPPED','VISIT_NOT_CURRENT'].includes(error.code)){pending=null;owner=null;detach();}
        emit({error:error.message,...(error.code==='STATION_PAIRING_REQUIRED'?{pairingRequired:true}:{})});
      }
    }finally{saving=false;emit({busy:false});}
  }
  function submit(result){
    if(!person||owner?.visit_id!==person.visit_id||disposed||result.revision<=savedRevision||result.revision<=(pending?.revision||0))return;
    holdResult=true;pending=structuredClone(result);void flush();
  }
  async function reset(){
    if(disposed)return;
    const previous=person;person=null;running=false;
    if(previous)ignored.add(previous.visit_id);
    onReset();emit({active:false,completed:false,participant:candidate});
    // Retain an unfinished write under its original visitor, while the artwork resets immediately.
    if(pending||saving){if(!saving)void flush();return;}
    owner=null;savedRevision=0;holdResult=false;
    if(!previous||resetting)return;
    resetting=true;
    try{await request('release',{visit_id:previous.visit_id});await sync();}
    catch(error){emit({error:error.message});}
    finally{resetting=false;}
  }
  return{sync,begin,submit,reset,pair,retry:flush,get state(){return state;},dispose(){disposed=true;epoch++;serial++;}};
}
