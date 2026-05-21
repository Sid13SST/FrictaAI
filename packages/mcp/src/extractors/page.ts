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

      // Extract extended accessibility, interaction, and structural metadata
      const attrs = await el.evaluate((node) => {
        const htmlNode = node as HTMLElement;
        
        // 1. Accessibility Context
        const id = htmlNode.id || undefined;
        const name = htmlNode.getAttribute('name') || undefined;
        const placeholder = htmlNode.getAttribute('placeholder') || undefined;
        const ariaLabel = htmlNode.getAttribute('aria-label') || undefined;
        const ariaDescribedBy = htmlNode.getAttribute('aria-describedby') || undefined;
        const title = htmlNode.getAttribute('title') || undefined;
        const altText = htmlNode.getAttribute('alt') || undefined;
        const type = htmlNode.getAttribute('type') || undefined;
        const href = htmlNode.getAttribute('href') || undefined;

        // 2. Interaction Semantics (Intent)
        let intent: 'primary' | 'secondary' | 'destructive' | 'neutral' = 'neutral';
        const textLower = (htmlNode.textContent || '').trim().toLowerCase();
        const classLower = (htmlNode.className || '').toString().toLowerCase();

        const isDestructive = 
          textLower.includes('delete') || 
          textLower.includes('remove') || 
          textLower.includes('discard') || 
          classLower.includes('destructive') || 
          classLower.includes('danger') || 
          classLower.includes('delete') || 
          classLower.includes('red-');
          
        const isPrimary = 
          type === 'submit' || 
          textLower.includes('submit') || 
          textLower.includes('save') || 
          textLower.includes('confirm') || 
          textLower.includes('continue') || 
          textLower.includes('agree') || 
          classLower.includes('primary') || 
          classLower.includes('cta') || 
          classLower.includes('blue-');

        const isSecondary = 
          textLower.includes('cancel') || 
          textLower.includes('secondary') || 
          textLower.includes('back') || 
          textLower.includes('previous') || 
          classLower.includes('secondary') || 
          classLower.includes('cancel');

        if (isDestructive) {
          intent = 'destructive';
        } else if (isPrimary) {
          intent = 'primary';
        } else if (isSecondary) {
          intent = 'secondary';
        }

        // 3. Structural Metadata (Containers)
        let containerType: 'form' | 'modal' | 'nav' | 'section' | 'none' = 'none';
        let containerId: string | undefined = undefined;
        
        let parent: HTMLElement | null = htmlNode.parentElement;
        let depth = 0;
        while (parent && depth < 6) {
          const parentRole = parent.getAttribute('role') || '';
          const parentId = parent.id || '';
          const parentClass = (parent.className || '').toString().toLowerCase();
          const tag = parent.tagName.toLowerCase();

          if (tag === 'form' || parentRole === 'form') {
            containerType = 'form';
            containerId = parentId || parent.className || 'form';
            break;
          } else if (parentRole === 'dialog' || parentClass.includes('modal') || parentClass.includes('dialog')) {
            containerType = 'modal';
            containerId = parentId || parent.className || 'modal';
            break;
          } else if (tag === 'nav' || parentRole === 'navigation' || parentClass.includes('nav') || parentClass.includes('menu')) {
            containerType = 'nav';
            containerId = parentId || parent.className || 'nav';
            break;
          } else if (tag === 'section' || tag === 'article' || parentRole === 'region') {
            containerType = 'section';
            containerId = parentId || parent.className || 'section';
            break;
          }
          parent = parent.parentElement;
          depth++;
        }

        return {
          id,
          name,
          placeholder,
          ariaLabel,
          ariaDescribedBy,
          title,
          altText,
          type,
          href,
          intent,
          containerType,
          containerId: containerId ? String(containerId).trim().split(/\s+/)[0] : undefined
        };
      }).catch(() => null);

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
        id: attrs?.id,
        name: attrs?.name,
        placeholder: attrs?.placeholder,
        ariaLabel: attrs?.ariaLabel,
        ariaDescribedBy: attrs?.ariaDescribedBy,
        title: attrs?.title,
        altText: attrs?.altText,
        type: attrs?.type,
        href: attrs?.href,
        intent: attrs?.intent || 'neutral',
        containerType: attrs?.containerType || 'none',
        containerId: attrs?.containerId,
      });
    }

    return mcpElements;
  }
}
