// Vercel Serverless Function: AI-powered instant quote
// POST /api/quote with { photo: dataUri, email, phone, address, service }
// Returns { ok, quote: {priceLow, priceHigh, sqft, surfaceType, surfaceLabel, stainLevel, recommendedMethod, summary} }

export const config = { maxDuration: 30 };

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PRICING = {
  driveway:    { perSqft: 0.42, min: 180, label: 'Concrete driveway · pressure wash' },
  sidewalk:    { perSqft: 0.45, min: 120, label: 'Sidewalk · pressure wash' },
  house_siding:{ perSqft: 0.36, min: 320, label: 'House siding · soft wash' },
  roof:        { perSqft: 0.55, min: 380, label: 'Roof · soft wash + algae treatment' },
  gutter:      { perSqft: 0.18, min: 150, label: 'Gutter clear-out' },
  window:      { perSqft: 12,   min: 180, label: 'Window cleaning' },
  deck_wood:   { perSqft: 0.65, min: 220, label: 'Wood deck · soft wash + brighten' },
  patio_stone: { perSqft: 0.50, min: 200, label: 'Stone patio · pressure wash' },
  fence:       { perSqft: 0.40, min: 180, label: 'Fence · soft wash' },
  commercial:  { perSqft: 0.32, min: 450, label: 'Commercial property · pressure wash' },
  unknown:     { perSqft: 0.45, min: 250, label: 'General exterior cleaning' }
};

const ANALYSIS_PROMPT = `You are estimating a power-washing job from a customer's photo. Analyze the image and respond with ONLY a single JSON object (no markdown fences, no prose). Schema:
{
  "surfaceType": one of: "driveway"|"sidewalk"|"house_siding"|"roof"|"gutter"|"window"|"deck_wood"|"patio_stone"|"fence"|"commercial"|"unknown",
  "estimatedSqft": integer (your best estimate of cleanable square footage visible in the photo),
  "stainLevel": one of: "light"|"moderate"|"heavy",
  "recommendedMethod": one of: "soft_wash"|"pressure_wash"|"both",
  "summary": short single-sentence description of what is in the photo and what cleaning is needed,
  "confidence": one of: "low"|"medium"|"high"
}
Be conservative on sqft. Output ONLY the JSON.`;

function calcQuote(analysis) {
  const surface = analysis.surfaceType in PRICING ? analysis.surfaceType : 'unknown';
  const cfg = PRICING[surface];
  const sqft = Math.max(50, Math.min(20000, parseInt(analysis.estimatedSqft || 0, 10) || 800));
  const stainMul = analysis.stainLevel === 'heavy' ? 1.40 : analysis.stainLevel === 'moderate' ? 1.18 : 1.00;
  const base = Math.max(cfg.min, sqft * cfg.perSqft * stainMul);
  const overhead = 50;
  const subtotal = base + overhead;
  const priceLow  = Math.round(subtotal * 0.90 / 5) * 5;
  const priceHigh = Math.round(subtotal * 1.18 / 5) * 5;
  return {
    priceLow, priceHigh, sqft,
    surfaceType: surface,
    surfaceLabel: cfg.label,
    stainLevel: analysis.stainLevel || 'moderate',
    recommendedMethod: analysis.recommendedMethod || 'pressure_wash',
    summary: analysis.summary || 'Exterior cleaning',
    confidence: analysis.confidence || 'medium'
  };
}

function extractJson(txt) {
  if (!txt) return null;
  let cleaned = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch (err) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured', detail: 'GEMINI_API_KEY missing' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  const { photo, email, phone, address, service } = body || {};

  if (!photo || typeof photo !== 'string' || !photo.startsWith('data:image/')) {
    return res.status(400).json({ error: 'photo must be a base64 data URI (data:image/...)' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'valid email is required' });
  }

  const m = photo.match(/^data:(image\/[a-z+.-]+);base64,(.*)$/i);
  if (!m) return res.status(400).json({ error: 'malformed photo data URI' });
  const mimeType = m[1];
  const base64 = m[2];

  const lead = {
    ts: new Date().toISOString(),
    email, phone: phone || null, address: address || null, service: service || null,
    sessionId: req.headers['x-vercel-id'] || null
  };
  try { console.log('[bnr-lead]', JSON.stringify(lead)); } catch (e) {}

  let analysis;
  try {
    const geminiBody = {
      contents: [{
        role: 'user',
        parts: [
          { text: ANALYSIS_PROMPT },
          { inlineData: { mimeType, data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400, responseMimeType: 'application/json' }
    };
    const r = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });
    if (!r.ok) {
      const errTxt = await r.text();
      console.error('[bnr-gemini]', r.status, errTxt.slice(0, 500));
      return res.status(502).json({ error: 'AI analysis temporarily unavailable', code: r.status });
    }
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    analysis = extractJson(txt) || {};
  } catch (e) {
    console.error('[bnr-gemini-fetch-fail]', e?.message);
    return res.status(502).json({ error: 'AI analysis failed', detail: String(e?.message || e) });
  }

  const quote = calcQuote(analysis);
  return res.status(200).json({
    ok: true,
    quote,
    lead: { received: true, email },
    requestId: req.headers['x-vercel-id'] || null
  });
}
