import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProviderOrchestrator, resolveModel, DEFAULT_GEMINI_MODEL, toGeminiContents, PROVIDER_TIMEOUT_MS } from "../core/orchestrator";

describe("ProviderOrchestrator — provider error normalization", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("rejects with the normalized SECURE_GATEWAY_FAILURE error when no key exists", async () => {
    const orchestrator = new ProviderOrchestrator();
    await expect(orchestrator.request([])).rejects.toThrow(
      "SECURE_GATEWAY_FAILURE: NO_KEY_DETECTED"
    );
  });

  it("normalizes the missing-key failure for generate() as well", async () => {
    const orchestrator = new ProviderOrchestrator();
    await expect(
      orchestrator.generate([{ role: "user", content: "ping" }])
    ).rejects.toThrow("NO_KEY_DETECTED");
  });

  it("reports an invalid key as not valid instead of throwing", async () => {
    // T-017: this test used to issue a real HTTPS request to
    // generativelanguage.googleapis.com, which made the suite depend on network
    // egress — in a sandbox without egress it passed for the wrong reason (a
    // transport failure, not a provider rejection). The ping is now stubbed.
    const original = globalThis.fetch;
    let calledWith: string | null = null;
    (globalThis as any).fetch = async (input: any) => {
      calledWith = typeof input === "string" ? input : String(input?.url ?? input);
      const body = JSON.stringify({
        error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" },
      });
      return new Response(body, { status: 400, headers: { "content-type": "application/json" } });
    };
    try {
      const orchestrator = new ProviderOrchestrator();
      const result = await orchestrator.validateKey("not-a-real-gemini-key");
      expect(result.valid).toBe(false);
      // A provider 400 is an authentication failure, not a transport failure.
      expect(result.reason).toBe("auth");
    } finally {
      (globalThis as any).fetch = original;
    }
    // The stubbed endpoint really was reached — the assertion is about a
    // provider rejection, not about the network being unavailable.
    expect(calledWith).toContain("generativelanguage.googleapis.com");
  }, 30_000);

  it("resets its internal client when a new key is deployed", () => {
    const orchestrator = new ProviderOrchestrator();
    // setKey must be safe to call repeatedly (KeyDeck deploy flow)
    expect(() => {
      orchestrator.setKey("first-key");
      orchestrator.setKey("second-key");
    }).not.toThrow();
  });
});

describe("ProviderOrchestrator — key precedence contract", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("still normalizes to SECURE_GATEWAY_FAILURE when the env var is an empty string", async () => {
    process.env.GEMINI_API_KEY = "";
    const orchestrator = new ProviderOrchestrator();
    await expect(orchestrator.request([])).rejects.toThrow("NO_KEY_DETECTED");
  });
});

/**
 * T-002 regression: the provider model must be resolvable and must never be a
 * model Google has already shut down. gemini-1.5-flash was retired on
 * 2025-09-29 (Gemini API changelog), so the previous hard pin made every
 * request 404 and broke both the chat journey and the key-validation gate.
 */
describe("ProviderOrchestrator — model resolution (T-002)", () => {
  const original = process.env.GEMINI_MODEL;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = original;
  });

  it("defaults to a currently supported Flash model", () => {
    delete process.env.GEMINI_MODEL;
    const model = resolveModel();
    expect(model).toBe(DEFAULT_GEMINI_MODEL);
    expect(model).toBe("gemini-3.8-flash");
  });

  it("honours GEMINI_MODEL when it names a supported model", () => {
    process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    expect(resolveModel()).toBe("gemini-3.5-flash-lite");
  });

  it.each([
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash",
  ])("rejects the retired model %s with MODEL_RETIRED", (retired) => {
    process.env.GEMINI_MODEL = retired;
    expect(() => resolveModel()).toThrow(/MODEL_RETIRED/);
  });

  it("never passes a retired model identifier as a string literal to the provider", async () => {
    // Prose that documents a retirement is fine; a quoted retired identifier
    // reaching a model: field is not. Assert the precise invariant.
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const rel of ["core/orchestrator.ts", "server.ts"]) {
      const src = fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");
      expect(src).not.toMatch(/["'`]gemini-1\.5-[a-z0-9.-]*["'`]/);
      expect(src).not.toMatch(/["'`]gemini-1\.0-[a-z0-9.-]*["'`]/);
      expect(src).not.toMatch(/["'`]gemini-2\.0-flash[a-z0-9.-]*["'`]/);
    }
  });

  it("resolves every provider call through resolveModel()", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "core", "orchestrator.ts"),
      "utf8"
    );
    // Both provider call sites (validateKey and generate) must go through the
    // resolver, and no model: field may be a hardcoded string.
    expect(src.match(/resolveModel\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/model:\s*["'`]/);
  });
});

/**
 * T-020: every provider call must be bounded.
 */
describe("ProviderOrchestrator — provider timeout (T-020)", () => {
  it("configures a finite timeout on the client", () => {
    expect(Number.isFinite(PROVIDER_TIMEOUT_MS)).toBe(true);
    expect(PROVIDER_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PROVIDER_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});

/**
 * T-006: the Gemini function-calling contract. An assistant turn that carried
 * tool_calls must be replayed as a model turn with functionCall parts, and the
 * matching tool turn as a functionResponse part.
 */
describe("toGeminiContents — function-calling contract (T-006)", () => {
  it("maps an assistant tool-call turn to a model turn with functionCall parts", () => {
    const contents = toGeminiContents([
      { role: "user", content: "check os" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ name: "get_system_metrics", args: { metric: "os" } }],
      },
    ]);
    expect(contents[1].role).toBe("model");
    expect(contents[1].parts).toEqual([
      { functionCall: { name: "get_system_metrics", args: { metric: "os" } } },
    ]);
  });

  it("keeps assistant text alongside its functionCall parts", () => {
    const contents = toGeminiContents([
      {
        role: "assistant",
        content: "let me check",
        tool_calls: [{ name: "t", args: {} }],
      },
    ]);
    expect(contents[0].parts).toEqual([
      { text: "let me check" },
      { functionCall: { name: "t", args: {} } },
    ]);
  });

  it("maps a tool turn to a structured functionResponse, not flattened text", () => {
    const contents = toGeminiContents([
      { role: "tool", tool_call_id: "c1", name: "get_system_metrics", content: '{"platform":"linux"}' },
    ]);
    expect(contents[0].parts[0].functionResponse).toBeDefined();
    expect(contents[0].parts[0].functionResponse.name).toBe("get_system_metrics");
    expect(contents[0].parts[0].functionResponse.response.result).toEqual({ platform: "linux" });
  });

  it("orders the model functionCall turn before the functionResponse turn", () => {
    const contents = toGeminiContents([
      { role: "user", content: "go" },
      { role: "assistant", content: null, tool_calls: [{ name: "t", args: {} }] },
      { role: "tool", tool_call_id: "c1", name: "t", content: "42" },
    ]);
    const callIdx = contents.findIndex((c) => c.parts.some((p: any) => p.functionCall));
    const respIdx = contents.findIndex((c) => c.parts.some((p: any) => p.functionResponse));
    expect(callIdx).toBe(1);
    expect(respIdx).toBe(2);
    expect(callIdx).toBeLessThan(respIdx);
  });

  it("still prefixes system instructions", () => {
    const contents = toGeminiContents([{ role: "system", content: "be terse" }]);
    expect(contents[0].parts[0].text).toBe("SYSTEM_INSTRUCTION: be terse");
  });
});
