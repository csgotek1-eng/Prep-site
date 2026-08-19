import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — Fulfilment & Prep Services in Ireland`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Open Graph image for link previews (Slack, WhatsApp, LinkedIn, X, etc.).
// Dockcentra-only branding — no marketplace logos. Generated at build time,
// so no binary asset needs to be committed. To use a designed graphic
// instead, place it in public/og/ and reference it from layout metadata
// (see docs/BRAND_ASSETS.md).
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0f172a",
          backgroundImage:
            "linear-gradient(135deg, #0f172a 0%, #134e4a 100%)",
          padding: 72,
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#059669",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 950,
            }}
          >
            Fulfilment &amp; Prep Services in Ireland
          </div>
          <div style={{ fontSize: 32, color: "#a7f3d0", maxWidth: 950 }}>
            {siteConfig.tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
          Store. Prep. Pack. Ship. Grow.
        </div>
      </div>
    ),
    size,
  );
}
