import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiJson(`/projects/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    // Rendered inline by the confirmation dialog that triggered it.
    meta: { silentError: true },
  });
}
