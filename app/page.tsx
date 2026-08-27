import Link from "next/link";

export default function HomePage() {
  return (
    <main className="feature-hub">
      <div className="feature-hub__content">
        <p className="feature-hub__eyebrow">PAUL OS / PORTABLE FEATURES</p>
        <h1>Govern the thread. Prove the number.</h1>
        <p className="feature-hub__intro">
          Two independent, synthetic reference features packaged for a clean
          handoff into an existing Paul OS application.
        </p>
        <div className="feature-hub__grid">
          <article>
            <span>01 / OBSERVABILITY</span>
            <h2>Digital Thread Control</h2>
            <p>
              Trace authoritative changes, propagation, connector health, and
              reconciliation across enterprise systems.
            </p>
            <Link href="/digital-thread">Open digital thread</Link>
          </article>
          <article>
            <span>02 / ASSURANCE</span>
            <h2>Report Certification</h2>
            <p>
              Apply deterministic evidence gates from source to consumer and
              preserve the approval, policy, and recertification trail.
            </p>
            <Link href="/certification">Open certification</Link>
          </article>
        </div>
        <small>All demo records and outcomes are synthetic.</small>
      </div>
    </main>
  );
}
