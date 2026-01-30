
import React, { useState } from 'react';
import TextInputPanel from './components/TextInputPanel';
import PlayerScreen from './components/PlayerScreen';
import SettingsPanel from './components/SettingsPanel';
import { useTextCleaner } from './hooks/useTextCleaner';
import { useTokenizer } from './hooks/useTokenizer';

export type Language = 'en' | 'de';

export default function App() {
  const [raw, setRaw] = useState<string>('');
  const [lang, setLang] = useState<Language>('en');
  const [wpm, setWpm] = useState<number>(300);
  const [chunk, setChunk] = useState<1|2|3|4|5>(1);
  const [textScale, setTextScale] = useState<number>(1.0); // 0.8..1.6
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [playing, setPlaying] = useState(false);

  const cleaned = useTextCleaner(raw);
  const tokens = useTokenizer(cleaned, lang);

  const startDisabled = tokens.length === 0;

  return playing ? (
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
  ) : (
    <div className="container">
      <h1>RSVP Reader</h1>
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
