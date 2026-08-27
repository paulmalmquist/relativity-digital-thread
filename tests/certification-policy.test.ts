import assert from "node:assert/strict";
import test from "node:test";

import {
  certificationPolicyContentHash,
  evaluateCertification,
  isCertificationAgentActionAllowed,
  rehydrateCertificationEnvelope,
  requiresRecertification,
} from "../features/report-certification/certification-policy";
import {
  demoCertificationContext,
  demoCertificationInput,
} from "../features/report-certification/demo-data";
import type {
  CertificationArtifact,
  CertificationCheckResult,
  CertificationEvaluationContext,
  CertificationEvaluationInput,
  CertificationException,
  CertificationGate,
} from "../features/report-certification/types";

interface Fixture {
  input: CertificationEvaluationInput;
  context: CertificationEvaluationContext;
}

function fixture(): Fixture {
  return {
    input: structuredClone(demoCertificationInput),
    context: structuredClone(demoCertificationContext),
  };
}

function check(
  input: CertificationEvaluationInput,
  gateId: string,
  controlId: string,
): CertificationCheckResult {
  const result = input.checkResults.find(
    (candidate) =>
      candidate.gateId === gateId && candidate.controlId === controlId,
  );
  assert.ok(result, `missing fixture check ${gateId}/${controlId}`);
  return result;
}

function gate(
  input: CertificationEvaluationInput,
  gateId: string,
): CertificationGate {
  const result = input.gates.find((candidate) => candidate.id === gateId);
  assert.ok(result, `missing fixture gate ${gateId}`);
  return result;
}

function decision(fixtureValue: Fixture) {
  return evaluateCertification(fixtureValue.input, fixtureValue.context);
}

function addException(
  input: CertificationEvaluationInput,
  failedCheck: CertificationCheckResult,
  options: {
    id?: string;
    ownerId?: string;
    approvedByActorId?: string;
    approvedByActorType?: CertificationException["approvedByActorType"];
    approvedAt?: string;
    expiresAt?: string;
  } = {},
): CertificationException {
  const failedGate = gate(input, failedCheck.gateId);
  const id = options.id ?? "exception:demo-approved";
  const approvedByActorId =
    options.approvedByActorId ?? "role:demo-certification-policy-owner";
  const exception: CertificationException = {
    id,
    productId: input.product.id,
    gateId: failedGate.id,
    checkResultId: failedCheck.id,
    status: "approved",
    ownerId: options.ownerId ?? failedCheck.ownerId,
    reason: "Synthetic controlled migration window",
    scope: "This exact failed control for the synthetic product",
    remediationPlan: "Re-run the control and close the exception",
    approvedByActorId,
    approvedByActorType:
      options.approvedByActorType ?? "policy_authority",
    approvedAt: options.approvedAt ?? "2026-08-27T14:00:00.000Z",
    expiresAt: options.expiresAt ?? "2026-09-01T00:00:00.000Z",
    policyVersion: input.policy.version,
    evidenceArtifactId: `artifact:${id}`,
  };
  const artifact: CertificationArtifact = {
    id: exception.evidenceArtifactId,
    kind: "approval",
    uri: `urn:demo:certification:${id}`,
    contentHash:
      "sha256:9000000000000000000000000000000000000000000000000000000000000009",
    producer: "demo-exception-registry",
    observedAt: "2026-08-27T14:30:00.000Z",
    subject: {
      type: "exception",
      productId: input.product.id,
      gateId: failedGate.id,
      checkResultId: failedCheck.id,
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
  };
  input.exceptions.push(exception);
  input.artifacts.push(artifact);
  return exception;
}

function addTierFourControls(input: CertificationEvaluationInput): void {
  let sequence = 100;
  for (const currentGate of input.gates) {
    currentGate.targetTier = 4;
    const requirements = input.policy.requiredControls.filter(
      (control) =>
        control.tier === 4 && control.gateKinds.includes(currentGate.kind),
    );
    for (const requirement of requirements) {
      sequence += 1;
      const checkId = `check:${currentGate.id}:t4:${requirement.id}`;
      const artifactId = `artifact:${currentGate.id}:t4:${requirement.id}`;
      currentGate.checkResultIds.push(checkId);
      input.checkResults.push({
        id: checkId,
        gateId: currentGate.id,
        controlId: requirement.id,
        name: `Synthetic ${requirement.id}`,
        family: requirement.family,
        requiredForTier: 4,
        status: "PASS",
        reasonCode: "CONTINUOUS_ASSURANCE_PASS",
        ownerId: currentGate.ownerId,
        evidenceArtifactIds: [artifactId],
      });
      input.artifacts.push({
        id: artifactId,
        kind: requirement.evidenceKinds[0],
        uri: `urn:demo:certification:t4:${sequence}`,
        contentHash: `sha256:${String(sequence).padStart(64, "0")}`,
        producer: "demo-certification-fixture",
        observedAt: "2026-08-27T14:30:00.000Z",
        subject: {
          type: "check_result",
          productId: input.product.id,
          gateId: currentGate.id,
          checkResultId: checkId,
          controlId: requirement.id,
        },
      });
    }
  }
}

test("a complete synthetic run earns T3 and an explicit business decision", () => {
  const current = fixture();
  const result = decision(current);

  assert.equal(result.achievedTier, 3);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.validUntil, "2026-11-25T14:30:00.000Z");
  assert.equal(
    result.gateDecisions.filter((candidate) => candidate.kind === "pipeline_gate")
      .length,
    4,
  );
  assert.ok(
    result.gateDecisions.some(
      (candidate) =>
        candidate.kind === "business_assurance" &&
        candidate.gateId === "gate:business-assurance" &&
        candidate.verdict === "PASS",
    ),
  );
});

test("T0 never passes when the required gate model is empty", () => {
  const current = fixture();
  current.input.product.requiredGateIds = [];
  current.input.gates = [];
  current.input.checkResults = [];
  current.input.artifacts = current.input.artifacts.filter(
    (artifact) =>
      artifact.id === current.input.metricContract?.artifactId ||
      artifact.id === current.input.smeApproval?.signatureArtifactId,
  );

  const result = decision(current);

  assert.equal(result.achievedTier, 0);
  assert.notEqual(result.verdict, "PASS");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "REQUIRED_GATE_SET_EMPTY",
    ),
  );
});

test("a terminal-only subset cannot masquerade as a complete T3 chain", () => {
  const current = fixture();
  current.input.product.requiredGateIds = ["gate:demo-mart-to-consumer"];

  const result = decision(current);

  assert.equal(result.achievedTier, 0);
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "REQUIRED_GATE_SET_INCOMPLETE",
    ),
  );
});

test("a forged two-gate shortcut cannot replace the trusted registered path", () => {
  const current = fixture();
  const retainedGateIds = new Set([
    "gate:demo-source-to-staging",
    "gate:demo-mart-to-consumer",
  ]);
  current.input.product.requiredGateIds = [
    "gate:demo-source-to-staging",
    "gate:demo-mart-to-consumer",
  ];
  current.input.gates = current.input.gates.filter((candidate) =>
    retainedGateIds.has(candidate.id),
  );
  const firstGate = gate(current.input, "gate:demo-source-to-staging");
  const consumerGate = gate(current.input, "gate:demo-mart-to-consumer");
  firstGate.toAssetId = consumerGate.fromAssetId;
  consumerGate.sequence = 2;

  const retainedCheckIds = new Set(
    current.input.gates.flatMap((candidate) => candidate.checkResultIds),
  );
  current.input.checkResults = current.input.checkResults.filter((candidate) =>
    retainedCheckIds.has(candidate.id),
  );
  const retainedArtifactIds = new Set(
    current.input.checkResults.flatMap(
      (candidate) => candidate.evidenceArtifactIds,
    ),
  );
  assert.ok(current.input.metricContract);
  assert.ok(current.input.smeApproval);
  retainedArtifactIds.add(current.input.metricContract.artifactId);
  retainedArtifactIds.add(current.input.smeApproval.signatureArtifactId);
  current.input.artifacts = current.input.artifacts.filter((artifact) =>
    retainedArtifactIds.has(artifact.id),
  );

  const result = decision(current);

  assert.equal(result.achievedTier, 0);
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.reasonCode === "TRUSTED_PRODUCT_TOPOLOGY_MISMATCH",
    ),
  );
});

test("a disconnected or reordered source-to-consumer topology fails closed", () => {
  const disconnected = fixture();
  gate(
    disconnected.input,
    "gate:demo-staging-to-intermediate",
  ).fromAssetId = "model:unrelated";
  const disconnectedResult = decision(disconnected);
  assert.equal(disconnectedResult.achievedTier, 0);
  assert.equal(disconnectedResult.verdict, "BLOCKED");
  assert.ok(
    disconnectedResult.findings.some(
      (finding) => finding.reasonCode === "GATE_TOPOLOGY_DISCONNECTED",
    ),
  );

  const reordered = fixture();
  reordered.input.product.requiredGateIds.reverse();
  const reorderedResult = decision(reordered);
  assert.equal(reorderedResult.achievedTier, 0);
  assert.ok(
    reorderedResult.findings.some(
      (finding) => finding.reasonCode === "GATE_SEQUENCE_INVALID",
    ),
  );
});

test("duplicate identifiers are rejected before order can shadow evidence", () => {
  for (const order of ["fail-first", "pass-first"] as const) {
    const current = fixture();
    const original = check(
      current.input,
      "gate:demo-source-to-staging",
      "verification.movement",
    );
    original.status = "FAIL";
    original.reasonCode = "REAL_FAILURE";
    const shadow = { ...structuredClone(original), status: "PASS" as const };
    current.input.checkResults =
      order === "fail-first"
        ? [...current.input.checkResults, shadow]
        : [shadow, ...current.input.checkResults];
    const result = decision(current);
    assert.equal(result.achievedTier, 0);
    assert.equal(result.verdict, "BLOCKED");
    assert.ok(
      result.findings.some(
        (finding) => finding.reasonCode === "DUPLICATE_CHECK_RESULT_ID",
      ),
    );
  }

  const artifactDuplicate = fixture();
  artifactDuplicate.input.artifacts.push(
    structuredClone(artifactDuplicate.input.artifacts[0]),
  );
  assert.ok(
    decision(artifactDuplicate).findings.some(
      (finding) => finding.reasonCode === "DUPLICATE_ARTIFACT_ID",
    ),
  );

  const gateDuplicate = fixture();
  gateDuplicate.input.gates.push(structuredClone(gateDuplicate.input.gates[0]));
  assert.ok(
    decision(gateDuplicate).findings.some(
      (finding) => finding.reasonCode === "DUPLICATE_GATE_ID",
    ),
  );

  const exceptionDuplicate = fixture();
  const failed = check(
    exceptionDuplicate.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  failed.status = "FAIL";
  const approved = addException(exceptionDuplicate.input, failed);
  exceptionDuplicate.input.exceptions.push(structuredClone(approved));
  assert.ok(
    decision(exceptionDuplicate).findings.some(
      (finding) => finding.reasonCode === "DUPLICATE_EXCEPTION_ID",
    ),
  );
});

test("policy control IDs, families, tiers, owners, and tolerances are exact", () => {
  const current = fixture();
  const structural = check(
    current.input,
    "gate:demo-staging-to-intermediate",
    "verification.structure",
  );
  structural.family = "registration";

  const result = decision(current);

  assert.equal(result.verdict, "BLOCKED");
  assert.equal(result.achievedTier, 1);
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "CHECK_POLICY_BINDING_MISMATCH",
    ),
  );
});

test("the trusted policy hash detects manifest or authority tampering", () => {
  const current = fixture();
  current.input.policy.requiredControls[0].evidenceKinds = ["test_result"];

  const result = decision(current);

  assert.equal(result.achievedTier, 0);
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "TRUSTED_POLICY_MISMATCH",
    ),
  );
});

test("a healthy mart cannot hide source-to-staging record loss", () => {
  const current = fixture();
  const movement = check(
    current.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  movement.status = "FAIL";
  movement.reasonCode = "SOURCE_RECORD_LOSS";
  movement.observedValue = "17 synthetic source records omitted";

  const result = decision(current);

  assert.equal(result.achievedTier, 1);
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "SOURCE_RECORD_LOSS",
    ),
  );
});

test("higher-tier failures remain visible after a lower tier fails", () => {
  const current = fixture();
  const movement = check(
    current.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  const governance = check(
    current.input,
    "gate:demo-source-to-staging",
    "assurance.governance",
  );
  movement.status = "FAIL";
  movement.reasonCode = "MOVEMENT_FAILED";
  governance.status = "NOT_PROVEN";
  governance.reasonCode = "GOVERNANCE_MISSING";

  const result = decision(current);

  assert.ok(
    result.findings.some((finding) => finding.reasonCode === "MOVEMENT_FAILED"),
  );
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "GOVERNANCE_MISSING",
    ),
  );
});

test("malformed, future, untrusted, or misbound evidence cannot pass", () => {
  const cases: Array<{
    name: string;
    mutate: (artifact: CertificationArtifact) => void;
    reason: string;
  }> = [
    {
      name: "malformed hash",
      mutate: (artifact) => {
        artifact.contentHash = "";
      },
      reason: "EVIDENCE_INVALID",
    },
    {
      name: "future observation",
      mutate: (artifact) => {
        artifact.observedAt = "2026-08-28T00:00:00.000Z";
      },
      reason: "EVIDENCE_OBSERVED_AFTER_RUN",
    },
    {
      name: "untrusted producer",
      mutate: (artifact) => {
        artifact.producer = "untrusted-producer";
      },
      reason: "EVIDENCE_PRODUCER_UNTRUSTED",
    },
    {
      name: "wrong subject",
      mutate: (artifact) => {
        assert.equal(artifact.subject.type, "check_result");
        artifact.subject.checkResultId = "check:unrelated";
      },
      reason: "EVIDENCE_SUBJECT_MISMATCH",
    },
  ];

  for (const evidenceCase of cases) {
    const current = fixture();
    const structural = check(
      current.input,
      "gate:demo-staging-to-intermediate",
      "verification.structure",
    );
    const artifact = current.input.artifacts.find(
      (candidate) => candidate.id === structural.evidenceArtifactIds[0],
    );
    assert.ok(artifact, evidenceCase.name);
    evidenceCase.mutate(artifact);
    const result = decision(current);
    assert.notEqual(result.verdict, "PASS", evidenceCase.name);
    assert.ok(
      result.findings.some(
        (finding) => finding.reasonCode === evidenceCase.reason,
      ),
      evidenceCase.name,
    );
  }
});

test("contract and SME approval bind exact hashes, subjects, and trusted authority", () => {
  const contractMismatch = fixture();
  assert.ok(contractMismatch.input.metricContract);
  contractMismatch.input.metricContract.contentHash =
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const contractResult = decision(contractMismatch);
  assert.equal(contractResult.achievedTier, 2);
  assert.equal(contractResult.verdict, "BLOCKED");
  assert.ok(
    contractResult.findings.some(
      (finding) => finding.reasonCode === "METRIC_CONTRACT_HASH_MISMATCH",
    ),
  );

  const forgedAuthority = fixture();
  assert.ok(forgedAuthority.input.smeApproval);
  forgedAuthority.input.smeApproval.approverActorId = "actor:arbitrary";
  const signature = forgedAuthority.input.artifacts.find(
    (artifact) =>
      artifact.id === forgedAuthority.input.smeApproval?.signatureArtifactId,
  );
  assert.ok(signature);
  assert.equal(signature.subject.type, "sme_approval");
  signature.subject.approverActorId = "actor:arbitrary";
  const authorityResult = decision(forgedAuthority);
  assert.equal(authorityResult.achievedTier, 2);
  assert.ok(
    authorityResult.findings.some(
      (finding) => finding.reasonCode === "SME_APPROVAL_AUTHORITY_INVALID",
    ),
  );
});

test("SME validity cannot be extended beyond the signed approval subject", () => {
  const signedExpired = fixture();
  assert.ok(signedExpired.input.smeApproval);
  signedExpired.input.smeApproval.validUntil = "2026-09-01T00:00:00.000Z";
  const signature = signedExpired.input.artifacts.find(
    (artifact) =>
      artifact.id === signedExpired.input.smeApproval?.signatureArtifactId,
  );
  assert.ok(signature);
  assert.equal(signature.subject.type, "sme_approval");
  signature.subject.validUntil = signedExpired.input.smeApproval.validUntil;
  signedExpired.context.asOf = "2026-09-02T00:00:00.000Z";

  const expired = decision(signedExpired);
  assert.equal(expired.achievedTier, 2);
  assert.equal(expired.verdict, "EXPIRED");

  const forgedExtension = structuredClone(signedExpired);
  assert.ok(forgedExtension.input.smeApproval);
  forgedExtension.input.smeApproval.validUntil = "2026-12-31T23:59:59.000Z";
  const forged = decision(forgedExtension);
  assert.equal(forged.achievedTier, 2);
  assert.equal(forged.verdict, "BLOCKED");
  assert.ok(
    forged.findings.some(
      (finding) =>
        finding.reasonCode === "SME_APPROVAL_EVIDENCE_SUBJECT_MISMATCH",
    ),
  );
});

test("an approved exception is fully bound and caps effective validity", () => {
  const current = fixture();
  const failed = check(
    current.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  failed.status = "FAIL";
  failed.reasonCode = "LATE_ARRIVAL_OUTSIDE_SLO";
  const exception = addException(current.input, failed);

  const result = decision(current);

  assert.equal(result.achievedTier, 3);
  assert.equal(result.verdict, "CONDITIONAL");
  assert.deepEqual(result.conditionalExceptionIds, [exception.id]);
  assert.equal(result.validUntil, exception.expiresAt);
});

test("spoofed authority, owner mismatch, and agent self-approval are blocked", () => {
  const cases: Array<{
    label: string;
    options: Parameters<typeof addException>[2];
  }> = [
    {
      label: "spoofed authority",
      options: { approvedByActorId: "actor:arbitrary" },
    },
    { label: "wrong owner", options: { ownerId: "team:unrelated" } },
    {
      label: "agent self approval",
      options: {
        approvedByActorId: demoCertificationInput.run.agentId,
        approvedByActorType: "agent",
      },
    },
  ];

  for (const currentCase of cases) {
    const current = fixture();
    const failed = check(
      current.input,
      "gate:demo-source-to-staging",
      "verification.movement",
    );
    failed.status = "FAIL";
    addException(current.input, failed, currentCase.options);
    const result = decision(current);
    assert.equal(result.verdict, "BLOCKED", currentCase.label);
    assert.ok(
      result.findings.some(
        (finding) => finding.reasonCode === "EXCEPTION_INVALID",
      ),
      currentCase.label,
    );
  }
});

test("an active replacement exception wins over an expired historical record", () => {
  const current = fixture();
  const failed = check(
    current.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  failed.status = "FAIL";
  addException(current.input, failed, {
    id: "exception:aaa-expired",
    approvedAt: "2026-08-27T13:00:00.000Z",
    expiresAt: "2026-08-27T14:45:00.000Z",
  });
  const active = addException(current.input, failed, {
    id: "exception:zzz-active",
    expiresAt: "2026-09-02T00:00:00.000Z",
  });

  const result = decision(current);

  assert.equal(result.verdict, "CONDITIONAL");
  assert.deepEqual(result.conditionalExceptionIds, [active.id]);
});

test("exception expiry and scope cannot be rewritten beyond signed evidence", () => {
  const signedExpired = fixture();
  const failed = check(
    signedExpired.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  failed.status = "FAIL";
  const expiredException = addException(signedExpired.input, failed, {
    id: "exception:signed-expired",
    approvedAt: "2026-08-27T13:00:00.000Z",
    expiresAt: "2026-08-27T14:45:00.000Z",
  });

  assert.equal(decision(signedExpired).verdict, "EXPIRED");

  const forgedExtension = structuredClone(signedExpired);
  const forgedException = forgedExtension.input.exceptions.find(
    (candidate) => candidate.id === expiredException.id,
  );
  assert.ok(forgedException);
  forgedException.expiresAt = "2026-09-02T00:00:00.000Z";
  forgedException.reason = "Rewritten reason";
  forgedException.scope = "Expanded scope";
  forgedException.remediationPlan = "Removed original remediation";

  const forged = decision(forgedExtension);
  assert.equal(forged.verdict, "BLOCKED");
  assert.ok(
    forged.findings.some(
      (finding) => finding.reasonCode === "EXCEPTION_INVALID",
    ),
  );
});

test("the trusted as-of clock expires dependencies without rewriting run history", () => {
  const current = fixture();
  const originalEvaluatedAt = current.input.run.evaluatedAt;
  current.context.asOf = "2026-11-26T00:00:00.000Z";

  const result = decision(current);

  assert.equal(current.input.run.evaluatedAt, originalEvaluatedAt);
  assert.equal(result.verdict, "EXPIRED");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "CERTIFICATION_EXPIRED",
    ),
  );

  const approvalBound = fixture();
  assert.ok(approvalBound.input.smeApproval);
  approvalBound.input.smeApproval.validUntil = "2026-09-15T00:00:00.000Z";
  const approvalBoundSignature = approvalBound.input.artifacts.find(
    (artifact) =>
      artifact.id === approvalBound.input.smeApproval?.signatureArtifactId,
  );
  assert.ok(approvalBoundSignature);
  assert.equal(approvalBoundSignature.subject.type, "sme_approval");
  approvalBoundSignature.subject.validUntil =
    approvalBound.input.smeApproval.validUntil;
  const approvalBoundResult = decision(approvalBound);
  assert.equal(approvalBoundResult.verdict, "PASS");
  assert.equal(
    approvalBoundResult.validUntil,
    approvalBound.input.smeApproval.validUntil,
  );
});

test("recertification distinguishes revisions from operational events", () => {
  const current = {
    productId: demoCertificationInput.product.id,
    certificationRunId: demoCertificationInput.run.id,
  };
  assert.equal(
    requiresRecertification(
      {
        id: "change:measure",
        productId: current.productId,
        certificationRunId: current.certificationRunId,
        kind: "semantic_measure",
        sourceId: demoCertificationInput.product.consumerAssetId,
        detectedAt: "2026-08-28T12:00:00.000Z",
        previousRevision: "v7",
        currentRevision: "v7",
      },
      current,
    ),
    false,
  );
  assert.equal(
    requiresRecertification(
      {
        id: "event:incident",
        productId: current.productId,
        certificationRunId: current.certificationRunId,
        kind: "unresolved_incident",
        sourceId: "incident:demo",
        detectedAt: "2026-08-28T12:00:00.000Z",
        previousRevision: "same",
        currentRevision: "same",
      },
      current,
    ),
    true,
  );
  assert.equal(
    requiresRecertification(
      {
        id: "event:other-product",
        productId: "product:other",
        certificationRunId: current.certificationRunId,
        kind: "slo_breach",
        sourceId: "monitor:other",
        detectedAt: "2026-08-28T12:00:00.000Z",
      },
      current,
    ),
    false,
  );
});

test("the canonical evidence envelope alone reproduces the decision", () => {
  const original = decision(fixture());
  const envelope = rehydrateCertificationEnvelope(original.evidenceBundle);
  const replayed = evaluateCertification(envelope.input, envelope.context);

  assert.deepEqual(replayed, original);
  assert.doesNotThrow(() => JSON.stringify(original));
  assert.match(original.evidenceBundle.envelopeHash, /^sha256:[0-9a-f]{64}$/u);

  const tampered = structuredClone(original.evidenceBundle);
  tampered.envelope.input.run.gitSha =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.throws(
    () => rehydrateCertificationEnvelope(tampered),
    /integrity check failed/u,
  );

  const summaryMutations: Array<
    (bundle: typeof original.evidenceBundle) => void
  > = [
    (bundle) => {
      bundle.runId = "run:tampered-summary";
    },
    (bundle) => {
      bundle.policyVersion = "tampered-policy";
    },
    (bundle) => {
      bundle.gateIds = bundle.gateIds.slice(1);
    },
    (bundle) => {
      bundle.artifacts[0].contentHash =
        "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    },
    (bundle) => {
      assert.ok(bundle.smeApproval);
      bundle.smeApproval.validUntil = "2099-01-01T00:00:00.000Z";
    },
  ];
  for (const mutate of summaryMutations) {
    const summaryTampered = structuredClone(original.evidenceBundle);
    mutate(summaryTampered);
    assert.throws(
      () => rehydrateCertificationEnvelope(summaryTampered),
      /integrity check failed/u,
    );
  }

  const conditional = fixture();
  const failed = check(
    conditional.input,
    "gate:demo-source-to-staging",
    "verification.movement",
  );
  failed.status = "FAIL";
  addException(conditional.input, failed);
  const conditionalBundle = structuredClone(
    decision(conditional).evidenceBundle,
  );
  assert.ok(conditionalBundle.exceptions[0]);
  conditionalBundle.exceptions[0].expiresAt = "2099-01-01T00:00:00.000Z";
  assert.throws(
    () => rehydrateCertificationEnvelope(conditionalBundle),
    /integrity check failed/u,
  );
});

test("business-assurance findings always reference an explicit decision", () => {
  const current = fixture();
  const signatureId = current.input.smeApproval?.signatureArtifactId;
  delete current.input.smeApproval;
  current.input.artifacts = current.input.artifacts.filter(
    (artifact) => artifact.id !== signatureId,
  );

  const result = decision(current);
  const decisionIds = new Set(result.gateDecisions.map((item) => item.gateId));

  assert.equal(result.achievedTier, 2);
  assert.equal(result.verdict, "NOT_PROVEN");
  assert.ok(result.findings.every((finding) => decisionIds.has(finding.gateId)));
  for (const gateDecision of result.gateDecisions) {
    assert.deepEqual(
      gateDecision.findingIds,
      result.findings
        .filter((finding) => finding.gateId === gateDecision.gateId)
        .map((finding) => finding.id),
    );
  }
});

test("T4 requires monitoring, alerting, routing, and incident evidence", () => {
  const complete = fixture();
  addTierFourControls(complete.input);
  const passing = decision(complete);
  assert.equal(passing.achievedTier, 4);
  assert.equal(passing.verdict, "PASS");

  const missingIncident = fixture();
  addTierFourControls(missingIncident.input);
  const consumer = gate(missingIncident.input, "gate:demo-mart-to-consumer");
  const incident = check(
    missingIncident.input,
    consumer.id,
    "continuous.incident-response",
  );
  consumer.checkResultIds = consumer.checkResultIds.filter(
    (id) => id !== incident.id,
  );
  missingIncident.input.checkResults = missingIncident.input.checkResults.filter(
    (candidate) => candidate.id !== incident.id,
  );
  missingIncident.input.artifacts = missingIncident.input.artifacts.filter(
    (artifact) => !incident.evidenceArtifactIds.includes(artifact.id),
  );
  const denied = decision(missingIncident);
  assert.equal(denied.achievedTier, 3);
  assert.equal(denied.verdict, "NOT_PROVEN");
  assert.ok(
    denied.findings.some(
      (finding) =>
        finding.reasonCode === "POLICY_CONTROL_MISSING" && finding.tier === 4,
    ),
  );
});

test("a union-style T4 control cannot satisfy four evidence duties with one artifact", () => {
  const current = fixture();
  current.input.policy.requiredControls = [
    ...current.input.policy.requiredControls.filter(
      (control) => control.tier !== 4,
    ),
    {
      id: "continuous.combined",
      tier: 4,
      gateKinds: ["pipeline_edge", "consumer"],
      family: "continuous_assurance",
      evidenceKinds: [
        "run_history",
        "test_result",
        "policy",
        "incident_record",
      ],
    },
  ];
  current.input.policy.contentHash = certificationPolicyContentHash(
    current.input.policy,
  );
  current.input.run.policyContentHash = current.input.policy.contentHash;
  current.context.trustedPolicy.contentHash = current.input.policy.contentHash;

  let artifactSequence = 500;
  for (const currentGate of current.input.gates) {
    currentGate.targetTier = 4;
    artifactSequence += 1;
    const checkId = `check:${currentGate.id}:continuous.combined`;
    const artifactId = `artifact:${currentGate.id}:continuous.combined`;
    currentGate.checkResultIds.push(checkId);
    current.input.checkResults.push({
      id: checkId,
      gateId: currentGate.id,
      controlId: "continuous.combined",
      name: "Combined continuous assurance claim",
      family: "continuous_assurance",
      requiredForTier: 4,
      status: "PASS",
      reasonCode: "COMBINED_CONTINUOUS_ASSURANCE_PASS",
      ownerId: currentGate.ownerId,
      evidenceArtifactIds: [artifactId],
    });
    current.input.artifacts.push({
      id: artifactId,
      kind: "run_history",
      uri: `urn:demo:certification:combined:${artifactSequence}`,
      contentHash: `sha256:${String(artifactSequence).padStart(64, "0")}`,
      producer: "demo-certification-fixture",
      observedAt: "2026-08-27T14:30:00.000Z",
      subject: {
        type: "check_result",
        productId: current.input.product.id,
        gateId: currentGate.id,
        checkResultId: checkId,
        controlId: "continuous.combined",
      },
    });
  }

  const result = decision(current);

  assert.notEqual(result.achievedTier, 4);
  assert.notEqual(result.verdict, "PASS");
  assert.ok(
    result.findings.some(
      (finding) => finding.reasonCode === "POLICY_CONTROL_MANIFEST_INVALID",
    ),
  );
});

test("failures retain their gate owner and downstream impact", () => {
  const current = fixture();
  const failedGate = gate(
    current.input,
    "gate:demo-staging-to-intermediate",
  );
  const failed = check(
    current.input,
    failedGate.id,
    "verification.structure",
  );
  failed.status = "FAIL";
  failed.reasonCode = "SCHEMA_CONTRACT_BROKEN";

  const result = decision(current);
  const finding = result.findings.find(
    (candidate) => candidate.checkResultId === failed.id,
  );

  assert.equal(finding?.ownerId, failedGate.ownerId);
  assert.deepEqual(
    finding?.downstreamAssetIds,
    [...failedGate.downstreamAssetIds].sort(),
  );
  assert.ok(finding?.downstreamAssetIds.includes(current.input.product.consumerAssetId));
});

test("the certification agent remains read-only", () => {
  assert.equal(isCertificationAgentActionAllowed("inspect_metadata"), true);
  assert.equal(isCertificationAgentActionAllowed("run_read_only_check"), true);
  assert.equal(isCertificationAgentActionAllowed("mutate_production"), false);
  assert.equal(isCertificationAgentActionAllowed("approve_business_logic"), false);
  assert.equal(isCertificationAgentActionAllowed("approve_exception"), false);
  assert.equal(isCertificationAgentActionAllowed("loosen_tolerance"), false);
});
