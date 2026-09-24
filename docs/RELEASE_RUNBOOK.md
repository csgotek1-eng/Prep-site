# RELEASE RUNBOOK

How to change the Dockentra website after it is live on dockentra.ie.

**The domain is set up once.** Nothing in this document touches DNS,
nameservers, or the registrar. Attaching dockentra.ie to the Worker is
a one-time job; after that, every content, design, functionality and
code change ships by replacing the Worker's code behind the same
domain. If a routine change ever seems to require a DNS edit,
something has gone wrong — stop and find out what.

---

## The normal change

### 1. Branch

```bash
git checkout main && git pull
git checkout -b claude/what-this-changes
```

Never commit to `main` directly. `main` is what production was built
from, and it is the thing you roll back *to*.

### 2. Work locally

```bash
npm run dev          # ordinary Next dev server, fast refresh
```

For anything touching routing, caching, headers, geo or an API route,
`npm run dev` is **not enough** — it is a different runtime from the
one production uses. Use the real Workers runtime:

```bash
npm run cf:preview   # builds, then serves on workerd via wrangler
```

Three regressions in this project passed `next dev` and `next build`
and broke only on Workers: security headers vanishing from static
files, `/opengraph-image` returning 500, and `/uk-brands` redirecting
every visitor. All three would have been invisible without this step.

### 3. Run the gates

```bash
npm run gates        # lint, typecheck, the unit suite, both builds
npm run test:browser # the ten Playwright suites (~20 min)
```

Run the browser suites after a fresh `npm run build`, never straight
after `npm test` on its own: `tests/build-hygiene.test.ts` removes
`.next/` as part of the unit suite, and the browser suites serve that
build. (`npm run gates` already builds after testing.)

`npm run gates` is the fast set and should pass before every commit.
The browser suites are slower; CI runs them on every push, so locally
they are worth running when you have changed layout, forms, the
calculator, or anything a visitor sees.

If Playwright is missing (`npm install` prunes it — it is deliberately
not in the lockfile):

```bash
npm install --no-save playwright
```

### 4. What the gates actually protect

These are the invariants that cost real money or real trust if they
break. Each has a test; none of them is a matter of remembering.

| Invariant | Where it is enforced |
| --- | --- |
| No prices on any public page | `tests/pricing-page-and-hours.test.ts`, `tests/browser/pricing-privacy.mjs` |
| No rate card in this repository (it is **public**) | `tests/pricing-page-and-hours.test.ts` |
| `/uk-brands`: open to every country, no geo redirect (the IE redirect was removed by owner decision) | `tests/reviews-and-geo-behaviour.test.ts` |
| Security headers on pages **and** static files | `tests/cloudflare-deployment.test.ts` |
| No Next proxy/middleware file returns | `tests/cloudflare-deployment.test.ts` |
| Forms save before they confirm | `tests/browser/lead-failure-path.mjs` |
| Rate-limit key is not client-controlled | `tests/hardening-round.test.ts` |
| WCAG 2.1 AA | `tests/browser/accessibility.mjs` |

**Do not weaken a test to make it pass.** If a test is genuinely stale
because the behaviour changed on purpose, change it to assert the new
behaviour and say in the comment what reversed and why. Several tests
in this repo carry that history and it is the reason they are
trustworthy.

### 5. Commit and push

```bash
git add -A
git commit          # say what changed and why, not just what
git push -u origin claude/what-this-changes
```

CI runs the gates on the push. Merge only when it is green.

### 6. Deploy

```bash
npm run cf:deploy
```

That builds and uploads a **new version** of the Worker. The domain,
the DNS records and the KV namespace are untouched — only the code
behind them changes. Expect a few seconds; there is no downtime,
because Cloudflare switches versions atomically.

### 6a. If you changed configuration rather than code, purge the cache

```bash
npm run cf:purge-cache
```

**The KV cache survives deploys, and it holds rendered pages.** That is
the point of it — but it means a change that alters what a page renders
*without* altering the page's code, such as an environment variable,
deploys correctly and then serves the old output anyway.

This is not hypothetical. The first production deploy served
`<link rel="canonical" href="http://localhost:3000/pricing">` on every
page. Adding the missing variable and redeploying fixed the rendering
and changed nothing a visitor saw, because every page was a cache HIT
— entries from two earlier build ids were still being served. The
canonicals only became correct after an explicit purge.

An ordinary code change does not need this: a new build produces a new
build id, so the old entries are simply never read again.

### 7. Verify production

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dockentra.ie/api/health
```

`/api/health` returns 200 only when the pricing and lead stores both
resolve, so it is the fastest proof the environment is still wired up.
A 503 means a variable is missing, not that the code is broken.

Then check the pages you changed, at desktop and phone width.

---

## Rollback

The previous version stays available. Nothing needs redeploying from
source and nothing touches DNS.

```bash
npm run cf:versions    # the 10 most recent versions, newest first
npx wrangler rollback <version-id> -m "why"
```

Rollback is near-instant. If a deploy looks wrong, roll back first and
diagnose afterwards — a broken quote form costs more than five minutes
of lost work.

For a risky change, ship it to a fraction of traffic first:

```bash
npx wrangler versions upload
npx wrangler versions deploy <new-id>@10 <current-id>@90
```

---

## Environment variables

Full list, with reasoning, in `docs/CLOUDFLARE_DEPLOYMENT.md`. Two
rules that are easy to get wrong:

- **Build-time variables must be set as build variables**, not only as
  runtime ones. `NEXT_PUBLIC_SITE_URL` and `SUPABASE_PUBLIC_URL` are
  read while the bundle is compiled. Setting them only at runtime
  produces a build with `localhost:3000` in every canonical URL and a
  CSP that trusts every Supabase project on the internet — and neither
  failure announces itself.
- **`npm run cf:deploy` passes `--keep-vars`** so a CLI deploy does not
  wipe variables managed in the dashboard. If you deploy with raw
  `wrangler deploy`, pass it yourself.

Secrets are set with `wrangler secret put NAME` or in the dashboard,
and cannot be read back afterwards. They never go in a file, a commit,
or a chat message.

---

## Things that are NOT routine

Stop and think before any of these. None is part of a normal change.

- **Changing DNS or nameservers.** Only ever needed once. If you are
  reaching for it again, find out why first.
- **Applying a Supabase migration.** Migration `0008` (website reviews)
  is prepared and unapplied; until it runs, review submission answers
  an honest 503 and `/cases` shows its empty state. Applying it is a
  deliberate, owner-authorised act.
- **Deleting the Vercel project.** It is the fallback of last resort.
  Keep it until Cloudflare has been stable for a good while.
- **Rewriting published git history**, including to remove the rate
  card that earlier commits contain.
- **Making the repository private**, which is the other way to address
  that history.

---

## Known operational wrinkles

- **OpenNext is not fully supported on Windows.** It prints a warning
  and means it: `workerd.exe` holds file locks on `.open-next`, so a
  rebuild while a preview is running fails with `EPERM`, and killed
  previews leave zombie processes holding the port. Stop the preview
  before rebuilding. CI builds on Linux, which is the reliable path.
- **Playwright is pruned by `npm install`.** It is installed with
  `--no-save` on purpose (a 300MB browser download that only the
  browser suites need), so any `npm install` removes it and
  `npm run test:browser` then reports it missing. Reinstall and carry
  on.
- **`next/image` optimisation is unverified in production.** No
  Cloudflare `IMAGES` binding is configured, because it is billable.
  Check the photography on `/about` and the homepage after the first
  production deploy.
- **`wrangler deploy`'s pre-upload diff looks alarming and is not the
  final word.** It prints a diff of the vars it is ABOUT to change,
  computed from `wrangler.jsonc` alone — before `--keep-vars` merges in
  whatever the dashboard already has. Seen once, live: the diff listed
  every dashboard-managed variable (Supabase, persistence modes, the
  owner contact email — eight of them) as being removed. The deploy
  completed correctly and all eight survived. Do not stop a deploy on
  this diff alone, and do not trust it as confirmation either —
  **`wrangler versions view <the new id>`** afterwards is the only
  reliable check; it lists every var and secret NAME (never a secret
  value) actually live on that version.
- **A stale page's background refresh needs `WORKER_SELF_REFERENCE`.**
  If `wrangler.jsonc`'s `services` block is ever removed or the Worker
  is renamed without updating `service` to match, every page's
  `revalidate = 60` silently stops refreshing in the background — see
  `docs/CLOUDFLARE_DEPLOYMENT.md` for the exact failure
  (`FatalError: Dummy queue is not implemented`) and how it was found
  (`wrangler tail` against real traffic, not a local repro).
- **This machine's own DNS resolver can lie about dockentra.ie.** If a
  `curl` or browser here suddenly can't reach the live site while
  `wrangler tail` / the Cloudflare dashboard show it healthy, suspect
  this sandbox's resolver before the site — `nslookup dockentra.ie
  8.8.8.8` (bypassing the local resolver) is the fast way to check, and
  `curl --resolve dockentra.ie:443:<the real Cloudflare IP>` routes
  around it entirely for testing. See "Open questions" in
  `docs/CLOUDFLARE_DEPLOYMENT.md` for the full finding.
