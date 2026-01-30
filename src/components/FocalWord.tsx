
import React from 'react';

type Part = { word: string; orp: number };

export default function FocalWord(
  { chunk, textScale }:
  { chunk: { text:string; parts: Part[] }, textScale: number; }
) {
  const pieces = chunk.parts.map((p: Part, i:number) => {
    if (!p.word) return <span key={i}> </span>;
    // Render punctuation or symbols without ORP highlight
    if (/^[\p{P}\p{S}]+$/u.test(p.word)) {
      return <span key={i} style={{ margin: '0 0.2ch' }}>{p.word}</span>;
    }
    const orp = p.orp;
    const pre = p.word.slice(0, orp);
    const pivot = p.word.slice(orp, orp+1);
    const post = p.word.slice(orp+1);
    return (
      <span key={i} style={{ margin: '0 0.2ch' }}>
        <span>{pre}</span>
        <span style={{ color: 'var(--accent)' }}>{pivot}</span>
        <span>{post}</span>
      </span>
    );
  });

  const fontSize = `${Math.round(42 * textScale)}px`;

  return (
    <div className="focal-word" style={{ fontSize }}>
      {pieces}
    </div>
  );
}
