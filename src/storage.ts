import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import imageSize from 'image-size';

// Generous cap: a 300px box stays crisp even on 3x displays well under this,
// so this only rejects pathologically large creatives (wasteful to decode).
export const MAX_IMAGE_DIMENSION = 2000;

// Reads pixel dimensions from the file header only (no full decode). Returns
// null if the buffer isn't a readable image.
export function readImageSize(buffer: Buffer): { width: number; height: number } | null {
  try {
    const dim = imageSize(buffer);
    if (!dim || typeof dim.width !== 'number' || typeof dim.height !== 'number') return null;
    return { width: dim.width, height: dim.height };
  } catch {
    return null;
  }
}

// Maps each accepted upload type to the file extension we store it under.
// This doubles as the allow-list: anything not in here is rejected.
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
};

export function isAllowedAdMime(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXT_BY_MIME, mime);
}

const REGION = process.env.S3_REGION ?? 'auto';
const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const PUBLIC_URL = (process.env.S3_PUBLIC_URL ?? '').replace(/\/+$/, '');

export function storageConfigured(): boolean {
  return !!(ENDPOINT && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY && PUBLIC_URL);
}

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
