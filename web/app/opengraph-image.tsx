import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Site Clearance — Kardashev Labs ERCOT tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#eceae4",
          color: "#121314",
          padding: "56px 64px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6a6b66",
            }}
          >
            Kardashev Labs · ERCOT
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: "-0.04em" }}>
            Site{" "}
            <span
              style={{
                marginLeft: 16,
                background: "#ffb020",
                padding: "0 18px",
              }}
            >
              Clearance
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div style={{ fontSize: 36, lineHeight: 1.25, color: "#3d3f42" }}>
            Draw a search area. Get a county-level queue, timeline, and LMP stress read.
          </div>
          <div style={{ fontSize: 22, color: "#6a6b66" }}>
            Public data · Not an official interconnection study
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
