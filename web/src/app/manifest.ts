import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FINN: Financial Investment Agent",
    short_name: "FINN",
    description: "What changed, what the company says, and who you know who can explain it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#121417",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
