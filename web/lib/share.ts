/** Compact share encoding for polygon + form state in the URL hash. */

export type ShareState = {
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  mode: "gen" | "load";
  mw: number;
  fuel?: string;
};

export function encodeShare(state: ShareState): string {
  const json = JSON.stringify(state);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json, "utf8").toString("base64url")
      : btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64;
}

export function decodeShare(raw: string): ShareState | null {
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json) as ShareState;
    if (!parsed?.polygon || !parsed.mw || !parsed.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}
