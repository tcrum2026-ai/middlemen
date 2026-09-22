import type { MetadataRoute } from "next";
import { BRAND_GREEN } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lobby — the AI assistant that runs your front desk",
    short_name: "Lobby",
    description:
      "Lobby answers your messages, books your jobs, qualifies your leads and drafts your quotes.",
    start_url: "/",
    display: "standalone",
    background_color: "#07080a",
    theme_color: BRAND_GREEN,
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
