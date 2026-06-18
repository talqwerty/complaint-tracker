/**
 * Smoke-tests the optional S3 and LINE integrations using the values in .env.
 * Run after adding credentials:  pnpm --filter api exec ts-node scripts/verify-integrations.ts
 *
 * It does a real round-trip (S3 put/sign/delete, LINE push) so a green run means
 * the integration is genuinely wired — no app code needed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Minimal .env loader (avoids adding dotenv as a direct dependency).
function loadEnv(): void {
  try {
    const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    // no .env — rely on the ambient environment
  }
}
loadEnv();

const ok = (m: string) => console.log(`\x1b[32m[OK]\x1b[0m ${m}`);
const skip = (m: string) => console.log(`\x1b[33m[--]\x1b[0m ${m}`);
const fail = (m: string) => console.log(`\x1b[31m[!!]\x1b[0m ${m}`);

async function verifyS3(): Promise<boolean> {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    skip('S3: not configured (set S3_* in .env to enable uploads)');
    return true;
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'auto',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  });

  // 1x1 transparent PNG — the bucket restricts uploads to image mime types.
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const key = `healthcheck/${Date.now()}.png`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pngBytes,
        ContentType: 'image/png',
      }),
    );
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 60 },
    );
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    ok(`S3: put + signed URL + delete on "${bucket}" works`);
    console.log(`   sample signed URL: ${url.slice(0, 80)}…`);
    return true;
  } catch (err) {
    fail(`S3: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function verifyLine(): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const target = process.env.LINE_TARGET_ID;

  if (!token || !target) {
    skip('LINE: not configured (set LINE_CHANNEL_ACCESS_TOKEN + LINE_TARGET_ID)');
    return true;
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: target,
        messages: [{ type: 'text', text: '[verify] Complaint Tracker integration OK' }],
      }),
    });
    if (res.ok) {
      ok('LINE: push delivered (check your LINE chat for the verify message)');
      return true;
    }
    fail(`LINE: push failed (${res.status}): ${await res.text()}`);
    return false;
  } catch (err) {
    fail(`LINE: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function main() {
  const results = [await verifyS3(), await verifyLine()];
  process.exit(results.every(Boolean) ? 0 : 1);
}

void main();
