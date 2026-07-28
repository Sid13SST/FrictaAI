import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Project } from './useProjects';

export interface UpdateProjectInput {
  id: string;
  projectName?: string;
  websiteUrl?: string;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, UpdateProjectInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiFetch(`/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      return data.project as Project;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}
