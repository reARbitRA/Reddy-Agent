import { Skill } from '../src/types';
import os from 'os';

export const SystemInfoSkill: Skill = {
  name: "System_Info",
  description: "Skill to gather CPU, memory, and OS data of the host machine.",
  guidelines: "Use these diagnostics to monitor available resources.",
  tools: [
    {
      schema: {
        name: "get_system_metrics",
        description: "Retrieve hardware and OS information.",
        parameters: {
          type: "object",
          properties: {
            metric: { type: "string", enum: ["cpu", "memory", "os"] }
          },
          required: ["metric"]
        }
      },
      logic: async ({ metric }: { metric: string }) => {
        if (metric === "cpu") return { usage: os.loadavg(), cores: os.cpus().length };
        if (metric === "memory") return { total: os.totalmem(), free: os.freemem() };
        if (metric === "os") return { platform: os.platform(), release: os.release() };
        return "Unknown metric";
      }
    }
  ]
};
