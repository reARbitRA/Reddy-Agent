export interface ToolSchema {
  name: string;
  description: string;
  parameters: any;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

export interface ChatRequest {
  message: string;
  session_id: string;
  model_preference?: string;
}

export interface Skill {
  name: string;
  description: string;
  guidelines: string;
  tools: {
    schema: ToolSchema;
    logic: (...args: any[]) => Promise<any>;
  }[];
}
