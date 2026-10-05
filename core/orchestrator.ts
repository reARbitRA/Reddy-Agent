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
    this.genAI = new GoogleGenAI({ apiKey } as any);
    // @google/genai v2 surface: ai.models.generateContent(...)
    this.model = (this.genAI as any).models;
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const tester = new GoogleGenAI({ apiKey: key } as any);
      await (tester as any).models.generateContent({ model: resolveModel(), contents: "ping" });
      return true;
    } catch (e) {
      console.error("Key Validation Failed", e);
      return false;
    }
  }

  async generate(messages: AgentMessage[], tools?: any[]): Promise<{ content: string | null; tool_calls: any[] | null }> {
    this.init();
    // Translate messages to Gemini format
    const contents = messages.map(m => {
      if (m.role === 'system') return { role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION: ${m.content}` }] }; // Gemini handles system instructions differently, but for simplicity...
      if (m.role === 'tool') return { role: 'user', parts: [{ text: `TOOL_RESULT [${m.name}]: ${m.content}` }] };
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }]
      };
    });

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
