import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateCertification } from "../features/report-certification/certification-policy";
import {
  demoCertificationContext,
  demoCertificationInput,
} from "../features/report-certification/demo-data";
import { demoReportCertificationSnapshot } from "../features/report-certification/demo-view-data";

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

test("certification fixtures are serializable, synthetic, and addressable", () => {
  const snapshot = JSON.parse(
    JSON.stringify(demoReportCertificationSnapshot),
  ) as typeof demoReportCertificationSnapshot;
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.provenance, "synthetic");
  assert.equal(snapshot.products.length, 4);
  assert.ok(unique(snapshot.products.map((product) => product.id)));
  assert.ok(
    snapshot.products.every(
      (product) =>
        unique(product.gates.map((gate) => gate.id)) &&
        product.gates.every((gate) =>
          unique(gate.evidence.map((evidence) => evidence.id)),
        ),
    ),
  );
  assert.ok(unique(snapshot.agent.runbook.map((step) => step.id)));
  assert.ok(unique(snapshot.agent.dryRun.steps.map((step) => step.id)));
  assert.doesNotMatch(serialized, /(?:contentHash|artifactUri|queryText)/i);
  assert.doesNotMatch(
    serialized,
    /(?:[A-Za-z]:\\|\\\\|@[A-Za-z0-9.-]+|[A-Z][A-Z0-9_]+\.[A-Z][A-Z0-9_]+)/,
  );
});

test("the canonical synthetic evaluator input earns its declared T3 pass", () => {
  const decision = evaluateCertification(
    demoCertificationInput,
    demoCertificationContext,
  );

  assert.equal(decision.achievedTier, 3);
  assert.equal(decision.verdict, "PASS");
  assert.equal(
    decision.gateDecisions.filter((gate) => gate.kind === "pipeline_gate").length,
    demoCertificationInput.product.requiredGateIds.length,
  );
  assert.ok(
    decision.gateDecisions.some(
      (gate) => gate.kind === "business_assurance" && gate.verdict === "PASS",
    ),
  );
});

test("sample certification summary pins current policy, topology, and evidence references", async () => {
  const fixtureUrl = new URL(
    "../features/report-certification/fixtures/sample-certification-run.json",
    import.meta.url,
  );
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

  assert.equal(fixture.schema, "synthetic-certification-summary/1.0");
  assert.equal(fixture.replayable, false);

  for (const field of [
    "run_id",
    "product_id",
    "evaluated_at",
    "valid_until",
    "policy",
    "versions",
    "required_gates",
    "metric_contract",
    "sme_approval",
    "decision",
  ]) {
    assert.ok(field in fixture, `missing ${field}`);
  }

  assert.equal(fixture.policy.minimum_gate_model, true);
  assert.equal(fixture.policy.missing_evidence_outcome, "NOT_PROVEN");
  assert.equal(
    fixture.policy.content_hash,
    demoCertificationInput.policy.contentHash,
  );
  assert.equal(
    fixture.trusted_context.product_topology_hash,
    demoCertificationContext.trustedProduct.topologyHash,
  );
  assert.equal(fixture.required_gates.length, 4);
  assert.ok(
    unique(fixture.required_gates.map((gate: { gate_id: string }) => gate.gate_id)),
  );
  const artifactIds = new Set(
    demoCertificationInput.artifacts.map((artifact) => artifact.id),
  );
  assert.ok(
    fixture.required_gates.every(
      (gate: { evidence_artifact_ids: string[] }) =>
        gate.evidence_artifact_ids.every((id) => artifactIds.has(id)),
    ),
  );
  const canonicalDecision = evaluateCertification(
    demoCertificationInput,
    demoCertificationContext,
  );
  assert.equal(fixture.valid_until, canonicalDecision.validUntil);
  assert.equal(fixture.decision.achieved_tier, canonicalDecision.achievedTier);
  assert.equal(fixture.decision.verdict, canonicalDecision.verdict);
  assert.ok(Date.parse(fixture.evaluated_at) < Date.parse(fixture.valid_until));
});
