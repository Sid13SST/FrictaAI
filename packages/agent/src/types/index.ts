/**
 * @fricta/agent — Type Definitions
 * Core types for the autonomous AI workflow agent.
 */

// ─── Action Types ────────────────────────────────────────────────────────────

export type ActionType =
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'navigate'
  | 'goBack';

export const ALLOWED_ACTIONS: ActionType[] = [
  'click',
  'type',
  'scroll',
  'wait',
  'navigate',
  'goBack',
];

export interface AgentAction {
  action: ActionType;
  target: string;
  value?: string; // used for 'type' (text to type) and 'navigate' (URL)
}

export interface AgentDecision {
  thought: string;
  action: ActionType;
  target: string;
  value?: string;
}

export type ActionStatus = 'pending' | 'success' | 'failed' | 'skipped' | 'invalid';

export interface ExecutedAction extends AgentDecision {
  status: ActionStatus;
  errorMessage?: string;
  stepNumber: number;
  timestamp: Date;
}

// ─── Persona Types ────────────────────────────────────────────────────────────

export type PersonaType =
  | 'Confused Beginner'
  | 'Tech-Savvy User'
  | 'Impatient User'
  | 'Casual Explorer'
  | string; // allow custom personas

export interface PersonaConfig {
  name: PersonaType;
  description: string;
  explorationBias: number;   // 0-1: higher = explores more before acting
  hesitationBias: number;    // 0-1: higher = adds wait/retry behavior
  directnessBias: number;    // 0-1: higher = goes straight to goal
}

export const PERSONA_PRESETS: Record<string, PersonaConfig> = {
  'Confused Beginner': {
    name: 'Confused Beginner',
    description: 'A first-time user unfamiliar with the interface. Explores cautiously, reads content carefully, and may retry or backtrack when confused.',
    explorationBias: 0.8,
    hesitationBias: 0.6,
    directnessBias: 0.2,
  },
  'Tech-Savvy User': {
    name: 'Tech-Savvy User',
    description: 'An experienced user who knows modern web conventions. Goes directly to the goal with minimal exploration.',
    explorationBias: 0.2,
    hesitationBias: 0.1,
    directnessBias: 0.9,
  },
  'Impatient User': {
    name: 'Impatient User',
    description: 'A user in a hurry. Skips reading, clicks the most prominent visible element, and gives up quickly if blocked.',
    explorationBias: 0.1,
    hesitationBias: 0.0,
    directnessBias: 0.95,
  },
  'Casual Explorer': {
    name: 'Casual Explorer',
    description: 'A curious user who browses without urgency. Reads content, checks secondary navigation, and explores tangential paths.',
    explorationBias: 0.9,
    hesitationBias: 0.3,
    directnessBias: 0.4,
  },
};

// ─── Loop Config ──────────────────────────────────────────────────────────────

export interface LoopConfig {
  maxSteps: number;           // Hard cap on loop iterations (default: 30)
  maxRetries: number;         // Max consecutive failures before abort (default: 3)
  loopDetectionWindow: number;// Steps to look back for repeated action (default: 5)
  stepTimeoutMs: number;      // Max ms per step before timeout (default: 30_000)
  totalTimeoutMs: number;     // Max total session ms (default: 300_000 = 5min)
}

export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxSteps: 30,
  maxRetries: 3,
  loopDetectionWindow: 5,
  stepTimeoutMs: 60_000,   // 60s: MCP extraction + AI call + action can take ~20-40s
  totalTimeoutMs: 600_000, // 10 min total
};

// ─── Loop State ───────────────────────────────────────────────────────────────

export interface AgentLoopState {
  sessionId: string;
  goal: string;
  persona: PersonaConfig;
  currentStep: number;
  consecutiveFailures: number;
  startedAt: Date;
  recentActions: ExecutedAction[];  // sliding window for loop detection
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'loop_detected';
}

// ─── Loop Events ──────────────────────────────────────────────────────────────

export interface AgentLoopEvents {
  onThought?: (thought: string, step: number) => void | Promise<void>;
  onAction?: (action: ExecutedAction) => void | Promise<void>;
  onStep?: (step: number, state: AgentLoopState) => void | Promise<void>;
  onComplete?: (state: AgentLoopState) => void | Promise<void>;
  onError?: (error: Error, state: AgentLoopState) => void | Promise<void>;
}

// ─── AI Provider Types ────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Validation Types ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: AgentAction;
}
