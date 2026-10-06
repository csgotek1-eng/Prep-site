#!/usr/bin/env node
/**
 * SEO invariants, checked against a RUNNING site (local `next start` or
 * production), not the source: a canonical, a robots rule or a sitemap
 * entry is only right if the served response is right.
 *
 *   node scripts/seo-check.mjs http://127.0.0.1:3000
 *   node scripts/seo-check.mjs https://dockentra.ie
 *
 * What it refuses (exit 1):
 *   - robots.txt missing, blocking the public site, or not declaring the sitemap
 *   - sitemap.xml missing, with non-canonical / off-origin / www / admin /
 *     offer entries, or missing a key commercial page
 *   - any sitemap page that is not 200 HTML, carries noindex (meta or
 *     X-Robots-Tag), has a canonical other than itself, has no title,
 *     no description or not exactly one H1, duplicates another page's
 *     title or description, or carries the HOMEPAGE's Open Graph
 *     title/url instead of its own
 *   - a JSON-LD block that does not parse
 *   - a key page not linked from the homepage HTML
 *   - admin pages indexable, or an unknown path answering 200 (soft 404)
 *   - trailing-slash duplicates served instead of redirected
 * Against the production origin it also checks the www host redirects and
 * REPORTS (without failing) whether plain http is redirected — that is a
 * Cloudflare edge setting, not something a deploy can fix.
 *
 * Browser suite: tests/browser/seo-guard.mjs runs this against a local
 * production build on every `npm run test:browser`.
 */

const BASE = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(BASE)) {
  console.error("usage: node scripts/seo-check.mjs <base-url>");
  process.exit(2);
}
const ORIGIN = new URL(BASE).origin;
const PRODUCTION = ORIGIN === "https://dockentra.ie";

/** Pages that carry the commercial intent: all must be in the sitemap and linked from the homepage. */
const KEY_PAGES = [
  "/",
  "/services",
  "/pricing",
  "/how-it-works",
  "/why-ireland",
  "/uk-brands",
  "/china-asia-brands",
  "/european-brands",
  "/about",
  "/contact",
  "/faq",
];
/** Must never be in the sitemap. */
const NEVER_IN_SITEMAP = [/^\/admin(\/|$)/, /^\/api(\/|$)/, /^\/offers(\/|$)/];

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);
const note = (msg) => notes.push(msg);

const UA = "Mozilla/5.0 (compatible; dockentra-seo-check/1.0)";
async function get(url) {
  // 20 s per request: a hung origin fails the check instead of hanging it.
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
  return { status: res.status, headers: res.headers, body: await res.text() };
}
const attr = (tag, name) => (new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag) ?? [])[1];
const decode = (s) => (s ?? "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
function parse(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key) => {
    const t = metas.find((m) => new RegExp(`(name|property)\\s*=\\s*"${key}"`, "i").test(m));
    return t ? decode(attr(t, "content")) : null;
  };
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((l) => /rel\s*=\s*"canonical"/i.test(l));
  const jsonld = [...html.matchAll(/<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return {
    title: decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) ?? [])[1] ?? "").trim(),
    description: meta("description"),
    robots: meta("robots"),
    ogTitle: meta("og:title"),
    ogUrl: meta("og:url"),
    canonical: canonicalTag ? decode(attr(canonicalTag, "href")) : null,
    h1s: [...html.matchAll(/<h1\b[^>]*>/gi)].length,
    jsonld,
    hrefs: [...html.matchAll(/<a\b[^>]*href\s*=\s*"([^"]*)"/gi)].map((m) => decode(m[1])),
  };
}

// 1. robots.txt
const robots = await get(`${BASE}/robots.txt`);
if (robots.status !== 200) fail(`robots.txt: status ${robots.status}`);
else {
  const r = robots.body;
  if (!/User-Agent:\s*\*/i.test(r)) fail("robots.txt: no `User-Agent: *` rule");
  if (/^\s*Disallow:\s*\/\s*$/im.test(r)) fail("robots.txt: `Disallow: /` would hide the whole site");
  if (!/^\s*Disallow:\s*\/admin/im.test(r)) fail("robots.txt: /admin not disallowed");
  if (!/^\s*Sitemap:\s*https:\/\/[^\s]+\/sitemap\.xml/im.test(r)) fail("robots.txt: no https sitemap declaration");
}

// 2. sitemap.xml
const sm = await get(`${BASE}/sitemap.xml`);
const urls = sm.status === 200 ? [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()) : [];
if (sm.status !== 200) fail(`sitemap.xml: status ${sm.status}`);
if (urls.length === 0) fail("sitemap.xml: no <loc> entries");
const paths = [];
// Canonicals and og:url are built from NEXT_PUBLIC_SITE_URL at build
// time, so a local server still serves the production origin in them.
// The sitemap's own origin is the reference; in production it must be
// the origin being checked.
const CANON_ORIGIN = urls.length ? new URL(urls[0]).origin : ORIGIN;
if (PRODUCTION && CANON_ORIGIN !== ORIGIN) fail(`sitemap origin ${CANON_ORIGIN} is not ${ORIGIN}`);
for (const u of urls) {
  let parsed;
  try { parsed = new URL(u); } catch { fail(`sitemap: not an absolute URL: ${u}`); continue; }
  if (!/^https:$/.test(parsed.protocol) && PRODUCTION) fail(`sitemap: not https: ${u}`);
  if (parsed.host.startsWith("www.")) fail(`sitemap: www host: ${u}`);
  if (parsed.origin !== CANON_ORIGIN) fail(`sitemap: off-origin entry: ${u}`);
  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) fail(`sitemap: trailing slash: ${u}`);
  if (parsed.search || parsed.hash) fail(`sitemap: query/hash in entry: ${u}`);
  if (NEVER_IN_SITEMAP.some((re) => re.test(parsed.pathname))) fail(`sitemap: private/noindex path listed: ${u}`);
  paths.push(parsed.pathname);
}
for (const p of KEY_PAGES) if (!paths.includes(p)) fail(`sitemap: key page missing: ${p}`);
if (new Set(paths).size !== paths.length) fail("sitemap: duplicate entries");

// 3. every sitemap page
const seenTitles = new Map();
const seenDescriptions = new Map();
let homepage = null;
const pages = {};
for (const p of paths) {
  const url = `${BASE}${p === "/" ? "" : p}`;
  const res = await get(url);
  const ct = res.headers.get("content-type") ?? "";
  if (res.status !== 200) { fail(`${p}: status ${res.status}${res.headers.get("location") ? " -> " + res.headers.get("location") : ""}`); continue; }
  if (!/text\/html/.test(ct)) { fail(`${p}: content-type ${ct}`); continue; }
  const xr = res.headers.get("x-robots-tag") ?? "";
  if (/noindex|none/i.test(xr)) fail(`${p}: X-Robots-Tag ${xr}`);
  const d = parse(res.body);
  pages[p] = d;
  if (p === "/") homepage = d;
  if (d.robots && /noindex|none/i.test(d.robots)) fail(`${p}: meta robots "${d.robots}"`);
  const expectedCanonical = `${CANON_ORIGIN}${p === "/" ? "" : p}`;
  if (!d.canonical) fail(`${p}: no canonical`);
  else if (d.canonical.replace(/\/$/, "") !== expectedCanonical) fail(`${p}: canonical ${d.canonical} (expected ${expectedCanonical})`);
  if (!d.title) fail(`${p}: no <title>`);
  if (!d.description) fail(`${p}: no meta description`);
  if (d.h1s !== 1) fail(`${p}: ${d.h1s} <h1> elements (expected 1)`);
  if (d.title) { if (seenTitles.has(d.title)) fail(`${p}: duplicate title (also ${seenTitles.get(d.title)}): "${d.title}"`); else seenTitles.set(d.title, p); }
  if (d.description) { if (seenDescriptions.has(d.description)) fail(`${p}: duplicate description (also ${seenDescriptions.get(d.description)})`); else seenDescriptions.set(d.description, p); }
  if (d.ogUrl && d.ogUrl.replace(/\/$/, "") !== expectedCanonical) fail(`${p}: og:url ${d.ogUrl} is not this page`);
  for (const block of d.jsonld) { try { JSON.parse(block); } catch { fail(`${p}: JSON-LD does not parse`); } }
}
// The Open Graph title must be the page's own, not the homepage's (the root layout used to leak it).
if (homepage) {
  for (const [p, d] of Object.entries(pages)) {
    if (p === "/" || !d.ogTitle) continue;
    if (d.ogTitle === homepage.ogTitle || d.ogTitle === homepage.title) fail(`${p}: og:title is the homepage's ("${d.ogTitle}")`);
  }
  // 4. key pages linked from the homepage HTML (not only from the sitemap)
  const linked = new Set(homepage.hrefs.map((h) => { try { return new URL(h, CANON_ORIGIN).pathname.replace(/\/$/, "") || "/"; } catch { return h; } }));
  for (const p of KEY_PAGES) if (p !== "/" && !linked.has(p)) fail(`homepage does not link to key page ${p}`);
}

// 5. private pages and soft-404s
for (const p of ["/admin/leads", "/admin/login"]) {
  const r = await get(`${BASE}${p}`);
  if (r.status === 200) {
    const d = parse(r.body);
    if (!(d.robots && /noindex/i.test(d.robots)) && !/noindex/i.test(r.headers.get("x-robots-tag") ?? "")) fail(`${p}: 200 without noindex`);
  }
}
const missing = await get(`${BASE}/this-page-does-not-exist-seo-check`);
if (missing.status !== 404) fail(`unknown path answers ${missing.status}, not 404 (soft 404)`);
const slash = await get(`${BASE}/services/`);
if (slash.status === 200) fail("/services/ (trailing slash) is served as a duplicate instead of redirected");

// 6. host variants (production only)
if (PRODUCTION) {
  for (const u of ["https://www.dockentra.ie/", "https://www.dockentra.ie/services"]) {
    const r = await get(u).catch(() => null);
    if (!r) { fail(`${u}: unreachable`); continue; }
    const loc = r.headers.get("location") ?? "";
    if (!(r.status >= 300 && r.status < 400 && loc.startsWith("https://dockentra.ie"))) fail(`${u}: ${r.status} ${loc || "(served, not redirected)"}`);
  }
  const http = await get("http://dockentra.ie/").catch(() => null);
  if (http && http.status === 200) note("http://dockentra.ie/ is served (200) rather than redirected to https — Cloudflare 'Always Use HTTPS' is off (edge setting; canonical/HSTS still point at https)");
}

console.log(`seo-check ${BASE}: ${paths.length} sitemap pages checked`);
for (const n of notes) console.log(`  note: ${n}`);
if (failures.length) {
  console.log(`  FAILED (${failures.length}):`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exit(1);
}
console.log("  all SEO invariants hold");
