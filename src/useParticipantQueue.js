import {LIMIT} from './interaction.js';
import {useEffect,useRef,useState} from 'react';
import {queueRequest,resultForSession} from './participant-queue.js';

// Optional record association. QR/DB state never controls artwork execution.
export function useParticipantQueue(scene,session,mode='camera') {
  const [state,setState]=useState({active:null}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[completionError,setCompletionError]=useState(false);
  const candidate=useRef(null),bound=useRef(null),pending=useRef(null),saving=useRef(false),alive=useRef(true),serial=useRef(0),runAt=useRef(null),ignored=useRef(new Set());
  const valid=useRef(true),latest=useRef({session,mode});latest.current={session,mode};
  const refresh=async()=>{
    const read=++serial.current;
    const data=await queueRequest();if(!alive.current||read!==serial.current)return;
    candidate.current=data.active||null;setState({active:candidate.current});
    if(pending.current&&data.last?.visit_id===pending.current.visit_id&&data.last.status==='stopped'){
      pending.current=null;setCompletionError(false);setError('모바일에서 해당 방문이 중지되었습니다.');
    }
  };
  useEffect(()=>{
    alive.current=true;
    const poll=async()=>{if(saving.current)return;try{await refresh();}catch(e){if(alive.current)setError(e.message);}};
    void poll();const timer=setInterval(poll,2000);
    return()=>{alive.current=false;serial.current++;clearInterval(timer);};
  },[]);
  useEffect(()=>{
    if(!Number.isFinite(session.startedAt)||runAt.current===session.startedAt)return;
    runAt.current=session.startedAt;bound.current=null;
    const person=candidate.current;
    if(mode!=='camera'||!valid.current||pending.current||!person||ignored.current.has(person.visit_id))return;
    bound.current=person;
    void queueRequest('start',{visit_id:person.visit_id,started_at:new Date(session.startedAt).toISOString()}).catch(e=>{if(alive.current)setError(e.message);});
  },[session.startedAt,mode]);
  async function retryFinish(){
    if(!pending.current||saving.current)return;
    const job=pending.current;saving.current=true;setBusy(true);setError('');
    try{
      const reply=await queueRequest('complete',job);
      if(reply.status!=='completed')throw new Error('완료 저장을 확인하지 못했습니다.');
      if(pending.current===job)pending.current=null;ignored.current.add(job.visit_id);
      if(bound.current?.visit_id===job.visit_id)bound.current=null;
      if(alive.current){setCompletionError(false);await refresh();}
    }catch(e){if(alive.current){if(['VISIT_STOPPED','VISIT_NOT_CURRENT'].includes(e.code))pending.current=null;setCompletionError(!!pending.current);setError(e.message);}}
    finally{saving.current=false;if(alive.current)setBusy(false);}
  }
  useEffect(()=>{
    if(scene!=='escaped')return;
    const person=bound.current,current=latest.current;
    if(!person||pending.current||candidate.current?.visit_id!==person.visit_id)return;
    if(current.mode!=='camera'||!valid.current||current.session.count!==LIMIT){setError('테스트 체험은 완료로 기록하지 않습니다.');return;}
    pending.current={visit_id:person.visit_id,result:resultForSession(current.session)};
    void retryFinish();
  },[scene]);
  function release(){
    const person=bound.current;bound.current=null;runAt.current=null;valid.current=true;
    if(person)ignored.current.add(person.visit_id);
    if(!person||pending.current)return Promise.resolve();
    return queueRequest('release',{visit_id:person.visit_id}).then(()=>refresh()).catch(e=>{if(alive.current)setError(e.message);});
  }
  return {state,error,busy,completionError,valid,release,refresh:()=>refresh().catch(e=>setError(e.message)),retryFinish};
}
