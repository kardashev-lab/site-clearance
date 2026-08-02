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
          <h1>Methodology</h1>
          <p className="doc-lede">
            Draw a search area, say how many MW you want (gen or large load), get a strong / mixed /
            weak read. Everything here is from public filings and LMP history. It is not an ERCOT
            interconnection study, and we will not pretend otherwise.
          </p>

          <section>
            <h2>Geography</h2>
            <p>
              GIS generator rows have a county field. They do not have lat/lon. We intersect your
              polygon with Census TIGER Texas counties, then pull projects in those counties. If you
              only clip a corner of a county, the map shows the overlap; queue stats still use
              whole-county projects for that county when it clears the coverage floor. We do not
              invent project pins. Polygons that spill outside Texas are rejected.
            </p>
          </section>

          <section>
            <h2>What the v1 grade uses</h2>
            <ul>
              <li>
                <strong>Queue pressure.</strong> Pending GIS projects (never energized) and MW in
                counties that make up enough of your search area, from the latest GIS_Report
                snapshot. Tiny slivers stay on the map but drop out of the grade.
              </li>
              <li>
                <strong>Peer timelines.</strong> Screening→energization medians from ~97 months of
                GIS history, by CDR zone and fuel. Sample size is shown when we have it.
              </li>
              <li>
                <strong>Market stress.</strong> Trailing-year LMP numbers for the mapped settlement
                load zone: share of negative-price hours, volatility, RT−DA spread. CDR labels like
                COASTAL or PANHANDLE map to the nearest published LZ_* series.
              </li>
            </ul>
          </section>

          <section>
            <h2>What stays out of the grade</h2>
            <ul>
              <li>Wire / power-flow stress. That is Phase C; the panel says so.</li>
              <li>Resource-level SCED curtailment. Same: not ingested yet.</li>
              <li>
                Project-level large-load locations. ERCOT does not publish them, so large-load mode
                is coarse zone context only.
              </li>
            </ul>
          </section>

          <section>
            <h2>Sources</h2>
            <ul>
              <li>ERCOT Generator Interconnection Status (GIS) Report, reportTypeId 15933</li>
              <li>Census TIGER/Line county cartographic boundaries</li>
              <li>ERCOT LMP history rolled into zone stress series</li>
              <li>ERCOT LLWG/LFLTF large-load decks (coarse context only)</li>
            </ul>
          </section>

          <p className="doc-footer">
            Built by{" "}
            <a href="https://kardashevlabs.org" rel="noopener noreferrer" target="_blank">
              Kardashev Labs
            </a>
            . Score endpoint: <span className="mono">POST /clearance/score</span> on
            data.kardashevlabs.org once deployed.
          </p>
        </article>
      </main>
    </div>
  );
}
