/**
 * Server-side domain contracts for the report-certification evaluator.
 *
 * These records are JSON-serializable so they can be preserved and replayed,
 * but serializable does not mean browser-safe. Evaluation inputs contain raw
 * evidence locations, hashes, and authority identifiers. Keep them behind a
 * server-only adapter and expose only the redacted view contracts below.
 */

export type CertificationTier = 0 | 1 | 2 | 3 | 4;
export type CertifiableTier = Exclude<CertificationTier, 0>;

export type CertificationVerdict =
  | "PASS"
  | "CONDITIONAL"
  | "BLOCKED"
  | "EXPIRED"
  | "NOT_PROVEN";

export type CertificationCheckStatus = "PASS" | "FAIL" | "NOT_PROVEN";

export type CertificationCheckFamily =
  | "registration"
  | "structural"
  | "movement"
  | "transformation_fidelity"
  | "operations"
  | "consumer_semantics"
  | "governance"
  | "continuous_assurance";

export type EvidenceArtifactKind =
  | "catalog_snapshot"
  | "contract"
  | "query_result"
  | "test_result"
  | "run_history"
  | "semantic_model"
  | "approval"
  | "policy"
  | "incident_record";

export interface CertificationProduct {
  id: string;
  name: string;
  consumerKind: string;
  consumerAssetId: string;
  primarySourceObject: string;
  accountableOwnerId: string;
  stewardId: string;
  criticality: "low" | "moderate" | "high" | "critical";
  requiredGateIds: string[];
  metricContractBinding: {
    contractId: string;
    version: string;
  };
}

export interface CertificationGate {
  id: string;
  productId: string;
  kind: "pipeline_edge" | "consumer";
  sequence: number;
  fromAssetId: string;
  toAssetId: string;
  ownerId: string;
  downstreamAssetIds: string[];
  /** Highest tier this gate is currently configured to prove. */
  targetTier: CertifiableTier;
  checkResultIds: string[];
}

export interface CertificationCheckResult {
  id: string;
  gateId: string;
  /** Stable policy-owned control identifier. */
  controlId: string;
  name: string;
  family: CertificationCheckFamily;
  requiredForTier: CertifiableTier;
  status: CertificationCheckStatus;
  reasonCode: string;
  ownerId: string;
  evidenceArtifactIds: string[];
  /** A policy-owned tolerance description; the evaluator never modifies it. */
  tolerance?: string;
  observedValue?: string;
}

export type CertificationArtifactSubject =
  | {
      type: "check_result";
      productId: string;
      gateId: string;
      checkResultId: string;
      controlId: string;
    }
  | {
      type: "metric_contract";
      productId: string;
      metricContractId: string;
      metricContractVersion: string;
    }
  | {
      type: "sme_approval";
      productId: string;
      approvalId: string;
      metricContractId: string;
      metricContractVersion: string;
      metricContractContentHash: string;
      approvalStatus: "approved" | "revoked";
      approverActorId: string;
      approverActorType:
        | "subject_matter_expert"
        | "policy_authority"
        | "agent";
      approvedAt: string;
      validUntil: string;
    }
  | {
      type: "exception";
      productId: string;
      gateId: string;
      checkResultId: string;
      exceptionId: string;
      exceptionStatus: "approved" | "pending" | "revoked";
      ownerId: string;
      reason: string;
      scope: string;
      remediationPlan: string;
      approvedByActorId: string;
      approvedByActorType: "policy_authority" | "agent";
      approvedAt: string;
      expiresAt: string;
      policyVersion: string;
    };

export interface CertificationArtifact {
  id: string;
  kind: EvidenceArtifactKind;
  uri: string;
  contentHash: string;
  producer: string;
  observedAt: string;
  subject: CertificationArtifactSubject;
}

export interface MetricContract {
  id: string;
  version: string;
  contentHash: string;
  artifactId: string;
  status: "active" | "superseded" | "withdrawn";
  effectiveAt: string;
  grain: string;
  measureIds: string[];
}

export interface SmeApproval {
  id: string;
  productId: string;
  metricContractId: string;
  metricContractVersion: string;
  metricContractContentHash: string;
  status: "approved" | "revoked";
  approverActorId: string;
  approverActorType: "subject_matter_expert" | "policy_authority" | "agent";
  approvedAt: string;
  validUntil: string;
  signatureArtifactId: string;
}

export interface CertificationException {
  id: string;
  productId: string;
  gateId: string;
  checkResultId: string;
  status: "approved" | "pending" | "revoked";
  ownerId: string;
  reason: string;
  scope: string;
  remediationPlan: string;
  approvedByActorId: string;
  approvedByActorType: "policy_authority" | "agent";
  approvedAt: string;
  expiresAt: string;
  policyVersion: string;
  evidenceArtifactId: string;
}

export interface CertificationControlRequirement {
  /** Stable identifier matched exactly by a check result. */
  id: string;
  tier: CertifiableTier;
  gateKinds: CertificationGate["kind"][];
  family: CertificationCheckFamily;
  evidenceKinds: EvidenceArtifactKind[];
  tolerance?: string;
}

export interface CertificationSmeAuthorityBinding {
  actorId: string;
  productIds: string[];
  metricContractIds: string[];
}

export interface CertificationExceptionAuthorityBinding {
  actorId: string;
  productIds: string[];
  controlIds: string[];
}

export interface CertificationPolicy {
  id: string;
  version: string;
  contentHash: string;
  minimumGateModel: true;
  missingEvidenceOutcome: "NOT_PROVEN";
  t3RequiresExactMetricContractApproval: true;
  exceptionsRequirePolicyApproval: true;
  topology: {
    minimumGateCount: number;
    requireAllDeclaredGates: true;
    requireContiguousSequence: true;
    requirePrimarySourceStart: true;
    requireConsumerTerminal: true;
  };
  evidenceValidityDays: number;
  /** Server-verified producer identities allowed to supply evidence. */
  trustedEvidenceProducers: string[];
  requiredControls: CertificationControlRequirement[];
  trustedAuthorities: {
    smeApprovers: CertificationSmeAuthorityBinding[];
    exceptionApprovers: CertificationExceptionAuthorityBinding[];
  };
}

export interface CertificationRun {
  id: string;
  productId: string;
  evaluatedAt: string;
  validUntil: string;
  policyVersion: string;
  policyContentHash: string;
  agentId: string;
  agentVersion: string;
  gitSha: string;
  pipelineManifestHash: string;
  semanticModelVersion: string;
}

/** Values supplied by the trusted server boundary, not by evidence adapters. */
export interface CertificationEvaluationContext {
  asOf: string;
  trustedPolicy: {
    id: string;
    version: string;
    contentHash: string;
  };
  /** Product registration and topology resolved by the trusted host registry. */
  trustedProduct: {
    id: string;
    primarySourceObject: string;
    consumerAssetId: string;
    requiredGateIds: string[];
    topologyHash: string;
  };
}

export interface CertificationEvaluationInput {
  run: CertificationRun;
  policy: CertificationPolicy;
  product: CertificationProduct;
  gates: CertificationGate[];
  checkResults: CertificationCheckResult[];
  artifacts: CertificationArtifact[];
  metricContract?: MetricContract;
  smeApproval?: SmeApproval;
  exceptions: CertificationException[];
}

export interface CertificationFinding {
  id: string;
  gateId: string;
  checkResultId?: string;
  outcome: Exclude<CertificationVerdict, "PASS" | "CONDITIONAL">;
  reasonCode: string;
  ownerId: string;
  downstreamAssetIds: string[];
  tier?: CertifiableTier;
  exceptionId?: string;
}

export interface CertificationGateDecision {
  gateId: string;
  kind: "pipeline_gate" | "business_assurance" | "certification_context";
  achievedTier: CertificationTier;
  verdict: CertificationVerdict;
  findingIds: string[];
  conditionalExceptionIds: string[];
}

export interface CertificationEvaluationEnvelope {
  schemaVersion: "1.0";
  context: CertificationEvaluationContext;
  input: CertificationEvaluationInput;
}

export interface CertificationEvidenceBundle {
  schemaVersion: "1.0";
  envelopeHash: string;
  envelope: CertificationEvaluationEnvelope;
  runId: string;
  productId: string;
  policyId: string;
  policyVersion: string;
  policyContentHash: string;
  agentId: string;
  agentVersion: string;
  evaluatedAt: string;
  originalValidUntil: string;
  gitSha: string;
  pipelineManifestHash: string;
  semanticModelVersion: string;
  gateIds: string[];
  artifacts: Array<{
    id: string;
    contentHash: string;
    observedAt: string;
  }>;
  metricContract?: {
    id: string;
    version: string;
    contentHash: string;
  };
  smeApproval?: {
    id: string;
    approverActorId: string;
    approvedAt: string;
    validUntil: string;
    signatureArtifactId: string;
  };
  exceptions: Array<{
    id: string;
    gateId: string;
    checkResultId: string;
    ownerId: string;
    approvedByActorId: string;
    approvedAt: string;
    expiresAt: string;
    evidenceArtifactId: string;
  }>;
}

export interface CertificationDecision {
  runId: string;
  productId: string;
  achievedTier: CertificationTier;
  verdict: CertificationVerdict;
  evaluatedAt: string;
  validUntil: string;
  gateDecisions: CertificationGateDecision[];
  findings: CertificationFinding[];
  conditionalExceptionIds: string[];
  evidenceBundle: CertificationEvidenceBundle;
}

export type CertificationAgentAction =
  | "inspect_metadata"
  | "run_read_only_check"
  | "preserve_evidence"
  | "draft_remediation"
  | "route_to_owner"
  | "mutate_production"
  | "approve_business_logic"
  | "approve_exception"
  | "loosen_tolerance";

export type RecertificationChangeKind =
  | "pipeline_code"
  | "pipeline_configuration"
  | "pipeline_test"
  | "source_schema"
  | "target_schema"
  | "lineage"
  | "grain"
  | "join"
  | "filter"
  | "materialization"
  | "semantic_measure"
  | "semantic_relationship"
  | "semantic_security"
  | "metric_contract"
  | "sme_approval"
  | "owner"
  | "exception_expired"
  | "approval_expired"
  | "slo_breach"
  | "anomaly"
  | "failed_backfill"
  | "unresolved_incident";

export interface RecertificationTrigger {
  id: string;
  productId: string;
  certificationRunId: string;
  kind: RecertificationChangeKind;
  sourceId: string;
  detectedAt: string;
  previousRevision?: string;
  currentRevision?: string;
  active?: boolean;
}

/**
 * Browser-safe projection for the certification registry. It intentionally
 * omits raw artifact URIs, content hashes, and authority identifiers.
 */
export interface CertificationEvidenceView {
  id: string;
  label: string;
  kind: EvidenceArtifactKind;
  sourceLabel: string;
  observedAt: string;
  status: "verified" | "conditional" | "missing" | "failed";
}

export interface CertificationGateView {
  id: string;
  label: string;
  fromLabel: string;
  toLabel: string;
  ownerLabel: string;
  achievedTier: CertificationTier;
  verdict: CertificationVerdict;
  evidence: CertificationEvidenceView[];
}

export interface CertifiedProductView {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  consumerLabel: string;
  ownerLabel: string;
  stewardLabel: string;
  criticality: CertificationProduct["criticality"];
  achievedTier: CertificationTier;
  verdict: CertificationVerdict;
  evaluatedAt: string;
  validUntil: string;
  policyLabel: string;
  contractLabel: string;
  summary: string;
  gates: CertificationGateView[];
}

export interface CertificationTierView {
  tier: CertificationTier;
  name: string;
  shortName: string;
  purpose: string;
  requirements: string[];
  authority: "none" | "automated evidence" | "human approval";
}

export interface CertificationAgentRunbookStep {
  id: string;
  title: string;
  description: string;
  output: string;
}

export interface CertificationDryRunPreview {
  productLabel: string;
  candidateTier: CertificationTier;
  verdict: CertificationVerdict;
  evaluatedChecks: number;
  note: string;
  steps: Array<{
    id: string;
    label: string;
    outcome: "ready" | "review" | "blocked";
  }>;
}

export interface ReportCertificationSnapshotPayload {
  asOf: string;
  registryLabel: string;
  products: CertifiedProductView[];
  tiers: CertificationTierView[];
  agent: {
    name: string;
    version: string;
    mode: "read_only";
    purpose: string;
    allowedActions: string[];
    prohibitedActions: string[];
    runbook: CertificationAgentRunbookStep[];
    dryRun: CertificationDryRunPreview;
  };
}

export type SyntheticReportCertificationSnapshot =
  ReportCertificationSnapshotPayload & {
    provenance: "synthetic";
  };

export type AuthorizedReportCertificationSnapshot =
  ReportCertificationSnapshotPayload & {
    provenance: "authorized";
  };

export type ReportCertificationSnapshot =
  | SyntheticReportCertificationSnapshot
  | AuthorizedReportCertificationSnapshot;

interface ReportCertificationControlBaseProps {
  /** Optional host-app class for layout integration. */
  className?: string;
  /** Embedded by default; standalone enables full-height page presentation. */
  layout?: "embedded" | "standalone";
}

export type ReportCertificationControlProps =
  ReportCertificationControlBaseProps &
    (
      | {
          /** No data means the built-in fixture is used and demo mode is mandatory. */
          data?: undefined;
          showDemoBanner?: true;
        }
      | {
          /** Explicit snapshots keep the banner unless provenance proves otherwise. */
          data: ReportCertificationSnapshot;
          showDemoBanner?: true;
        }
      | {
          /** Only an authorized projection may explicitly hide the demo banner. */
          data: AuthorizedReportCertificationSnapshot;
          showDemoBanner: false;
        }
    );
