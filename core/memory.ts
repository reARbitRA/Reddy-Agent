import { AgentMessage } from '../src/types';

export class MemoryVault {
  private workingMemory: AgentMessage[] = [];
  private limit: number;
  private episodicSummary: string = "";

  constructor(limit: number = 12000) {
    this.limit = limit;
  }

  add(role: 'system' | 'user' | 'assistant' | 'tool', content: string | null, extra: Partial<AgentMessage> = {}) {
    this.workingMemory.push({ role, content, ...extra });
    this.prune();
  }

  addToolResult(toolCallId: string, name: string, content: string) {
    this.workingMemory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      name: name,
      content: content
    });
    this.prune();
  }

  updateSystemPrompt(content: string) {
    if (this.workingMemory.length > 0 && this.workingMemory[0].role === 'system') {
      this.workingMemory[0].content = content;
    } else {
      this.workingMemory.unshift({ role: 'system', content });
    }
  }

  getContext(): AgentMessage[] {
    const context: AgentMessage[] = [];
    
    // Always include system prompt if it exists
    if (this.workingMemory.length > 0 && this.workingMemory[0].role === 'system') {
      context.push(this.workingMemory[0]);
    }

    if (this.episodicSummary) {
      context.push({ role: 'system', content: `EPISODIC_SUMMARY: ${this.episodicSummary}` });
    }

    // Add rest of the messages
    const startIdx = (this.workingMemory.length > 0 && this.workingMemory[0].role === 'system') ? 1 : 0;
    context.push(...this.workingMemory.slice(startIdx));
    
    return context;
  }

  private prune() {
    // Simple pruning based on message count for now, as tiktoken is complex to setup in TS without extra libs
    while (this.workingMemory.length > 50) {
      const removed = this.workingMemory.splice(1, 1)[0];
      if (removed.content) {
        this.episodicSummary += " " + removed.content;
        // The summary is re-sent on every request, so it must not grow without
        // bound. Keep the most recent `limit` characters and drop the oldest.
        if (this.episodicSummary.length > this.limit) {
          this.episodicSummary = this.episodicSummary.slice(-this.limit);
        }
      }
    }
  }

  /** Length of the rolling episodic summary, exposed for bounds testing. */
  summaryLength(): number {
    return this.episodicSummary.length;
  }
}
