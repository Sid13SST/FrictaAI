import { useQueries, useQuery } from '@tanstack/react-query';
import { apiJson } from '../../lib/api';
import type { Project } from './useProjects';

export interface WorkflowSession {
  id: string;
  projectId: string;
  goal: string | null;
  persona: string | null;
  /** Usually PENDING | RUNNING | COMPLETED | FAILED; the runtime can also emit
   *  QUEUED, TIMEOUT, LOOP_DETECTED and CANCELLED, so this stays a plain string. */
  status: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

const ACTIVE = new Set(['PENDING', 'QUEUED', 'RUNNING']);
export const isActiveWorkflow = (w: Pick<WorkflowSession, 'status'>) => ACTIVE.has(w.status);

/** While any audit is queued/running, re-poll so lists update without a manual refresh. */
const ACTIVE_POLL_MS = 5000;

async function fetchWorkflows(projectId: string) {
  const data = await apiJson<{ sessions?: WorkflowSession[] }>(`/workflows?projectId=${encodeURIComponent(projectId)}`);
  return data.sessions ?? [];
}

export function useWorkflows(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['workflows', projectId],
    queryFn: () => fetchWorkflows(projectId!),
    enabled: !!projectId,
    refetchInterval: q => (q.state.data?.some(isActiveWorkflow) ? ACTIVE_POLL_MS : false),
    meta: { errorAction: 'refresh your audits' },
  });
}

export interface WorkflowWithProject extends WorkflowSession {
  projectName: string;
}

/** Dashboard only needs a recent slice; cap the fan-out for accounts with many projects. */
const MAX_PROJECTS_FOR_OVERVIEW = 8;

/**
 * Audits across the user's projects, newest first. The API lists audits per
 * project, so this fans out one (cached, shared-key) query per project.
 */
export function useAllWorkflows(projects: Project[] | undefined) {
  const scoped = (projects ?? []).slice(0, MAX_PROJECTS_FOR_OVERVIEW);

  return useQueries({
    queries: scoped.map(p => ({
      queryKey: ['workflows', p.id],
      queryFn: () => fetchWorkflows(p.id),
      refetchInterval: (q: { state: { data?: WorkflowSession[] } }) =>
        (q.state.data?.some(isActiveWorkflow) ? ACTIVE_POLL_MS : false) as number | false,
      meta: { errorAction: 'refresh your audits' },
    })),
    combine: results => {
      const workflows: WorkflowWithProject[] = [];
      results.forEach((r, i) => {
        (r.data ?? []).forEach(w => workflows.push({ ...w, projectName: scoped[i].projectName }));
      });
      workflows.sort((a, b) =>
        new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime());
      const failed = results.find(r => r.isError);
      return {
        workflows,
        isLoading: scoped.length > 0 && results.some(r => r.isLoading),
        // Only a hard error if nothing at all could be loaded.
        isError: scoped.length > 0 && results.every(r => r.isError),
        error: failed?.error ?? null,
        refetch: () => { results.forEach(r => { void r.refetch(); }); },
      };
    },
  });
}
