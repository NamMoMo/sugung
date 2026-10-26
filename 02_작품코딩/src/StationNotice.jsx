import './station.css';
import { useState } from 'react';
import InstallButton from './InstallButton.jsx';

export default function StationNotice({ station, language }) {
  const [code, setCode] = useState('');
  if (!station.enabled) return null;
  const en = language === 'en';
  if (station.pairingRequired) return <section className="station-gate" aria-label={en ? 'Connect exhibition device' : '전시 기기 연결'}>
    <div><p>{en ? 'SUGUNG · The Treasure Chamber' : '수궁야행 · 용왕님의 보물의 방'}</p>
      <h1>{en ? 'Connect this exhibition device' : '전시 기기를 연결해 주세요'}</h1>
      <p>{en ? 'Enter the setup code once. This device will remember its connection.' : '처음 한 번 기기 연결 코드를 입력하면 다음 실행에도 연결이 유지됩니다.'}</p>
      <form className="station-pair" onSubmit={event => { event.preventDefault(); void station.pair(code); }}>
        <label htmlFor="station-pair-code">{en ? 'Device setup code' : '기기 연결 코드'}</label>
        <input id="station-pair-code" type="password" inputMode="numeric" autoComplete="off" maxLength={12} required pattern="[0-9]{12}" value={code} onChange={event => setCode(event.target.value)} />
        <button disabled={station.pairingBusy}>{station.pairingBusy ? (en ? 'Connecting…' : '연결 중…') : (en ? 'Connect device' : '기기 연결')}</button>
      </form>
      {station.error && <p role="alert">{en ? 'Check the device setup code and connection.' : station.error}</p>}
      <InstallButton language={language} />
    </div>
  </section>;
  if (!station.active) return <section className="station-gate" aria-label={en ? 'QR admission' : 'QR 입장 안내'}>
    <div><p>{en ? 'SUGUNG · The Treasure Chamber' : '수궁야행 · 용왕님의 보물의 방'}</p>
      <h1>{en ? 'Scan the booth QR in the mobile app' : '모바일 앱에서 부스 QR을 인증해 주세요'}</h1>
      <p>{en ? 'Your experience will activate automatically.' : '입장이 확인되면 체험이 활성화됩니다.'}</p>
      {station.error && <><p role="alert">{en ? 'Could not connect to the exhibition server. Please ask a staff member.' : station.error}</p><button onClick={station.retry}>{en ? 'Try again' : '다시 확인'}</button></>}
      <InstallButton language={language} />
    </div>
  </section>;
  if (!station.busy && !station.error && !station.completed) return null;
  return <aside className="station-sync" aria-live="polite">
    <span>{station.error ? (en ? 'Could not save your result. Please retry.' : station.error) : (station.busy ? (en ? 'Saving your result…' : '체험 결과를 저장하고 있습니다…') : (en ? 'Your result is saved. Changes are saved too.' : '체험 결과가 저장되었습니다. 선택 수정도 반영됩니다.'))}</span>
    {station.error && <button disabled={station.busy} onClick={station.retry}>{en ? 'Retry saving' : '저장 다시 시도'}</button>}
  </aside>;
}
