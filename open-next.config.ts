import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

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
 *
 * THE QUEUE IS NOT OPTIONAL EITHER, FOR THE SAME REASON.
 *
 * Every page on the site inherits `revalidate = 60` from the root
 * layout (ISR: serve the cached copy instantly, and refresh it in the
 * background once it is more than 60s old). "In the background" is
 * the part that needs a queue — OpenNext hands the refresh job to one
 * so it can run after the response has already gone to the visitor.
 * With none configured, the adapter defaults to its DummyQueue, whose
 * entire implementation is `throw new FatalError("Dummy queue is not
 * implemented")`.
 *
 * Caught live in production (`wrangler tail` against real traffic to
 * /pricing):
 *
 *   "Failed to revalidate stale page /pricing"
 *   FatalError: Dummy queue is not implemented
 *     at revalidateIfRequired (worker.js:9060:30)
 *
 * NOT a 5xx: the throw happens in onEnd/_flush, strictly after the
 * (stale) page has already been served, so the outcome Cloudflare
 * records for the request is "ok" and no visitor sees an error. What
 * actually breaks is quieter and worse — the background refresh never
 * runs, at all, on any page, ever. A page cached once simply stays
 * that way past its 60s window until the next deploy invalidates it,
 * which is silent data staleness with no error a monitor would catch.
 * /pricing shows up in the log because it is heavily visited and its
 * window lapses constantly; every other page has the identical defect
 * and would show the identical error the first time its own traffic
 * caught it stale.
 *
 * MemoryQueue is the fix: on a stale hit it makes one HEAD request
 * back to this same Worker (via the WORKER_SELF_REFERENCE service
 * binding in wrangler.jsonc) with `x-isr: 1`, which is what actually
 * triggers Next to regenerate and recache the page. No Cloudflare
 * Queues subscription, no Durable Objects namespace — just a binding
 * to itself. The alternative built-in, `queue: "direct"`, revalidates
 * synchronously inside the request that discovered the staleness, and
 * the adapter's own config validator warns against it for production
 * ("not recommended for use in production") because it makes that
 * request pay for someone else's regeneration.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: memoryQueue,
});
