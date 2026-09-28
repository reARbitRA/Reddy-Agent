#!/usr/bin/env node
/**
 * README verification:
 *  1. Every relative image reference (markdown + inline HTML) resolves to a file
 *  2. Every relative link target resolves to a file
 *  3. Every in-page anchor (#slug) matches a heading slug (GitHub slugging rules)
 *  4. No duplicate heading anchors
 *  5. No external script/iframe/html injection (README must be Markdown-native)
 *
 * Exit code 0 = all pass. Any failure exits 1 with a report.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const README = path.join(ROOT, "README.md");

const failures = [];

function fail(rule, detail) {
  failures.push(`  FAIL ${rule}: ${detail}`);
}

/** GitHub-style heading slug. */
function githubSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<>[\]/]/g, "") // strip link syntax leftovers conservatively
    .replace(/[^\w\- ]/g, "") // drop punctuation (word chars, hyphens, spaces stay)
    .replace(/ /g, "-");
}

function stripMarkdown(text) {
  return text
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1") // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/[*_~]/g, "");
}

function main() {
  if (!existsSync(README)) {
    console.log("RESULT: FAIL — README.md not found");
    process.exit(1);
  }
  const raw = readFileSync(README, "utf8");
  const lines = raw.split("\n");

  // ---- collect headings ----
  const headings = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: line });
  }
  const slugs = headings.map((h) => githubSlug(stripMarkdown(h.text)));

  // duplicate anchors
  const seen = new Map();
  const dupes = [];
  for (const s of slugs) {
    if (seen.has(s)) dupes.push(s);
    seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  if (dupes.length) fail("DUPLICATE_ANCHOR", [...new Set(dupes)].join(", "));

  const slugSet = new Set(slugs);

  // ---- collect links + images ----
  let imageCount = 0;
  let anchorCount = 0;
  let fileLinkCount = 0;

  for (const [idx] of lines.entries()) {
    const line = lines[idx];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // images: ![alt](path)
    for (const m of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      imageCount++;
      const target = m[2];
      if (/^(https?:|data:|mailto:)/i.test(target)) continue; // external allowed for images? we require relative for our assets
      const resolved = path.join(ROOT, decodeURIComponent(target.split("#")[0]));
      if (!existsSync(resolved)) {
        fail("IMAGE_PATH", `line ${idx + 1}: ${target} does not exist`);
      } else if (target.startsWith("assets/readme/")) {
        // required asset directory — good
      }
    }

    // links: [text](target)
    for (const m of line.matchAll(/(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[2];
      if (target.startsWith("#")) {
        anchorCount++;
        const slug = githubSlug(stripMarkdown(target.slice(1)));
        if (!slugSet.has(slug)) {
          fail("ANCHOR", `line ${idx + 1}: #${target.slice(1)} — no heading produces slug "${slug}"`);
        }
        continue;
      }
      if (/^(https?:|mailto:)/i.test(target)) continue;
      fileLinkCount++;
      const resolved = path.join(ROOT, decodeURIComponent(target.split("#")[0]));
      if (!existsSync(resolved)) {
        fail("FILE_LINK", `line ${idx + 1}: ${target} does not exist`);
      }
    }

    // inline HTML images (in case any sneaked in)
    for (const m of line.matchAll(/<img\s[^>]*src\s*=\s*["']([^"']+)["']/gi)) {
      imageCount++;
      const target = m[1];
      if (/^(https?:|data:)/i.test(target)) continue;
      const resolved = path.join(ROOT, decodeURIComponent(target.split("#")[0]));
      if (!existsSync(resolved)) fail("IMAGE_PATH", `line ${idx + 1}: <img src> ${target} does not exist`);
    }

    // README must not embed scripts or iframes
    if (/<script|<iframe|<object|<embed/i.test(line)) {
      fail("INJECTION", `line ${idx + 1}: raw script/iframe/object/embed tag in README`);
    }
  }

  console.log("REDDY README verification — README.md");
  console.log(`  headings scanned: ${headings.length}`);
  console.log(`  image references: ${imageCount}`);
  console.log(`  in-page anchors:  ${anchorCount}`);
  console.log(`  file links:       ${fileLinkCount}`);
  console.log("");

  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) console.log(f);
    console.log("");
    console.log(`RESULT: ${failures.length} failure(s)`);
    process.exit(1);
  }

  console.log("  image paths resolve .......... OK");
  console.log("  anchors match headings ....... OK");
  console.log("  no duplicate anchors ........ OK");
  console.log("  file links resolve ........... OK");
  console.log("  no embedded scripts .......... OK");
  console.log("");
  console.log("RESULT: README paths and anchors verified");
}

main();
