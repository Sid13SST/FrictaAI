import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface WorkflowSubmitInput {
  projectId: string;
  url: string;
  goal: string;
  persona: string;
  variables?: Record<string, string>;
}

export interface WorkflowSubmitResult {
  workflowId: string;
  sessionId: string;
  model: string;
  goal: string;
  persona: string;
  message?: string;
}

export function useSubmitWorkflow() {
  return useMutation<WorkflowSubmitResult, Error, WorkflowSubmitInput>({
    mutationFn: async (input) => {
      const res = await apiFetch('/agent/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.error ?? `Submission failed (${res.status})`);
      }
      return res.json() as Promise<WorkflowSubmitResult>;
    },
  });
}
