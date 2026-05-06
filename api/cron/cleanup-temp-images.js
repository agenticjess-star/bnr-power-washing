// Vercel Cron: cleanup user-uploaded photos and AI-generated after-images > 24h old.
// Schedule: daily at 03:00 UTC (configured in vercel.json)
//
// Auth model:
//  - Vercel cron requests carry Authorization: Bearer ${CRON_SECRET} when CRON_SECRET is set.
//  - If CRON_SECRET is not set, this endpoint is open (still safe — the operation only
//    deletes blobs older than the TTL and is idempotent). Set CRON_SECRET to lock it down.

import { list, del } from '@vercel/blob';

export const config = { maxDuration: 60 };

const TTL_HOURS = 24;
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;
const PREFIXES = ['user-uploads/', 'after-images/'];

export default async function handler(req, res) {
  // Method gate
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth gate (only enforced if CRON_SECRET is configured)
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (got !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN missing' });
  }

  const cutoff = Date.now() - TTL_MS;
  const stats = { ttlHours: TTL_HOURS, cutoffIso: new Date(cutoff).toISOString(), scanned: 0, deleted: 0, kept: 0, errors: [] };

  try {
    for (const prefix of PREFIXES) {
      let cursor;
      do {
        const page = await list({ prefix, cursor });
        const blobs = page.blobs || [];
        stats.scanned += blobs.length;
        const old = blobs.filter(b => new Date(b.uploadedAt).getTime() < cutoff);
        const young = blobs.length - old.length;
        stats.kept += young;
        if (old.length > 0) {
          // del() accepts an array of URLs and removes in a single call
          await del(old.map(b => b.url));
          stats.deleted += old.length;
        }
        cursor = page.cursor;
      } while (cursor);
    }
  } catch (e) {
    stats.errors.push(String(e?.message || e));
    console.error('[bnr-cleanup-fail]', e);
    return res.status(500).json({ ok: false, ...stats });
  }

  console.log('[bnr-cleanup]', JSON.stringify(stats));
  return res.status(200).json({ ok: true, ...stats });
}
