import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, type ServerHandle } from "./helpers/server";

let server: ServerHandle;

beforeAll(async () => {
  server = await startServer(); // no GEMINI_API_KEY in env
});

afterAll(async () => {
  await server.stop();
});

describe("API — skills", () => {
  it("GET /api/skills lists skills loaded at boot", async () => {
    const res = await fetch(`${server.baseUrl}/api/skills`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skills).toContain("System_Info");
  });

  it("POST /api/skills/inject registers a runtime text skill", async () => {
    const inject = await fetch(`${server.baseUrl}/api/skills/inject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Api_Test_Skill",
        description: "Injected by test",
        guidelines: "Answer tersely.",
      }),
    });
    expect(inject.status).toBe(200);
    expect(await inject.json()).toEqual({ status: "injected", name: "Api_Test_Skill" });

    const list = await (await fetch(`${server.baseUrl}/api/skills`)).json();
    expect(list.skills).toContain("System_Info");
    expect(list.skills).toContain("Api_Test_Skill");
  });
});

describe("API — gemini key validation and status", () => {
  it("POST /api/keys/validate rejects a missing key with 400", async () => {
    const res = await fetch(`${server.baseUrl}/api/keys/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing key" });
  });

  it("POST /api/keys/save rejects a missing key with 400", async () => {
    const res = await fetch(`${server.baseUrl}/api/keys/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing key" });
  });

  it("GET /api/keys/status reports the USER_INJECTED source when no env key exists", async () => {
    const res = await fetch(`${server.baseUrl}/api/keys/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(true);
    expect(data.source).toBe("USER_INJECTED");
  });
});

describe("API — settings (session instructions)", () => {
  it("GET /api/settings returns the AGENTS.md default instruction", async () => {
    const res = await fetch(`${server.baseUrl}/api/settings?session_id=settings-a`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.instruction).toContain("REDDY");
    expect(data.instruction).toContain("CODER");
  });

  it("POST /api/settings updates the instruction for that session only", async () => {
    const post = await fetch(`${server.baseUrl}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "settings-a",
        instruction: "TEST PROTOCOL 42",
      }),
    });
    expect(post.status).toBe(200);
    expect(await post.json()).toEqual({ status: "updated" });

    const updated = await (
      await fetch(`${server.baseUrl}/api/settings?session_id=settings-a`)
    ).json();
    expect(updated.instruction).toBe("TEST PROTOCOL 42");

    // A different session still sees the default instruction
    const other = await (
      await fetch(`${server.baseUrl}/api/settings?session_id=settings-b`)
    ).json();
    expect(other.instruction).toContain("REDDY");
    expect(other.instruction).not.toContain("TEST PROTOCOL 42");
  });
});

describe("API — knowledge operations", () => {
  it("creates, lists, and deletes knowledge entries", async () => {
    const create1 = await fetch(`${server.baseUrl}/api/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Deploy Runbook",
        content: "Run npm run build before npm start.",
        category: "OPS",
      }),
    });
    expect(create1.status).toBe(200);
    const { id: id1 } = await create1.json();
    expect(id1).toBeTruthy();

    const create2 = await fetch(`${server.baseUrl}/api/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Port Note",
        content: "Default port is 3000.",
        category: "OPS",
      }),
    });
    const { id: id2 } = await create2.json();

    const list = await (await fetch(`${server.baseUrl}/api/knowledge`)).json();
    const names = list.knowledge.map((k: any) => k.name);
    expect(names).toContain("Deploy Runbook");
    expect(names).toContain("Port Note");

    const entry = list.knowledge.find((k: any) => k.id === id1);
    expect(entry).toMatchObject({
      id: id1,
      name: "Deploy Runbook",
      content: "Run npm run build before npm start.",
      category: "OPS",
    });

    const del = await fetch(`${server.baseUrl}/api/knowledge/${id1}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ status: "deleted" });

    const after = await (await fetch(`${server.baseUrl}/api/knowledge`)).json();
    expect(after.knowledge.map((k: any) => k.id)).not.toContain(id1);
    expect(after.knowledge.map((k: any) => k.id)).toContain(id2);
  });
});

describe("API — task telemetry", () => {
  it("GET /api/tasks/history returns seeded records with the full shape", async () => {
    const res = await fetch(`${server.baseUrl}/api/tasks/history`);
    expect(res.status).toBe(200);
    const { history } = await res.json();

    expect(history.length).toBeGreaterThanOrEqual(15);
    for (const item of history) {
      expect(typeof item.timestamp).toBe("number");
      expect(typeof item.message).toBe("string");
      expect(typeof item.success).toBe("boolean");
      expect(typeof item.latency).toBe("number");
    }
  });

  it("records a failed task with latency when the provider has no key", async () => {
    const before = await (
      await fetch(`${server.baseUrl}/api/tasks/history`)
    ).json();

    const res = await fetch(`${server.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "telemetry probe", session_id: "api-test-chat" }),
    });
    // No Gemini key configured → provider error normalized to a 500 response
    expect(res.status).toBe(500);
    const err = await res.json();
    expect(err.error).toContain("SECURE_GATEWAY_FAILURE");

    const after = await (
      await fetch(`${server.baseUrl}/api/tasks/history`)
    ).json();
    expect(after.history.length).toBe(before.history.length + 1);

    const last = after.history[after.history.length - 1];
    expect(last.message).toBe("telemetry probe");
    expect(last.success).toBe(false);
    expect(typeof last.latency).toBe("number");
  });
});

describe("API — purge validation", () => {
  it("POST /api/purge/execute rejects a missing items array with 400", async () => {
    const res = await fetch(`${server.baseUrl}/api/purge/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing items to purge" });
  });

  it("GET /api/purge/audit returns an array of findings with ids", async () => {
    const res = await fetch(`${server.baseUrl}/api/purge/audit`);
    expect(res.status).toBe(200);
    const { results } = await res.json();
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r.id).toMatch(/^audit-\d+$/);
      expect(typeof r.file).toBe("string");
      expect(typeof r.line).toBe("number");
      expect(["TODO_COMMENT", "MOCK_STATIC_DATA"]).toContain(r.category);
    }
  });
});

describe("API — shell", () => {
  it("serves the dashboard shell at /", async () => {
    const res = await fetch(`${server.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});

describe("API — key status with an env-provided key", () => {
  let envServer: ServerHandle;

  beforeAll(async () => {
    envServer = await startServer({ env: { GEMINI_API_KEY: "env-supplied-test-key" } });
  });

  afterAll(async () => {
    await envServer.stop();
  });

  it("reports SYSTEM_ENV as the active key source", async () => {
    const res = await fetch(`${envServer.baseUrl}/api/keys/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(true);
    expect(data.source).toBe("SYSTEM_ENV");
  });
});
