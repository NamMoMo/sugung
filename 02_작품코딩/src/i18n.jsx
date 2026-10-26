import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createLocalizer, initialLanguage, translate } from './i18n-core.js';

const I18nContext = createContext(null);
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => initialLanguage(window.location));
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? "SUGUNG · The Dragon King's Treasure Chamber" : '수궁야행 · 용왕의 비밀 보물 방';
    document.querySelector('meta[name="description"]')?.setAttribute('content', language === 'en' ? 'Clear the mist, enter the underwater palace and discover six treasures through your everyday choices.' : '용왕의 비밀 보물 방. 여섯 번의 작은 선택으로, 당신 안에 숨겨진 보물을 발견하는 여정.');
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key, ...values) => translate(language, key, ...values), localize: createLocalizer(language) }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext); }
export function LanguageSwitch({ onInteract }) {
  const { language, setLanguage } = useI18n();
  return <div className="language-switch" role="group" aria-label="언어 선택 / Choose language">
    <button type="button" lang="ko" aria-pressed={language === 'ko'} onClick={() => { setLanguage('ko'); onInteract?.(); }}>한국어</button>
    <span aria-hidden="true">|</span>
    <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => { setLanguage('en'); onInteract?.(); }}>English</button>
  </div>;
}
