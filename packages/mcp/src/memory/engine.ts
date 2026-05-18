import { MCPMemoryState } from '@fricta/types';

export class MemoryEngine {
  private visitedUrls: Set<string> = new Set();

  recordVisit(url: string): void {
    this.visitedUrls.add(url);
  }

  hasVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  getState(): MCPMemoryState {
    return {
      visitedPages: Array.from(this.visitedUrls),
    };
  }

  clear(): void {
    this.visitedUrls.clear();
  }
}
