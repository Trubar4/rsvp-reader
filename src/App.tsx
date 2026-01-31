import React, { useState } from 'react';
import TextInputPanel from './components/TextInputPanel';
import PlayerScreen from './components/PlayerScreen';
import SettingsPanel from './components/SettingsPanel';
import { useTextCleaner } from './hooks/useTextCleaner';
import { useTokenizer } from './hooks/useTokenizer';
import BrowserView from './components/BrowserView';

export type Language = 'en' | 'de';
type Mode = 'browser' | 'reader';

export default function App() {
  const [mode, setMode] = useState<Mode>('browser');

  const [raw, setRaw] = useState<string>('');
  const [lang, setLang] = useState<Language>('en');
  const [wpm, setWpm] = useState<number>(300);
  const [chunk, setChunk] = useState<1|2|3|4|5>(1);
  const [textScale, setTextScale] = useState<number>(1.0);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [playing, setPlaying] = useState(false);

  const cleaned = useTextCleaner(raw);
  const tokens = useTokenizer(cleaned, lang);
  const startDisabled = tokens.length === 0;

  function loadFromExtractor(p: { title:string; text:string; url:string }) {
    setRaw(p.text);
    setMode('reader');
  }

  if (mode === 'browser') {
    return <BrowserView onLoadToReader={loadFromExtractor} />;
  }

  return playing ? (
    <PlayerScreen
      tokens={tokens}
      lang={lang}
      wpm={wpm}
      chunk={chunk}
      textScale={textScale}
      fg={fg}
      bg={bg}
      onExit={() => { setPlaying(false); setMode('browser'); }}
      onUpdate={({ wpm, chunk }) => { setWpm(wpm); setChunk(chunk); }}
    />
  ) : (
    <div className="container">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1>Reader</h1>
        <button onClick={() => setMode('browser')}>Browser →</button>
      </div>

      <TextInputPanel value={raw} onChange={setRaw} />
      <SettingsPanel
        lang={lang} setLang={setLang}
        wpm={wpm} setWpm={setWpm}
        chunk={chunk} setChunk={setChunk}
        textScale={textScale} setTextScale={setTextScale}
        fg={fg} setFg={setFg}
        bg={bg} setBg={setBg}
      />
      <div className="button-row">
        <button disabled={startDisabled} onClick={() => setPlaying(true)}>Read</button>
        <button onClick={() => setRaw('')}>Clear</button>
      </div>
    </div>
  );
}