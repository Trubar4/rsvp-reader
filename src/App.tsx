import React, { useState, useEffect } from 'react';
import TextInputPanel from './components/TextInputPanel';
import PlayerScreen from './components/PlayerScreen';
import SettingsPanel from './components/SettingsPanel';
import { useTextCleaner } from './hooks/useTextCleaner';
import { useTokenizer } from './hooks/useTokenizer';

export type Language = 'de' | 'en';

// Lade gespeicherte Einstellungen aus localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem('rsvp-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function App() {
  const saved = loadSettings();

  const [raw, setRaw] = useState<string>('');
  const [lang, setLang] = useState<Language>(saved?.lang || 'de');
  const [wpm, setWpm] = useState<number>(saved?.wpm || 300);
  const [chunk, setChunk] = useState<1|2|3|4|5>(saved?.chunk || 1);
  const [textScale, setTextScale] = useState<number>(saved?.textScale || 1.0);
  const [fg, setFg] = useState(saved?.fg || '#1a1a2e');
  const [bg, setBg] = useState(saved?.bg || '#f8f9fa');
  const [playing, setPlaying] = useState(false);

  // Speichere Einstellungen bei Änderungen
  useEffect(() => {
    localStorage.setItem('rsvp-settings', JSON.stringify({ lang, wpm, chunk, textScale, fg, bg }));
  }, [lang, wpm, chunk, textScale, fg, bg]);

  const cleaned = useTextCleaner(raw);
  const tokens = useTokenizer(cleaned, lang);
  const startDisabled = tokens.length === 0;

  // Bookmarklet URL-Parameter auslesen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    if (textParam) {
      setRaw(decodeURIComponent(textParam));
      // URL-Parameter entfernen ohne Reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (playing) {
    return (
      <PlayerScreen
        tokens={tokens}
        lang={lang}
        wpm={wpm}
        chunk={chunk}
        textScale={textScale}
        fg={fg}
        bg={bg}
        onExit={() => setPlaying(false)}
        onUpdate={({ wpm, chunk }) => { setWpm(wpm); setChunk(chunk); }}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>RSVP Reader</h1>
      </div>

      {/* Bookmarklet Section */}
      <div className="bookmarklet-section">
        <h2 style={{ margin: '0 0 12px 0' }}>Speed Reading Bookmarklet</h2>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>
          Ziehe diesen Button in deine Lesezeichen-Leiste:
        </p>
        <a
          className="bookmarklet-link"
          href={`javascript:(function(){var s=document.createElement('script');s.src='${window.location.origin}/bookmarklet.js?t='+Date.now();document.body.appendChild(s)})()`}
          onClick={(e) => { e.preventDefault(); alert('Ziehe diesen Button in deine Lesezeichen-Leiste!'); }}
        >
          Speed Read
        </a>
        <div className="bookmarklet-instructions">
          <strong>Anleitung:</strong><br/>
          1. Ziehe den Button oben in deine Lesezeichen-Leiste<br/>
          2. Gehe auf eine beliebige Webseite<br/>
          3. Optional: Markiere den Text, den du lesen möchtest<br/>
          4. Klicke auf das Bookmarklet → Fullscreen Speed Reading startet
        </div>
      </div>

      {/* Fallback: Text manuell eingeben */}
      <div className="card">
        <h2>Text einfügen</h2>
        <TextInputPanel value={raw} onChange={setRaw} />
      </div>

      {/* Settings */}
      <div className="card">
        <h2>Einstellungen</h2>
        <SettingsPanel
          lang={lang} setLang={setLang}
          wpm={wpm} setWpm={setWpm}
          chunk={chunk} setChunk={setChunk}
          textScale={textScale} setTextScale={setTextScale}
          fg={fg} setFg={setFg}
          bg={bg} setBg={setBg}
        />
      </div>

      {/* Action Buttons */}
      <div className="button-row">
        <button
          className="btn btn-primary btn-lg"
          style={{ flex: 1 }}
          disabled={startDisabled}
          onClick={() => setPlaying(true)}
        >
          Lesen starten
        </button>
        <button
          className="btn btn-secondary btn-lg"
          onClick={() => setRaw('')}
          disabled={!raw}
        >
          Leeren
        </button>
      </div>

      {/* Info */}
      <div className="info-box">
        <strong>Tipp:</strong> Nutze das Bookmarklet oben, um direkt von jeder Webseite zu lesen.
        Oder füge hier Text ein und klicke auf "Lesen starten".
      </div>
    </div>
  );
}
