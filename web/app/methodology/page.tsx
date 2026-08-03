import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clearance.kardashevlabs.org";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Site Clearance scores an ERCOT search area: county GIS queue, measured timelines, LMP stress. Public data only.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology | Site Clearance",
    description:
      "How Site Clearance scores an ERCOT search area from public GIS queue, timelines, and LMP stress.",
    url: `${siteUrl}/methodology`,
  },
};

const articleLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Site Clearance methodology",
  description:
    "How Site Clearance scores an ERCOT search area from public GIS queue data, measured interconnection timelines, and LMP stress.",
  author: {
    "@type": "Organization",
    name: "Kardashev Labs",
    url: "https://kardashevlabs.org",
  },
  publisher: {
    "@type": "Organization",
    name: "Kardashev Labs",
    url: "https://kardashevlabs.org",
  },
  mainEntityOfPage: `${siteUrl}/methodology`,
  about: ["ERCOT", "interconnection queue", "Texas counties"],
};

const SOURCES = [
  {
    name: "ERCOT GIS Report",
    detail: "Generator Interconnection Status: monthly public filing (reportTypeId 15933).",
    href: "https://www.ercot.com/mp/data-products/data-product-details?id=pg7-200-er",
    secondary: {
      label: "MIS file list",
      href: "https://www.ercot.com/misapp/GetReports.do?reportTypeId=15933",
    },
  },
  {
    name: "Census TIGER/Line",
    detail: "Texas county cartographic boundaries used for polygon ∩ county joins.",
    href: "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
  },
  {
    name: "Interconnection timelines",
    detail: "Our measured screening-to-energization medians from GIS history (zone × fuel).",
    href: "https://interconnection-queue.kardashevlabs.org/interconnection-timelines",
  },
  {
    name: "ERCOT LMP / zone stress",
    detail: "Settled LMP history rolled into load-zone negative-hour and volatility series in kardashev-data.",
    href: "https://data.kardashevlabs.org/docs",
  },
  {
    name: "Large-load context",
    detail: "LLWG / LFLTF decks: zone aggregates only. No project-level load locations.",
    href: "https://www.ercot.com/committees/stakeholder/llwg",
    secondary: {
      label: "KL large-load tracker",
      href: "https://large-load-tracker.kardashevlabs.org",
    },
  },
] as const;

export default function MethodologyPage() {
  return (
    <div className="doc-page">
      <header className="topbar">
        <Link className="brand-block" href="/" aria-label="Site Clearance home">
          <div className="brand-kicker">Kardashev Labs · ERCOT</div>
          <div className="brand-name">
            Site <mark>Clearance</mark>
          </div>
        </Link>
        <nav className="top-links" aria-label="Site">
          <Link href="/">Back to map</Link>
        </nav>
      </header>

      <main id="main-content">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
        />
        <article className="doc-article">
          <header className="doc-hero">
            <p className="doc-kicker">How the grade is made</p>
            <h1>Methodology</h1>
            <p className="doc-lede">
              You draw a search area. We grade that MW strong, mixed, or weak from public
              queue and price history, and we show which inputs drove the grade.
            </p>
            <p className="doc-callout">
              This is not an ERCOT interconnection study. Treating the grade like an IA
              result is wrong. Screening tool only.
            </p>
          </header>

          <section className="doc-section">
            <h2>The short version</h2>
            <ol className="doc-steps">
              <li>
                <span className="doc-step-n" aria-hidden="true">
                  01
                </span>
                <div>
                  <h3>Clip to Texas counties</h3>
                  <p>
                    Your polygon has to stay inside Texas. We intersect it with Census county
                    shapes. Anything that spills into Mexico or out of state gets rejected.
                  </p>
                </div>
              </li>
              <li>
                <span className="doc-step-n" aria-hidden="true">
                  02
                </span>
                <div>
                  <h3>Pull the county queue</h3>
                  <p>
                    GIS filings name a county, not a lat/lon pin. So pending projects and MW come
                    from whole counties that make up enough of your search area (tiny edge clips
                    stay on the map, drop out of the grade).
                  </p>
                </div>
              </li>
              <li>
                <span className="doc-step-n" aria-hidden="true">
                  03
                </span>
                <div>
                  <h3>Stack timelines + prices</h3>
                  <p>
                    Peer screening-to-energization medians for the dominant CDR zone and fuel,
                    plus trailing LMP stress for the mapped load zone. Queue, timelines, and
                    prices each contribute to the grade. Wire blocks show HIFLD line density and
                    a GridSFM DC power-flow screen for your MW — both proxies, neither in the
                    grade. SCED curtailment is still out.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="doc-section">
            <h2>Geography (county resolution)</h2>
            <p>
              ERCOT&apos;s public generator queue is county-resolution. Midland County is not a
              point on a map; it is a polygon with every pending project that listed
              &quot;Midland.&quot; If your search covers 60% Midland and 40% Martin, both counties
              can feed the score, and the map paints the overlap so you can see what we counted.
            </p>
            <p>
              We do not invent project pins from bus names or substations in v1. When we can
              geocode POIs honestly, the map will get sharper. Until then, county is the honest
              unit.
            </p>
          </section>

          <section className="doc-section">
            <h2>What enters the grade</h2>
            <div className="doc-grid">
              <div className="doc-tile">
                <h3>Queue pressure</h3>
                <p>
                  Pending (never energized) GIS projects and MW in scored counties, from the latest{" "}
                  <a
                    href="https://www.ercot.com/mp/data-products/data-product-details?id=pg7-200-er"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GIS Report
                  </a>
                  .
                </p>
              </div>
              <div className="doc-tile">
                <h3>Peer timelines</h3>
                <p>
                  Measured medians from ~97 months of GIS history. Browse the same series on our{" "}
                  <a
                    href="https://interconnection-queue.kardashevlabs.org/interconnection-timelines"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    timelines tool
                  </a>
                  .
                </p>
              </div>
              <div className="doc-tile">
                <h3>Market stress</h3>
                <p>
                  Trailing-year negative-price hours, RT volatility, RT−DA spread for the mapped{" "}
                  <span className="mono">LZ_*</span> load zone. CDR labels like COASTAL map to the
                  nearest published series.
                </p>
              </div>
            </div>
          </section>

          <section className="doc-section">
            <h2>What stays out (on purpose)</h2>
            <ul className="doc-out">
              <li>
                <strong>Wire density proxy (shown, not graded)</strong>
                <span>
                  Public HIFLD transmission-line km per county area vs the Texas median.
                  Approximate geometries; not CEII; not a thermal rating.
                </span>
              </li>
              <li>
                <strong>DC power-flow screen (shown, not graded)</strong>
                <span>
                  Microsoft GridSFM Texas model (OSM + EIA synthetic network). We add your MW as
                  injection (gen) or withdrawal (load), solve a DC power flow, and score local
                  branches near the county. Not ERCOT CEII; not N-1; slack absorbs imbalance.
                </span>
              </li>
              <li>
                <strong>AC-OPF / contingency packs</strong>
                <span>Not built yet. C1 is DC screening only.</span>
              </li>
              <li>
                <strong>SCED curtailment</strong>
                <span>Resource-level 60-day disclosure not ingested yet.</span>
              </li>
              <li>
                <strong>Large-load project pins</strong>
                <span>
                  ERCOT does not publish them. Load mode is coarse zone context; see{" "}
                  <a
                    href="https://www.ercot.com/committees/stakeholder/llwg"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    LLWG
                  </a>
                  .
                </span>
              </li>
            </ul>
          </section>

          <section className="doc-section">
            <h2>Sources</h2>
            <p className="doc-sources-intro">
              Everything in the grade comes from public filings. Links below go to the sources,
              not our paraphrase.
            </p>
            <ul className="doc-sources">
              {SOURCES.map((s) => (
                <li key={s.name}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank" className="doc-source-name">
                    {s.name}
                  </a>
                  <p>{s.detail}</p>
                  {"secondary" in s && s.secondary ? (
                    <a
                      href={s.secondary.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="doc-source-more"
                    >
                      {s.secondary.label} →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <footer className="doc-footer">
            <p>
              Built by{" "}
              <a href="https://kardashevlabs.org" rel="noopener noreferrer" target="_blank">
                Kardashev Labs
              </a>
              . Score API:{" "}
              <a
                href="https://data.kardashevlabs.org/docs"
                rel="noopener noreferrer"
                target="_blank"
                className="mono"
              >
                POST /clearance/score
              </a>
            </p>
            <Link href="/" className="doc-cta">
              Draw a search area →
            </Link>
          </footer>
        </article>
      </main>
    </div>
  );
}
