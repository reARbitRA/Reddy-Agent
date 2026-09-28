import { describe, it, expect } from "vitest";
import { RedAeyeEngine } from "../core/engine";
import { ProviderOrchestrator } from "../core/orchestrator";
import { MemoryVault } from "../core/memory";
import { ToolRegistry } from "../core/registry";
import { SystemInfoSkill } from "../plugins/system";
import type { AgentMessage } from "../src/types";

/**
 * Stub orchestrator: records every request payload and replays
 * queued responses. Exercises the REAL engine, registry, memory,
 * and SystemInfoSkill tool logic without network access.
 */
class StubOrchestrator {
  public requests: { messages: AgentMessage[]; tools?: any[] }[] = [];
  private queue: { content: string | null; tool_calls: any[] | null }[] = [];

  enqueue(response: { content: string | null; tool_calls: any[] | null }) {
    this.queue.push(response);
  }

  async request(messages: AgentMessage[], tools?: any[]) {
    this.requests.push({ messages, tools });
    return (
      this.queue.shift() ?? { content: "stub-default", tool_calls: null }
    );
  }
}

function makeEngine() {
  const orchestrator = new StubOrchestrator();
  const registry = new ToolRegistry();
  registry.registerSkill(SystemInfoSkill);
  const memory = new MemoryVault();
  const engine = new RedAeyeEngine(
    orchestrator as unknown as ProviderOrchestrator,
    registry,
    memory
  );
  return { engine, orchestrator, registry, memory };
}

describe("RedAeyeEngine — agent loop", () => {
  it("returns the final response and records both messages in memory", async () => {
    const { engine, orchestrator, memory } = makeEngine();
    orchestrator.enqueue({ content: "ALL SYSTEMS NOMINAL", tool_calls: null });

    const result = await engine.execute("status report");
    expect(result).toBe("ALL SYSTEMS NOMINAL");

    const ctx = memory.getContext();
    const roles = ctx.map((m) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
    expect(ctx[ctx.length - 1].content).toBe("ALL SYSTEMS NOMINAL");
  });

  it("sends tool schemas and ACTIVE_CAPABILITIES guidelines with every iteration", async () => {
    const { engine, orchestrator } = makeEngine();
    orchestrator.enqueue({ content: "done", tool_calls: null });

    await engine.execute("go");
    expect(orchestrator.requests).toHaveLength(1);

    const { messages, tools } = orchestrator.requests[0];
    // Tool schema for get_system_metrics was passed to the provider
    expect(tools).toBeDefined();
    expect(tools!.map((t: any) => t.function.name)).toEqual(["get_system_metrics"]);

    // Skill guidelines ride along as the final system message
    const last = messages[messages.length - 1];
    expect(last.role).toBe("system");
    expect(last.content).toContain("ACTIVE_CAPABILITIES");
    expect(last.content).toContain("[SKILL: System_Info]");
  });

  it("omits the tools argument when no tools are registered", async () => {
    const orchestrator = new StubOrchestrator();
    const registry = new ToolRegistry();
    const memory = new MemoryVault();
    const engine = new RedAeyeEngine(
      orchestrator as unknown as ProviderOrchestrator,
      registry,
      memory
    );
    orchestrator.enqueue({ content: "ok", tool_calls: null });

    await engine.execute("go");
    expect(orchestrator.requests[0].tools).toBeUndefined();
  });

  it("executes requested tools and stores their results in memory", async () => {
    const { engine, orchestrator, memory } = makeEngine();
    orchestrator.enqueue({
      content: null,
      tool_calls: [
        { name: "get_system_metrics", args: { metric: "os" }, id: "call_os" },
      ],
    });
    orchestrator.enqueue({ content: "OS: collected", tool_calls: null });

    const result = await engine.execute("check os");
    expect(result).toBe("OS: collected");

    const toolMsg = memory.getContext().find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.tool_call_id).toBe("call_os");
    expect(toolMsg?.name).toBe("get_system_metrics");
    // Tool result is JSON-serialized back into session memory
    const parsed = JSON.parse(toolMsg?.content ?? "{}");
    expect(typeof parsed.platform).toBe("string");

    // The loop ran exactly two provider rounds
    expect(orchestrator.requests).toHaveLength(2);
  });

  it("executes parallel tool calls from a single response", async () => {
    const { engine, orchestrator, memory } = makeEngine();
    orchestrator.enqueue({
      content: null,
      tool_calls: [
        { name: "get_system_metrics", args: { metric: "cpu" }, id: "c1" },
        { name: "get_system_metrics", args: { metric: "memory" }, id: "c2" },
      ],
    });
    orchestrator.enqueue({ content: "both done", tool_calls: null });

    await engine.execute("check cpu and memory");

    const toolMsgs = memory.getContext().filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(2);
    expect(toolMsgs.map((m) => m.tool_call_id).sort()).toEqual(["c1", "c2"]);
  });

  it("terminates safely at the five-iteration limit", async () => {
    const { engine, orchestrator, memory } = makeEngine();
    // Provider always demands another tool call
    for (let i = 0; i < 10; i++) {
      orchestrator.enqueue({
        content: null,
        tool_calls: [
          { name: "get_system_metrics", args: { metric: "os" }, id: `c${i}` },
        ],
      });
    }

    const result = await engine.execute("loop forever");
    expect(result).toBe("MAX_ITERATIONS_REACHED: Autonomous loop terminated safely.");
    // Exactly maxIterations provider rounds, never more
    expect(orchestrator.requests).toHaveLength(5);
    // Every round's tool result was still written to memory
    expect(memory.getContext().filter((m) => m.role === "tool")).toHaveLength(5);
  });
});
