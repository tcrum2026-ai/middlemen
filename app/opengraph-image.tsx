import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lobby — AI handles the messages, people handle the calls";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07080a",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#19c37d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="26"
              height="26"
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
          <div style={{ color: "#e7eaf1", fontSize: 30, fontWeight: 600 }}>Lobby</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#e7eaf1", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
            Your front desk,
          </div>
          <div style={{ color: "#35d99a", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>handled.</div>
          <div style={{ color: "#aab3c5", fontSize: 30, marginTop: 28, maxWidth: 880, lineHeight: 1.4 }}>
            AI answers every message, books the work and drafts the quote. Phone calls stay with your team —
            briefed and ready.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Books real appointments", "Quotes from your price list", "0 calls answered by AI"].map((chip) => (
            <div
              key={chip}
              style={{
                border: "1px solid #212733",
                borderRadius: 999,
                padding: "10px 20px",
                color: "#aab3c5",
                fontSize: 22,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
