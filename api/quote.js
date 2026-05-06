// Vercel Serverless Function: AI-powered instant quote with Vercel Blob persistence
// POST /api/quote with { photo: dataUri, email, phone, address, service, type }
// Returns { ok, quote, beforeImageUrl, afterImageUrl, afterImage (fallback), lead }
//
// Pipeline:
//  1. Receive base64 photo (frontend has already downscaled to ~150-300KB)
//  2. Upload original photo to Vercel Blob → beforeImageUrl
//  3. Gemini Vision analysis → quote calculation
//  4. Gemini Image Gen → generated "after" image (base64)
//  5. Upload generated image to Vercel Blob → afterImageUrl
//  6. Return URLs (small payload). Cleanup cron deletes anything >24h old.

import { put } from '@vercel/blob';

export const config = { maxDuration: 30 };

const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
// Image model fallback chain — newest first (likely separate quota), oldest stable last.
// Verified via /api/debug-gemini against the live API key 2026-05-05:
//   gemini-3.1-flash-image-preview ✓ available (Nano Banana 2)
//   gemini-3-pro-image-preview      ✓ available
//   nano-banana-pro-preview         ✓ available (alias)
//   gemini-2.5-flash-image          ✓ available (rate-limited on free tier)
const GEMINI_IMAGE_MODELS = (process.env.GEMINI_IMAGE_MODELS || 'gemini-3.1-flash-image-preview,gemini-3-pro-image-preview,nano-banana-pro-preview,gemini-2.5-flash-image').split(',').map(s => s.trim());
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

const ANALYSIS_PROMPT = `Estimate a power-washing job from this photo. Output ONLY a JSON object, no fences, no prose. Keep "summary" under 15 words. Schema:
{"surfaceType":"driveway"|"sidewalk"|"house_siding"|"roof"|"gutter"|"window"|"deck_wood"|"patio_stone"|"fence"|"commercial"|"unknown","estimatedSqft":<int>,"stainLevel":"light"|"moderate"|"heavy","recommendedMethod":"soft_wash"|"pressure_wash"|"both","summary":"<=15 words","confidence":"low"|"medium"|"high"}
Be conservative on sqft.`;

const AFTER_IMAGE_PROMPT = `Show this exact property after a professional power washing service: same composition, same camera angle, same vantage point, same architectural details, same surroundings. The only change: every cleanable surface is now sparkling clean and pristine — spotless concrete, vibrant clean siding, no algae, no mildew, no rust, no oil stains, fresh and bright. Photorealistic, natural daylight, professional real-estate photography quality. No text, no logos, no watermarks added. Preserve the original property exactly; only remove the dirt and stains.`;

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

function emailHash(email) {
  // 8-char non-PII hash; salt-free is fine for filename uniqueness only
  let h = 0;
  for (let i = 0; i < email.length; i++) h = ((h << 5) - h + email.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).padStart(6, '0').slice(0, 8);
}

async function uploadToBlob(prefix, base64, mimeType) {
  // prefix: 'user-uploads' | 'after-images'
  // Returns blob URL or null on failure (best-effort).
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('[bnr-blob] BLOB_READ_WRITE_TOKEN missing — skipping upload');
      return null;
    }
    const buffer = Buffer.from(base64, 'base64');
    const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${prefix}/${ts}-${rand}.${ext}`;
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false
    });
    return blob.url;
  } catch (e) {
    console.warn('[bnr-blob-fail]', prefix, e?.message);
    return null;
  }
}

async function generateAfterImage(apiKey, mimeType, base64, diag) {
  // Returns { mimeType, base64, modelUsed } or null. Pushes per-model attempt info to diag if provided.
  for (const model of GEMINI_IMAGE_MODELS) {
    const attempt = { model, status: null, ok: false, error: null, partKeys: null };
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { text: AFTER_IMAGE_PROMPT },
            { inlineData: { mimeType, data: base64 } }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE'] }
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      attempt.status = r.status;
      attempt.ok = r.ok;
      if (r.ok) {
        const data = await r.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        attempt.partKeys = parts.map(p => Object.keys(p));
        const part = parts.find(p => p.inlineData?.data);
        if (part) {
          console.log('[bnr-after-image] success', model);
          if (diag) diag.push(attempt);
          return {
            mimeType: part.inlineData.mimeType || 'image/png',
            base64: part.inlineData.data,
            modelUsed: model
          };
        }
        attempt.error = 'ok but no image part';
        console.warn('[bnr-after-image]', model, 'ok but no image part', JSON.stringify(parts).slice(0, 200));
        if (diag) diag.push(attempt);
        continue;
      }
      const errTxt = await r.text();
      attempt.error = errTxt.slice(0, 300);
      console.warn('[bnr-after-image]', model, r.status, errTxt.slice(0, 240));
      if (diag) diag.push(attempt);
      if (r.status === 404 || r.status === 400 || r.status === 429) continue;
      return null;
    } catch (e) {
      attempt.error = String(e?.message || e);
      console.warn('[bnr-after-image-fail]', model, e?.message);
      if (diag) diag.push(attempt);
      continue;
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Optional ?_diag=1 — when present, the response includes a _diag object with per-step internals.
  const wantDiag = (req.url || '').includes('_diag=1');
  const diag = wantDiag ? { textAttempts: [], imageAttempts: [] } : null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured', detail: 'GEMINI_API_KEY missing' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  const { photo, email, phone, address, service, type } = body || {};

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
    email,
    phone: phone || null,
    address: address || null,
    service: service || null,
    type: type || 'residential',
    sessionId: req.headers['x-vercel-id'] || null
  };
  try { console.log('[bnr-lead]', JSON.stringify(lead)); } catch (e) {}

  // Run before-image upload + analysis in parallel (independent).
  const [beforeImageUrl, analysis] = await Promise.all([
    uploadToBlob('user-uploads', base64, mimeType),
    (async () => {
      const attempt = { model: GEMINI_TEXT_MODEL, status: null, ok: false, error: null, rawText: null, finishReason: null };
      try {
        const geminiBody = {
          contents: [{
            role: 'user',
            parts: [
              { text: ANALYSIS_PROMPT },
              { inlineData: { mimeType, data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1500, responseMimeType: 'application/json' }
        };
        const r = await fetch(`${GEMINI_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody)
        });
        attempt.status = r.status;
        attempt.ok = r.ok;
        if (!r.ok) {
          const errTxt = await r.text();
          attempt.error = errTxt.slice(0, 400);
          console.error('[bnr-gemini]', r.status, errTxt.slice(0, 500));
          if (diag) diag.textAttempts.push(attempt);
          return null;
        }
        const data = await r.json();
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        attempt.rawText = txt.slice(0, 400);
        attempt.finishReason = data?.candidates?.[0]?.finishReason || null;
        attempt.promptFeedback = data?.promptFeedback || null;
        if (diag) diag.textAttempts.push(attempt);
        return extractJson(txt) || {};
      } catch (e) {
        attempt.error = String(e?.message || e);
        console.error('[bnr-gemini-fetch-fail]', e?.message);
        if (diag) diag.textAttempts.push(attempt);
        return null;
      }
    })()
  ]);

  if (!analysis) {
    return res.status(502).json({ error: 'AI analysis temporarily unavailable' });
  }

  const quote = calcQuote(analysis);

  // Generate after-image, then upload to Blob (sequential — image gen result feeds upload).
  const afterImageData = await generateAfterImage(apiKey, mimeType, base64, diag?.imageAttempts);
  let afterImageUrl = null;
  let afterImageInline = null; // fallback if blob upload fails
  if (afterImageData) {
    afterImageUrl = await uploadToBlob('after-images', afterImageData.base64, afterImageData.mimeType);
    if (!afterImageUrl) {
      // Blob upload failed — return inline data URI as fallback so frontend still renders something
      afterImageInline = `data:${afterImageData.mimeType};base64,${afterImageData.base64}`;
    }
  }

  const response = {
    ok: true,
    quote,
    beforeImageUrl,                      // user's uploaded photo (Blob CDN URL) or null
    afterImageUrl,                       // AI-generated cleaned version (Blob CDN URL) or null
    afterImage: afterImageInline,        // inline base64 fallback only if blob upload failed
    lead: { received: true, email },
    requestId: req.headers['x-vercel-id'] || null
  };
  if (diag) response._diag = diag;
  return res.status(200).json(response);
}
