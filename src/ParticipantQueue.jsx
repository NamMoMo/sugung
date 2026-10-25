import React from 'react';
import './participant-queue.css';

export default function ParticipantQueue({ state, error, busy, onSelect, onRefresh, onResume, onRelease }) {
  return <section className="participant-queue" aria-label="참가자 선택">
    <div className="participant-queue__panel">
      <p>수궁야행 · 역기능적 믿음</p><h1>참가자를 선택해 주세요</h1>
      <p>먼저 QR 입장을 마친 순서입니다. 한 명을 선택하면 대기화면으로 이동합니다.</p>
      {error && <p role="alert">{error}</p>}
      {state.active ? <div>
        <h2>진행 중인 참가자</h2><p>{state.active.nickname} · {state.active.participant_code}</p>
        <p>연결된 체험이 있습니다. 새로고침한 경우 같은 참가자의 체험을 다시 시작할 수 있습니다.</p>
        <button disabled={busy} onClick={onResume}>이 참가자로 체험 시작</button>
        <button disabled={busy} onClick={onRelease}>선택 취소 · 대기 명단으로</button>
      </div> : <ol>
        {state.waiting.map(v => <li key={v.visit_id}>
          <button disabled={busy} onClick={() => onSelect(v)}>
            <strong>{v.nickname || '참가자'}</strong><span>{v.participant_code}</span>
            <small>{new Date(v.entered_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 입장</small>
          </button>
        </li>)}
      </ol>}
      {!state.active && !state.waiting.length && <p role="status">QR 입장한 참가자를 기다리고 있습니다.</p>}
      <button disabled={busy} onClick={onRefresh}>명단 새로고침</button>
    </div>
  </section>;
}
