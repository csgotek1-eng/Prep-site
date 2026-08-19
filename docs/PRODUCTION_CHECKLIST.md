# PRODUCTION CHECKLIST — FIRST VERCEL DEPLOYMENT

Work through this top to bottom on the day of the first real deployment.
Companion docs: [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md) (environment
variables, webhook contract), [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md)
(inputs needed for legal pages) and the "Deployment to Vercel" section in
the README.

## Blocking items — must all be resolved before production launch

None of these may be marked complete until they are actually done:

- [ ] GitHub default branch is `main`
- [ ] Production domain chosen
- [ ] Privacy/legal inputs supplied
      ([LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md))
- [ ] Privacy Policy finalized (from
      [PRIVACY_POLICY_DRAFT.md](PRIVACY_POLICY_DRAFT.md)) and published
- [ ] Website Terms finalized (from
      [WEBSITE_TERMS_DRAFT.md](WEBSITE_TERMS_DRAFT.md)) and published
- [ ] Quote-form privacy notice added (plan in
      [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md))
- [ ] Production webhook destination chosen (or explicit decision to
      launch in `log` mode)
- [ ] Production env vars configured in Vercel
      ([DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md))
- [ ] Preview deployment tested end-to-end
- [ ] Production deployment explicitly authorized by the owner

## Before deploying

- [ ] GitHub default branch is `main` (Settings → General → Default branch)
- [ ] Vercel project imported from `csgotek1-eng/Prep-site` with `main`
      selected as the production branch
- [ ] Environment variables configured in Vercel per
      [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md) (`QUOTE_DELIVERY_MODE`, and
      webhook URL/secret if using webhook mode) — no secrets committed
- [ ] Production domain added in Vercel (Settings → Domains)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production domain (then redeploy)
- [ ] Local verification green on the deployed commit: `npm ci`,
      `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
      `npm audit` (0 vulnerabilities)
- [ ] Legal/privacy status confirmed (see
      [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md)) — a launch decision,
      not a build step

## After deploying — smoke test on the live URL

- [ ] Vercel build passed
- [ ] Homepage loads over HTTPS (SSL certificate active, no warnings)
- [ ] Mobile nav: hamburger opens, links navigate, menu closes (test at
      ~375px wide)
- [ ] Quote form: valid submission returns the success state
- [ ] Webhook (if enabled): receiver got the request, signature verifies,
      payload matches the documented schema
- [ ] Quote form error state: shows a readable error (e.g. temporarily
      point `QUOTE_WEBHOOK_URL` at an endpoint that returns 500, or
      submit with the network throttled offline in devtools)
- [ ] `/sitemap.xml` loads and every URL uses the production domain
- [ ] `/robots.txt` loads and its sitemap line uses the production domain
- [ ] Favicon shows in the browser tab (`/icon.svg`)
- [ ] Apple touch icon responds at `/apple-icon` (image/png)
- [ ] OG image responds at `/opengraph-image` (1200×630 PNG) and a link
      preview (paste the URL into Slack/WhatsApp) renders it
- [ ] View page source: canonical + og:url point at the production domain
- [ ] No secrets exposed: view source and the JS bundles contain no
      `QUOTE_WEBHOOK_` values; `curl -I` shows the security headers
      (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) and no
      `X-Powered-By`
- [ ] `/api/quote` rejects garbage: invalid JSON → 400, oversized body →
      413, >5 rapid submissions from one IP → 429

## After the smoke test

- [ ] Note the deployed commit hash and date in docs/PROJECT_STATUS.md
- [ ] Set `Production Deployment: DEPLOYED` in docs/PROJECT_STATUS.md
