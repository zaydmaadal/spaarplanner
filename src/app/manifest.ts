import type { MetadataRoute } from "next";

// Colours are the nachtblauw tokens of src/app/globals.css (--color-ground, --color-hero-bg); a manifest cannot use CSS variables.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spaarplanner",
    short_name: "Spaarplanner",
    start_url: "/overzicht",
    display: "standalone",
    background_color: "#F3F6FB",
    theme_color: "#142243",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
