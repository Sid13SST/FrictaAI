/**
 * Action Validation Middleware
 *
 * Validates AI-generated action JSON before it reaches the executor.
 * The AI output NEVER executes directly — it must pass through this layer.
 *
 * Validates:
 * - JSON structure (required fields present)
 * - Action type (must be in allowed list)
 * - Target non-emptiness
 * - Repetitive loop detection
 * - Unsafe action patterns
 */

import { ALLOWED_ACTIONS, ActionType, AgentAction, ExecutedAction, ValidationResult } from '../types';

// ─── Unsafe Target Patterns ───────────────────────────────────────────────────
// These targets suggest random clicking or unsafe behavior

const UNSAFE_TARGET_PATTERNS: RegExp[] = [
  /^undefined$/i,
  /^null$/i,
  /^none$/i,
  /^element$/i,
  /^click here$/i,
  /^\[object/i,
];

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * validateAction
 *
 * Validates a raw parsed object (from AI JSON output) as a valid AgentAction.
 * Also checks against recent action history for loop detection.
 *
 * @param raw - The parsed (but unvalidated) AI output object
 * @param recentActions - Sliding window of recent executed actions for loop detection
 * @param loopDetectionWindow - How many steps back to check for repeated patterns
 */
export function validateAction(
  raw: unknown,
  recentActions: ExecutedAction[] = [],
  loopDetectionWindow = 5
): ValidationResult {

  // ── Type Guard ──────────────────────────────────────────────────────────────

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'AI output is not a valid JSON object' };
  }

  const obj = raw as Record<string, unknown>;

  // ── Required Fields ─────────────────────────────────────────────────────────

  if (typeof obj.action !== 'string' || !obj.action) {
    return { valid: false, error: 'Missing required field: "action"' };
  }

  if (typeof obj.target !== 'string' || !obj.target.trim()) {
    return { valid: false, error: 'Missing or empty required field: "target"' };
  }

  // ── Action Type Whitelist ───────────────────────────────────────────────────

  const action = obj.action.trim().toLowerCase() as ActionType;
  if (!ALLOWED_ACTIONS.includes(action)) {
    return {
      valid: false,
      error: `Invalid action type: "${obj.action}". Allowed: ${ALLOWED_ACTIONS.join(', ')}`,
    };
  }

  // ── Target Safety ───────────────────────────────────────────────────────────

  const target = obj.target.toString().trim();

  for (const pattern of UNSAFE_TARGET_PATTERNS) {
    if (pattern.test(target)) {
      return {
        valid: false,
        error: `Unsafe or invalid target: "${target}"`,
      };
    }
  }

  // ── Value Validation (optional field) ──────────────────────────────────────

  const value =
    obj.value !== undefined && obj.value !== null
      ? String(obj.value).trim()
      : undefined;

  // 'type' action requires a non-empty value
  if (action === 'type' && (!value || value.length === 0)) {
    return {
      valid: false,
      error: '"type" action requires a non-empty "value" field (the text to type)',
    };
  }

  // 'navigate' action requires a URL-like value
  if (action === 'navigate') {
    const url = value || target;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      return {
        valid: false,
        error: `"navigate" action requires a valid URL. Got: "${url}"`,
      };
    }
  }

  // ── Loop Detection ──────────────────────────────────────────────────────────

  const window = recentActions.slice(-loopDetectionWindow);
  const matchingRecent = window.filter(
    (a) => a.action === action && a.target === target
  );

  if (matchingRecent.length >= 3) {
    return {
      valid: false,
      error: `Loop detected: "${action}" on "${target}" has been attempted ${matchingRecent.length} times recently`,
    };
  }

  // ── Special State Actions ───────────────────────────────────────────────────
  // These are terminal signals from the AI — always valid

  if (action === 'wait' && (target === 'goal_complete' || target === 'dead_end')) {
    return {
      valid: true,
      sanitized: { action, target, value: undefined },
    };
  }

  // ── All Checks Passed ───────────────────────────────────────────────────────

  return {
    valid: true,
    sanitized: {
      action,
      target,
      value: value || undefined,
    },
  };
}

/**
 * parseAndValidate
 *
 * Attempts to parse a raw AI response string as JSON, then validates it.
 * Handles common AI output issues: markdown fences, trailing text, etc.
 *
 * Returns ValidationResult with parsed + sanitized action or an error.
 */
export function parseAndValidate(
  rawResponse: string,
  recentActions: ExecutedAction[] = [],
  loopDetectionWindow = 5
): ValidationResult & { thought?: string } {
  let cleaned = rawResponse.trim();

  // Strip markdown code fences if present (```json ... ```)
  const codeFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeFenceMatch) {
    cleaned = codeFenceMatch[1].trim();
  }

  // Extract the first JSON object from the string
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { valid: false, error: `No JSON object found in AI response: "${cleaned.slice(0, 100)}"` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    return { valid: false, error: `JSON parse error: ${err.message}` };
  }

  const thought =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? String((parsed as any).thought ?? '')
      : '';

  const result = validateAction(parsed, recentActions, loopDetectionWindow);

  return { ...result, thought };
}
