import { GoogleGenAI } from "@google/genai";
import { AgentMessage } from '../src/types';

/**
 * The provider model is resolved here and nowhere else.
 *
 * gemini-3.8-flash is the current stable Flash model on the Gemini API
 * (GA 2026-09-02). Override with GEMINI_MODEL.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/**
 * Models Google has already shut down. A request to any of these returns 404,
 * so we fail loudly at resolution time instead of surfacing a provider 404 as
 * an opaque chat error. gemini-1.5-flash was retired on 2025-09-29 per the
 * Gemini API changelog; gemini-2.0 Flash and Flash-Lite were shut down on
 * 2026-06-01.
 */
const RETIRED_MODEL_PATTERNS: RegExp[] = [
  /^gemini-1\.0-/,
  /^gemini-1\.5-/,
  /^gemini-2\.0-flash/,
];

/** Every provider call is bounded so a hung upstream cannot hold a request open. */
export const PROVIDER_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30_000;

export type KeyValidation = {
  valid: boolean;
  reason: "ok" | "auth" | "transport" | "model" | "unknown";
};

function classifyKeyFailure(e: any): KeyValidation["reason"] {
  const status = typeof e?.status === "number" ? e.status : undefined;
  if (status === 400 || status === 401 || status === 403) return "auth";
  if (status === 404) return "model";
  const text = String(e?.message || e?.cause?.code || "");
  if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|timeout|aborted/i.test(text)) {
    return "transport";
  }
  return "unknown";
}

/**
 * Translate the internal AgentMessage[] into Gemini contents.
 *
 * Exported so the mapping is unit-testable without a network. The important
 * invariant is the function-calling contract: an assistant turn that carried
 * tool_calls is replayed as a model turn with functionCall parts, and the
 * matching tool turn is replayed as a functionResponse part — not flattened
 * into unstructured text.
 */
export function toGeminiContents(messages: AgentMessage[]): any[] {
  return messages.map((m) => {
    if (m.role === "system") {
      return { role: "user", parts: [{ text: `SYSTEM_INSTRUCTION: ${m.content}` }] };
    }
    if (m.role === "tool") {
      if (m.name) {
        let payload: any = m.content;
        try { payload = { result: JSON.parse(m.content ?? "null") }; } catch { payload = { result: m.content }; }
        return { role: "user", parts: [{ functionResponse: { name: m.name, response: payload } }] };
      }
      return { role: "user", parts: [{ text: `TOOL_RESULT: ${m.content}` }] };
    }
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const call of m.tool_calls) {
        parts.push({ functionCall: { name: call.name, args: call.args ?? {} } });
      }
      return { role: "model", parts };
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    };
  });
}

export function resolveModel(): string {
  const requested = (process.env.GEMINI_MODEL || "").trim();
  const model = requested || DEFAULT_GEMINI_MODEL;
  if (RETIRED_MODEL_PATTERNS.some((re) => re.test(model))) {
    throw new Error(
      `MODEL_RETIRED: '${model}' has been shut down by the provider and every request to it returns 404. Set GEMINI_MODEL to a supported model (default: ${DEFAULT_GEMINI_MODEL}).`
    );
  }
  return model;
}

export class ProviderOrchestrator {
  private genAI: GoogleGenAI | null = null;
  private model: any = null;
  private customKey: string | null = null;

  constructor() {}

  setKey(key: string) {
    this.customKey = key;
    this.genAI = null;
    this.model = null;
  }

  private init() {
    if (this.model) return;
    const apiKey = this.customKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("SECURE_GATEWAY_FAILURE: NO_KEY_DETECTED. Please insert a valid OMEGA key.");
    }
    this.genAI = new GoogleGenAI({ apiKey, httpOptions: { timeout: PROVIDER_TIMEOUT_MS } } as any);
    // @google/genai v2 surface: ai.models.generateContent(...)
    this.model = (this.genAI as any).models;
  }

  /**
   * Tri-state validation. A transport failure is NOT reported as an invalid
   * key: the caller can distinguish "your key was rejected" from "the provider
   * could not be reached" and offer a save-anyway path.
   */
  async validateKey(key: string): Promise<KeyValidation> {
    try {
      const tester = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: PROVIDER_TIMEOUT_MS } } as any);
      await (tester as any).models.generateContent({ model: resolveModel(), contents: "ping" });
      return { valid: true, reason: "ok" };
    } catch (e) {
      const reason = classifyKeyFailure(e);
      console.error("Key Validation Failed", { reason, message: (e as any)?.message });
      return { valid: false, reason };
    }
  }

  async generate(messages: AgentMessage[], tools?: any[]): Promise<{ content: string | null; tool_calls: any[] | null }> {
    this.init();
    const contents = toGeminiContents(messages);

    const response = await (this.model as any).generateContent({
      model: resolveModel(),
      contents,
      config: tools ? { tools: [{ functionDeclarations: tools.map((t: any) => t.function) }] } : undefined,
    });

    const content = response.text;
    const functionCalls = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

    return {
      content: content || null,
      tool_calls: functionCalls || null
    };
  }

  async request(messages: AgentMessage[], tools?: any[]) {
    return this.generate(messages, tools);
  }
}
