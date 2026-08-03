const API = (process.env.NEXT_PUBLIC_API_URL ?? "https://data.kardashevlabs.org").replace(
  /\/$/,
  "",
);

export type Comparison = {
  value: number;
  baseline: number | null;
  baseline_label: string;
  unit: "share" | "years" | string;
  sample_n?: number;
  scope?: string | null;
  scope_label?: string | null;
};

export type ClearanceScore = {
  product: string;
  as_of: string;
  mode: "gen" | "load";
  input: { mw: number; fuel: string | null };
  counties: {
    name: string;
    geoid: string | null;
    overlap_weight: number;
    coverage?: number;
    in_score?: boolean;
    geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    county_geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }[];
  verdict: {
    grade: "strong" | "mixed" | "weak";
    headline?: string;
    summary: string;
    actions?: string[];
    drivers: string[];
    comparisons?: Record<string, Comparison>;
    inputs_used: string[];
    inputs_excluded: string[];
    disclaimer: string;
  };
  queue: {
    snapshot_month: string;
    projects_in_counties: number;
    pending_projects: number;
    pending_mw: number;
    by_fuel: Record<string, { count: number; mw: number }>;
    by_zone: Record<string, { count: number; mw: number }>;
    dominant_cdr_zone: string | null;
    driver_county?: string | null;
    attribution_counties?: string[];
    sliver_counties?: string[];
    min_score_coverage?: number;
    sample_projects: {
      queue_id: string;
      project_name: string | null;
      county: string | null;
      zone: string | null;
      fuel: string | null;
      mw: number | null;
      phase: string | null;
      pending: boolean;
    }[];
  };
  timelines: {
    zone: { sample_count: number | null; median_years: number | null } | null;
    fuel: { sample_count: number | null; median_years: number | null } | null;
    zone_pending: {
      sample_count: number | null;
      median_years: number | null;
      total_mw: number | null;
    } | null;
    peer_baseline_years?: number | null;
    peer_scope?: string | null;
    peer_scope_label?: string | null;
  };
  market_stress: {
    load_zone: string;
    months: number;
    mean_pct_hours_rt_negative: number | null;
    mean_rt_price_volatility: number | null;
    mean_rt_da_spread: number | null;
    ercot_avg_pct_hours_rt_negative?: number | null;
    note: string;
  } | null;
  wire_stress: {
    status: string;
    note: string;
    level?: "sparse" | "typical" | "dense" | "calm" | "moderate" | "stressed" | string;
    density_km_per_km2?: number | null;
    texas_median_km_per_km2?: number | null;
    vs_texas_median?: number | null;
    hv_share_ge_230kv?: number | null;
    as_of?: string;
    density?: {
      status: string;
      level?: string;
      note?: string;
      density_km_per_km2?: number | null;
      texas_median_km_per_km2?: number | null;
      vs_texas_median?: number | null;
      hv_share_ge_230kv?: number | null;
      counties?: {
        name: string;
        coverage: number;
        line_km: number;
        hv_line_km?: number;
        line_km_per_km2: number;
        hv_share: number;
        vs_median: number | null;
      }[];
    };
    power_flow?: {
      status: string;
      level?: string;
      note?: string;
      scenario_mw?: number;
      scenario_mode?: string;
      hour?: string;
      max_loading_pu?: number | null;
      max_abs_delta_loading_pu?: number | null;
      counties?: {
        name: string;
        coverage: number;
        bus_count?: number;
        local_branch_count?: number;
        level?: string;
        scenario?: {
          hour?: string;
          mode?: string;
          mw?: number;
          max_loading_pu?: number | null;
          max_abs_delta_loading_pu?: number | null;
          overload_count?: number | null;
          top_branches?: {
            branch: string;
            loading_pu: number;
            flow_mw: number;
            rate_mva: number;
            delta_flow_mw?: number;
          }[];
        } | null;
      }[];
    };
    counties?: {
      name: string;
      coverage: number;
      line_km: number;
      hv_line_km?: number;
      line_km_per_km2: number;
      hv_share: number;
      vs_median: number | null;
    }[];
  };
  curtailment_risk: { status: string; note: string };
  large_load: Record<string, unknown> | null;
  scored_at: string;
};

export async function scoreClearance(body: {
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  mode: "gen" | "load";
  mw: number;
  fuel?: string;
}): Promise<ClearanceScore> {
  const res = await fetch(`${API}/clearance/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Score failed (${res.status})`;
    try {
      const err = await res.json();
      if (typeof err?.detail === "string") detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<ClearanceScore>;
}

export function apiBase(): string {
  return API;
}

export type CountyHit = {
  name: string;
  geoid: string | null;
  overlap_weight: number;
  coverage?: number;
  /** Overlap of search area with the county (fill). */
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Full county boundary (dashed outline). */
  county_geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

export async function intersectCounties(
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Promise<CountyHit[]> {
  const res = await fetch(`${API}/clearance/counties/intersect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ polygon }),
  });
  if (!res.ok) {
    let detail = `County intersect failed (${res.status})`;
    try {
      const err = await res.json();
      if (typeof err?.detail === "string") detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { counties: CountyHit[] };
  return data.counties ?? [];
}
