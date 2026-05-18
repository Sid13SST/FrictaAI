/**
 * Executor Layer
 *
 * Translates validated AgentAction JSON into Playwright operations.
 * This layer is the ONLY place that directly controls Playwright.
 * It is completely isolated from AI reasoning — purely mechanical translation.
 *
 * Architecture:
 *   Validated AgentAction → Executor → Playwright → Result
 */

import { Page } from 'playwright-core';
import { AgentAction, ActionStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  status: ActionStatus;
  errorMessage?: string;
  durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 2_000; // 2s per strategy check (prevents 50s+ hangs on bad targets)
const WAIT_AFTER_ACTION_MS = 300; // brief settle time after each action

// ─── Executor ─────────────────────────────────────────────────────────────────

export class Executor {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * execute
   *
   * Dispatches a validated action to the appropriate handler.
   * Returns an ExecutionResult with status and timing.
   */
  async execute(action: AgentAction): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      switch (action.action) {
        case 'click':
          await this.executeClick(action.target);
          break;

        case 'type':
          await this.executeType(action.target, action.value ?? '');
          break;

        case 'scroll':
          await this.executeScroll(action.target);
          break;

        case 'wait':
          await this.executeWait(action.target);
          break;

        case 'navigate':
          await this.executeNavigate(action.value || action.target);
          break;

        case 'goBack':
          await this.executeGoBack();
          break;

        default:
          return {
            status: 'invalid',
            errorMessage: `Unknown action: "${action.action}"`,
            durationMs: Date.now() - startTime,
          };
      }

      // Brief settle after action (let page react)
      if (action.action !== 'wait') {
        await this.page.waitForTimeout(WAIT_AFTER_ACTION_MS);
      }

      return {
        status: 'success',
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'failed',
        errorMessage: err.message ?? String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ── Action Handlers ─────────────────────────────────────────────────────────

  /**
   * click
   *
   * Tries multiple strategies to click an element by its visible text/label.
   * Strategy order: exact text → contains text → aria-label → placeholder
   */
  private async executeClick(target: string): Promise<void> {
    const strategies = [
      // Exact text match (button/link/role)
      () => this.page.click(`text="${target}"`, { timeout: DEFAULT_TIMEOUT_MS }),
      // Contains text (partial match)
      () => this.page.click(`text=${target}`, { timeout: DEFAULT_TIMEOUT_MS }),
      // By aria-label
      () => this.page.click(`[aria-label="${target}"]`, { timeout: DEFAULT_TIMEOUT_MS }),
      // By title attribute
      () => this.page.click(`[title="${target}"]`, { timeout: DEFAULT_TIMEOUT_MS }),
      // Button/link with value
      () => this.page.click(`input[value="${target}"]`, { timeout: DEFAULT_TIMEOUT_MS }),
    ];

    let lastError: Error | null = null;
    for (const strategy of strategies) {
      try {
        await strategy();
        // Wait for potential navigation after click
        await this.page.waitForLoadState('load', { timeout: 8_000 }).catch(() => {});
        return;
      } catch (err: any) {
        lastError = err;
      }
    }

    throw new Error(`Could not click "${target}": ${lastError?.message}`);
  }

  /**
   * type
   *
   * Finds the target input by label/placeholder and fills it.
   */
  private async executeType(target: string, value: string): Promise<void> {
    const inputStrategies = [
      // By placeholder
      () => this.page.fill(`input[placeholder="${target}"]`, value, { timeout: DEFAULT_TIMEOUT_MS }),
      () => this.page.fill(`textarea[placeholder="${target}"]`, value, { timeout: DEFAULT_TIMEOUT_MS }),
      // By name attribute
      () => this.page.fill(`input[name="${target}"]`, value, { timeout: DEFAULT_TIMEOUT_MS }),
      // By aria-label
      () => this.page.fill(`input[aria-label="${target}"]`, value, { timeout: DEFAULT_TIMEOUT_MS }),
      // By associated label text
      () => this.page.fill(`input:near(:text("${target}"))`, value, { timeout: DEFAULT_TIMEOUT_MS }),
      // By id matching
      () => this.page.fill(`#${target.toLowerCase().replace(/\s+/g, '-')}`, value, { timeout: DEFAULT_TIMEOUT_MS }),
    ];

    let lastError: Error | null = null;
    for (const strategy of inputStrategies) {
      try {
        await strategy();
        return;
      } catch (err: any) {
        lastError = err;
      }
    }

    throw new Error(`Could not type into "${target}": ${lastError?.message}`);
  }

  /**
   * scroll
   *
   * Scrolls by direction keyword or toward a specific element.
   */
  private async executeScroll(target: string): Promise<void> {
    const lowerTarget = target.toLowerCase().trim();

    if (lowerTarget === 'down') {
      await this.page.evaluate(() => window.scrollBy(0, 500));
    } else if (lowerTarget === 'up') {
      await this.page.evaluate(() => window.scrollBy(0, -500));
    } else if (lowerTarget === 'top') {
      await this.page.evaluate(() => window.scrollTo(0, 0));
    } else if (lowerTarget === 'bottom') {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
      // Try to scroll to element
      try {
        const element = await this.page.$(`text=${target}`);
        if (element) {
          await element.scrollIntoViewIfNeeded({ timeout: DEFAULT_TIMEOUT_MS });
          return;
        }
      } catch {}
      // Fallback: scroll down a bit
      await this.page.evaluate(() => window.scrollBy(0, 300));
    }
  }

  /**
   * wait
   *
   * Intelligently waits based on target signal.
   * Terminal signals (goal_complete, dead_end) are no-ops — handled by the loop.
   */
  private async executeWait(target: string): Promise<void> {
    const lowerTarget = target.toLowerCase().trim();

    if (lowerTarget === 'goal_complete' || lowerTarget === 'dead_end') {
      // Terminal state — loop will handle this, just wait briefly
      await this.page.waitForTimeout(100);
      return;
    }

    if (lowerTarget === 'page_load' || lowerTarget === 'navigation') {
      await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    } else if (lowerTarget === 'animation') {
      await this.page.waitForTimeout(1500);
    } else {
      // Generic wait
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * navigate
   *
   * Navigates directly to a URL.
   */
  private async executeNavigate(url: string): Promise<void> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Assume relative path — prepend current origin
      const currentUrl = this.page.url();
      const origin = new URL(currentUrl).origin;
      url = `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    await this.page.goto(url, { waitUntil: 'load', timeout: 15_000 });
  }

  /**
   * goBack
   *
   * Returns to the previous page.
   */
  private async executeGoBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'networkidle', timeout: 10_000 });
  }

  /**
   * getCurrentUrl
   *
   * Returns the current page URL (used by the agent loop for memory tracking).
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}
