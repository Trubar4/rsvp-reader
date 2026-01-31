export async function extractArticle(url: string, apiBase?: string): Promise<{ title: string; text: string; }> {
  const base = apiBase || (import.meta.env.VITE_EXTRACT_API as string) || '/api/extract';
  const r = await fetch(`${base}?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error(`Extractor failed: ${r.status}`);
  const j = await r.json();
  if (!j || !j.textContent) throw new Error('No textContent returned');
  return { title: j.title || '', text: j.textContent as string };
}