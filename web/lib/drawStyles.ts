/** MapLibre-safe Mapbox Draw styles (no data-driven line-dasharray). */

export type DrawStyle = {
  id: string;
  type: string;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

export const DRAW_STYLES: DrawStyle[] = [
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: {
      "fill-color": "#ffb020",
      "fill-outline-color": "#121314",
      "fill-opacity": 0.28,
    },
  },
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#121314", "line-width": 2 },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-halo-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: {
      "circle-radius": 6,
      "circle-color": "#fff",
    },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: {
      "circle-radius": 4,
      "circle-color": "#121314",
    },
  },
  {
    id: "gl-draw-line",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#121314", "line-width": 2 },
  },
  {
    id: "gl-draw-point-halo",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 6, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-point",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 4, "circle-color": "#ffb020" },
  },
];
