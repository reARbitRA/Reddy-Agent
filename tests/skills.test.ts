import { describe, it, expect } from "vitest";
import { SystemInfoSkill } from "../plugins/system";
import { ToolRegistry } from "../core/registry";

describe("SystemInfoSkill — built-in skill loading", () => {
  it("declares the skill contract required by ToolRegistry", () => {
    expect(SystemInfoSkill.name).toBe("System_Info");
    expect(SystemInfoSkill.description.length).toBeGreaterThan(0);
    expect(SystemInfoSkill.guidelines.length).toBeGreaterThan(0);
    expect(Array.isArray(SystemInfoSkill.tools)).toBe(true);
  });

  it("registers exactly one diagnostics tool with a metric parameter", () => {
    expect(SystemInfoSkill.tools).toHaveLength(1);
    const tool = SystemInfoSkill.tools[0];

    expect(tool.schema.name).toBe("get_system_metrics");
    expect(tool.schema.description.length).toBeGreaterThan(0);

    const props = tool.schema.parameters.properties as Record<string, any>;
    expect(props.metric.type).toBe("string");
    expect(props.metric.enum).toEqual(["cpu", "memory", "os"]);
    expect(tool.schema.parameters.required).toEqual(["metric"]);
  });

  it("returns load average and core count for metric=cpu", async () => {
    const result = await SystemInfoSkill.tools[0].logic({ metric: "cpu" });
    expect(Array.isArray(result.usage)).toBe(true);
    expect(result.usage.length).toBe(3);
    expect(typeof result.cores).toBe("number");
    expect(result.cores).toBeGreaterThan(0);
  });

  it("returns total and free bytes for metric=memory", async () => {
    const result = await SystemInfoSkill.tools[0].logic({ metric: "memory" });
    expect(typeof result.total).toBe("number");
    expect(typeof result.free).toBe("number");
    expect(result.total).toBeGreaterThan(0);
    expect(result.free).toBeLessThanOrEqual(result.total);
  });

  it("returns platform and release for metric=os", async () => {
    const result = await SystemInfoSkill.tools[0].logic({ metric: "os" });
    expect(typeof result.platform).toBe("string");
    expect(typeof result.release).toBe("string");
    expect(result.platform.length).toBeGreaterThan(0);
  });

  it("answers an unknown metric with a plain message, not a throw", async () => {
    const result = await SystemInfoSkill.tools[0].logic({ metric: "gpu" });
    expect(result).toBe("Unknown metric");
  });
});

describe("Skill loading through the ToolRegistry", () => {
  it("loads System_Info at boot and exposes get_system_metrics for execution", async () => {
    const registry = new ToolRegistry();
    registry.registerSkill(SystemInfoSkill);

    expect(registry.listSkills()).toEqual(["System_Info"]);

    const schemas = registry.getToolSchemas();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].function.name).toBe("get_system_metrics");

    const result = await registry.executeTool("get_system_metrics", { metric: "os" });
    expect(typeof result.platform).toBe("string");
  });

  it("injects a text-only skill at runtime the same way the /api/skills/inject route does", async () => {
    const registry = new ToolRegistry();
    registry.registerSkill(SystemInfoSkill);
    registry.registerSkill({
      name: "Ops_Notes",
      description: "Session notes.",
      guidelines: "Prefer concise operational summaries.",
      tools: [], // text skills carry guidelines only, no tools
    });

    expect(registry.listSkills()).toEqual(["System_Info", "Ops_Notes"]);
    // Guidelines of both skills flow into the ACTIVE_CAPABILITIES context
    const guidelines = registry.getSkillGuidelines();
    expect(guidelines).toContain("[SKILL: System_Info]");
    expect(guidelines).toContain("[SKILL: Ops_Notes]");
    // Tool set is unchanged by the text skill
    expect(registry.getToolSchemas()).toHaveLength(1);
  });
});
