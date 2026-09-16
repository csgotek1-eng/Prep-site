import "server-only";

/**
 * CLOUDFLARE TURNSTILE, VERIFIED ON THE SERVER.
 *
 * Every public form on this site writes a durable row and, on most of
 * them, sends the owner an email. The honeypot in front of each one
 * stops a naive bot and nothing else: a script that reads the form and
 * skips the hidden field walks straight through, and the rate limiter
 * only decides how fast it may do so. Turnstile is the layer that asks
 * whether there is a browser behind the submission at all.
 *
 * A token from the widget proves nothing until Cloudflare confirms it,
 * so the browser's word is never taken: the token goes to siteverify
 * from here, before anything is stored or sent.
 *
 * TWO DELIBERATE DEGRADATIONS, AND THEY ARE NOT THE SAME DECISION.
 *
 * 1. NO SECRET CONFIGURED means verification is SKIPPED and the
 *    submission proceeds. The site ships before the owner has created
 *    a Turnstile widget, and a bot-protection feature that takes the
 *    contact form down on the day it merges is worse than no bot
 *    protection. The browser half agrees: with no site key, the widget
 *    renders nothing and sends no token, so the two halves are never
 *    half-enabled in opposite directions.
 *
 * 2. SECRET CONFIGURED BUT CLOUDFLARE UNREACHABLE means we FAIL OPEN:
 *    the submission still proceeds, and a structured warning is
 *    logged. This is the uncomfortable one, and it is chosen on
 *    purpose: capturing
 *    enquiries is the only job this site has, and an outage at a third
 *    party must never be able to close the front door. Failing closed
 *    would trade a handful of spam rows for every real lead that
 *    arrived during the outage. The warning is the compensating
 *    control, so the choice is visible in the logs rather than silent.
 *
 * A token that Cloudflare actively REJECTS is a different thing
 * entirely and is refused: that is an answer, not an absence of one.
 *
 * Neither the secret nor the token is ever logged. The token is a
 * short-lived bearer value and the secret is a credential, and a log
 * line carrying either is the leak this module exists to avoid.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare answers in well under a second in normal operation. The
// budget is generous rather than tight because the penalty for being
// slightly slow is a delayed form, and the penalty for timing out too
// eagerly is the fail-open path above being taken for no real reason.
const VERIFY_TIMEOUT_MS = 8_000;

export type TurnstileFailureReason =
  | "missing"
  | "invalid"
  | "expired"
  | "unavailable";

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: TurnstileFailureReason };

/** The message a visitor sees for each way the check can go wrong. */
const REJECTION_MESSAGE: Record<TurnstileFailureReason, string> = {
  missing:
    "Please complete the security check below the form, then send it again.",
  invalid:
    "The security check didn't pass. Please complete it again and resend.",
  expired:
    "The security check expired while the form was open. Please complete it again and resend.",
  // Never shown: "unavailable" is the fail-open path and no route turns
  // it into a rejection. It exists so the map is total and a future
  // caller that DOES refuse an outage has honest words ready.
  unavailable:
    "We couldn't run the security check just now. Please try again in a moment.",
};

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

/**
 * The raw answer, including "unavailable". Callers that want the
 * site's fail-open policy should use enforceTurnstile() rather than
 * deciding for themselves what an outage means.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true };

  const response = typeof token === "string" ? token.trim() : "";
  // No token, no round trip: Cloudflare would only tell us what we can
  // already see, and a bot posting an empty body should not be able to
  // spend our siteverify budget.
  if (!response) return { ok: false, reason: "missing" };

  const form = new URLSearchParams({ secret, response });
  // Cloudflare uses the IP to score the challenge; it is optional, and
  // an unparseable or absent one must never become the string
  // "undefined" in the request body.
  if (remoteIp) form.set("remoteip", remoteIp);

  let payload: { success?: unknown; "error-codes"?: unknown };
  try {
    const result = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!result.ok) {
      // The status, and nothing else. A body from a failing endpoint is
      // untrusted text of unknown length, and we sent it our secret.
      console.warn(
        `turnstile: siteverify answered HTTP ${result.status}; verification skipped.`,
      );
      return { ok: false, reason: "unavailable" };
    }
    payload = (await result.json()) as typeof payload;
  } catch (cause) {
    // The error TYPE only. Anything richer risks echoing the request,
    // and the request carries the secret.
    console.warn(
      `turnstile: siteverify unreachable (${
        cause instanceof Error ? cause.name : "unknown"
      }); verification skipped.`,
    );
    return { ok: false, reason: "unavailable" };
  }

  if (payload.success === true) return { ok: true };

  const codes = Array.isArray(payload["error-codes"])
    ? payload["error-codes"].filter(
        (code): code is string => typeof code === "string",
      )
    : [];
  return { ok: false, reason: reasonFromErrorCodes(codes) };
}

/**
 * Cloudflare's codes, narrowed to the three things a visitor can do
 * something about.
 *
 * "timeout-or-duplicate" is the one worth naming: it is not an attack,
 * it is somebody who left the page open past the token's five minutes,
 * or who hit send twice. Telling them their check "failed" would be a
 * lie about their own browser, so it maps to "expired" and the form
 * asks them to tick it again.
 *
 * A misconfigured SECRET (missing-input-secret, invalid-input-secret)
 * is our fault, not the visitor's, and lands on "unavailable" so the
 * fail-open path carries the submission rather than a real person
 * being blamed for our deployment.
 */
function reasonFromErrorCodes(codes: string[]): TurnstileFailureReason {
  if (codes.includes("timeout-or-duplicate")) return "expired";
  if (codes.includes("missing-input-response")) return "missing";
  if (
    codes.includes("invalid-input-response") ||
    codes.includes("bad-request")
  ) {
    return "invalid";
  }
  if (
    codes.includes("missing-input-secret") ||
    codes.includes("invalid-input-secret") ||
    codes.includes("internal-error")
  ) {
    console.warn(
      `turnstile: siteverify refused our own credentials (${codes.join(
        ",",
      )}); verification skipped.`,
    );
    return "unavailable";
  }
  // An unrecognised code with success:false is still a refusal, and
  // treating an unknown refusal as a pass is how a check stops being
  // one.
  return "invalid";
}

/**
 * The check every public POST route runs, with this site's policy
 * already applied: a REFUSAL blocks, an OUTAGE does not.
 *
 * Returns the visitor-facing message rather than a reason code so the
 * routes stay adapters and the wording lives in one file.
 */
export async function enforceTurnstile(
  token: unknown,
  remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await verifyTurnstileToken(
    typeof token === "string" ? token : null,
    remoteIp,
  );
  if (result.ok) return { ok: true };
  if (result.reason === "unavailable") return { ok: true };
  return { ok: false, error: REJECTION_MESSAGE[result.reason] };
}

/**
 * The caller's IP as Cloudflare sees it. CF-Connecting-IP is set by
 * the edge on every request that reaches this Worker and cannot be
 * spoofed from outside; the x-forwarded-for fallback is for local
 * development only, where nothing is verifying anything anyway.
 */
export function turnstileRemoteIp(request: Request): string | null {
  const direct = request.headers.get("cf-connecting-ip");
  if (direct) return direct.trim().slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  return forwarded.split(",")[0]?.trim().slice(0, 64) || null;
}
