import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Apple touch icon: same neutral Dockcentra "D" mark as the favicon.
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
          backgroundColor: "#059669",
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
