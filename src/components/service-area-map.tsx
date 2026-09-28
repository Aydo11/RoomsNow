"use client";

import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { useEffect, useRef } from "react";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

export function ServiceAreaMap({ latitude, longitude, name, radiusMiles }: { latitude: number; longitude: number; name: string; radiusMiles: number | null }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let active = true;
    let map: L.Map | undefined;

    void (async () => {
      const { default: Leaflet } = await import("leaflet");
      if (!active || !container.current) return;
      map = Leaflet.map(container.current, { center: [latitude, longitude], zoom: radiusMiles && radiusMiles > 20 ? 8 : radiusMiles && radiusMiles > 8 ? 9 : 11, scrollWheelZoom: false });
      Leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      if (radiusMiles) {
        Leaflet.circle([latitude, longitude], {
          radius: radiusMiles * 1609.344,
          color: "#1773b0",
          fillColor: "#4ba3dc",
          fillOpacity: 0.14,
          weight: 2,
        }).addTo(map);
      }
      Leaflet.marker([latitude, longitude], {
        title: `${name} service base (approximate)`,
        icon: Leaflet.divIcon({ className: "", html: '<span class="property-map-pin" aria-hidden="true"></span>', iconSize: [34, 42], iconAnchor: [17, 42] }),
      }).addTo(map);
    })();

    return () => {
      active = false;
      map?.remove();
    };
  }, [latitude, longitude, name, radiusMiles]);

  return <div ref={container} className="h-[280px] w-full sm:h-[340px]" aria-label={`Map showing the approximate service area for ${name}`} />;
}
