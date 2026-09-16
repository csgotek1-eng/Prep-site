import { ImageResponse } from "next/og";
import { siteConfig, siteUrl } from "@/lib/site";

export const alt = `${siteConfig.name}: Fulfilment & Prep Services in Ireland`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/** The owner-supplied master, unmodified. */
const MARK = "/brand/dockentra-logo-mark-transparent.png";

/**
 * The brand mark, as base64, from wherever it can actually be read.
 *
 * THIS ROUTE 500ed IN PRODUCTION TWICE, FOR THE SAME REASON EACH TIME:
 * it read the logo off the filesystem, and Cloudflare Workers has no
 * filesystem.
 *
 * Next prerenders this route at build time, and the finished PNG is
 * stored in the incremental cache — so the first fix was to configure
 * a cache, and it worked. But it only worked while the cache was
 * populated. Purging the cache (a documented, routine step after a
 * configuration change) deleted the one copy of the image and the
 * route could never re-render it: every link preview on WhatsApp,
 * Facebook, LinkedIn, Slack and iMessage broken until the next deploy,
 * with nothing to indicate why.
 *
 * So it no longer depends on a cache or on a disk. At build time the
 * file is on disk and is read directly. At runtime on Workers there is
 * no disk, so it is fetched from this site's own static assets — which
 * are served by Workers Assets from the same deployment, so the bytes
 * are always present and always the deployed version.
 */
async function loadMark(): Promise<string> {
  try {
    // Build time. The dynamic import keeps node:fs out of the Worker
    // bundle's static dependency graph.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    return readFileSync(join(process.cwd(), "public", MARK.slice(1))).toString("base64");
  } catch {
    // Runtime on Workers.
    const response = await fetch(new URL(MARK, siteUrl));
    if (!response.ok) throw new Error(`Could not load the brand mark: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
}

// Open Graph image in the official Dockentra brand system: deep navy
// surface, dark-green → emerald → mint gradient accents, white text, and
// the EXACT official D mark (owner-supplied transparent master,
// unmodified) directly on the navy surface.
export default async function OpenGraphImage() {
  const mark = await loadMark();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0d1730",
          padding: 72,
          color: "#ffffff",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 420,
            height: 420,
            borderRadius: 9999,
            backgroundImage:
              "linear-gradient(135deg, rgba(30,125,97,0.45) 0%, rgba(134,231,174,0.25) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: 10,
            backgroundImage:
              "linear-gradient(90deg, #14533f 0%, #1e7d61 45%, #86e7ae 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <img
            src={`data:image/png;base64,${mark}`}
            alt=""
            width={60}
            height={60}
          />
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.35)",
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 950,
            }}
          >
            Fulfilment &amp; Prep Services in Ireland
          </div>
          <div style={{ fontSize: 32, color: "#86e7ae", maxWidth: 950 }}>
            {siteConfig.tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#8fa0c4" }}>
          Store. Prep. Pack. Ship. Grow.
        </div>
      </div>
    ),
    size,
  );
}
