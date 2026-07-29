import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Pencil, Trash2, ArrowRight, FolderKanban, X, Loader2, AlertTriangle } from 'lucide-react';
import { useProjects, Project } from '../hooks/api/useProjects';
import { useCreateProject } from '../hooks/api/useCreateProject';
import { useUpdateProject } from '../hooks/api/useUpdateProject';
import { useDeleteProject } from '../hooks/api/useDeleteProject';

// ─── Project form modal (create / edit) ────────────────────────────────────
interface ProjectFormModalProps {
  initial?: Project | null;
  onClose: () => void;
}

const ProjectFormModal = ({ initial, onClose }: ProjectFormModalProps) => {
  const isEdit = !!initial;
  const [projectName, setProjectName] = useState(initial?.projectName ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const pending = createProject.isPending || updateProject.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectName.trim() || !websiteUrl.trim()) {
      setError('Project name and website URL are required.');
      return;
    }
    try {
      if (isEdit && initial) {
        await updateProject.mutateAsync({ id: initial.id, projectName, websiteUrl });
      } else {
        await createProject.mutateAsync({ projectName, websiteUrl });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">{isEdit ? 'Edit Project' : 'New Project'}</h2>
        <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {isEdit ? 'Update project details.' : 'Add a website to start running UX audits against it.'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Project Name
            </label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Acme Marketing Site"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Website URL
            </label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-300 transition-colors hover:text-white"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 24px rgba(115,66,226,0.25)' }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Delete confirmation modal ──────────────────────────────────────────────
const DeleteConfirmModal = ({ project, onClose }: { project: Project; onClose: () => void }) => {
  const deleteProject = useDeleteProject();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteProject.mutateAsync(project.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
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
        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-300 transition-colors hover:text-white"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteProject.isPending}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'rgba(239,68,68,0.85)' }}
          >
            {deleteProject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Projects Page ─────────────────────────────────────────────────────
export const Projects = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = (projects || []).filter((p) =>
    !search.trim() ||
    p.projectName.toLowerCase().includes(search.trim().toLowerCase()) ||
    p.websiteUrl.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center px-8 py-10 rounded-2xl max-w-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Failed to load projects</h3>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 transition-colors hover:text-white"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Websites you're running UX audits against.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300 hover:scale-105 self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 24px rgba(115,66,226,0.25)' }}
        >
          <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" />
          New Project
        </button>
      </div>

      {projects && projects.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full max-w-sm px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      )}

      {!projects || projects.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center py-24 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)' }}
          >
            <FolderKanban className="w-7 h-7" style={{ color: '#9B72FA' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
          <p className="text-sm max-w-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Create a project to organize audits, reports, and findings for a website.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 32px rgba(115,66,226,0.3)' }}
          >
            <Plus className="w-4 h-4" /> Create Your First Project
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm py-16 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No projects match "{search}".
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/app/projects/${p.id}`)}
              className="group relative rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(115,66,226,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.2)' }}
                >
                  <Globe className="w-4.5 h-4.5" style={{ color: '#9B72FA' }} />
                </div>
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditTarget(p); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    title="Edit project"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white mb-1 truncate">{p.projectName}</h3>
              <p className="text-xs truncate mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.websiteUrl}</p>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Created {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: '#9B72FA' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ProjectFormModal onClose={() => setShowCreate(false)} />}
      {editTarget && <ProjectFormModal initial={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteConfirmModal project={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
};
