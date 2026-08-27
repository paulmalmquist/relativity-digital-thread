"use client";

import {
  Bot,
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  FileCheck2,
  LockKeyhole,
  Play,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { demoReportCertificationSnapshot } from "./demo-view-data";
import type {
  CertificationEvidenceView,
  CertificationTier,
  CertificationVerdict,
  CertifiedProductView,
  ReportCertificationControlProps,
  ReportCertificationSnapshot,
} from "./types";

import "./certification-control.css";

type CertificationView = "registry" | "tiers" | "agent";
type StatusFilter = "ALL" | CertificationVerdict;

const views: Array<{ id: CertificationView; label: string }> = [
  { id: "registry", label: "Registry" },
  { id: "tiers", label: "Tier model" },
  { id: "agent", label: "Agent runbook" },
];

const statusFilters: Array<{ id: StatusFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "PASS", label: "Pass" },
  { id: "CONDITIONAL", label: "Conditional" },
  { id: "NOT_PROVEN", label: "Not proven" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "EXPIRED", label: "Expired" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatDate(value: string, includeTime = false): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Date unavailable";
  }
  return (includeTime ? dateTimeFormatter : dateFormatter).format(parsed);
}

function verdictLabel(verdict: CertificationVerdict): string {
  return verdict === "NOT_PROVEN"
    ? "Not proven"
    : verdict.charAt(0) + verdict.slice(1).toLowerCase();
}

function evidenceKindLabel(kind: CertificationEvidenceView["kind"]): string {
  return kind.replaceAll("_", " ");
}

function joinClassNames(...names: Array<string | undefined>): string {
  return names.filter((name): name is string => Boolean(name)).join(" ");
}

function VerdictIcon({ verdict }: { verdict: CertificationVerdict }) {
  if (verdict === "PASS") {
    return <CircleCheck aria-hidden="true" size={15} />;
  }
  if (verdict === "CONDITIONAL" || verdict === "EXPIRED") {
    return <CircleAlert aria-hidden="true" size={15} />;
  }
  if (verdict === "BLOCKED") {
    return <X aria-hidden="true" size={15} />;
  }
  return <CircleHelp aria-hidden="true" size={15} />;
}

function VerdictBadge({ verdict }: { verdict: CertificationVerdict }) {
  return (
    <span className="prc-verdict" data-verdict={verdict}>
      <VerdictIcon verdict={verdict} />
      {verdictLabel(verdict)}
    </span>
  );
}

function TierMark({ tier }: { tier: CertificationTier }) {
  return (
    <span className="prc-tier-mark" data-tier={tier}>
      T{tier}
    </span>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="prc-empty" role="status">
      <CircleHelp aria-hidden="true" size={24} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

/* eslint-disable jsx-a11y-x/no-noninteractive-tabindex -- The horizontal
 * overflow region needs a keyboard stop in narrow host containers. */
function RegistryTable({
  products,
  selectedProductId,
  onSelect,
  descriptionId,
}: {
  products: CertifiedProductView[];
  selectedProductId?: string;
  onSelect: (id: string) => void;
  descriptionId: string;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No matching products"
        detail="Clear the search or choose a different decision filter."
      />
    );
  }

  return (
    <div
      className="prc-table-scroll"
      data-prc-slot="table-scroll"
      role="region"
      aria-label="Scrollable certification registry"
      tabIndex={0}
    >
      <table className="prc-registry-table" aria-describedby={descriptionId}>
        <caption className="prc-sr-only">
          Certification registry results. Choose a product to inspect its
          evidence chain.
        </caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Decision</th>
            <th scope="col">Tier</th>
            <th scope="col">Owner</th>
            <th scope="col">Valid until</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const selected = product.id === selectedProductId;
            return (
              <tr key={product.id} data-selected={selected ? "true" : "false"}>
                <td>
                  <button
                    type="button"
                    className="prc-product-button"
                    aria-label={`Inspect ${product.name}`}
                    aria-pressed={selected}
                    onClick={() => onSelect(product.id)}
                  >
                    <span>{product.name}</span>
                    <small>{product.consumerLabel}</small>
                  </button>
                </td>
                <td>
                  <VerdictBadge verdict={product.verdict} />
                </td>
                <td>
                  <TierMark tier={product.achievedTier} />
                </td>
                <td>{product.ownerLabel}</td>
                <td>{formatDate(product.validUntil)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
/* eslint-enable jsx-a11y-x/no-noninteractive-tabindex */

function EvidenceStatusIcon({
  status,
}: {
  status: CertificationEvidenceView["status"];
}) {
  if (status === "verified") {
    return <Check aria-hidden="true" size={14} />;
  }
  if (status === "conditional") {
    return <CircleAlert aria-hidden="true" size={14} />;
  }
  if (status === "failed") {
    return <X aria-hidden="true" size={14} />;
  }
  return <CircleHelp aria-hidden="true" size={14} />;
}

function ProductDetail({
  product,
  headingId,
}: {
  product?: CertifiedProductView;
  headingId: string;
}) {
  if (!product) {
    return (
      <article className="prc-panel prc-detail-panel" aria-labelledby={headingId}>
        <h2 id={headingId}>Product evidence</h2>
        <EmptyState
          title="No product selected"
          detail="Add a product to the authorized projection to inspect its evidence chain."
        />
      </article>
    );
  }

  const evidenceCount = product.gates.reduce(
    (total, gate) => total + gate.evidence.length,
    0,
  );

  return (
    <article className="prc-panel prc-detail-panel" aria-labelledby={headingId}>
      <header className="prc-detail-header">
        <div>
          <p className="prc-kicker">Selected product</p>
          <h2 id={headingId}>{product.name}</h2>
          <p>{product.description}</p>
        </div>
        <div className="prc-detail-decision">
          <VerdictBadge verdict={product.verdict} />
          <TierMark tier={product.achievedTier} />
        </div>
      </header>

      <p className="prc-decision-summary">{product.summary}</p>

      <dl className="prc-product-facts">
        <div>
          <dt>Source</dt>
          <dd>{product.sourceLabel}</dd>
        </div>
        <div>
          <dt>Consumer</dt>
          <dd>{product.consumerLabel}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{product.ownerLabel}</dd>
        </div>
        <div>
          <dt>Steward</dt>
          <dd>{product.stewardLabel}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{product.policyLabel}</dd>
        </div>
        <div>
          <dt>Metric contract</dt>
          <dd>{product.contractLabel}</dd>
        </div>
      </dl>

      <div className="prc-chain-heading">
        <div>
          <p className="prc-kicker">Minimum-gate evidence</p>
          <h3>Evidence chain</h3>
        </div>
        <span>
          {product.gates.length} gates / {evidenceCount} evidence records
        </span>
      </div>

      {product.gates.length > 0 ? (
        <ol className="prc-evidence-chain">
          {product.gates.map((gate, gateIndex) => (
            <li key={gate.id} data-verdict={gate.verdict}>
              <div className="prc-gate-marker" aria-hidden="true">
                {gateIndex + 1}
              </div>
              <div className="prc-gate-body">
                <header>
                  <div>
                    <h4>{gate.label}</h4>
                    <p>
                      {gate.fromLabel} <span aria-hidden="true">→</span>{" "}
                      {gate.toLabel}
                    </p>
                  </div>
                  <div className="prc-gate-decision">
                    <VerdictBadge verdict={gate.verdict} />
                    <TierMark tier={gate.achievedTier} />
                  </div>
                </header>
                <p className="prc-gate-owner">Owner: {gate.ownerLabel}</p>
                {gate.evidence.length > 0 ? (
                  <ul className="prc-evidence-list">
                    {gate.evidence.map((evidence) => (
                      <li key={evidence.id} data-evidence-status={evidence.status}>
                        <span className="prc-evidence-icon">
                          <EvidenceStatusIcon status={evidence.status} />
                        </span>
                        <span>
                          <strong>{evidence.label}</strong>
                          <span className="prc-evidence-status">
                            Status: {evidence.status.replaceAll("_", " ")}
                          </span>
                          <small>
                            {evidenceKindLabel(evidence.kind)} ·{" "}
                            {evidence.sourceLabel} ·{" "}
                            {formatDate(evidence.observedAt, true)} UTC
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="prc-inline-empty" role="status">
                    No evidence records were supplied for this gate.
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title="Evidence chain unavailable"
          detail="No governed gates were supplied for this product."
        />
      )}
    </article>
  );
}

function TierModel({
  data,
  headingId,
}: {
  data: ReportCertificationSnapshot;
  headingId: string;
}) {
  return (
    <section className="prc-panel prc-tier-panel" aria-labelledby={headingId}>
      <div className="prc-section-heading">
        <div>
          <p className="prc-kicker">Progressive assurance</p>
          <h2 id={headingId}>Certification tier model</h2>
        </div>
        <p>
          Every tier inherits the controls below it. Missing evidence never
          becomes an implied pass.
        </p>
      </div>
      {data.tiers.length > 0 ? (
        <ol className="prc-tier-list">
          {data.tiers.map((tier) => (
            <li key={tier.tier} data-tier={tier.tier}>
              <div className="prc-tier-number">T{tier.tier}</div>
              <div className="prc-tier-copy">
                <p className="prc-kicker">{tier.shortName}</p>
                <h3>{tier.name}</h3>
                <p>{tier.purpose}</p>
                {tier.requirements.length > 0 ? (
                  <ul>
                    {tier.requirements.map((requirement) => (
                      <li key={requirement}>
                        <Check aria-hidden="true" size={14} />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="prc-inline-empty">No tier controls supplied.</p>
                )}
                <span className="prc-authority-label">
                  Authority: {tier.authority}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title="Tier model unavailable"
          detail="Supply the authorized tier policy projection to describe assurance levels."
        />
      )}
    </section>
  );
}

function AgentRunbook({
  data,
  headingId,
  dryRunId,
}: {
  data: ReportCertificationSnapshot;
  headingId: string;
  dryRunId: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { agent } = data;

  return (
    <div className="prc-agent-grid">
      <section className="prc-panel prc-runbook-panel" aria-labelledby={headingId}>
        <div className="prc-agent-heading">
          <span className="prc-agent-icon" aria-hidden="true">
            <Bot size={23} />
          </span>
          <div>
            <p className="prc-kicker">Governed helper / read only</p>
            <h2 id={headingId}>{agent.name}</h2>
            <p>{agent.purpose}</p>
          </div>
          <span className="prc-mode-badge">
            <LockKeyhole aria-hidden="true" size={14} />
            Read only
          </span>
        </div>

        {agent.runbook.length > 0 ? (
          <ol className="prc-runbook-list">
            {agent.runbook.map((step, index) => (
              <li key={step.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <small>Output: {step.output}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Runbook unavailable"
            detail="No read-only agent steps were supplied."
          />
        )}
      </section>

      <div className="prc-agent-side">
        <section className="prc-panel prc-boundary-panel" aria-label="Agent authority boundary">
          <div className="prc-boundary-column prc-boundary-allowed">
            <h3>
              <CircleCheck aria-hidden="true" size={17} /> Allowed
            </h3>
            {agent.allowedActions.length > 0 ? (
              <ul>
                {agent.allowedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : (
              <p className="prc-inline-empty">No allowed actions declared.</p>
            )}
          </div>
          <div className="prc-boundary-column prc-boundary-blocked">
            <h3>
              <LockKeyhole aria-hidden="true" size={17} /> Prohibited
            </h3>
            {agent.prohibitedActions.length > 0 ? (
              <ul>
                {agent.prohibitedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : (
              <p className="prc-inline-empty">No prohibited actions declared.</p>
            )}
          </div>
        </section>

        <section className="prc-panel prc-dry-run-panel" aria-labelledby={`${dryRunId}-title`}>
          <div className="prc-dry-run-header">
            <div>
              <p className="prc-kicker">Synthetic / visual only</p>
              <h3 id={`${dryRunId}-title`}>Dry-run preview</h3>
            </div>
            <span className="prc-preview-label">No write path</span>
          </div>
          <p>
            Preview a supplied demonstration outcome. This control does not
            execute the evaluator or persist a decision.
          </p>
          <button
            type="button"
            className="prc-preview-button"
            aria-controls={dryRunId}
            aria-expanded={previewOpen}
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? <X aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
            {previewOpen ? "Close preview" : "Preview synthetic dry run"}
          </button>

          <div id={dryRunId} className="prc-dry-run-result" hidden={!previewOpen}>
            <div className="prc-dry-run-summary">
              <span>
                <small>Product</small>
                <strong>{agent.dryRun.productLabel}</strong>
              </span>
              <TierMark tier={agent.dryRun.candidateTier} />
              <VerdictBadge verdict={agent.dryRun.verdict} />
            </div>
            <ol>
              {agent.dryRun.steps.map((step) => (
                <li key={step.id} data-outcome={step.outcome}>
                  <span className="prc-dry-run-step-icon" aria-hidden="true">
                    {step.outcome === "ready" ? (
                      <Check size={13} />
                    ) : step.outcome === "blocked" ? (
                      <X size={13} />
                    ) : (
                      <CircleAlert size={13} />
                    )}
                  </span>
                  <span className="prc-dry-run-step-label">{step.label}</span>
                  <span className="prc-dry-run-outcome">
                    {step.outcome}
                  </span>
                </li>
              ))}
            </ol>
            <p>
              {agent.dryRun.evaluatedChecks} checks represented. {agent.dryRun.note}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ReportCertificationControl({
  data: providedData,
  showDemoBanner = providedData?.provenance !== "authorized",
  className,
  layout = "embedded",
}: ReportCertificationControlProps) {
  const data = providedData ?? demoReportCertificationSnapshot;
  const synthetic = data.provenance === "synthetic";
  const demoBannerVisible = synthetic || showDemoBanner;
  const [activeView, setActiveView] = useState<CertificationView>("registry");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const instanceId = useId().replaceAll(":", "");
  const searchId = `${instanceId}-certification-search`;
  const registryDescriptionId = `${instanceId}-registry-description`;
  const detailHeadingId = `${instanceId}-product-detail-heading`;
  const tierHeadingId = `${instanceId}-tier-heading`;
  const agentHeadingId = `${instanceId}-agent-heading`;
  const dryRunId = `${instanceId}-dry-run`;

  const filteredProducts = useMemo(
    () =>
      data.products.filter((product) => {
        const matchesStatus =
          statusFilter === "ALL" || product.verdict === statusFilter;
        const searchable = [
          product.name,
          product.description,
          product.sourceLabel,
          product.consumerLabel,
          product.ownerLabel,
          product.stewardLabel,
        ]
          .join(" ")
          .toLocaleLowerCase();
        return matchesStatus && searchable.includes(deferredQuery);
      }),
    [data.products, deferredQuery, statusFilter],
  );
  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedProductId) ??
    filteredProducts[0];
  const passingCount = data.products.filter(
    (product) => product.verdict === "PASS",
  ).length;
  const attentionCount = data.products.filter(
    (product) => product.verdict !== "PASS",
  ).length;
  const evidenceCount = data.products.reduce(
    (productTotal, product) =>
      productTotal +
      product.gates.reduce(
        (gateTotal, gate) => gateTotal + gate.evidence.length,
        0,
      ),
    0,
  );

  function activateTab(nextIndex: number) {
    const nextView = views[nextIndex];
    if (!nextView) {
      return;
    }
    setActiveView(nextView.id);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % views.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + views.length) % views.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = views.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      activateTab(nextIndex);
    }
  }

  return (
    <section
      className={joinClassNames("paul-os-report-certification", className)}
      data-layout={layout}
      data-synthetic={synthetic ? "true" : "false"}
      aria-label="Report certification control"
    >
      <header className="prc-feature-header">
        <div className="prc-brand-mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div className="prc-feature-title">
          <p>Paul OS / Assurance</p>
          {layout === "standalone" ? (
            <h1>Report Certification</h1>
          ) : (
            <h2>Report Certification</h2>
          )}
        </div>
        <div className="prc-header-meta">
          <span>{data.registryLabel}</span>
          <small>As of {formatDate(data.asOf, true)} UTC</small>
        </div>
      </header>

      {demoBannerVisible ? (
        <div className="prc-demo-banner" role="note">
          <CircleAlert aria-hidden="true" size={17} />
          <div>
            <strong>
              {synthetic
                ? "Synthetic demonstration data"
                : "Demonstration banner enabled"}
            </strong>
            <span>
              {synthetic
                ? "These products, decisions, evidence summaries, and dry-run output are illustrative. Nothing on this screen is an operational certificate."
                : "This authorized projection remains visibly marked for host integration review."}
            </span>
          </div>
        </div>
      ) : null}

      <div className="prc-workspace">
        <section className="prc-overview" aria-label="Certification summary">
          <div>
            <p className="prc-kicker">Governed assurance workspace</p>
            <h2>Prove the number, gate by gate.</h2>
            <p>
              Inspect product decisions, trace their evidence chain, and keep
              automated review inside a read-only authority boundary.
            </p>
          </div>
          <dl className="prc-summary-cards">
            <div>
              <dt>Products</dt>
              <dd>{data.products.length}</dd>
            </div>
            <div data-tone="pass">
              <dt>Passing</dt>
              <dd>{passingCount}</dd>
            </div>
            <div data-tone={attentionCount > 0 ? "attention" : "pass"}>
              <dt>Need attention</dt>
              <dd>{attentionCount}</dd>
            </div>
            <div data-tone="evidence">
              <dt>Evidence views</dt>
              <dd>{evidenceCount}</dd>
            </div>
          </dl>
        </section>

        <nav className="prc-tabs" aria-label="Certification views">
          <div role="tablist" aria-orientation="horizontal">
            {views.map((view, index) => {
              const selected = activeView === view.id;
              return (
                <button
                  key={view.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  id={`${instanceId}-${view.id}-tab`}
                  type="button"
                  role="tab"
                  aria-controls={`${instanceId}-${view.id}-panel`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveView(view.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {view.id === "registry" ? (
                    <FileCheck2 aria-hidden="true" size={16} />
                  ) : view.id === "tiers" ? (
                    <ShieldCheck aria-hidden="true" size={16} />
                  ) : (
                    <Bot aria-hidden="true" size={16} />
                  )}
                  {view.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          id={`${instanceId}-registry-panel`}
          role="tabpanel"
          aria-labelledby={`${instanceId}-registry-tab`}
          hidden={activeView !== "registry"}
          tabIndex={0}
        >
          <section className="prc-registry-toolbar" aria-label="Registry filters">
            <div className="prc-search-field">
              <label htmlFor={searchId}>Search products</label>
              <div>
                <Search aria-hidden="true" size={17} />
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  placeholder="Name, owner, source, or consumer"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <fieldset className="prc-status-filters">
              <legend>Decision status</legend>
              <div>
                {statusFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    data-active={statusFilter === filter.id ? "true" : "false"}
                    aria-pressed={statusFilter === filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <p id={registryDescriptionId} className="prc-results-note" role="status">
            Showing {filteredProducts.length} of {data.products.length} products.
          </p>

          <div className="prc-registry-layout">
            <section className="prc-panel prc-table-panel" aria-label="Certification registry">
              {data.products.length > 0 ? (
                <RegistryTable
                  products={filteredProducts}
                  selectedProductId={selectedProduct?.id}
                  onSelect={setSelectedProductId}
                  descriptionId={registryDescriptionId}
                />
              ) : (
                <EmptyState
                  title="Registry is empty"
                  detail="Supply an authorized certification projection to begin."
                />
              )}
            </section>
            <ProductDetail product={selectedProduct} headingId={detailHeadingId} />
          </div>
        </div>

        <div
          id={`${instanceId}-tiers-panel`}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tiers-tab`}
          hidden={activeView !== "tiers"}
          tabIndex={0}
        >
          <TierModel data={data} headingId={tierHeadingId} />
        </div>

        <div
          id={`${instanceId}-agent-panel`}
          role="tabpanel"
          aria-labelledby={`${instanceId}-agent-tab`}
          hidden={activeView !== "agent"}
          tabIndex={0}
        >
          <AgentRunbook
            data={data}
            headingId={agentHeadingId}
            dryRunId={dryRunId}
          />
        </div>
      </div>
    </section>
  );
}
