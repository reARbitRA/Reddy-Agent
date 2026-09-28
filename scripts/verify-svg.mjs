#!/usr/bin/env node
/**
 * Strict SVG verification for assets/readme/*.svg
 *
 * Per file:
 *  1. Well-formed XML (fast-xml-parser validator)
 *  2. Root element is <svg> with xmlns, viewBox, width, height
 *  3. Camo safety: no <script>/<foreignObject>/<image>/<iframe>/<embed>/<object>,
 *     no href/xlink:href references, no @import / external url(), no on* handlers
 *  4. Visual identity: at least three palette colors used
 *  5. Accessibility: role="img" and aria-label present
 *  6. Hygiene: no NaN / undefined / TODO / FIXME / placeholder text
 *  7. Manifest: exactly the 15 required assets, nothing missing or extra
 *
 * Exit code 0 = all pass. Any failure exits 1 with a report.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLValidator, XMLParser } from "fast-xml-parser";

const ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "readme"
);

const REQUIRED = [
  "hero-reddy.svg",
  "agent-loop.svg",
  "tool-registry.svg",
  "memory-vault.svg",
  "skill-loader.svg",
  "knowledge-flow.svg",
  "workspace-operations.svg",
  "task-telemetry.svg",
  "provider-orchestrator.svg",
  "api-console.svg",
  "security-boundary.svg",
  "interface-map.svg",
  "verification-console.svg",
  "deployment-map.svg",
  "footer-reddy.svg",
];

const PALETTE = ["#06080B", "#A9E838", "#22D3EE", "#D60019", "#F4F1EB"];
const MIN_PALETTE_HITS = 3;
const MIN_BYTES = 1024;
const MAX_BYTES = 512 * 1024;

const FORBIDDEN_ELEMENTS = ["script", "foreignObject", "image", "iframe", "embed", "object"];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: false,
});

const failures = [];

function fail(file, rule, detail) {
  failures.push(`  FAIL [${file}] ${rule}: ${detail}`);
}

/** Collect every text value from the parsed document. */
function collectText(node, acc) {
  if (node === null || node === undefined) return acc;
  if (typeof node === "string" || typeof node === "number") {
    acc.add(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, acc);
    return acc;
  }
  if (typeof node === "object") {
    for (const value of Object.values(node)) collectText(value, acc);
  }
  return acc;
}

function verifyFile(file) {
  const full = path.join(ASSETS_DIR, file);
  let raw;
  try {
    raw = readFileSync(full, "utf8");
  } catch {
    fail(file, "UNREADABLE", "file missing");
    return;
  }

  const size = statSync(full).size;
  if (size < MIN_BYTES) fail(file, "TOO_SMALL", `${size} bytes (< ${MIN_BYTES})`);
  if (size > MAX_BYTES) fail(file, "TOO_LARGE", `${size} bytes (> ${MAX_BYTES})`);

  // 1. Well-formed XML
  const validated = XMLValidator.validate(raw, { allowBooleanAttributes: true });
  if (validated.err) {
    fail(file, "XML", `${validated.err.msg} (line ${validated.err.line}, col ${validated.err.col})`);
    return;
  }

  const doc = parser.parse(raw);
  const svgTag = doc["svg"];
  if (!svgTag || typeof svgTag !== "object") {
    fail(file, "ROOT", "root element is not <svg>");
    return;
  }

  // 2. Root attributes
  const get = (k) => svgTag[`@_${k}`] ?? svgTag[k];
  if (!get("viewBox")) fail(file, "VIEWBOX", "missing viewBox");
  if (!get("width")) fail(file, "DIMENSIONS", "missing width");
  if (!get("height")) fail(file, "DIMENSIONS", "missing height");
  if (!get("xmlns")) fail(file, "XMLNS", "missing xmlns declaration");

  // 3. Camo safety (raw markup scan)
  for (const el of FORBIDDEN_ELEMENTS) {
    if (new RegExp(`<${el}[\\s>/]`, "i").test(raw)) {
      fail(file, "FORBIDDEN_ELEMENT", `<${el}> present`);
    }
  }
  for (const m of raw.matchAll(/(?:xlink:href|href)\s*=\s*["'][^"']*["']/gi)) {
    fail(file, "EXTERNAL_REF", m[0].slice(0, 80));
  }
  if (raw.includes("@import")) fail(file, "CSS_IMPORT", "@import found");
  for (const m of raw.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    if (!m[1].startsWith("#")) {
      fail(file, "CSS_URL", `url(${m[1].slice(0, 60)}) is not a local reference`);
    }
  }
  for (const m of raw.matchAll(/\son[a-zA-Z]+\s*=\s*["']/g)) {
    fail(file, "EVENT_HANDLER", `${m[0].trim()} — inline scripts are not Camo-safe`);
  }

  // 4. Palette identity
  const upper = raw.toUpperCase();
  const hits = PALETTE.filter((c) => upper.includes(c.toUpperCase()));
  if (hits.length < MIN_PALETTE_HITS) {
    fail(file, "PALETTE", `only ${hits.length}/${MIN_PALETTE_HITS} palette colors present (${hits.join(", ")})`);
  }

  // 5. Accessibility
  if (!/role\s*=\s*"img"/.test(raw)) fail(file, "A11Y_ROLE", 'missing role="img"');
  if (!/aria-label\s*=/.test(raw)) fail(file, "A11Y_LABEL", "missing aria-label");

  // 6. Hygiene
  const texts = collectText(doc, new Set());
  for (const t of texts) {
    if (/\bNaN\b/.test(t)) fail(file, "HYGIENE", `NaN in text: "${t.slice(0, 60)}"`);
    // Stray interpolation leaks look like "undefined" standing alone or leading a
    // text node. Quoted product strings (e.g. "Tool 'x' undefined.") are content.
    if (/^undefined[\s.:,]|^undefined$|\[undefined\]|\(undefined\)|=> undefined/.test(t.trim())) {
      fail(file, "HYGIENE", `stray undefined in text: "${t.slice(0, 60)}"`);
    }
    if (/\bTODO\b|\bFIXME\b|PLACEHOLDER|LOREM/i.test(t)) {
      fail(file, "HYGIENE", `placeholder marker in text: "${t.slice(0, 60)}"`);
    }
  }
}

function main() {
  // Manifest check
  let present = [];
  try {
    present = readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".svg"));
  } catch {
    fail("(manifest)", "DIR", `cannot read ${ASSETS_DIR}`);
  }
  const missing = REQUIRED.filter((f) => !present.includes(f));
  const extra = present.filter((f) => !REQUIRED.includes(f));
  if (missing.length) fail("(manifest)", "MISSING_FILE", missing.join(", "));
  if (extra.length) fail("(manifest)", "UNEXPECTED_FILE", extra.join(", "));

  for (const file of REQUIRED) verifyFile(file);

  console.log("REDDY asset verification — assets/readme/*.svg");
  console.log(`  files checked: ${REQUIRED.length}`);
  console.log("");

  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) console.log(f);
    console.log("");
    console.log(`RESULT: ${failures.length} failure(s)`);
    process.exit(1);
  }

  console.log("  XML well-formed .............. OK");
  console.log("  root svg + viewBox + size .... OK");
  console.log("  Camo-safe (no script/href) .. OK");
  console.log("  palette identity (>=3) ...... OK");
  console.log("  role=img + aria-label ........ OK");
  console.log("  no placeholder text ......... OK");
  console.log("");
  console.log(`RESULT: ${REQUIRED.length}/${REQUIRED.length} SVG assets valid and Camo-safe`);
}

main();
