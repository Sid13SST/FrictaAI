import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';
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
      const data = await apiJson<{ project: Project }>(`/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return data.project;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
    // Rendered inline by the form that triggered it.
    meta: { silentError: true },
  });
}
