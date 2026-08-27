# Production integration

## Purpose

The feature is an observability surface over an event, identity, lineage, and
reconciliation platform. It is not an integration engine and must not become an
unreviewed path for changing operational source systems.

The repository intentionally models system categories rather than documenting
any real deployment. Replace each fixture only after confirming the source
owner, authorization boundary, calculation, freshness target, and data
classification for the host environment.

## Canonical event envelope

Use [`features/digital-thread/fixtures/sample-event.json`](../features/digital-thread/fixtures/sample-event.json)
as a synthetic starting point. A production contract should preserve:

- immutable event ID, semantic event type, and schema version;
- source system, record ID, revision, and authority;
- enterprise object ID plus the source-system cross-reference;
- `occurred_at` separately from `observed_at`;
- actor, approval evidence, correlation ID, and causation ID;
- data classification and config hash; and
- payload or a governed reference to the payload.

Consumers should be idempotent on `event_id`. Missing or ambiguous identities
must enter an exception workflow rather than being guessed.

## Read model

The dashboard can be backed by any authorized store. Useful logical grains are:

| Record | Grain |
| --- | --- |
| Event | One immutable canonical business event |
| Delivery | One event/consumer delivery attempt |
| Command | One governed command issued to an authoritative system |
| Acknowledgement | One source-system acknowledgement |
| Reconciliation | One expected-versus-observed state comparison |
| Identity cross-reference | One enterprise object/source identity mapping |
| Health snapshot | One connector health measurement |
| Exception | One owned mismatch, containment, or dead-letter item |

Delivery success is not acknowledgement, and acknowledgement is not proof of
final state. Reconciliation should independently verify convergence.

## Internal API facade

Keep vendor SDKs and credentials on the server. A reasonable read-only facade is:

```text
GET /api/digital-thread/summary
GET /api/digital-thread/systems
GET /api/digital-thread/events?domain=&status=&cursor=
GET /api/digital-thread/events/{event_id}
GET /api/digital-thread/exceptions
```

Translate those responses into the exported `DigitalThreadSnapshot`. The
browser should never subscribe directly to operational topics or query source
systems with privileged credentials.

Use stable identifiers for every event, propagation step, connector, and issue;
display labels are not safe reconciliation keys and may repeat or change.

## Authorization and classification

- Apply user entitlements before serializing the snapshot.
- Propagate row, column, system, and document restrictions.
- Redact controlled values before they reach the browser.
- Record access to sensitive event details in the host platform.
- Keep controlled source content in its authoritative system; the feature may
  show a governed reference but should not silently create a replacement copy.
- Treat replay in this repository as visual-only. An operational retry requires
  a separately authorized workflow, audit record, and idempotency policy.

## Acceptance criteria

- Every visible metric has a declared calculation and `asOf` timestamp.
- Every event can be traced through each intended consumer.
- Commands, deliveries, acknowledgements, and reconciliations are distinct.
- Missing identities are quarantined rather than inferred.
- Approval evidence is preserved for controlled changes.
- Exceptions have severity, containment, owner, service target, and history.
- The view remains usable with keyboard navigation, reduced motion, and mobile widths.
