import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createAuthorizedReportCertificationSnapshot } from "../features/report-certification/certification-view-projection";
import { demoReportCertificationSnapshot } from "../features/report-certification/demo-view-data";

test("the authorized projector strips structural extra fields at every view level", () => {
  const unsafe = structuredClone(demoReportCertificationSnapshot) as typeof demoReportCertificationSnapshot &
    Record<string, unknown>;
  unsafe.rawServerField = "must-not-cross";
  Object.assign(unsafe.products[0], {
    artifactUri: "must-not-cross",
    contentHash: "must-not-cross",
  });
  Object.assign(unsafe.products[0].gates[0], {
    authorityActorId: "must-not-cross",
  });
  Object.assign(unsafe.products[0].gates[0].evidence[0], {
    rawQueryText: "must-not-cross",
  });
  Object.assign(unsafe.agent.runbook[0], {
    privilegedTool: "must-not-cross",
  });

  const projected = createAuthorizedReportCertificationSnapshot(unsafe);
  const serialized = JSON.stringify(projected);

  assert.equal(projected.provenance, "authorized");
  assert.notEqual(projected, unsafe);
  assert.notEqual(projected.products[0], unsafe.products[0]);
  assert.doesNotMatch(serialized, /must-not-cross/);
  assert.doesNotMatch(
    serialized,
    /(?:artifactUri|contentHash|authorityActorId|rawQueryText|privilegedTool)/,
  );
});

test("the default entrypoint does not expose server runtime modules", async () => {
  const source = await readFile(
    new URL("../features/report-certification/index.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /certification-policy|demo-data|repository/);
  assert.match(source, /certification-control/);
  assert.match(source, /demo-view-data/);

  const serverSource = await readFile(
    new URL("../features/report-certification/server.ts", import.meta.url),
    "utf8",
  );
  assert.match(serverSource, /^import "server-only";/);
});
