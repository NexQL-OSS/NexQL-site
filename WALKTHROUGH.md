Step-by-step (short form)

npm i -g vercel
vercel login
cd nexql-site
vercel link          # scope=personal, root dir = ./  (NOT website/)
vercel env add DATABASE_URL production   # repeat per var, list in DEPLOY.md
vercel deploy        # preview — smoke test
vercel deploy --prod # production
vercel domains add nexql.astrx.dev       # one time

Why config needed

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────┐
│                                                       Finding                                                       │                 Fix                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ No root package.json; deps only in api/package.json → Vercel skips install, functions crash on                      │ installCommand: "npm ci --prefix     │
│ @neondatabase/serverless                                                                                            │ api"                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ Static site in website/, not root                                                                                   │ outputDirectory: "website"           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ Site links /privacy, /terms but files are .html                                                                     │ cleanUrls: true                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ api/cron/*.js never fire without declaration                                                                        │ crons block, daily (Hobby max)       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ api/eslint.config.js deploys as 12th function, hits Hobby cap                                                       │ .vercelignore                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ docs/RAZORPAY.md:213 says outputDirectory docs — stale                                                              │ superseded by docs/DEPLOY.md         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────┘

Env vars needed: 24 (Neon, KV, Razorpay incl. 8 RAZORPAY_PLAN_*, Resend, CRON_SECRET, SYNC_PUBLIC_BASE_URL, 9 AI/Cloudflare) — full list in docs/DEPLOY.md. No .env exists locally, so values must come from team/dashboard.

Tradeoff stands: no auto-deploy on push. GitHub Actions + VERCEL_TOKEN path documented at end of guide if you want it later.