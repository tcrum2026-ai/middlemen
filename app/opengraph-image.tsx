import { ImageResponse } from "next/og";
import { BRAND_GREEN, LOGOMARK_PATH } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lobby — an AI front desk that answers the messages and the phone";

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
              background: BRAND_GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#07080a">
              <path d={LOGOMARK_PATH} />
            </svg>
          </div>
          <div style={{ color: "#e7eaf1", fontSize: 30, fontWeight: 600 }}>Lobby</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#e7eaf1", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
            Nobody waits
          </div>
          <div style={{ color: "#35d99a", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>in the lobby.</div>
          <div style={{ color: "#aab3c5", fontSize: 30, marginTop: 28, maxWidth: 880, lineHeight: 1.4 }}>
            An AI front desk that answers the chat, the email, the texts and the phone — booking and quoting from
            your own prices.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Answers the phone", "Books real appointments", "Transfers when asked"].map((chip) => (
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
