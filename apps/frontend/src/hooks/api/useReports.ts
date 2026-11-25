import { useQuery } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';

export interface ReportSummary {
  id: string;
  sessionId: string;
  score: number | null;
  /** Post-run analysis still running: score is null and not final. */
  analysisPending?: boolean;
  summary?: string | null;
  uxFindingsCount?: number | null;
  createdAt: string;
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const data = await apiJson<{ reports?: ReportSummary[] }>('/reports');
      return data.reports ?? [];
    },
    meta: { errorAction: 'refresh your reports' },
  });
}
