# Deploying nexql-site to Vercel (local CLI, no Git integration)

`nexql-site` is a **private repo owned by the `nexql-oss` GitHub org**. Vercel's
Hobby (free) plan cannot import private repos owned by an organization, so the
usual "connect Git repo" flow is unavailable. Deploying from the local
filesystem with the Vercel CLI bypasses the Git integration entirely and works
on the free plan.

Tradeoff: no automatic deploy-on-push and no PR preview URLs. Every deploy is a
manual `vercel deploy` from a local checkout.

---

## What the repo deploys

| Piece | Path | How Vercel treats it |
|---|---|---|
| Marketing site (static) | `website/` | `outputDirectory: "website"` in `vercel.json` |
| Serverless functions | `api/**/*.js` | Auto-detected Node functions |
| Cron jobs | `api/cron/*.js` | Declared in `vercel.json` `crons` |

Function count is **11** — under the Hobby limit of 12. Note `api/eslint.config.js`
would otherwise be deployed as a 12th function (`/api/eslint.config`), so
`.vercelignore` excludes it. The catch-all routers
(`api/license/[...route].js`, `api/auth/[...route].js`, `api/sync/[...path].js`,
`api/ai/[...route].js`) exist specifically to keep that count down; do not split
them into individual files.

`installCommand` is `npm ci --prefix api` because the only manifest is
`api/package.json` (there is no root `package.json`). Without it, the functions
deploy without `@neondatabase/serverless`, `@vercel/kv`, and `razorpay`.

`cleanUrls: true` makes `/privacy` and `/terms` resolve to
`website/privacy.html` / `website/terms.html`, matching the links used on the
live site.

`docs/` and `scripts/` are excluded via `.vercelignore` — they are not part of
the deployed site.

---

## Step-by-step: first deploy

### 1. Install / update the CLI

```bash
npm i -g vercel
vercel --version   # 54.x or newer
```

### 2. Log in

```bash
vercel login
```

Opens a browser. Log in with the account that owns the Vercel Hobby team.

### 3. Link the local directory to a Vercel project

```bash
cd nexql-site
vercel link
```

Answers:
- **Set up “…/nexql-site”?** → `y`
- **Which scope?** → your personal / Hobby scope
- **Link to existing project?** → `y` if a `nexql-site` project already exists in
  the dashboard, otherwise `n` and accept the name `nexql-site`
- **In which directory is your code located?** → `./` (repo root, not `website/`)

This writes `.vercel/project.json` — already gitignored, keep it that way.

### 4. Set environment variables (Production)

The functions read these. Add each one for the `production` environment:

```bash
vercel env add DATABASE_URL production
```

Repeat for every key below. `vercel env add` prompts for the value on stdin so
secrets never land in shell history.

**Database (Neon)**
- `DATABASE_URL`
- `POSTGRES_URL`

**KV (Vercel KV / Upstash)**
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

**Razorpay**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_SPONSOR_MONTHLY_INR`
- `RAZORPAY_PLAN_SPONSOR_MONTHLY_USD`
- `RAZORPAY_PLAN_SPONSOR_ANNUAL_INR`
- `RAZORPAY_PLAN_SPONSOR_ANNUAL_USD`
- `RAZORPAY_PLAN_SINGULARITY_MONTHLY_INR`
- `RAZORPAY_PLAN_SINGULARITY_MONTHLY_USD`
- `RAZORPAY_PLAN_SINGULARITY_ANNUAL_INR`
- `RAZORPAY_PLAN_SINGULARITY_ANNUAL_USD`
- *(optional)* `RAZORPAY_DISPLAY_*` — same matrix; overrides the hardcoded price
  strings in `api/_lib/plan-config.js`

**Email (Resend)**
- `RESEND_API_KEY`
- `LICENSE_EMAIL_FROM`

**Cron auth** — must match the `Authorization: Bearer <secret>` check in
`api/cron/license-expiry.js`
- `CRON_SECRET`

**Sync**
- `SYNC_PUBLIC_BASE_URL` (e.g. `https://nexql.astrx.dev`)

**AI proxy (Cloudflare AI Gateway)**
- `AI_GATEWAY_API_KEY`
- `AI_FREE_ENABLED`
- `AI_RATE_PER_ACCOUNT`
- `AI_RATE_PER_IP`
- `AI_RATE_WINDOW_SEC`
- `CF_ACCOUNT_ID`
- `CF_GATEWAY_ID`
- `CF_AI_GATEWAY_TOKEN`
- `CF_AIG_AUTH`

Verify what landed:

```bash
vercel env ls production
```

If a KV or Neon store is provisioned through the Vercel Marketplace, its env
vars are injected automatically — check `vercel env ls` before adding those by
hand to avoid duplicates.

### 5. Preview deploy first

```bash
vercel deploy
```

Prints a preview URL. Smoke-test it (see Verification below) before promoting.

### 6. Production deploy

```bash
vercel deploy --prod
```

### 7. Attach the custom domain (one time)

`nexql.astrx.dev` is managed in the Vercel dashboard:

```bash
vercel domains add nexql.astrx.dev
vercel alias set <deployment-url> nexql.astrx.dev
```

Or set it once under **Project → Settings → Domains**, after which every
`--prod` deploy serves on it automatically. `website/CNAME` is a leftover from
GitHub Pages and is ignored by Vercel.

---

## Subsequent deploys

```bash
cd nexql-site
git pull            # get latest
vercel deploy --prod
```

The CLI uploads the working tree as-is — **uncommitted local changes ship**.
Confirm `git status` is clean before a production deploy.

---

## Verification

```bash
# 1. Static site
curl -sI https://nexql.astrx.dev/ | head -1          # 200
curl -sI https://nexql.astrx.dev/privacy | head -1   # 200 (cleanUrls)

# 2. Public config endpoint — proves functions + deps + Razorpay env
curl -s https://nexql.astrx.dev/api/config | head -40
#   expect key_id and tiers.*.*.available: true for configured plans

# 3. Catch-all routers resolve (401/400 is fine — 404 is not)
curl -sI https://nexql.astrx.dev/api/license/status | head -1
curl -sI https://nexql.astrx.dev/api/sync/v2-spaces | head -1

# 4. Cron auth is wired
curl -sI https://nexql.astrx.dev/api/cron/license-expiry | head -1   # 401
```

In the browser: open the site, scroll to **Pricing**, toggle INR/USD and
monthly/annual — prices come from `/api/config` via `website/js/pricing.js`. The
Get Sponsor / Get Singularity buttons should open Razorpay Checkout
(`website/js/checkout.js`). If they stay disabled, the plan env vars are missing
or still placeholders.

Debugging:

```bash
vercel ls                              # recent deployments
vercel inspect <deployment-url> --logs # build logs
vercel logs <deployment-url>           # runtime logs
```

A `Cannot find module '@neondatabase/serverless'` in runtime logs means the
`installCommand` did not run — re-check `vercel.json`.

---

## Optional: automate later without paying

Vercel's Git integration stays blocked, but GitHub Actions can call the CLI:
store a `VERCEL_TOKEN` (from Vercel → Account Settings → Tokens) plus
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` (both in `.vercel/project.json`) as repo
secrets, then run `vercel deploy --prod --token=$VERCEL_TOKEN` on push to
`main`. This is a deliberate follow-up, not part of this setup.
