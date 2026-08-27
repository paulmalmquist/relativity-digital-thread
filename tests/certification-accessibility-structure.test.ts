import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL(
  "../features/report-certification/certification-control.tsx",
  import.meta.url,
);
const stylesheetUrl = new URL(
  "../features/report-certification/certification-control.css",
  import.meta.url,
);

test("certification registry preserves table and button semantics", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.doesNotMatch(source, /<tr[^>]+(?:role=["']button|onClick=)/s);
  assert.match(source, /className="prc-product-button"/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /aria-label="Scrollable certification registry"/);
});

test("certification tabs and filters expose complete keyboard state", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.match(source, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.doesNotMatch(source, /event\.key === "Arrow(?:Up|Down)"/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /hidden=\{activeView !== "tiers"\}/);
  assert.match(source, /aria-pressed=\{statusFilter === filter\.id\}/);
  assert.match(source, /useId\(\)/);
});

test("certification UI consumes a redacted projection and labels dry runs", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.doesNotMatch(source, /CertificationEvaluationInput|contentHash|\.uri\b/);
  assert.match(source, /from "\.\/demo-view-data"/);
  assert.doesNotMatch(source, /from "\.\/demo-data"/);
  assert.match(source, /data\.provenance === "synthetic"/);
  assert.doesNotMatch(source, /providedData === demoReportCertificationSnapshot/);
  assert.match(source, /Synthetic \/ visual only/);
  assert.match(source, /does not\s+execute the evaluator or persist a decision/);
  assert.match(source, /className="prc-evidence-status"/);
  assert.match(source, /className="prc-dry-run-outcome"/);
});

test("certification stylesheet is scoped and container-responsive", async () => {
  const css = await readFile(stylesheetUrl, "utf8");

  assert.match(css, /^\.paul-os-report-certification\s*\{/);
  assert.doesNotMatch(css, /^:root\s*\{|^html\s*\{|^body\s*\{|^@import\s+/m);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /@container(?:\s+[\w-]+)?\s*\(/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
