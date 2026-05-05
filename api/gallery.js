// Vercel Serverless Function: Dynamic gallery from Cloudinary tag
// GET /api/gallery — returns image list for the gallery page.
//
// Strategy:
//  1) If CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET are set in Vercel env,
//     query Cloudinary's authenticated Resources API by tag.
//  2) Otherwise (or if Cloudinary call fails), fall back to the static
//     gallery-images.json shipped with the deploy.

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const dynamicItems = await fetchFromCloudinary();
    if (dynamicItems && dynamicItems.length > 0) {
      return res.status(200).json({
        ok: true,
        source: 'cloudinary-live',
        cloudName: CLOUD_NAME,
        count: dynamicItems.length,
        items: dynamicItems
      });
    }
  } catch (e) {
    console.warn('[bnr-gallery] Live fetch error:', e?.message);
  }
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'gallery-images.json');
    const raw = await fs.readFile(file, 'utf8');
    const json = JSON.parse(raw);
    return res.status(200).json({
      ok: true,
      source: 'static-fallback',
      cloudName: json.cloudName || CLOUD_NAME,
      count: json.items?.length || 0,
      items: json.items || []
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No gallery source available', detail: e?.message });
  }
}
