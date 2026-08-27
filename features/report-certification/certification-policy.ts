import { createHash } from "node:crypto";

import type {
  CertificationAgentAction,
  CertificationArtifact,
  CertificationArtifactSubject,
  CertificationCheckResult,
  CertificationControlRequirement,
  CertificationDecision,
  CertificationEvaluationContext,
  CertificationEvaluationEnvelope,
  CertificationEvaluationInput,
  CertificationEvidenceBundle,
  CertificationException,
  CertificationFinding,
  CertificationGate,
  CertificationGateDecision,
  CertificationProduct,
  CertificationTier,
  CertificationVerdict,
  CertifiableTier,
  EvidenceArtifactKind,
  RecertificationChangeKind,
  RecertificationTrigger,
} from "./types";

const millisecondsPerDay = 86_400_000;
const sha256Pattern = /^sha256:[0-9a-f]{64}$/u;
const gitShaPattern = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const evidenceUriPattern = /^(?:urn:|https:\/\/)/u;
const contextGateId = "gate:certification-context";
const businessGateId = "gate:business-assurance";

const readOnlyAgentActions = new Set<CertificationAgentAction>([
  "inspect_metadata",
  "run_read_only_check",
  "preserve_evidence",
  "draft_remediation",
  "route_to_owner",
]);

const revisionChangeKinds = new Set<RecertificationChangeKind>([
  "pipeline_code",
  "pipeline_configuration",
  "pipeline_test",
  "source_schema",
  "target_schema",
  "lineage",
  "grain",
  "join",
  "filter",
  "materialization",
  "semantic_measure",
  "semantic_relationship",
  "semantic_security",
  "metric_contract",
  "sme_approval",
  "owner",
]);

type FindingGate = Pick<
  CertificationGate,
  "id" | "ownerId" | "downstreamAssetIds"
>;

interface ArtifactResolutionValid {
  state: "valid";
  expiresAt: number;
  observedAt: number;
}

interface ArtifactResolutionInvalid {
  state: "invalid" | "blocked" | "expired";
  reasonCode: string;
}

type ArtifactResolution =
  | ArtifactResolutionValid
  | ArtifactResolutionInvalid;

interface GateEvaluation {
  decision: CertificationGateDecision;
  findings: CertificationFinding[];
  dependencyExpiries: number[];
}

interface BusinessEvaluation {
  decision: CertificationGateDecision;
  findings: CertificationFinding[];
  dependencyExpiries: number[];
}

interface ExceptionResolutionValid {
  state: "valid";
  exception: CertificationException;
  dependencyExpiries: number[];
}

type ExceptionResolution =
  | { state: "none" }
  | ExceptionResolutionValid
  | { state: "expired"; exception: CertificationException }
  | { state: "invalid"; exception: CertificationException };

function isNonBlank(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function timestamp(value: string): number | undefined {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString() === value ? parsed : undefined;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

/** Hash the semantic policy payload while excluding its self-declared hash. */
export function certificationPolicyContentHash(
  policy: Omit<CertificationEvaluationInput["policy"], "contentHash"> | CertificationEvaluationInput["policy"],
): string {
  const normalized = cloneJson(policy) as Partial<
    CertificationEvaluationInput["policy"]
  >;
  delete normalized.contentHash;
  normalized.requiredControls?.sort((left, right) =>
    compareStrings(left.id, right.id),
  );
  for (const control of normalized.requiredControls ?? []) {
    control.gateKinds.sort();
    control.evidenceKinds.sort();
  }
  normalized.trustedEvidenceProducers?.sort();
  normalized.trustedAuthorities?.smeApprovers.sort((left, right) =>
    compareStrings(left.actorId, right.actorId),
  );
  for (const binding of normalized.trustedAuthorities?.smeApprovers ?? []) {
    binding.productIds.sort();
    binding.metricContractIds.sort();
  }
  normalized.trustedAuthorities?.exceptionApprovers.sort((left, right) =>
    compareStrings(left.actorId, right.actorId),
  );
  for (const binding of
    normalized.trustedAuthorities?.exceptionApprovers ?? []) {
    binding.productIds.sort();
    binding.controlIds.sort();
  }
  return `sha256:${createHash("sha256")
    .update(stableStringify(normalized))
    .digest("hex")}`;
}

/** Hash the registry-owned product identity and exact source-to-consumer path. */
export function certificationProductTopologyHash(
  product: CertificationProduct,
  gates: CertificationGate[],
): string {
  const topology = {
    product: {
      id: product.id,
      name: product.name,
      consumerKind: product.consumerKind,
      consumerAssetId: product.consumerAssetId,
      primarySourceObject: product.primarySourceObject,
      accountableOwnerId: product.accountableOwnerId,
      stewardId: product.stewardId,
      criticality: product.criticality,
      requiredGateIds: [...product.requiredGateIds],
      metricContractBinding: { ...product.metricContractBinding },
    },
    gates: gates
      .map((gate) => ({
        id: gate.id,
        productId: gate.productId,
        kind: gate.kind,
        sequence: gate.sequence,
        fromAssetId: gate.fromAssetId,
        toAssetId: gate.toAssetId,
        ownerId: gate.ownerId,
        downstreamAssetIds: [...gate.downstreamAssetIds].sort(),
      }))
      .sort(
        (left, right) =>
          left.sequence - right.sequence || compareStrings(left.id, right.id),
      ),
  };
  return `sha256:${createHash("sha256")
    .update(stableStringify(topology))
    .digest("hex")}`;
}

function envelopeHash(envelope: CertificationEvaluationEnvelope): string {
  return `sha256:${createHash("sha256")
    .update(stableStringify(envelope))
    .digest("hex")}`;
}

function hasDuplicateStrings(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function hasDuplicateIds(values: Array<{ id: string }>): boolean {
  return hasDuplicateStrings(values.map((value) => value.id));
}

function pushFinding(
  findings: CertificationFinding[],
  finding: CertificationFinding,
): void {
  if (!findings.some((candidate) => candidate.id === finding.id)) {
    findings.push(finding);
  }
}

function makeFinding(
  gate: FindingGate,
  reasonCode: string,
  outcome: CertificationFinding["outcome"],
  options: {
    tier?: CertifiableTier;
    checkResultId?: string;
    exceptionId?: string;
  } = {},
): CertificationFinding {
  const qualifier = [
    options.checkResultId ?? "gate",
    options.tier ? `t${options.tier}` : "all",
    reasonCode,
  ].join(":");
  return {
    id: `finding:${gate.id}:${qualifier}`,
    gateId: gate.id,
    ...(options.checkResultId
      ? { checkResultId: options.checkResultId }
      : {}),
    outcome,
    reasonCode,
    ownerId: gate.ownerId,
    downstreamAssetIds: [...gate.downstreamAssetIds],
    ...(options.tier ? { tier: options.tier } : {}),
    ...(options.exceptionId ? { exceptionId: options.exceptionId } : {}),
  };
}

function verdictFor(
  findings: CertificationFinding[],
  conditionalExceptionIds: string[],
  achievedTier: CertificationTier,
): CertificationVerdict {
  if (findings.some((finding) => finding.outcome === "BLOCKED")) {
    return "BLOCKED";
  }
  if (findings.some((finding) => finding.outcome === "EXPIRED")) {
    return "EXPIRED";
  }
  if (findings.some((finding) => finding.outcome === "NOT_PROVEN")) {
    return "NOT_PROVEN";
  }
  if (conditionalExceptionIds.length > 0) {
    return "CONDITIONAL";
  }
  return achievedTier === 0 ? "NOT_PROVEN" : "PASS";
}

function contextGate(input: CertificationEvaluationInput): FindingGate {
  return {
    id: contextGateId,
    ownerId: input.product.accountableOwnerId,
    downstreamAssetIds: [input.product.consumerAssetId],
  };
}

function businessGate(input: CertificationEvaluationInput): FindingGate {
  return {
    id: businessGateId,
    ownerId: input.product.accountableOwnerId,
    downstreamAssetIds: [input.product.consumerAssetId],
  };
}

function applicableControls(
  input: CertificationEvaluationInput,
  gate: CertificationGate,
): CertificationControlRequirement[] {
  return input.policy.requiredControls.filter(
    (control) =>
      control.tier <= gate.targetTier && control.gateKinds.includes(gate.kind),
  );
}

function controlManifestIsComplete(
  controls: CertificationControlRequirement[],
): boolean {
  const requiredFamilies: Record<
    CertificationGate["kind"],
    Record<CertifiableTier, CertificationControlRequirement["family"][]>
  > = {
    pipeline_edge: {
      1: ["registration"],
      2: [
        "structural",
        "movement",
        "transformation_fidelity",
        "operations",
      ],
      3: ["governance"],
      4: ["continuous_assurance"],
    },
    consumer: {
      1: ["registration"],
      2: ["structural", "operations"],
      3: ["consumer_semantics", "governance"],
      4: ["continuous_assurance"],
    },
  };

  for (const kind of ["pipeline_edge", "consumer"] as const) {
    for (const tier of [1, 2, 3, 4] as const) {
      const tierControls = controls.filter(
        (control) =>
          control.tier === tier && control.gateKinds.includes(kind),
      );
      for (const family of requiredFamilies[kind][tier]) {
        if (!tierControls.some((control) => control.family === family)) {
          return false;
        }
      }
      if (
        tier === 4 &&
        (!tierControls.every(
          (control) =>
            control.family === "continuous_assurance" &&
            control.evidenceKinds.length === 1,
        ) ||
          ![
            "run_history",
            "test_result",
            "policy",
            "incident_record",
          ].every((kindName) =>
            tierControls.some(
              (control) =>
                control.evidenceKinds[0] ===
                (kindName as EvidenceArtifactKind),
            ),
          ))
      ) {
        return false;
      }
    }
  }
  return true;
}

function canonicalizeEnvelope(
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
): CertificationEvaluationEnvelope {
  const normalizedInput = cloneJson(input);
  normalizedInput.gates.sort(
    (left, right) =>
      left.sequence - right.sequence || compareStrings(left.id, right.id),
  );
  for (const gate of normalizedInput.gates) {
    gate.checkResultIds.sort();
    gate.downstreamAssetIds.sort();
  }
  normalizedInput.checkResults.sort((left, right) =>
    compareStrings(left.id, right.id),
  );
  for (const check of normalizedInput.checkResults) {
    check.evidenceArtifactIds.sort();
  }
  normalizedInput.artifacts.sort((left, right) =>
    compareStrings(left.id, right.id),
  );
  normalizedInput.exceptions.sort((left, right) =>
    compareStrings(left.id, right.id),
  );
  normalizedInput.policy.requiredControls.sort((left, right) =>
    compareStrings(left.id, right.id),
  );
  for (const control of normalizedInput.policy.requiredControls) {
    control.gateKinds.sort();
    control.evidenceKinds.sort();
  }
  normalizedInput.policy.trustedEvidenceProducers.sort();
  normalizedInput.policy.trustedAuthorities.smeApprovers.sort((left, right) =>
    compareStrings(left.actorId, right.actorId),
  );
  for (const binding of normalizedInput.policy.trustedAuthorities.smeApprovers) {
    binding.productIds.sort();
    binding.metricContractIds.sort();
  }
  normalizedInput.policy.trustedAuthorities.exceptionApprovers.sort(
    (left, right) => compareStrings(left.actorId, right.actorId),
  );
  for (const binding of normalizedInput.policy.trustedAuthorities
    .exceptionApprovers) {
    binding.productIds.sort();
    binding.controlIds.sort();
  }
  if (normalizedInput.metricContract) {
    normalizedInput.metricContract.measureIds.sort();
  }
  return {
    schemaVersion: "1.0",
    context: cloneJson(context),
    input: normalizedInput,
  };
}

function validateArtifact(
  artifact: CertificationArtifact | undefined,
  expectedKinds: EvidenceArtifactKind[],
  expectedSubject: CertificationArtifactSubject,
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
  reasonPrefix: string,
): ArtifactResolution {
  if (!artifact) {
    return { state: "invalid", reasonCode: `${reasonPrefix}_MISSING` };
  }
  if (
    !isNonBlank(artifact.id) ||
    !evidenceUriPattern.test(artifact.uri) ||
    !sha256Pattern.test(artifact.contentHash) ||
    !isNonBlank(artifact.producer)
  ) {
    return { state: "invalid", reasonCode: `${reasonPrefix}_INVALID` };
  }
  if (!input.policy.trustedEvidenceProducers.includes(artifact.producer)) {
    return {
      state: "blocked",
      reasonCode: `${reasonPrefix}_PRODUCER_UNTRUSTED`,
    };
  }
  const observedAt = timestamp(artifact.observedAt);
  const evaluatedAt = timestamp(input.run.evaluatedAt);
  const asOf = timestamp(context.asOf);
  if (observedAt === undefined || evaluatedAt === undefined || asOf === undefined) {
    return { state: "invalid", reasonCode: `${reasonPrefix}_DATE_INVALID` };
  }
  if (observedAt > evaluatedAt || observedAt > asOf) {
    return {
      state: "invalid",
      reasonCode: `${reasonPrefix}_OBSERVED_AFTER_RUN`,
    };
  }
  if (!expectedKinds.includes(artifact.kind)) {
    return {
      state: "blocked",
      reasonCode: `${reasonPrefix}_KIND_MISMATCH`,
    };
  }
  if (stableStringify(artifact.subject) !== stableStringify(expectedSubject)) {
    return {
      state: "blocked",
      reasonCode: `${reasonPrefix}_SUBJECT_MISMATCH`,
    };
  }
  const expiresAt =
    observedAt + input.policy.evidenceValidityDays * millisecondsPerDay;
  if (!Number.isFinite(expiresAt)) {
    return { state: "invalid", reasonCode: `${reasonPrefix}_DATE_INVALID` };
  }
  if (expiresAt <= asOf) {
    return { state: "expired", reasonCode: `${reasonPrefix}_EXPIRED` };
  }
  return { state: "valid", expiresAt, observedAt };
}

function trustedExceptionAuthority(
  exception: CertificationException,
  check: CertificationCheckResult,
  input: CertificationEvaluationInput,
): boolean {
  return input.policy.trustedAuthorities.exceptionApprovers.some(
    (binding) =>
      binding.actorId === exception.approvedByActorId &&
      binding.productIds.includes(input.product.id) &&
      binding.controlIds.includes(check.controlId),
  );
}

function resolveException(
  check: CertificationCheckResult,
  gate: CertificationGate,
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
  artifactsById: ReadonlyMap<string, CertificationArtifact>,
): ExceptionResolution {
  const matching = input.exceptions.filter(
    (candidate) => candidate.checkResultId === check.id,
  );
  if (matching.length === 0) {
    return { state: "none" };
  }

  const asOf = timestamp(context.asOf);
  const active: Array<ExceptionResolutionValid & { approvedAt: number; expiresAt: number }> = [];
  const expired: Array<{ exception: CertificationException; expiresAt: number }> = [];
  const invalid: CertificationException[] = [];

  for (const exception of matching) {
    const approvedAt = timestamp(exception.approvedAt);
    const expiresAt = timestamp(exception.expiresAt);
    const structurallyValid =
      exception.status === "approved" &&
      exception.productId === input.product.id &&
      exception.gateId === gate.id &&
      exception.ownerId === check.ownerId &&
      exception.ownerId === gate.ownerId &&
      isNonBlank(exception.reason) &&
      isNonBlank(exception.scope) &&
      isNonBlank(exception.remediationPlan) &&
      exception.approvedByActorType === "policy_authority" &&
      exception.approvedByActorId !== input.run.agentId &&
      exception.policyVersion === input.policy.version &&
      trustedExceptionAuthority(exception, check, input) &&
      approvedAt !== undefined &&
      expiresAt !== undefined &&
      asOf !== undefined &&
      expiresAt > approvedAt;

    if (!structurallyValid) {
      invalid.push(exception);
      continue;
    }

    const evidence = validateArtifact(
      artifactsById.get(exception.evidenceArtifactId),
      ["approval"],
      {
        type: "exception",
        productId: input.product.id,
        gateId: gate.id,
        checkResultId: check.id,
        exceptionId: exception.id,
        exceptionStatus: exception.status,
        ownerId: exception.ownerId,
        reason: exception.reason,
        scope: exception.scope,
        remediationPlan: exception.remediationPlan,
        approvedByActorId: exception.approvedByActorId,
        approvedByActorType: exception.approvedByActorType,
        approvedAt: exception.approvedAt,
        expiresAt: exception.expiresAt,
        policyVersion: exception.policyVersion,
      },
      input,
      context,
      "EXCEPTION_EVIDENCE",
    );
    if (
      evidence.state !== "valid" ||
      evidence.observedAt < approvedAt ||
      approvedAt > asOf
    ) {
      invalid.push(exception);
      continue;
    }
    if (expiresAt <= asOf) {
      expired.push({ exception, expiresAt });
      continue;
    }
    active.push({
      state: "valid",
      exception,
      approvedAt,
      expiresAt,
      dependencyExpiries: [expiresAt, evidence.expiresAt],
    });
  }

  if (active.length > 0) {
    active.sort(
      (left, right) =>
        left.expiresAt - right.expiresAt ||
        right.approvedAt - left.approvedAt ||
        compareStrings(left.exception.id, right.exception.id),
    );
    return active[0];
  }
  if (expired.length > 0) {
    expired.sort(
      (left, right) =>
        right.expiresAt - left.expiresAt ||
        compareStrings(left.exception.id, right.exception.id),
    );
    return { state: "expired", exception: expired[0].exception };
  }
  return { state: "invalid", exception: invalid[0] ?? matching[0] };
}

function evaluateGate(
  gate: CertificationGate,
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
  checksById: ReadonlyMap<string, CertificationCheckResult>,
  artifactsById: ReadonlyMap<string, CertificationArtifact>,
): GateEvaluation {
  const findings: CertificationFinding[] = [];
  const conditionalExceptionIds: string[] = [];
  const dependencyExpiries: number[] = [];
  const tierSatisfied = new Map<CertifiableTier, boolean>([
    [1, true],
    [2, true],
    [3, true],
    [4, true],
  ]);
  const declaredChecks: CertificationCheckResult[] = [];

  for (const checkResultId of gate.checkResultIds) {
    const check = checksById.get(checkResultId);
    if (!check) {
      pushFinding(
        findings,
        makeFinding(gate, "CHECK_RESULT_MISSING", "NOT_PROVEN", {
          checkResultId,
          tier: 1,
        }),
      );
      tierSatisfied.set(1, false);
      continue;
    }
    if (check.gateId !== gate.id) {
      pushFinding(
        findings,
        makeFinding(gate, "CHECK_GATE_MISMATCH", "BLOCKED", {
          checkResultId: check.id,
          tier: check.requiredForTier,
        }),
      );
      tierSatisfied.set(check.requiredForTier, false);
      continue;
    }
    declaredChecks.push(check);
  }

  const requirements = applicableControls(input, gate);
  const expectedControlIds = new Set(requirements.map((control) => control.id));
  for (const check of declaredChecks) {
    if (!expectedControlIds.has(check.controlId)) {
      pushFinding(
        findings,
        makeFinding(gate, "CONTROL_NOT_IN_POLICY", "BLOCKED", {
          checkResultId: check.id,
          tier: check.requiredForTier,
        }),
      );
      tierSatisfied.set(check.requiredForTier, false);
    }
  }

  for (const requirement of requirements) {
    const matches = declaredChecks.filter(
      (check) => check.controlId === requirement.id,
    );
    if (matches.length === 0) {
      pushFinding(
        findings,
        makeFinding(gate, "POLICY_CONTROL_MISSING", "NOT_PROVEN", {
          tier: requirement.tier,
        }),
      );
      tierSatisfied.set(requirement.tier, false);
      continue;
    }
    if (matches.length > 1) {
      pushFinding(
        findings,
        makeFinding(gate, "DUPLICATE_POLICY_CONTROL", "BLOCKED", {
          tier: requirement.tier,
        }),
      );
      tierSatisfied.set(requirement.tier, false);
      continue;
    }

    const check = matches[0];
    const policyBound =
      check.requiredForTier === requirement.tier &&
      check.family === requirement.family &&
      check.ownerId === gate.ownerId &&
      check.tolerance === requirement.tolerance &&
      isNonBlank(check.name) &&
      isNonBlank(check.reasonCode) &&
      check.evidenceArtifactIds.length > 0 &&
      !hasDuplicateStrings(check.evidenceArtifactIds);
    if (!policyBound) {
      pushFinding(
        findings,
        makeFinding(gate, "CHECK_POLICY_BINDING_MISMATCH", "BLOCKED", {
          checkResultId: check.id,
          tier: requirement.tier,
        }),
      );
      tierSatisfied.set(requirement.tier, false);
      continue;
    }

    let evidenceValid = true;
    const resolvedEvidenceKinds = new Set<EvidenceArtifactKind>();
    for (const artifactId of check.evidenceArtifactIds) {
      const artifact = artifactsById.get(artifactId);
      const evidence = validateArtifact(
        artifact,
        requirement.evidenceKinds,
        {
          type: "check_result",
          productId: input.product.id,
          gateId: gate.id,
          checkResultId: check.id,
          controlId: check.controlId,
        },
        input,
        context,
        "EVIDENCE",
      );
      if (evidence.state === "valid") {
        dependencyExpiries.push(evidence.expiresAt);
        if (artifact) {
          resolvedEvidenceKinds.add(artifact.kind);
        }
        continue;
      }
      evidenceValid = false;
      const outcome =
        evidence.state === "blocked"
          ? "BLOCKED"
          : evidence.state === "expired"
            ? "EXPIRED"
            : "NOT_PROVEN";
      pushFinding(
        findings,
        makeFinding(gate, evidence.reasonCode, outcome, {
          checkResultId: check.id,
          tier: requirement.tier,
        }),
      );
    }
    if (
      requirement.evidenceKinds.some(
        (requiredKind) => !resolvedEvidenceKinds.has(requiredKind),
      )
    ) {
      evidenceValid = false;
      pushFinding(
        findings,
        makeFinding(gate, "EVIDENCE_KIND_REQUIRED", "NOT_PROVEN", {
          checkResultId: check.id,
          tier: requirement.tier,
        }),
      );
    }
    if (!evidenceValid) {
      tierSatisfied.set(requirement.tier, false);
      continue;
    }

    if (check.status === "NOT_PROVEN") {
      pushFinding(
        findings,
        makeFinding(gate, check.reasonCode, "NOT_PROVEN", {
          checkResultId: check.id,
          tier: requirement.tier,
        }),
      );
      tierSatisfied.set(requirement.tier, false);
      continue;
    }
    if (check.status !== "PASS" && check.status !== "FAIL") {
      pushFinding(
        findings,
        makeFinding(gate, "CHECK_STATUS_INVALID", "BLOCKED", {
          checkResultId: check.id,
          tier: requirement.tier,
        }),
      );
      tierSatisfied.set(requirement.tier, false);
      continue;
    }
    if (check.status === "FAIL") {
      const exception = resolveException(
        check,
        gate,
        input,
        context,
        artifactsById,
      );
      if (exception.state === "valid") {
        conditionalExceptionIds.push(exception.exception.id);
        dependencyExpiries.push(...exception.dependencyExpiries);
        continue;
      }
      tierSatisfied.set(requirement.tier, false);
      if (exception.state === "expired") {
        pushFinding(
          findings,
          makeFinding(gate, "EXCEPTION_EXPIRED", "EXPIRED", {
            checkResultId: check.id,
            tier: requirement.tier,
            exceptionId: exception.exception.id,
          }),
        );
      } else if (exception.state === "invalid") {
        pushFinding(
          findings,
          makeFinding(gate, "EXCEPTION_INVALID", "BLOCKED", {
            checkResultId: check.id,
            tier: requirement.tier,
            exceptionId: exception.exception.id,
          }),
        );
      } else {
        pushFinding(
          findings,
          makeFinding(gate, check.reasonCode, "BLOCKED", {
            checkResultId: check.id,
            tier: requirement.tier,
          }),
        );
      }
    }
  }

  let achievedTier: CertificationTier = 0;
  let mayAdvance = true;
  for (let tier = 1; tier <= gate.targetTier; tier += 1) {
    const certifiableTier = tier as CertifiableTier;
    if (mayAdvance && tierSatisfied.get(certifiableTier) === true) {
      achievedTier = certifiableTier;
    } else {
      mayAdvance = false;
    }
  }

  const uniqueExceptionIds = [...new Set(conditionalExceptionIds)].sort();
  return {
    decision: {
      gateId: gate.id,
      kind: "pipeline_gate",
      achievedTier,
      verdict: verdictFor(findings, uniqueExceptionIds, achievedTier),
      findingIds: findings.map((finding) => finding.id),
      conditionalExceptionIds: uniqueExceptionIds,
    },
    findings,
    dependencyExpiries,
  };
}

function trustedSmeAuthority(input: CertificationEvaluationInput): boolean {
  const approval = input.smeApproval;
  const contract = input.metricContract;
  if (!approval || !contract) {
    return false;
  }
  return input.policy.trustedAuthorities.smeApprovers.some(
    (binding) =>
      binding.actorId === approval.approverActorId &&
      binding.productIds.includes(input.product.id) &&
      binding.metricContractIds.includes(contract.id),
  );
}

function evaluateBusinessAssurance(
  candidateTier: CertificationTier,
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
  artifactsById: ReadonlyMap<string, CertificationArtifact>,
): BusinessEvaluation {
  const gate = businessGate(input);
  const findings: CertificationFinding[] = [];
  const dependencyExpiries: number[] = [];
  const contract = input.metricContract;
  const binding = input.product.metricContractBinding;

  const fail = (
    reasonCode: string,
    outcome: CertificationFinding["outcome"],
  ): BusinessEvaluation => {
    const finding = makeFinding(gate, reasonCode, outcome, { tier: 3 });
    findings.push(finding);
    const achievedTier: CertificationTier = Math.min(candidateTier, 2) as CertificationTier;
    return {
      decision: {
        gateId: businessGateId,
        kind: "business_assurance",
        achievedTier,
        verdict: verdictFor(findings, [], achievedTier),
        findingIds: [finding.id],
        conditionalExceptionIds: [],
      },
      findings,
      dependencyExpiries,
    };
  };

  if (!contract) {
    return fail("METRIC_CONTRACT_MISSING", "NOT_PROVEN");
  }
  if (contract.id !== binding.contractId || contract.version !== binding.version) {
    return fail("METRIC_CONTRACT_VERSION_MISMATCH", "BLOCKED");
  }
  if (
    contract.status !== "active" ||
    !sha256Pattern.test(contract.contentHash) ||
    !isNonBlank(contract.grain) ||
    contract.measureIds.length === 0 ||
    hasDuplicateStrings(contract.measureIds)
  ) {
    return fail("METRIC_CONTRACT_INVALID", "BLOCKED");
  }
  const contractEffectiveAt = timestamp(contract.effectiveAt);
  const evaluatedAt = timestamp(input.run.evaluatedAt);
  const asOf = timestamp(context.asOf);
  if (
    contractEffectiveAt === undefined ||
    evaluatedAt === undefined ||
    asOf === undefined ||
    contractEffectiveAt > evaluatedAt ||
    contractEffectiveAt > asOf
  ) {
    return fail("METRIC_CONTRACT_NOT_EFFECTIVE", "BLOCKED");
  }
  const contractEvidence = validateArtifact(
    artifactsById.get(contract.artifactId),
    ["contract"],
    {
      type: "metric_contract",
      productId: input.product.id,
      metricContractId: contract.id,
      metricContractVersion: contract.version,
    },
    input,
    context,
    "METRIC_CONTRACT_EVIDENCE",
  );
  if (contractEvidence.state !== "valid") {
    return fail(
      contractEvidence.reasonCode,
      contractEvidence.state === "blocked"
        ? "BLOCKED"
        : contractEvidence.state === "expired"
          ? "EXPIRED"
          : "NOT_PROVEN",
    );
  }
  const contractArtifact = artifactsById.get(contract.artifactId);
  if (contractArtifact?.contentHash !== contract.contentHash) {
    return fail("METRIC_CONTRACT_HASH_MISMATCH", "BLOCKED");
  }
  dependencyExpiries.push(contractEvidence.expiresAt);

  const approval = input.smeApproval;
  if (!approval) {
    return fail("SME_APPROVAL_MISSING", "NOT_PROVEN");
  }
  if (approval.status !== "approved") {
    return fail("SME_APPROVAL_REVOKED", "BLOCKED");
  }
  if (
    approval.productId !== input.product.id ||
    approval.metricContractId !== contract.id ||
    approval.metricContractVersion !== contract.version ||
    approval.metricContractContentHash !== contract.contentHash
  ) {
    return fail("SME_APPROVAL_BINDING_MISMATCH", "BLOCKED");
  }
  if (
    approval.approverActorType !== "subject_matter_expert" ||
    approval.approverActorId === input.run.agentId ||
    !trustedSmeAuthority(input)
  ) {
    return fail("SME_APPROVAL_AUTHORITY_INVALID", "BLOCKED");
  }
  const approvedAt = timestamp(approval.approvedAt);
  const approvalValidUntil = timestamp(approval.validUntil);
  if (
    approvedAt === undefined ||
    approvalValidUntil === undefined ||
    asOf === undefined ||
    approvalValidUntil <= approvedAt ||
    approvedAt > evaluatedAt ||
    approvedAt > asOf
  ) {
    return fail("SME_APPROVAL_DATE_INVALID", "BLOCKED");
  }
  if (approvalValidUntil <= asOf) {
    return fail("SME_APPROVAL_EXPIRED", "EXPIRED");
  }
  const approvalEvidence = validateArtifact(
    artifactsById.get(approval.signatureArtifactId),
    ["approval"],
    {
      type: "sme_approval",
      productId: input.product.id,
      approvalId: approval.id,
      metricContractId: contract.id,
      metricContractVersion: contract.version,
      metricContractContentHash: contract.contentHash,
      approvalStatus: approval.status,
      approverActorId: approval.approverActorId,
      approverActorType: approval.approverActorType,
      approvedAt: approval.approvedAt,
      validUntil: approval.validUntil,
    },
    input,
    context,
    "SME_APPROVAL_EVIDENCE",
  );
  if (approvalEvidence.state !== "valid") {
    return fail(
      approvalEvidence.reasonCode,
      approvalEvidence.state === "blocked"
        ? "BLOCKED"
        : approvalEvidence.state === "expired"
          ? "EXPIRED"
          : "NOT_PROVEN",
    );
  }
  if (approvalEvidence.observedAt < approvedAt) {
    return fail("SME_APPROVAL_EVIDENCE_PREDATES_APPROVAL", "BLOCKED");
  }
  dependencyExpiries.push(approvalValidUntil, approvalEvidence.expiresAt);

  return {
    decision: {
      gateId: businessGateId,
      kind: "business_assurance",
      achievedTier: candidateTier,
      verdict: "PASS",
      findingIds: [],
      conditionalExceptionIds: [],
    },
    findings,
    dependencyExpiries,
  };
}

function validateInputContext(
  input: CertificationEvaluationInput,
  context: CertificationEvaluationContext,
): { findings: CertificationFinding[]; fatal: boolean } {
  const gate = contextGate(input);
  const findings: CertificationFinding[] = [];
  let fatal = false;
  const add = (
    reasonCode: string,
    outcome: CertificationFinding["outcome"] = "BLOCKED",
    isFatal = true,
  ): void => {
    pushFinding(findings, makeFinding(gate, reasonCode, outcome));
    fatal ||= isFatal;
  };

  const policy = input.policy;
  if (
    policy.id !== context.trustedPolicy.id ||
    policy.version !== context.trustedPolicy.version ||
    policy.contentHash !== context.trustedPolicy.contentHash ||
    !sha256Pattern.test(policy.contentHash) ||
    certificationPolicyContentHash(policy) !== policy.contentHash
  ) {
    add("TRUSTED_POLICY_MISMATCH");
  }
  if (
    input.product.id !== context.trustedProduct.id ||
    input.product.primarySourceObject !==
      context.trustedProduct.primarySourceObject ||
    input.product.consumerAssetId !== context.trustedProduct.consumerAssetId ||
    stableStringify(input.product.requiredGateIds) !==
      stableStringify(context.trustedProduct.requiredGateIds) ||
    !sha256Pattern.test(context.trustedProduct.topologyHash) ||
    certificationProductTopologyHash(input.product, input.gates) !==
      context.trustedProduct.topologyHash
  ) {
    add("TRUSTED_PRODUCT_TOPOLOGY_MISMATCH");
  }
  if (
    policy.minimumGateModel !== true ||
    policy.missingEvidenceOutcome !== "NOT_PROVEN" ||
    policy.t3RequiresExactMetricContractApproval !== true ||
    policy.exceptionsRequirePolicyApproval !== true ||
    policy.topology.requireAllDeclaredGates !== true ||
    policy.topology.requireContiguousSequence !== true ||
    policy.topology.requirePrimarySourceStart !== true ||
    policy.topology.requireConsumerTerminal !== true ||
    !Number.isInteger(policy.topology.minimumGateCount) ||
    policy.topology.minimumGateCount < 2
  ) {
    add("POLICY_CONFIGURATION_INVALID");
  }
  if (
    !Number.isFinite(policy.evidenceValidityDays) ||
    policy.evidenceValidityDays <= 0 ||
    hasDuplicateIds(policy.requiredControls) ||
    !controlManifestIsComplete(policy.requiredControls)
  ) {
    add("POLICY_CONTROL_MANIFEST_INVALID");
  }
  if (
    policy.requiredControls.some(
      (control) =>
        !isNonBlank(control.id) ||
        control.gateKinds.length === 0 ||
        hasDuplicateStrings(control.gateKinds) ||
        control.evidenceKinds.length === 0 ||
        hasDuplicateStrings(control.evidenceKinds) ||
        (control.tolerance !== undefined && !isNonBlank(control.tolerance)),
    )
  ) {
    add("POLICY_CONTROL_DEFINITION_INVALID");
  }
  if (
    policy.trustedEvidenceProducers.length === 0 ||
    hasDuplicateStrings(policy.trustedEvidenceProducers) ||
    policy.trustedEvidenceProducers.some((producer) => !isNonBlank(producer))
  ) {
    add("TRUSTED_PRODUCER_POLICY_INVALID");
  }
  if (
    hasDuplicateStrings(
      policy.trustedAuthorities.smeApprovers.map((binding) => binding.actorId),
    ) ||
    hasDuplicateStrings(
      policy.trustedAuthorities.exceptionApprovers.map(
        (binding) => binding.actorId,
      ),
    )
  ) {
    add("TRUSTED_AUTHORITY_POLICY_INVALID");
  }
  if (
    policy.trustedAuthorities.smeApprovers.some(
      (binding) =>
        !isNonBlank(binding.actorId) ||
        binding.productIds.length === 0 ||
        binding.metricContractIds.length === 0 ||
        hasDuplicateStrings(binding.productIds) ||
        hasDuplicateStrings(binding.metricContractIds),
    ) ||
    policy.trustedAuthorities.exceptionApprovers.some(
      (binding) =>
        !isNonBlank(binding.actorId) ||
        binding.productIds.length === 0 ||
        binding.controlIds.length === 0 ||
        hasDuplicateStrings(binding.productIds) ||
        hasDuplicateStrings(binding.controlIds),
    )
  ) {
    add("TRUSTED_AUTHORITY_BINDING_INVALID");
  }

  if (
    input.run.productId !== input.product.id ||
    input.run.policyVersion !== policy.version ||
    input.run.policyContentHash !== policy.contentHash
  ) {
    add("RUN_BINDING_MISMATCH");
  }
  if (
    !isNonBlank(input.run.id) ||
    !isNonBlank(input.run.agentId) ||
    !isNonBlank(input.run.agentVersion) ||
    !gitShaPattern.test(input.run.gitSha) ||
    !sha256Pattern.test(input.run.pipelineManifestHash) ||
    !isNonBlank(input.run.semanticModelVersion)
  ) {
    add("RUN_PROVENANCE_INVALID");
  }
  const asOf = timestamp(context.asOf);
  const evaluatedAt = timestamp(input.run.evaluatedAt);
  const validUntil = timestamp(input.run.validUntil);
  if (
    asOf === undefined ||
    evaluatedAt === undefined ||
    validUntil === undefined ||
    evaluatedAt > asOf ||
    validUntil <= evaluatedAt
  ) {
    add("CERTIFICATION_VALIDITY_INVALID", "NOT_PROVEN");
  } else if (validUntil <= asOf) {
    add("CERTIFICATION_EXPIRED", "EXPIRED", false);
  }

  if (
    !isNonBlank(input.product.id) ||
    !isNonBlank(input.product.primarySourceObject) ||
    !isNonBlank(input.product.consumerAssetId) ||
    !isNonBlank(input.product.accountableOwnerId) ||
    !isNonBlank(input.product.stewardId) ||
    !isNonBlank(input.product.metricContractBinding.contractId) ||
    !isNonBlank(input.product.metricContractBinding.version)
  ) {
    add("PRODUCT_REGISTRATION_INVALID", "NOT_PROVEN");
  }

  if (hasDuplicateIds(input.gates)) {
    add("DUPLICATE_GATE_ID");
  }
  if (hasDuplicateIds(input.checkResults)) {
    add("DUPLICATE_CHECK_RESULT_ID");
  }
  if (hasDuplicateIds(input.artifacts)) {
    add("DUPLICATE_ARTIFACT_ID");
  }
  if (hasDuplicateIds(input.exceptions)) {
    add("DUPLICATE_EXCEPTION_ID");
  }
  if (hasDuplicateStrings(input.product.requiredGateIds)) {
    add("DUPLICATE_REQUIRED_GATE_ID");
  }
  if (
    input.gates.some(
      (candidate) => hasDuplicateStrings(candidate.checkResultIds),
    )
  ) {
    add("DUPLICATE_GATE_CHECK_REFERENCE");
  }

  const requiredGateIds = new Set(input.product.requiredGateIds);
  if (
    input.product.requiredGateIds.length < policy.topology.minimumGateCount ||
    input.gates.length !== input.product.requiredGateIds.length ||
    input.gates.some((candidate) => !requiredGateIds.has(candidate.id))
  ) {
    add(
      input.product.requiredGateIds.length === 0
        ? "REQUIRED_GATE_SET_EMPTY"
        : "REQUIRED_GATE_SET_INCOMPLETE",
      input.product.requiredGateIds.length === 0 ? "NOT_PROVEN" : "BLOCKED",
    );
  }

  const orderedGates = [...input.gates].sort(
    (left, right) =>
      left.sequence - right.sequence || compareStrings(left.id, right.id),
  );
  if (
    orderedGates.some(
      (candidate, index) =>
        candidate.sequence !== index + 1 ||
        input.product.requiredGateIds[index] !== candidate.id,
    )
  ) {
    add("GATE_SEQUENCE_INVALID");
  }
  if (
    orderedGates.some(
      (candidate) =>
        candidate.productId !== input.product.id ||
        !isNonBlank(candidate.ownerId) ||
        !isNonBlank(candidate.fromAssetId) ||
        !isNonBlank(candidate.toAssetId) ||
        candidate.fromAssetId === candidate.toAssetId ||
        !Number.isInteger(candidate.targetTier) ||
        candidate.targetTier < 1 ||
        candidate.targetTier > 4 ||
        candidate.checkResultIds.length === 0 ||
        !candidate.downstreamAssetIds.includes(input.product.consumerAssetId) ||
        hasDuplicateStrings(candidate.downstreamAssetIds),
    )
  ) {
    add("GATE_REGISTRATION_INVALID");
  }
  if (
    orderedGates.length > 0 &&
    (orderedGates[0].fromAssetId !== input.product.primarySourceObject ||
      orderedGates.at(-1)?.toAssetId !== input.product.consumerAssetId ||
      orderedGates.at(-1)?.kind !== "consumer" ||
      orderedGates.slice(0, -1).some((candidate) => candidate.kind !== "pipeline_edge") ||
      orderedGates.some(
        (candidate, index) =>
          index > 0 && orderedGates[index - 1].toAssetId !== candidate.fromAssetId,
      ))
  ) {
    add("GATE_TOPOLOGY_DISCONNECTED");
  }

  const referencedChecks = new Set(
    input.gates.flatMap((candidate) => candidate.checkResultIds),
  );
  if (input.checkResults.some((check) => !referencedChecks.has(check.id))) {
    add("UNREFERENCED_CHECK_RESULT");
  }
  const referencedArtifacts = new Set(
    input.checkResults.flatMap((check) => check.evidenceArtifactIds),
  );
  if (input.metricContract) {
    referencedArtifacts.add(input.metricContract.artifactId);
  }
  if (input.smeApproval) {
    referencedArtifacts.add(input.smeApproval.signatureArtifactId);
  }
  for (const exception of input.exceptions) {
    referencedArtifacts.add(exception.evidenceArtifactId);
  }
  if (input.artifacts.some((artifact) => !referencedArtifacts.has(artifact.id))) {
    add("UNREFERENCED_ARTIFACT");
  }
  const checkIds = new Set(input.checkResults.map((check) => check.id));
  if (input.exceptions.some((exception) => !checkIds.has(exception.checkResultId))) {
    add("EXCEPTION_CHECK_MISSING");
  }

  return { findings, fatal };
}

function buildEvidenceBundle(
  envelope: CertificationEvaluationEnvelope,
): CertificationEvidenceBundle {
  const input = envelope.input;
  return {
    schemaVersion: "1.0",
    envelopeHash: envelopeHash(envelope),
    envelope: cloneJson(envelope),
    runId: input.run.id,
    productId: input.product.id,
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    policyContentHash: input.policy.contentHash,
    agentId: input.run.agentId,
    agentVersion: input.run.agentVersion,
    evaluatedAt: input.run.evaluatedAt,
    originalValidUntil: input.run.validUntil,
    gitSha: input.run.gitSha,
    pipelineManifestHash: input.run.pipelineManifestHash,
    semanticModelVersion: input.run.semanticModelVersion,
    gateIds: [...input.product.requiredGateIds],
    artifacts: input.artifacts.map((artifact) => ({
      id: artifact.id,
      contentHash: artifact.contentHash,
      observedAt: artifact.observedAt,
    })),
    ...(input.metricContract
      ? {
          metricContract: {
            id: input.metricContract.id,
            version: input.metricContract.version,
            contentHash: input.metricContract.contentHash,
          },
        }
      : {}),
    ...(input.smeApproval
      ? {
          smeApproval: {
            id: input.smeApproval.id,
            approverActorId: input.smeApproval.approverActorId,
            approvedAt: input.smeApproval.approvedAt,
            validUntil: input.smeApproval.validUntil,
            signatureArtifactId: input.smeApproval.signatureArtifactId,
          },
        }
      : {}),
    exceptions: input.exceptions.map((exception) => ({
      id: exception.id,
      gateId: exception.gateId,
      checkResultId: exception.checkResultId,
      ownerId: exception.ownerId,
      approvedByActorId: exception.approvedByActorId,
      approvedAt: exception.approvedAt,
      expiresAt: exception.expiresAt,
      evidenceArtifactId: exception.evidenceArtifactId,
    })),
  };
}

/**
 * Apply the canonical minimum-gate policy using a trusted server-supplied
 * policy anchor and clock. The function performs no I/O and mutates no input.
 */
export function evaluateCertification(
  rawInput: CertificationEvaluationInput,
  rawContext: CertificationEvaluationContext,
): CertificationDecision {
  const envelope = canonicalizeEnvelope(rawInput, rawContext);
  const input = envelope.input;
  const context = envelope.context;
  const evidenceBundle = buildEvidenceBundle(envelope);
  const preflight = validateInputContext(input, context);
  const findings = [...preflight.findings];
  const gateDecisions: CertificationGateDecision[] = [];
  const dependencyExpiries: number[] = [];

  let achievedTier: CertificationTier = 0;
  if (!preflight.fatal) {
    const checksById = new Map(
      input.checkResults.map((check) => [check.id, check] as const),
    );
    const artifactsById = new Map(
      input.artifacts.map((artifact) => [artifact.id, artifact] as const),
    );
    const orderedGates = [...input.gates].sort(
      (left, right) => left.sequence - right.sequence,
    );
    for (const gate of orderedGates) {
      const evaluation = evaluateGate(
        gate,
        input,
        context,
        checksById,
        artifactsById,
      );
      gateDecisions.push(evaluation.decision);
      findings.push(...evaluation.findings);
      dependencyExpiries.push(...evaluation.dependencyExpiries);
    }
    achievedTier =
      gateDecisions.length > 0
        ? (Math.min(
            ...gateDecisions.map((decision) => decision.achievedTier),
          ) as CertificationTier)
        : 0;

    if (achievedTier >= 3) {
      const business = evaluateBusinessAssurance(
        achievedTier,
        input,
        context,
        artifactsById,
      );
      gateDecisions.push(business.decision);
      findings.push(...business.findings);
      dependencyExpiries.push(...business.dependencyExpiries);
      achievedTier = Math.min(
        achievedTier,
        business.decision.achievedTier,
      ) as CertificationTier;
    }
  }

  const conditionalExceptionIds = [
    ...new Set(
      gateDecisions.flatMap((decision) => decision.conditionalExceptionIds),
    ),
  ].sort();

  if (preflight.findings.length > 0) {
    gateDecisions.push({
      gateId: contextGateId,
      kind: "certification_context",
      achievedTier: preflight.fatal ? 0 : achievedTier,
      verdict: verdictFor(
        preflight.findings,
        [],
        preflight.fatal ? 0 : achievedTier,
      ),
      findingIds: preflight.findings.map((finding) => finding.id),
      conditionalExceptionIds: [],
    });
  }

  const runValidUntil = timestamp(input.run.validUntil);
  if (runValidUntil !== undefined) {
    dependencyExpiries.push(runValidUntil);
  }
  const asOf = timestamp(context.asOf);
  const effectiveValidUntil =
    dependencyExpiries.length > 0
      ? Math.min(...dependencyExpiries)
      : (asOf ?? timestamp(input.run.evaluatedAt) ?? 0);

  return {
    runId: input.run.id,
    productId: input.product.id,
    achievedTier,
    verdict: verdictFor(findings, conditionalExceptionIds, achievedTier),
    evaluatedAt: input.run.evaluatedAt,
    validUntil: new Date(effectiveValidUntil).toISOString(),
    gateDecisions,
    findings,
    conditionalExceptionIds,
    evidenceBundle,
  };
}

/** Verify the canonical bundle hash before replaying its complete envelope. */
export function rehydrateCertificationEnvelope(
  bundle: CertificationEvidenceBundle,
): CertificationEvaluationEnvelope {
  const expectedBundle = buildEvidenceBundle(bundle.envelope);
  if (
    bundle.schemaVersion !== "1.0" ||
    bundle.envelope.schemaVersion !== "1.0" ||
    bundle.envelopeHash !== envelopeHash(bundle.envelope) ||
    stableStringify(bundle) !== stableStringify(expectedBundle)
  ) {
    throw new Error("Certification evidence bundle integrity check failed");
  }
  return cloneJson(bundle.envelope);
}

/** The governed agent is explanatory and orchestration-only. */
export function isCertificationAgentActionAllowed(
  action: CertificationAgentAction,
): boolean {
  return readOnlyAgentActions.has(action);
}

/** Return true when a trigger applies to, and invalidates, the current run. */
export function requiresRecertification(
  trigger: RecertificationTrigger,
  current: { productId: string; certificationRunId: string },
): boolean {
  if (
    trigger.productId !== current.productId ||
    trigger.certificationRunId !== current.certificationRunId ||
    trigger.active === false
  ) {
    return false;
  }
  if (
    !isNonBlank(trigger.id) ||
    !isNonBlank(trigger.sourceId) ||
    timestamp(trigger.detectedAt) === undefined
  ) {
    return true;
  }
  if (!revisionChangeKinds.has(trigger.kind)) {
    return true;
  }
  if (
    trigger.previousRevision === undefined ||
    trigger.currentRevision === undefined
  ) {
    return true;
  }
  return trigger.previousRevision !== trigger.currentRevision;
}
