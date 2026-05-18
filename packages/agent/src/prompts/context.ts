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

const MAX_BUTTONS = 15;
const MAX_LINKS = 15;
const MAX_INPUTS = 10;
const MAX_HEADINGS = 8;
const MAX_HISTORY = 10; // recent action history steps

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
    .filter((b) => b.visible && b.text)
    .slice(0, MAX_BUTTONS)
    .map((b) => truncateText(b.text));

  const linkTexts = currentPage.links
    .filter((l) => l.visible && l.text)
    .slice(0, MAX_LINKS)
    .map((l) => truncateText(l.text));

  const inputTexts = currentPage.inputs
    .filter((i) => i.visible && !i.disabled)
    .slice(0, MAX_INPUTS)
    .map((i) => truncateText(i.text || 'unlabeled-input'));

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
