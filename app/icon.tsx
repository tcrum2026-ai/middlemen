import { ImageResponse } from "next/og";

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
          background: "#19c37d",
          borderRadius: 7,
        }}
      >
        {/* The same doorway as the wordmark, so the tab matches the site. */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#07080a"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 20v-8a6 6 0 0 1 12 0v8" />
          <path d="M3.5 20h17" />
        </svg>
      </div>
    ),
    size,
  );
}
