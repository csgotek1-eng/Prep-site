import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Apple touch icon in the official Dockentra brand palette (dark green →
// emerald → mint gradient, white D). Interim generated treatment until the
// approved logo mark file is supplied — see docs/BRAND_SYSTEM.md.
// iOS applies its own corner mask, so the background stays square.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(135deg, #14533f 0%, #1e7d61 55%, #86e7ae 100%)",
          color: "#ffffff",
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        D
      </div>
    ),
    size,
  );
}
