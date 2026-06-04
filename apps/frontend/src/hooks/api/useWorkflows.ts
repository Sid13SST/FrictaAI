import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface WorkflowSession {
  id: string;
  projectId: string;
  goal: string | null;
  persona: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export function useWorkflows(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['workflows', projectId],
    queryFn: async () => {
      const res = await apiFetch(`/workflows?projectId=${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch workflows');
      const data = await res.json();
      return data.sessions as WorkflowSession[];
    },
    enabled: !!projectId,
  });
}
