import { useQuery } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';
import { Project } from './useProjects';

export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const data = await apiJson<{ project: Project }>(`/projects/${id}`);
      return data.project;
    },
    enabled: !!id,
    meta: { errorAction: 'refresh this project' },
  });
}
