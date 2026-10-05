import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  startServer,
  rawFetch,
  TEST_API_TOKEN,
  type ServerHandle,
} from "./helpers/server";

/**
 * T-003: the /api surface must be authenticated whenever REDDY_API_TOKEN is
 * configured, and must fall back to an explicitly-warned anonymous mode when
 * it is not.
 */
let server: ServerHandle;
let anon: ServerHandle;

beforeAll(async () => {
  server = await startServer();
  anon = await startServer({ env: { REDDY_API_TOKEN: "" } });
});

afterAll(async () => {
  await server.stop();
  await anon.stop();
});

const GUARDED: [string, RequestInit?][] = [
  ["GET /api/skills", undefined],
  ["GET /api/knowledge", undefined],
  ["GET /api/tasks/history", undefined],
  ["GET /api/keys/status", undefined],
  ["GET /api/purge/audit", undefined],
  [
    "POST /api/purge/execute",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [] }) },
  ],
  [
    "POST /api/knowledge",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "x", content: "y", category: "z" }) },
  ],
];

describe("API authentication — token configured (T-003)", () => {
  it.each(GUARDED)("%s rejects an unauthenticated request with 401", async (label, init) => {
    const [, method, route] = label.match(/^(\w+) (\S+)$/) as RegExpMatchArray;
    const res = await rawFetch(`${server.baseUrl}${route}`, init);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(method).toBeTruthy();
  });

  it("rejects a wrong token with 401", async () => {
    const res = await rawFetch(`${server.baseUrl}/api/skills`, {
      headers: { authorization: "Bearer not-the-token" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts the correct bearer token", async () => {
    const res = await rawFetch(`${server.baseUrl}/api/skills`, {
      headers: { authorization: `Bearer ${TEST_API_TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).skills).toContain("System_Info");
  });

  it("accepts the x-reddy-token header form", async () => {
    const res = await rawFetch(`${server.baseUrl}/api/skills`, {
      headers: { "x-reddy-token": TEST_API_TOKEN },
    });
    expect(res.status).toBe(200);
  });

  it("does not put the dashboard shell behind the API token", async () => {
    const res = await rawFetch(`${server.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});

describe("API authentication — anonymous fallback", () => {
  it("serves the API when no token is configured (local development mode)", async () => {
    const res = await rawFetch(`${anon.baseUrl}/api/skills`);
    expect(res.status).toBe(200);
  });

  it("reports the auth mode on the health endpoint", async () => {
    const guarded = await (await rawFetch(`${server.baseUrl}/api/health`, {
      headers: { authorization: `Bearer ${TEST_API_TOKEN}` },
    })).json();
    expect(guarded.auth_mode).toBe("token");

    const open = await (await rawFetch(`${anon.baseUrl}/api/health`)).json();
    expect(open.auth_mode).toBe("anonymous");
    expect(open.status).toBe("ok");
  });
});
