import type {
  AuthorizedReportCertificationSnapshot,
  CertificationEvidenceView,
  CertificationGateView,
  CertificationTierView,
  CertifiedProductView,
  ReportCertificationSnapshotPayload,
} from "./types";

function projectEvidence(
  evidence: CertificationEvidenceView,
): CertificationEvidenceView {
  return {
    id: evidence.id,
    label: evidence.label,
    kind: evidence.kind,
    sourceLabel: evidence.sourceLabel,
    observedAt: evidence.observedAt,
    status: evidence.status,
  };
}

function projectGate(gate: CertificationGateView): CertificationGateView {
  return {
    id: gate.id,
    label: gate.label,
    fromLabel: gate.fromLabel,
    toLabel: gate.toLabel,
    ownerLabel: gate.ownerLabel,
    achievedTier: gate.achievedTier,
    verdict: gate.verdict,
    evidence: gate.evidence.map(projectEvidence),
  };
}

function projectProduct(product: CertifiedProductView): CertifiedProductView {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sourceLabel: product.sourceLabel,
    consumerLabel: product.consumerLabel,
    ownerLabel: product.ownerLabel,
    stewardLabel: product.stewardLabel,
    criticality: product.criticality,
    achievedTier: product.achievedTier,
    verdict: product.verdict,
    evaluatedAt: product.evaluatedAt,
    validUntil: product.validUntil,
    policyLabel: product.policyLabel,
    contractLabel: product.contractLabel,
    summary: product.summary,
    gates: product.gates.map(projectGate),
  };
}

function projectTier(tier: CertificationTierView): CertificationTierView {
  return {
    tier: tier.tier,
    name: tier.name,
    shortName: tier.shortName,
    purpose: tier.purpose,
    requirements: [...tier.requirements],
    authority: tier.authority,
  };
}

/**
 * Rebuild an entitlement-filtered server payload from an explicit allowlist.
 * Structural extra fields are intentionally discarded before RSC serialization.
 * Calling this function asserts that host authorization and redaction are done.
 */
export function createAuthorizedReportCertificationSnapshot(
  input: ReportCertificationSnapshotPayload,
): AuthorizedReportCertificationSnapshot {
  return {
    provenance: "authorized",
    asOf: input.asOf,
    registryLabel: input.registryLabel,
    products: input.products.map(projectProduct),
    tiers: input.tiers.map(projectTier),
    agent: {
      name: input.agent.name,
      version: input.agent.version,
      mode: "read_only",
      purpose: input.agent.purpose,
      allowedActions: [...input.agent.allowedActions],
      prohibitedActions: [...input.agent.prohibitedActions],
      runbook: input.agent.runbook.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        output: step.output,
      })),
      dryRun: {
        productLabel: input.agent.dryRun.productLabel,
        candidateTier: input.agent.dryRun.candidateTier,
        verdict: input.agent.dryRun.verdict,
        evaluatedChecks: input.agent.dryRun.evaluatedChecks,
        note: input.agent.dryRun.note,
        steps: input.agent.dryRun.steps.map((step) => ({
          id: step.id,
          label: step.label,
          outcome: step.outcome,
        })),
      },
    },
  };
}
