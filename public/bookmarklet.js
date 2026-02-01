/**
 * RSVP Reader Bookmarklet - Overlay Version
 * Lädt auf der aktuellen Seite ein Fullscreen-Overlay für Speed Reading
 */
(function() {
  'use strict';

  // Verhindere mehrfaches Laden
  if (window.__rsvpReaderActive) {
    window.__rsvpReaderClose && window.__rsvpReaderClose();
    return;
  }
  window.__rsvpReaderActive = true;

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

  // ===== Tokenizer =====
  function tokenize(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.map(w => ({
      text: w,
      orp: getORP(w.replace(/[^a-zA-ZäöüÄÖÜß]/g, ''))
    }));
  }

  // ===== Create Overlay =====
  function createOverlay(text) {
    const tokens = tokenize(text);
    if (tokens.length === 0) {
      alert('Kein Text gefunden. Markiere Text oder öffne einen Artikel.');
      window.__rsvpReaderActive = false;
      return;
    }

    let pos = 0;
    let playing = true;
    let wpm = parseInt(localStorage.getItem('rsvp-wpm') || '300');
    let intervalId = null;

    // Styles
    const styles = `
      #rsvp-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: #f8f9fa;
        color: #1a1a2e;
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
        font-size: clamp(28px, 8vw, 56px);
        font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        white-space: nowrap;
        letter-spacing: 0.02em;
      }
      #rsvp-word .pre, #rsvp-word .post { color: #1a1a2e; }
      #rsvp-word .pivot { color: #e63946; font-weight: 600; }
      #rsvp-controls {
        background: #ffffff;
        border-top: 1px solid #e9ecef;
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
        background: #f8f9fa;
        color: #1a1a2e;
        border: 1px solid #e9ecef;
        transition: all 0.15s;
        touch-action: manipulation;
      }
      .rsvp-btn:hover { background: #e9ecef; }
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
        background: #f8f9fa;
        padding: 6px;
        border-radius: 12px;
      }
      .rsvp-label {
        font-size: 12px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        padding: 0 8px;
      }
      .rsvp-value {
        font-size: 16px;
        font-weight: 700;
        min-width: 48px;
        text-align: center;
      }
      #rsvp-progress {
        height: 6px;
        background: #e9ecef;
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
        color: #6c757d;
      }
      @media (prefers-color-scheme: dark) {
        #rsvp-overlay { background: #1a1a2e; color: #f8f9fa; }
        #rsvp-word .pre, #rsvp-word .post { color: #f8f9fa; }
        #rsvp-controls { background: #16213e; border-color: #2d3748; }
        .rsvp-btn { background: #1a1a2e; color: #f8f9fa; border-color: #2d3748; }
        .rsvp-btn:hover { background: #2d3748; }
        .rsvp-group { background: #1a1a2e; }
        #rsvp-progress { background: #2d3748; }
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

    // Render word
    function renderWord() {
      const token = tokens[pos];
      if (!token) return;

      const orp = token.orp;
      preEl.textContent = token.text.slice(0, orp);
      pivotEl.textContent = token.text.slice(orp, orp + 1);
      postEl.textContent = token.text.slice(orp + 1);

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
      localStorage.setItem('rsvp-wpm', wpm);
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
