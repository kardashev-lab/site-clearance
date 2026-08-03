import { ClearanceApp } from "@/components/ClearanceApp";

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-block" href="/" aria-label="Site Clearance home">
          <div className="brand-kicker">Kardashev Labs · ERCOT</div>
          <div className="brand-name">
            Site <mark>Clearance</mark>
          </div>
        </a>
        <nav className="top-links" aria-label="Site">
          <a href="/methodology">Methodology</a>
          <a href="https://kardashevlabs.org" rel="noopener noreferrer" target="_blank">
            kardashevlabs.org
          </a>
          <a
            href="https://interconnection-queue.kardashevlabs.org/interconnection-timelines"
            rel="noopener noreferrer"
            target="_blank"
          >
            Timelines
          </a>
        </nav>
      </header>
      <main id="main-content">
        <h1 className="sr-only">
          ERCOT Site Clearance: county-level interconnection estimate
        </h1>
        <p className="sr-only">
          Draw a search area on the map. Score generation or large-load MW using GIS queue pressure,
          measured peer timelines, and LMP market stress. Public data only. Not an official ERCOT
          interconnection study. Full method on the Methodology page.
        </p>
        <ClearanceApp />
      </main>
    </div>
  );
}
