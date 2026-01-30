
import React, { useEffect, useMemo, useState } from 'react';
import { buildChunks } from '../lib/timing';
import FocalWord from './FocalWord';
import ControlsBar from './ControlsBar';
import { useKeyControls } from '../hooks/useKeyControls';

type Token = {
  text: string;
  type: 'word'|'punct'|'paragraph_break';
};

export default function PlayerScreen(
  { tokens, lang, wpm, chunk, textScale, fg, bg, onExit, onUpdate } :
  {
    tokens: Token[];
    lang: 'en'|'de';
    wpm: number; chunk: 1|2|3|4|5;
    textScale: number; fg: string; bg: string;
    onExit: ()=>void;
    onUpdate: (s:{wpm:number;chunk:1|2|3|4|5})=>void;
  }
) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [stats, setStats] = useState({ startedAt: Date.now(), elapsedMs: 0, wordsShown: 0 });

  const { chunks, totalWords, totalMs } = useMemo(() => buildChunks(tokens, wpm, chunk), [tokens, wpm, chunk]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, handle: number | undefined;
    const run = () => {
      if (pos >= chunks.length - 1) { setPlaying(false); return; }
      handle = window.setTimeout(() => {
        setPos(p => p + 1);
        setStats(s => ({ ...s, wordsShown: s.wordsShown + chunks[Math.min(pos, chunks.length-1)].wordCount }));
        raf = requestAnimationFrame(run);
      }, chunks[pos].delayMs);
    };
    raf = requestAnimationFrame(run);
    return () => { cancelAnimationFrame(raf); if (handle) clearTimeout(handle); };
  }, [playing, pos, chunks]);

  useKeyControls({
    onToggle: () => setPlaying(p => !p),
    onBack: () => seekByMs(-3000),
    onFwd: () => seekByMs(+1000),
    onWpmDelta: (d) => onUpdate({ wpm: Math.min(1000, Math.max(50, wpm + d)), chunk }),
    onPreset: (n) => onUpdate({ wpm: n * 100, chunk }),
  });

  function seekByMs(deltaMs: number) {
    const nowMs = chunks.slice(0, pos).reduce((a, c) => a + c.delayMs, 0);
    const target = Math.max(0, Math.min(totalMs, nowMs + deltaMs));
    let sum = 0, idx = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (sum >= target) { idx = i; break; }
      sum += chunks[i].delayMs;
      idx = i;
    }
    setPos(idx);
  }

  const current = chunks[pos];
  const progress = (chunks.slice(0, pos).reduce((a,c)=>a+c.delayMs,0) / totalMs) * 100;
  const remainingMs = Math.max(0, totalMs - chunks.slice(0, pos).reduce((a,c)=>a+c.delayMs,0));

  function onTap(e: React.MouseEvent) {
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    if (x < mid) seekByMs(-3000);
    else setPlaying(p => !p);
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--fg', fg);
  }, [bg, fg]);

  return (
    <div className="player-root">
      <div className="focal-wrap" onClick={onTap}>
        <FocalWord
          chunk={current}
          textScale={textScale}
        />
      </div>

      <div>
        <div className="progress" onClick={(e)=> {
          const rect = (e.target as HTMLDivElement).getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const target = ratio * totalMs;
          let sum = 0, idx = 0;
          for (let i = 0; i < chunks.length; i++) { if (sum >= target) { idx = i; break; } sum += chunks[i].delayMs; idx = i; }
          setPos(idx);
        }}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <ControlsBar
          playing={playing} onToggle={()=>setPlaying(p=>!p)}
          wpm={wpm} setWpm={(n)=>onUpdate({ wpm:n, chunk })}
          chunk={chunk} setChunk={(c)=>onUpdate({ wpm, chunk:c })}
          onBack={()=>seekByMs(-3000)} onFwd={()=>seekByMs(+1000)}
          remainingMs={remainingMs}
          onExit={onExit}
        />
      </div>
    </div>
  );
}
