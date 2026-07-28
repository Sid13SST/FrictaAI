import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
