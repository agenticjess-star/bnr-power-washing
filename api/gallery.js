// Vercel Serverless Function: Gallery — merges static-fallback hardcoded items with
// Cloudinary live items so the gallery is ALWAYS populated even if Cloudinary auth fails.
// GET /api/gallery
//
// Returns: { ok, source: 'merged'|'static-only'|'cloudinary-only', cloudName, count, items: [...] }
//
// Item shape: { id, v, ext, ar, category, loc, tag, size }
// Frontend builds Cloudinary URLs from these fields with f_auto for HEIC→browser conversion.

export const config = { maxDuration: 10 };

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dc5ui9p2a';
const TAG = process.env.CLOUDINARY_GALLERY_TAG || 'website';

const CATEGORY_RULES = [
  { keywords: ['house', 'siding', 'softwash', 'soft-wash'], category: 'house', tag: 'House Washing' },
  { keywords: ['drive', 'concrete', 'sidewalk'], category: 'driveway', tag: 'Driveway' },
  { keywords: ['roof', 'gutter', 'shingle'], category: 'roof', tag: 'Roof & Gutter' },
  { keywords: ['window', 'glass'], category: 'window', tag: 'Window' },
  { keywords: ['commercial', 'storefront', 'parking', 'restaurant', 'retail'], category: 'commercial', tag: 'Commercial' },
  { keywords: ['patio', 'deck', 'fence', 'wood'], category: 'patio', tag: 'Patio & Deck' }
];

function inferCategory(tags = [], publicId = '') {
  const haystack = [...tags, publicId].join(' ').toLowerCase();
  for (const r of CATEGORY_RULES) {
    if (r.keywords.some(k => haystack.includes(k))) return { category: r.category, tag: r.tag };
  }
  return { category: 'house', tag: 'Recent Work' };
}

function inferSize(width, height) {
  const ar = width / height;
  if (ar > 1.6) return 'wide';
  if (ar < 0.8) return 'tall';
  return 'med';
}

async function fetchFromCloudinary() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) return null;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/tags/${encodeURIComponent(TAG)}?max_results=200`;
  const r = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!r.ok) {
    console.warn('[bnr-gallery] Cloudinary fetch failed', r.status);
    return null;
  }
  const data = await r.json();
  if (!Array.isArray(data?.resources)) return null;
  return data.resources.map((res) => {
    const cat = res.tags?.find(t => CATEGORY_RULES.some(r => r.category === t)) || null;
    const inferred = cat ? CATEGORY_RULES.find(r => r.category === cat) : inferCategory(res.tags, res.public_id);
    return {
      id: res.public_id,
      v: res.version,
      ext: res.format,
      ar: res.width / res.height,
      category: inferred.category,
      loc: res.context?.custom?.loc || 'Houston',
      tag: inferred.tag,
      size: inferSize(res.width, res.height)
    };
  });
}

async function readStaticFallback() {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'gallery-images.json');
    const raw = await fs.readFile(file, 'utf8');
    const json = JSON.parse(raw);
    return json.items || [];
  } catch (e) {
    console.warn('[bnr-gallery] static fallback read failed', e?.message);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Run both sources in parallel — never block on Cloudinary alone.
  const [cloudinaryItems, staticItems] = await Promise.all([
    fetchFromCloudinary().catch(e => { console.warn('[bnr-gallery] cloudinary error', e?.message); return null; }),
    readStaticFallback()
  ]);

  // Merge: static (hardcoded) items FIRST so they always show, then cloudinary live, dedupe by id.
  const seen = new Set();
  const merged = [];
  for (const item of [...staticItems, ...(cloudinaryItems || [])]) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  let source = 'static-only';
  if (cloudinaryItems && cloudinaryItems.length > 0 && staticItems.length > 0) source = 'merged';
  else if (cloudinaryItems && cloudinaryItems.length > 0) source = 'cloudinary-only';

  if (merged.length === 0) {
    return res.status(500).json({
      ok: false,
      error: 'No gallery source available',
      detail: `cloudinary=${cloudinaryItems?.length ?? 'null'} static=${staticItems.length}`
    });
  }

  return res.status(200).json({
    ok: true,
    source,
    cloudName: CLOUD_NAME,
    count: merged.length,
    items: merged
  });
}
