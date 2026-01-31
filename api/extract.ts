// api/extract.ts
//
// Serverless-Extractor für Artikel-/Teletext-Seiten.
// - Läuft lokal mit `vercel dev` und in Vercel Functions.
// - Robust gegen langsame Quellen (Timeout), mit realistischem User-Agent.
// - Nutzt Mozilla Readability zum Extrahieren des "echten" Textes.
// - Hat Teletext-spezifische Heuristik (ORF).
//
// GET /api/extract?url=<ENCODED_URL>
//  -> { ok: true, url, title, textContent } | { error, ... }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// -----------------------------
// Vercel-Funktions-Parameter
// -----------------------------
// Auf Hobby/Pro bis 60s möglich. Erhöht die Chance, langsame Quellen
// (oder große HTMLs) noch verarbeiten zu können.
export const config = {
  maxDuration: 60
};

// -----------------------------
// Utilities
// -----------------------------

/** Ermittelt, ob es sich um eine ORF-Teletext-URL handelt. */
function isTeletextUrl(url: string) {
  return /text\.orf\.at\/channel\/orf\d\/page\/\d+\/\d+\.html/i.test(url);
}

/** Entfernt Kopf-/Fuß-/Navigationszeilen aus ORF-Teletext (heuristisch). */
function cleanupTeletext(rawText: string) {
  const lines = rawText.split('\n').map(l => l.replace(/\s+$/,''));
  const keep: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { keep.push(''); continue; }

    // offensichtliche UI-/Meta-Zeilen raus
    if (/^ORF\s*TELETEXT/i.test(l)) continue;
    if (/^Inhalt\b/i.test(l)) continue;
    if (/^Seite\s+\d+(\.\d+)?/i.test(l)) continue;
    if (/^\d{2,3}\.\d/.test(l)) continue;                 // "101.1" etc.
    if (/^\<\<|\>\>|\|\<\<|\>\>\|/.test(l)) continue;     // Pager
    if (/^Topstory/i.test(l)) continue;
    if (/Impressum|Datenschutz/i.test(l)) continue;

    // Zeilen mit sehr vielen Nicht-Buchstaben raus (ASCII-Rahmen etc.)
    const letters = (l.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
    const nonLetters = l.length - letters;
    if (l.length > 0 && nonLetters > letters * 2 && letters < 15) continue;

    keep.push(raw);
  }
  // Leere Blöcke reduzieren, Leading/Trailing-Whitespace entfernen
  return keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Fetch mit Timeout & plausiblen Headers, inkl. Follow-Redirects. */
async function fetchWithTimeout(url: string, ms = 30000): Promise<Response> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: {
        // Ein realistischer UA vermeidet bei manchen Hosts blockierte/abgespeckte Antworten.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'de,en;q=0.9',
      },
    });
    return r;
  } finally {
    clearTimeout(id);
  }
}

// -----------------------------
// Handler
// -----------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const t0 = Date.now();

  // CORS offen halten (Frontend & API im selben Projekt / Origin-unabhängig nutzbar)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = (req.query.url as string || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'Missing ?url=' });
    }

    // 1) Quelle laden (mit Timeout & UA)
    const r = await fetchWithTimeout(url, 30000); // 30s Timeout
    if (!r.ok) {
      console.error('[extract] fetch failed', r.status, r.statusText, url);
      return res.status(r.status).json({ error: `Fetch failed: ${r.status} ${r.statusText}` });
    }
    const html = await r.text();
    const tFetch = Date.now();
    console.log('[extract] fetch(ms)=', tFetch - t0, 'size=', html.length);

    // 2) DOM bauen & Readability anwenden
    const dom = new JSDOM(html, { url, contentType: 'text/html' });
    const reader = new Readability(dom.window.document, { keepClasses: false });
    const article = reader.parse();

    let textContent = (article?.textContent || '').trim();
    let title = (article?.title || '').trim();

    // 3) Teletext-Fallback (falls Readability zu wenig oder URL Teletext)
    if (isTeletextUrl(url)) {
      const rawText = dom.window.document.body?.textContent || '';
      const cleaned = cleanupTeletext(rawText);
      if (cleaned.length > textContent.length) {
        textContent = cleaned;
        if (!title) {
          // Teletext hat oft eigene Titelzeilen – wenn Readability keinen liefert, Titel komplettieren
          title = (dom.window.document.querySelector('title')?.textContent || '').trim();
        }
      }
    }

    // 4) Zusätzlicher Fallback, falls sehr wenig Text
    if (textContent.length < 120) {
      const raw = (dom.window.document.body?.textContent || '').trim();
      if (raw.length > textContent.length) textContent = raw;
    }

    const tParse = Date.now();
    console.log('[extract] parse(ms)=', tParse - tFetch, 'total(ms)=', tParse - t0);

    if (!textContent) {
      return res.status(502).json({ error: 'No content extracted', url });
    }

    // 5) Antwort
    return res.status(200).json({
      ok: true,
      url,
      title,
      textContent
    });

  } catch (e: any) {
    console.error('[extract] ERROR', e?.message, e?.stack);
    return res.status(500).json({
      error: e?.message || 'internal error',
      elapsedMs: Date.now() - t0
    });
  }
}