# Paul OS Governance Feature Pack

A portable pair of Next.js features for observing a governed digital thread and
evaluating report/data-product certification. The included application is a
runnable synthetic demonstration. It has no production connectors, credentials,
authentication, database, or environment-variable requirement.

> Repository verification and production certification are different things.
> `npm run check` verifies this software package. It does not certify a real
> report, pipeline, source system, or business calculation.

## Included features

| Feature | Demo route | Portable source | Purpose |
| --- | --- | --- | --- |
| Digital Thread Control | `/digital-thread` | [`features/digital-thread`](features/digital-thread) | Visualize governed events, propagation, connector health, reconciliation exceptions, and authority boundaries. |
| Report Certification | `/certification` | [`features/report-certification`](features/report-certification) | Evaluate evidence at every required source-to-consumer handoff with a deterministic minimum-gate policy. |

The root route, `/`, is a small feature index. The two features are independent;
Paul OS can adopt either one or both.

## Run the demonstrations

Requirements: Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/paulmalmquist/relativity-digital-thread.git
cd relativity-digital-thread
npm ci
npm run dev
```

Open:

- `http://localhost:3000/` for the feature index;
- `http://localhost:3000/digital-thread` for Digital Thread Control; and
- `http://localhost:3000/certification` for Report Certification.

Every displayed record, identity, timestamp, metric, outcome, approval, and
evidence reference is synthetic. Demo controls animate or filter local state;
they do not retry operational messages, query source systems, approve business
logic, waive policy gates, or launch production certification runs.

## Repository map

```text
app/
  page.tsx                         feature index
  digital-thread/page.tsx          digital-thread demo route
  certification/page.tsx           certification demo route
features/
  digital-thread/                   portable observability feature
  report-certification/             client entry, server entry, policy, and UI
docs/
  PAUL_OS_INTEGRATION.md            digital-thread handoff
  REPORT_CERTIFICATION_INTEGRATION.md
  CERTIFICATION_MODEL.md            policy, evidence, and agent boundary
  PRODUCTION_INTEGRATION.md         digital-thread production guidance
tests/                              domain and portability checks
type-tests/                         public-prop boundary checks
```

Both features use serializable TypeScript contracts and feature-scoped CSS.
Their only feature-specific runtime packages are `lucide-react` and the
zero-runtime `server-only` boundary marker; there is no Tailwind, shadcn, Radix,
hosted-platform scaffold, or vendor SDK to transfer.

## Transfer to Paul OS

Install the shared icon dependency and server-boundary marker in the host
application:

```bash
npm install lucide-react server-only
```

### Digital Thread Control

Copy `features/digital-thread/` into Paul OS without changing its internal
paths, then mount the exported control in the host shell:

```tsx
import { DigitalThreadControl } from "@/features/digital-thread";

export default function DigitalThreadPage() {
  return <DigitalThreadControl />;
}
```

The default `embedded` layout stays inside its host container. Use
`layout="standalone"` only when the control owns the full page. The default data
is synthetic and cannot be presented as an authorized view. For production,
pass an entitlement-filtered `DigitalThreadSnapshot` from a server-side adapter
and keep the demo banner enabled until every visible value is approved.

Read [the digital-thread Paul OS guide](docs/PAUL_OS_INTEGRATION.md) for the
exact data boundary, internal API shape, and acceptance checklist.

### Report Certification

Copy `features/report-certification/` into Paul OS without changing its internal
paths, then mount its exported control at the host's certification route. Do not
copy the demonstration application shell into Paul OS; retain the host's
navigation, authentication, design tokens, and authorization model.

The directory root is the browser-safe entrypoint. Import the evaluator,
evidence contracts, replay helper, and allowlist projector only from
`@/features/report-certification/server` in server-side code.

Certification is deliberately fail-closed:

- missing evidence is `NOT_PROVEN`, never a pass;
- each required handoff and the consumer gate is evaluated independently;
- the overall tier cannot exceed the weakest required gate;
- Tier 3 requires a current SME approval bound to the exact metric-contract
  version; and
- an agent may collect and explain evidence, but it cannot change production,
  select a looser tolerance, waive a failed gate, approve business logic, or
  approve its own exception.

Read [the certification integration guide](docs/REPORT_CERTIFICATION_INTEGRATION.md)
before connecting any metadata or evidence source. The complete deterministic
policy and authority boundary are in
[the certification model](docs/CERTIFICATION_MODEL.md).

## Server/client data boundary

Keep vendor SDKs, credentials, raw queries, controlled values, and authorization
logic on the server. Pass only plain, entitlement-filtered objects into the
client features. Do not pass SDK instances, `Date`, `Map`, `Set`, or ordinary
callbacks from a Server Component to a Client Component.

For Digital Thread Control, adapt operational data to `DigitalThreadSnapshot`.
For Report Certification, collect immutable evidence into the exported
certification contracts and apply the deterministic policy before rendering a
verdict. After authorization and redaction, pass the normalized view through
`createAuthorizedReportCertificationSnapshot`; it reconstructs an allowlisted
object, strips structural extra fields, and adds explicit `authorized`
provenance before RSC serialization. Store raw evidence separately from the
decision so an authorized reviewer can reproduce it later.

Illustrative production adapter categories include:

- catalog and lineage metadata;
- transformation manifests, tests, and run artifacts;
- warehouse metadata and read-only reconciliation queries;
- orchestrator history, freshness, retry, and backfill evidence;
- semantic-layer and dashboard metadata;
- governed metric contracts and version-specific SME approvals; and
- exception/remediation ownership and immutable evidence storage.

These are integration categories, not configured connections or endorsements.
The browser must never connect directly to privileged systems.

## Certification model in brief

The required evidence chain is:

```text
source -> staging -> intermediate -> mart -> consumer
```

The model separates the achieved tier from the lifecycle verdict:

| Tier | Meaning |
| --- | --- |
| T1 Registered | Purpose, owner, grain, source, and lineage are known. |
| T2 Verified | Every required handoff passes structural, movement, transformation-fidelity, and operational controls. |
| T3 Certified | T2 plus exact metric-contract binding, current SME approval, consumer-semantic checks, governance controls, and no unapproved exception. |
| T4 Continuous | T3 plus active monitoring, change-triggered recertification, alert routing, and proven incident ownership. |

`PASS`, `CONDITIONAL`, `BLOCKED`, `EXPIRED`, and `NOT_PROVEN` describe a
decision's lifecycle or evidence outcome; they are not extra tiers. Scores may
summarize evidence for people, but they never override the weakest required
gate.

## Verify the repository

Run the same local checks used by continuous integration:

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

`npm run check` performs generated-route type checks, TypeScript validation,
linting (including JSX accessibility rules), unit tests, and a production build.
The GitHub workflow repeats these checks for pushes and pull requests.

A green workflow means the repository built and passed its automated software
checks at that commit. It is not evidence that any external data product meets
the certification policy. Production certification additionally requires
authorized, current, reproducible evidence and the applicable approvals.

## Public-repository and security status

- All included demonstration data and outcomes are synthetic.
- No environment variables or credentials are required by the demonstrations.
- Source-system payloads, private endpoints, workspace IDs, query text, real
  SME identities, and organization-specific policy artifacts are excluded.
- An operational certification-run endpoint must enforce server-side
  authorization, CSRF protection, idempotency, rate limits, queueing, and audit
  logging. None is implied by the local dry-run interaction.
- The broader research and host-specific export scaffolds are intentionally not
  part of this repository.
- Public visibility is not an open-source license; see [`LICENSE`](LICENSE).

Security reports should follow [`SECURITY.md`](SECURITY.md).
