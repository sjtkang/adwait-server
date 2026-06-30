import { Pool } from 'pg';
import { houseAds, type Ad, type AdFormat } from './ads';

const VIEWABLE_THRESHOLD_MS = 1000;
const REVENUE_SHARE = 0.5;

// Connection pool. Your host provides DATABASE_URL (Render/Railway/Neon/etc.).
// The pool manages many concurrent connections, which is the whole point of
// moving off SQLite — Postgres handles simultaneous writes properly.
const connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/waitandearn';
const useSsl = !!process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : undefined });

// Run ONCE at startup: create tables, add any missing columns, seed house ads.
// (Postgres supports IF NOT EXISTS for columns, so migrations are simpler here.)
export async function init(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, format TEXT NOT NULL, headline TEXT NOT NULL, body TEXT NOT NULL,
      image_url TEXT, click_url TEXT NOT NULL,
      impressions_purchased INTEGER NOT NULL, impressions_served INTEGER NOT NULL DEFAULT 0,
      cpm DOUBLE PRECISION NOT NULL DEFAULT 0
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS impressions (
      id BIGSERIAL PRIMARY KEY, ad_id TEXT NOT NULL, site TEXT NOT NULL,
      viewable_ms INTEGER NOT NULL, install_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
  await pool.query(`ALTER TABLE impressions ADD COLUMN IF NOT EXISTS install_id TEXT`);
  await pool.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpm DOUBLE PRECISION NOT NULL DEFAULT 0`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_impressions_ad_id ON impressions(ad_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_impressions_install ON impressions(install_id)`);

  for (const ad of houseAds) {
    await pool.query(
      `INSERT INTO campaigns (id, format, headline, body, image_url, click_url, impressions_purchased, cpm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [ad.id, ad.format, ad.headline, ad.body, ad.imageUrl ?? null, ad.clickUrl, ad.impressionsPurchased, ad.cpm],
    );
    await pool.query(`UPDATE campaigns SET cpm = $1 WHERE id = $2`, [ad.cpm, ad.id]);
  }
}

export async function pickEligibleAd(format?: AdFormat, excludeId?: string): Promise<Ad | null> {
  const { rows } = await pool.query(
    `SELECT id, format, headline, body, image_url, click_url
     FROM campaigns
     WHERE impressions_served < impressions_purchased AND ($1::text IS NULL OR format = $1)`,
    [format ?? null],
  );
  if (rows.length === 0) return null;
  const preferred = excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
  const choices = preferred.length > 0 ? preferred : rows;
  const row = choices[Math.floor(Math.random() * choices.length)];
  return { id: row.id, format: row.format, headline: row.headline, body: row.body, imageUrl: row.image_url ?? undefined, clickUrl: row.click_url };
}

export interface NewImpression { adId: string; site: string; viewableMs: number; installId: string; }
export async function recordImpression(imp: NewImpression): Promise<void> {
  const client = await pool.connect(); // a transaction needs one dedicated connection
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO impressions (ad_id, site, viewable_ms, install_id) VALUES ($1,$2,$3,$4)`, [imp.adId, imp.site, imp.viewableMs, imp.installId]);
    if (imp.viewableMs >= VIEWABLE_THRESHOLD_MS) {
      await client.query(`UPDATE campaigns SET impressions_served = impressions_served + 1 WHERE id = $1`, [imp.adId]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export interface NewCampaign { id: string; format: AdFormat; headline: string; body: string; imageUrl?: string; clickUrl: string; impressionsPurchased: number; cpm: number; }
export async function createCampaign(c: NewCampaign): Promise<void> {
  await pool.query(
    `INSERT INTO campaigns (id, format, headline, body, image_url, click_url, impressions_purchased, cpm)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [c.id, c.format, c.headline, c.body, c.imageUrl ?? null, c.clickUrl, c.impressionsPurchased, c.cpm],
  );
}

// Note the quoted aliases: Postgres lowercases unquoted identifiers, so we quote
// them to keep camelCase keys the admin page expects. ::int avoids bigint-as-string.
export async function listCampaigns() {
  const { rows } = await pool.query(
    `SELECT c.id, c.format, c.headline, c.body, c.image_url AS "imageUrl", c.click_url AS "clickUrl",
            c.impressions_purchased AS "impressionsPurchased", c.impressions_served AS "impressionsServed", c.cpm,
            COUNT(DISTINCT CASE WHEN i.viewable_ms >= $1 THEN i.install_id END)::int AS reach
     FROM campaigns c LEFT JOIN impressions i ON i.ad_id = c.id
     GROUP BY c.id, c.format, c.headline, c.body, c.image_url, c.click_url, c.impressions_purchased, c.impressions_served, c.cpm
     ORDER BY c.id`,
    [VIEWABLE_THRESHOLD_MS],
  );
  return rows;
}

const UPDATE_WITH_IMAGE = `UPDATE campaigns SET headline=$1, body=$2, click_url=$3, cpm=$4, image_url=$5 WHERE id=$6`;
const UPDATE_NO_IMAGE = `UPDATE campaigns SET headline=$1, body=$2, click_url=$3, cpm=$4 WHERE id=$5`;
export async function updateCampaign(id: string, f: { headline: string; body: string; clickUrl: string; cpm: number; imageUrl?: string }): Promise<boolean> {
  const res = f.imageUrl !== undefined
    ? await pool.query(UPDATE_WITH_IMAGE, [f.headline, f.body, f.clickUrl, f.cpm, f.imageUrl, id])
    : await pool.query(UPDATE_NO_IMAGE, [f.headline, f.body, f.clickUrl, f.cpm, id]);
  return (res.rowCount ?? 0) > 0;
}

export async function addPurchasedImpressions(adId: string, additional: number): Promise<boolean> {
  const res = await pool.query(`UPDATE campaigns SET impressions_purchased = impressions_purchased + $1 WHERE id = $2`, [additional, adId]);
  return (res.rowCount ?? 0) > 0;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM impressions WHERE ad_id = $1`, [id]);
    const res = await client.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getEarnings(installId: string) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS impressions, COALESCE(SUM(c.cpm), 0) AS "cpmSum"
     FROM impressions i JOIN campaigns c ON c.id = i.ad_id
     WHERE i.install_id = $1 AND i.viewable_ms >= $2`,
    [installId, VIEWABLE_THRESHOLD_MS],
  );
  const row = rows[0];
  const cpmSum = Number(row.cpmSum);
  return { impressions: Number(row.impressions), estimatedEarnings: (cpmSum / 1000) * REVENUE_SHARE };
}

export async function getStats() {
  const totalsRes = await pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(viewable_ms),0) AS "totalViewableMs" FROM impressions`);
  const totals = totalsRes.rows[0];
  const campRes = await pool.query(
    `SELECT c.id, c.format, c.impressions_served AS served, c.impressions_purchased AS purchased, c.cpm,
            COUNT(DISTINCT CASE WHEN i.viewable_ms >= $1 THEN i.install_id END)::int AS reach
     FROM campaigns c LEFT JOIN impressions i ON i.ad_id = c.id
     GROUP BY c.id, c.format, c.impressions_served, c.impressions_purchased, c.cpm
     ORDER BY c.id`,
    [VIEWABLE_THRESHOLD_MS],
  );
  const campaigns = campRes.rows.map((c) => ({ ...c, frequency: c.reach > 0 ? Math.round((c.served / c.reach) * 10) / 10 : 0 }));
  return { impressions: Number(totals.count), totalViewableSeconds: Math.round(Number(totals.totalViewableMs) / 1000), campaigns };
}
