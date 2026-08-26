/**
 * Public site URL resolution.
 *
 * The owner has NOT confirmed a production custom domain yet, so there
 * is deliberately no hardcoded production hostname here — the old
 * placeholder domain is gone and no replacement is guessed. Until a
 * real domain is supplied via NEXT_PUBLIC_SITE_URL, a Vercel
 * production deployment resolves to its actual *.vercel.app host,
 * which is always a URL that really serves the site.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL       — explicit owner-set override, wins
 *  2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production
 *     host (host only, no protocol; provided by Vercel at build time)
 *  3. VERCEL_URL                 — this deployment's generated host
 *     (host only, no protocol)
 *  4. http://localhost:3000      — local development only
 *
 * Used by canonical links, the sitemap, robots, Open Graph and JSON-LD
 * via the single `siteUrl` export in src/lib/site.ts — components must
 * never build an absolute site URL any other way.
 */

/** Add https:// to bare hosts, keep explicit schemes, drop trailing /. */
function normalizeUrl(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

export function resolveSiteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return normalizeUrl(explicit);
  }

  const vercelProduction = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return normalizeUrl(vercelProduction);
  }

  const vercelDeployment = env.VERCEL_URL?.trim();
  if (vercelDeployment) {
    return normalizeUrl(vercelDeployment);
  }

  return "http://localhost:3000";
}
