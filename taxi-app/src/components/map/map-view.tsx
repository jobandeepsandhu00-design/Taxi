"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MLMap, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import districts from "@/data/wien-bezirke.json";

export interface MapMarker {
  coord: [number, number];
  color: string;
  label?: string;
}

interface Props {
  /** Tipp auf die Karte (für „Wo liegt …?“) */
  onPick?: (coord: [number, number]) => void;
  onDistrictClick?: (no: number) => void;
  markers?: MapMarker[];
  /** Verbindungslinie, z. B. Tipp → richtiger Ort */
  line?: [number, number][] | null;
  /** Beherrschung je Bezirk (0–100) → Farbe */
  heat?: Record<number, number>;
  highlightDistrict?: number | null;
  /** Route, die ein Taxi animiert abfährt */
  route?: [number, number][] | null;
  routeKey?: string;
  focus?: "wien" | "ring";
  className?: string;
}

const VIENNA_BOUNDS: [[number, number], [number, number]] = [
  [16.18, 48.118],
  [16.575, 48.323],
];
const RING_BOUNDS: [[number, number], [number, number]] = [
  [16.354, 48.198],
  [16.389, 48.219],
];

function buildStyle(dark: boolean): StyleSpecification {
  const c = dark
    ? { bg: "#0b0f1a", water: "#16294a", road: "#2a3350", major: "#3b4566", building: "#121a2c" }
    : { bg: "#f3efe6", water: "#bcd4ea", road: "#ffffff", major: "#f5d68a", building: "#e6e0d3" };
  return {
    version: 8,
    // Vektorkacheln von OpenFreeMap (OpenStreetMap-Daten, ohne API-Schlüssel). Bewusst ohne Beschriftung – sonst wäre das Quiz zu leicht.
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap" } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": c.bg } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": c.water } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", paint: { "line-color": c.water, "line-width": 1.5 } },
      { id: "building", type: "fill", source: "omt", "source-layer": "building", minzoom: 14, paint: { "fill-color": c.building } },
      {
        id: "roads",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "tertiary", "secondary"]]],
        paint: { "line-color": c.road, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 16, 3] },
      },
      {
        id: "roads-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["primary", "trunk", "motorway"]]],
        paint: { "line-color": c.major, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 16, 5] },
      },
    ],
  };
}

function heatColor(v: number | undefined): string {
  if (v === undefined) return "rgba(148,163,184,0.10)";
  if (v >= 80) return "rgba(34,197,94,0.55)";
  if (v >= 40) return "rgba(255,196,0,0.5)";
  return "rgba(239,68,68,0.42)";
}

/** MapLibre-Karte von Wien mit Bezirksgrenzen, Heatmap, Markern und Taxi-Animation. */
export default function MapView({ onPick, onDistrictClick, markers = [], line, heat, highlightDistrict, route, routeKey, focus = "wien", className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const taxi = useRef<maplibregl.Marker | null>(null);
  const handlers = useRef({ onPick, onDistrictClick });
  handlers.current = { onPick, onDistrictClick };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const dark = document.documentElement.classList.contains("dark");
    let m: MLMap;
    try {
      m = new maplibregl.Map({
      container: container.current,
      style: buildStyle(dark),
      bounds: focus === "ring" ? RING_BOUNDS : VIENNA_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 17,
      minZoom: 9,
      });
    } catch {
      // z. B. kein WebGL verfügbar
      setFailed(true);
      return;
    }
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Bezirksgrenzen: Statistik Austria (CC BY 4.0)" }));
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Eigene Ebenen schon nach dem Stil laden – unabhängig davon, ob die Hintergrundkacheln erreichbar sind
    m.once("style.load", () => {
      m.addSource("districts", { type: "geojson", data: districts as GeoJSON.FeatureCollection });
      m.addLayer({ id: "district-fill", type: "fill", source: "districts", paint: { "fill-color": ["coalesce", ["feature-state", "color"], "rgba(148,163,184,0.06)"], "fill-opacity": 1 } });
      m.addLayer({
        id: "district-line",
        type: "line",
        source: "districts",
        paint: {
          "line-color": ["case", ["boolean", ["feature-state", "highlight"], false], "#ffc400", dark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.35)"],
          "line-width": ["case", ["boolean", ["feature-state", "highlight"], false], 3, 1],
        },
      });
      m.addSource("line", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "line", type: "line", source: "line", paint: { "line-color": "#ffc400", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
      m.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#ffc400", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 } });
      m.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffc400", "line-width": 4 } });
      setReady(true);
    });
    m.on("error", () => {
      /* Kachelfehler ignorieren – Bezirke bleiben sichtbar */
    });
    m.on("click", (e) => {
      handlers.current.onPick?.([e.lngLat.lng, e.lngLat.lat]);
      if (handlers.current.onDistrictClick) {
        const f = m.queryRenderedFeatures(e.point, { layers: ["district-fill"] })[0];
        if (f?.id != null) handlers.current.onDistrictClick(Number(f.id));
      }
    });
    m.getCanvas().style.cursor = "crosshair";
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [focus]);

  // Heatmap + Hervorhebung
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (let no = 1; no <= 23; no++) {
      m.setFeatureState({ source: "districts", id: no }, { color: heat ? heatColor(heat[no]) : undefined, highlight: highlightDistrict === no });
    }
  }, [heat, highlightDistrict, ready]);

  // Marker
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    markerRefs.current.forEach((mk) => mk.remove());
    markerRefs.current = markers.map((mk) => {
      // Äußeres Element wird von MapLibre positioniert (transform) – die Nadel-Optik sitzt im inneren Element
      const el = document.createElement("div");
      const pin = document.createElement("div");
      pin.className = "map-pin";
      pin.style.setProperty("--pin", mk.color);
      el.appendChild(pin);
      if (mk.label) el.title = mk.label;
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(mk.coord).addTo(m);
    });
  }, [markers, ready]);

  // Verbindungslinie
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource("line") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: line && line.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } }] : [],
    });
    if (line && line.length > 1) {
      const b = line.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(line[0], line[0]));
      m.fitBounds(b, { padding: 80, maxZoom: 15, duration: 900 });
    }
  }, [line, ready]);

  // Taxi fährt die Route ab (Linie zeichnet sich mit)
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource("route") as GeoJSONSource;
    taxi.current?.remove();
    if (!route || route.length < 2) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const el = document.createElement("div");
    el.className = "map-taxi";
    el.textContent = "🚕";
    taxi.current = new maplibregl.Marker({ element: el }).setLngLat(route[0]).addTo(m);
    const seg = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 3200;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      let dist = eased * total;
      const drawn: [number, number][] = [route[0]];
      let pos = route[0];
      for (let i = 0; i < seg.length; i++) {
        if (dist >= seg[i]) {
          dist -= seg[i];
          pos = route[i + 1];
          drawn.push(pos);
        } else {
          const f = seg[i] ? dist / seg[i] : 0;
          pos = [route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f];
          drawn.push(pos);
          break;
        }
      }
      taxi.current?.setLngLat(pos);
      src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: drawn } });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [route, routeKey, ready]);

  if (failed) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground`}>
        Die Karte kann auf diesem Gerät nicht angezeigt werden (WebGL wird nicht unterstützt).
      </div>
    );
  }
  return <div ref={container} className={className} role="application" aria-label="Karte von Wien" data-ready={ready ? "true" : "false"} />;
}
