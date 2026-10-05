import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startServer, copyFixtureToTemp, type ServerHandle } from "./helpers/server";

/**
 * End-to-end test of the MOCK_PURGE pipeline against a fixture copy:
 * audit → execute → verify the real file-rewrite rules.
 * The fixture is copied to a temp dir so the repository stays untouched.
 */

const FIXTURE_SRC = path.resolve(__dirname, "fixtures", "purge-project");

let server: ServerHandle;
let tmpRoot: string;
let samplePath: string;

beforeAll(async () => {
  tmpRoot = await copyFixtureToTemp(FIXTURE_SRC);
  // The purge scanner reads <cwd>/src recursively
  server = await startServer({ cwd: tmpRoot });
  samplePath = path.join(tmpRoot, "src", "sample.tsx");
});

afterAll(async () => {
  await server.stop();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("Purge — audit", () => {
  it("flags TODO comments and static mock arrays in the fixture source", async () => {
    const res = await fetch(`${server.baseUrl}/api/purge/audit`);
    expect(res.status).toBe(200);
    const { results } = await res.json();

    const todos = results.filter((r: any) => r.category === "TODO_COMMENT");
    const mocks = results.filter((r: any) => r.category === "MOCK_STATIC_DATA");

    expect(todos).toHaveLength(1);
    expect(todos[0].file).toBe(path.join("src", "sample.tsx"));
    expect(todos[0].line).toBe(1);
    expect(todos[0].text).toContain("TODO");

    expect(mocks.map((m: any) => m.line).sort()).toEqual([2, 3]);
  });
});

describe("Purge — execute", () => {
  it("rewrites flagged lines and reports what it did", async () => {
    const audit = await (await fetch(`${server.baseUrl}/api/purge/audit`)).json();
    const target = audit.results.find((r: any) => r.category === "TODO_COMMENT");

    const res = await fetch(`${server.baseUrl}/api/purge/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [target] }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("success");
    expect(data.purgedDetails).toHaveLength(1);

    const content = fs.readFileSync(samplePath, "utf8");
    expect(content).toContain("RESOLVED: Purged by REDDY MOCK_PURGE Protocol.");
    expect(content).not.toContain("TODO:");
  });

  it("prefixes static mock arrays with the deployment marker", async () => {
    const audit = await (await fetch(`${server.baseUrl}/api/purge/audit`)).json();
    const target = audit.results.find(
      (r: any) => r.category === "MOCK_STATIC_DATA" && r.line === 2
    );

    const res = await fetch(`${server.baseUrl}/api/purge/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [target] }),
    });
    expect(res.status).toBe(200);

    const content = fs.readFileSync(samplePath, "utf8");
    expect(content).toContain("DEPLOYED PROSTHETIC CHIP");
    // The original declaration stays intact after the marker prefix
    expect(content).toContain("const DEFAULT_ENTRIES");
  });

  it("skips items whose text no longer matches the file line", async () => {
    const res = await fetch(`${server.baseUrl}/api/purge/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ file: path.join("src", "sample.tsx"), line: 2, text: "stale text that is not there", category: "MOCK_STATIC_DATA" }],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.purgedDetails).toHaveLength(0);
  });

  it("re-audit shows the TODO as resolved", async () => {
    const { results } = await (
      await fetch(`${server.baseUrl}/api/purge/audit`)
    ).json();
    expect(results.filter((r: any) => r.category === "TODO_COMMENT")).toHaveLength(0);
  });
});

/**
 * T-001 regression: POST /api/purge/execute must refuse to write outside
 * <cwd>/src. These tests reproduce the original traversal PoC — a victim file
 * deliberately placed outside the server's working directory — and assert that
 * it is rejected with 400 and left byte-identical.
 */
describe("Purge — path containment (T-001)", () => {
  const VICTIM_LINE = "const DEFAULT_ENTRIES = [1, 2, 3];";
  let victimPath: string;

  beforeAll(() => {
    victimPath = path.join(
      os.tmpdir(),
      `reddy-purge-escape-${process.pid}-${Date.now()}.txt`
    );
    fs.writeFileSync(victimPath, `${VICTIM_LINE}\n`, "utf8");
  });

  afterAll(() => {
    fs.rmSync(victimPath, { force: true });
  });

  const post = (items: unknown) =>
    fetch(`${server.baseUrl}/api/purge/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

  it("rejects a ../ path that escapes the project src tree and leaves the file untouched", async () => {
    const before = fs.readFileSync(victimPath, "utf8");
    const rel = path.relative(tmpRoot, victimPath);
    expect(rel.startsWith("..")).toBe(true); // the test itself is a traversal

    const res = await post([
      { file: rel, line: 1, text: VICTIM_LINE, category: "MOCK_STATIC_DATA" },
    ]);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("PURGE_PATH_REJECTED");
    expect(fs.readFileSync(victimPath, "utf8")).toBe(before);
  });

  it("rejects an absolute path", async () => {
    const before = fs.readFileSync(victimPath, "utf8");
    const res = await post([
      { file: victimPath, line: 1, text: VICTIM_LINE, category: "MOCK_STATIC_DATA" },
    ]);
    expect(res.status).toBe(400);
    expect(fs.readFileSync(victimPath, "utf8")).toBe(before);
  });

  it("rejects a path that is inside the project but outside src/", async () => {
    const outside = path.join(tmpRoot, "root-note.txt");
    fs.writeFileSync(outside, `${VICTIM_LINE}\n`, "utf8");
    const res = await post([
      { file: "root-note.txt", line: 1, text: VICTIM_LINE, category: "MOCK_STATIC_DATA" },
    ]);
    expect(res.status).toBe(400);
    expect(fs.readFileSync(outside, "utf8")).toBe(`${VICTIM_LINE}\n`);
    fs.rmSync(outside, { force: true });
  });

  it("rejects a symlink inside src/ that points outside it", async () => {
    const link = path.join(tmpRoot, "src", "escape-link.tsx");
    fs.symlinkSync(victimPath, link);
    const before = fs.readFileSync(victimPath, "utf8");
    const res = await post([
      {
        file: path.join("src", "escape-link.tsx"),
        line: 1,
        text: VICTIM_LINE,
        category: "MOCK_STATIC_DATA",
      },
    ]);
    expect(res.status).toBe(400);
    expect(fs.readFileSync(victimPath, "utf8")).toBe(before);
    fs.rmSync(link, { force: true });
  });

  it("rejects a non-TypeScript extension inside src/", async () => {
    const target = path.join(tmpRoot, "src", "notes.md");
    fs.writeFileSync(target, `${VICTIM_LINE}\n`, "utf8");
    const res = await post([
      { file: path.join("src", "notes.md"), line: 1, text: VICTIM_LINE, category: "MOCK_STATIC_DATA" },
    ]);
    expect(res.status).toBe(400);
    expect(fs.readFileSync(target, "utf8")).toBe(`${VICTIM_LINE}\n`);
    fs.rmSync(target, { force: true });
  });
});
