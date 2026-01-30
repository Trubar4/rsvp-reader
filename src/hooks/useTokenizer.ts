import { useMemo } from 'react';
import { EN_ABBR, DE_ABBR } from '../lib/abbreviations';

type Token = { text: string; type: 'word' | 'punct' | 'paragraph_break' };

export function useTokenizer(text: string, lang: 'en'|'de'): Token[] {
  return useMemo(() => {
    if (!text) return [];
    const ABBR = lang === 'en' ? EN_ABBR : DE_ABBR;

    // Ellipsis vereinheitlichen
    let norm = text.replace(/\.{3}/g, '…');

    // Paragraphs (leerzeilenbasiert)
    const paragraphs = norm.split(/\n{2,}/);

    const tokens: Token[] = [];
    for (const p of paragraphs) {
      // Satzzeichen separat, aber als einzelne Tokens
      const words = p
        .replace(/([.?!…,;:])/g, ' $1 ')
        .split(/\s+/)
        .filter(Boolean);

      for (let i = 0; i < words.length; i++) {
        const w = words[i];

        if (/^[.?!…,;:]$/.test(w)) {
          tokens.push({ text: w, type: 'punct' });
          continue;
        }

        // Abkürzungen mit Punkt nicht als Satzende behandeln
        const lower = w.toLowerCase().replace(/\.$/, '');
        if (w.endsWith('.') && ABBR.has(lower)) {
          tokens.push({ text: w, type: 'word' });
          continue;
        }

        tokens.push({ text: w, type: 'word' });
      }

      tokens.push({ text: '\n', type: 'paragraph_break' });
    }
    if (tokens.length && tokens[tokens.length - 1].type === 'paragraph_break') tokens.pop();
    return tokens;
  }, [text, lang]);
}