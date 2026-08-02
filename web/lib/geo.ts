/** Build GeoJSON Polygon from Leaflet latlng rings — always [lng, lat]. */

type LatLngLike = { lat: number; lng: number };

function isLatLng(v: unknown): v is LatLngLike {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as LatLngLike).lat === "number" &&
    typeof (v as LatLngLike).lng === "number"
  );
}

function closeRing(ring: [number, number][]): [number, number][] {
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
}

function ringToCoords(ring: LatLngLike[]): [number, number][] {
  return closeRing(ring.map((ll) => [ll.lng, ll.lat]));
}

/** Normalize Leaflet getLatLngs() (flat ring, rings, or MultiPolygon). */
export function latLngsToPolygon(
  latlngs: unknown,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (!Array.isArray(latlngs) || latlngs.length === 0) return null;

  // Polygon: LatLng[][] (rings) or LatLng[] (single ring)
  if (isLatLng(latlngs[0])) {
    const coords = ringToCoords(latlngs as LatLngLike[]);
    if (coords.length < 4) return null;
    return { type: "Polygon", coordinates: [coords] };
  }

  if (Array.isArray(latlngs[0]) && isLatLng(latlngs[0][0])) {
    const coordinates = (latlngs as LatLngLike[][])
      .map(ringToCoords)
      .filter((r) => r.length >= 4);
    if (coordinates.length === 0) return null;
    return { type: "Polygon", coordinates };
  }

  // MultiPolygon: LatLng[][][]
  if (
    Array.isArray(latlngs[0]) &&
    Array.isArray(latlngs[0][0]) &&
    isLatLng(latlngs[0][0][0])
  ) {
    const polygons = (latlngs as LatLngLike[][][])
      .map((poly) => poly.map(ringToCoords).filter((r) => r.length >= 4))
      .filter((poly) => poly.length > 0);
    if (polygons.length === 0) return null;
    if (polygons.length === 1) return { type: "Polygon", coordinates: polygons[0] };
    return { type: "MultiPolygon", coordinates: polygons };
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function layerToPolygon(layer: any): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (typeof layer.getLatLngs === "function") {
    const fromLatLngs = latLngsToPolygon(layer.getLatLngs());
    if (fromLatLngs) return fromLatLngs;
  }
  if (typeof layer.toGeoJSON === "function") {
    const gj = layer.toGeoJSON();
    const geom =
      gj.type === "Feature"
        ? gj.geometry
        : (gj as GeoJSON.Geometry);
    if (geom?.type === "Polygon" || geom?.type === "MultiPolygon") {
      return geom;
    }
  }
  return null;
}
