export class ShortTermMemory {
  private visitedSelectors = new Set<string>();
  private failedElements = new Map<string, number>(); // selector -> retryCount
  private expectedEndpoints = new Set<string>();

  constructor() {}

  public recordVisit(selector: string): void {
    this.visitedSelectors.add(selector);
  }

  public hasVisited(selector: string): boolean {
    return this.visitedSelectors.has(selector);
  }

  public recordFailure(selector: string): void {
    const current = this.failedElements.get(selector) || 0;
    this.failedElements.set(selector, current + 1);
  }

  public getFailureCount(selector: string): number {
    return this.failedElements.get(selector) || 0;
  }

  public clear(): void {
    this.visitedSelectors.clear();
    this.failedElements.clear();
    this.expectedEndpoints.clear();
  }
}
