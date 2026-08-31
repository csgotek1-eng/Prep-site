# PRODUCTION CHECKLIST — FIRST VERCEL DEPLOYMENT

Work through this top to bottom on the day of the first real deployment.
Companion docs: [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md) (environment
variables, webhook contract), [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md)
(inputs needed for legal pages) and the "Deployment to Vercel" section in
the README.

## Production hardening round (2026-08-30, branch claude/website-production-hardening)

Changes on top of the state described below — see
[LEAD_INTAKE_ARCHITECTURE.md](LEAD_INTAKE_ARCHITECTURE.md) and
[ADMIN_SETUP.md](ADMIN_SETUP.md):

- Public pricing API redacted: `/api/pricing/services` no longer exposes
  unit prices, minimum charges or the volume-tier table; estimates are
  server-calculated only.
- Durable leads: every valid quote/enquiry is saved to `website_leads`
  BEFORE notification (save first, notify second); `/admin/leads` inbox
  added with a NEW→CONTACTED→QUALIFIED→WON/LOST workflow.
- Migrations `0004_website_leads_and_rate_limits.sql` and
  `0005_whatsapp_pricing_delivery.sql` are both **APPLIED** to the
  website Supabase project. `0006_pricing_email_delivery.sql` is
  **PREPARED, NOT APPLIED** — the email delivery channel stays
  `disabled` until it is reviewed and applied. Still required before deploying:
  configure the Supabase persistence env vars. The durability
  invariant (`ok` requires `saved`) means a production deployment
  without a working lead store correctly refuses submissions instead
  of silently relying on logs.
- Durable shared rate limiting (hashed keys, Supabase-backed) on
  `/api/quote` and `/api/enquiry`.
- Webhook mode now REQUIRES `QUOTE_WEBHOOK_SECRET` and an HTTPS
  destination in production.
- Content-Security-Policy shipped in `next.config.ts`. Follow-up (not
  blocking): move `script-src` from 'unsafe-inline' to nonces, which
  requires middleware + dynamic rendering of currently-static pages.
- `/privacy` developer notes removed; `/sla` wording renamed to
  "Service Standards" (informational, not a contract). `/terms` remains
  UNPUBLISHED — blocked on owner legal inputs
  ([LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md)).

## Where the build stands

Verified on `main` at commit `2244792` (2026-08-26), from a clean
`npm ci` in this repository:

- `npm test` 158/158 · `npm run lint` clean · `npm run typecheck` clean
- `npm run build` 24/24 routes · `npm audit` 0 vulnerabilities
- 10 public routes live in the build: `/`, `/services`, `/how-it-works`,
  `/pricing`, `/pricing-calculator`, `/about`, `/contact`, `/faq`,
  `/sla`, `/privacy` — all present in `sitemap.ts`
- Responsive sweep clean at 320/375/390/430/768/1024/1280/1440: no
  horizontal overflow, no sticky/modal collisions, no duplicate element
  ids, exactly one persistent support system (the floating Help panel)

This says the code is ready to deploy. It does **not** say anything
about the live site — see "Not verifiable from the build" below.

## Already done — no action needed

- [x] GitHub default branch is `main` (confirmed via the GitHub API,
      2026-08-26)
- [x] Vercel project connected — the repository's homepage field points
      at `https://prep-site-five.vercel.app`
- [x] Security headers configured in `next.config.ts`
      (X-Content-Type-Options, X-Frame-Options, Referrer-Policy;
      `poweredByHeader: false`)
- [x] No secrets committed — every credential is read from the
      environment, and no client component reads `process.env`
- [x] Pricing fails closed: with no pricing store configured the public
      calculator shows its safe unavailable state instead of prices
- [x] Enquiry and quote delivery default to `log` mode, and no page
      claims a message was emailed anywhere

## Blocking items — must all be resolved before production launch

None of these may be marked complete until they are actually done:

- [ ] Production domain chosen
- [ ] Real service prices entered via `/admin/pricing` — until then the
      public calculator stays in its unavailable state by design. Launching
      without them is a valid choice, but it is a choice.
- [ ] Privacy/legal inputs supplied
      ([LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md)) — `/privacy`
      now contains only factually supported statements (the developer
      notice was removed in the hardening round), but it still carries
      no company registration number, VAT number or dedicated privacy
      email, because none have been supplied
- [ ] Privacy Policy reviewed by a lawyer and the pending-review notice
      removed (source: [PRIVACY_POLICY_DRAFT.md](PRIVACY_POLICY_DRAFT.md))
- [ ] Website Terms finalized (from
      [WEBSITE_TERMS_DRAFT.md](WEBSITE_TERMS_DRAFT.md)) and published
- [ ] Quote-form privacy notice added (plan in
      [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md))
- [ ] Production webhook destination chosen (or explicit decision to
      launch in `log` mode, in which case enquiries and quote requests
      reach the server log only)
- [ ] Production env vars configured in Vercel
      ([DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md))
- [ ] Preview deployment tested end-to-end
- [ ] Production deployment explicitly authorized by the owner

## Decide before launch

- [ ] Repository visibility — `csgotek1-eng/Prep-site` is currently
      **public**. Nothing secret is committed, so this is not a
      vulnerability, but the source, the docs and the commit history are
      readable by anyone. Make it a deliberate choice.
- [ ] Public Telegram link — `siteConfig.social.telegram` is `null` and
      no `t.me` URL appears anywhere. Supply a real username or leave it
      out.

## Before deploying

- [ ] Vercel project has `main` selected as the production branch
- [ ] Environment variables configured in Vercel per
      [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md) (`QUOTE_DELIVERY_MODE`, and
      webhook URL/secret if using webhook mode) — no secrets committed
- [ ] Production domain added in Vercel (Settings → Domains)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production domain (then redeploy).
      Until this is set, a Vercel deployment resolves to its real
      `*.vercel.app` host — a URL that genuinely serves the site — so
      the sitemap, canonicals and OG tags are never wrong, just not on
      the final domain yet.
- [ ] Local verification green on the deployed commit: `npm ci`,
      `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
      `npm audit` (0 vulnerabilities)
- [ ] Legal/privacy status confirmed (see
      [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md)) — a launch decision,
      not a build step

## After deploying — smoke test on the live URL

Core:

- [ ] Vercel build passed
- [ ] Homepage loads over HTTPS (SSL certificate active, no warnings)
- [ ] Mobile nav: hamburger opens, links navigate, menu closes (test at
      ~375px wide)
- [ ] Homepage anchors scroll to the right section and the sticky header
      does not cover the heading
- [ ] `/services`, `/how-it-works`, `/pricing`, `/about`, `/contact`,
      `/faq`, `/sla`, `/privacy` all load

Contact and support:

- [ ] Utility bar: phone and WhatsApp links open the right app
- [ ] Floating Help panel opens; the full command menu renders
      (Pricing / Services / Partnership & support, 18 commands,
      including "Other / Write My Own Question"); ESC closes it
- [ ] An enquiry submits and returns the success state — and the message
      actually arrives wherever `QUOTE_DELIVERY_MODE` points (server log
      in `log` mode)
- [ ] Phone contact card: the owner-approved photo loads, Call is
      `tel:+353851584185`, WhatsApp is `https://wa.me/353851584185`
- [ ] Only one persistent support element is visible on mobile — no
      stacked floating buttons

Calculator:

- [ ] Calculator opens both at `/pricing-calculator` and from the
      homepage modal, and both show the same thing
- [ ] With no prices configured: the safe unavailable state
- [ ] PRICING IS PRIVATE: no euro amount appears anywhere in the
      calculator, the quote form, any public page or any
      `/api/pricing/*` response body (check the network tab too)
- [ ] The calculator asks in order: STEP 1 monthly orders, STEP 2
      services, STEP 3 how to receive the price
- [ ] ONE pricing action only: a WhatsApp/Email choice, ONE
      destination field at a time, and one button ("Send my price to
      WhatsApp" / "Send my price by email") — no second pricing CTA.
      Invalid/countryless numbers and invalid addresses are refused
      with guidance
- [ ] With delivery disabled/unconfigured (either channel): the
      request is SAVED and the visitor sees the truthful "delivery is
      not available right now" message with a DCK reference — never a
      fake "sent"
- [ ] With Resend configured (verified domain sender): an email
      request reports "sent", the admin row shows channel=email +
      provider=resend + message id
- [ ] With Meta configured (token, phone number id, APPROVED template,
      webhook + app secret): a live request reports "sent", the admin
      row shows provider=meta + message id, and the webhook advances
      the status to SENT/DELIVERED
- [ ] The stored request carries the internally calculated priced
      estimate (admin inbox shows it)
- [ ] Header shows six nav items (Home, Services, How It Works,
      Pricing, About, Contact) — no Calculator item and no pricing
      button, at every width
- [ ] Floating actions: Get Price + Help side by side, neither
      covering page content; Get Price opens the SAME calculator
- [ ] Help launcher: drags anywhere but never off screen, a drag does
      not open the panel; minimise docks a LABELLED "Help" edge tab
      (not a circle or a dash) to the nearest edge; the tab reopens
      Help; edge/position/collapsed survive a reload; the menu shows
      all 18 commands and Get Pricing opens the calculator
- [ ] Phone: no phone number and no Call action anywhere except the
      footer and the bottom of /contact, where it is small plain text
- [ ] Email leads every contact surface (utility bar, homepage contact
      block, Help panel, footer, /contact)

FAQ / SLA / Privacy:

- [ ] FAQ accordion opens and closes; each category's items are
      independent
- [ ] FAQ "Contact Support" opens the shared Help panel without leaving
      the page, and opens again on a second click
- [ ] `/sla` states no numeric guarantees; `/privacy` still shows the
      "not yet reviewed by a legal professional" notice until sign-off

SEO, assets and security:

- [ ] `/sitemap.xml` loads and every URL uses the production domain
      (should list all 10 public routes)
- [ ] `/robots.txt` loads and its sitemap line uses the production domain
- [ ] Favicon shows in the browser tab (`/icon.png`)
- [ ] Apple touch icon responds at `/apple-icon.png`
- [ ] OG image responds at `/opengraph-image` (1200×630 PNG) and a link
      preview (paste the URL into Slack/WhatsApp) renders it
- [ ] View page source: canonical + og:url point at the production domain
- [ ] Wordmark renders as one word and a screen reader announces
      "Dockentra", not "D ockentra"
- [ ] No secrets exposed: view source and the JS bundles contain no
      `QUOTE_WEBHOOK_` values; `curl -I` shows the security headers
      (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) and no
      `X-Powered-By`
- [ ] `/api/quote` rejects garbage: invalid JSON → 400, oversized body →
      413, >5 rapid submissions from one IP → 429
- [ ] `/api/enquiry` rejects the same way (same limits, plus a honeypot
      that returns success while delivering nothing)
- [ ] `/api/admin/*` refuses unauthenticated requests, and the dev-token
      provider is refused entirely by a production server

## Not verifiable from the build

These need someone with access to the live site or the Vercel dashboard;
they cannot be confirmed from this repository:

- Which commit Vercel is currently serving
- Whether the last production deployment succeeded
- Vercel environment variables, domains and DNS
- Whether the live site is reachable at all

## After the smoke test

- [ ] Note the deployed commit hash and date in docs/PROJECT_STATUS.md
- [ ] Set `Production Deployment: DEPLOYED` in docs/PROJECT_STATUS.md
