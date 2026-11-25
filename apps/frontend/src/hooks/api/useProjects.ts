import { useQuery } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';

export interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
  createdAt: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const data = await apiJson<{ projects?: Project[] }>('/projects');
      return data.projects ?? [];
    },
    meta: { errorAction: 'refresh your projects' },
  });
}
