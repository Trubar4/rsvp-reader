import { useMemo } from 'react';

export function useTextCleaner(input: string) {
  return useMemo(() => {
    let t = input ?? '';
    // Normalise quotes/dashes (alles in EINER Zeile pro Regex!)
    t = t.replace(/[\u2018\u2019]/g, "'")
         .replace(/[\u201C\u201D]/g, '"')
         .replace(/\u2013|\u2014/g, '-');

    // Whitespace: CRLF -> LF, Leerraum vor Zeilenende, max. 2 Zeilenumbrüche
    t = t.replace(/\r\n/g, '\n')
         .replace(/[ \t]+\n/g, '\n')
         .replace(/\n{3,}/g, '\n\n');

    // Triviale "Read more..."-Tails kappen
    t = t.replace(/\s*Read more.*$/i, '');
    return t.trim();
  }, [input]);
}