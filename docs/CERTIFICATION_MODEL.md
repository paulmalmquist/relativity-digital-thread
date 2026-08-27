# Certification model

## Purpose and scope

The Report Certification feature answers a narrow question: is there current,
reproducible evidence that a governed data product moves and represents data as
its approved contract requires?

It evaluates every required handoff from source to consumer. It does not certify
an organization, a source application, an employee, or this repository. It also
does not create or approve business definitions. Those remain owned by the
applicable subject-matter experts (SMEs) and policy authorities.

The bundled data and decisions are synthetic. A production decision is valid
only when an authorized host supplies current evidence under an identified
policy version.

## Core records

The portable contracts separate facts, evidence, and decisions:

| Record | Purpose |
| --- | --- |
| Product | Identifies the consumer asset, owner, source, criticality, required gates, and metric-contract binding. |
| Gate | Represents one required pipeline edge or the consumer gate. |
| Check result | Records a policy-defined test, status, tolerance, observed value, owner, and evidence references. |
| Artifact | References immutable evidence by URI, content hash, producer, and observation time. |
| Metric contract | Versions the approved grain, measures, and calculation contract. |
| SME approval | Binds an authorized approval to one exact metric-contract version and validity window. |
| Exception | Records a policy-approved, owned, time-bounded deviation from a specific failed check. |
| Run | Pins policy, agent, code, pipeline-manifest, semantic-model, and time versions. |
| Decision | Contains the gate decisions, findings, achieved tier, verdict, validity, and reproducible evidence bundle. |
| Recertification trigger | Records a change or operational event that invalidates or reopens a prior decision. |

Raw evidence must be stored separately from the verdict. A verdict is a derived
record and must reference immutable artifact hashes and the exact versions used
to derive it.

## Required evidence chain

The default policy evaluates four pipeline gates; the final mart-to-consumer
handoff is also the consumer-semantic gate:

1. source to staging;
2. staging to intermediate;
3. intermediate to mart; and
4. mart to consumer, including consumer-semantic behavior.

Each gate is independently addressable and owned. Lineage must fail closed when
a required edge is absent, ambiguous, or cannot be tied to the declared product.
An excellent downstream result cannot compensate for an unproven upstream edge.

## Check families

### Registration

Confirm the product's purpose, accountable owner, steward, criticality, source,
consumer, row grain, stable identity, and complete lineage.

### Structural

Verify schemas, required fields, compatible types, nullability, accepted values,
keys, uniqueness, referential integrity, and declared grain.

### Movement

Verify watermarks, row and distinct-key movement, duplicates, omissions, late
arrivals, deletion/tombstone behavior, and change-ordering semantics.

### Transformation fidelity

Verify join cardinality, explained filter loss, dimension coverage, aggregation
reconciliation, and rounding or tolerance behavior across representative time
windows. A row-count match alone is insufficient when joins can inflate a
measure.

### Operations

Verify freshness, successful-run rate, runtime distribution, retries,
idempotency, backfill behavior, partial-failure recovery, and accountable owner
routing.

### Consumer semantics

Verify mart fields against semantic fields, measures against the approved metric
contract, labels and units, refresh state, relationships, and applicable row- or
column-level access rules.

### Governance

Verify ownership, classification, least-privilege access, retention,
documentation, exception governance, and the current SME approval.

### Continuous assurance

Verify active monitoring, change detection, recertification triggers, SLO
alerts, accountable routing, and evidence that the incident path has been
exercised.

Exact comparison is preferred. When exact equality is inappropriate, the
tolerance must be defined by the applicable policy or approved contract. An
agent or runtime evaluator must not invent or loosen it.

## Tier model

The achieved tier is the minimum tier supported by every required gate and the
consumer gate. It is never an average and cannot be raised by unrelated passing
checks.

### T0: not proven

T0 is an implementation sentinel, not a certification award. It means the
minimum registration evidence is missing or the evaluator cannot establish a
required gate.

### T1: registered

Purpose, owner, grain, source, consumer, stable identity, and complete lineage
are known.

### T2: verified

T1 plus required structural, movement, transformation-fidelity, and operational
checks passing for every required gate.

### T3: certified

T2 plus all of the following:

- the active metric contract is bound to the product by exact ID and version;
- a current SME approval references that exact contract ID and version;
- the approval was issued by an allowed human authority and has not been
  revoked or expired;
- consumer-semantic and governance controls pass; and
- no failed required check is covered only by an unapproved, invalid, or
  expired exception.

The agent cannot act as the SME or policy authority.

The approval artifact binds the approver, contract hash, approval time, and
validity deadline. Extending the deadline requires a new signed artifact; an
adapter cannot make an expired approval current by editing metadata.

### T4: continuous

T3 plus active monitoring, relevant change-triggered recertification, SLO
alerting, owner routing, and proven incident response. A declaration that
monitoring exists is not enough; the run must reference evidence of its
configuration and operation. Run history, monitor/test results, routing policy,
and an exercised incident record are separate required evidence duties; one
artifact kind cannot stand in for all four.

## Verdicts

Tier and verdict answer different questions. The tier states the assurance
level supported by the gates. The verdict describes the current evidence or
lifecycle outcome.

| Verdict | Meaning |
| --- | --- |
| `PASS` | All requirements for the reported tier are currently proven. |
| `CONDITIONAL` | A specific failure has an active, policy-approved exception with owner, reason, scope, and expiry. |
| `BLOCKED` | A required control failed without an acceptable active exception, or policy explicitly blocks the product. |
| `EXPIRED` | The run, approval, or governing exception is outside its validity window. |
| `NOT_PROVEN` | Required evidence is missing, unreadable, ambiguous, unbound, or otherwise insufficient. |

`NOT_PROVEN` must never be converted to `PASS`. A lifecycle label such as
`CONDITIONAL` does not silently grant a higher tier than the evidence supports.

## Deterministic decision procedure

The policy evaluator is pure, deterministic code. Given the same normalized
input and evaluation time, it must produce the same decision and evidence
bundle.

1. Validate identifiers, timestamps, versions, references, and the required
   gate set against a trusted host-registry topology hash.
2. Resolve every check to its gate and every evidence reference to an artifact.
   Missing references become `NOT_PROVEN` findings.
3. Evaluate required checks by tier using policy-owned tolerances.
4. Validate exceptions against the exact check, policy version, approving
   authority, owner, reason, and expiry.
5. Validate the product's metric-contract binding and the exact, current SME
   approval before allowing T3.
6. Validate continuous-assurance evidence before allowing T4.
7. Calculate each gate's achieved tier and verdict.
8. Set the product tier to the minimum achieved tier across all required gates.
9. Derive the product verdict from blocking, not-proven, conditional, and expiry
   findings without concealing any lower-tier result.
10. Emit a reproducible evidence bundle containing the run and artifact hashes,
    policy and agent versions, code revision, pipeline-manifest hash,
    semantic-model version, metric-contract binding, and approval reference.

Presentation scores may help a reviewer navigate evidence. They are not inputs
to the minimum-gate result unless a named policy rule explicitly defines them.

## Exceptions

An exception is a governed record, not a UI dismissal. A conditional exception
requires:

- the exact failed check;
- an accountable owner;
- a reason and bounded scope;
- approval by an allowed policy authority;
- the governing policy version;
- approval and expiry timestamps; and
- a remediation or review path.

An agent cannot approve an exception. A pending, revoked, mismatched, or expired
exception provides no relief. At its deadline, the host must automatically
re-evaluate the product and block or downgrade it as policy requires.
The approval artifact binds the exception's reason, scope, remediation plan,
policy version, approval time, and expiry. Changing any of those fields requires
a new governed artifact.

## Evidence bundle and reproducibility

Every decision should preserve:

- run ID and timestamps;
- product and gate IDs;
- policy ID/version and evaluator/agent ID/version;
- code revision, transformation-manifest hash, and semantic-model version;
- check name, parameters, query or test hash, sample window, observed result,
  tolerance, status, reason code, and owner;
- artifact URI, content hash, producer, and observation time;
- metric-contract ID/version/hash and SME approval ID;
- exceptions and their validity; and
- achieved gate tiers, final tier, verdict, findings, downstream impact, and
  recertification triggers.

The bundle should be sufficient for an authorized reviewer to reproduce the
decision without trusting an LLM narrative. Raw controlled data does not need
to be copied into the bundle when a governed, immutable reference is sufficient.

## Required production inputs

Before a run begins, the host should resolve:

- the consumer asset ID, location, workspace, accountable owner, and steward;
- its semantic model/dataset and declared mart dependencies;
- complete catalog lineage from the primary source through every required gate;
- transformation manifests, catalogs, tests, run results, and freshness data;
- authorized read-only warehouse/query access and relevant job history;
- orchestrator run, retry, late-data, partial-failure, and backfill history;
- extraction watermarks or change-data-capture metadata;
- the metric contract's grain, dimensions, measures, filters, tolerances, and
  exact version;
- a signed or otherwise verifiable SME approval for that exact version;
- classification, access policy, and row/column security requirements; and
- the active certification policy and exception register.

If a required input cannot be resolved unambiguously, record it as
`NOT_PROVEN` and route the gap to an owner. Do not guess an identity, lineage
path, approval, or policy value.

## Certification workflow

### 1. Discover

Resolve the consumer back through every required upstream asset. Confirm owner,
steward, purpose, grain, domain, criticality, and an unambiguous lineage path.

### 2. Bind contracts

Pin schemas, keys, grain, partition/watermark behavior, freshness and
completeness SLOs, join/loss tolerances, null and referential-integrity rules,
metric-contract version, and SME approval.

### 3. Prove every gate

Execute the required check families independently for each pipeline edge and
the consumer gate. Read-only queries and metadata inspection are the default.
Unavailable evidence is recorded as `NOT_PROVEN`.

### 4. Decide

Apply the deterministic minimum-gate evaluator. The agent may orchestrate the
collection and explain findings, but it does not decide outside the policy
code.

### 5. Publish

Publish the tier and verdict, edge-by-edge chain, passed/failed/not-proven
controls, downstream impact, remediation owners, exact contract and approval,
validity window, and recertification triggers.

### 6. Monitor and reopen

Reopen certification whenever a relevant revision or operational signal may
invalidate the stored evidence.

## Recertification triggers

Relevant changes include:

- pipeline code, configuration, tests, packages, or materialization;
- source/target schema, lineage, grain, join, or filter behavior;
- semantic measures, relationships, labels, units, or security;
- metric-contract or SME-approval version/status;
- owner, exception, approval, or policy validity;
- SLO breach, anomaly, failed backfill, or unresolved incident; and
- any source revision explicitly named by the applicable policy.

A trigger creates or schedules a new run; it does not edit the prior evidence
bundle. Historical decisions remain immutable and retain their original
validity context.

## Agent authority boundary

The optional certification agent is a read-only orchestrator and explainer. It
may:

- inspect authorized metadata;
- invoke approved read-only checks;
- preserve evidence references;
- identify ambiguity and downstream impact;
- draft remediation guidance; and
- route findings to accountable owners.

It must not:

- mutate production data, schemas, code, dashboards, contracts, or policy;
- grant or infer SME approval;
- approve business logic or its own exception;
- waive a required gate;
- choose a more permissive tolerance;
- report unavailable evidence as passing; or
- conceal a weaker upstream result behind a summary score.

Recommendations follow the host's normal review and deployment controls.

## Agent output contract

The agent's narrative must remain subordinate to the deterministic decision.
For each completed run it should present:

- the run ID, policy/evaluator versions, achieved tier, verdict, and validity;
- an edge-by-edge evidence chain;
- passed, failed, conditional, expired, and not-proven controls;
- evidence references and hashes without exposing unauthorized raw values;
- downstream impact and affected consumer assets;
- remediation recommendations and accountable owners;
- the exact metric-contract and SME-approval versions; and
- the event or date that will trigger recertification.

An appropriate reference instruction is:

> Determine whether the named data product is trustworthy by collecting
> reproducible, authorized evidence for every required source-to-consumer
> handoff. Operate read-only. Treat version-specific SME approval and
> policy-owned tolerances as inputs; never invent, change, or approve them.
> Preserve evidence and invoke the deterministic minimum-gate evaluator.
> Missing evidence is NOT_PROVEN. Return the evaluator's verdict and tier,
> edge-by-edge findings, downstream impact, remediation owners, validity, and
> recertification triggers. Never waive a gate, mutate production, or approve
> your own exception.

## Production adapter categories

A host may obtain evidence from a catalog/lineage service, transformation
artifacts, a warehouse, an orchestrator, a semantic/reporting platform, an
approval store, an issue/exception system, and immutable object or evidence
storage. Named commercial or open-source products are implementation examples
only; this repository configures none of them.

Adapters must remain server-side, use least-privilege read access, and normalize
vendor payloads into the exported serializable contracts. Credentials, raw
controlled records, privileged endpoints, and unredacted identities must not be
sent to the browser.

## Acceptance scenarios

A production implementation should prove at least these cases:

1. A healthy mart cannot pass when source-to-staging loses required records.
2. Passing data tests cannot produce T3 without the exact current SME approval.
3. A many-to-many join that preserves row count but inflates a measure fails.
4. Unavailable evidence produces `NOT_PROVEN`, never `PASS`.
5. A consumer measure or security change reopens certification.
6. A historical verdict can be reproduced from its stored evidence bundle.
7. The weakest required gate determines the overall tier.
8. The agent cannot mutate production or approve an exception.
9. Each failure identifies its owner and downstream impact.
10. An expired conditional exception automatically blocks or downgrades the
    product under the active policy.
11. T4 is denied without evidence of monitoring, alerts, routing, and incident
    response.

## Security and disclosure

Before publishing fixtures or evidence, remove real tenant/workspace/project
IDs, internal endpoints, artifact URIs, query text, schemas, sample records,
employee or SME identities, source revision hashes, metric definitions, and
organization-specific classification or tolerance details. Synthetic fixtures
should be unmistakably labeled and should not imitate active internal names.

An endpoint that starts a certification run is an operational capability. It
must enforce server-side authentication and authorization, CSRF protection,
idempotency, rate limits, queueing, audit logging, and least-privilege connector
credentials. The bundled demonstration does not provide such an endpoint.
