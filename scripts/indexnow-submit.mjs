#!/usr/bin/env node
/**
 * IndexNow: tell Bing (and the other IndexNow engines — Yandex, Seznam,
 * Naver, Yep; Google does NOT participate) which URLs changed, right
 * after a production release. Submission is a hint, never a guarantee
 * of indexing — the protocol's own FAQ says so.
 *
 *   node scripts/indexnow-submit.mjs                 # every sitemap URL
 *   node scripts/indexnow-submit.mjs /services /faq  # only these paths
 *
 * The key is public by design (the protocol verifies ownership by
 * fetching https://dockentra.ie/<key>.txt, which is committed under
 * public/). Run this only against the live site: IndexNow rejects a host
 * whose key file it cannot fetch.
 *
 * Alternative that needs no script: Cloudflare → Caching → Configuration
 * → Crawler Hints (dashboard toggle) submits to IndexNow automatically.
 */
const HOST = "dockentra.ie";
const KEY = "82e504e697e9b084495d00a000b28b7a";
const KEY_URL = `https://${HOST}/${KEY}.txt`;

const args = process.argv.slice(2);
let urls;
if (args.length) {
  urls = args.map((p) => `https://${HOST}${p.startsWith("/") ? p : "/" + p}`);
} else {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
if (!urls.length) { console.error("nothing to submit"); process.exit(1); }

const keyCheck = await fetch(KEY_URL);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`key file not served at ${KEY_URL} (status ${keyCheck.status}) — deploy first`);
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URL(s) submitted, HTTP ${res.status} (200/202 = accepted; it is a hint, not an indexing guarantee)`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
