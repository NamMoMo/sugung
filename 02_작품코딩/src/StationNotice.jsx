import './station.css';
import {useState} from 'react';
import InstallButton from './InstallButton.jsx';

export default function StationNotice({station,language}){
  const [code,setCode]=useState('');
  if(!station.enabled)return null;
  const en=language==='en';
  return <details className="station-control">
    <summary>{en?'Operator · DB':'운영 · DB'}</summary>
    <div className="station-panel">
      <p>{station.active?(en?'Visitor linked to this experience':'현재 체험에 관객 연결됨'):(en?'Standalone play · visitor link optional':'단독 체험 가능 · 관객 연결은 선택 사항')}</p>
      {station.participant&&<p>{station.participant.nickname} · {station.participant.participant_code}</p>}
      {station.pairingRequired&&<form className="station-pair" onSubmit={event=>{event.preventDefault();void station.pair(code);}}>
        <label htmlFor="station-pair-code">{en?'Device code for DB records':'DB 기록용 기기 연결 코드'}</label>
        <input id="station-pair-code" type="password" inputMode="numeric" autoComplete="off" maxLength={12} required pattern="[0-9]{12}" value={code} onChange={event=>setCode(event.target.value)}/>
        <button disabled={station.pairingBusy}>{en?'Connect DB':'DB 연결'}</button>
      </form>}
      {station.busy&&<p>{en?'Saving result…':'결과 저장 중…'}</p>}
      {station.completed&&<p>{en?'Result saved. Edits are saved too.':'결과가 저장되었습니다. 수정 결과도 반영됩니다.'}</p>}
      {station.error&&<p role="status">{station.error}</p>}
      <button onClick={station.retry}>{en?'Retry DB connection/save':'DB 연결·저장 다시 시도'}</button>
      <InstallButton language={language}/>
    </div>
  </details>;
}
