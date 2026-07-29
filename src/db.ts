import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { type Ad, type AdFormat } from './ads';

const VIEWABLE_THRESHOLD_MS = 1000;
const REVENUE_SHARE = 0.5;
const WEIGHT_FLOOR = 0.1; // baseline weight so a low/zero-CPM ad still gets some exposure

// --- serve-token anti-fraud settings ---------------------------------------
// Every served ad gets a single-use token; impressions must return it. Caps are
// per install and sit far above real human usage (7s rotation ~= 8/min in one
// tab), so they only ever throttle scripts. Overridable via env for tuning.
const SERVE_CAP_PER_MIN = Number(process.env.SERVE_CAP_PER_MIN ?? 60);
const SERVE_CAP_PER_DAY = Number(process.env.SERVE_CAP_PER_DAY ?? 1000);
const TOKEN_TTL_MS = 30 * 60 * 1000;   // a token is claimable for 30 minutes
const ELAPSED_SLACK_MS = 2000;         // clock slack for the plausibility check

// Thrown when an impression's token is missing/used/expired/mismatched, or the
// claimed viewable time is physically impossible. index.ts maps this to a 400.
export class InvalidServeTokenError extends Error {}

// Minimum cash-out (USD). Env-overridable so you can test with tiny balances.
const MIN_CASHOUT_USD = Number(process.env.MIN_CASHOUT_USD ?? 5);
// Minimum gap between payout requests from one install (blocks double-submit races).
const CLAIM_COOLDOWN_MS = Number(process.env.CLAIM_COOLDOWN_MS ?? 30_000);

// Thrown when a payout claim is invalid (below minimum, duplicate pending, ...).
// index.ts maps this to a 400 with the message shown to the user.
export class PayoutClaimError extends Error {}

const connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/waitandearn';
const useSsl = !!process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : undefined });

export async function init(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, format TEXT NOT NULL, headline TEXT NOT NULL, body TEXT NOT NULL,
      image_url TEXT, click_url TEXT NOT NULL,
      impressions_purchased INTEGER NOT NULL, impressions_served INTEGER NOT NULL DEFAULT 0,
      cpm DOUBLE PRECISION NOT NULL DEFAULT 0,
      archived BOOLEAN NOT NULL DEFAULT false
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS impressions (
      id BIGSERIAL PRIMARY KEY, ad_id TEXT NOT NULL, site TEXT NOT NULL,
      viewable_ms INTEGER NOT NULL, install_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
  await pool.query(`ALTER TABLE impressions ADD COLUMN IF NOT EXISTS install_id TEXT`);
  await pool.query(`ALTER TABLE impressions ADD COLUMN IF NOT EXISTS cpm_at_view DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpm DOUBLE PRECISION NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE campaigns DROP COLUMN IF EXISTS is_house`); // house/backfill tier removed July 2026
  await pool.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_impressions_ad_id ON impressions(ad_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_impressions_install ON impressions(install_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS advertiser_inquiries (
      id BIGSERIAL PRIMARY KEY,
      company TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);

  // One-time backfill for impressions recorded before the snapshot column
  // existed: price them at their campaign's CURRENT rate (the best available
  // approximation); orphans whose campaign is gone price at 0. Runs as a
  // no-op on every boot after the first.
  const unpriced = await pool.query(`SELECT DISTINCT ad_id FROM impressions WHERE cpm_at_view IS NULL`);
  for (const r of unpriced.rows) {
    const camp = await pool.query(`SELECT cpm FROM campaigns WHERE id = $1`, [r.ad_id]);
    const rate = (camp.rowCount ?? 0) > 0 ? Number(camp.rows[0].cpm) : 0;
    await pool.query(`UPDATE impressions SET cpm_at_view = $1 WHERE ad_id = $2 AND cpm_at_view IS NULL`, [rate, r.ad_id]);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_serves (
      token TEXT PRIMARY KEY, ad_id TEXT NOT NULL, install_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), used BOOLEAN NOT NULL DEFAULT false
    );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_serves_install_time ON ad_serves(install_id, created_at)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payout_claims (
      id BIGSERIAL PRIMARY KEY, install_id TEXT NOT NULL,
      destination_type TEXT NOT NULL, destination TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
    );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_claims_install ON payout_claims(install_id)`);

  // No house ads, period: with zero eligible campaigns, /api/ad returns 204 and
  // the overlay shows its out-of-ads message instead — earnings only ever come
  // from real, advertiser-funded campaigns.
}

// Weighted random by CPM (with a floor). Higher-paying ads win proportionally
// more often, but every candidate keeps a nonzero chance and the total weight
// is always > 0 (so this never divides by zero or starves a $0 ad completely).
function weightedPick<T extends { cpm: number | string }>(items: T[]): T {
  const weights = items.map((it) => Number(it.cpm) + WEIGHT_FLOOR);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// Issue a single-use token tying this ad serve to this install. Returns null
// when the install is over its rate cap (the caller then serves no ad).
export async function issueServeToken(adId: string, installId: string): Promise<string | null> {
  // Opportunistic cleanup of long-expired tokens (~2% of serves pay this cost).
  if (Math.random() < 0.02) {
    await pool.query(`DELETE FROM ad_serves WHERE created_at < $1`, [new Date(Date.now() - 2 * 24 * 3600 * 1000)]);
  }
  const perMin = await pool.query(`SELECT COUNT(*)::int AS c FROM ad_serves WHERE install_id = $1 AND created_at > $2`, [installId, new Date(Date.now() - 60_000)]);
  if (Number(perMin.rows[0].c) >= SERVE_CAP_PER_MIN) return null;
  const perDay = await pool.query(`SELECT COUNT(*)::int AS c FROM ad_serves WHERE install_id = $1 AND created_at > $2`, [installId, new Date(Date.now() - 24 * 3600 * 1000)]);
  if (Number(perDay.rows[0].c) >= SERVE_CAP_PER_DAY) return null;
  const token = randomUUID();
  await pool.query(`INSERT INTO ad_serves (token, ad_id, install_id) VALUES ($1,$2,$3)`, [token, adId, installId]);
  return token;
}

export async function pickEligibleAd(format?: AdFormat, excludeId?: string): Promise<Ad | null> {
  const { rows } = await pool.query(
    `SELECT id, format, headline, body, image_url, click_url, cpm
     FROM campaigns
     WHERE impressions_served < impressions_purchased AND archived = false AND ($1::text IS NULL OR format = $1)`,
    [format ?? null],
  );
  if (rows.length === 0) return null;

  // Don't repeat the last-shown ad unless it's the only candidate.
  let candidates = excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
  if (candidates.length === 0) candidates = rows;

  const row = weightedPick(candidates);
  const cpm = Number(row.cpm);
  return {
    id: row.id, format: row.format, headline: row.headline, body: row.body,
    imageUrl: row.image_url ?? undefined, clickUrl: row.click_url,
    valuePerView: (cpm / 1000) * REVENUE_SHARE,
  };
}

export interface NewImpression { adId: string; site: string; viewableMs: number; installId: string; serveToken: string; }
export async function recordImpression(imp: NewImpression): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Consume the serve token atomically: it must exist, be unused, be young
    // enough, and match BOTH the ad and the install. Marking it used in the
    // same statement makes replay impossible (a second claim finds no row).
    const tok = await client.query(
      `UPDATE ad_serves SET used = true
       WHERE token = $1 AND used = false AND ad_id = $2 AND install_id = $3 AND created_at > $4
       RETURNING created_at`,
      [imp.serveToken, imp.adId, imp.installId, new Date(Date.now() - TOKEN_TTL_MS)],
    );
    if ((tok.rowCount ?? 0) === 0) {
      throw new InvalidServeTokenError('unknown, used, expired, or mismatched serve token');
    }
    // Physical plausibility: you cannot have viewed the ad for longer than the
    // time that has passed since we served it.
    const elapsedMs = Date.now() - new Date(tok.rows[0].created_at).getTime();
    if (imp.viewableMs > elapsedMs + ELAPSED_SLACK_MS) {
      throw new InvalidServeTokenError('claimed viewable time exceeds time since serve');
    }

    // Snapshot the campaign's rate at billing time: editing a CPM later now
    // reprices FUTURE views only. A campaign deleted between serve and event
    // prices this view at 0 (no funding behind it).
    const campRes = await client.query(`SELECT cpm FROM campaigns WHERE id = $1`, [imp.adId]);
    const cpmAtView = (campRes.rowCount ?? 0) > 0 ? Number(campRes.rows[0].cpm) : 0;

    await client.query(`INSERT INTO impressions (ad_id, site, viewable_ms, install_id, cpm_at_view) VALUES ($1,$2,$3,$4,$5)`, [imp.adId, imp.site, Math.round(imp.viewableMs), imp.installId, cpmAtView]);
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

export async function listCampaigns() {
  const { rows } = await pool.query(
    `SELECT c.id, c.format, c.headline, c.body, c.image_url AS "imageUrl", c.click_url AS "clickUrl",
            c.impressions_purchased AS "impressionsPurchased", c.impressions_served AS "impressionsServed", c.cpm, c.archived AS "archived",
            COUNT(DISTINCT CASE WHEN i.viewable_ms >= $1 THEN i.install_id END)::int AS reach
     FROM campaigns c LEFT JOIN impressions i ON i.ad_id = c.id
     GROUP BY c.id, c.format, c.headline, c.body, c.image_url, c.click_url, c.impressions_purchased, c.impressions_served, c.cpm, c.archived
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

// Soft-stop / re-activate a campaign WITHOUT touching its impression history —
// unlike delete, which erases the rows users earned against.
export async function setArchived(id: string, archived: boolean): Promise<boolean> {
  const res = await pool.query(`UPDATE campaigns SET archived = $1 WHERE id = $2`, [archived, id]);
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
  // Earnings come from the SNAPSHOTTED rate on each impression, not the
  // campaign's current rate — immune to later CPM edits, and self-contained
  // (no join), so the ledger even survives campaign deletion.
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS impressions, COALESCE(SUM(cpm_at_view), 0) AS "cpmSum"
     FROM impressions
     WHERE install_id = $1 AND viewable_ms >= $2`,
    [installId, VIEWABLE_THRESHOLD_MS],
  );
  const row = rows[0];
  const cpmSum = Number(row.cpmSum);
  return { impressions: Number(row.impressions), estimatedEarnings: (cpmSum / 1000) * REVENUE_SHARE };
}

// ---------------- payouts ----------------
// Balance model: available = earned (from the impressions ledger) minus every
// claim that is pending or paid. Rejecting a claim therefore frees its amount
// automatically — nothing to "refund", the subtraction just goes away.

export async function getPayoutSummary(installId: string) {
  const e = await getEarnings(installId);
  const claimedRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS s FROM payout_claims WHERE install_id = $1 AND status <> 'rejected'`, [installId]);
  const claimedTotal = Number(claimedRes.rows[0].s);
  const availableBalance = Math.max(0, e.estimatedEarnings - claimedTotal);
  const paidRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS s FROM payout_claims WHERE install_id = $1 AND status = 'paid'`, [installId]);
  const pendRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*)::int AS c FROM payout_claims WHERE install_id = $1 AND status = 'pending'`, [installId]);
  // Recent claim history for the popup's History tab (capped so the payload stays small).
  const claimsRes = await pool.query(
    `SELECT id, destination_type AS "destinationType", destination, amount, status,
            requested_at AS "requestedAt", resolved_at AS "resolvedAt"
     FROM payout_claims WHERE install_id = $1 ORDER BY requested_at DESC LIMIT 20`,
    [installId],
  );
  return { ...e, claimedTotal, availableBalance, paidTotal: Number(paidRes.rows[0].s), pendingTotal: Number(pendRes.rows[0].s), pendingCount: Number(pendRes.rows[0].c), minCashout: MIN_CASHOUT_USD, claims: claimsRes.rows };
}

export async function createPayoutClaim(installId: string, destinationType: 'paypal' | 'crypto', destination: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Multiple pending payouts are allowed: each new claim takes only the balance
    // accrued since the previous one (available already subtracts prior claims).
    // The short cooldown blocks double-click / race duplicates; manual review of
    // every claim remains the final backstop.
    const recent = await client.query(`SELECT id FROM payout_claims WHERE install_id = $1 AND requested_at > $2`, [installId, new Date(Date.now() - CLAIM_COOLDOWN_MS)]);
    if ((recent.rowCount ?? 0) > 0) throw new PayoutClaimError('please wait a moment between payout requests');
    const earnRes = await client.query(
      `SELECT COALESCE(SUM(cpm_at_view), 0) AS "cpmSum" FROM impressions
       WHERE install_id = $1 AND viewable_ms >= $2`,
      [installId, VIEWABLE_THRESHOLD_MS],
    );
    const earned = (Number(earnRes.rows[0].cpmSum) / 1000) * REVENUE_SHARE;
    const claimedRes = await client.query(`SELECT COALESCE(SUM(amount), 0) AS s FROM payout_claims WHERE install_id = $1 AND status <> 'rejected'`, [installId]);
    const available = Math.max(0, earned - Number(claimedRes.rows[0].s));
    if (available < MIN_CASHOUT_USD) throw new PayoutClaimError(`balance $${available.toFixed(4)} is below the $${MIN_CASHOUT_USD} minimum`);
    const ins = await client.query(
      `INSERT INTO payout_claims (install_id, destination_type, destination, amount) VALUES ($1,$2,$3,$4)
       RETURNING id, amount, requested_at AS "requestedAt"`,
      [installId, destinationType, destination, available],
    );
    await client.query('COMMIT');
    return ins.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Admin view. The shared-destination count is the sybil signal: one PayPal
// email or wallet behind many installs is one person running many profiles.
export async function listClaims() {
  const { rows } = await pool.query(
    `SELECT id, install_id AS "installId", destination_type AS "destinationType", destination, amount, status,
            requested_at AS "requestedAt", resolved_at AS "resolvedAt"
     FROM payout_claims ORDER BY requested_at DESC`,
  );
  const byDest = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = String(r.destination).toLowerCase();
    if (!byDest.has(k)) byDest.set(k, new Set());
    byDest.get(k)!.add(String(r.installId));
  }
  return rows.map((r) => ({ ...r, installsSharingDestination: byDest.get(String(r.destination).toLowerCase())!.size }));
}

export async function resolveClaim(id: number, status: 'paid' | 'rejected'): Promise<boolean> {
  const res = await pool.query(`UPDATE payout_claims SET status = $1, resolved_at = now() WHERE id = $2 AND status = 'pending'`, [status, id]);
  return (res.rowCount ?? 0) > 0;
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


// ── Advertiser inquiries (the /advertise booking form) ──────────────────────
export interface AdvertiserInquiry {
  company: string; website: string; email: string; tier: string; notes: string;
}

export async function createAdvertiserInquiry(i: AdvertiserInquiry) {
  const { rows } = await pool.query(
    `INSERT INTO advertiser_inquiries (company, website, email, tier, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [i.company, i.website, i.email, i.tier, i.notes],
  );
  return rows[0];
}

export async function listAdvertiserInquiries(limit = 200) {
  const { rows } = await pool.query(
    `SELECT * FROM advertiser_inquiries ORDER BY id DESC LIMIT $1`, [limit],
  );
  return rows;
}
