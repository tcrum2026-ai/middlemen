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
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          background: "#19c37d",
          borderRadius: 7,
          paddingBottom: 8,
        }}
      >
        <div style={{ width: 4, height: 9, background: "#07080a", borderRadius: 2 }} />
        <div style={{ width: 4, height: 16, background: "#07080a", borderRadius: 2 }} />
        <div style={{ width: 4, height: 12, background: "#07080a", borderRadius: 2 }} />
      </div>
    ),
    size,
  );
}
