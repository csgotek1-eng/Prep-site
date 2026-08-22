import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — Fulfilment & Prep Services in Ireland`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Open Graph image in the official Dockentra brand system: deep navy
// surface, dark-green → emerald → mint gradient accents, white text, and
// the EXACT official D mark (owner-supplied transparent master,
// unmodified) directly on the navy surface. Generated statically at
// build time.
export default function OpenGraphImage() {
  const mark = readFileSync(
    join(process.cwd(), "public", "brand", "dockentra-logo-mark-transparent.png"),
  ).toString("base64");

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
            width={80}
            height={80}
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
