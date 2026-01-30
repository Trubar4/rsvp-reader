import { computeOrpIndex } from './orp';

type Token = { text: string; type: 'word' | 'punct' | 'paragraph_break' };

function isPunct(s: string) {
  return /^[.,;:!?…'\"()\[\]{}\-\u2013\u2014]+$/.test(s);
}

export function buildChunks(tokens: Token[], wpm: number, chunkSize: 1|2|3|4|5) {
  const chunks: {
    delayMs: number;
    text: string;
    parts: { word: string; orp: number }[];
    wordCount: number;
  }[] = [];

  const basePerWord = 60000 / Math.max(1, wpm);
  let i = 0;

  while (i < tokens.length) {
    const parts: { word: string; orp: number }[] = [];
    let words = 0;
    let delay = 0;

    // 1) Falls am Chunk-Anfang nur Satzzeichen kämen: zum vorherigen Chunk hängen
    while (i < tokens.length && tokens[i].type === 'punct' && words === 0) {
      if (chunks.length > 0) {
        const prev = chunks[chunks.length - 1];
        prev.parts.push({ word: tokens[i].text, orp: 0 });
        // kleine Zusatzpause auf satzendende Zeichen
        if (/[.?!…]$/.test(tokens[i].text)) prev.delayMs += 320;
        else if (/[,;:]$/.test(tokens[i].text)) prev.delayMs += 150;
      }
      i++;
    }
    if (i >= tokens.length) break;

    // 2) Bis zu chunkSize Wörter sammeln
    while (i < tokens.length && words < chunkSize) {
      const t = tokens[i];
      if (t.type === 'word') {
        parts.push({ word: t.text, orp: computeOrpIndex(t.text) });
        words++;
        i++;
      } else if (t.type === 'punct') {
        // interner Punct darf mitlaufen, zählt nicht als Wort
        parts.push({ word: t.text, orp: 0 });
        i++;
      } else if (t.type === 'paragraph_break') {
        break;
      }
    }

    // 3) Nachlaufende Satzzeichen (direkt folgende) anhängen
    while (i < tokens.length && tokens[i].type === 'punct') {
      parts.push({ word: tokens[i].text, orp: 0 });
      i++;
    }

    // 4) Grunddelay proportional zu Wortanzahl
    delay += basePerWord * Math.max(1, words);

    // 5) Zusatzpausen
    const tail = parts.length ? parts[parts.length - 1].word : '';
    if (/[.?!…]$/.test(tail)) delay += 320;
    else if (/[,;:]$/.test(tail)) delay += 150;

    // 6) Lange Wörter (Komfort)
    if (parts.some(p => p.word.length >= 12 && /^[A-Za-zÄÖÜäöüß]+$/.test(p.word))) delay += 100;

    // 7) Absatzpause
    if (i < tokens.length && tokens[i].type === 'paragraph_break') {
      delay += 600;
      i++;
    }

    const text = parts.map(p => p.word).join(' ');
    chunks.push({ delayMs: Math.round(delay), text, parts, wordCount: words || 1 });
  }

  const totalWords = tokens.filter(t => t.type === 'word').length;
  const totalMs = chunks.reduce((a, c) => a + c.delayMs, 0);
  return { chunks, totalWords, totalMs };
}
