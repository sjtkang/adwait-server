import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { init, pickEligibleAd, recordImpression, getStats, getEarnings, createCampaign, listCampaigns, updateCampaign, addPurchasedImpressions, deleteCampaign } from './db';
import { type AdFormat } from './ads';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://localhost:${PORT}`;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'changeme-dev-token';

mkdirSync('uploads', { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (_req, file, cb) => { cb(null, `${Date.now()}_${randomUUID().slice(0, 8)}${path.extname(file.originalname).toLowerCase()}`); },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => { cb(null, ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype)); },
});

// Wraps an async handler so a rejected promise reaches the error middleware
// (Express 4 doesn't catch async errors on its own) instead of hanging.
type AsyncHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>;
const ah = (fn: AsyncHandler) => (req: express.Request, res: express.Response, next: express.NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };

app.get('/api/health', (_req, res) => { res.json({ ok: true }); });

app.get('/api/ad', ah(async (req, res) => {
  const format = req.query.format as AdFormat | undefined;
  const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : undefined;
  const ad = await pickEligibleAd(format, exclude);
  if (!ad) { res.status(204).end(); return; }
  res.json(ad);
}));

app.post('/api/events', ah(async (req, res) => {
  const { adId, site, viewableMs, installId } = req.body ?? {};
  const isValid = typeof adId === 'string' && adId.length > 0 && typeof site === 'string' && site.length > 0 && typeof installId === 'string' && installId.length > 0 && installId.length <= 64 && typeof viewableMs === 'number' && Number.isFinite(viewableMs) && viewableMs >= 0 && viewableMs <= 1000 * 60 * 30;
  if (!isValid) { res.status(400).json({ error: 'invalid event' }); return; }
  await recordImpression({ adId, site, viewableMs, installId });
  res.json({ ok: true });
}));

app.get('/api/earnings', ah(async (req, res) => {
  const installId = typeof req.query.installId === 'string' ? req.query.installId : '';
  if (!installId || installId.length > 64) { res.status(400).json({ error: 'installId required' }); return; }
  res.json(await getEarnings(installId));
}));

app.get('/api/stats', ah(async (_req, res) => { res.json(await getStats()); }));

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.header('x-admin-token') !== ADMIN_TOKEN) { res.status(401).json({ error: 'unauthorized' }); return; }
  next();
}

app.get('/admin', (_req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'admin.html')); });

app.get('/api/admin/campaigns', requireAdmin, ah(async (_req, res) => { res.json(await listCampaigns()); }));

app.post('/api/admin/campaigns', requireAdmin, upload.single('image'), ah(async (req, res) => {
  const { format, headline, body, clickUrl } = req.body ?? {};
  const impressionsPurchased = Number(req.body?.impressionsPurchased);
  const cpm = Number(req.body?.cpm);
  const formatOk = format === 'image' || format === 'text' || format === 'video';
  const valid = formatOk && typeof headline === 'string' && headline.length > 0 && headline.length <= 200 && typeof body === 'string' && body.length <= 500 && typeof clickUrl === 'string' && /^https?:\/\//i.test(clickUrl) && clickUrl.length <= 500 && Number.isFinite(impressionsPurchased) && impressionsPurchased >= 1 && Number.isFinite(cpm) && cpm >= 0;
  if (!valid) { res.status(400).json({ error: 'invalid campaign fields' }); return; }
  if (format === 'image' && !req.file) { res.status(400).json({ error: 'image ads require an image file' }); return; }
  const imageUrl = req.file ? `${PUBLIC_URL}/uploads/${req.file.filename}` : undefined;
  const id = `camp_${randomUUID().slice(0, 8)}`;
  await createCampaign({ id, format, headline, body, imageUrl, clickUrl, impressionsPurchased: Math.floor(impressionsPurchased), cpm });
  res.json({ ok: true, id });
}));

app.patch('/api/admin/campaigns/:id', requireAdmin, upload.single('image'), ah(async (req, res) => {
  const { headline, body, clickUrl } = req.body ?? {};
  const cpm = Number(req.body?.cpm);
  const valid = typeof headline === 'string' && headline.length > 0 && headline.length <= 200 && typeof body === 'string' && body.length <= 500 && typeof clickUrl === 'string' && /^https?:\/\//i.test(clickUrl) && clickUrl.length <= 500 && Number.isFinite(cpm) && cpm >= 0;
  if (!valid) { res.status(400).json({ error: 'invalid campaign fields' }); return; }
  const imageUrl = req.file ? `${PUBLIC_URL}/uploads/${req.file.filename}` : undefined;
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

// Create tables/seed BEFORE accepting traffic; bail loudly if the DB is unreachable.
init()
  .then(() => { app.listen(PORT, () => console.log(`Wait & Earn backend on ${PUBLIC_URL}`)); })
  .catch((e) => { console.error('Database init failed:', e); process.exit(1); });
