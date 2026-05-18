import { Page, ElementHandle } from 'playwright-core';
import { MCPElement, MCPPageContext } from '@fricta/types';

export class PageExtractor {
  async extract(page: Page): Promise<MCPPageContext> {
    const url = page.url();
    const title = await page.title();

    const [buttons, inputs, links, headings, texts] = await Promise.all([
      this.extractElements(page, 'button, [role="button"]', 'button'),
      this.extractElements(page, 'input, textarea, select', 'input'),
      this.extractElements(page, 'a, [role="link"]', 'link'),
      this.extractElements(page, 'h1, h2, h3, h4, h5, h6', 'heading'),
      this.extractElements(page, 'p, span, label, div', 'text', true), // only text nodes
    ]);

    return {
      url,
      title,
      buttons,
      inputs,
      links,
      headings,
      texts,
    };
  }

  private async extractElements(page: Page, selector: string, role: string, onlyVisibleText: boolean = false): Promise<MCPElement[]> {
    const elements = await page.$$(selector);
    const mcpElements: MCPElement[] = [];

    for (const el of elements) {
      const isVisible = await el.isVisible();
      if (!isVisible && onlyVisibleText) continue;

      const text = (await el.textContent())?.trim() || '';
      
      if (onlyVisibleText && !text) continue;

      const isDisabled = await el.evaluate((node) => (node as HTMLInputElement).disabled || false);
      const boundingBox = await el.boundingBox();

      mcpElements.push({
        text,
        role,
        visible: isVisible,
        disabled: isDisabled,
        position: boundingBox ? {
          x: Math.round(boundingBox.x),
          y: Math.round(boundingBox.y),
          width: Math.round(boundingBox.width),
          height: Math.round(boundingBox.height),
        } : null,
      });
    }

    return mcpElements;
  }
}
