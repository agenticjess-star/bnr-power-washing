// Diagnostic endpoint: lists Gemini models the API key has access to + tests each.
// REMOVE before client handoff. Path: /api/_debug-gemini

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const result = { keyPrefix: apiKey.slice(0, 6) + '...', keyLen: apiKey.length, tests: [] };

  // 1. List all models the key has access to
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    const data = await r.json();
    if (data.models) {
      result.tests.push({
        test: 'listModels',
        status: r.status,
        count: data.models.length,
        textModels: data.models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name),
        imageModels: data.models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && m.name.toLowerCase().includes('image')).map(m => m.name)
      });
    } else {
      result.tests.push({ test: 'listModels', status: r.status, raw: JSON.stringify(data).slice(0, 600) });
    }
  } catch (e) {
    result.tests.push({ test: 'listModels', error: String(e?.message || e) });
  }

  // 2. Try each candidate text model
  for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with just the word OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      const txt = await r.text();
      let parsed; try { parsed = JSON.parse(txt); } catch { parsed = null; }
      result.tests.push({
        test: `text:${model}`,
        status: r.status,
        ok: r.ok,
        reply: parsed?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 60) || null,
        error: parsed?.error?.message?.slice(0, 200) || (r.ok ? null : txt.slice(0, 200))
      });
    } catch (e) {
      result.tests.push({ test: `text:${model}`, error: String(e?.message || e) });
    }
  }

  // 3. Try each candidate image-generation model
  for (const model of [
    'gemini-2.5-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp-image-generation',
    'imagen-3.0-generate-002'
  ]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'A simple red apple, photo' }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        })
      });
      const txt = await r.text();
      let parsed; try { parsed = JSON.parse(txt); } catch { parsed = null; }
      const parts = parsed?.candidates?.[0]?.content?.parts || [];
      result.tests.push({
        test: `image:${model}`,
        status: r.status,
        ok: r.ok,
        hasImagePart: parts.some(p => p.inlineData?.data),
        partKeys: parts.map(p => Object.keys(p)),
        error: parsed?.error?.message?.slice(0, 240) || (r.ok ? null : txt.slice(0, 240))
      });
    } catch (e) {
      result.tests.push({ test: `image:${model}`, error: String(e?.message || e) });
    }
  }

  res.status(200).json(result);
}
