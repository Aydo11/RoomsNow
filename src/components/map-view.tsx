"use client";

import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Leaflet touches `window` at module-evaluation time, so it must be loaded
// dynamically (never a static top-level import) — a static import would run
// during server-side rendering and crash the page.
type LeafletModule = typeof import("leaflet");

export type Pin = {
  id: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  available: number;
  rooms: number;
  sponsored: boolean;
  rentFrom: number | null;
  rentTo: number | null;
};

const UK_CENTRE: [number, number] = [53.0, -1.6];

const price = (from: number | null, to: number | null) => {
  if (from == null) return "POA";
  const low = Math.round(from / 100);
  if (to == null || to === from) return `£${low}`;
  return `£${low}+`;
};

/**
 * OpenStreetMap tiles by default — no key, no account, fine for development and
 * light production use. For heavier traffic set NEXT_PUBLIC_MAP_TILE_URL to a
 * provider you have a contract with; nothing else here changes.
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

/** Grid clustering: at low zoom a screenful of pins becomes a handful of counts. */
function cluster(pins: Pin[], zoom: number) {
  if (zoom >= 13) return pins.map((pin) => ({ kind: "pin" as const, pin }));

  const cellSize = zoom >= 11 ? 0.02 : zoom >= 9 ? 0.08 : zoom >= 7 ? 0.3 : 1;
  const cells = new Map<string, Pin[]>();

  for (const pin of pins) {
    const key = `${Math.floor(pin.latitude / cellSize)}:${Math.floor(pin.longitude / cellSize)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(pin);
    else cells.set(key, [pin]);
  }

  return [...cells.values()].map((group) =>
    group.length === 1
      ? { kind: "pin" as const, pin: group[0] }
      : {
          kind: "cluster" as const,
          count: group.length,
          latitude: group.reduce((sum, p) => sum + p.latitude, 0) / group.length,
          longitude: group.reduce((sum, p) => sum + p.longitude, 0) / group.length,
        },
  );
}

export function MapView({
  pins,
  centre,
  capped,
  total,
}: {
  pins: Pin[];
  centre?: { latitude: number; longitude: number } | null;
  capped?: boolean;
  total?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const leaflet = useRef<LeafletModule | null>(null);
  const fitted = useRef(false);
  const [moved, setMoved] = useState(false);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [ready, setReady] = useState(false);

  // Create the map once, loading Leaflet dynamically first (browser-only).
  useEffect(() => {
    if (!container.current || map.current) return;
    let cancelled = false;

    void (async () => {
      const { default: Leaflet } = await import("leaflet");
      if (cancelled || !container.current || map.current) return;
      leaflet.current = Leaflet;

      const instance = Leaflet.map(container.current, {
        center: centre ? [centre.latitude, centre.longitude] : UK_CENTRE,
        zoom: centre ? 12 : 6,
        scrollWheelZoom: true,
      });

      Leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(instance);
      layer.current = Leaflet.layerGroup().addTo(instance);
      instance.on("moveend", () => setMoved(true));
      map.current = instance;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit to the results the first time they arrive, then leave the view alone.
  useEffect(() => {
    const instance = map.current;
    const Leaflet = leaflet.current;
    if (!instance || !Leaflet || fitted.current || pins.length === 0) return;
    fitted.current = true;
    if (params.get("bbox")) return;

    const bounds = Leaflet.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]));
    instance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    setTimeout(() => setMoved(false), 0);
  }, [pins, params, ready]);

  // Redraw markers whenever the pins or the zoom change.
  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    const Leaflet = leaflet.current;
    if (!instance || !group || !Leaflet) return;

    const draw = () => {
      group.clearLayers();
      for (const item of cluster(pins, instance.getZoom())) {
        if (item.kind === "cluster") {
          Leaflet.marker([item.latitude, item.longitude], {
            icon: Leaflet.divIcon({
              className: "",
              html: `<span class="map-cluster">${item.count}</span>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            }),
          })
            .addTo(group)
            .on("click", () =>
              instance.setView([item.latitude, item.longitude], Math.min(16, instance.getZoom() + 3)),
            );
          continue;
        }

        const { pin } = item;
        Leaflet.marker([pin.latitude, pin.longitude], {
          icon: Leaflet.divIcon({
            className: "",
            html: `<span class="map-pin${pin.available ? "" : " map-pin-full"}${
              pin.sponsored ? " map-pin-sponsored" : ""
            }">${price(pin.rentFrom, pin.rentTo)}</span>`,
            iconSize: [54, 26],
            iconAnchor: [27, 26],
          }),
          title: pin.title,
        })
          .addTo(group)
          .on("click", () => setSelected(pin));
      }
    };

    draw();
    instance.on("zoomend", draw);
    return () => {
      instance.off("zoomend", draw);
    };
  }, [pins, ready]);

  function searchThisArea() {
    const instance = map.current;
    if (!instance) return;
    const bounds = instance.getBounds();
    const next = new URLSearchParams(params.toString());
    next.set(
      "bbox",
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        .map((n) => n.toFixed(4))
        .join(","),
    );
    next.delete("page");
    next.set("view", "map");
    setMoved(false);
    router.push(`/search?${next.toString()}`);
  }

  function clearArea() {
    const next = new URLSearchParams(params.toString());
    next.delete("bbox");
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-line">
      <div ref={container} className="h-[560px] w-full lg:h-[calc(100vh-230px)]" />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {moved && (
            <button onClick={searchThisArea} className="btn-primary shadow-raise">
              Search this area
            </button>
          )}
          {params.get("bbox") && (
            <button onClick={clearArea} className="btn-secondary shadow-raise">
              Clear area
            </button>
          )}
        </div>
      </div>

      {capped && (
        <p className="absolute left-3 top-3 z-[500] max-w-[240px] rounded-[10px] bg-white/95 px-3 py-2 text-[12px] text-ink-soft shadow-raise">
          Showing {pins.length} of {total} adverts. Zoom in and search this area to see the rest.
        </p>
      )}

      {pins.length === 0 && (
        <p className="absolute inset-x-3 top-1/2 z-[500] mx-auto max-w-sm rounded-card border border-line bg-white px-4 py-3 text-center text-[15px] text-ink-soft shadow-raise">
          No adverts with a location in this area yet. Try zooming out or clearing a filter.
        </p>
      )}

      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-[500] rounded-card border border-line bg-white p-4 shadow-raise sm:left-3 sm:right-auto sm:w-80">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-3 top-3 text-[13px] text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
          {selected.sponsored && <span className="text-[12px] font-medium text-clay">Sponsored</span>}
          <h3 className="mt-0.5 pr-6 text-[17px] leading-snug">{selected.title}</h3>
          <p className="mt-1 text-[14px] text-ink-soft">
            {selected.city} · {selected.available} of {selected.rooms} rooms available
          </p>
          <p className="mt-1 text-[15px]">{price(selected.rentFrom, selected.rentTo)} per week</p>
          <a href={`/listings/${selected.id}`} className="btn-primary mt-3 w-full justify-center">
            View advert
          </a>
        </div>
      )}
    </div>
  );
}
