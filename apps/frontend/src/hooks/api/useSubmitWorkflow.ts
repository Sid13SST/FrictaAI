import { useMutation } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';

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
    mutationFn: (input) =>
      apiJson<WorkflowSubmitResult>('/agent/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    // Rendered inline on the wizard's launch step.
    meta: { silentError: true },
  });
}
