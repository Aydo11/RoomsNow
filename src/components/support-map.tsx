"use client";

import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { useEffect, useRef } from "react";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

export type SupportPin = {
  id: string;
  name: string;
  organisation: string;
  href?: string;
  address: string;
  latitude: number;
  longitude: number;
};

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Map of support service locations, each pin with its address and a directions link. */
export function SupportMap({ pins, height = 360 }: { pins: SupportPin[]; height?: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || pins.length === 0) return;
    let active = true;
    let map: L.Map | undefined;
    void (async () => {
      const { default: Leaflet } = await import("leaflet");
      if (!active || !container.current) return;
      map = Leaflet.map(container.current, { scrollWheelZoom: false });
      Leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      const icon = Leaflet.divIcon({ className: "", html: '<span class="property-map-pin" aria-hidden="true"></span>', iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -36] });
      for (const pin of pins) {
        const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pin.address)}`;
        Leaflet.marker([pin.latitude, pin.longitude], { icon, title: `${pin.organisation} – ${pin.name}` })
          .bindPopup(
            `<strong>${escape(pin.organisation)}</strong><br>${escape(pin.name)}<br><span style="color:#5b6b80">${escape(pin.address)}</span><br>` +
              `<a href="${directions}" target="_blank" rel="noopener">Directions</a>${pin.href ? ` · <a href="${escape(pin.href)}">Details</a>` : ""}`,
          )
          .addTo(map);
      }
      if (pins.length === 1) map.setView([pins[0].latitude, pins[0].longitude], 15);
      else map.fitBounds(Leaflet.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])), { padding: [40, 40], maxZoom: 14 });
    })();
    return () => {
      active = false;
      map?.remove();
    };
  }, [pins]);

  if (pins.length === 0) return null;
  return <div ref={container} style={{ height }} className="w-full" role="region" aria-label="Map of support service locations" />;
}
