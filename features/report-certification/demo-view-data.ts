import type {
  CertificationEvidenceView,
  CertificationGateView,
  CertificationTierView,
  CertifiedProductView,
  SyntheticReportCertificationSnapshot,
} from "./types";

const observedAt = "2026-08-27T14:30:00.000Z";

function evidence(
  id: string,
  label: string,
  status: CertificationEvidenceView["status"] = "verified",
  kind: CertificationEvidenceView["kind"] = "test_result",
): CertificationEvidenceView {
  return {
    id,
    label,
    kind,
    sourceLabel: "Synthetic evidence store",
    observedAt,
    status,
  };
}

function gate(
  id: string,
  label: string,
  fromLabel: string,
  toLabel: string,
  ownerLabel: string,
  achievedTier: CertificationGateView["achievedTier"],
  verdict: CertificationGateView["verdict"],
  evidenceRecords: CertificationEvidenceView[],
): CertificationGateView {
  return {
    id,
    label,
    fromLabel,
    toLabel,
    ownerLabel,
    achievedTier,
    verdict,
    evidence: evidenceRecords,
  };
}

const products: CertifiedProductView[] = [
  {
    id: "demo-product-001",
    name: "Production Throughput Brief",
    description:
      "Daily completed-unit and cycle-time view for operations planning.",
    sourceLabel: "Production order feed",
    consumerLabel: "Operations planning dashboard",
    ownerLabel: "Operations Analytics",
    stewardLabel: "Data Stewardship",
    criticality: "high",
    achievedTier: 3,
    verdict: "PASS",
    evaluatedAt: "2026-08-27T15:00:00.000Z",
    validUntil: "2026-11-25T15:00:00.000Z",
    policyLabel: "Minimum Gate Policy 2.3 (demo)",
    contractLabel: "Throughput Metric Contract 4.2 (demo)",
    summary:
      "All required handoff, business-definition, and approval evidence is present.",
    gates: [
      gate(
        "demo-gate-001-a",
        "Source registration",
        "Production order feed",
        "Validated staging model",
        "Data Intake",
        3,
        "PASS",
        [
          evidence(
            "demo-evidence-001-a-1",
            "Ownership and grain registration",
            "verified",
            "catalog_snapshot",
          ),
          evidence("demo-evidence-001-a-2", "Source movement check"),
        ],
      ),
      gate(
        "demo-gate-001-b",
        "Transformation controls",
        "Validated staging model",
        "Production measures model",
        "Analytics Engineering",
        3,
        "PASS",
        [
          evidence("demo-evidence-001-b-1", "Transformation fidelity suite"),
          evidence(
            "demo-evidence-001-b-2",
            "Metric contract binding",
            "verified",
            "contract",
          ),
        ],
      ),
      gate(
        "demo-gate-001-c",
        "Consumer semantics",
        "Production measures model",
        "Operations planning dashboard",
        "Business Intelligence",
        3,
        "PASS",
        [
          evidence(
            "demo-evidence-001-c-1",
            "Measure interpretation review",
            "verified",
            "semantic_model",
          ),
          evidence(
            "demo-evidence-001-c-2",
            "Subject-matter approval",
            "verified",
            "approval",
          ),
        ],
      ),
    ],
  },
  {
    id: "demo-product-002",
    name: "Inventory Readiness Summary",
    description:
      "Shift-level readiness view for material availability and staged work.",
    sourceLabel: "Inventory movement feed",
    consumerLabel: "Readiness summary",
    ownerLabel: "Planning Analytics",
    stewardLabel: "Supply Data Stewardship",
    criticality: "moderate",
    achievedTier: 2,
    verdict: "CONDITIONAL",
    evaluatedAt: "2026-08-27T15:04:00.000Z",
    validUntil: "2026-09-10T15:04:00.000Z",
    policyLabel: "Minimum Gate Policy 2.3 (demo)",
    contractLabel: "Readiness Definition 1.6 (demo)",
    summary:
      "A synthetic, time-limited exception covers one completeness control; human review remains required.",
    gates: [
      gate(
        "demo-gate-002-a",
        "Feed completeness",
        "Inventory movement feed",
        "Readiness model",
        "Supply Data Operations",
        2,
        "CONDITIONAL",
        [
          evidence("demo-evidence-002-a-1", "Movement completeness check"),
          evidence(
            "demo-evidence-002-a-2",
            "Time-limited exception record",
            "conditional",
            "approval",
          ),
        ],
      ),
      gate(
        "demo-gate-002-b",
        "Consumer verification",
        "Readiness model",
        "Readiness summary",
        "Planning Analytics",
        2,
        "PASS",
        [evidence("demo-evidence-002-b-1", "Consumer query comparison")],
      ),
    ],
  },
  {
    id: "demo-product-003",
    name: "Supplier Timing Forecast",
    description:
      "Illustrative arrival-window forecast for supplier coordination.",
    sourceLabel: "Supplier schedule feed",
    consumerLabel: "Timing forecast",
    ownerLabel: "Supplier Analytics",
    stewardLabel: "Planning Stewardship",
    criticality: "moderate",
    achievedTier: 1,
    verdict: "NOT_PROVEN",
    evaluatedAt: "2026-08-27T15:08:00.000Z",
    validUntil: "2026-08-27T15:08:00.000Z",
    policyLabel: "Minimum Gate Policy 2.3 (demo)",
    contractLabel: "Timing Definition 0.9 (demo)",
    summary:
      "Registration is complete, but a required transformation result is absent; the product is not certified for use.",
    gates: [
      gate(
        "demo-gate-003-a",
        "Source registration",
        "Supplier schedule feed",
        "Forecast staging model",
        "Supplier Data Operations",
        1,
        "PASS",
        [
          evidence(
            "demo-evidence-003-a-1",
            "Ownership registration",
            "verified",
            "catalog_snapshot",
          ),
        ],
      ),
      gate(
        "demo-gate-003-b",
        "Forecast transformation",
        "Forecast staging model",
        "Timing forecast",
        "Supplier Analytics",
        1,
        "NOT_PROVEN",
        [
          evidence(
            "demo-evidence-003-b-1",
            "Transformation result not supplied",
            "missing",
          ),
        ],
      ),
    ],
  },
  {
    id: "demo-product-004",
    name: "Delivery Reliability Scorecard",
    description:
      "Illustrative on-time delivery view used to demonstrate a blocked decision.",
    sourceLabel: "Delivery event feed",
    consumerLabel: "Reliability scorecard",
    ownerLabel: "Service Analytics",
    stewardLabel: "Delivery Data Stewardship",
    criticality: "critical",
    achievedTier: 0,
    verdict: "BLOCKED",
    evaluatedAt: "2026-08-27T15:12:00.000Z",
    validUntil: "2026-08-27T15:12:00.000Z",
    policyLabel: "Minimum Gate Policy 2.3 (demo)",
    contractLabel: "Delivery Definition 3.1 (demo)",
    summary:
      "A structural control failed. Certification is blocked and no exception is implied by this preview.",
    gates: [
      gate(
        "demo-gate-004-a",
        "Delivery event structure",
        "Delivery event feed",
        "Reliability model",
        "Service Data Operations",
        0,
        "BLOCKED",
        [
          evidence(
            "demo-evidence-004-a-1",
            "Required-field structure check",
            "failed",
          ),
        ],
      ),
    ],
  },
];

export const demoCertificationTiers: CertificationTierView[] = [
  {
    tier: 0,
    name: "Uncertified",
    shortName: "Uncertified",
    purpose: "No governed use claim has been established.",
    requirements: ["Evidence is absent, incomplete, expired, or blocked."],
    authority: "none",
  },
  {
    tier: 1,
    name: "Registered",
    shortName: "Registered",
    purpose: "Identify ownership, lineage, grain, and intended consumer.",
    requirements: ["Registered source", "Named owner", "Declared grain"],
    authority: "automated evidence",
  },
  {
    tier: 2,
    name: "Technically verified",
    shortName: "Verified",
    purpose: "Prove required movement and transformation controls at each gate.",
    requirements: ["Tier 1 complete", "Gate checks pass", "Evidence preserved"],
    authority: "automated evidence",
  },
  {
    tier: 3,
    name: "Business certified",
    shortName: "Certified",
    purpose: "Bind exact business meaning to an approved metric contract.",
    requirements: ["Tier 2 complete", "Exact contract", "Valid expert approval"],
    authority: "human approval",
  },
  {
    tier: 4,
    name: "Continuously assured",
    shortName: "Assured",
    purpose:
      "Continuously monitor the certified chain and recertification triggers.",
    requirements: ["Tier 3 complete", "Active monitors", "Automated invalidation"],
    authority: "human approval",
  },
];

/** A browser-safe, multi-record fixture with no raw locations or hashes. */
export const demoReportCertificationSnapshot: SyntheticReportCertificationSnapshot = {
  provenance: "synthetic",
  asOf: "2026-08-27T15:15:00.000Z",
  registryLabel: "Synthetic report assurance registry",
  products,
  tiers: demoCertificationTiers,
  agent: {
    name: "Certification review agent",
    version: "1.0.0-demo",
    mode: "read_only",
    purpose:
      "Inspect evidence, explain policy outcomes, and draft remediation without changing production data or approval state.",
    allowedActions: [
      "Inspect approved metadata projections",
      "Run read-only validation checks",
      "Preserve evidence references",
      "Draft remediation and route it to an owner",
    ],
    prohibitedActions: [
      "Mutate production data",
      "Approve business meaning or exceptions",
      "Loosen policy tolerances",
      "Publish a certification decision",
    ],
    runbook: [
      {
        id: "demo-runbook-01",
        title: "Resolve the governed product",
        description:
          "Match the requested consumer to its registered product, policy, and required gates.",
        output: "Read-only product scope",
      },
      {
        id: "demo-runbook-02",
        title: "Collect approved evidence views",
        description:
          "Read the authorized metadata projection and verify that required evidence is present and current.",
        output: "Evidence checklist",
      },
      {
        id: "demo-runbook-03",
        title: "Apply the deterministic evaluator",
        description:
          "Submit the server-held policy input to the pure evaluator; never infer a pass from missing evidence.",
        output: "Draft decision",
      },
      {
        id: "demo-runbook-04",
        title: "Route human authority",
        description:
          "Explain findings and route approvals or exceptions to the named policy authority.",
        output: "Owner-ready remediation",
      },
    ],
    dryRun: {
      productLabel: "Example capacity outlook",
      candidateTier: 2,
      verdict: "NOT_PROVEN",
      evaluatedChecks: 12,
      note: "One required consumer-semantics result is intentionally missing. This preview never records, approves, or publishes a decision.",
      steps: [
        {
          id: "demo-dry-step-01",
          label: "Registration evidence",
          outcome: "ready",
        },
        {
          id: "demo-dry-step-02",
          label: "Pipeline gate checks",
          outcome: "ready",
        },
        {
          id: "demo-dry-step-03",
          label: "Consumer semantics",
          outcome: "review",
        },
        {
          id: "demo-dry-step-04",
          label: "Publication",
          outcome: "blocked",
        },
      ],
    },
  },
};
