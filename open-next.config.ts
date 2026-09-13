import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

/**
 * OpenNext adapter configuration.
 *
 * THE INCREMENTAL CACHE IS NOT OPTIONAL HERE, AND FINDING THAT OUT
 * COST A 500.
 *
 * This started as `defineCloudflareConfig({})`, on the reasoning that
 * the adapter's defaults were fine and the docs' recommended R2 store
 * was unavailable. With no cache configured, `/opengraph-image`
 * answered 500 on the Workers runtime — every link preview on
 * WhatsApp, Facebook, LinkedIn, Slack and iMessage, which for this
 * business is the main way the site gets shared.
 *
 * The cause is not obvious from the error. Next PRERENDERS that route
 * at build time (it is in the prerender manifest, and the build really
 * does emit the finished PNG). OpenNext writes prerendered output into
 * the INCREMENTAL CACHE — `.open-next/cache/<build>/opengraph-image.cache`
 * — so with no cache configured there was nowhere to read it from, the
 * Worker fell through to executing the route, and the route calls
 * readFileSync(process.cwd() + "/public/brand/...") on a runtime that
 * has no filesystem.
 *
 * WHY KV AND NOT THE OTHER TWO.
 *
 *  - R2 is what the docs recommend, and it is not enabled on the
 *    account. Enabling it is a billing decision for the owner.
 *  - The static-assets cache is read-only: its own source says it is
 *    for applications that "do NOT want revalidation and ONLY want to
 *    serve prerendered data". This site wants revalidation. /cases is
 *    `revalidate = 300` precisely so an approved review appears
 *    without a redeploy, and the root layout is `revalidate = 60` for
 *    promotions. That cache would have silently frozen both until the
 *    next deploy.
 *  - KV reads and writes, is already in the account's token scope, and
 *    its documented weakness — eventual consistency — applies to
 *    on-demand revalidation via revalidateTag, which this site does
 *    not use anywhere.
 *
 * If R2 is enabled later, switch to r2IncrementalCache wrapped in
 * withRegionalCache({ mode: "long-lived" }), which is the combination
 * the adapter's docs recommend for a site that revalidates.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
