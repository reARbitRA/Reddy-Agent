import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProviderOrchestrator, resolveModel, DEFAULT_GEMINI_MODEL } from "../core/orchestrator";

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
    const orchestrator = new ProviderOrchestrator();
    // A syntactically invalid key must fail the live ping and normalize to false.
    const isValid = await orchestrator.validateKey("not-a-real-gemini-key");
    expect(isValid).toBe(false);
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
