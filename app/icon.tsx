import { ImageResponse } from "next/og";
import { BRAND_GREEN, LOGOMARK_PATH } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_GREEN,
          borderRadius: 7,
        }}
      >
        {/* The same mark as the wordmark, so the tab matches the site. */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#07080a">
          <path d={LOGOMARK_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
