import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProviderOrchestrator } from "../core/orchestrator";

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
