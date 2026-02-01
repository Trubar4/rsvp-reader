import React from 'react';

type ChunkSize = 1 | 2 | 3 | 4 | 5;

const clampChunk = (n: number): ChunkSize =>
  Math.max(1, Math.min(5, Math.round(n))) as ChunkSize;

export default function ControlsBar(
  { playing, onToggle, wpm, setWpm, chunk, setChunk, onBack, onFwd, remainingMs, onExit }:
  {
    playing: boolean; onToggle: ()=>void;
    wpm: number; setWpm: (n:number)=>void;
    chunk: ChunkSize; setChunk: (c: ChunkSize)=>void;
    onBack: ()=>void; onFwd: ()=>void;
    remainingMs: number;
    onExit: ()=>void;
  }
) {
  const rem = formatMs(remainingMs);

  return (
    <div className="player-controls">
      <div className="controls-main">
        {/* Play Controls */}
        <div className="controls-group">
          <button className="btn btn-secondary btn-icon" onClick={onBack} title="3s zurück">
            ◀◀
          </button>
          <button className="btn btn-primary btn-icon" onClick={onToggle} title={playing ? 'Pause' : 'Abspielen'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button className="btn btn-secondary btn-icon" onClick={onFwd} title="1s vor">
            ▶▶
          </button>
        </div>

        {/* WPM Control */}
        <div className="controls-group">
          <span className="controls-label">WPM</span>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setWpm(Math.max(50, wpm - 25))}
          >
            −
          </button>
          <span className="controls-value">{wpm}</span>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setWpm(Math.min(1000, wpm + 25))}
          >
            +
          </button>
        </div>

        {/* Chunk Control */}
        <div className="controls-group">
          <span className="controls-label">Wörter</span>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setChunk(clampChunk(chunk - 1))}
          >
            −
          </button>
          <span className="controls-value">{chunk}</span>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setChunk(clampChunk(chunk + 1))}
          >
            +
          </button>
        </div>

        {/* Time Remaining */}
        <span className="time-remaining">{rem}</span>

        {/* Exit Button */}
        <button className="btn btn-secondary" onClick={onExit}>
          Beenden
        </button>
      </div>

      <div className="keyboard-hints">
        <kbd>Leertaste</kbd> Play/Pause ·
        <kbd>←</kbd>/<kbd>→</kbd> Zurück/Vor ·
        <kbd>↑</kbd>/<kbd>↓</kbd> WPM ±25 ·
        <kbd>1</kbd>–<kbd>0</kbd> Geschwindigkeit
      </div>
    </div>
  );
}

function formatMs(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
