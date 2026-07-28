import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Globe, ArrowLeft, Pencil, Trash2, Plus, Activity, CheckCircle2,
  Clock, ArrowRight, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useProject } from '../hooks/api/useProject';
import { useWorkflows } from '../hooks/api/useWorkflows';
import { useDeleteProject } from '../hooks/api/useDeleteProject';

// ─── Workflow status badge (mirrors Dashboard.tsx) ─────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = {
    RUNNING:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', dot: '#f59e0b', label: 'Running'   },
    PENDING:   { bg: 'rgba(115,66,226,0.1)',  color: '#9B72FA', dot: '#7342E2', label: 'Queued'    },
    COMPLETED: { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', dot: '#10b981', label: 'Done'      },
    FAILED:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', dot: '#ef4444', label: 'Failed'    },
  }[status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', dot: '#555', label: status };

  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80` }} />
      {cfg.label}
    </span>
  );
};

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(id);
  const deleteProject = useDeleteProject();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteError(null);
    try {
      await deleteProject.mutateAsync(id);
      navigate('/app/projects');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center px-8 py-10 rounded-2xl max-w-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Project not found</h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            It may have been deleted, or you don't have access to it.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 transition-colors hover:text-white"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = workflows?.length || 0;
  const completed = workflows?.filter((w) => w.status === 'COMPLETED').length || 0;
  const running = workflows?.filter((w) => w.status === 'RUNNING' || w.status === 'PENDING').length || 0;
  const failed = workflows?.filter((w) => w.status === 'FAILED').length || 0;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: 'rgba(115,66,226,0.8)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> All Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)' }}>
            <Globe className="w-5 h-5" style={{ color: '#9B72FA' }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">{project.projectName}</h1>
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white max-w-full"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <span className="truncate">{project.websiteUrl}</span> <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/app/workflow?projectId=${project.id}`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 24px rgba(115,66,226,0.25)' }}
          >
            <Plus className="w-3.5 h-3.5" /> New Audit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-400 transition-colors flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Audits', value: total, icon: <Activity className="w-4 h-4" />, color: '#9B72FA' },
          { label: 'Completed', value: completed, icon: <CheckCircle2 className="w-4 h-4" />, color: '#10b981' },
          { label: 'Active', value: running, icon: <Clock className="w-4 h-4" />, color: '#f59e0b' },
          { label: 'Failed', value: failed, icon: <AlertTriangle className="w-4 h-4" />, color: '#f87171' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Audits list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <h2 className="text-sm font-bold text-white">Audits</h2>
        </div>

        {workflowsLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
          </div>
        ) : !workflows || workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(115,66,226,0.08)', border: '1px solid rgba(115,66,226,0.2)' }}>
              <Activity className="w-6 h-6" style={{ color: 'rgba(115,66,226,0.6)' }} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No audits yet</p>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Run your first audit against this project.</p>
            <button
              onClick={() => navigate(`/app/workflow?projectId=${project.id}`)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
              style={{ background: 'rgba(115,66,226,0.15)', border: '1px solid rgba(115,66,226,0.3)' }}
            >
              Run First Audit
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {workflows.map((w) => {
              const target = w.status === 'COMPLETED' ? `/app/reports/${w.id}` : `/app/monitor/${w.id}`;
              return (
                <div
                  key={w.id}
                  onClick={() => navigate(target)}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-200 group"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{w.goal || 'UX Audit'}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {w.persona ? `${w.persona} · ` : ''}
                      {new Date(w.startedAt || w.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={w.status} />
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" style={{ color: '#9B72FA' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#0d0d0f', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">Delete "{project.projectName}"?</h2>
            <p className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              This permanently deletes the project and all associated audits, reports, and findings. This cannot be undone.
            </p>
            {deleteError && <p className="text-xs text-red-400 mb-4">{deleteError}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-300 transition-colors hover:text-white"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
                style={{ background: 'rgba(239,68,68,0.85)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
