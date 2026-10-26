import english from './translations-en.json' with { type: 'json' };

export function translate(language, key, ...values) {
  if (typeof key !== 'string') return key;
  const text = language === 'en' ? (english[key] ?? key) : key;
  return text.replace(/\{(\d+)\}/g, (_, index) => translate(language, values[Number(index)] ?? ''));
}

export function createLocalizer(language) {
  const cache = new WeakMap();
  function localize(value) {
    if (typeof value === 'string') return translate(language, value);
    if (!value || typeof value !== 'object') return value;
    if (language === 'ko') return value;
    if (cache.has(value)) return cache.get(value);
    const result = Array.isArray(value) ? value.map(localize) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item)]));
    cache.set(value, result);
    return result;
  }
  return localize;
}

// Only a personal report link carries a language preference. A fresh exhibition
// visit always starts in Korean, regardless of the previous visitor's choice.
export function initialLanguage(location) {
  return location.hash.startsWith('#treasures=') && new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko';
}
