import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

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
      const res = await apiFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      return data.project as CreatedProject;
    },
    onSuccess: () => {
      // Refresh projects list after creation
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
