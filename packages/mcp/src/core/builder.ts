import { MCPContext } from '@fricta/types';
import { PageExtractor } from '../extractors/page';
import { InteractionTracker } from '../trackers/interaction';
import { MemoryEngine } from '../memory/engine';
import { Page } from 'playwright-core';

export class MCPContextBuilder {
  private extractor: PageExtractor;

  constructor() {
    this.extractor = new PageExtractor();
  }

  async build(
    sessionId: string,
    page: Page,
    tracker: InteractionTracker,
    memory: MemoryEngine
  ): Promise<MCPContext> {
    const currentPage = await this.extractor.extract(page);
    const history = tracker.getHistory();
    const memoryState = memory.getState();

    return {
      sessionId,
      currentPage,
      history,
      memory: memoryState,
    };
  }
}
