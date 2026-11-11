import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toApiError } from './errors';
import { toast } from './toast';

/**
 * `meta.silentError: true` opts a query/mutation out of the global error toast.
 * Use it where the failure is already rendered inline next to the control that
 * caused it (form modals) or by a dedicated live-status indicator (polling).
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { silentError?: boolean; errorAction?: string };
    mutationMeta: { silentError?: boolean; errorAction?: string };
  }
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silentError) return;
        // First-load failures are rendered in place by <ErrorState>. A toast is
        // only needed when a background refetch fails and the page is still
        // showing the previous (now possibly stale) data.
        if (query.state.data === undefined) return;
        toast.error(error, query.meta?.errorAction);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silentError) return;
        toast.error(error, mutation.meta?.errorAction);
      },
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Retrying a 401/403/404/400 just delays the error state.
        retry: (failureCount, error) => {
          const { kind } = toApiError(error);
          const transient = kind === 'NETWORK' || kind === 'TIMEOUT' || kind === 'SERVER'
            || kind === 'DATABASE' || kind === 'UNAVAILABLE' || kind === 'UNKNOWN';
          return transient && failureCount < 1;
        },
      },
    },
  });
}
