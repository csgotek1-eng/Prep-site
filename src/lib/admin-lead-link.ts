/**
 * The owner email links straight to one lead: /admin/leads#lead-<id>
 * (see adminLeadLink in lib/email/owner-notification.ts). This is the
 * browser half of that link.
 *
 * The id travels in the URL FRAGMENT, which the browser never sends to
 * any server, and it is only a lead id: no name, email or message.
 *
 * If the owner is not signed in (the usual case when the link is opened
 * from the Zoho Mail app on a phone), the leads screen remembers the
 * fragment in sessionStorage before sending them to /admin/login, and
 * the login screen returns them to it afterwards. Only a value that
 * matches LEAD_HASH is ever stored or followed, so this can never
 * become a redirect to somewhere else.
 */

export const LEAD_HASH = /^#lead-([A-Za-z0-9-]{1,100})$/;

const RETURN_KEY = "dockentra.admin.returnToLead";
/** A remembered lead older than this is ignored: the owner moved on. */
export const RETURN_MAX_AGE_MS = 30 * 60 * 1000;

/** The lead id named by a location hash, or null. */
export function leadIdFromHash(hash: string): string | null {
  const match = LEAD_HASH.exec(hash);
  return match ? match[1] : null;
}

/** Remember the lead the owner was sent to, before the sign-in redirect. */
export function rememberLeadForAfterSignIn(hash: string, now = Date.now()): void {
  if (!leadIdFromHash(hash)) return;
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ hash, at: now }));
  } catch {
    // Storage blocked: the owner lands on the default admin screen.
  }
}

/**
 * Where to go after a successful sign-in: the remembered lead (read
 * once, then forgotten, and only if remembered in the last
 * RETURN_MAX_AGE_MS), otherwise the given default.
 */
export function afterSignInPath(fallback: string, now = Date.now()): string {
  let hash: string | null = null;
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    const saved = raw ? (JSON.parse(raw) as { hash?: unknown; at?: unknown }) : null;
    if (
      saved &&
      typeof saved.hash === "string" &&
      typeof saved.at === "number" &&
      now - saved.at >= 0 &&
      now - saved.at <= RETURN_MAX_AGE_MS
    ) {
      hash = saved.hash;
    }
  } catch {
    hash = null;
  }
  return hash && leadIdFromHash(hash) ? `/admin/leads${hash}` : fallback;
}
