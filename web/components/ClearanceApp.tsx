"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import {
  intersectCounties,
  scoreClearance,
  type ClearanceScore,
  type CountyHit,
} from "@/lib/api";
import { DRAW_STYLES } from "@/lib/drawStyles";
import { decodeShare, encodeShare } from "@/lib/share";
import { ResultsPanel } from "@/components/ResultsPanel";

const FUELS = ["SOL", "WIN", "GAS", "OTH", "BAT"] as const;

/** [[west, south], [east, north]] — Texas extent. */
const TEXAS_BOUNDS: [[number, number], [number, number]] = [
  [-106.65, 25.84],
  [-93.51, 36.5],
];

/** Raster Positron-style basemap (same look as before; more reliable than remote GL JSON). */
const CARTO_LIGHT_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 18,
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

function patchDrawForMapLibre(draw: typeof MapboxDraw) {
  const classes = (draw as unknown as { constants?: { classes?: Record<string, string> } })
    .constants?.classes;
  if (!classes) return;
  classes.CANVAS = "maplibregl-canvas";
  classes.CONTROL_BASE = "maplibregl-ctrl";
  classes.CONTROL_PREFIX = "maplibregl-ctrl-";
  classes.CONTROL_GROUP = "maplibregl-ctrl-group";
}

function featurePolygon(
  feature: GeoJSON.Feature | undefined,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const g = feature?.geometry;
  if (!g) return null;
  if (g.type === "Polygon" || g.type === "MultiPolygon") return g;
  return null;
}

type CountiesFc = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { name: string; geoid?: string }
>;

function labelMapControls(root: HTMLElement | null) {
  if (!root) return;
  const pairs: [string, string][] = [
    [".mapbox-gl-draw_polygon", "Draw search area"],
    [".mapbox-gl-draw_trash", "Delete search area"],
    [".maplibregl-ctrl-zoom-in", "Zoom in"],
    [".maplibregl-ctrl-zoom-out", "Zoom out"],
  ];
  for (const [sel, label] of pairs) {
    root.querySelectorAll(sel).forEach((el) => {
      if (el instanceof HTMLElement) {
        el.setAttribute("aria-label", label);
        el.setAttribute("title", label);
      }
    });
  }
}

export function ClearanceApp() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const polygonRef = useRef<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>(null);
  const countiesFcRef = useRef<CountiesFc | null>(null);

  const [mode, setMode] = useState<"gen" | "load">("gen");
  const [mw, setMw] = useState("200");
  const [fuel, setFuel] = useState<string>("SOL");
  const [hasPolygon, setHasPolygon] = useState(false);
  const [countyHits, setCountyHits] = useState<CountyHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<ClearanceScore | null>(null);
  const [copied, setCopied] = useState(false);
  /** Full controls only after a search area exists (and until user hides them). */
  const [hudOpen, setHudOpen] = useState(false);
  const [countyNames, setCountyNames] = useState<string[]>([]);
  const [pickedCounty, setPickedCounty] = useState("");
  const [coarsePointer, setCoarsePointer] = useState(false);
  const restored = useRef(false);
  const countyHitsRef = useRef<CountyHit[]>([]);
  const hudOpenRef = useRef(false);
  const intersectSeq = useRef(0);
  const lastFitKey = useRef("");

  useEffect(() => {
    hudOpenRef.current = hudOpen;
  }, [hudOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/tx_counties.geojson")
      .then((r) => r.json())
      .then((fc: CountiesFc) => {
        if (cancelled) return;
        countiesFcRef.current = fc;
        const names = fc.features
          .map((f) => f.properties?.name)
          .filter((n): n is string => !!n)
          .sort((a, b) => a.localeCompare(b));
        setCountyNames(names);
      })
      .catch(() => {
        /* county picker optional if asset missing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fitTexas = useCallback((animate = false) => {
    const map = mapRef.current;
    if (!map) return;
    const left = hudOpenRef.current ? 380 : 18;
    map.fitBounds(TEXAS_BOUNDS, {
      padding: { top: 18, bottom: 18, left, right: 18 },
      animate,
    });
  }, []);

  const paintCounties = useCallback((hits: CountyHit[]) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const overlapFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: hits
        .filter((h) => h.geometry?.type === "Polygon" || h.geometry?.type === "MultiPolygon")
        .map((h) => ({
          type: "Feature" as const,
          properties: { name: h.name, coverage: h.coverage ?? null },
          geometry: h.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
        })),
    };
    const countyFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: hits
        .filter((h) => {
          const g = h.county_geometry || h.geometry;
          return g?.type === "Polygon" || g?.type === "MultiPolygon";
        })
        .map((h) => ({
          type: "Feature" as const,
          properties: { name: h.name },
          geometry: (h.county_geometry || h.geometry) as GeoJSON.Polygon | GeoJSON.MultiPolygon,
        })),
    };

    for (const id of [
      "county-hits-line",
      "county-bounds-line",
      "county-bounds-halo",
      "county-hits-fill",
      "county-bounds-fill",
    ]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }

    const upsertSource = (id: string, data: GeoJSON.FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data);
      else map.addSource(id, { type: "geojson", data });
    };
    upsertSource("county-hits", overlapFc);
    upsertSource("county-bounds", countyFc);

    if (hits.length === 0) return;

    // Always (re)add on top of Draw/mask so delete→redraw never hides them.
    map.addLayer({
      id: "county-bounds-fill",
      type: "fill",
      source: "county-bounds",
      paint: { "fill-color": "#1a6b45", "fill-opacity": 0.14 },
    });
    map.addLayer({
      id: "county-hits-fill",
      type: "fill",
      source: "county-hits",
      paint: { "fill-color": "#ffb020", "fill-opacity": 0.35 },
    });
    map.addLayer({
      id: "county-bounds-halo",
      type: "line",
      source: "county-bounds",
      paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.9 },
    });
    map.addLayer({
      id: "county-bounds-line",
      type: "line",
      source: "county-bounds",
      paint: {
        "line-color": "#0d4a2e",
        "line-width": 2.5,
        "line-dasharray": [2, 1.5],
        "line-opacity": 1,
      },
    });
    map.addLayer({
      id: "county-hits-line",
      type: "line",
      source: "county-hits",
      paint: {
        "line-color": "#8a5a00",
        "line-width": 2.5,
        "line-opacity": 1,
      },
    });
  }, []);

  // Keep highlights in sync with React state (survives Draw layer rebuilds).
  useEffect(() => {
    paintCounties(countyHits);
    const map = mapRef.current;
    if (!map || countyHits.length === 0) {
      if (countyHits.length === 0) lastFitKey.current = "";
      return;
    }

    const fitKey = countyHits
      .map((h) => h.name)
      .sort()
      .join("|");
    if (fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;

    // Frame matched counties so highlights aren't a speck on the TX overview.
    const bounds = new maplibregl.LngLatBounds();
    let hasCoord = false;
    for (const hit of countyHits) {
      const g = hit.county_geometry || hit.geometry;
      if (!g) continue;
      const rings =
        g.type === "Polygon" ? g.coordinates : g.coordinates.flatMap((poly) => poly);
      for (const ring of rings) {
        for (const pos of ring) {
          bounds.extend(pos as [number, number]);
          hasCoord = true;
        }
      }
    }
    if (hasCoord && !bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 48, bottom: 48, left: hudOpenRef.current ? 400 : 48, right: 48 },
        maxZoom: 9,
        animate: true,
      });
    }
  }, [countyHits, paintCounties]);

  const resolveCounties = useCallback(
    async (poly: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) => {
      const seq = ++intersectSeq.current;
      if (!poly) {
        countyHitsRef.current = [];
        setCountyHits([]);
        return;
      }
      try {
        const hits = await intersectCounties(poly);
        if (seq !== intersectSeq.current) return; // stale delete/redraw
        countyHitsRef.current = hits;
        setCountyHits(hits);
        if (hits.length === 0) {
          setError("Polygon does not meaningfully overlap any Texas county.");
        }
      } catch (e) {
        if (seq !== intersectSeq.current) return;
        countyHitsRef.current = [];
        setCountyHits([]);
        setError(e instanceof Error ? e.message : "County lookup failed");
        hudOpenRef.current = true;
        setHudOpen(true);
      }
    },
    [],
  );

  const setPolygon = useCallback(
    (poly: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) => {
      polygonRef.current = poly;
      setHasPolygon(!!poly);
      setScore(null);
      setError(null);
      if (poly) {
        hudOpenRef.current = true;
        setHudOpen(true);
      } else {
        hudOpenRef.current = false;
        setHudOpen(false);
      }
      void resolveCounties(poly);
    },
    [resolveCounties],
  );

  const syncFromDraw = useCallback(
    (keepIds?: Set<string | number>) => {
      const draw = drawRef.current;
      if (!draw) return;
      const polys = draw
        .getAll()
        .features.filter(
          (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
        );
      if (polys.length === 0) {
        setPolygon(null);
        return;
      }
      // Keep only the newest (or the feature(s) just created); drop the rest.
      let keep =
        keepIds && keepIds.size > 0
          ? polys.filter((f) => f.id != null && keepIds.has(f.id))
          : [];
      if (keep.length === 0) keep = [polys[polys.length - 1]];
      const keepSet = new Set(keep.map((f) => f.id));
      for (const f of polys) {
        if (f.id != null && !keepSet.has(f.id)) {
          try {
            draw.delete(String(f.id));
          } catch {
            /* already gone */
          }
        }
      }
      setPolygon(featurePolygon(keep[keep.length - 1]));
    },
    [setPolygon],
  );

  /** Starting a new draw: remove any finished polygon so only the draft remains. */
  const clearFinishedPolygons = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    const polys = draw
      .getAll()
      .features.filter(
        (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
      );
    if (polys.length === 0) return;
    for (const f of polys) {
      if (f.id != null) {
        try {
          draw.delete(String(f.id));
        } catch {
          /* already gone */
        }
      }
    }
    setPolygon(null);
    setPickedCounty("");
  }, [setPolygon]);

  const applySearchPolygon = useCallback(
    (poly: GeoJSON.Polygon | GeoJSON.MultiPolygon, countyName?: string) => {
      const draw = drawRef.current;
      const map = mapRef.current;
      if (draw) {
        draw.deleteAll();
        draw.add({
          type: "Feature",
          properties: {},
          geometry: poly,
        });
      }
      setPickedCounty(countyName ?? "");
      setPolygon(poly);
      if (map) {
        const bounds = new maplibregl.LngLatBounds();
        const rings =
          poly.type === "Polygon" ? poly.coordinates : poly.coordinates.flatMap((r) => r);
        for (const ring of rings) {
          for (const c of ring) bounds.extend(c as [number, number]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: { top: 48, bottom: 48, left: hudOpenRef.current ? 400 : 48, right: 48 },
            maxZoom: 9,
            animate: true,
          });
        }
      }
    },
    [setPolygon],
  );

  const onPickCounty = useCallback(
    (name: string) => {
      if (!name) return;
      const fc = countiesFcRef.current;
      const feat = fc?.features.find((f) => f.properties?.name === name);
      const geom = feat?.geometry;
      if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
        setError("Could not load that county boundary.");
        return;
      }
      setError(null);
      hudOpenRef.current = true;
      setHudOpen(true);
      applySearchPolygon(geom, name);
    },
    [applySearchPolygon],
  );

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const node = mapNode.current;

    (async () => {
      // Preload mask/outline so load handler can add layers synchronously (avoids Strict Mode races).
      let maskGeo: GeoJSON.Feature | GeoJSON.FeatureCollection | null = null;
      let outlineGeo: GeoJSON.Feature | GeoJSON.FeatureCollection | null = null;
      try {
        const [maskRes, outlineRes] = await Promise.all([
          fetch("/texas-mask.geojson?v=3"),
          fetch("/texas-outline.geojson?v=3"),
        ]);
        if (maskRes.ok) maskGeo = await maskRes.json();
        if (outlineRes.ok) outlineGeo = await outlineRes.json();
      } catch {
        /* optional */
      }
      if (cancelled || !node) return;

      const waitForSize = () =>
        new Promise<void>((resolve) => {
          const tick = () => {
            if (cancelled) return resolve();
            if (node.clientWidth >= 32 && node.clientHeight >= 32) return resolve();
            window.requestAnimationFrame(tick);
          };
          tick();
        });
      await waitForSize();
      if (cancelled || mapRef.current) return;

      patchDrawForMapLibre(MapboxDraw);

      const map = new maplibregl.Map({
        container: node,
        style: CARTO_LIGHT_STYLE,
        bounds: TEXAS_BOUNDS,
        fitBoundsOptions: { padding: 18 },
        maxBounds: [
          [TEXAS_BOUNDS[0][0] - 10, TEXAS_BOUNDS[0][1] - 8],
          [TEXAS_BOUNDS[1][0] + 10, TEXAS_BOUNDS[1][1] + 8],
        ],
        minZoom: 3,
        maxZoom: 16,
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const ensureTexasLayers = () => {
        if (cancelled || mapRef.current !== map || !map.isStyleLoaded()) return;
        try {
          if (maskGeo && !map.getSource("texas-mask")) {
            map.addSource("texas-mask", { type: "geojson", data: maskGeo });
            map.addLayer({
              id: "texas-mask-fill",
              type: "fill",
              source: "texas-mask",
              paint: { "fill-color": "#eceae4", "fill-opacity": 1 },
            });
          }
          if (outlineGeo && !map.getSource("texas-outline")) {
            map.addSource("texas-outline", { type: "geojson", data: outlineGeo });
            map.addLayer({
              id: "texas-outline-line",
              type: "line",
              source: "texas-outline",
              paint: { "line-color": "#121314", "line-width": 1.25 },
            });
          }
          // Re-apply highlights after style/mask is ready.
          paintCounties(countyHitsRef.current);
        } catch (err) {
          console.error("texas layers", err);
        }
      };

      const onReady = () => {
        if (cancelled || mapRef.current !== map) return;
        map.resize();
        fitTexas(false);
        // Mask first (above basemap), then draw so polygons stay interactive on top.
        ensureTexasLayers();

        if (!drawRef.current) {
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            defaultMode: "draw_polygon",
            styles: DRAW_STYLES,
          });
          map.addControl(draw as unknown as maplibregl.IControl, "bottom-right");
          drawRef.current = draw;
          labelMapControls(node);
          window.setTimeout(() => labelMapControls(node), 0);
          map.on("draw.create", (e: { features?: GeoJSON.Feature[] }) => {
            const ids = new Set(
              (e.features ?? [])
                .map((f) => f.id)
                .filter((id): id is string | number => id != null),
            );
            setPickedCounty("");
            syncFromDraw(ids);
          });
          map.on("draw.update", () => syncFromDraw());
          map.on("draw.delete", () => {
            setPickedCounty("");
            syncFromDraw();
          });
          map.on("draw.modechange", (e: { mode?: string }) => {
            if (e.mode === "draw_polygon") clearFinishedPolygons();
            window.setTimeout(() => labelMapControls(node), 0);
          });
        }

        if (!restored.current) {
          restored.current = true;
          const hash = window.location.hash.replace(/^#/, "");
          if (hash) {
            const state = decodeShare(hash);
            const draw = drawRef.current;
            if (state && draw) {
              setMode(state.mode);
              setMw(String(state.mw));
              if (state.fuel) setFuel(state.fuel);
              draw.add({
                type: "Feature",
                properties: {},
                geometry: state.polygon,
              });
              setPolygon(state.polygon);
              const bounds = new maplibregl.LngLatBounds();
              const coords =
                state.polygon.type === "Polygon"
                  ? state.polygon.coordinates[0]
                  : state.polygon.coordinates[0][0];
              for (const c of coords) bounds.extend(c as [number, number]);
              map.fitBounds(bounds, { padding: 48, animate: false });
            }
          }
        }
      };

      map.on("load", onReady);
      map.on("style.load", ensureTexasLayers);
      if (map.isStyleLoaded()) onReady();

      map.on("error", (e) => {
        console.error(e);
        setError("Map failed to load tiles. Check network / WebGL.");
      });

      ro = new ResizeObserver(() => {
        if (mapRef.current === map) map.resize();
      });
      ro.observe(node);
      window.setTimeout(() => map.resize(), 50);
      window.setTimeout(() => map.resize(), 250);
    })().catch((err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : "Map failed to load");
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPolygon, syncFromDraw, clearFinishedPolygons, paintCounties, fitTexas]);

  async function onScore() {
    const poly = polygonRef.current;
    if (!poly) {
      setError("Draw a search area on the map first.");
      return;
    }
    if (countyHits.length === 0) {
      setError("Polygon does not meaningfully overlap any Texas county.");
      return;
    }
    const mwNum = Number(mw);
    if (!Number.isFinite(mwNum) || mwNum <= 0) {
      setError("Enter a MW value greater than 0.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await scoreClearance({
        polygon: poly,
        mode,
        mw: mwNum,
        fuel: mode === "gen" ? fuel : undefined,
      });
      setScore(result);
      countyHitsRef.current = result.counties;
      setCountyHits(result.counties);
      paintCounties(result.counties);
      const share = encodeShare({
        polygon: poly,
        mode,
        mw: mwNum,
        fuel: mode === "gen" ? fuel : undefined,
      });
      window.history.replaceState(null, "", `#${share}`);
    } catch (e) {
      setScore(null);
      setError(e instanceof Error ? e.message : "Score failed");
    } finally {
      setLoading(false);
    }
  }

  function clearDraw() {
    const draw = drawRef.current;
    draw?.deleteAll();
    setPickedCounty("");
    setPolygon(null);
    try {
      draw?.changeMode("draw_polygon");
    } catch {
      /* mode change optional */
    }
    window.history.replaceState(null, "", window.location.pathname);
    fitTexas(true);
  }

  const drawHint = coarsePointer
    ? "Tap to place corners. Tap the first point again (or use the trash control to cancel)."
    : "Click to place corners. Double-click to finish.";

  function toggleHud() {
    setHudOpen((open) => {
      const next = !open;
      hudOpenRef.current = next;
      window.setTimeout(() => {
        mapRef.current?.resize();
        // Keep current view; only re-fit if still near full-state framing
      }, 50);
      return next;
    });
  }

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy link. Copy the URL bar instead.");
    }
  }

  const countyLabel =
    countyHits.length > 0
      ? countyHits
          .map((c) => {
            const pct = c.coverage != null ? ` ${Math.round(c.coverage * 100)}%` : "";
            return `${c.name}${pct}`;
          })
          .join(" · ")
      : null;

  const countyPicker = countyNames.length > 0 && (
    <div className="field">
      <label htmlFor="county-pick">Or pick a Texas county</label>
      <select
        id="county-pick"
        value={pickedCounty}
        onChange={(e) => onPickCounty(e.target.value)}
      >
        <option value="">Select county…</option>
        {countyNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={`workspace${score ? " has-results" : ""}`}>
      <div
        ref={mapNode}
        className="map-root"
        role="application"
        aria-label="ERCOT map. Draw a search polygon with pointer or touch, or pick a county in the controls."
      />

      {!hasPolygon && (
        <div className="hud-cue" role="status">
          <strong>Draw a search area</strong>
          <span>{drawHint}</span>
          <span className="hint">
            Map drawing needs a pointer or touch. Keyboard: pick a county below.
          </span>
          {countyPicker}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
      )}

      {hasPolygon && hudOpen && (
        <section className="hud" aria-label="Clearance inputs" id="clearance-hud">
          <div className="hud-top">
            <div>
              <h2 className="hud-title">Can this MW clear here?</h2>
              <p>
                County-level read from GIS queue history and LMP stress. Not an official study.
              </p>
            </div>
            <button
              type="button"
              className="btn hud-toggle"
              onClick={toggleHud}
              aria-expanded={true}
              aria-controls="clearance-hud"
              title="Hide panel"
            >
              Hide
            </button>
          </div>

          <div className="hud-row">
            <div className="field">
              <label htmlFor="mode">Mode</label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as "gen" | "load")}
              >
                <option value="gen">Generation</option>
                <option value="load">Large load (coarse)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="mw">Target MW</label>
              <input
                id="mw"
                type="number"
                min={1}
                step={1}
                inputMode="decimal"
                value={mw}
                onChange={(e) => setMw(e.target.value)}
              />
            </div>
          </div>

          {mode === "gen" && (
            <div className="field">
              <label htmlFor="fuel">Fuel</label>
              <select id="fuel" value={fuel} onChange={(e) => setFuel(e.target.value)}>
                {FUELS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {countyPicker}

          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || countyHits.length === 0}
              onClick={onScore}
            >
              {loading ? "Scoring…" : "Score area"}
            </button>
            <button type="button" className="btn" onClick={clearDraw}>
              Clear
            </button>
          </div>

          <p className="hint" aria-live="polite">
            {countyLabel
              ? `Counties: ${countyLabel}`
              : "Resolving counties…"}
            {copied ? " Link copied." : ""}
          </p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {mode === "load" && (
            <p className="hint">
              Large-load mode is coarse: ERCOT does not publish project-level load queue locations.
            </p>
          )}
        </section>
      )}

      {hasPolygon && !hudOpen && (
        <button
          type="button"
          className="hud-show"
          onClick={toggleHud}
          aria-expanded={false}
          aria-controls="clearance-hud"
        >
          Show controls
        </button>
      )}

      {(hasPolygon || countyHits.length > 0) && (
        <div className="map-legend" aria-label="Map legend">
          <div className="map-legend-row">
            <span className="swatch swatch-draw" />
            Search area
          </div>
          <div className="map-legend-row">
            <span className="swatch swatch-county" />
            Matched county
          </div>
          <div className="map-legend-row">
            <span className="swatch swatch-overlap" />
            Overlap
          </div>
        </div>
      )}

      {score && (
        <ResultsPanel score={score} onClose={() => setScore(null)} onShare={onShare} />
      )}
    </div>
  );
}
