import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

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
      const res = await apiFetch('/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      return data.projects as Project[];
    },
  });
}
