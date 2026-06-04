import React from 'react';
import type { Language } from '../App';

type ChunkSize = 1 | 2 | 3 | 4 | 5;

const clampChunk = (n: number): ChunkSize =>
  Math.max(1, Math.min(5, Math.round(n))) as ChunkSize;

export default function SettingsPanel(
  { lang, setLang, wpm, setWpm, chunk, setChunk, textScale, setTextScale, fg, setFg, bg, setBg,
    optotraining, setOptotraining, stripeRed, setStripeRed, stripeCyan, setStripeCyan } :
  {
    lang: Language; setLang: (l:Language)=>void;
    wpm: number; setWpm: (n:number)=>void;
    chunk: ChunkSize; setChunk: (c: ChunkSize)=>void;
    textScale: number; setTextScale: (n:number)=>void;
    fg: string; setFg: (s:string)=>void;
    bg: string; setBg: (s:string)=>void;
    optotraining: boolean; setOptotraining: (v: boolean)=>void;
    stripeRed: string; setStripeRed: (s: string)=>void;
    stripeCyan: string; setStripeCyan: (s: string)=>void;
  }
) {
  return (
    <div className="settings">
      <div className="setting-item">
        <span className="setting-label">Sprache</span>
        <select value={lang} onChange={e => setLang(e.target.value as Language)}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="setting-item">
        <span className="setting-label">Geschwindigkeit (WPM)</span>
        <span className="setting-value">{wpm}</span>
        <input
          type="range"
          min={50}
          max={1000}
          step={25}
          value={wpm}
          onChange={e => setWpm(Number(e.target.value))}
        />
      </div>

      <div className="setting-item">
        <span className="setting-label">Wörter pro Anzeige</span>
        <span className="setting-value">{chunk}</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={chunk}
          onChange={e => setChunk(clampChunk(Number(e.target.value)))}
        />
      </div>

      <div className="setting-item">
        <span className="setting-label">Textgröße</span>
        <span className="setting-value">{Math.round(textScale * 100)}%</span>
        <input
          type="range"
          min={0.8}
          max={1.6}
          step={0.05}
          value={textScale}
          onChange={e => setTextScale(Number(e.target.value))}
        />
      </div>

      <div className="setting-item">
        <span className="setting-label">Textfarbe</span>
        <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
      </div>

      <div className="setting-item">
        <span className="setting-label">Hintergrund</span>
        <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
      </div>

      <div className="setting-item">
        <div className="setting-item-row">
          <span className="setting-label">OptoTraining</span>
          <label className="opto-toggle" title="Farbstreifen für Optotraining aktivieren">
            <input
              type="checkbox"
              checked={optotraining}
              onChange={e => setOptotraining(e.target.checked)}
            />
            <span className="opto-toggle-slider" />
          </label>
        </div>
        {optotraining && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="setting-item" style={{ margin: 0 }}>
              <span className="setting-label" style={{ fontSize: '0.85rem' }}>Rot-Farbe</span>
              <input type="color" value={stripeRed} onChange={e => setStripeRed(e.target.value)} />
            </div>
            <div className="setting-item" style={{ margin: 0 }}>
              <span className="setting-label" style={{ fontSize: '0.85rem' }}>Cyan-Farbe</span>
              <input type="color" value={stripeCyan} onChange={e => setStripeCyan(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              Feinabstimmung im Player möglich
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
