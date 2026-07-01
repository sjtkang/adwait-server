import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

// Maps each accepted upload type to the file extension we store it under.
// This doubles as the allow-list: anything not in here is rejected.
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm',
};

export function isAllowedAdMime(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXT_BY_MIME, mime);
}

// R2 / S3 config comes from env. R2 is S3-compatible, so the same client works;
// forcePathStyle keeps the bucket in the path (required for R2, fine for S3).
const REGION = process.env.S3_REGION ?? 'auto';
const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const PUBLIC_URL = (process.env.S3_PUBLIC_URL ?? '').replace(/\/+$/, ''); // strip trailing slash

export function storageConfigured(): boolean {
  return !!(ENDPOINT && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY && PUBLIC_URL);
}

// Build the client once, lazily, so the server can still boot (and serve ads,
// stats, earnings) even if storage env vars aren't set yet.
let cached: S3Client | null = null;
function client(): S3Client {
  if (!cached) {
    cached = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: { accessKeyId: ACCESS_KEY_ID ?? '', secretAccessKey: SECRET_ACCESS_KEY ?? '' },
      forcePathStyle: true,
    });
  }
  return cached;
}

// Push one file to the bucket and return its public URL. The key is randomised
// so re-uploads never collide; the immutable Cache-Control lets browsers/CDN
// cache the creative forever (safe, because a new upload gets a new key).
export async function uploadAdFile(buffer: Buffer, contentType: string): Promise<string> {
  if (!isAllowedAdMime(contentType)) throw new Error(`unsupported media type: ${contentType}`);
  if (!storageConfigured()) {
    throw new Error('Object storage not configured — set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL');
  }
  const ext = EXT_BY_MIME[contentType];
  const key = `ads/${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
  await client().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${PUBLIC_URL}/${key}`;
}
