# NexQL Site

Marketing site for [NexQL](https://nexql.astrx.dev) — the PostgreSQL management
extension for VS Code.

Static HTML/CSS/JS. No build step, no framework, no dependencies.

## Run locally

Any static file server works — the pages must be served over HTTP, not opened as
`file://`, or the partial loader and `/api/*` calls fail:

```bash
npx serve .
# or
python3 -m http.server 3000
```

Pricing and checkout call `/api/*`, which only resolves on a deployed URL (see
below). Locally those requests 404 and the pricing section falls back to the
defaults baked into the page.

## Layout

| Path | What |
|---|---|
| `index.html` | Landing page |
| `privacy.html`, `terms.html` | Legal pages, served at `/privacy` and `/terms` |
| `device-auth.html` | Device authorization flow for the extension |
| `html/` | Partials fetched at runtime by `js/partials.js` |
| `js/` | Page modules — `pricing.js`, `checkout.js`, `tour.js`, `workbench.js`, … |
| `styles/`, `styles.css` | Styling. See `DESIGN_SYSTEM.md` |
| `assets/` | Screenshots and demo GIFs |

`WEBSITE_CONTEXT.md` and `DESIGN_SYSTEM.md` document the page structure and
visual language — read them before making layout or styling changes.

## Deployment

Deployed to Vercel on `nexql.astrx.dev`, connected to this repo — **pushes to
`main` deploy automatically** and pull requests get preview URLs.

The backend lives in a separate private repo and is deployed as its own Vercel
project on `api.nexql.astrx.dev`. `vercel.json` rewrites `/api/:path*` there, so
browser requests stay same-origin and no CORS is involved. Frontend code always
calls relative `/api/...` paths — never hardcode the backend host.
