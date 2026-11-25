import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';

export interface CreateProjectInput {
  projectName: string;
  websiteUrl: string;
}

export interface CreatedProject {
  id: string;
  projectName: string;
  websiteUrl: string;
  createdAt: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<CreatedProject, Error, CreateProjectInput>({
    mutationFn: async (input) => {
      const data = await apiJson<{ project: CreatedProject }>('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return data.project;
    },
    onSuccess: () => {
      // Refresh projects list after creation
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    // Rendered inline by the form that triggered it.
    meta: { silentError: true },
  });
}
