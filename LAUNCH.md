# LAUNCH.md — taking adwait.io live

The stack at launch:

- **Node/Express server** (`src/index.ts`) — serves the landing pages (`/`, `/privacy`, `/payment-support`, `/admin`) and the ad/earnings/payout API. Deployed on Render (or any Node host).
- **Postgres** — campaigns, impressions, payout claims (`DATABASE_URL`).
- **Cloudflare R2** — object storage for uploaded ad creatives, via the S3-compatible API already wired in `src/storage.ts`. Images are uploaded once by the admin and then served publicly straight from R2 (the server hands out `S3_PUBLIC_URL`-based URLs), so ad-image bandwidth never touches the Node host.

The landing page itself is dependency-free (no webfonts, no JS, no external assets), so nothing on the marketing page depends on R2 — R2 carries only campaign creatives.

---

## 1. Cloudflare R2 setup

1. **Create the bucket** — Cloudflare dashboard → R2 → Create bucket (e.g. `adwait-ads`). Location: automatic.
2. **Enable public access for the bucket.** Preferred: connect a **custom domain** (e.g. `cdn.adwait.io`) under the bucket's Settings → Public access → Custom domains. The `*.r2.dev` public URL works for testing but is rate-limited and not meant for production traffic.
3. **Create an API token** — R2 → Manage R2 API Tokens → Create. Permission: **Object Read & Write**, scoped to this one bucket. Copy the Access Key ID and Secret Access Key.
4. Note your **account ID** (dashboard URL or R2 overview). The S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

No CORS configuration is needed: creatives are loaded as plain `<img>` requests from the extension's ad card, which CORS does not gate.

## 2. Environment variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Turns on the boot-time guards below |
| `PORT` | (host default) | Render sets this automatically |
| `DATABASE_URL` | `postgres://…` | Non-localhost URLs automatically use SSL |
| `ADMIN_TOKEN` | long random secret | **Required in production** — the server refuses to start on the dev default. Generate: `openssl rand -hex 32` |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | R2's S3-compatible endpoint |
| `S3_BUCKET` | `adwait-ads` | The bucket from step 1 |
| `S3_REGION` | `auto` | R2 uses `auto`; this is already the code default |
| `S3_ACCESS_KEY_ID` | from the API token | |
| `S3_SECRET_ACCESS_KEY` | from the API token | |
| `S3_PUBLIC_URL` | `https://cdn.adwait.io` | The bucket's public base URL (custom domain, or `https://<bucket>.r2.dev` for testing). No trailing slash needed — the server strips it |

Optional tuning (sane defaults in code): `SERVE_CAP_PER_MIN`, `SERVE_CAP_PER_DAY`, `MIN_CASHOUT_USD`, `CLAIM_COOLDOWN_MS`.

**Boot-time guards** (added for launch): with `NODE_ENV=production` the server exits immediately if `ADMIN_TOKEN` is still the dev default or if any `S3_*` storage variable is missing — a misconfigured deploy fails loudly at boot instead of 500ing at the first upload.

## 3. Pre-flight checklist

- [ ] R2 bucket created, public custom domain attached, API token scoped to the bucket
- [ ] All env vars above set on the host; deploy boots clean (check logs for `object storage configured`)
- [ ] `GET /api/health` returns `{"ok":true}`
- [ ] Admin smoke test: open `/admin`, create an image campaign — the stored image URL should point at `S3_PUBLIC_URL` and load with `cache-control: public, max-age=31536000, immutable`
- [ ] `GET /api/ad?format=image&installId=test-install` returns the campaign with a `serveToken`
- [ ] Swap the Chrome Web Store placeholder URL in `public/index.html` (two spots, marked with `<!-- Swap in the live Chrome Web Store listing URL at publish. -->`) once the listing is live
- [ ] `/privacy` and `/payment-support` load (linked from the footer and required by the Web Store listing)

## 4. Rollback notes

Creatives in R2 are immutable and content-addressed by timestamp+uuid key — rolling the server back never invalidates stored image URLs. The database schema is applied idempotently at boot (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`), so older server builds tolerate the newer schema.
