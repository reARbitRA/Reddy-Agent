import { ProviderOrchestrator } from './orchestrator';
import { ToolRegistry } from './registry';
import { MemoryVault } from './memory';

export class RedAeyeEngine {
  private orchestrator: ProviderOrchestrator;
  private registry: ToolRegistry;
  private memory: MemoryVault;
  private maxIterations: number = 5;

  constructor(orchestrator: ProviderOrchestrator, registry: ToolRegistry, memory: MemoryVault) {
    this.orchestrator = orchestrator;
    this.registry = registry;
    this.memory = memory;
  }

  async execute(userInput: string): Promise<string> {
    this.memory.add("user", userInput);

    for (let i = 0; i < this.maxIterations; i++) {
      const history = this.memory.getContext();
      const tools = this.registry.getToolSchemas();
      const guidelines = this.registry.getSkillGuidelines();

      // Inject guidelines into the system state for this request
      const augmentedHistory = [...history];
      if (guidelines) {
        augmentedHistory.push({
          role: 'system',
          content: `ACTIVE_CAPABILITIES:\n${guidelines}`
        });
      }

      const response = await this.orchestrator.request(augmentedHistory, tools.length > 0 ? tools : undefined);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const content = response.content || "";
        this.memory.add("assistant", content);
        return content;
      }

      // Execute tools
      const toolResults = await Promise.all(response.tool_calls.map(async (call: any) => {
        const result = await this.registry.executeTool(call.name, call.args);
        return { name: call.name, result, id: call.id || 'tool_call_id' };
      }));

      for (const res of toolResults) {
        this.memory.addToolResult(res.id, res.name, JSON.stringify(res.result));
      }
    }

    return "MAX_ITERATIONS_REACHED: Autonomous loop terminated safely.";
  }
}
