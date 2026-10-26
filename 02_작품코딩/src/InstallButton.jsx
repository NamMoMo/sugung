import { useEffect, useState } from 'react';
import { pwa } from './pwa.js';

export default function InstallButton({ language }) {
  const [state, setState] = useState(() => pwa?.state || {});
  useEffect(() => pwa?.subscribe(setState), []);
  if (state.installed) return null;
  return state.available
    ? <button type="button" className="station-install" onClick={() => { void pwa.install().catch(() => {}); }}>{language === 'en' ? 'Install app' : '앱 설치'}</button>
    : <p className="station-install-help">{language === 'en' ? 'Install from the Chrome menu (⋮).' : 'Chrome 메뉴(⋮) → 앱 설치로 설치할 수 있습니다.'}</p>;
}
