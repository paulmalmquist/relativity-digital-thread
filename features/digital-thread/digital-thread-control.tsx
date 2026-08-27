"use client";

import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronRight,
  Circle,
  Database,
  Factory,
  FileText,
  GitBranch,
  Network,
  Package,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  Workflow,
  Zap,
} from "lucide-react";

import { demoDigitalThreadData } from "./demo-data";
import "./digital-thread-control.css";
import type {
  ConnectorHealth,
  DigitalThreadControlProps,
  DigitalThreadMetric,
  DigitalThreadSystem,
  Domain,
  Health,
  SystemIconName,
  ThreadEvent,
  ThreadIssue,
} from "./types";

const domainOrder: Domain[] = [
  "All",
  "Engineering",
  "Manufacturing",
  "Quality",
  "Logistics",
];

const loopStages = [
  "Observe",
  "Contextualize",
  "Explain",
  "Simulate",
  "Decide",
  "Act",
  "Measure",
  "Learn",
];

const systemIcons: Record<SystemIconName, LucideIcon> = {
  database: Database,
  factory: Factory,
  "file-text": FileText,
  "git-branch": GitBranch,
  package: Package,
  radio: Radio,
  "shield-check": ShieldCheck,
};

type View = "live" | "systems" | "governance";

const viewOrder: View[] = ["live", "systems", "governance"];

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatUtcTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ][date.getUTCMonth()];
  const part = (number: number) => String(number).padStart(2, "0");

  return `${part(date.getUTCDate())} ${month} ${date.getUTCFullYear()}  ${part(date.getUTCHours())}:${part(date.getUTCMinutes())}:${part(date.getUTCSeconds())} UTC`;
}

function HealthDot({ health }: { health: Health }) {
  return (
    <span
      className={`health-dot health-${health}`}
      role="img"
      aria-label={health}
    />
  );
}

function StatusPill({ status }: { status: ThreadEvent["status"] }) {
  const label =
    status === "propagated"
      ? "Propagated"
      : status === "attention"
        ? "Attention"
        : "Processing";

  return (
    <span data-rdt-slot="badge" className={`status-pill status-${status}`}>
      <span className="status-pip" />
      {label}
    </span>
  );
}

function MetricCard({ metric }: { metric: DigitalThreadMetric }) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span>{metric.label}</span>
        <span className={`metric-signal signal-${metric.tone ?? "green"}`} />
      </div>
      <div className="metric-value">{metric.value}</div>
      <p>{metric.detail}</p>
    </article>
  );
}

function Toggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle live telemetry animation"
      data-rdt-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
    >
      <span data-rdt-slot="switch-thumb" />
    </button>
  );
}

function Topology({
  systems,
  activeSource,
  live,
  eventsPerMinute,
  contractCount,
}: {
  systems: DigitalThreadSystem[];
  activeSource: string;
  live: boolean;
  eventsPerMinute: number;
  contractCount: number;
}) {
  const titleId = useId();

  return (
    <section className="panel topology-panel" aria-labelledby={titleId}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">
            <Network size={13} /> Live topology
          </div>
          <h2 id={titleId}>Enterprise sync fabric</h2>
        </div>
        <div className="topology-legend">
          <span>
            <HealthDot health="healthy" /> Nominal
          </span>
          <span>
            <HealthDot health="warning" /> Watch
          </span>
        </div>
      </div>

      <div className={`topology ${live ? "is-live" : "is-paused"}`}>
        <div className="grid-field" />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="beam beam-a" />
        <div className="beam beam-b" />
        <div className="beam beam-c" />
        <div className="beam beam-d" />
        <div className="core-node">
          <div className="core-pulse" />
          <Zap size={18} />
          <strong>EVENT MESH</strong>
          <span>event bus · contracts</span>
        </div>
        <div className="data-node">
          <Database size={15} />
          <div>
            <strong>ANALYTICS</strong>
            <span>digital thread</span>
          </div>
        </div>
        {systems.map((system) => {
          const Icon = systemIcons[system.icon];
          const sourceToken = system.label.toLowerCase().split(" ")[0];
          const isActive = activeSource.toLowerCase().includes(sourceToken);

          return (
            <div
              key={system.id}
              className={`system-node ${system.position} ${isActive ? "is-active" : ""}`}
            >
              <div className="system-icon">
                <Icon size={16} />
              </div>
              <div className="system-copy">
                <div>
                  <strong>{system.label}</strong>
                  <HealthDot health={system.health} />
                </div>
                <span>{system.sublabel}</span>
                <small>{system.authority}</small>
              </div>
              <em>{system.freshness}</em>
            </div>
          );
        })}
      </div>

      <div className="topology-footer">
        <span>
          <Radio size={13} /> {eventsPerMinute} events/min
        </span>
        <span>
          <Workflow size={13} /> {contractCount} versioned contracts
        </span>
        <span>
          <ShieldCheck size={13} /> {systems.length} authoritative domains
        </span>
      </div>
    </section>
  );
}

function TracePanel({
  event,
  replayStep,
  replaying,
  onReplay,
}: {
  event: ThreadEvent;
  replayStep: number;
  replaying: boolean;
  onReplay: () => void;
}) {
  const titleId = useId();

  return (
    <aside className="panel trace-panel" aria-labelledby={titleId}>
      <div className="panel-heading trace-heading">
        <div>
          <div className="eyebrow">
            <GitBranch size={13} /> End-to-end trace
          </div>
          <h2 id={titleId}>{event.id}</h2>
        </div>
        <StatusPill status={event.status} />
      </div>

      <div className="trace-hero">
        <span className="event-domain">{event.domain}</span>
        <h3>{event.title}</h3>
        <p>{event.object}</p>
      </div>

      <div className="trace-meta">
        <div>
          <span>Contract</span>
          <strong>{event.contract}</strong>
        </div>
        <div>
          <span>Correlation</span>
          <strong>{event.correlationId}</strong>
        </div>
      </div>

      <p className="trace-description">{event.description}</p>
      <div className="authority-note">
        <ShieldCheck size={15} />
        <span>{event.authority}</span>
      </div>

      <div className="trace-actions">
        <span>Propagation path</span>
        <button
          type="button"
          onClick={onReplay}
          disabled={replaying || event.steps.length === 0}
        >
          {replaying ? (
            <span className="animate-spin">
              <RefreshCw />
            </span>
          ) : (
            <Play />
          )}
          {replaying ? "Replaying" : "Replay trace"}
        </button>
      </div>

      <ol className="propagation-list">
        {event.steps.map((step, index) => {
          const revealed = replaying ? index <= replayStep : true;
          const complete = revealed && step.state !== "pending";
          const current = replaying && index === replayStep;

          return (
            <li
              key={step.id}
              className={`${revealed ? "step-active" : "step-muted"} step-${step.state} ${current ? "step-current" : ""}`}
            >
              <div
                className="step-marker"
                role="img"
                aria-label={complete ? "Complete" : step.state === "pending" ? "Pending" : "Not replayed"}
              >
                {complete ? <Check size={12} /> : <Circle size={9} />}
              </div>
              <div className="step-copy">
                <div>
                  <strong>{step.system}</strong>
                  <span>{step.time}</span>
                </div>
                <p>{step.action}</p>
              </div>
              <em>{step.latency}</em>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function EventLog({
  selectedId,
  events,
  synthetic,
  onSelect,
}: {
  selectedId?: string;
  events: ThreadEvent[];
  synthetic: boolean;
  onSelect: (event: ThreadEvent) => void;
}) {
  const titleId = useId();

  return (
    <section className="panel event-log" aria-labelledby={titleId}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">
            <Activity size={13} /> Canonical event log
          </div>
          <h2 id={titleId}>Recent enterprise changes</h2>
        </div>
        <span className="panel-note">
          {synthetic ? "Synthetic demonstration data" : "Authorized projection"}
        </span>
      </div>
      <div data-rdt-slot="table-container">
        <table data-rdt-slot="table" className="thread-table">
          <thead data-rdt-slot="table-header">
            <tr data-rdt-slot="table-row">
              <th data-rdt-slot="table-head">Time</th>
              <th data-rdt-slot="table-head">Event / object</th>
              <th data-rdt-slot="table-head">Authority</th>
              <th data-rdt-slot="table-head">Status</th>
              <th data-rdt-slot="table-head" className="text-right">
                Targets
              </th>
              <th data-rdt-slot="table-head" className="text-right">
                E2E
              </th>
              <th data-rdt-slot="table-head">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody data-rdt-slot="table-body">
            {events.map((event) => (
              <tr
                key={event.id}
                data-rdt-slot="table-row"
                data-state={selectedId === event.id ? "selected" : undefined}
              >
                <td data-rdt-slot="table-cell" className="mono-cell">
                  {event.time}
                </td>
                <td data-rdt-slot="table-cell">
                  <button
                    type="button"
                    className="event-cell event-row-button"
                    aria-label={`Inspect ${event.title}`}
                    aria-pressed={selectedId === event.id}
                    onClick={() => onSelect(event)}
                  >
                    <strong>{event.title}</strong>
                    <span>{event.object}</span>
                  </button>
                </td>
                <td data-rdt-slot="table-cell">
                  <span className="source-label">{event.source}</span>
                </td>
                <td data-rdt-slot="table-cell">
                  <StatusPill status={event.status} />
                </td>
                <td data-rdt-slot="table-cell" className="text-right mono-cell">
                  {event.targets}
                </td>
                <td data-rdt-slot="table-cell" className="text-right mono-cell">
                  {event.latency}
                </td>
                <td data-rdt-slot="table-cell">
                  <ChevronRight size={15} className="table-chevron" aria-hidden="true" />
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr data-rdt-slot="table-row">
                <td data-rdt-slot="table-cell" colSpan={7} className="empty-row">
                  No events match this domain.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemHealthView({
  connectors,
  eventsPerMinute,
  bars,
  stats,
}: {
  connectors: ConnectorHealth[];
  eventsPerMinute: number;
  bars: number[];
  stats: Array<{ label: string; value: string; tone?: "warning" }>;
}) {
  const nominal = connectors.filter(
    (connector) => connector.health === "healthy",
  ).length;

  return (
    <div className="systems-layout">
      <section className="panel connector-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">
              <Server size={13} /> Connector estate
            </div>
            <h2>Systems and contracts</h2>
          </div>
          <span data-rdt-slot="badge" className="warning-badge">
            {nominal} / {connectors.length} nominal
          </span>
        </div>
        <div data-rdt-slot="table-container">
          <table data-rdt-slot="table" className="connector-table">
            <thead data-rdt-slot="table-header">
              <tr data-rdt-slot="table-row">
                <th data-rdt-slot="table-head">System</th>
                <th data-rdt-slot="table-head">Integration</th>
                <th data-rdt-slot="table-head">Contract</th>
                <th data-rdt-slot="table-head">Freshness</th>
                <th data-rdt-slot="table-head" className="text-right">
                  Backlog
                </th>
                <th data-rdt-slot="table-head" className="text-right">
                  Reconciled
                </th>
              </tr>
            </thead>
            <tbody data-rdt-slot="table-body">
              {connectors.map((connector) => (
                <tr data-rdt-slot="table-row" key={connector.id}>
                  <td data-rdt-slot="table-cell">
                    <div className="connector-name">
                      <HealthDot health={connector.health} />
                      <div>
                        <strong>{connector.system}</strong>
                        <span>{connector.owner}</span>
                      </div>
                    </div>
                  </td>
                  <td data-rdt-slot="table-cell">{connector.method}</td>
                  <td data-rdt-slot="table-cell" className="mono-cell">
                    {connector.contract}
                  </td>
                  <td
                    data-rdt-slot="table-cell"
                    className={joinClasses(
                      "mono-cell",
                      connector.health === "warning" && "warn-text",
                    )}
                  >
                    {connector.freshness}
                  </td>
                  <td data-rdt-slot="table-cell" className="text-right mono-cell">
                    {connector.backlog}
                  </td>
                  <td data-rdt-slot="table-cell" className="text-right mono-cell">
                    {connector.reconcile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel throughput-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">
              <Activity size={13} /> 60-minute window
            </div>
            <h2>Event throughput</h2>
          </div>
          <strong className="throughput-value">
            {eventsPerMinute} <span>evt/min</span>
          </strong>
        </div>
        <div
          className="chart-shell"
          role="img"
          aria-label="Event throughput over sixty minutes"
        >
          <div className="chart-grid" />
          <div className="chart-bars">
            {bars.map((height, index) => (
              <i
                key={`${index}-${height}`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${index * 45}ms`,
                }}
              />
            ))}
          </div>
          <div className="chart-baseline">
            <span>-60m</span>
            <span>-30m</span>
            <span>now</span>
          </div>
        </div>
        <div className="throughput-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong className={stat.tone === "warning" ? "warn-text" : ""}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function GovernanceView({
  issues,
  score,
  coverage,
}: {
  issues: ThreadIssue[];
  score: number;
  coverage: Array<{ label: string; value: number; detail: string }>;
}) {
  return (
    <div className="governance-grid">
      <section className="panel coverage-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={13} /> Readiness model
            </div>
            <h2>Digital-thread coverage</h2>
          </div>
          <span className="coverage-score">
            {score}
            <span>%</span>
          </span>
        </div>
        <div className="coverage-list">
          {coverage.map((item) => (
            <div className="coverage-row" key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
              <div className="coverage-value">{item.value}%</div>
              <div className="progress-track">
                <i style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel exception-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">
              <AlertTriangle size={13} /> Reconciliation
            </div>
            <h2>Open exceptions</h2>
          </div>
          <span data-rdt-slot="badge" className="warning-badge">
            {issues.length} require attention
          </span>
        </div>
        <div className="issue-list">
          {issues.map((issue) => (
            <article key={issue.id} className="issue-card">
              <div className={`issue-icon issue-${issue.severity}`}>
                <AlertTriangle size={16} />
              </div>
              <div className="issue-copy">
                <div>
                  <strong>{issue.title}</strong>
                  <span>{issue.age}</span>
                </div>
                <p>{issue.object}</p>
                <small>{issue.detail}</small>
                <em>Owner · {issue.owner}</em>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel authority-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">
              <Database size={13} /> Authority policy
            </div>
            <h2>State-change modes</h2>
          </div>
        </div>
        <div className="policy-grid">
          <div>
            <span className="policy-code auto">AUTO</span>
            <strong>Read-only projection</strong>
            <p>Downstream copy updates automatically from the authoritative event.</p>
          </div>
          <div>
            <span className="policy-code gate">GATE</span>
            <strong>Operational command</strong>
            <p>Policy checked, idempotent API command, then source confirmation.</p>
          </div>
          <div>
            <span className="policy-code approve">APPROVE</span>
            <strong>Controlled change</strong>
            <p>Quality or engineering approval is required before propagation.</p>
          </div>
          <div>
            <span className="policy-code review">REVIEW</span>
            <strong>Conflict</strong>
            <p>No silent overwrite; route to an accountable exception owner.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function DigitalThreadControl({
  data: providedData,
  showDemoBanner = true,
  className,
  layout = "embedded",
}: DigitalThreadControlProps) {
  const data = providedData ?? demoDigitalThreadData;
  const synthetic =
    providedData === undefined ||
    providedData === demoDigitalThreadData ||
    showDemoBanner;
  const tabsId = useId();
  const liveTabId = `${tabsId}-tab-live`;
  const livePanelId = `${tabsId}-panel-live`;
  const systemsTabId = `${tabsId}-tab-systems`;
  const systemsPanelId = `${tabsId}-panel-systems`;
  const governanceTabId = `${tabsId}-tab-governance`;
  const governancePanelId = `${tabsId}-panel-governance`;
  const liveToggleId = `${tabsId}-live-mode`;
  const [live, setLive] = useState(true);
  const [activeView, setActiveView] = useState<View>("live");
  const [selectedDomain, setSelectedDomain] = useState<Domain>("All");
  const [selectedEventId, setSelectedEventId] = useState(
    data.events[0]?.id ?? "",
  );
  const [replaying, setReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(
    Math.max((data.events[0]?.steps.length ?? 1) - 1, 0),
  );

  const availableDomains = domainOrder.filter(
    (domain) =>
      domain === "All" || data.events.some((event) => event.domain === domain),
  );
  const effectiveDomain = availableDomains.includes(selectedDomain)
    ? selectedDomain
    : "All";
  const filteredEvents = data.events.filter(
    (event) => effectiveDomain === "All" || event.domain === effectiveDomain,
  );
  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ??
    filteredEvents[0];
  const selectedStepCount = selectedEvent?.steps.length ?? 0;

  useEffect(() => {
    if (!replaying || selectedStepCount === 0) return;
    if (replayStep >= selectedStepCount - 1) {
      const endTimer = window.setTimeout(() => setReplaying(false), 550);
      return () => window.clearTimeout(endTimer);
    }

    const timer = window.setTimeout(
      () => setReplayStep((step) => step + 1),
      560,
    );
    return () => window.clearTimeout(timer);
  }, [replaying, replayStep, selectedStepCount]);

  const handleSelect = (event: ThreadEvent) => {
    setSelectedEventId(event.id);
    setReplaying(false);
    setReplayStep(Math.max(event.steps.length - 1, 0));
  };

  const handleReplay = () => {
    if (selectedStepCount === 0) return;
    setReplayStep(0);
    setReplaying(true);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: View,
  ) => {
    let nextIndex: number | undefined;
    const currentIndex = viewOrder.indexOf(currentView);

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % viewOrder.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + viewOrder.length) % viewOrder.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = viewOrder.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveView(viewOrder[nextIndex]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  };

  return (
    <section
      className={joinClasses("relativity-digital-thread", className)}
      data-layout={layout}
      data-synthetic={synthetic ? "true" : "false"}
      aria-label="Digital thread control"
    >
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <Network size={18} />
          </div>
          <div>
            <strong>RELATIVITY</strong>
            <span>DIGITAL THREAD // CONTROL</span>
          </div>
        </div>
        <div className="topbar-center">
          <span className="environment-pill">
            <span /> {synthetic ? "DEMONSTRATION MIRROR" : "AUTHORIZED VIEW"}
          </span>
          <time className="utc-clock" dateTime={data.asOf}>
            {formatUtcTimestamp(data.asOf)}
          </time>
        </div>
        <div className="live-control">
          <label htmlFor={liveToggleId}>
            {live ? <Activity size={14} /> : <Pause size={14} />} Live telemetry
          </label>
          <Toggle
            id={liveToggleId}
            checked={live}
            onCheckedChange={setLive}
          />
        </div>
      </header>

      {synthetic ? (
        <div className="demo-banner" role="note">
          <strong>DEMONSTRATION ENVIRONMENT</strong>
          <span>
            All events, identifiers, connector states, and metrics are synthetic.
            System classes are modeled until mapped to an authorized environment.
          </span>
        </div>
      ) : null}

      <div className="workspace">
        <section className="page-intro">
          <div>
            <div className="eyebrow">
              <span className="beacon" /> Enterprise observability
            </div>
            <h1>One change. Every consequence.</h1>
            <p>
              Authoritative systems, governed events, and verified downstream state
              across the full manufacturing digital thread.
            </p>
          </div>
          <div className="freshness-block">
            <span>Last reconciliation</span>
            <strong>
              <RefreshCw size={14} /> {data.lastReconciledSecondsAgo} seconds ago
            </strong>
          </div>
        </section>

        <section className="metric-grid" aria-label="Digital thread key metrics">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <div className="loop-ribbon" aria-label="Observation loop">
          {loopStages.map((stage, index) => (
            <div key={stage}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {stage}
              {index < loopStages.length - 1 ? <ChevronRight size={12} /> : null}
            </div>
          ))}
        </div>

        <div data-rdt-slot="tabs" className="main-tabs">
          <div className="tab-toolbar">
            <div
              data-rdt-slot="tabs-list"
              role="tablist"
              aria-label="Digital thread views"
              aria-orientation="horizontal"
            >
              <button
                id={liveTabId}
                type="button"
                role="tab"
                data-rdt-slot="tabs-trigger"
                data-state={activeView === "live" ? "active" : "inactive"}
                aria-selected={activeView === "live"}
                aria-controls={livePanelId}
                tabIndex={activeView === "live" ? 0 : -1}
                onClick={() => setActiveView("live")}
                onKeyDown={(event) => handleTabKeyDown(event, "live")}
              >
                <Activity /> Live thread
              </button>
              <button
                id={systemsTabId}
                type="button"
                role="tab"
                data-rdt-slot="tabs-trigger"
                data-state={activeView === "systems" ? "active" : "inactive"}
                aria-selected={activeView === "systems"}
                aria-controls={systemsPanelId}
                tabIndex={activeView === "systems" ? 0 : -1}
                onClick={() => setActiveView("systems")}
                onKeyDown={(event) => handleTabKeyDown(event, "systems")}
              >
                <Server /> System health
              </button>
              <button
                id={governanceTabId}
                type="button"
                role="tab"
                data-rdt-slot="tabs-trigger"
                data-state={activeView === "governance" ? "active" : "inactive"}
                aria-selected={activeView === "governance"}
                aria-controls={governancePanelId}
                tabIndex={activeView === "governance" ? 0 : -1}
                onClick={() => setActiveView("governance")}
                onKeyDown={(event) => handleTabKeyDown(event, "governance")}
              >
                <ShieldCheck /> Governance
              </button>
            </div>
            <div
              className="domain-filters"
              role="group"
              aria-label="Filter events by domain"
            >
              {availableDomains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={effectiveDomain === domain ? "is-selected" : ""}
                  aria-pressed={effectiveDomain === domain}
                  onClick={() => {
                    setSelectedDomain(domain);
                    const next = data.events.find(
                      (event) => domain === "All" || event.domain === domain,
                    );
                    if (next) {
                      handleSelect(next);
                    } else {
                      setSelectedEventId("");
                      setReplaying(false);
                      setReplayStep(0);
                    }
                  }}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          <div
            id={livePanelId}
            data-rdt-slot="tabs-content"
            className="tab-content"
            role="tabpanel"
            aria-labelledby={liveTabId}
            hidden={activeView !== "live"}
          >
              <div className="primary-grid">
                <Topology
                  systems={data.systems}
                  activeSource={selectedEvent?.source ?? ""}
                  live={live}
                  eventsPerMinute={data.throughput.eventsPerMinute}
                  contractCount={data.connectors.length}
                />
                {selectedEvent ? (
                  <TracePanel
                    event={selectedEvent}
                    replayStep={replayStep}
                    replaying={replaying}
                    onReplay={handleReplay}
                  />
                ) : (
                  <aside className="panel trace-panel empty-state">
                    No event data is available.
                  </aside>
                )}
              </div>
              <EventLog
                selectedId={selectedEvent?.id}
                events={filteredEvents}
                synthetic={synthetic}
                onSelect={handleSelect}
              />
          </div>

          <div
            id={systemsPanelId}
            data-rdt-slot="tabs-content"
            className="tab-content"
            role="tabpanel"
            aria-labelledby={systemsTabId}
            hidden={activeView !== "systems"}
          >
              <SystemHealthView
                connectors={data.connectors}
                eventsPerMinute={data.throughput.eventsPerMinute}
                bars={data.throughput.bars}
                stats={data.throughput.stats}
              />
          </div>

          <div
            id={governancePanelId}
            data-rdt-slot="tabs-content"
            className="tab-content"
            role="tabpanel"
            aria-labelledby={governanceTabId}
            hidden={activeView !== "governance"}
          >
              <GovernanceView
                issues={data.issues}
                score={data.governance.score}
                coverage={data.governance.coverage}
              />
          </div>
        </div>

        <footer className="app-footer">
          <div>
            {synthetic ? <span className="demo-label">DEMO</span> : null}
            Serializable adapter profile · replace the fixture with an authorized API
            snapshot
          </div>
          <div>
            <Timer size={13} /> Monitoring window · rolling {data.monitoringWindowDays}
            days
          </div>
        </footer>
      </div>
    </section>
  );
}
