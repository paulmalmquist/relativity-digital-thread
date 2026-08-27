export type Health = "healthy" | "warning" | "degraded";

export type Domain =
  | "All"
  | "Engineering"
  | "Manufacturing"
  | "Quality"
  | "Logistics";

export type SystemIconName =
  | "database"
  | "factory"
  | "file-text"
  | "git-branch"
  | "package"
  | "radio"
  | "shield-check";

export type SystemPosition =
  | "node-nw"
  | "node-ne"
  | "node-w"
  | "node-e"
  | "node-sw"
  | "node-se";

export interface DigitalThreadSystem {
  id: string;
  label: string;
  sublabel: string;
  authority: string;
  health: Health;
  freshness: string;
  position: SystemPosition;
  icon: SystemIconName;
}

export interface PropagationStep {
  id: string;
  system: string;
  action: string;
  time: string;
  latency: string;
  state: "complete" | "approved" | "observed" | "pending";
}

export interface ThreadEvent {
  id: string;
  domain: Exclude<Domain, "All">;
  title: string;
  object: string;
  source: string;
  sourceSystem: string;
  time: string;
  status: "propagated" | "attention" | "processing";
  targets: number;
  latency: string;
  contract: string;
  correlationId: string;
  authority: string;
  description: string;
  steps: PropagationStep[];
}

export interface ConnectorHealth {
  id: string;
  system: string;
  owner: string;
  method: string;
  contract: string;
  freshness: string;
  backlog: string;
  reconcile: string;
  health: Health;
}

export interface ThreadIssue {
  id: string;
  severity: "warning" | "info";
  title: string;
  object: string;
  detail: string;
  age: string;
  owner: string;
}

export interface DigitalThreadMetric {
  label: string;
  value: string;
  detail: string;
  tone?: "green" | "cyan" | "amber";
}

export interface CoverageItem {
  label: string;
  value: number;
  detail: string;
}

export interface ThroughputStat {
  label: string;
  value: string;
  tone?: "warning";
}

/**
 * Serializable view model expected by the dashboard. Keep vendor-specific API
 * objects behind an adapter and pass only this shape across a Server/Client
 * Component boundary.
 */
export interface DigitalThreadSnapshot {
  asOf: string;
  lastReconciledSecondsAgo: number;
  monitoringWindowDays: number;
  metrics: DigitalThreadMetric[];
  systems: DigitalThreadSystem[];
  events: ThreadEvent[];
  connectors: ConnectorHealth[];
  issues: ThreadIssue[];
  throughput: {
    eventsPerMinute: number;
    bars: number[];
    stats: ThroughputStat[];
  };
  governance: {
    score: number;
    coverage: CoverageItem[];
  };
}

interface DigitalThreadControlBaseProps {
  /** Optional host-app class for layout integration. */
  className?: string;
  /** Embedded by default; standalone enables full-height, sticky page chrome. */
  layout?: "embedded" | "standalone";
}

export type DigitalThreadControlProps = DigitalThreadControlBaseProps &
  (
    | {
        /** No data means the built-in fixture is used and demo mode is mandatory. */
        data?: undefined;
        showDemoBanner?: true;
      }
    | {
        /** API-backed, serializable snapshot supplied by the host application. */
        data: DigitalThreadSnapshot;
        /** Keep true until every visible value comes from an authorized source. */
        showDemoBanner?: boolean;
      }
  );
