
import React from 'react';

export default function ControlsBar(
  { playing, onToggle, wpm, setWpm, chunk, setChunk, onBack, onFwd, remainingMs, onExit }:
  {
    playing: boolean; onToggle: ()=>void;
    wpm: number; setWpm: (n:number)=>void;
    chunk: 1|2|3|4|5; setChunk: (c:1|2|3|4|5)=>void;
    onBack: ()=>void; onFwd: ()=>void;
    remainingMs: number;
    onExit: ()=>void;
  }
) {
  const rem = formatMs(remainingMs);
  return (
    <>
      <div className="controls">
        <button onClick={onBack}>⟲ 3s</button>
        <button onClick={onToggle}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={onFwd}>⟳ 1s</button>

        <span style={{ marginLeft: 12 }}>WPM</span>
        <button onClick={()=>setWpm(Math.max(50, wpm-25))}>−</button>
        <strong>{wpm}</strong>
        <button onClick={()=>setWpm(Math.min(1000, wpm+25))}>+</button>

        <span style={{ marginLeft: 12 }}>Chunk</span>
        <button onClick={()=>setChunk(Math.max(1, (chunk-1) as any))}>−</button>
        <strong>{chunk}</strong>
        <button onClick={()=>setChunk(Math.min(5, (chunk+1) as any))}>+</button>

        <span style={{ marginLeft: 12 }}>Remaining: {rem}</span>

        <button style={{ marginLeft: 'auto' }} onClick={onExit}>Exit</button>
      </div>
      <div style={{ textAlign:'center', paddingBottom: 6, fontSize: 12 }}>
        Shortcuts: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> back/skip · <kbd>↑</kbd>/<kbd>↓</kbd> WPM ±25 · <kbd>1–0</kbd> speed presets
      </div>
    </>
  );
}

function formatMs(ms:number) {
  const s = Math.round(ms/1000);
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2,'0')}`;
}
