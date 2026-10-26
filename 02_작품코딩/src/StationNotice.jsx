import './station.css';

export default function StationNotice({ station, language }) {
  if (!station.enabled) return null;
  const en = language === 'en';
  if (!station.active) return <section className="station-gate" aria-label={en ? 'QR admission' : 'QR 입장 안내'}>
    <div><p>{en ? 'SUGUNG · The Treasure Chamber' : '수궁야행 · 용왕님의 보물의 방'}</p>
      <h1>{en ? 'Scan the booth QR in the mobile app' : '모바일 앱에서 부스 QR을 인증해 주세요'}</h1>
      <p>{en ? 'Your experience will activate automatically.' : '입장이 확인되면 체험이 활성화됩니다.'}</p>
      {station.error && <><p role="alert">{en ? 'Could not connect to the exhibition server. Please ask a staff member.' : station.error}</p><button onClick={station.retry}>{en ? 'Try again' : '다시 확인'}</button></>}
    </div>
  </section>;
  if (!station.busy && !station.error && !station.completed) return null;
  return <aside className="station-sync" aria-live="polite">
    <span>{station.error ? (en ? 'Could not save your result. Please retry.' : station.error) : (station.busy ? (en ? 'Saving your result…' : '체험 결과를 저장하고 있습니다…') : (en ? 'Your result is saved. Changes are saved too.' : '체험 결과가 저장되었습니다. 선택 수정도 반영됩니다.'))}</span>
    {station.error && <button disabled={station.busy} onClick={station.retry}>{en ? 'Retry saving' : '저장 다시 시도'}</button>}
  </aside>;
}
