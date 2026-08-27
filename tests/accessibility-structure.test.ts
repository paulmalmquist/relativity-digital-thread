import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL(
  "../features/digital-thread/digital-thread-control.tsx",
  import.meta.url,
);

test("interactive table rows preserve native table semantics", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.doesNotMatch(source, /<tr[^>]+role=["']button["']/s);
  assert.match(source, /className="event-cell event-row-button"/);
});

test("tabs expose roving focus and keyboard navigation", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /tabIndex=\{activeView === "live" \? 0 : -1\}/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /aria-pressed=\{effectiveDomain === domain\}/);
  assert.match(source, /hidden=\{activeView !== "systems"\}/);
});

test("component instance labels use React-generated identifiers", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.doesNotMatch(source, /id=["']live-mode["']/);
  assert.doesNotMatch(source, /id=["'](?:topology|trace|event-log)-title["']/);
  assert.match(source, /const liveToggleId = `\$\{tabsId\}-live-mode`/);
});
