import {
  certificationPolicyContentHash,
  certificationProductTopologyHash,
} from "./certification-policy";
import type {
  CertificationArtifact,
  CertificationCheckResult,
  CertificationControlRequirement,
  CertificationEvaluationContext,
  CertificationEvaluationInput,
  CertificationGate,
  CertificationPolicy,
  CertificationProduct,
  CertifiableTier,
} from "./types";

const demoProductId = "product:demo-production-flow";
const demoContractId = "contract:demo-production-flow";
const demoContractVersion = "4.2.0-demo";
const demoContractHash =
  "sha256:1000000000000000000000000000000000000000000000000000000000000001";
const demoObservedAt = "2026-08-27T14:30:00.000Z";

export const demoCertificationRequiredControls: CertificationControlRequirement[] = [
  {
    id: "registration.identity",
    tier: 1,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "registration",
    evidenceKinds: ["catalog_snapshot"],
  },
  {
    id: "verification.structure",
    tier: 2,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "structural",
    evidenceKinds: ["contract"],
  },
  {
    id: "verification.movement",
    tier: 2,
    gateKinds: ["pipeline_edge"],
    family: "movement",
    evidenceKinds: ["query_result"],
    tolerance: "policy-owned maximum variance: 0.25%",
  },
  {
    id: "verification.transformation-fidelity",
    tier: 2,
    gateKinds: ["pipeline_edge"],
    family: "transformation_fidelity",
    evidenceKinds: ["test_result"],
    tolerance: "policy-owned maximum variance: 0.25%",
  },
  {
    id: "verification.operations",
    tier: 2,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "operations",
    evidenceKinds: ["run_history"],
  },
  {
    id: "assurance.governance",
    tier: 3,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "governance",
    evidenceKinds: ["policy"],
  },
  {
    id: "assurance.consumer-semantics",
    tier: 3,
    gateKinds: ["consumer"],
    family: "consumer_semantics",
    evidenceKinds: ["semantic_model"],
  },
  {
    id: "continuous.monitoring",
    tier: 4,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "continuous_assurance",
    evidenceKinds: ["run_history"],
  },
  {
    id: "continuous.alerting",
    tier: 4,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "continuous_assurance",
    evidenceKinds: ["test_result"],
  },
  {
    id: "continuous.routing",
    tier: 4,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "continuous_assurance",
    evidenceKinds: ["policy"],
  },
  {
    id: "continuous.incident-response",
    tier: 4,
    gateKinds: ["pipeline_edge", "consumer"],
    family: "continuous_assurance",
    evidenceKinds: ["incident_record"],
  },
];

const demoCertificationPolicyDefinition: Omit<
  CertificationPolicy,
  "contentHash"
> = {
  id: "policy:demo-minimum-gate",
  version: "2.3.0-demo",
  minimumGateModel: true,
  missingEvidenceOutcome: "NOT_PROVEN",
  t3RequiresExactMetricContractApproval: true,
  exceptionsRequirePolicyApproval: true,
  topology: {
    minimumGateCount: 2,
    requireAllDeclaredGates: true,
    requireContiguousSequence: true,
    requirePrimarySourceStart: true,
    requireConsumerTerminal: true,
  },
  evidenceValidityDays: 90,
  trustedEvidenceProducers: [
    "demo-certification-fixture",
    "demo-contract-registry",
    "demo-approval-registry",
    "demo-exception-registry",
  ],
  requiredControls: demoCertificationRequiredControls,
  trustedAuthorities: {
    smeApprovers: [
      {
        actorId: "role:demo-operations-sme",
        productIds: [demoProductId],
        metricContractIds: [demoContractId],
      },
    ],
    exceptionApprovers: [
      {
        actorId: "role:demo-certification-policy-owner",
        productIds: [demoProductId],
        controlIds: demoCertificationRequiredControls.map(
          (control) => control.id,
        ),
      },
    ],
  },
};

export const demoCertificationPolicy: CertificationPolicy = {
  ...demoCertificationPolicyDefinition,
  contentHash: certificationPolicyContentHash(
    demoCertificationPolicyDefinition,
  ),
};

export const demoCertificationProduct: CertificationProduct = {
  id: demoProductId,
  name: "Production Flow Overview",
  consumerKind: "analytics_dashboard",
  consumerAssetId: "consumer:demo-production-flow",
  primarySourceObject: "source:demo-production-orders",
  accountableOwnerId: "team:demo-operations-analytics",
  stewardId: "role:demo-data-steward",
  criticality: "high",
  requiredGateIds: [
    "gate:demo-source-to-staging",
    "gate:demo-staging-to-intermediate",
    "gate:demo-intermediate-to-mart",
    "gate:demo-mart-to-consumer",
  ],
  metricContractBinding: {
    contractId: demoContractId,
    version: demoContractVersion,
  },
};

interface DemoGateDefinition {
  id: string;
  sequence: number;
  fromAssetId: string;
  toAssetId: string;
  ownerId: string;
  downstreamAssetIds: string[];
}

const gateDefinitions: DemoGateDefinition[] = [
  {
    id: "gate:demo-source-to-staging",
    sequence: 1,
    fromAssetId: "source:demo-production-orders",
    toAssetId: "model:demo-staging-production-orders",
    ownerId: "team:demo-ingestion",
    downstreamAssetIds: [
      "model:demo-intermediate-build-orders",
      "model:demo-production-flow-mart",
      "consumer:demo-production-flow",
    ],
  },
  {
    id: "gate:demo-staging-to-intermediate",
    sequence: 2,
    fromAssetId: "model:demo-staging-production-orders",
    toAssetId: "model:demo-intermediate-build-orders",
    ownerId: "team:demo-data-modeling",
    downstreamAssetIds: [
      "model:demo-production-flow-mart",
      "consumer:demo-production-flow",
    ],
  },
  {
    id: "gate:demo-intermediate-to-mart",
    sequence: 3,
    fromAssetId: "model:demo-intermediate-build-orders",
    toAssetId: "model:demo-production-flow-mart",
    ownerId: "team:demo-analytics-engineering",
    downstreamAssetIds: ["consumer:demo-production-flow"],
  },
  {
    id: "gate:demo-mart-to-consumer",
    sequence: 4,
    fromAssetId: "model:demo-production-flow-mart",
    toAssetId: "consumer:demo-production-flow",
    ownerId: "team:demo-business-intelligence",
    downstreamAssetIds: ["consumer:demo-production-flow"],
  },
];

function checkId(gateId: string, controlId: string): string {
  return `check:${gateId.slice("gate:".length)}:${controlId}`;
}

function artifactId(checkResultId: string): string {
  return `artifact:${checkResultId.slice("check:".length)}`;
}

function controlsForGate(
  kind: CertificationGate["kind"],
  targetTier: CertifiableTier,
): CertificationControlRequirement[] {
  return demoCertificationRequiredControls.filter(
    (control) =>
      control.tier <= targetTier && control.gateKinds.includes(kind),
  );
}

export const demoCertificationGates: CertificationGate[] = gateDefinitions.map(
  (definition) => {
    const kind: CertificationGate["kind"] =
      definition.sequence === gateDefinitions.length
        ? "consumer"
        : "pipeline_edge";
    return {
      id: definition.id,
      productId: demoCertificationProduct.id,
      kind,
      sequence: definition.sequence,
      fromAssetId: definition.fromAssetId,
      toAssetId: definition.toAssetId,
      ownerId: definition.ownerId,
      downstreamAssetIds: definition.downstreamAssetIds,
      targetTier: 3,
      checkResultIds: controlsForGate(kind, 3).map((control) =>
        checkId(definition.id, control.id),
      ),
    };
  },
);

export const demoCertificationCheckResults: CertificationCheckResult[] =
  demoCertificationGates.flatMap((gate) =>
    controlsForGate(gate.kind, gate.targetTier).map((control) => ({
      id: checkId(gate.id, control.id),
      gateId: gate.id,
      controlId: control.id,
      name: control.id
        .split(/[.-]/u)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" "),
      family: control.family,
      requiredForTier: control.tier,
      status: "PASS",
      reasonCode: `${control.id.replace(/[.-]/gu, "_").toUpperCase()}_PASS`,
      ownerId: gate.ownerId,
      evidenceArtifactIds: [artifactId(checkId(gate.id, control.id))],
      ...(control.tolerance ? { tolerance: control.tolerance } : {}),
    })),
  );

const checkArtifacts: CertificationArtifact[] =
  demoCertificationCheckResults.map((check, index) => {
    const control = demoCertificationRequiredControls.find(
      (candidate) => candidate.id === check.controlId,
    );
    if (!control) {
      throw new Error(`Missing demo control ${check.controlId}`);
    }
    return {
      id: artifactId(check.id),
      kind: control.evidenceKinds[0],
      uri: `urn:demo:certification:check:${index + 1}`,
      contentHash: `sha256:${String(index + 1).padStart(64, "0")}`,
      producer: "demo-certification-fixture",
      observedAt: demoObservedAt,
      subject: {
        type: "check_result",
        productId: demoCertificationProduct.id,
        gateId: check.gateId,
        checkResultId: check.id,
        controlId: check.controlId,
      },
    };
  });

export const demoCertificationArtifacts: CertificationArtifact[] = [
  ...checkArtifacts,
  {
    id: "artifact:demo-metric-contract",
    kind: "contract",
    uri: "urn:demo:certification:metric-contract:4.2.0",
    contentHash: demoContractHash,
    producer: "demo-contract-registry",
    observedAt: demoObservedAt,
    subject: {
      type: "metric_contract",
      productId: demoCertificationProduct.id,
      metricContractId: demoContractId,
      metricContractVersion: demoContractVersion,
    },
  },
  {
    id: "artifact:demo-sme-approval",
    kind: "approval",
    uri: "urn:demo:certification:sme-approval:4.2.0",
    contentHash:
      "sha256:2000000000000000000000000000000000000000000000000000000000000002",
    producer: "demo-approval-registry",
    observedAt: demoObservedAt,
    subject: {
      type: "sme_approval",
      productId: demoCertificationProduct.id,
      approvalId: "approval:demo-metric-contract-4.2.0",
      metricContractId: demoContractId,
      metricContractVersion: demoContractVersion,
      metricContractContentHash: demoContractHash,
      approvalStatus: "approved",
      approverActorId: "role:demo-operations-sme",
      approverActorType: "subject_matter_expert",
      approvedAt: "2026-08-18T16:32:00.000Z",
      validUntil: "2026-12-31T23:59:59.000Z",
    },
  },
];

/** A fully passing, synthetic T3 run used by policy tests. */
export const demoCertificationInput: CertificationEvaluationInput = {
  run: {
    id: "run:demo-certification-0001",
    productId: demoCertificationProduct.id,
    evaluatedAt: "2026-08-27T15:00:00.000Z",
    validUntil: "2026-11-25T15:00:00.000Z",
    policyVersion: demoCertificationPolicy.version,
    policyContentHash: demoCertificationPolicy.contentHash,
    agentId: "agent:demo-certification-read-only",
    agentVersion: "1.0.0-demo",
    gitSha: "dddddddddddddddddddddddddddddddddddddddd",
    pipelineManifestHash:
      "sha256:3000000000000000000000000000000000000000000000000000000000000003",
    semanticModelVersion: "semantic-model:demo-v7",
  },
  policy: demoCertificationPolicy,
  product: demoCertificationProduct,
  gates: demoCertificationGates,
  checkResults: demoCertificationCheckResults,
  artifacts: demoCertificationArtifacts,
  metricContract: {
    id: demoContractId,
    version: demoContractVersion,
    contentHash: demoContractHash,
    artifactId: "artifact:demo-metric-contract",
    status: "active",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    grain: "one row per synthetic production order per day",
    measureIds: ["metric:demo-completed-units", "metric:demo-cycle-time"],
  },
  smeApproval: {
    id: "approval:demo-metric-contract-4.2.0",
    productId: demoCertificationProduct.id,
    metricContractId: demoContractId,
    metricContractVersion: demoContractVersion,
    metricContractContentHash: demoContractHash,
    status: "approved",
    approverActorId: "role:demo-operations-sme",
    approverActorType: "subject_matter_expert",
    approvedAt: "2026-08-18T16:32:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    signatureArtifactId: "artifact:demo-sme-approval",
  },
  exceptions: [],
};

export const demoCertificationContext: CertificationEvaluationContext = {
  asOf: demoCertificationInput.run.evaluatedAt,
  trustedPolicy: {
    id: demoCertificationPolicy.id,
    version: demoCertificationPolicy.version,
    contentHash: demoCertificationPolicy.contentHash,
  },
  trustedProduct: {
    id: demoCertificationProduct.id,
    primarySourceObject: demoCertificationProduct.primarySourceObject,
    consumerAssetId: demoCertificationProduct.consumerAssetId,
    requiredGateIds: [...demoCertificationProduct.requiredGateIds],
    topologyHash: certificationProductTopologyHash(
      demoCertificationProduct,
      demoCertificationGates,
    ),
  },
};
