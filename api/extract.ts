import { VercelRequest, VercelResponse } from '@vercel/node';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Teletext-Erkennung
function isTeletextUrl(url: string) {
  return /text\.orf\.at\/channel\/orf\d\/page\/\d+\/\d+\.html/i.test(url);
}

// Teletext-Reinigung (Kopf-/Fuß-/Navigationszeilen raus)
function cleanupTeletext(text: string) {
  const lines = text.split('\n').map(l => l.replace(/\s+$/,''));
  const keep: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { keep.push(''); continue; }
    if (/^ORF\s*TELETEXT/i.test(l)) continue;
    if (/^Inhalt\b/i.test(l)) continue;
    if (/^Seite\s+\d+(\.\d+)?/i.test(l)) continue;
    if (/^\d{2,3}\.\d/.test(l)) continue;
    if (/^\<\<|\>\>|\|\<\<|\>\>\|/.test(l)) continue;
    if (/^Topstory/i.test(l)) continue;
    if (/Impressum|Datenschutz/i.test(l)) continue;
    const letters = (l.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
    const nonLetters = l.length - letters;
    if (l.length > 0 && nonLetters > letters * 2 && letters < 15) continue;
    keep.push(raw);
  }
  return keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = (req.query.url as string || '').trim();
    if (!url) return res.status(400).json({ error: 'Missing ?url=' });

    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) return res.status(r.status).json({ error: `Fetch failed: ${r.status}` });
    const html = await r.text();

    const dom = new JSDOM(html, { url, contentType: 'text/html' });
    const reader = new Readability(dom.window.document, { keepClasses: false });
    const article = reader.parse();

    let textContent = (article?.textContent || '').trim();

    // Teletext-Fallback
    if (isTeletextUrl(url)) {
      const fallback = cleanupTeletext(dom.window.document.body?.textContent || '');
      if (fallback.length > textContent.length) textContent = fallback;
    }
    // Falls immer noch zu kurz: Rohtext als Fallback
    if (textContent.length < 120) {
      const raw = (dom.window.document.body?.textContent || '').trim();
      if (raw.length > textContent.length) textContent = raw;
    }

    // CORS locker lassen (Frontend & API im selben Projekt -> unkritisch)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    return res.status(200).json({ ok: true, url, title: article?.title || '', textContent });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}