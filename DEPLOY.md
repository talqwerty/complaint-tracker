# Deployment

Deploys both apps on **Railway** in one project — two services from this repo:

- **api** — NestJS (`apps/api`), Node server
- **web** — Next.js (`apps/web`), Node server (`next start`)

Config is committed as `apps/api/railway.json` and `apps/web/railway.json`.

## Prerequisites

- A Railway account + this repo on GitHub
- S3 (Supabase Storage) keys and LINE Messaging API credentials ready
  (see [`apps/api/.env.example`](apps/api/.env.example))

## 1. API service

1. **New Project → Deploy from GitHub repo** → pick this repo.
2. Service **Settings**:
   - **Root Directory**: `/` (shared pnpm monorepo)
   - **Config-as-code path**: `apps/api/railway.json`
3. **Add a Volume** mounted at `/data`.
   SQLite lives on disk; without a volume the database is wiped on every redeploy.
4. **Variables**:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `file:/data/complaints.db` (must be inside the volume) |
   | `JWT_SECRET` | a strong random secret |
   | `JWT_EXPIRES_IN` | `1d` |
   | `CORS_ORIGIN` | the web service public URL (set after step 2) |
   | `S3_ENDPOINT` | `https://<project-ref>.supabase.co/storage/v1/s3` |
   | `S3_REGION` | project region, e.g. `ap-northeast-1` (must match exactly) |
   | `S3_BUCKET` | `complaint-attachments` |
   | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Supabase → Storage → S3 Access Keys |
   | `S3_FORCE_PATH_STYLE` | `true` |
   | `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_TARGET_ID` / `LINE_CHANNEL_SECRET` | LINE Messaging API |

5. **Generate Domain** → note the API URL.

The start command runs `prisma db push` on boot, so the schema is created in the
volume automatically.

## 2. Web service

1. In the same project: **+ New → GitHub repo** → same repo.
2. Service **Settings**:
   - **Root Directory**: `/`
   - **Config-as-code path**: `apps/web/railway.json`
3. **Variables**:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api` |

   `NEXT_PUBLIC_*` is baked in at build time — it must be set before the build runs.
4. **Generate Domain** → put this URL into the API service's `CORS_ORIGIN`, then redeploy the API.

## 3. Seed once

After the first successful API deploy, run a one-off command on the **api** service:

```bash
pnpm --filter api seed
```

⚠️ The seed deletes existing users/cases first — run it only on a fresh database.

Default logins after seeding:

- `admin@forth.com` / `password123`
- `staff@forth.com` / `password123`

## LINE webhook (optional)

Push notifications do **not** need a webhook. A webhook is only required to capture
new `userId`/`groupId` values. After deploy, point the LINE channel webhook at:

```
https://<api-domain>/api/line/webhook
```

Set it via the LINE API or OA Manager; `LINE_CHANNEL_SECRET` verifies the signature.

## Scaling note

SQLite + a single volume works for one instance. To run multiple API instances,
migrate to Postgres (Railway provides it): change `provider` in
`apps/api/prisma/schema.prisma` to `postgresql` and point `DATABASE_URL` at the
Railway Postgres connection string.

## Local development

```bash
nvm use            # Node 24.14.1 (.nvmrc) — needed for pnpm 11 / node:sqlite
pnpm install
pnpm --filter api prisma db push
pnpm --filter api seed
pnpm dev           # web :3000, api :3001
```

Verify the S3 + LINE integrations after filling in `apps/api/.env`:

```bash
pnpm --filter api verify:integrations
```
