import React, { useMemo } from 'react';

type Part = { word: string; orp: number };

function isPunct(s: string) {
  // einfache Punct-Erkennung ohne Unicode-Property Escapes
  return /^[.,;:!?…'\"()\[\]{}\-\u2013\u2014]+$/.test(s);
}

// Teile sauber zu Text zusammenfügen (kein Leerzeichen vor Satzzeichen)
function joinParts(parts: Part[]) {
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const w = parts[i].word;
    if (i === 0) out.push(w);
    else {
      if (isPunct(w)) out.push(w);
      else out.push(' ' + w);
    }
  }
  return out.join('');
}

export default function FocalWord(
  { chunk, textScale }: { chunk: { text: string; parts: Part[] }, textScale: number; }
) {
  // Nur Wörter (keine reinen Satzzeichen) zählen für die Mittel-Logik
  const wordIndices = useMemo(() => {
    const idxs: number[] = [];
    chunk.parts.forEach((p, i) => { if (!isPunct(p.word)) idxs.push(i); });
    return idxs;
  }, [chunk.parts]);

  // Index des "zentralen" Wortes (bei 3 Wörtern ist das mittlere)
  const centerPartIdx = wordIndices.length
    ? wordIndices[Math.floor(wordIndices.length / 2)]
    : -1;

  const leftParts  = centerPartIdx >= 0 ? chunk.parts.slice(0, centerPartIdx) : [];
  const centerPart = centerPartIdx >= 0 ? chunk.parts[centerPartIdx] : null;
  const rightParts = centerPartIdx >= 0 ? chunk.parts.slice(centerPartIdx + 1) : chunk.parts;

  // Seiten-Texte (grau)
  const leftText  = joinParts(leftParts.filter(p => p.word.trim().length));
  const rightText = joinParts(rightParts.filter(p => p.word.trim().length));

  // Mittelwort in pre/pivot/post zerteilen
  let pre = '', pivot = '', post = '';
  if (centerPart) {
    const orp = centerPart.orp;
    pre   = centerPart.word.slice(0, orp);
    pivot = centerPart.word.slice(orp, orp + 1);
    post  = centerPart.word.slice(orp + 1);
  }

  const fontSize = `${Math.round(42 * textScale)}px`;

  return (
    <div
      className="focal-grid"
      style={{ fontSize }}
      aria-label={chunk.text}
    >
      <div className="side side-left dim" aria-hidden="true">{leftText}</div>

      <div className="middle-grid">
        <span className="pre">{pre}</span>
        <span className="pivot" style={{ color: 'var(--accent)' }}>{pivot}</span>
        <span className="post">{post}</span>
      </div>

      <div className="side side-right dim" aria-hidden="true">{rightText}</div>
    </div>
  );
}