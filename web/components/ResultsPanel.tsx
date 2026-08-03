"use client";

import { useId, useState } from "react";
import type { ClearanceScore } from "@/lib/api";

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function yrs(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)} yr`;
}

function Details({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="section details">
      <button
        type="button"
        className="details-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="mono" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="details-body" id={panelId}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ResultsPanel({
  score,
  onClose,
  onShare,
}: {
  score: ClearanceScore;
  onClose: () => void;
  onShare: () => void;
}) {
  const g = score.verdict.grade;
  const actions = score.verdict.actions?.length
    ? score.verdict.actions
    : score.verdict.drivers.slice(0, 3);
  const headline =
    score.verdict.headline ||
    actions.join("; ") ||
    score.verdict.summary;
  const scoredCounties =
    score.queue.attribution_counties ??
    score.counties.filter((c) => c.in_score !== false).map((c) => c.name);
  const slivers = score.queue.sliver_counties ?? [];
  const fuel = score.input.fuel;
  const peerYrs = score.timelines.fuel?.median_years ?? score.timelines.zone?.median_years;
  const peerN = score.timelines.fuel?.sample_count ?? score.timelines.zone?.sample_count;
  const peerBase = score.timelines.peer_baseline_years;
  const neg = score.market_stress?.mean_pct_hours_rt_negative;
  const negBase = score.market_stress?.ercot_avg_pct_hours_rt_negative;

  const gradeLabel =
    g === "strong" ? "Strong clearance signal" : g === "weak" ? "Weak clearance signal" : "Mixed clearance signal";

  return (
    <aside className="results" aria-live="polite" aria-label="Clearance results">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div className="grade">
          <span className={`grade-pill ${g}`} title={gradeLabel}>
            {g}
          </span>
          <span className="sr-only">{gradeLabel}. </span>
          <span className="mono">as of {score.as_of}</span>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onShare}>
            Copy link
          </button>
          <button type="button" className="btn" onClick={onClose} aria-label="Close results">
            Close
          </button>
        </div>
      </div>

      <h2>{headline}</h2>
      <p className="summary-line">
        {score.input.mw.toLocaleString()} MW
        {fuel ? ` ${fuel}` : " large load"} · {scoredCounties.slice(0, 3).join(", ")}
        {scoredCounties.length > 3 ? "…" : ""}
        {score.queue.driver_county ? ` · score driven by ${score.queue.driver_county}` : ""}
      </p>
      <p className="disclaimer">{score.verdict.disclaimer}</p>

      <div className="section">
        <h3>What to expect</h3>
        <ul className="action-list">
          {actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h3>Key numbers</h3>
        <div className="stat-grid">
          <div className="stat">
            <b className="mono">
              {score.queue.pending_mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW
            </b>
            <span>Pending in scored counties</span>
          </div>
          <div className="stat">
            <b className="mono">{yrs(peerYrs)}</b>
            <span>
              Peer median
              {peerBase != null ? ` (ERCOT ${peerBase.toFixed(1)} yr)` : ""}
            </span>
          </div>
          <div className="stat">
            <b className="mono">{pct(neg)}</b>
            <span>
              Neg. price hours
              {negBase != null ? ` (ERCOT ${pct(negBase)})` : ""}
            </span>
          </div>
          <div className="stat">
            <b className="mono">{score.queue.dominant_cdr_zone ?? "—"}</b>
            <span>Dominant CDR zone</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Why this grade</h3>
        <ul>
          {score.verdict.drivers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      <Details title="Queue detail">
        <div className="stat-grid">
          <div className="stat">
            <b className="mono">{score.queue.pending_projects}</b>
            <span>Pending projects</span>
          </div>
          <div className="stat">
            <b className="mono">{score.queue.projects_in_counties}</b>
            <span>All projects in scored counties</span>
          </div>
          <div className="stat">
            <b className="mono">{peerN ?? "—"}</b>
            <span>Peer sample size</span>
          </div>
          <div className="stat">
            <b className="mono">
              {score.market_stress?.mean_rt_price_volatility?.toFixed(0) ?? "—"}
            </b>
            <span>RT volatility</span>
          </div>
        </div>
        {score.market_stress && (
          <p className="hint" style={{ marginTop: 8 }}>
            {score.market_stress.note}
          </p>
        )}
        <p style={{ margin: "10px 0 0", fontSize: 13 }}>
          Scored counties:{" "}
          {score.counties
            .filter((c) => c.in_score !== false)
            .map((c) =>
              c.coverage != null
                ? `${c.name} (${Math.round(c.coverage * 100)}%)`
                : c.name,
            )
            .join(", ")}
        </p>
        {slivers.length > 0 && (
          <p className="hint" style={{ marginTop: 6 }}>
            Map-only slivers (&lt;{Math.round((score.queue.min_score_coverage ?? 0.05) * 100)}%
            of search area): {slivers.join(", ")} (excluded from queue stats).
          </p>
        )}
      </Details>

      {score.queue.sample_projects.length > 0 && (
        <Details title={`Sample pending projects${fuel ? ` (${fuel} first)` : ""}`}>
          <ul style={{ fontSize: 13 }}>
            {score.queue.sample_projects.slice(0, 8).map((p) => (
              <li key={p.queue_id}>
                <span className="mono">{p.queue_id}</span>{" "}
                {p.project_name ?? "Untitled"} · {p.fuel} · {p.mw ?? "—"} MW · {p.county}
              </li>
            ))}
          </ul>
        </Details>
      )}

      {score.wire_stress.status === "proxy" ? (
        <Details title={`Wire access proxy (${score.wire_stress.level ?? "proxy"})`} defaultOpen>
          <div className="stat-grid">
            <div className="stat">
              <b className="mono">
                {score.wire_stress.density_km_per_km2 != null
                  ? score.wire_stress.density_km_per_km2.toFixed(3)
                  : "—"}
              </b>
              <span>Line km per km² (coverage-weighted)</span>
            </div>
            <div className="stat">
              <b className="mono">
                {score.wire_stress.vs_texas_median != null
                  ? `${score.wire_stress.vs_texas_median.toFixed(2)}×`
                  : "—"}
              </b>
              <span>
                Vs Texas median
                {score.wire_stress.texas_median_km_per_km2 != null
                  ? ` (${score.wire_stress.texas_median_km_per_km2.toFixed(3)})`
                  : ""}
              </span>
            </div>
            <div className="stat">
              <b className="mono">
                {score.wire_stress.hv_share_ge_230kv != null
                  ? pct(score.wire_stress.hv_share_ge_230kv)
                  : "—"}
              </b>
              <span>Share of line-km ≥230 kV</span>
            </div>
            <div className="stat">
              <b className="mono">{score.wire_stress.level ?? "—"}</b>
              <span>Density level{score.wire_stress.as_of ? ` · as of ${score.wire_stress.as_of}` : ""}</span>
            </div>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {score.wire_stress.note}
          </p>
          {score.wire_stress.counties && score.wire_stress.counties.length > 0 && (
            <ul style={{ fontSize: 13, marginTop: 8 }}>
              {score.wire_stress.counties.map((c) => (
                <li key={c.name}>
                  {c.name}: {c.line_km.toFixed(0)} km lines ·{" "}
                  {c.vs_median != null ? `${c.vs_median.toFixed(2)}× median` : "—"} ·{" "}
                  {Math.round(c.coverage * 100)}% of search area
                </li>
              ))}
            </ul>
          )}
        </Details>
      ) : (
        <Details title="Not in this grade yet">
          <ul>
            <li>{score.wire_stress.note}</li>
            <li>{score.curtailment_risk.note}</li>
          </ul>
        </Details>
      )}

      {score.wire_stress.status === "proxy" && (
        <Details title="Still out of the grade">
          <ul>
            <li>{score.curtailment_risk.note}</li>
            <li>
              Power-flow / contingency scenarios (Phase C1) are not built yet. This wire block is
              HIFLD line density only.
            </li>
          </ul>
        </Details>
      )}

      <p className="disclaimer">
        <a href="/methodology">How this is built</a>
      </p>
    </aside>
  );
}
