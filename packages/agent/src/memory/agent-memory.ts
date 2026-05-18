/**
 * Agent Memory
 *
 * Lightweight per-session memory for the autonomous agent loop.
 * Tracks visited URLs, failed actions, and dead-end detection.
 * This is separate from the MCP MemoryEngine (which tracks page visits for context).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentMemoryState {
  visitedUrls: string[];
  failedTargets: string[];      // targets that consistently fail
  urlStagnationCount: number;   // steps at the same URL
  lastUrl: string | null;
  isDeadEnd: boolean;
}

// ─── Agent Memory ─────────────────────────────────────────────────────────────

const DEAD_END_URL_STAGNATION_THRESHOLD = 5; // steps at same URL = dead-end signal
const MAX_FAILED_TARGET_MEMORY = 20;

export class AgentMemory {
  private visitedUrls: Set<string> = new Set();
  private failedTargets: Map<string, number> = new Map(); // target → fail count
  private urlStagnationCount = 0;
  private lastUrl: string | null = null;
  private isDeadEnd = false;

  // ── URL Tracking ────────────────────────────────────────────────────────────

  recordUrl(url: string): void {
    this.visitedUrls.add(url);

    if (url === this.lastUrl) {
      this.urlStagnationCount++;
      if (this.urlStagnationCount >= DEAD_END_URL_STAGNATION_THRESHOLD) {
        this.isDeadEnd = true;
      }
    } else {
      this.urlStagnationCount = 0;
      this.isDeadEnd = false;
    }

    this.lastUrl = url;
  }

  hasVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  // ── Failed Action Tracking ──────────────────────────────────────────────────

  recordFailure(target: string): void {
    const count = (this.failedTargets.get(target) ?? 0) + 1;
    this.failedTargets.set(target, count);

    // Evict oldest entries if over limit
    if (this.failedTargets.size > MAX_FAILED_TARGET_MEMORY) {
      const firstKey = this.failedTargets.keys().next().value;
      if (firstKey !== undefined) {
        this.failedTargets.delete(firstKey);
      }
    }
  }

  isConsistentlyFailing(target: string, threshold = 3): boolean {
    return (this.failedTargets.get(target) ?? 0) >= threshold;
  }

  // ── Dead-End Detection ──────────────────────────────────────────────────────

  get deadEnd(): boolean {
    return this.isDeadEnd;
  }

  get stagnationCount(): number {
    return this.urlStagnationCount;
  }

  // ── State Snapshot ──────────────────────────────────────────────────────────

  getState(): AgentMemoryState {
    return {
      visitedUrls: Array.from(this.visitedUrls),
      failedTargets: Array.from(this.failedTargets.keys()),
      urlStagnationCount: this.urlStagnationCount,
      lastUrl: this.lastUrl,
      isDeadEnd: this.isDeadEnd,
    };
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  reset(): void {
    this.visitedUrls.clear();
    this.failedTargets.clear();
    this.urlStagnationCount = 0;
    this.lastUrl = null;
    this.isDeadEnd = false;
  }
}
