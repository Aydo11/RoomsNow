import type { MetadataRoute } from "next";
import { brand } from "@/brand.config";

/** Lets people add RoomsNow to their home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.name,
    short_name: brand.shortName,
    description: "Find supported accommodation, HMO rooms and move-on homes across the UK.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1666AA",
    categories: ["lifestyle", "utilities"],
    icons: [
      { src: "/app-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search rooms", url: "/search?source=app" },
      { name: "Am I eligible?", url: "/eligibility?source=app" },
      { name: "Messages", url: "/messages?source=app" },
    ],
  };
}
