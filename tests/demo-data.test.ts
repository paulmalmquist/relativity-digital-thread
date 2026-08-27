import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { demoDigitalThreadData } from "../features/digital-thread/demo-data";

test("demo snapshot is serializable and internally addressable", () => {
  const snapshot = JSON.parse(JSON.stringify(demoDigitalThreadData));
  const uniqueIds = (items: Array<{ id: string }>) =>
    new Set(items.map((item) => item.id)).size === items.length;

  assert.equal(snapshot.events.length, 4);
  assert.equal(snapshot.systems.length, 6);
  assert.ok(uniqueIds(snapshot.events));
  assert.ok(uniqueIds(snapshot.connectors));
  assert.ok(uniqueIds(snapshot.issues));
  assert.ok(
    snapshot.events.every(
      (event: { steps: Array<{ id: string }>; source: string }) =>
        event.source.length > 0 &&
        event.steps.length > 0 &&
        uniqueIds(event.steps),
    ),
  );
});

test("sample canonical event contains the minimum handoff fields", async () => {
  const fixtureUrl = new URL(
    "../features/digital-thread/fixtures/sample-event.json",
    import.meta.url,
  );
  const event = JSON.parse(await readFile(fixtureUrl, "utf8"));

  for (const field of [
    "event_id",
    "event_type",
    "schema_version",
    "source",
    "subject",
    "occurred_at",
    "observed_at",
    "actor",
    "approval",
    "correlation_id",
    "data_classification",
    "payload",
  ]) {
    assert.ok(field in event, `missing ${field}`);
  }

  assert.ok(Date.parse(event.occurred_at) <= Date.parse(event.observed_at));
});

test("feature stylesheet owns no document-level selectors", async () => {
  const stylesheetUrl = new URL(
    "../features/digital-thread/digital-thread-control.css",
    import.meta.url,
  );
  const css = await readFile(stylesheetUrl, "utf8");

  assert.match(css, /^\.relativity-digital-thread\s*\{/);
  assert.doesNotMatch(css, /^:root\s*\{/m);
  assert.doesNotMatch(css, /^html\s*\{/m);
  assert.doesNotMatch(css, /^body\s*\{/m);
  assert.doesNotMatch(css, /^@import\s+/m);
});
