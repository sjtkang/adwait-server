import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { init, pickEligibleAd, recordImpression, getStats, getEarnings, createCampaign, listCampaigns, updateCampaign, addPurchasedImpressions, deleteCampaign, setArchived, issueServeToken, InvalidServeTokenError, getPayoutSummary, createPayoutClaim, PayoutClaimError, listClaims, resolveClaim } from './db';
import { type AdFormat } from './ads';
import { uploadAdFile, isAllowedAdMime, storageConfigured, readImageSize, MAX_IMAGE_DIMENSION } from './storage';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'changeme-dev-token';

const app = express();
// No CORS on purpose. The extension's background fetches are exempt from CORS
// via host_permissions, and the admin page is same-origin — so browsers now
// refuse cross-site pages trying to POST events from visitors.
app.use(express.json());

// Files are held in MEMORY just long enough to forward them to object storage,
// then the buffer is discarded. Nothing touches the server's own disk — which
// is exactly what makes uploads survive Render restarts and redeploys.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB — plenty for a banner image
  fileFilter: (_req, file, cb) => { cb(null, isAllowedAdMime(file.mimetype)); },
});

// Wraps an async handler so a rejected promise reaches the error middleware
// (Express 4 doesn't catch async errors on its own) instead of hanging.
type AsyncHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>;
const ah = (fn: AsyncHandler) => (req: express.Request, res: express.Response, next: express.NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };

// Rejects (and returns true) if the uploaded image exceeds the dimension cap.
// Display is CSS-bounded to the ad box; this only guards decode/bandwidth cost.
function rejectIfImageTooLarge(res: express.Response, buffer: Buffer): boolean {
  const dim = readImageSize(buffer);
  if (!dim) { res.status(400).json({ error: 'could not read image dimensions' }); return true; }
  if (dim.width > MAX_IMAGE_DIMENSION || dim.height > MAX_IMAGE_DIMENSION) {
    res.status(400).json({ error: `image too large: ${dim.width}x${dim.height}px (max ${MAX_IMAGE_DIMENSION}px per side)` });
    return true;
  }
  return false;
}

app.get('/api/health', (_req, res) => { res.json({ ok: true }); });

app.get('/api/ad', ah(async (req, res) => {
  const format = req.query.format as AdFormat | undefined;
  const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : undefined;
  const installId = typeof req.query.installId === 'string' ? req.query.installId : '';
  if (!installId || installId.length > 64) { res.status(400).json({ error: 'installId required' }); return; }
  const ad = await pickEligibleAd(format, exclude);
  if (!ad) { res.status(204).end(); return; }
  const serveToken = await issueServeToken(ad.id, installId);
  if (!serveToken) { res.status(204).end(); return; } // over rate cap: no ad for this install right now
  res.json({ ...ad, serveToken });
}));

app.post('/api/events', ah(async (req, res) => {
  const { adId, site, viewableMs, installId, serveToken } = req.body ?? {};
  const isValid = typeof adId === 'string' && adId.length > 0 && typeof site === 'string' && site.length > 0 && typeof installId === 'string' && installId.length > 0 && installId.length <= 64 && typeof serveToken === 'string' && serveToken.length >= 8 && serveToken.length <= 128 && typeof viewableMs === 'number' && Number.isFinite(viewableMs) && viewableMs >= 0 && viewableMs <= 1000 * 60 * 30;
  if (!isValid) { res.status(400).json({ error: 'invalid event' }); return; }
  try {
    await recordImpression({ adId, site, viewableMs, installId, serveToken });
  } catch (e) {
    if (e instanceof InvalidServeTokenError) { res.status(400).json({ error: `rejected: ${e.message}` }); return; }
    throw e;
  }
  res.json({ ok: true });
}));

app.get('/api/earnings', ah(async (req, res) => {
  const installId = typeof req.query.installId === 'string' ? req.query.installId : '';
  if (!installId || installId.length > 64) { res.status(400).json({ error: 'installId required' }); return; }
  res.json(await getEarnings(installId));
}));

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

app.get('/api/payout/summary', ah(async (req, res) => {
  const installId = typeof req.query.installId === 'string' ? req.query.installId : '';
  if (!installId || installId.length > 64) { res.status(400).json({ error: 'installId required' }); return; }
  res.json(await getPayoutSummary(installId));
}));

app.post('/api/payout/claim', ah(async (req, res) => {
  const { installId, destinationType } = req.body ?? {};
  let destination = typeof req.body?.destination === 'string' ? req.body.destination.trim() : '';
  const typeOk = destinationType === 'paypal' || destinationType === 'crypto';
  if (typeof installId !== 'string' || !installId || installId.length > 64 || !typeOk) { res.status(400).json({ error: 'invalid claim fields' }); return; }
  if (destinationType === 'paypal') {
    destination = destination.toLowerCase();
    if (!EMAIL_RE.test(destination)) { res.status(400).json({ error: 'enter a valid PayPal email address' }); return; }
  } else if (!EVM_ADDRESS_RE.test(destination)) {
    res.status(400).json({ error: 'enter a valid wallet address (0x followed by 40 hex characters)' }); return;
  }
  try {
    const claim = await createPayoutClaim(installId, destinationType, destination);
    res.json({ ok: true, claim });
  } catch (e) {
    if (e instanceof PayoutClaimError) { res.status(400).json({ error: e.message }); return; }
    throw e;
  }
}));

app.get('/api/stats', requireAdmin, ah(async (_req, res) => { res.json(await getStats()); }));

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.header('x-admin-token') !== ADMIN_TOKEN) { res.status(401).json({ error: 'unauthorized' }); return; }
  next();
}

app.get('/privacy', (_req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'privacy.html')); });

app.get('/admin', (_req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'admin.html')); });

app.get('/api/admin/campaigns', requireAdmin, ah(async (_req, res) => { res.json(await listCampaigns()); }));

app.post('/api/admin/campaigns', requireAdmin, upload.single('image'), ah(async (req, res) => {
  const { format, headline, body, clickUrl } = req.body ?? {};
  const impressionsPurchased = Number(req.body?.impressionsPurchased);
  const cpm = Number(req.body?.cpm);
  const formatOk = format === 'image' || format === 'text';
  const valid = formatOk && typeof headline === 'string' && headline.length > 0 && headline.length <= 200 && typeof body === 'string' && body.length <= 500 && typeof clickUrl === 'string' && /^https?:\/\//i.test(clickUrl) && clickUrl.length <= 500 && Number.isFinite(impressionsPurchased) && impressionsPurchased >= 1 && Number.isFinite(cpm) && cpm >= 0;
  if (!valid) { res.status(400).json({ error: 'invalid campaign fields' }); return; }
  // Image ads need a file; text ads don't.
  if (format === 'image' && !req.file) { res.status(400).json({ error: 'image ads require an image file' }); return; }
  if (req.file && rejectIfImageTooLarge(res, req.file.buffer)) return;
  const imageUrl = req.file ? await uploadAdFile(req.file.buffer, req.file.mimetype) : undefined;
  const id = `camp_${randomUUID().slice(0, 8)}`;
  await createCampaign({ id, format, headline, body, imageUrl, clickUrl, impressionsPurchased: Math.floor(impressionsPurchased), cpm });
  res.json({ ok: true, id });
}));

app.patch('/api/admin/campaigns/:id', requireAdmin, upload.single('image'), ah(async (req, res) => {
  const { headline, body, clickUrl } = req.body ?? {};
  const cpm = Number(req.body?.cpm);
  const valid = typeof headline === 'string' && headline.length > 0 && headline.length <= 200 && typeof body === 'string' && body.length <= 500 && typeof clickUrl === 'string' && /^https?:\/\//i.test(clickUrl) && clickUrl.length <= 500 && Number.isFinite(cpm) && cpm >= 0;
  if (!valid) { res.status(400).json({ error: 'invalid campaign fields' }); return; }
  if (req.file && rejectIfImageTooLarge(res, req.file.buffer)) return;
  // New file is optional on edit; when present it replaces the stored URL.
  const imageUrl = req.file ? await uploadAdFile(req.file.buffer, req.file.mimetype) : undefined;
  const ok = await updateCampaign(req.params.id, { headline, body, clickUrl, cpm, imageUrl });
  if (!ok) { res.status(404).json({ error: 'campaign not found' }); return; }
  res.json({ ok: true });
}));

app.post('/api/admin/campaigns/:id/topup', requireAdmin, ah(async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 1) { res.status(400).json({ error: 'amount must be a number >= 1' }); return; }
  const ok = await addPurchasedImpressions(req.params.id, Math.floor(amount));
  if (!ok) { res.status(404).json({ error: 'campaign not found' }); return; }
  res.json({ ok: true });
}));

app.post('/api/admin/campaigns/:id/archive', requireAdmin, ah(async (req, res) => {
  const archived = req.body?.archived;
  if (typeof archived !== 'boolean') { res.status(400).json({ error: 'archived (boolean) required' }); return; }
  const ok = await setArchived(req.params.id, archived);
  if (!ok) { res.status(404).json({ error: 'campaign not found' }); return; }
  res.json({ ok: true });
}));

app.get('/api/admin/claims', requireAdmin, ah(async (_req, res) => { res.json(await listClaims()); }));

app.post('/api/admin/claims/:id/resolve', requireAdmin, ah(async (req, res) => {
  const status = req.body?.status;
  if (status !== 'paid' && status !== 'rejected') { res.status(400).json({ error: "status must be 'paid' or 'rejected'" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: 'invalid claim id' }); return; }
  const ok = await resolveClaim(id, status);
  if (!ok) { res.status(404).json({ error: 'pending claim not found' }); return; }
  res.json({ ok: true });
}));

app.delete('/api/admin/campaigns/:id', requireAdmin, ah(async (req, res) => {
  const ok = await deleteCampaign(req.params.id);
  if (!ok) { res.status(404).json({ error: 'campaign not found' }); return; }
  res.json({ ok: true });
}));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) { res.status(400).json({ error: err.message }); return; }
  console.error(err);
  res.status(500).json({ error: 'server error' });
});

init()
  .then(() => { app.listen(PORT, () => console.log(`Wait & Earn backend on port ${PORT} — object storage ${storageConfigured() ? 'configured' : 'NOT configured (uploads will fail until S3_* env vars are set)'}`)); })
  .catch((e) => { console.error('Database init failed:', e); process.exit(1); });
