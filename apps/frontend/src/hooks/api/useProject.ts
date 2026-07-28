import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Project } from './useProjects';

export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await apiFetch(`/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      return data.project as Project;
    },
    enabled: !!id,
  });
}
