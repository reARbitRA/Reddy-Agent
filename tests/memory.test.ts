import { describe, it, expect } from "vitest";
import { MemoryVault } from "../core/memory";

describe("MemoryVault — session memory behavior", () => {
  it("stores messages in insertion order", () => {
    const vault = new MemoryVault();
    vault.add("system", "SYS");
    vault.add("user", "hello");
    vault.add("assistant", "hi");

    const ctx = vault.getContext();
    expect(ctx.map((m) => m.role)).toEqual(["system", "user", "assistant"]);
    expect(ctx[0].content).toBe("SYS");
    expect(ctx[1].content).toBe("hello");
  });

  it("stores tool results with tool_call_id and tool name", () => {
    const vault = new MemoryVault();
    vault.add("system", "SYS");
    vault.addToolResult("call_1", "get_system_metrics", JSON.stringify({ platform: "linux" }));

    const ctx = vault.getContext();
    const toolMsg = ctx.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.tool_call_id).toBe("call_1");
    expect(toolMsg?.name).toBe("get_system_metrics");
    expect(toolMsg?.content).toBe('{"platform":"linux"}');
  });

  it("replaces an existing system prompt in place", () => {
    const vault = new MemoryVault();
    vault.add("system", "OLD");
    vault.add("user", "hello");
    vault.updateSystemPrompt("NEW");

    const ctx = vault.getContext();
    expect(ctx[0].role).toBe("system");
    expect(ctx[0].content).toBe("NEW");
    // The rest of the conversation is untouched
    expect(ctx[1].content).toBe("hello");
  });

  it("unshifts a system prompt when none exists yet", () => {
    const vault = new MemoryVault();
    vault.add("user", "hello");
    vault.updateSystemPrompt("INJECTED");

    const ctx = vault.getContext();
    expect(ctx[0].role).toBe("system");
    expect(ctx[0].content).toBe("INJECTED");
    expect(ctx[1].role).toBe("user");
  });

  it("emits the episodic summary between system prompt and recent messages", () => {
    const vault = new MemoryVault();
    vault.add("system", "SYS");
    // Force pruning by exceeding the 50-message working window
    for (let i = 0; i < 60; i++) {
      vault.add("user", `prune-me-${i}`);
    }

    const ctx = vault.getContext();
    expect(ctx[0].role).toBe("system");
    expect(ctx[0].content).toBe("SYS");
    const summary = ctx.find((m) => m.content?.startsWith("EPISODIC_SUMMARY:"));
    expect(summary).toBeDefined();
    expect(ctx[1]).toBe(summary);
  });
});

describe("MemoryVault — context pruning", () => {
  it("caps the working window at 50 messages", () => {
    const vault = new MemoryVault();
    for (let i = 0; i < 80; i++) {
      vault.add("user", `msg-${i}`);
    }
    // 79 pruned + 1 = 80 added, window must hold at most 50
    // (system prompt survives, everything else is capped)
    expect(vault.getContext().length).toBeLessThanOrEqual(52); // 50 window + possible summary line
    expect(vault.getContext().length).toBeGreaterThanOrEqual(50);
  });

  it("never prunes the pinned first message (system prompt)", () => {
    const vault = new MemoryVault();
    vault.add("system", "PINNED");
    for (let i = 0; i < 80; i++) {
      vault.add("user", `msg-${i}`);
    }
    const ctx = vault.getContext();
    expect(ctx[0].role).toBe("system");
    expect(ctx[0].content).toBe("PINNED");
  });

  it("folds pruned message content into the episodic summary", () => {
    const vault = new MemoryVault();
    vault.add("system", "SYS");
    for (let i = 0; i < 60; i++) {
      vault.add("user", `prune-me-${i}`);
    }

    const summary = vault
      .getContext()
      .find((m) => m.content?.startsWith("EPISODIC_SUMMARY:"));

    expect(summary).toBeDefined();
    // The oldest non-system messages were pruned into the summary
    expect(summary?.content).toContain("prune-me-0");
    expect(summary?.content).toContain("prune-me-9");
    // The newest messages stay in the working window instead
    expect(summary?.content).not.toContain("prune-me-59");
  });

  it("keeps the most recent messages inside the working window", () => {
    const vault = new MemoryVault();
    vault.add("system", "SYS");
    for (let i = 0; i < 60; i++) {
      vault.add("user", `msg-${i}`);
    }
    const ctx = vault.getContext();
    const contents = ctx.map((m) => m.content ?? "");
    expect(contents).toContain("msg-59");
    expect(contents).toContain("msg-58");
    // system prompt + summary + at least the tail of the window
    const windowTail = contents.filter((c) => c.startsWith("msg-"));
    expect(windowTail.length).toBeGreaterThanOrEqual(49);
  });

  it("prunes from index 1 so a non-system first message also survives", () => {
    const vault = new MemoryVault();
    vault.add("user", "first-ever");
    for (let i = 0; i < 70; i++) {
      vault.add("user", `msg-${i}`);
    }
    const ctx = vault.getContext();
    // No system prompt exists, so the summary line is emitted first;
    // the pinned first message follows it and is never pruned.
    expect(ctx[0].content).toContain("EPISODIC_SUMMARY:");
    expect(ctx[1].content).toBe("first-ever");
  });
});

describe("MemoryVault — episodic summary is bounded (T-014)", () => {
  it("never exceeds the configured limit even after hundreds of prunes", () => {
    const LIMIT = 200;
    const vault = new MemoryVault(LIMIT);
    vault.add("system", "pinned");
    for (let i = 0; i < 500; i++) {
      vault.add("user", `message-number-${i}-`.repeat(6));
    }
    expect(vault.summaryLength()).toBeLessThanOrEqual(LIMIT);

    const summary = vault
      .getContext()
      .find((m) => typeof m.content === "string" && m.content.startsWith("EPISODIC_SUMMARY:"));
    expect(summary).toBeDefined();
    expect((summary!.content as string).length).toBeLessThanOrEqual(
      LIMIT + "EPISODIC_SUMMARY: ".length
    );
  });

  it("keeps the most recent evicted content, not the oldest", () => {
    const vault = new MemoryVault(120);
    vault.add("system", "pinned");
    for (let i = 0; i < 200; i++) {
      vault.add("user", `M${i}`.padEnd(40, "."));
    }
    const ctx = vault.getContext();
    const summary = ctx.find((m) =>
      typeof m.content === "string" && m.content.startsWith("EPISODIC_SUMMARY:")
    )!.content as string;
    // 200 user messages + 1 pinned system message, window 50 => M0..M150 were
    // evicted. The bounded tail must hold the newest evictions, not the oldest.
    expect(summary).toContain("M150");
    expect(summary).not.toContain("M0.");
    expect(summary).not.toContain("M100.");
  });
});
