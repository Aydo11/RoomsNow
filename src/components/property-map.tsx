"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

type AmenityType = "BUS_STOP" | "SHOP" | "JOB_CENTRE" | "PHARMACY";
type Amenity = {
  type: AmenityType;
  name: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
};

const AMENITY_META: Record<AmenityType, { short: string; label: string; className: string }> = {
  BUS_STOP: { short: "BUS", label: "Bus stops", className: "amenity-map-pin--bus" },
  SHOP: { short: "SHOP", label: "Local shops", className: "amenity-map-pin--shop" },
  JOB_CENTRE: { short: "JOB", label: "Job support", className: "amenity-map-pin--job" },
  PHARMACY: { short: "RX", label: "Pharmacies", className: "amenity-map-pin--pharmacy" },
};

export function PropertyMap({
  latitude,
  longitude,
  title,
  approximate,
}: {
  latitude: number;
  longitude: number;
  title: string;
  approximate: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [amenitiesFound, setAmenitiesFound] = useState<number | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const controller = new AbortController();
    let active = true;
    const map = L.map(container.current, {
      center: [latitude, longitude],
      zoom: approximate ? 14 : 15,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    L.marker([latitude, longitude], {
      title,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: "",
        html: '<span class="property-map-pin" aria-hidden="true"></span>',
        iconSize: [34, 42],
        iconAnchor: [17, 42],
      }),
    }).addTo(map);

    async function addNearbyAmenities() {
      try {
        const response = await fetch(`/api/amenities?lat=${latitude}&lng=${longitude}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json() as { amenities?: Amenity[] };
        if (!active) return;
        const amenities = data.amenities ?? [];
        setAmenitiesFound(amenities.length);
        for (const amenity of amenities) {
          const meta = AMENITY_META[amenity.type];
          if (!meta) continue;
          const marker = L.marker([amenity.latitude, amenity.longitude], {
            title: amenity.name,
            icon: L.divIcon({
              className: "",
              html: `<span class="amenity-map-pin ${meta.className}" aria-hidden="true">${meta.short}</span>`,
              iconSize: [42, 28],
              iconAnchor: [21, 14],
            }),
          }).addTo(map);
          const popup = document.createElement("div");
          const name = document.createElement("strong");
          name.textContent = amenity.name;
          const detail = document.createElement("div");
          detail.textContent = `${meta.label.replace(/s$/, "")} · ${amenity.distanceMiles.toFixed(1)} miles away`;
          popup.append(name, detail);
          marker.bindPopup(popup);
        }
      } catch {
        if (active) setAmenitiesFound(0);
      }
    }

    void addNearbyAmenities();
    return () => {
      active = false;
      controller.abort();
      map.remove();
    };
  }, [approximate, latitude, longitude, title]);

  return (
    <div>
      <div
        ref={container}
        className="h-[320px] w-full sm:h-[380px]"
        aria-label={`Map showing ${approximate ? "the approximate area for" : "the location of"} ${title} and nearby amenities`}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-white px-4 py-3 text-[12px] text-ink-soft">
        <span className="font-semibold text-ink">Nearby:</span>
        {Object.values(AMENITY_META).map((item) => (
          <span key={item.short} className="inline-flex items-center gap-1.5">
            <span className={`amenity-legend-dot ${item.className}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-ink-faint">
          {amenitiesFound === null
            ? "Finding useful places…"
            : amenitiesFound
              ? `${amenitiesFound} places shown`
              : "Map labels still available"}
        </span>
      </div>
    </div>
  );
}
