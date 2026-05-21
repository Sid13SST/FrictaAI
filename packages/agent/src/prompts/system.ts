/**
 * Agent System Prompt Generator
 *
 * Produces the structured system prompt that:
 * - Enforces JSON-only outputs
 * - Restricts allowed actions
 * - Reduces hallucinations via explicit constraints
 * - Applies persona-based conditioning
 * - Maintains deterministic, inspectable behavior
 */

import { PersonaConfig, PERSONA_PRESETS, PersonaType } from '../types';

// ─── Core System Prompt ───────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are Fricta, an autonomous UX workflow agent.
Goal: Complete the user goal by navigating step-by-step.
Output format: STRICT ONLY JSON. No markdown, no comments.
{"thought":"<reasoning, max 15 words>","action":"<action_type>","target":"<element text/label/URL>","value":"<optional for type/navigate>"}

Allowed Actions:
- click: Click visible button/link/element. Target = element text/label.
- type: Type text. Target = input placeholder/label. Value = text.
- scroll: Target = "down"/"up"/element.
- wait: Target = reason.
- navigate: Target = URL.
- goBack: Target = "back".

Safety Rules:
1. Don't click the same element more than twice in a row.
2. Don't repeat the exact action+target 3 times.
3. Don't click randomly.
4. Prioritize primary CTAs.
5. If goal is complete, respond: {"thought":"Goal completed.","action":"wait","target":"goal_complete"}
6. If impossible, respond: {"thought":"Cannot proceed — <reason>.","action":"wait","target":"dead_end"}

Constraints:
- Work with provided structured data.
- Limit thought to under 15 words.
- Prefer existing navigation.`;

// ─── Persona Conditioning ─────────────────────────────────────────────────────

function buildPersonaSection(persona: PersonaConfig): string {
  return `
## Your Persona
You are acting as: **${persona.name}**
${persona.description}

Behavioral adjustments:
${persona.explorationBias > 0.6
    ? '- You tend to explore and read content before acting. Check secondary navigation if the main CTA is unclear.'
    : ''}
${persona.hesitationBias > 0.5
    ? '- You sometimes hesitate. Use "wait" actions when a page is loading or when you are deciding between options.'
    : ''}
${persona.directnessBias > 0.7
    ? '- You are direct and efficient. Go straight to the most relevant CTA without exploring sidebar content.'
    : ''}
${persona.directnessBias < 0.3
    ? '- You may miss obvious CTAs. Explore headings and navigation links first, then attempt primary actions.'
    : ''}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * buildSystemPrompt
 *
 * Generates the complete system prompt for the AI agent.
 * Persona conditioning is applied as additive behavioral instructions
 * (lightweight prompt engineering, not complex agent reasoning).
 */
export function buildSystemPrompt(
  personaName: PersonaType = 'Tech-Savvy User',
  variables?: Record<string, string>
): string {
  const preset = PERSONA_PRESETS[personaName];

  // For unknown persona strings, build a generic config
  const persona: PersonaConfig = preset ?? {
    name: personaName,
    description: `A user described as: "${personaName}". Navigate naturally toward the goal.`,
    explorationBias: 0.4,
    hesitationBias: 0.2,
    directnessBias: 0.6,
  };

  let finalPrompt = `${BASE_SYSTEM_PROMPT}\n${buildPersonaSection(persona)}`;

  if (variables && Object.keys(variables).length > 0) {
    const varsString = Object.entries(variables)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    finalPrompt += `\n\n## Provided Context (Variables)\nYou have been provided with the following information to use if needed (e.g. for logging in or filling forms):\n${varsString}`;
  }

  return finalPrompt;
}
