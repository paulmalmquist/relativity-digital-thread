# Paul OS report-certification integration

## Goal

Mount the portable Report Certification feature inside the existing Paul OS
shell while preserving the host application's routes, authentication,
authorization, navigation, design tokens, data-access conventions, and audit
controls.

The feature is an evidence and decision surface. It is not a data-integration
engine, policy authority, SME approval mechanism, or production mutation path.

## Copy boundary

Copy the complete directory without changing its internal relative paths:

```text
features/report-certification/
```

The directory contains the client control surface, feature-scoped stylesheet,
serializable domain contracts, synthetic demonstration data, deterministic
policy evaluator, and fixtures. Install `lucide-react` in the host if it is not
already present, and install `server-only` for the enforced evaluator boundary.

Use the directory root as the browser-safe entrypoint. The Node.js evaluator,
policy fixtures, replay helper, repository types, and presentation projector are
exported separately from `@/features/report-certification/server`.

Do not copy the demonstration `app/` shell into Paul OS. The host should supply
its own sidebar, topbar, breadcrumbs, user context, route guards, and global
styles.

## Host route

Use the existing Paul OS route convention, for example:

```tsx
// app/analytics/certification/page.tsx
import { ReportCertificationControl } from "@/features/report-certification";

export default function Page() {
  return <ReportCertificationControl />;
}
```

The default data is synthetic and must retain its demonstration label. The
default embedded layout should remain inside the host content region; enable a
standalone layout only for a route that intentionally owns the viewport.

## Server-side production adapter

Vendor SDKs, credentials, controlled evidence, and authorization checks belong
in server-only modules. Normalize their output into the exported plain
TypeScript contracts, evaluate the deterministic policy, and pass only the
authorized presentation projection to the client feature.

A representative boundary is:

```tsx
// app/analytics/certification/page.tsx (Server Component)
import { ReportCertificationControl } from "@/features/report-certification";
import { createAuthorizedReportCertificationSnapshot } from "@/features/report-certification/server";
import { getAuthorizedCertificationView } from "@/server/certification";

export default async function Page() {
  const normalizedView = await getAuthorizedCertificationView();
  const data = createAuthorizedReportCertificationSnapshot(normalizedView);

  return <ReportCertificationControl data={data} showDemoBanner={false} />;
}
```

`createAuthorizedReportCertificationSnapshot` is a field allowlist, not an
authorization system. Call it only after host authentication, entitlement
checks, and value-level redaction. It rebuilds every nested record, removes
structural extra fields, and sets explicit `authorized` provenance so a
synthetic snapshot can never lose its demo banner through object cloning or RSC
serialization.

The adapter should:

1. authenticate the user and resolve product/evidence entitlements;
2. load normalized metadata and immutable evidence references;
3. evaluate the active deterministic policy on the server;
4. redact fields the user is not entitled to see;
5. attach an `asOf` timestamp, policy version, run version, and evidence
   freshness; and
6. serialize only the view needed by the client.

Do not pass SDK instances, database models, `Date`, `Map`, `Set`, secrets,
raw controlled samples, or ordinary callbacks across the Server/Client
Component boundary.

## Repository and backend boundary

Useful governed entities are:

- certification product;
- required gate/pipeline edge;
- metric contract;
- certification run;
- check result;
- evidence artifact;
- exception;
- SME approval;
- decision; and
- recertification event.

Store raw evidence separately from derived decisions. A decision must pin the
artifact hashes, policy and evaluator versions, code revision, pipeline
manifest, semantic-model version, exact metric-contract version, and approval
reference used to produce it.

The feature exports separate server-evidence and browser-view boundaries:

```ts
interface CertificationEvidenceRepository {
  listProducts(): Promise<CertificationProduct[]>;
  getEvaluationInput(
    productId: string,
  ): Promise<CertificationEvaluationInput | null>;
  getRun(runId: string): Promise<CertificationRun | null>;
  getCurrentPolicy(): Promise<CertificationPolicy>;
  listExceptions(productId?: string): Promise<CertificationException[]>;
}

interface CertificationViewRepository {
  getAuthorizedSnapshot(): Promise<AuthorizedReportCertificationSnapshot>;
}
```

Keep a synthetic in-memory implementation for local development. Production
adapters should implement the interface one evidence source at a time.

## Suggested internal API

```text
GET  /api/certification/products
GET  /api/certification/products/{product_id}
GET  /api/certification/runs/{run_id}
GET  /api/certification/policies/current
GET  /api/certification/exceptions?product_id=
POST /api/certification/products/{product_id}/runs
```

The browser receives an entitlement-filtered projection. It must not query
warehouses, catalogs, orchestrators, dashboards, approval stores, or evidence
storage with privileged credentials.

The POST endpoint is an operational capability. It should validate
authorization and CSRF protection, create an idempotent request, append an audit
record, and enqueue the long-running read-only work. Do not run warehouse checks
synchronously in the web request. Apply rate limits and prevent concurrent
duplicate runs for the same product/policy revision.

The bundled **dry run** is only a local visualization and is not this endpoint.

## Deterministic policy boundary

Use code, not an LLM, to resolve required gates, evaluate check statuses and
policy-owned tolerances, validate exceptions and approvals, derive gate tiers,
and enforce the final verdict.

Import the evaluator from the server entrypoint. It uses Node.js cryptography
to hash a canonical, replayable evidence envelope and accepts a separately
trusted evaluation context containing the policy anchor, `asOf` clock, and the
host registry's exact ordered product/topology binding. Use the exported
`certificationProductTopologyHash` when the trusted registry record is created;
do not construct the context from evidence-adapter output.

The replay helper verifies both the canonical envelope hash and every duplicated
bundle summary field against that envelope. Treat any mismatch as tampering;
never replay from an unchecked top-level summary.

The core rules are:

- missing or ambiguous evidence is `NOT_PROVEN`;
- the overall tier is the minimum tier achieved by every required gate;
- T3 requires a current SME approval for the exact active metric-contract
  version;
- an exception requires an allowed policy authority, owner, reason, bounded
  scope, and expiry;
- approval artifacts bind their validity, scope, remediation, and policy
  metadata so an adapter cannot extend relief by editing a record;
- an expired approval or exception is not valid relief; and
- T4 requires distinct evidence duties for monitoring history, monitor/test
  results, routing policy, and exercised incident response, not a boolean claim
  or one artifact reused across every duty.

See [the certification model](CERTIFICATION_MODEL.md) for the complete evidence,
tier, verdict, exception, recertification, and agent rules.

## Agent integration

Add an agent only after deterministic checks and policy enforcement work
independently. The agent may discover lineage, invoke approved read-only tools,
preserve artifacts, explain findings, draft remediation, and route work to an
owner.

It cannot mutate production, invent or approve business logic, waive a gate,
loosen a tolerance, report missing evidence as passing, approve an exception,
or grant itself access. Tool permissions should enforce the same boundary as
the prompt.

## Adapter categories

Potential evidence sources include:

- a catalog/lineage service;
- transformation manifests, catalogs, tests, and run results;
- warehouse metadata, read-only queries, and job history;
- orchestrator freshness, retry, late-data, and backfill history;
- semantic-model and report metadata;
- versioned metric contracts and SME approvals;
- remediation/exception ownership; and
- immutable evidence storage.

Specific vendor products are illustrative choices, not dependencies or
configured integrations in this repository.

## Integration sequence

1. Copy `features/report-certification/` into a temporary Paul OS branch.
2. Mount the feature inside the authenticated host shell.
3. Map optional feature variables to approved Paul OS design tokens without
   introducing document-level selectors.
4. Confirm the synthetic route, filters, keyboard behavior, detail view, tier
   model, and dry-run explanation work in embedded and mobile layouts.
5. Define the server-side repository and entitlement projection.
6. Preserve the mock adapter while adding one read-only evidence adapter at a
   time.
7. Persist immutable artifacts separately from decisions.
8. Run the deterministic evaluator and contract tests before adding an agent.
9. Add the queued run endpoint with authorization, idempotency, audit, and
   observability.
10. Replace demonstration data only after adapter, policy, and authorization
    tests pass.
11. Add recertification events and lifecycle expiry handling.
12. Run Paul OS typecheck, lint, unit/integration tests, production build,
    dependency audit, keyboard test, reduced-motion test, and mobile smoke test.

## Acceptance checklist

- The host route reuses Paul OS navigation and authentication.
- All data reaching the browser has already passed entitlement and redaction
  checks.
- Every product has stable IDs, owner/steward, grain, source, consumer, exact
  metric-contract binding, and a complete required-gate list.
- Opening a product shows every required handoff and its independent result.
- The overall tier always equals the weakest required gate.
- Missing evidence cannot render as passing.
- T3 cannot render without the exact current SME approval.
- A semantic measure/security change reopens the applicable certification.
- Exceptions require authority, owner, reason, scope, policy version, and expiry.
- Expired approvals/exceptions automatically block or downgrade under policy.
- Stored evidence can reproduce a historical decision.
- The agent cannot mutate production or approve its own business logic or
  exception.
- The host distinguishes the local visual dry run from an authorized queued run.
- Keyboard, screen-reader labels, reduced motion, and mobile widths are tested.

## Relationship to Digital Thread Control

The two features can share host identity, design tokens, and stable enterprise
object IDs, but neither should import the other's client component or fixture.
Digital-thread events may become recertification triggers through a server-side
adapter. A certification result may appear as governed context in the digital
thread. Keep that coupling in the host data layer so both feature directories
remain independently transferable.

For the Digital Thread Control handoff, use
[the separate Paul OS guide](PAUL_OS_INTEGRATION.md).
