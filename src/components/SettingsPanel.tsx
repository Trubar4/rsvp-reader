import React from 'react';
import type { Language } from '../App';

type ChunkSize = 1 | 2 | 3 | 4 | 5;

// Klemmt einen number wieder sauber auf die Union 1|2|3|4|5
const clampChunk = (n: number): ChunkSize =>
  Math.max(1, Math.min(5, Math.round(n))) as ChunkSize;

export default function SettingsPanel(
  { lang, setLang, wpm, setWpm, chunk, setChunk, textScale, setTextScale, fg, setFg, bg, setBg } :
  {
    lang: Language; setLang: (l:Language)=>void;
    wpm: number; setWpm: (n:number)=>void;
    chunk: ChunkSize; setChunk: (c: ChunkSize)=>void;
    textScale: number; setTextScale: (n:number)=>void;
    fg: string; setFg: (s:string)=>void;
    bg: string; setBg: (s:string)=>void;
  }
) {
  return (
    <div className="settings">
      <label>Language
        <select value={lang} onChange={e => setLang(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </label>

      <label>WPM: {wpm}
        <input type="range" min={50} max={1000} step={25} value={wpm}
          onChange={e => setWpm(Number(e.target.value))} />
      </label>

      <label>Chunk: {chunk}
        <input type="range" min={1} max={5} step={1} value={chunk}
          onChange={e => setChunk(clampChunk(Number(e.target.value)))} />
      </label>

      <label>Text size
        <input type="range" min={0.8} max={1.6} step={0.05} value={textScale}
          onChange={e => setTextScale(Number(e.target.value))} />
      </label>

      <label>Text colour
        <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
      </label>

      <label>Background
        <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
      </label>
    </div>
  );
}