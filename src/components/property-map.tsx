"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

export function PropertyMap({ latitude, longitude, title, approximate }: { latitude: number; longitude: number; title: string; approximate: boolean }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { center: [latitude, longitude], zoom: approximate ? 14 : 16, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    L.marker([latitude, longitude], {
      title,
      icon: L.divIcon({ className: "", html: '<span class="property-map-pin" aria-hidden="true"></span>', iconSize: [34, 42], iconAnchor: [17, 42] }),
    }).addTo(map);
    return () => {
      map.remove();
    };
  }, [approximate, latitude, longitude, title]);

  return <div ref={container} className="h-[320px] w-full sm:h-[380px]" aria-label={`Map showing ${approximate ? "the approximate area for" : "the location of"} ${title}`} />;
}
