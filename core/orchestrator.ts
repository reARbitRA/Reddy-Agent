import { GoogleGenAI } from "@google/genai";
import { AgentMessage } from '../src/types';

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
    this.model = (this.genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const tester = new GoogleGenAI({ apiKey: key } as any);
      const testModel = (tester as any).getGenerativeModel({ model: "gemini-1.5-flash" });
      await testModel.generateContent("ping");
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

    const result = await this.model.generateContent({
      contents,
      tools: tools ? [{ functionDeclarations: tools.map((t: any) => t.function) }] : undefined,
    });

    const response = result.response;
    const content = response.text();
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
