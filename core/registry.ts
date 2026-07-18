import { Skill } from '../src/types';

export class ToolRegistry {
  private skills: Map<string, Skill> = new Map();
  private tools: Map<string, (...args: any[]) => Promise<any>> = new Map();

  registerSkill(skill: Skill) {
    this.skills.set(skill.name, skill);
    for (const tool of skill.tools) {
      this.tools.set(tool.schema.name, tool.logic);
    }
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    const logic = this.tools.get(toolName);
    if (!logic) {
      return `PROTOCOL_ERROR: Tool '${toolName}' undefined.`;
    }
    try {
      return await logic(args);
    } catch (e: any) {
      return `EXECUTION_ERROR in ${toolName}: ${e.message}`;
    }
  }

  getToolSchemas(): any[] {
    const schemas: any[] = [];
    for (const skill of this.skills.values()) {
      for (const tool of skill.tools) {
        schemas.push({
          function: {
            name: tool.schema.name,
            description: tool.schema.description,
            parameters: tool.schema.parameters
          }
        });
      }
    }
    return schemas;
  }

  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  getSkillGuidelines(): string {
    return Array.from(this.skills.values())
      .map(s => `[SKILL: ${s.name}]\n${s.guidelines}`)
      .join('\n\n');
  }
}
