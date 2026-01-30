
import { computeOrpIndex } from './orp';

type Token = { text:string; type:'word'|'punct'|'paragraph_break' };

export function buildChunks(tokens: Token[], wpm: number, chunkSize: 1|2|3|4|5) {
  const chunks: { delayMs:number; text:string; parts:{word:string;orp:number}[]; wordCount:number }[] = [];
  const basePerWord = 60000 / Math.max(1, wpm);

  let i = 0;
  while (i < tokens.length) {
    const parts: {word:string; orp:number}[] = [];
    let words = 0;
    let delay = 0;

    while (i < tokens.length && words < chunkSize) {
      const t = tokens[i];
      if (t.type === 'word') {
        parts.push({ word: t.text, orp: computeOrpIndex(t.text) });
        words++;
      } else if (t.type === 'punct') {
        parts.push({ word: t.text, orp: 0 });
      } else if (t.type === 'paragraph_break') {
        break;
      }
      i++;
    }

    delay += basePerWord * Math.max(1, words);

    const tail = parts.length ? parts[parts.length-1].word : '';
    if (/[,;]$/.test(tail)) delay += 150;
    if (/[.?!…]$/.test(tail)) delay += 320;

    if (parts.some(p => p.word.length >= 12 && /^[A-Za-zÄÖÜäöüß]+$/.test(p.word))) delay += 100;

    if (i < tokens.length && tokens[i].type === 'paragraph_break') {
      delay += 600;
      i++;
    }

    const text = parts.map(p => p.word).join(' ');

    chunks.push({ delayMs: Math.round(delay), text, parts, wordCount: words || 1 });
  }

  const totalWords = tokens.filter(t => t.type === 'word').length;
  const totalMs = chunks.reduce((a,c)=>a+c.delayMs,0);
  return { chunks, totalWords, totalMs };
}
