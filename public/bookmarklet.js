/**
 * RSVP Reader Bookmarklet - RSVP + Bar Reader (switchable)
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
      // Search all scripts for ours by filename — reliable across all browsers
      // regardless of document.currentScript support for dynamic scripts
      let src = '';
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const s = scripts[i].src || '';
        if (s.indexOf('bookmarklet.js') !== -1) { src = s; break; }
      }
      if (!src) return d;
      // iOS Safari bookmark editor HTML-encodes & → &amp; in the saved URL
      src = src.replace(/&amp;/g, '&');
      const p = new URL(src).searchParams;
      function num(key, def) { const v = parseInt(p.get(key)); return isNaN(v) ? def : v; }
      function flt(key, def) { const v = parseFloat(p.get(key)); return isNaN(v) ? def : v; }
      function col(key, def) { const v = p.get(key); return v ? decodeURIComponent(v) : def; }
      return {
        wpm:       num('wpm',       d.wpm),
        chunk:     num('chunk',     d.chunk),
        scale:     flt('scale',     d.scale),
        fg:        col('fg',        d.fg),
        bg:        col('bg',        d.bg),
        mode:      p.get('mode') || d.mode,
        opto:      p.get('opto') === '1',
        stripeW:   num('stripeW',   d.stripeW),
        stripeOff: num('stripeOff', d.stripeOff),
        red:       col('red',       d.red),
        cyan:      col('cyan',      d.cyan),
      };
    } catch(e) { return d; }
  }

  // ===== Persist calibration across origins via window.name =====
  // window.name survives cross-origin navigation within the same tab —
  // no origin restrictions unlike localStorage. localStorage is kept as
  // a same-site fallback across browser sessions.
  // opto on/off is NOT persisted — the URL param always controls that.

  function loadCalib(s) {
    try {
      let saved = null;
      // window.name: cross-origin, per-tab persistence
      const m = (window.name || '').match(/__rsvp__(\{[^}]*\})/);
      if (m) saved = JSON.parse(m[1]);
      // localStorage: same-origin, cross-session fallback
      if (!saved) saved = JSON.parse(localStorage.getItem('rsvp-opto-v2') || 'null');
      if (!saved) return s;
      if (saved.stripeW   !== undefined) s.stripeW   = saved.stripeW;
      if (saved.stripeOff !== undefined) s.stripeOff = saved.stripeOff;
      if (saved.red)  s.red  = saved.red;
      if (saved.cyan) s.cyan = saved.cyan;
      // opto intentionally not restored — URL param controls initial state
    } catch(e) {}
    return s;
  }

  function saveCalib(cfg) {
    const data = { stripeW: cfg.stripeW, stripeOff: cfg.stripeOff, red: cfg.red, cyan: cfg.cyan };
    try {
      window.name = (window.name || '').replace(/__rsvp__\{[^}]*\}/, '') + '__rsvp__' + JSON.stringify(data);
      localStorage.setItem('rsvp-opto-v2', JSON.stringify(data));
    } catch(e) {}
  }

  const S = loadCalib(getSettings());

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

  // ===== Stripe CSS helper =====
  function buildStripeCSS(selector, cfg) {
    const w = cfg.stripeW, off = cfg.stripeOff, fg = cfg.fg, r = cfg.red, c = cfg.cyan;
    return `${selector}{background-image:linear-gradient(to right,${fg} 0px ${w}px,${r} ${w}px ${w*2}px,${fg} ${w*2}px ${w*3}px,${c} ${w*3}px ${w*4}px,${fg} ${w*4}px ${w*5}px,${r} ${w*5}px ${w*6}px,${fg} ${w*6}px ${w*7}px,${c} ${w*7}px ${w*8}px,${fg} ${w*8}px ${w*9}px)!important;background-size:${w*9}px 100%!important;background-position:${off}px 0!important;background-repeat:repeat-x!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;}`;
  }

  // ===== Shared: calibration panel HTML + wiring =====
  function buildCalibHTML(cfg) {
    return `<div id="bm-calib" style="display:none;position:absolute;top:0;left:0;right:0;z-index:20;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);color:white;padding:14px 16px;flex-direction:column;gap:10px;border-bottom:1px solid rgba(255,255,255,.15)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.15)">
        <strong style="font-size:.95rem">OptoTraining</strong>
        <button id="bc-opto-toggle" style="padding:6px 16px;border-radius:20px;border:none;cursor:pointer;font-size:.85rem;font-weight:600;background:${cfg.opto?'#4361ee':'rgba(255,255,255,.2)'};color:white">${cfg.opto?'AN ✓':'AUS'}</button>
      </div>
      <div id="bc-wlabel" style="font-size:.8rem;opacity:.7;text-align:center">Streifenbreite: ${cfg.stripeW} px</div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="bm-cs" data-act="wm5">−5</button><button class="bm-cs" data-act="wm1">−1</button>
        <input type="range" id="bc-wslider" min="10" max="300" value="${cfg.stripeW}" style="flex:1">
        <button class="bm-cs" data-act="wp1">+1</button><button class="bm-cs" data-act="wp5">+5</button>
      </div>
      <div id="bc-olabel" style="font-size:.8rem;opacity:.7;text-align:center">Versatz: ${cfg.stripeOff} px</div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="bm-cs" data-act="om10">−10</button><button class="bm-cs" data-act="om1">−1</button>
        <input type="range" id="bc-oslider" min="-300" max="300" value="${cfg.stripeOff}" style="flex:1">
        <button class="bm-cs" data-act="op1">+1</button><button class="bm-cs" data-act="op10">+10</button>
      </div>
      <div style="display:flex;gap:16px;justify-content:center;align-items:center">
        <div style="display:flex;align-items:center;gap:8px;font-size:.9rem">Rot<input type="color" id="bc-red" value="${cfg.red}" style="width:44px;height:44px;padding:2px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:transparent;cursor:pointer"><button class="bm-cs" data-act="rreset">Reset</button></div>
        <div style="display:flex;align-items:center;gap:8px;font-size:.9rem">Cyan<input type="color" id="bc-cyan" value="${cfg.cyan}" style="width:44px;height:44px;padding:2px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:transparent;cursor:pointer"><button class="bm-cs" data-act="creset">Reset</button></div>
      </div>
      <button id="bc-done" style="align-self:center;background:#4361ee;color:white;border:none;border-radius:10px;padding:10px 28px;font-size:.9rem;font-weight:600;cursor:pointer">Fertig</button>
    </div>`;
  }

  function wireCalib(overlay, cfg, onUpdate) {
    const panel = overlay.querySelector('#bm-calib');
    if (!panel) return;
    function update() { onUpdate(); saveCalib(cfg); }
    function setW(v) {
      cfg.stripeW = Math.max(10, Math.min(300, v));
      overlay.querySelector('#bc-wslider').value = cfg.stripeW;
      overlay.querySelector('#bc-wlabel').textContent = 'Streifenbreite: ' + cfg.stripeW + ' px';
      update();
    }
    function setOff(v) {
      cfg.stripeOff = Math.max(-300, Math.min(300, v));
      overlay.querySelector('#bc-oslider').value = cfg.stripeOff;
      overlay.querySelector('#bc-olabel').textContent = 'Versatz: ' + cfg.stripeOff + ' px';
      update();
    }
    // OptoTraining toggle
    const optoBtn = overlay.querySelector('#bc-opto-toggle');
    if (optoBtn) {
      optoBtn.addEventListener('click', () => {
        cfg.opto = !cfg.opto;
        optoBtn.textContent = cfg.opto ? 'AN ✓' : 'AUS';
        optoBtn.style.background = cfg.opto ? '#4361ee' : 'rgba(255,255,255,.2)';
        update();
      });
    }
    overlay.querySelectorAll('.bm-cs').forEach(btn => {
      btn.style.cssText = 'min-width:44px;min-height:44px;padding:0 8px;background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.25);border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer';
      btn.addEventListener('click', () => {
        const a = btn.dataset.act;
        if (a==='wm5') setW(cfg.stripeW-5);
        else if (a==='wm1') setW(cfg.stripeW-1);
        else if (a==='wp1') setW(cfg.stripeW+1);
        else if (a==='wp5') setW(cfg.stripeW+5);
        else if (a==='om10') setOff(cfg.stripeOff-10);
        else if (a==='om1') setOff(cfg.stripeOff-1);
        else if (a==='op1') setOff(cfg.stripeOff+1);
        else if (a==='op10') setOff(cfg.stripeOff+10);
        else if (a==='rreset') { cfg.red='#FF0000'; overlay.querySelector('#bc-red').value=cfg.red; update(); }
        else if (a==='creset') { cfg.cyan='#00FFFF'; overlay.querySelector('#bc-cyan').value=cfg.cyan; update(); }
      });
    });
    overlay.querySelector('#bc-wslider').addEventListener('input', e => setW(Number(e.target.value)));
    overlay.querySelector('#bc-oslider').addEventListener('input', e => setOff(Number(e.target.value)));
    overlay.querySelector('#bc-red').addEventListener('input', e => { cfg.red = e.target.value; update(); });
    overlay.querySelector('#bc-cyan').addEventListener('input', e => { cfg.cyan = e.target.value; update(); });
    overlay.querySelector('#bc-done').addEventListener('click', () => { panel.style.display = 'none'; });
  }

  // Shared button style helper
  const btnStyle = (bg, color) => `min-height:44px;padding:8px 16px;font-size:14px;font-weight:500;border:1px solid rgba(128,128,128,.35);border-radius:10px;cursor:pointer;background:${bg};color:${color};touch-action:manipulation`;

  const text = extractText();
  if (!text || text.length < 10) {
    alert('Kein lesbarer Text gefunden.\n\nMarkiere Text und versuche es erneut.');
    window.__rsvpReaderActive = false;
    return;
  }

  let currentMode = S.mode;

  function launch(mode) {
    currentMode = mode;
    // Remove existing overlay if present
    const existing = document.getElementById('bm-overlay');
    if (existing) existing.remove();
    if (mode === 'bar') createBarOverlay(text);
    else createRsvpOverlay(text);
  }

  // ===== BAR READER =====
  function createBarOverlay(rawText) {
    const paragraphs = rawText.split(/\n{2,}/).map(p => p.replace(/\s+/g,' ').trim()).filter(Boolean);
    const fontSize = Math.round(18 * S.scale);
    // opto defaults to true in bar reader — user can toggle off in calibration panel
    const cfg = { stripeW: S.stripeW, stripeOff: S.stripeOff, red: S.red, cyan: S.cyan, fg: S.fg, opto: S.opto };

    const overlay = document.createElement('div');
    overlay.id = 'bm-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:2147483647;background:${S.bg};color:${S.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column`;

    const paragraphsHTML = paragraphs.map(p => `<p style="margin:0 0 1.2em 0">${p.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('');

    overlay.innerHTML = `
      <style id="bm-stripe-style"></style>
      ${buildCalibHTML(cfg)}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${S.bg};border-bottom:1px solid rgba(128,128,128,.25);flex-shrink:0;gap:8px">
        <button id="bm-close" style="${btnStyle('rgba(128,128,128,.15)', S.fg)}">← Schließen</button>
        <div style="display:flex;gap:8px">
          <button id="bm-calib-open" style="${btnStyle('#4361ee','white')}">Kalibrieren</button>
          <button id="bm-switch" style="${btnStyle('rgba(128,128,128,.15)', S.fg)}">RSVP</button>
        </div>
      </div>
      <div id="bm-scroll" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch">
        <div id="bm-text" style="max-width:680px;margin:0 auto;padding:24px 24px 60px;font-family:Georgia,'Times New Roman',serif;font-size:${fontSize}px;line-height:1.85">${paragraphsHTML}</div>
      </div>`;

    document.body.appendChild(overlay);

    function updateStripes() {
      overlay.querySelector('#bm-stripe-style').textContent = cfg.opto ? buildStripeCSS('#bm-text p', cfg) : '';
    }
    updateStripes();

    wireCalib(overlay, cfg, updateStripes);
    overlay.querySelector('#bm-calib-open').addEventListener('click', () => {
      const p = overlay.querySelector('#bm-calib');
      p.style.display = 'flex'; p.style.flexDirection = 'column';
    });
    overlay.querySelector('#bm-close').addEventListener('click', close);
    overlay.querySelector('#bm-switch').addEventListener('click', () => launch('rsvp'));
  }

  // ===== RSVP =====
  function createRsvpOverlay(rawText) {
    const tokens = tokenize(rawText, S.chunk);
    if (tokens.length === 0) { alert('Kein Text gefunden.'); window.__rsvpReaderActive = false; return; }

    let pos = 0, playing = true, wpm = S.wpm, intervalId = null;
    const fontSize = Math.round(42 * S.scale);
    const cfg = { stripeW: S.stripeW, stripeOff: S.stripeOff, red: S.red, cyan: S.cyan, fg: S.fg, opto: S.opto };

    const overlay = document.createElement('div');
    overlay.id = 'bm-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:2147483647;background:${S.bg};color:${S.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column`;

    const calibHTML = cfg.opto ? buildCalibHTML(cfg) : '';

    overlay.innerHTML = `
      <style id="bm-stripe-style"></style>
      ${calibHTML}
      <div id="rsvp-word-area" style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;padding:20px">
        <div id="rsvp-word" style="font-size:clamp(${fontSize*.7}px,8vw,${fontSize*1.3}px);font-family:ui-monospace,'SF Mono',Consolas,monospace;white-space:nowrap;letter-spacing:.02em">
          <span id="rsvp-pre"></span><span id="rsvp-pivot" style="color:#e63946;font-weight:600"></span><span id="rsvp-post"></span>
        </div>
      </div>
      <div style="background:${S.bg};border-top:1px solid rgba(128,128,128,.3);padding:12px 16px;display:flex;flex-direction:column;gap:10px">
        <div id="rsvp-prog" style="height:6px;background:rgba(128,128,128,.2);border-radius:3px;overflow:hidden;cursor:pointer"><div id="rsvp-bar" style="height:100%;background:linear-gradient(90deg,#4361ee,#06d6a0);width:0%"></div></div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap">
          <button id="bm-back" style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">◀◀</button>
          <button id="bm-play" style="${btnStyle('#4361ee','white')}">⏸</button>
          <button id="bm-fwd"  style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">▶▶</button>
          <div style="display:flex;align-items:center;gap:6px;background:rgba(128,128,128,.1);padding:6px;border-radius:10px">
            <span style="font-size:11px;font-weight:600;opacity:.7;text-transform:uppercase;padding:0 6px">WPM</span>
            <button id="bm-wdn" style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">−</button>
            <span id="bm-wpm" style="font-size:16px;font-weight:700;min-width:44px;text-align:center">${wpm}</span>
            <button id="bm-wup" style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">+</button>
          </div>
          ${cfg.opto ? `<button id="bm-calib-open" style="${btnStyle('#4361ee','white')}">Kalibrieren</button>` : ''}
          <button id="bm-switch" style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">Bar Reader</button>
          <button id="bm-close" style="${btnStyle('rgba(128,128,128,.15)',S.fg)}">Schließen</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    function updateStripes() {
      const styleEl = overlay.querySelector('#bm-stripe-style');
      styleEl.textContent = cfg.opto ? buildStripeCSS('#rsvp-pre,#rsvp-pivot,#rsvp-post', cfg) : '';
    }
    updateStripes();

    if (cfg.opto) {
      wireCalib(overlay, cfg, updateStripes);
      overlay.querySelector('#bm-calib-open').addEventListener('click', () => {
        const p = overlay.querySelector('#bm-calib');
        p.style.display = 'flex'; p.style.flexDirection = 'column';
      });
    }

    const preEl = overlay.querySelector('#rsvp-pre');
    const pivotEl = overlay.querySelector('#rsvp-pivot');
    const postEl = overlay.querySelector('#rsvp-post');
    const playBtn = overlay.querySelector('#bm-play');
    const wpmEl = overlay.querySelector('#bm-wpm');
    const progressBar = overlay.querySelector('#rsvp-bar');

    function renderWord() {
      const token = tokens[pos]; if (!token) return;
      const words = token.text.split(' ');
      const mainIdx = Math.floor(words.length / 2);
      const mainWord = words[mainIdx];
      const orp = token.orp;
      const before = words.slice(0, mainIdx).join(' ');
      const after  = words.slice(mainIdx + 1).join(' ');
      preEl.textContent   = (before ? before+' ' : '') + mainWord.slice(0, orp);
      pivotEl.textContent = mainWord.slice(orp, orp+1);
      postEl.textContent  = mainWord.slice(orp+1) + (after ? ' '+after : '');
      progressBar.style.width = ((pos / tokens.length) * 100) + '%';
    }

    function startPlay() {
      if (intervalId) return;
      playing = true; playBtn.textContent = '⏸';
      intervalId = setInterval(() => {
        if (pos >= tokens.length - 1) { stopPlay(); return; }
        pos++; renderWord();
      }, 60000 / wpm);
    }
    function stopPlay() {
      playing = false; playBtn.textContent = '▶';
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }
    function toggle() { playing ? stopPlay() : startPlay(); }
    function seek(d) { stopPlay(); pos = Math.max(0, Math.min(tokens.length-1, pos+d)); renderWord(); }
    function setWPM(n) { wpm = Math.max(50, Math.min(1000, n)); wpmEl.textContent = wpm; if (playing) { stopPlay(); startPlay(); } }

    overlay.querySelector('#rsvp-word-area').addEventListener('click', e => { if (e.clientX < window.innerWidth/2) seek(-Math.round(wpm/20)); else toggle(); });
    overlay.querySelector('#bm-play').addEventListener('click', toggle);
    overlay.querySelector('#bm-back').addEventListener('click', () => seek(-Math.round(wpm/20)));
    overlay.querySelector('#bm-fwd').addEventListener('click',  () => seek(Math.round(wpm/60)));
    overlay.querySelector('#bm-wdn').addEventListener('click', () => setWPM(wpm-25));
    overlay.querySelector('#bm-wup').addEventListener('click', () => setWPM(wpm+25));
    overlay.querySelector('#bm-switch').addEventListener('click', () => { stopPlay(); launch('bar'); });
    overlay.querySelector('#bm-close').addEventListener('click', close);
    overlay.querySelector('#rsvp-prog').addEventListener('click', e => {
      const rect = e.target.getBoundingClientRect();
      pos = Math.floor(((e.clientX - rect.left) / rect.width) * tokens.length);
      renderWord();
    });

    function handleKeydown(e) {
      if (e.key==='Escape') { close(); return; }
      if (e.key===' ') { e.preventDefault(); toggle(); return; }
      if (e.key==='ArrowLeft')  { seek(-Math.round(wpm/20)); return; }
      if (e.key==='ArrowRight') { seek(Math.round(wpm/60)); return; }
      if (e.key==='ArrowUp')   { e.preventDefault(); setWPM(wpm+25); return; }
      if (e.key==='ArrowDown') { e.preventDefault(); setWPM(wpm-25); return; }
      const num = parseInt(e.key);
      if (!isNaN(num)) setWPM((num===0?10:num)*100);
    }
    document.addEventListener('keydown', handleKeydown);
    window.__rsvpKeydown = handleKeydown;

    renderWord();
    startPlay();
  }

  function close() {
    const el = document.getElementById('bm-overlay');
    if (el) el.remove();
    window.__rsvpReaderActive = false;
    if (window.__rsvpKeydown) {
      document.removeEventListener('keydown', window.__rsvpKeydown);
      window.__rsvpKeydown = null;
    }
  }
  window.__rsvpReaderClose = close;

  launch(S.mode);
})();
