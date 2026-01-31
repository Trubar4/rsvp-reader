import React, { useState } from 'react';
import { extractArticle } from '../lib/extractClient';

export default function BrowserView(
  { onLoadToReader }:
  { onLoadToReader: (payload: { title: string; text: string; url: string }) => void }
) {
  const [url, setUrl] = useState<string>('https://text.orf.at/channel/orf1/page/101/1.html');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<{ title: string; snippet: string }|null>(null);

  async function handleExtract() {
    setError('');
    setLoading(true);
    try {
      const { title, text } = await extractArticle(url);
      const snippet = text.split('\n').slice(0, 8).join('\n');
      setPreview({ title: title || '(ohne Titel)', snippet });
    } catch (e:any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function sendToReader() {
    if (!preview) return;
    onLoadToReader({ title: preview.title, text: preview.snippet.length ? preview.snippet : '', url });
  }

  return (
    <div className="container">
      <h1>Browser</h1>
      <div style={{ display:'grid', gap:8 }}>
        <label>Link
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={e=>setUrl(e.target.value)}
            style={{ width:'100%', padding:'10px' }}
          />
        </label>
        <div className="button-row">
          <button onClick={handleExtract} disabled={loading || !url}>Vorschau laden</button>
          <button onClick={sendToReader} disabled={!preview}>Reader →</button>
        </div>
        {loading && <div>Lade…</div>}
        {error && <div style={{ color:'#b00' }}>{error}</div>}
        {preview && (
          <div style={{ whiteSpace:'pre-wrap', border:'1px solid #eee', padding:12, borderRadius:8 }}>
            <strong>{preview.title}</strong>
            <hr />
            {preview.snippet}
          </div>
        )}
        <div style={{ fontSize:12, opacity:0.7 }}>
          Hinweis: Die Extraktion nutzt einen Server‑Endpoint, weil Browser‑CORS direkte Seitenabrufe blockiert. [1](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
        </div>
      </div>
    </div>
  );
}