import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../core/registry";
import type { Skill } from "../src/types";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    name: "Demo_Skill",
    description: "A demo skill.",
    guidelines: "Demo guidelines.",
    tools: [
      {
        schema: {
          name: "demo_tool",
          description: "Runs the demo.",
          parameters: { type: "object", properties: { a: { type: "string" } } },
        },
        logic: async (args: any) => ({ echo: args.a }),
      },
    ],
    ...overrides,
  };
}

describe("ToolRegistry — tool registration", () => {
  it("registers a skill and lists it by name", () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill());
    expect(registry.listSkills()).toEqual(["Demo_Skill"]);
  });

  it("exposes tool schemas in Gemini function-declaration shape", () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill());

    const schemas = registry.getToolSchemas();
    expect(schemas).toHaveLength(1);
    expect(schemas[0]).toEqual({
      function: {
        name: "demo_tool",
        description: "Runs the demo.",
        parameters: { type: "object", properties: { a: { type: "string" } } },
      },
    });
  });

  it("executes a registered tool and returns its result", async () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill());

    const result = await registry.executeTool("demo_tool", { a: "x" });
    expect(result).toEqual({ echo: "x" });
  });

  it("collects tools from multiple skills into one schema set", () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill());
    registry.registerSkill(
      makeSkill({
        name: "Second_Skill",
        tools: [
          {
            schema: { name: "second_tool", description: "Second.", parameters: { type: "object" } },
            logic: async () => "ok",
          },
        ],
      })
    );

    expect(registry.listSkills()).toEqual(["Demo_Skill", "Second_Skill"]);
    expect(registry.getToolSchemas().map((s) => s.function.name)).toEqual([
      "demo_tool",
      "second_tool",
    ]);
  });

  it("re-registering a skill replaces the previous entry", async () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill());
    registry.registerSkill(
      makeSkill({
        guidelines: "Updated guidelines.",
        tools: [
          {
            schema: { name: "demo_tool", description: "Runs the demo v2.", parameters: { type: "object" } },
            logic: async () => "v2",
          },
        ],
      })
    );

    expect(registry.listSkills()).toEqual(["Demo_Skill"]);
    expect(await registry.executeTool("demo_tool", {})).toBe("v2");
    expect(registry.getSkillGuidelines()).toContain("Updated guidelines.");
  });

  it("supports tool-less (text-only) skills", () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill({ tools: [] }));
    expect(registry.getToolSchemas()).toEqual([]);
    expect(registry.listSkills()).toEqual(["Demo_Skill"]);
    expect(registry.getSkillGuidelines()).toContain("[SKILL: Demo_Skill]");
  });
});

describe("ToolRegistry — tool contract error normalization", () => {
  it("returns a PROTOCOL_ERROR string for an undefined tool", async () => {
    const registry = new ToolRegistry();
    const result = await registry.executeTool("nope", {});
    expect(result).toBe("PROTOCOL_ERROR: Tool 'nope' undefined.");
  });

  it("returns an EXECUTION_ERROR string when tool logic throws", async () => {
    const registry = new ToolRegistry();
    registry.registerSkill(
      makeSkill({
        tools: [
          {
            schema: { name: "boom", description: "Throws.", parameters: { type: "object" } },
            logic: async () => {
              throw new Error("exploded");
            },
          },
        ],
      })
    );

    const result = await registry.executeTool("boom", {});
    expect(result).toBe("EXECUTION_ERROR in boom: exploded");
  });
});

describe("ToolRegistry — skill guidelines", () => {
  it("formats guidelines as [SKILL: name] blocks joined by a blank line", () => {
    const registry = new ToolRegistry();
    registry.registerSkill(makeSkill({ guidelines: "G1" }));
    registry.registerSkill(
      makeSkill({ name: "Other_Skill", tools: [], guidelines: "G2" })
    );

    expect(registry.getSkillGuidelines()).toBe(
      "[SKILL: Demo_Skill]\nG1\n\n[SKILL: Other_Skill]\nG2"
    );
  });
});
