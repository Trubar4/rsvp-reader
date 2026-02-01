/**
 * RSVP Reader Bookmarklet - Overlay Version
 * Lädt auf der aktuellen Seite ein Fullscreen-Overlay für Speed Reading
 * Einstellungen werden aus der Script-URL gelesen (im Bookmarklet kodiert)
 */
(function() {
  'use strict';

  // Verhindere mehrfaches Laden
  if (window.__rsvpReaderActive) {
    window.__rsvpReaderClose && window.__rsvpReaderClose();
    return;
  }
  window.__rsvpReaderActive = true;

  // ===== Einstellungen aus Script-URL lesen =====
  function getSettings() {
    const defaults = { wpm: 300, chunk: 1, scale: 1.0, fg: '#1a1a2e', bg: '#f8f9fa' };
    try {
      const scripts = document.getElementsByTagName('script');
      const currentScript = scripts[scripts.length - 1];
      const src = currentScript.src || '';
      const params = new URL(src).searchParams;
      return {
        wpm: parseInt(params.get('wpm')) || defaults.wpm,
        chunk: parseInt(params.get('chunk')) || defaults.chunk,
        scale: parseFloat(params.get('scale')) || defaults.scale,
        fg: decodeURIComponent(params.get('fg') || defaults.fg),
        bg: decodeURIComponent(params.get('bg') || defaults.bg)
      };
    } catch (e) {
      return defaults;
    }
  }

  const settings = getSettings();

  // ===== Text Extraction =====
  function extractText() {
    // 1. Markierten Text prüfen
    const selection = window.getSelection().toString().trim();
    if (selection.length > 10) {
      return selection;
    }

    // 2. Readability-ähnliche Extraktion (vereinfacht)
    try {
      const clone = document.cloneNode(true);

      // Entferne unerwünschte Elemente
      const removeSelectors = [
        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
        'nav', 'footer', 'header', 'aside', 'form',
        '.ad', '.ads', '.advertisement', '.sidebar', '.menu', '.navigation',
        '.comment', '.comments', '.social', '.share', '.related',
        '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
        '[aria-hidden="true"]'
      ];

      clone.querySelectorAll(removeSelectors.join(',')).forEach(el => el.remove());

      // Finde den Hauptinhalt
      const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.post', '.entry'];
      let content = null;

      for (const sel of contentSelectors) {
        content = clone.querySelector(sel);
        if (content && content.innerText.length > 200) break;
      }

      const text = (content || clone.body).innerText
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (text.length > 50) {
        return text;
      }
    } catch (e) {
      console.error('RSVP Reader: Extraction error', e);
    }

    // 3. Fallback: Body Text
    return document.body.innerText.replace(/\s+/g, ' ').trim();
  }

  // ===== ORP (Optimal Recognition Point) =====
  function getORP(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 2);
    if (len <= 9) return Math.floor(len / 2) - 1;
    if (len <= 13) return Math.floor(len / 2) - 1;
    return Math.floor(len / 3);
  }

  // ===== Tokenizer with Chunking =====
  function tokenize(text, chunkSize) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const tokens = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      const mainWord = chunk[Math.floor(chunk.length / 2)];
      tokens.push({
        text: chunk.join(' '),
        orp: getORP(mainWord.replace(/[^a-zA-ZäöüÄÖÜß]/g, ''))
      });
    }
    return tokens;
  }

  // ===== Create Overlay =====
  function createOverlay(text) {
    const tokens = tokenize(text, settings.chunk);
    if (tokens.length === 0) {
      alert('Kein Text gefunden. Markiere Text oder öffne einen Artikel.');
      window.__rsvpReaderActive = false;
      return;
    }

    let pos = 0;
    let playing = true;
    let wpm = settings.wpm;
    let intervalId = null;

    // Farben aus Einstellungen
    const bgColor = settings.bg;
    const fgColor = settings.fg;
    const fontSize = Math.round(42 * settings.scale);

    // Styles mit benutzerdefinierten Farben
    const styles = `
      #rsvp-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: ${bgColor};
        color: ${fgColor};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
      }
      #rsvp-overlay * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      #rsvp-word-area {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        padding: 20px;
      }
      #rsvp-word {
        font-size: clamp(${fontSize * 0.7}px, 8vw, ${fontSize * 1.3}px);
        font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        white-space: nowrap;
        letter-spacing: 0.02em;
      }
      #rsvp-word .pre, #rsvp-word .post { color: ${fgColor}; }
      #rsvp-word .pivot { color: #e63946; font-weight: 600; }
      #rsvp-controls {
        background: ${bgColor};
        border-top: 1px solid rgba(128,128,128,0.3);
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #rsvp-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .rsvp-btn {
        min-height: 52px;
        min-width: 52px;
        padding: 14px 20px;
        font-size: 16px;
        font-weight: 500;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        background: rgba(128,128,128,0.15);
        color: ${fgColor};
        border: 1px solid rgba(128,128,128,0.3);
        transition: all 0.15s;
        touch-action: manipulation;
      }
      .rsvp-btn:hover { background: rgba(128,128,128,0.25); }
      .rsvp-btn:active { transform: scale(0.97); }
      .rsvp-btn-primary {
        background: #4361ee;
        color: white;
        border-color: #4361ee;
      }
      .rsvp-btn-primary:hover { background: #3a56d4; }
      .rsvp-group {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(128,128,128,0.1);
        padding: 6px;
        border-radius: 12px;
      }
      .rsvp-label {
        font-size: 12px;
        font-weight: 600;
        color: ${fgColor};
        opacity: 0.7;
        text-transform: uppercase;
        padding: 0 8px;
      }
      .rsvp-value {
        font-size: 16px;
        font-weight: 700;
        min-width: 48px;
        text-align: center;
        color: ${fgColor};
      }
      #rsvp-progress {
        height: 6px;
        background: rgba(128,128,128,0.2);
        border-radius: 3px;
        overflow: hidden;
        cursor: pointer;
      }
      #rsvp-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4361ee, #06d6a0);
        width: 0%;
        transition: width 0.1s;
      }
      #rsvp-info {
        text-align: center;
        font-size: 12px;
        color: ${fgColor};
        opacity: 0.6;
      }
      #rsvp-info kbd {
        background: rgba(128,128,128,0.2);
        border: 1px solid rgba(128,128,128,0.3);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: inherit;
      }
    `;

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'rsvp-overlay';
    overlay.innerHTML = `
      <style>${styles}</style>
      <div id="rsvp-word-area">
        <div id="rsvp-word">
          <span class="pre"></span><span class="pivot"></span><span class="post"></span>
        </div>
      </div>
      <div id="rsvp-controls">
        <div id="rsvp-progress"><div id="rsvp-progress-bar"></div></div>
        <div id="rsvp-buttons">
          <button class="rsvp-btn" id="rsvp-back" title="3s zurück">◀◀</button>
          <button class="rsvp-btn rsvp-btn-primary" id="rsvp-play" title="Play/Pause">⏸</button>
          <button class="rsvp-btn" id="rsvp-fwd" title="1s vor">▶▶</button>
          <div class="rsvp-group">
            <span class="rsvp-label">WPM</span>
            <button class="rsvp-btn" id="rsvp-wpm-down">−</button>
            <span class="rsvp-value" id="rsvp-wpm">${wpm}</span>
            <button class="rsvp-btn" id="rsvp-wpm-up">+</button>
          </div>
          <button class="rsvp-btn" id="rsvp-close">Schließen</button>
        </div>
        <div id="rsvp-info">
          <kbd>Leertaste</kbd> Play/Pause · <kbd>←</kbd>/<kbd>→</kbd> Navigation · <kbd>↑</kbd>/<kbd>↓</kbd> WPM · <kbd>Esc</kbd> Schließen
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Elements
    const wordEl = overlay.querySelector('#rsvp-word');
    const preEl = wordEl.querySelector('.pre');
    const pivotEl = wordEl.querySelector('.pivot');
    const postEl = wordEl.querySelector('.post');
    const playBtn = overlay.querySelector('#rsvp-play');
    const wpmEl = overlay.querySelector('#rsvp-wpm');
    const progressBar = overlay.querySelector('#rsvp-progress-bar');

    // Render word - für Chunks: zeige das mittlere Wort mit ORP
    function renderWord() {
      const token = tokens[pos];
      if (!token) return;

      // Bei Chunks: finde das Hauptwort und seinen ORP
      const words = token.text.split(' ');
      const mainIdx = Math.floor(words.length / 2);
      const mainWord = words[mainIdx];
      const orp = token.orp;

      if (words.length === 1) {
        // Einzelnes Wort
        preEl.textContent = mainWord.slice(0, orp);
        pivotEl.textContent = mainWord.slice(orp, orp + 1);
        postEl.textContent = mainWord.slice(orp + 1);
      } else {
        // Chunk: zeige alle Wörter, markiere den Pivot im mittleren Wort
        const before = words.slice(0, mainIdx).join(' ');
        const after = words.slice(mainIdx + 1).join(' ');

        preEl.textContent = (before ? before + ' ' : '') + mainWord.slice(0, orp);
        pivotEl.textContent = mainWord.slice(orp, orp + 1);
        postEl.textContent = mainWord.slice(orp + 1) + (after ? ' ' + after : '');
      }

      progressBar.style.width = ((pos / tokens.length) * 100) + '%';
    }

    // Start/Stop
    function start() {
      if (intervalId) return;
      playing = true;
      playBtn.textContent = '⏸';
      const ms = 60000 / wpm;
      intervalId = setInterval(() => {
        if (pos >= tokens.length - 1) {
          stop();
          return;
        }
        pos++;
        renderWord();
      }, ms);
    }

    function stop() {
      playing = false;
      playBtn.textContent = '▶';
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function toggle() {
      playing ? stop() : start();
    }

    function seek(delta) {
      stop();
      pos = Math.max(0, Math.min(tokens.length - 1, pos + delta));
      renderWord();
    }

    function setWPM(newWpm) {
      wpm = Math.max(50, Math.min(1000, newWpm));
      wpmEl.textContent = wpm;
      if (playing) {
        stop();
        start();
      }
    }

    function close() {
      stop();
      overlay.remove();
      window.__rsvpReaderActive = false;
      document.removeEventListener('keydown', handleKeydown);
    }

    window.__rsvpReaderClose = close;

    // Event Handlers
    overlay.querySelector('#rsvp-word-area').addEventListener('click', (e) => {
      const x = e.clientX;
      const mid = window.innerWidth / 2;
      if (x < mid) seek(-Math.round(wpm / 20));
      else toggle();
    });

    overlay.querySelector('#rsvp-play').addEventListener('click', toggle);
    overlay.querySelector('#rsvp-back').addEventListener('click', () => seek(-Math.round(wpm / 20)));
    overlay.querySelector('#rsvp-fwd').addEventListener('click', () => seek(Math.round(wpm / 60)));
    overlay.querySelector('#rsvp-wpm-down').addEventListener('click', () => setWPM(wpm - 25));
    overlay.querySelector('#rsvp-wpm-up').addEventListener('click', () => setWPM(wpm + 25));
    overlay.querySelector('#rsvp-close').addEventListener('click', close);

    overlay.querySelector('#rsvp-progress').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      pos = Math.floor(ratio * tokens.length);
      renderWord();
    });

    function handleKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === ' ') { e.preventDefault(); toggle(); return; }
      if (e.key === 'ArrowLeft') { seek(-Math.round(wpm / 20)); return; }
      if (e.key === 'ArrowRight') { seek(Math.round(wpm / 60)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setWPM(wpm + 25); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setWPM(wpm - 25); return; }

      // Number presets (1-9, 0=10)
      const num = parseInt(e.key);
      if (!isNaN(num)) {
        setWPM((num === 0 ? 10 : num) * 100);
      }
    }

    document.addEventListener('keydown', handleKeydown);

    // Start
    renderWord();
    start();
  }

  // ===== Main =====
  const text = extractText();

  if (!text || text.length < 10) {
    alert('Kein lesbarer Text gefunden.\n\nMarkiere Text auf der Seite und versuche es erneut.');
    window.__rsvpReaderActive = false;
    return;
  }

  createOverlay(text);
})();
