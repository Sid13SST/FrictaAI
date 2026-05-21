/**
 * MCP Context → Compact Prompt Formatter
 *
 * Converts structured MCPContext into a token-efficient text representation
 * for the AI decision engine. Avoids large DOM dumps, truncates where needed,
 * and presents only the information the AI needs to decide its next action.
 */

import { MCPContext } from '@fricta/types';
import { ExecutedAction } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BUTTONS = 10;
const MAX_LINKS = 10;
const MAX_INPUTS = 8;
const MAX_HEADINGS = 5;
const MAX_HISTORY = 4; // recent action history steps

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateText(text: string, maxLen = 80): string {
  if (!text) return '';
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function formatList(items: string[], prefix: string): string {
  if (items.length === 0) return `${prefix}: none`;
  return `${prefix}:\n${items.map((t) => `  - ${t}`).join('\n')}`;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * buildContextPrompt
 *
 * Produces the user-turn message containing:
 * 1. Current page metadata (URL, title, headings)
 * 2. Available interactive elements (buttons, inputs, links)
 * 3. Action history (last N steps)
 * 4. The workflow goal
 *
 * Designed to be compact — no raw HTML, no verbose metadata.
 */
export function buildContextPrompt(
  goal: string,
  context: MCPContext,
  actionHistory: ExecutedAction[]
): string {
  const { currentPage, history } = context;

  // ── Page Elements ───────────────────────────────────────────────────────────

  const buttonTexts = currentPage.buttons
    .filter((b) => b.visible)
    .slice(0, MAX_BUTTONS)
    .map((b) => {
      const label = b.text || b.ariaLabel || b.title || b.id || b.name || 'unlabeled-button';
      const meta: string[] = [];
      if (b.intent && b.intent !== 'neutral') meta.push(`intent: ${b.intent}`);
      if (b.containerType && b.containerType !== 'none') {
        meta.push(`container: ${b.containerType}${b.containerId ? ` (${b.containerId})` : ''}`);
      }
      if (!b.text && (b.ariaLabel || b.title)) {
        meta.push(`icon-only${b.ariaLabel ? ` [aria-label="${b.ariaLabel}"]` : ''}`);
      }
      const metaStr = meta.length > 0 ? ` [${meta.join(', ')}]` : '';
      return `${truncateText(label)}${metaStr}`;
    });

  const linkTexts = currentPage.links
    .filter((l) => l.visible)
    .slice(0, MAX_LINKS)
    .map((l) => {
      const label = l.text || l.ariaLabel || l.title || l.id || l.name || l.href || 'unlabeled-link';
      const meta: string[] = [];
      if (l.href) meta.push(`href: ${l.href}`);
      if (l.containerType && l.containerType !== 'none') {
        meta.push(`container: ${l.containerType}${l.containerId ? ` (${l.containerId})` : ''}`);
      }
      const metaStr = meta.length > 0 ? ` [${meta.join(', ')}]` : '';
      return `${truncateText(label)}${metaStr}`;
    });

  const inputTexts = currentPage.inputs
    .filter((i) => i.visible && !i.disabled)
    .slice(0, MAX_INPUTS)
    .map((i) => {
      const label = i.ariaLabel || i.placeholder || i.name || i.id || i.title || i.text || 'unlabeled-input';
      const meta: string[] = [];
      if (i.type) meta.push(`type: ${i.type}`);
      if (i.name) meta.push(`name: ${i.name}`);
      if (i.placeholder) meta.push(`placeholder: ${i.placeholder}`);
      if (i.containerType && i.containerType !== 'none') {
        meta.push(`container: ${i.containerType}${i.containerId ? ` (${i.containerId})` : ''}`);
      }
      const metaStr = meta.length > 0 ? ` [${meta.join(', ')}]` : '';
      return `${truncateText(label)}${metaStr}`;
    });

  const headingTexts = currentPage.headings
    .filter((h) => h.visible && h.text)
    .slice(0, MAX_HEADINGS)
    .map((h) => truncateText(h.text));

  // ── Recent Action History ───────────────────────────────────────────────────

  const recentSteps = actionHistory.slice(-MAX_HISTORY);
  const historySection =
    recentSteps.length === 0
      ? 'No actions taken yet.'
      : recentSteps
          .map(
            (a, i) =>
              `Step ${a.stepNumber}: [${a.action}] target="${a.target}"${
                a.value ? ` value="${a.value}"` : ''
              } → ${a.status}${a.errorMessage ? ` (${a.errorMessage})` : ''}`
          )
          .join('\n');

  // ── MCP Interaction History (navigation trail) ──────────────────────────────

  const navTrail = history
    .slice(-5)
    .map((h) => `${h.type}: ${truncateText(h.target, 60)}`)
    .join(' → ');

  // ── Compose ──────────────────────────────────────────────────────────────────

  return `## WORKFLOW GOAL
${goal}

## CURRENT PAGE
URL: ${currentPage.url}
Title: ${currentPage.title || 'Untitled'}
Navigation trail: ${navTrail || 'Start of session'}

## PAGE CONTENT
${formatList(headingTexts, 'Headings')}

${formatList(buttonTexts, 'Buttons')}

${formatList(linkTexts, 'Links')}

${formatList(inputTexts, 'Input Fields')}

## ACTION HISTORY
${historySection}

## TASK
Based on the page above and your action history, decide the single best next action to make progress toward the goal.
Respond ONLY with the JSON object — no other text.`;
}
