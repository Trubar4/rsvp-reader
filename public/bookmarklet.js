/**
 * RSVP Reader Bookmarklet - RSVP + Bar Reader
 */
(function() {
  'use strict';

  if (window.__rsvpReaderActive) {
    window.__rsvpReaderClose && window.__rsvpReaderClose();
    return;
  }
  window.__rsvpReaderActive = true;

  // ===== Settings from script URL =====
  function getSettings() {
    const d = { wpm: 300, chunk: 1, scale: 1.0, fg: '#1a1a2e', bg: '#f8f9fa',
                mode: 'rsvp', opto: false, stripeW: 80, stripeOff: 0,
                red: '#FF0000', cyan: '#00FFFF' };
    try {
      const scripts = document.getElementsByTagName('script');
      const src = scripts[scripts.length - 1].src || '';
      const p = new URL(src).searchParams;
      return {
        wpm:      parseInt(p.get('wpm'))       || d.wpm,
        chunk:    parseInt(p.get('chunk'))     || d.chunk,
        scale:    parseFloat(p.get('scale'))   || d.scale,
        fg:       decodeURIComponent(p.get('fg')   || d.fg),
        bg:       decodeURIComponent(p.get('bg')   || d.bg),
        mode:     p.get('mode') || d.mode,
        opto:     p.get('opto') === '1',
        stripeW:  parseInt(p.get('stripeW'))   || d.stripeW,
        stripeOff:parseInt(p.get('stripeOff')) || d.stripeOff,
        red:      decodeURIComponent(p.get('red')  || d.red),
        cyan:     decodeURIComponent(p.get('cyan') || d.cyan),
      };
    } catch(e) { return d; }
  }

  const S = getSettings();

  // ===== Text extraction =====
  function extractText() {
    const sel = window.getSelection().toString().trim();
    if (sel.length > 10) return sel;
    try {
      const clone = document.cloneNode(true);
      clone.querySelectorAll('script,style,noscript,iframe,svg,canvas,nav,footer,header,aside,form,.ad,.ads,.sidebar,.menu,.navigation,.comment,.social,.share,.related,[role="banner"],[role="navigation"],[role="complementary"],[aria-hidden="true"]').forEach(el => el.remove());
      const selectors = ['article','main','[role="main"]','.content','.post','.entry'];
      let content = null;
      for (const s of selectors) {
        content = clone.querySelector(s);
        if (content && content.innerText.length > 200) break;
      }
      const text = (content || clone.body).innerText.replace(/\s+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
      if (text.length > 50) return text;
    } catch(e) {}
    return document.body.innerText.replace(/\s+/g,' ').trim();
  }

  // ===== ORP =====
  function getORP(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 2);
    if (len <= 9) return Math.floor(len / 2) - 1;
    if (len <= 13) return Math.floor(len / 2) - 1;
    return Math.floor(len / 3);
  }

  // ===== RSVP Tokenizer =====
  function tokenize(text, chunkSize) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const tokens = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      const mainWord = chunk[Math.floor(chunk.length / 2)];
      tokens.push({ text: chunk.join(' '), orp: getORP(mainWord.replace(/[^a-zA-ZäöüÄÖÜß]/g,'')) });
    }
    return tokens;
  }

  // ===== Build stripe CSS for a given settings object =====
  function buildStripeCSS(selector, cfg) {
    const w = cfg.stripeW, off = cfg.stripeOff, fg = cfg.fg, r = cfg.red, c = cfg.cyan;
    return `
      ${selector} {
        background-image: linear-gradient(to right,
          ${fg} 0px ${w}px,
          ${r}  ${w}px ${w*2}px,
          ${fg} ${w*2}px ${w*3}px,
          ${c}  ${w*3}px ${w*4}px,
          ${fg} ${w*4}px ${w*5}px,
          ${r}  ${w*5}px ${w*6}px,
          ${fg} ${w*6}px ${w*7}px,
          ${c}  ${w*7}px ${w*8}px,
          ${fg} ${w*8}px ${w*9}px
        ) !important;
        background-size: ${w*9}px 100% !important;
        background-position: ${off}px 0 !important;
        background-repeat: repeat-x !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        color: transparent !important;
      }`;
  }

  // ===== BAR READER OVERLAY =====
  function createBarOverlay(rawText) {
    // Split into paragraphs
    const paragraphs = rawText.split(/\n{2,}/).map(p => p.replace(/\s+/g,' ').trim()).filter(Boolean);
    if (paragraphs.length === 0) {
      alert('Kein Text gefunden.');
      window.__rsvpReaderActive = false;
      return;
    }

    const fontSize = Math.round(18 * S.scale);
    let cfg = { stripeW: S.stripeW, stripeOff: S.stripeOff, red: S.red, cyan: S.cyan, fg: S.fg, opto: S.opto };

    function renderStyles() {
      const stripeRule = cfg.opto ? buildStripeCSS('#bar-text p', cfg) : '';
      const el = document.getElementById('bar-styles');
      if (el) el.textContent = `
        #bar-overlay { position:fixed;inset:0;z-index:2147483647;background:${S.bg};color:${S.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column; }
        #bar-overlay * { box-sizing:border-box; }
        #bar-header { display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:${S.bg};border-bottom:1px solid rgba(128,128,128,0.25);flex-shrink:0;min-height:52px; }
        .bar-btn { min-height:44px;padding:8px 18px;font-size:15px;font-weight:500;border:1px solid rgba(128,128,128,0.35);border-radius:10px;cursor:pointer;background:rgba(128,128,128,0.12);color:${S.fg};touch-action:manipulation; }
        .bar-btn-primary { background:#4361ee;color:white;border-color:#4361ee; }
        #bar-scroll { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch; }
        #bar-text { max-width:680px;margin:0 auto;padding:24px 24px 60px;font-family:Georgia,'Times New Roman',serif;font-size:${fontSize}px;line-height:1.85;color:${S.fg}; }
        #bar-text p { margin:0 0 1.2em 0; }
        #bar-calib { position:absolute;top:0;left:0;right:0;z-index:10;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);color:white;padding:16px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid rgba(255,255,255,0.15); }
        #bar-calib h3 { margin:0;font-size:1rem; }
        .calib-label { font-size:0.85rem;opacity:0.75;text-align:center; }
        .calib-row { display:flex;align-items:center;gap:8px; }
        .calib-row input[type=range] { flex:1; }
        .calib-step { min-width:44px;min-height:44px;padding:0 10px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.25);border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation; }
        .calib-colors { display:flex;gap:16px;justify-content:center;align-items:center; }
        .calib-color-item { display:flex;align-items:center;gap:8px;font-size:0.9rem; }
        .calib-color-item input[type=color] { width:44px;height:44px;padding:2px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;background:transparent;cursor:pointer; }
        .calib-done { align-self:center;background:#4361ee;color:white;border:none;border-radius:10px;padding:10px 28px;font-size:0.9rem;font-weight:600;cursor:pointer;touch-action:manipulation; }
        ${stripeRule}
      `;
    }

    const paragraphsHTML = paragraphs.map(p => `<p>${p.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('');
    const calibBtnHTML = S.opto ? `<button class="bar-btn bar-btn-primary" id="bar-calib-open">Kalibrieren</button>` : '';

    const overlay = document.createElement('div');
    overlay.id = 'bar-overlay';
    overlay.innerHTML = `
      <style id="bar-styles"></style>
      <div id="bar-header">
        <button class="bar-btn" id="bar-close">← Schließen</button>
        ${calibBtnHTML}
      </div>
      <div id="bar-scroll">
        <div id="bar-text">${paragraphsHTML}</div>
      </div>
      <div id="bar-calib" style="display:none">
        <h3>Kalibrierung</h3>
        <div class="calib-label" id="calib-w-label">Streifenbreite: ${cfg.stripeW} px</div>
        <div class="calib-row">
          <button class="calib-step" id="cw-m5">−5</button>
          <button class="calib-step" id="cw-m1">−1</button>
          <input type="range" id="cw-slider" min="10" max="300" value="${cfg.stripeW}">
          <button class="calib-step" id="cw-p1">+1</button>
          <button class="calib-step" id="cw-p5">+5</button>
        </div>
        <div class="calib-label" id="calib-off-label">Versatz: ${cfg.stripeOff} px</div>
        <div class="calib-row">
          <button class="calib-step" id="co-m10">−10</button>
          <button class="calib-step" id="co-m1">−1</button>
          <input type="range" id="co-slider" min="-300" max="300" value="${cfg.stripeOff}">
          <button class="calib-step" id="co-p1">+1</button>
          <button class="calib-step" id="co-p10">+10</button>
        </div>
        <div class="calib-colors">
          <div class="calib-color-item"><span>Rot</span><input type="color" id="c-red" value="${cfg.red}"><button class="calib-step" id="c-red-reset">Reset</button></div>
          <div class="calib-color-item"><span>Cyan</span><input type="color" id="c-cyan" value="${cfg.cyan}"><button class="calib-step" id="c-cyan-reset">Reset</button></div>
        </div>
        <button class="calib-done" id="calib-close">Fertig</button>
      </div>
    `;
    document.body.appendChild(overlay);

    renderStyles();

    function updateW(delta) {
      cfg.stripeW = Math.max(10, Math.min(300, cfg.stripeW + delta));
      document.getElementById('cw-slider').value = cfg.stripeW;
      document.getElementById('calib-w-label').textContent = 'Streifenbreite: ' + cfg.stripeW + ' px';
      renderStyles();
    }
    function updateOff(delta) {
      cfg.stripeOff = Math.max(-300, Math.min(300, cfg.stripeOff + delta));
      document.getElementById('co-slider').value = cfg.stripeOff;
      document.getElementById('calib-off-label').textContent = 'Versatz: ' + cfg.stripeOff + ' px';
      renderStyles();
    }

    function close() {
      overlay.remove();
      window.__rsvpReaderActive = false;
      document.removeEventListener('keydown', handleKeydown);
    }
    window.__rsvpReaderClose = close;

    overlay.querySelector('#bar-close').addEventListener('click', close);

    if (S.opto) {
      const calibPanel = overlay.querySelector('#bar-calib');
      overlay.querySelector('#bar-calib-open').addEventListener('click', () => { calibPanel.style.display = 'flex'; calibPanel.style.flexDirection = 'column'; });
      overlay.querySelector('#calib-close').addEventListener('click', () => { calibPanel.style.display = 'none'; });
      overlay.querySelector('#cw-m5').addEventListener('click', () => updateW(-5));
      overlay.querySelector('#cw-m1').addEventListener('click', () => updateW(-1));
      overlay.querySelector('#cw-p1').addEventListener('click', () => updateW(1));
      overlay.querySelector('#cw-p5').addEventListener('click', () => updateW(5));
      overlay.querySelector('#cw-slider').addEventListener('input', e => { cfg.stripeW = Number(e.target.value); document.getElementById('calib-w-label').textContent = 'Streifenbreite: ' + cfg.stripeW + ' px'; renderStyles(); });
      overlay.querySelector('#co-m10').addEventListener('click', () => updateOff(-10));
      overlay.querySelector('#co-m1').addEventListener('click', () => updateOff(-1));
      overlay.querySelector('#co-p1').addEventListener('click', () => updateOff(1));
      overlay.querySelector('#co-p10').addEventListener('click', () => updateOff(10));
      overlay.querySelector('#co-slider').addEventListener('input', e => { cfg.stripeOff = Number(e.target.value); document.getElementById('calib-off-label').textContent = 'Versatz: ' + cfg.stripeOff + ' px'; renderStyles(); });
      overlay.querySelector('#c-red').addEventListener('input', e => { cfg.red = e.target.value; renderStyles(); });
      overlay.querySelector('#c-cyan').addEventListener('input', e => { cfg.cyan = e.target.value; renderStyles(); });
      overlay.querySelector('#c-red-reset').addEventListener('click', () => { cfg.red = '#FF0000'; overlay.querySelector('#c-red').value = cfg.red; renderStyles(); });
      overlay.querySelector('#c-cyan-reset').addEventListener('click', () => { cfg.cyan = '#00FFFF'; overlay.querySelector('#c-cyan').value = cfg.cyan; renderStyles(); });
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKeydown);
  }

  // ===== RSVP OVERLAY =====
  function createRsvpOverlay(text) {
    const tokens = tokenize(text, S.chunk);
    if (tokens.length === 0) {
      alert('Kein Text gefunden. Markiere Text oder öffne einen Artikel.');
      window.__rsvpReaderActive = false;
      return;
    }

    let pos = 0, playing = true, wpm = S.wpm, intervalId = null;
    const bgColor = S.bg, fgColor = S.fg, fontSize = Math.round(42 * S.scale);

    const styles = `
      #rsvp-overlay { position:fixed;inset:0;z-index:2147483647;background:${bgColor};color:${fgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column; }
      #rsvp-overlay * { box-sizing:border-box;margin:0;padding:0; }
      #rsvp-word-area { flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;padding:20px; }
      #rsvp-word { font-size:clamp(${fontSize*.7}px,8vw,${fontSize*1.3}px);font-family:ui-monospace,'SF Mono',Consolas,monospace;white-space:nowrap;letter-spacing:.02em; }
      #rsvp-word .pre,#rsvp-word .post { color:${fgColor}; }
      #rsvp-word .pivot { color:#e63946;font-weight:600; }
      #rsvp-controls { background:${bgColor};border-top:1px solid rgba(128,128,128,.3);padding:16px 20px;display:flex;flex-direction:column;gap:12px; }
      #rsvp-buttons { display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap; }
      .rsvp-btn { min-height:52px;min-width:52px;padding:14px 20px;font-size:16px;font-weight:500;border:1px solid rgba(128,128,128,.3);border-radius:12px;cursor:pointer;background:rgba(128,128,128,.15);color:${fgColor};transition:all .15s;touch-action:manipulation; }
      .rsvp-btn:active { transform:scale(.97); }
      .rsvp-btn-primary { background:#4361ee;color:white;border-color:#4361ee; }
      .rsvp-group { display:flex;align-items:center;gap:8px;background:rgba(128,128,128,.1);padding:6px;border-radius:12px; }
      .rsvp-label { font-size:12px;font-weight:600;color:${fgColor};opacity:.7;text-transform:uppercase;padding:0 8px; }
      .rsvp-value { font-size:16px;font-weight:700;min-width:48px;text-align:center;color:${fgColor}; }
      #rsvp-progress { height:6px;background:rgba(128,128,128,.2);border-radius:3px;overflow:hidden;cursor:pointer; }
      #rsvp-progress-bar { height:100%;background:linear-gradient(90deg,#4361ee,#06d6a0);width:0%;transition:width .1s; }
      #rsvp-info { text-align:center;font-size:12px;color:${fgColor};opacity:.6; }
      #rsvp-info kbd { background:rgba(128,128,128,.2);border:1px solid rgba(128,128,128,.3);border-radius:4px;padding:2px 6px;font-family:inherit; }
      ${S.opto ? buildStripeCSS('#rsvp-word .pre, #rsvp-word .post, #rsvp-word .pivot', S) : ''}
    `;

    const overlay = document.createElement('div');
    overlay.id = 'rsvp-overlay';
    overlay.innerHTML = `
      <style>${styles}</style>
      <div id="rsvp-word-area"><div id="rsvp-word"><span class="pre"></span><span class="pivot"></span><span class="post"></span></div></div>
      <div id="rsvp-controls">
        <div id="rsvp-progress"><div id="rsvp-progress-bar"></div></div>
        <div id="rsvp-buttons">
          <button class="rsvp-btn" id="rsvp-back">◀◀</button>
          <button class="rsvp-btn rsvp-btn-primary" id="rsvp-play">⏸</button>
          <button class="rsvp-btn" id="rsvp-fwd">▶▶</button>
          <div class="rsvp-group">
            <span class="rsvp-label">WPM</span>
            <button class="rsvp-btn" id="rsvp-wpm-down">−</button>
            <span class="rsvp-value" id="rsvp-wpm">${wpm}</span>
            <button class="rsvp-btn" id="rsvp-wpm-up">+</button>
          </div>
          <button class="rsvp-btn" id="rsvp-close">Schließen</button>
        </div>
        <div id="rsvp-info"><kbd>Leertaste</kbd> Play/Pause · <kbd>←</kbd>/<kbd>→</kbd> Navigation · <kbd>↑</kbd>/<kbd>↓</kbd> WPM · <kbd>Esc</kbd> Schließen</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const wordEl = overlay.querySelector('#rsvp-word');
    const preEl = wordEl.querySelector('.pre');
    const pivotEl = wordEl.querySelector('.pivot');
    const postEl = wordEl.querySelector('.post');
    const playBtn = overlay.querySelector('#rsvp-play');
    const wpmEl = overlay.querySelector('#rsvp-wpm');
    const progressBar = overlay.querySelector('#rsvp-progress-bar');

    function renderWord() {
      const token = tokens[pos];
      if (!token) return;
      const words = token.text.split(' ');
      const mainIdx = Math.floor(words.length / 2);
      const mainWord = words[mainIdx];
      const orp = token.orp;
      if (words.length === 1) {
        preEl.textContent = mainWord.slice(0, orp);
        pivotEl.textContent = mainWord.slice(orp, orp + 1);
        postEl.textContent = mainWord.slice(orp + 1);
      } else {
        const before = words.slice(0, mainIdx).join(' ');
        const after = words.slice(mainIdx + 1).join(' ');
        preEl.textContent = (before ? before + ' ' : '') + mainWord.slice(0, orp);
        pivotEl.textContent = mainWord.slice(orp, orp + 1);
        postEl.textContent = mainWord.slice(orp + 1) + (after ? ' ' + after : '');
      }
      progressBar.style.width = ((pos / tokens.length) * 100) + '%';
    }

    function start() {
      if (intervalId) return;
      playing = true; playBtn.textContent = '⏸';
      const ms = 60000 / wpm;
      intervalId = setInterval(() => {
        if (pos >= tokens.length - 1) { stop(); return; }
        pos++; renderWord();
      }, ms);
    }
    function stop() {
      playing = false; playBtn.textContent = '▶';
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }
    function toggle() { playing ? stop() : start(); }
    function seek(delta) { stop(); pos = Math.max(0, Math.min(tokens.length - 1, pos + delta)); renderWord(); }
    function setWPM(n) {
      wpm = Math.max(50, Math.min(1000, n)); wpmEl.textContent = wpm;
      if (playing) { stop(); start(); }
    }
    function close() {
      stop(); overlay.remove();
      window.__rsvpReaderActive = false;
      document.removeEventListener('keydown', handleKeydown);
    }
    window.__rsvpReaderClose = close;

    overlay.querySelector('#rsvp-word-area').addEventListener('click', e => {
      if (e.clientX < window.innerWidth / 2) seek(-Math.round(wpm / 20)); else toggle();
    });
    overlay.querySelector('#rsvp-play').addEventListener('click', toggle);
    overlay.querySelector('#rsvp-back').addEventListener('click', () => seek(-Math.round(wpm / 20)));
    overlay.querySelector('#rsvp-fwd').addEventListener('click', () => seek(Math.round(wpm / 60)));
    overlay.querySelector('#rsvp-wpm-down').addEventListener('click', () => setWPM(wpm - 25));
    overlay.querySelector('#rsvp-wpm-up').addEventListener('click', () => setWPM(wpm + 25));
    overlay.querySelector('#rsvp-close').addEventListener('click', close);
    overlay.querySelector('#rsvp-progress').addEventListener('click', e => {
      const rect = e.target.getBoundingClientRect();
      pos = Math.floor(((e.clientX - rect.left) / rect.width) * tokens.length);
      renderWord();
    });

    function handleKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === ' ') { e.preventDefault(); toggle(); return; }
      if (e.key === 'ArrowLeft')  { seek(-Math.round(wpm / 20)); return; }
      if (e.key === 'ArrowRight') { seek(Math.round(wpm / 60)); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setWPM(wpm + 25); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setWPM(wpm - 25); return; }
      const num = parseInt(e.key);
      if (!isNaN(num)) setWPM((num === 0 ? 10 : num) * 100);
    }
    document.addEventListener('keydown', handleKeydown);

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

  if (S.mode === 'bar') createBarOverlay(text);
  else createRsvpOverlay(text);
})();
