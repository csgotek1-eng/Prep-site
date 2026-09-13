import { createHash } from "node:crypto";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "./supabase-config.ts";

/**
 * Rate limiting for the public POST endpoints.
 *
 * Two layers, composed by createDurableRateLimiter():
 *
 *  1. In-memory sliding window (per serverless instance). Catches tight
 *     bursts with zero latency, but state is not shared across
 *     instances and resets on cold starts.
 *  2. Durable fixed-window counter in the website's Supabase project,
 *     via the check_rate_limit() RPC
 *     (supabase/migrations/0004_website_leads_and_rate_limits.sql).
 *     Shared across all Vercel instances. Rows expire after two windows
 *     and are cleaned opportunistically inside the RPC, so no
 *     identifier is stored for longer than the limiter needs.
 *
 * Privacy: the durable store never sees a raw IP. Keys are hashed
 * server-side (SHA-256, truncated) together with the endpoint scope.
 *
 * Failure posture: the durable check FAILS OPEN. These limiters guard
 * lead-intake endpoints — refusing a real customer because the limiter
 * store was briefly unreachable would lose a lead, which is the worse
 * outcome. The in-memory layer still applies while the durable store is
 * down, and every failure is logged.
 */

export interface RateLimiter {
  /** Returns true if the request identified by `key` is allowed. */
  allow(key: string): boolean;
}

export interface AsyncRateLimiter {
  allow(key: string): Promise<boolean>;
}

/**
 * The client key for a request, taken from the hops a PROXY sets rather
 * than from anything the caller can choose.
 *
 * This used to read the LEFTMOST x-forwarded-for entry. That entry is
 * the one value in the chain the client itself can write: on any proxy
 * that appends rather than replaces, `X-Forwarded-For: 10.0.0.<n>` with
 * a fresh n per request mints an unlimited number of distinct buckets.
 * The limit that matters there is not the 5/min on the forms but the
 * 3-per-window on WhatsApp/email price delivery, which sends outbound
 * Meta template messages and Resend emails to a submitter-supplied
 * destination — bypassing it turns into third-party message-bombing
 * billed to the owner's accounts.
 *
 * THE ORDER WAS WRONG AFTER THE MOVE TO CLOUDFLARE, AND IT WAS
 * EXPLOITABLE.
 *
 * x-vercel-forwarded-for used to be first, justified — correctly, on
 * Vercel — as a header the edge overwrites on every request. On
 * Cloudflare nothing sets or strips it: it is not a Cloudflare header,
 * and the OpenNext adapter never synthesises it (its wrapper maps only
 * geo properties off request.cf, no IP). So whatever the caller sent
 * WAS the bucket key, and a fresh value per request minted unlimited
 * buckets.
 *
 * Demonstrated against the running Worker, in one window: 65 plain
 * requests drove /api/pricing/services to 429; six requests each
 * carrying a different x-vercel-forwarded-for sailed through to the
 * handler; three more plain requests were still 429. The limiter was
 * off for anyone who sent one header.
 *
 * That matters most for the 3-per-window on WhatsApp and email price
 * delivery, which send outbound Meta template messages and Resend
 * emails to a SUBMITTER-SUPPLIED destination. An unbounded key space
 * there is third-party message-bombing billed to the owner.
 *
 * Order, most trustworthy first:
 *  1. cf-connecting-ip — set by Cloudflare from the observed peer on
 *     every request and NOT forgeable by the client. This is the host
 *     the site runs on, so it goes first.
 *  2. x-vercel-forwarded-for — the same guarantee on Vercel, which is
 *     kept as a working rollback. Inert on Cloudflare, where (1)
 *     always answers first.
 *  3. x-forwarded-for, RIGHTMOST entry — the hop the nearest proxy
 *     actually observed. Anything the client prepended sits to the
 *     left of it and is ignored.
 *  4. x-real-ip — DEMOTED from second place to last. Neither of this
 *     site's hosts sets it, so above the rightmost hop it was just a
 *     second forgeable slot outranking a trustworthy one. It stays,
 *     below that hop, because the alternative is worse than it looks:
 *     dropping it entirely puts every such request into the shared
 *     "unknown" bucket, where a lead form starts rejecting real
 *     enquiries five at a time. Last place gives the availability
 *     without letting it override anything.
 *
 * The fallback stays "unknown" and is deliberately shared: everything
 * landing there is in ONE bucket, so on a lead form it would reject
 * real enquiries rather than merely fail to stop abuse. It is only
 * reached when no proxy header is present at all (direct local
 * requests), which is why it is last rather than first.
 */
export function requestClientKey(request: Request): string {
  const cloudflare = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const vercel = request.headers.get("x-vercel-forwarded-for");
  const vercelClient = vercel?.split(",")[0]?.trim();
  if (vercelClient) return vercelClient;

  const forwarded = request.headers.get("x-forwarded-for");
  const hops = forwarded?.split(",").map((hop) => hop.trim()).filter(Boolean);
  const nearest = hops?.[hops.length - 1];
  if (nearest) return nearest;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/** Scope+key → stable anonymised identifier for the durable store. */
export function hashRateLimitKey(scope: string, key: string): string {
  return createHash("sha256")
    // The separator is written as an escape, not a raw byte: a literal
    // NUL in the source made this file binary to git (every change
    // showed as "Binary files differ", with no line diff on the rate
    // limiter of all files) and invisible to grep -r.
    .update(`${scope}\u0000${key}`)
    .digest("hex")
    .slice(0, 32);
}

export function createMemoryRateLimiter(options: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const hits = new Map<string, number[]>();

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;

      const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }

      recent.push(now);
      hits.set(key, recent);

      // Opportunistic cleanup so the map cannot grow without bound.
      if (hits.size > 10000) {
        for (const [otherKey, times] of hits) {
          if (times.every((time) => time <= cutoff)) {
            hits.delete(otherKey);
          }
        }
      }

      return true;
    },
  };
}

interface DurableRateLimitOptions {
  /** Endpoint scope mixed into the hashed key, e.g. "quote". */
  scope: string;
  limit: number;
  windowMs: number;
}

/**
 * Durable limiter over the Supabase check_rate_limit() RPC, or null
 * when Supabase is not configured (development file mode).
 */
export function createSupabaseRateLimiter(
  options: DurableRateLimitOptions,
): AsyncRateLimiter | null {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    return null;
  }
  const windowSeconds = Math.max(1, Math.round(options.windowMs / 1000));

  return {
    async allow(key: string): Promise<boolean> {
      try {
        const response = await fetch(
          `${url.replace(/\/$/, "")}/rest/v1/rpc/check_rate_limit`,
          {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              p_key: hashRateLimitKey(options.scope, key),
              p_limit: options.limit,
              p_window_seconds: windowSeconds,
            }),
          },
        );
        if (!response.ok) {
          console.error(
            `Durable rate limit check failed with status ${response.status} — allowing request (fail open).`,
          );
          return true;
        }
        const allowed = (await response.json()) as unknown;
        if (typeof allowed === "boolean") return allowed;
        // Anything that is not a boolean means check_rate_limit() no
        // longer answers the way this client expects — a schema drift,
        // not an outage. The posture stays fail-open, consistent with
        // the two branches above, but it is now SAID rather than
        // silently indistinguishable from "allowed": `allowed !== false`
        // treated null, {} and a stray error object as a pass with no
        // log line, so the limiter could be off for weeks unnoticed.
        console.error(
          "Durable rate limit check returned an unexpected payload — allowing request (fail open).",
        );
        return true;
      } catch {
        console.error(
          "Durable rate limit check failed with a network error — allowing request (fail open).",
        );
        return true;
      }
    },
  };
}

/**
 * The production limiter for lead-writing endpoints: in-memory burst
 * protection first (free), then the shared durable window when Supabase
 * is configured.
 */
export function createDurableRateLimiter(
  options: DurableRateLimitOptions,
): AsyncRateLimiter {
  const memory = createMemoryRateLimiter({
    limit: options.limit,
    windowMs: options.windowMs,
  });
  // Resolved lazily on first use so module-load order can never observe
  // an environment that is not fully populated yet.
  let durable: AsyncRateLimiter | null | undefined;

  return {
    async allow(key: string): Promise<boolean> {
      if (!memory.allow(key)) {
        return false;
      }
      if (durable === undefined) {
        durable = createSupabaseRateLimiter(options);
      }
      if (durable) {
        return durable.allow(key);
      }
      return true;
    },
  };
}
