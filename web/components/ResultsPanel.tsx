"use client";

import { useId, useState } from "react";
import type { ClearanceScore, Comparison } from "@/lib/api";

type Tone = "good" | "warn" | "bad" | "neutral";

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
  summary,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
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
        <span className="details-toggle-text">
          <span>{title}</span>
          {!open && summary ? <span className="details-summary">{summary}</span> : null}
        </span>
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

function SignalCard({
  label,
  tone,
  chip,
  value,
  detail,
}: {
  label: string;
  tone: Tone;
  chip: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`signal tone-${tone}`}>
      <div className="signal-top">
        <span className="signal-label">{label}</span>
        <span className={`signal-chip tone-${tone}`}>{chip}</span>
      </div>
      <b className="mono signal-value">{value}</b>
      <span className="signal-detail">{detail}</span>
    </div>
  );
}

function Meter({
  label,
  value,
  max = 1,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max?: number;
  tone?: Tone;
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span className="mono">{value.toFixed(2)}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className={`meter-fill tone-${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function queueTone(comp: Comparison | undefined, pendingMw: number): { tone: Tone; chip: string } {
  if (comp?.value != null) {
    if (comp.value >= 0.15) return { tone: "bad", chip: "busy" };
    if (comp.value <= 0.03) return { tone: "good", chip: "light" };
    return { tone: "warn", chip: "moderate" };
  }
  if (pendingMw >= 2000) return { tone: "bad", chip: "busy" };
  if (pendingMw <= 200) return { tone: "good", chip: "light" };
  return { tone: "warn", chip: "moderate" };
}

function timelineTone(
  years: number | null | undefined,
  n: number | null | undefined,
): { tone: Tone; chip: string } {
  if (years == null || (n != null && n < 20)) return { tone: "neutral", chip: "thin n" };
  if (years >= 3.7) return { tone: "bad", chip: "slow" };
  if (years <= 3.0) return { tone: "good", chip: "faster" };
  return { tone: "warn", chip: "typical" };
}

function marketTone(neg: number | null | undefined): { tone: Tone; chip: string } {
  if (neg == null) return { tone: "neutral", chip: "n/a" };
  if (neg >= 0.08) return { tone: "bad", chip: "elevated" };
  if (neg <= 0.02) return { tone: "good", chip: "calm" };
  return { tone: "warn", chip: "moderate" };
}

/** UI label for PF impact — avoid "stressed" when absolute loading is still low. */
function pfImpactLabel(
  level: string | undefined,
  maxLoading: number | null | undefined,
): { chip: string; tone: Tone } {
  const load = maxLoading ?? 0;
  if (level === "stressed" && load < 0.75) {
    return { chip: "elevated impact", tone: "warn" };
  }
  if (level === "stressed") return { chip: "high impact", tone: "bad" };
  if (level === "moderate") return { chip: "moderate impact", tone: "warn" };
  if (level === "calm") return { chip: "low impact", tone: "good" };
  return { chip: level ?? "proxy", tone: "neutral" };
}

function densityChip(level: string | undefined): string {
  if (level === "sparse") return "sparse lines";
  if (level === "dense") return "dense lines";
  if (level === "typical") return "typical density";
  return level ?? "proxy";
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
  const comps = score.verdict.comparisons ?? {};
  const actions = score.verdict.actions?.length
    ? score.verdict.actions
    : score.verdict.drivers.slice(0, 3);
  // One tight line — avoid the API's semicolon-joined action dump.
  const headline =
    g === "mixed" && actions.length >= 2
      ? `${actions[0]} · ${actions[1]}`
      : actions[0] || score.verdict.headline || score.verdict.summary;
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

  const q = queueTone(comps.queue_share_of_zone, score.queue.pending_mw);
  const t = timelineTone(peerYrs, peerN);
  const m = marketTone(neg);

  const queueShare = comps.queue_share_of_zone?.value;
  const queueDetail =
    queueShare != null
      ? `${(queueShare * 100).toFixed(0)}% of zone pending · ${score.queue.pending_mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW`
      : `${score.queue.pending_mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW pending`;

  const timelineDetail =
    peerBase != null && peerYrs != null
      ? `ERCOT zone median ${peerBase.toFixed(1)} yr · n=${peerN ?? "—"}`
      : `n=${peerN ?? "—"}`;

  const marketDetail =
    negBase != null ? `ERCOT avg ${pct(negBase)} · ${score.queue.dominant_cdr_zone ?? "—"}` : score.queue.dominant_cdr_zone ?? "—";

  const pf = score.wire_stress.power_flow;
  const dens = score.wire_stress.density;
  const pfImpact =
    pf?.status === "proxy"
      ? pfImpactLabel(pf.level, pf.max_loading_pu)
      : null;
  const densLevel = dens?.level ?? score.wire_stress.density?.level;
  const wireSummaryParts: string[] = [];
  if (pfImpact && pf) {
    wireSummaryParts.push(
      `DC ${pf.max_loading_pu != null ? `${pf.max_loading_pu.toFixed(2)} pu` : "—"} · ${pfImpact.chip}`,
    );
  }
  if (dens?.status === "proxy" || score.wire_stress.status === "proxy") {
    const vs = dens?.vs_texas_median ?? score.wire_stress.vs_texas_median;
    wireSummaryParts.push(
      `HIFLD ${densityChip(densLevel)}${vs != null ? ` (${vs.toFixed(2)}×)` : ""}`,
    );
  }
  const wireSummary = wireSummaryParts.join(" · ") || "Wire proxies";

  const topBranches = pf?.counties?.[0]?.scenario?.top_branches ?? [];
  const gradeLabel =
    g === "strong" ? "Strong clearance signal" : g === "weak" ? "Weak clearance signal" : "Mixed clearance signal";

  return (
    <aside className="results" aria-live="polite" aria-label="Clearance results">
      <div className="results-toolbar">
        <div className="grade">
          <span className={`grade-pill ${g}`} title={gradeLabel}>
            {g}
          </span>
          <span className="sr-only">{gradeLabel}. </span>
          <span className="mono as-of">as of {score.as_of}</span>
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
        {score.queue.driver_county ? ` · driven by ${score.queue.driver_county}` : ""}
      </p>
      <p className="honesty-line">
        County public data · not an ERCOT study ·{" "}
        <a href="/methodology">methodology</a>
      </p>

      <div className="section">
        <h3>Grade signals</h3>
        <div className="signal-row">
          <SignalCard
            label="Queue"
            tone={q.tone}
            chip={q.chip}
            value={
              queueShare != null
                ? `${(queueShare * 100).toFixed(0)}%`
                : `${score.queue.pending_mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW`
            }
            detail={queueDetail}
          />
          <SignalCard
            label="Timelines"
            tone={t.tone}
            chip={t.chip}
            value={yrs(peerYrs)}
            detail={timelineDetail}
          />
          <SignalCard
            label="Market"
            tone={m.tone}
            chip={m.chip}
            value={pct(neg)}
            detail={marketDetail}
          />
        </div>
      </div>

      <Details title="Why this grade">
        <ul className="driver-list">
          {score.verdict.drivers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Details>

      <Details
        title="Queue & projects"
        summary={`${score.queue.pending_projects} pending · ${score.queue.pending_mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW`}
      >
        <div className="meta-row">
          <span>
            <b className="mono">{score.queue.pending_projects}</b> pending
          </span>
          <span>
            <b className="mono">{peerN ?? "—"}</b> peer n
          </span>
          <span>
            <b className="mono">{score.market_stress?.mean_rt_price_volatility?.toFixed(0) ?? "—"}</b> RT
            vol
          </span>
          <span>
            <b className="mono">{score.queue.dominant_cdr_zone ?? "—"}</b> CDR
          </span>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Scored:{" "}
          {score.counties
            .filter((c) => c.in_score !== false)
            .map((c) =>
              c.coverage != null
                ? `${c.name} (${Math.round(c.coverage * 100)}%)`
                : c.name,
            )
            .join(", ")}
          {slivers.length > 0
            ? ` · slivers excluded: ${slivers.join(", ")}`
            : ""}
        </p>
        {score.queue.sample_projects.length > 0 && (
          <table className="project-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Fuel</th>
                <th>MW</th>
                <th>County</th>
              </tr>
            </thead>
            <tbody>
              {score.queue.sample_projects.slice(0, 8).map((p) => (
                <tr key={p.queue_id}>
                  <td className="mono">{p.queue_id}</td>
                  <td>{p.project_name ?? "Untitled"}</td>
                  <td className="mono">{p.fuel ?? "—"}</td>
                  <td className="mono">
                    {p.mw != null ? p.mw.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </td>
                  <td>{p.county ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Details>

      {score.wire_stress.status === "proxy" ? (
        <Details title="Wire screen · not in grade" summary={wireSummary}>
          {pf?.status === "proxy" && (
            <div className="wire-block">
              <div className="wire-head">
                <span>DC power flow</span>
                {pfImpact && (
                  <span className={`signal-chip tone-${pfImpact.tone}`}>{pfImpact.chip}</span>
                )}
              </div>
              <p className="hint">
                ~{pf.scenario_mw ?? "—"} MW {pf.scenario_mode ?? "scenario"} · {pf.hour ?? "16h"} ·
                local branches only · GridSFM synthetic network, not ERCOT CEII
              </p>
              <div className="meter-stack">
                {pf.max_loading_pu != null && (
                  <Meter
                    label="Local max loading (pu)"
                    value={pf.max_loading_pu}
                    max={1.2}
                    tone={
                      pf.max_loading_pu >= 1
                        ? "bad"
                        : pf.max_loading_pu >= 0.75
                          ? "warn"
                          : "good"
                    }
                  />
                )}
                {pf.max_abs_delta_loading_pu != null && (
                  <Meter
                    label="Max |Δ loading|"
                    value={pf.max_abs_delta_loading_pu}
                    max={0.4}
                    tone={
                      pf.max_abs_delta_loading_pu >= 0.15
                        ? "bad"
                        : pf.max_abs_delta_loading_pu >= 0.05
                          ? "warn"
                          : "good"
                    }
                  />
                )}
              </div>
              {topBranches.length > 0 && (
                <ul className="branch-list">
                  {topBranches.map((b) => (
                    <li key={b.branch}>
                      <Meter
                        label={`${b.flow_mw} / ${b.rate_mva} MVA${b.delta_flow_mw != null ? ` · Δ ${b.delta_flow_mw}` : ""}`}
                        value={b.loading_pu}
                        max={1.2}
                        tone={
                          b.loading_pu >= 1 ? "bad" : b.loading_pu >= 0.75 ? "warn" : "neutral"
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(dens?.status === "proxy" || score.wire_stress.density_km_per_km2 != null) && (
            <div className="wire-block">
              <div className="wire-head">
                <span>HIFLD density</span>
                <span className="signal-chip tone-neutral">{densityChip(densLevel)}</span>
              </div>
              <div className="meta-row">
                <span>
                  <b className="mono">
                    {(dens?.density_km_per_km2 ?? score.wire_stress.density_km_per_km2)?.toFixed(3) ??
                      "—"}
                  </b>{" "}
                  km/km²
                </span>
                <span>
                  <b className="mono">
                    {(dens?.vs_texas_median ?? score.wire_stress.vs_texas_median) != null
                      ? `${(dens?.vs_texas_median ?? score.wire_stress.vs_texas_median)!.toFixed(2)}×`
                      : "—"}
                  </b>{" "}
                  vs TX median
                </span>
                <span>
                  <b className="mono">
                    {pct(dens?.hv_share_ge_230kv ?? score.wire_stress.hv_share_ge_230kv)}
                  </b>{" "}
                  ≥230 kV
                </span>
              </div>
            </div>
          )}
        </Details>
      ) : null}
    </aside>
  );
}
