import { useMemo } from 'react';
import { COUNTRY_CODES } from '../data/countries';

/** Country names in the visitor's language, sorted. `guess` is India: most visitors are in India, and many Indian
 * browsers report "English (US)", so guessing from the browser locale picked the United States for them. */
export function useCountries() {
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([navigator.language, 'en'], { type: 'region' });
    } catch {
      names = null;
    }
    const list = COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return { list, guess: 'IN' };
  }, []);
}
