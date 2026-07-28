import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Globe, Plus, ChevronRight, ChevronDown, ChevronUp,
  Loader2, ArrowRight, Zap, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { useProjects } from '../hooks/api/useProjects';
import { useCreateProject } from '../hooks/api/useCreateProject';
import { useSubmitWorkflow } from '../hooks/api/useSubmitWorkflow';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function isValidUrl(raw: string): boolean {
  const s = raw.trim();
  return /^https?:\/\/.+/.test(s) || /^localhost(:\d+)?(\/.*)?$/.test(s);
}

function normalizeUrl(raw: string): string {
  let s = raw.trim().replace(/\/+$/, ''); // strip trailing slashes
  if (!/^https?:\/\//i.test(s)) {
    s = /^localhost/i.test(s) ? `http://${s}` : `https://${s}`;
  }
  return s;
}

// ─── Design atoms ─────────────────────────────────────────────────────────────

const inputBase =
  'w-full text-sm text-white placeholder-zinc-600 px-3.5 py-2.5 rounded-xl transition-all focus:outline-none';
const inputStyle = {
  background: 'rgba(9,9,11,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[11px] font-bold uppercase tracking-widest font-mono mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
    {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="flex items-center gap-1 text-xs text-rose-400 mt-1.5">
      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {msg}
    </p>
  ) : null;

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepBar = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-3 mb-8">
    {[1, 2].map((n) => {
      const done = n < step;
      const active = n === step;
      return (
        <React.Fragment key={n}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={{
                background: done ? '#7342E2' : active ? 'rgba(115,66,226,0.15)' : 'rgba(255,255,255,0.05)',
                border: done || active ? '1px solid rgba(115,66,226,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: done || active ? (done ? '#fff' : '#9B72FA') : 'rgba(255,255,255,0.3)',
              }}
            >
              {done ? <CheckCircle className="w-3.5 h-3.5" /> : n}
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: active ? '#fff' : done ? 'rgba(115,66,226,0.8)' : 'rgba(255,255,255,0.3)' }}
            >
              {n === 1 ? 'Select Project' : 'Configure Audit'}
            </span>
          </div>
          {n < 2 && (
            <div
              className="flex-1 h-px transition-all duration-500"
              style={{ background: step > 1 ? 'rgba(115,66,226,0.4)' : 'rgba(255,255,255,0.06)' }}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Project radio card ───────────────────────────────────────────────────────

const ProjectCard = ({
  project, selected, onClick,
}: { project: Project; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-4 rounded-2xl transition-all duration-200 relative group"
    style={{
      background: selected ? 'rgba(115,66,226,0.1)' : 'rgba(255,255,255,0.02)',
      border: selected ? '1px solid rgba(115,66,226,0.45)' : '1px solid rgba(255,255,255,0.06)',
      boxShadow: selected ? '0 0 24px rgba(115,66,226,0.12)' : 'none',
    }}
  >
    {selected && (
      <div className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#7342E2' }}>
        <CheckCircle className="w-3 h-3 text-white" />
      </div>
    )}
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105"
      style={{
        background: selected ? 'rgba(115,66,226,0.15)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1px solid rgba(115,66,226,0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Globe className="w-4 h-4" style={{ color: selected ? '#9B72FA' : 'rgba(255,255,255,0.4)' }} />
    </div>
    <p className="text-sm font-bold text-white leading-tight truncate pr-6">{project.projectName}</p>
    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{project.websiteUrl}</p>
  </button>
);

// ─── Create project inline form ───────────────────────────────────────────────

const CreateProjectForm = ({
  isPending, error, onCancel, showCancel,
  onSubmit,
}: {
  isPending: boolean;
  error?: string;
  showCancel: boolean;
  onCancel: () => void;
  onSubmit: (name: string, url: string) => void;
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [errs, setErrs] = useState<{ name?: string; url?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrs: { name?: string; url?: string } = {};
    if (!name.trim() || name.trim().length < 2) newErrs.name = 'Project name is required (min 2 characters)';
    if (!isValidUrl(url)) newErrs.url = 'Enter a valid URL (e.g. https://yoursite.com)';
    if (Object.keys(newErrs).length > 0) { setErrs(newErrs); return; }
    setErrs({});
    onSubmit(name.trim(), normalizeUrl(url));
  };

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(115,66,226,0.05)', border: '1px solid rgba(115,66,226,0.2)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">New Project</p>
        {showCancel && (
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <FieldLabel required>Project Name</FieldLabel>
          <input
            className={inputBase}
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. My SaaS App"
            onFocus={e => (e.target.style.borderColor = 'rgba(115,66,226,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <FieldError msg={errs.name} />
        </div>

        <div>
          <FieldLabel required>Website URL</FieldLabel>
          <input
            className={inputBase}
            style={inputStyle}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            onFocus={e => (e.target.style.borderColor = 'rgba(115,66,226,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <FieldError msg={errs.url} />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-rose-400 px-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7342E2,#8b5cf6)', boxShadow: '0 0 24px rgba(115,66,226,0.2)' }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isPending ? 'Creating…' : 'Save Project'}
        </button>
      </form>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const WorkflowRunner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get('projectId') || '';

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Step 2 fields
  const [targetUrl, setTargetUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [persona, setPersona] = useState('Tech-Savvy User');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [variablesInput, setVariablesInput] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();
  const submitWorkflow = useSubmitWorkflow();

  // Show create form immediately if no projects exist after load
  useEffect(() => {
    if (!projectsLoading && projects && projects.length === 0) {
      setShowCreateForm(true);
    }
  }, [projectsLoading, projects]);

  // Pre-fill URL when project is selected
  useEffect(() => {
    if (selectedProjectId && projects) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) setTargetUrl(proj.websiteUrl);
    }
  }, [selectedProjectId, projects]);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // ── Step 1 handlers ────────────────────────────────────────────────────────

  const handleCreateProject = async (name: string, url: string) => {
    try {
      const project = await createProject.mutateAsync({ projectName: name, websiteUrl: url });
      setSelectedProjectId(project.id);
      setTargetUrl(project.websiteUrl);
      setShowCreateForm(false);
      setErrors({});
      setStep(2);
    } catch {
      // error shown inside CreateProjectForm via error prop
    }
  };

  const handleStep1Continue = () => {
    if (!selectedProjectId) {
      setErrors({ project: 'Please select a project or create a new one' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  // ── Step 2 handlers ────────────────────────────────────────────────────────

  const handleLaunch = async () => {
    const newErrors: Record<string, string> = {};
    if (!isValidUrl(targetUrl)) {
      newErrors.targetUrl = 'Enter a valid URL (e.g. https://yoursite.com)';
    }
    if (!goal.trim() || goal.trim().length < 10) {
      newErrors.goal = 'Describe what the AI agent should do (at least 10 characters)';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Parse variables
    const variables: Record<string, string> = {};
    variablesInput.split('\n').forEach(line => {
      const [k, ...rest] = line.split('=');
      if (k?.trim() && rest.length > 0) variables[k.trim()] = rest.join('=').trim();
    });

    try {
      const result = await submitWorkflow.mutateAsync({
        projectId: selectedProjectId,
        url: normalizeUrl(targetUrl),
        goal: goal.trim(),
        persona,
        ...(Object.keys(variables).length > 0 ? { variables } : {}),
      });

      navigate(`/app/monitor/${result.workflowId}`, {
        state: {
          projectName: selectedProject?.projectName ?? '',
          goal: goal.trim(),
          model: result.model,
          persona,
        },
      });
    } catch {
      // submitWorkflow.error will be set automatically
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-0 animate-in fade-in duration-300">

      {/* Page header */}
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{ background: 'rgba(115,66,226,0.08)', border: '1px solid rgba(115,66,226,0.2)', color: '#9B72FA' }}
        >
          <Zap className="w-3 h-3" /> Workflow Auditor
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Launch an Audit</h1>
        <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Configure your project and audit goal. An AI agent will handle the rest.
        </p>
      </div>

      {/* Wizard card */}
      <div
        className="rounded-3xl p-8"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(115,66,226,0.06), transparent 60%), rgba(9,9,11,0.8)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <StepBar step={step} />

        {/* ── Step 1: Project Selection ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Select a Project</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Choose an existing project or create a new one to audit.
              </p>
            </div>

            {projectsLoading ? (
              /* Skeleton */
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Existing projects grid */}
                {projects && projects.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.slice(0, 4).map(p => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        selected={selectedProjectId === p.id && !showCreateForm}
                        onClick={() => { setSelectedProjectId(p.id); setShowCreateForm(false); setErrors({}); }}
                      />
                    ))}
                    {/* Create new card */}
                    <button
                      onClick={() => { setShowCreateForm(true); setSelectedProjectId(''); setErrors({}); }}
                      className="p-4 rounded-2xl text-left transition-all duration-200 group"
                      style={{
                        background: showCreateForm ? 'rgba(115,66,226,0.08)' : 'rgba(255,255,255,0.01)',
                        border: showCreateForm ? '1px solid rgba(115,66,226,0.35)' : '1px dashed rgba(255,255,255,0.12)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105"
                        style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)' }}
                      >
                        <Plus className="w-4 h-4" style={{ color: '#9B72FA' }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: '#9B72FA' }}>New Project</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Add a website to audit</p>
                    </button>
                  </div>
                )}

                {/* Inline create form */}
                {showCreateForm && (
                  <CreateProjectForm
                    isPending={createProject.isPending}
                    error={createProject.error?.message}
                    showCancel={!!projects && projects.length > 0}
                    onCancel={() => { setShowCreateForm(false); }}
                    onSubmit={handleCreateProject}
                  />
                )}

                {/* Project selection error */}
                <FieldError msg={errors.project} />
              </div>
            )}

            {/* Continue button — only shown if not creating a new project */}
            {!showCreateForm && (
              <button
                id="step1-continue-btn"
                onClick={handleStep1Continue}
                disabled={!selectedProjectId}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg,#7342E2,#8b5cf6)', boxShadow: '0 0 32px rgba(115,66,226,0.25)' }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ── Step 2: Audit Configuration ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Configure Your Audit</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Tell the AI agent what to do and on which URL.
              </p>
            </div>

            {/* Selected project pill */}
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(115,66,226,0.08)', border: '1px solid rgba(115,66,226,0.2)' }}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" style={{ color: '#9B72FA' }} />
                <div>
                  <p className="text-xs font-bold text-white">{selectedProject?.projectName}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedProject?.websiteUrl}</p>
                </div>
              </div>
              <button
                onClick={() => { setStep(1); setErrors({}); }}
                className="text-xs font-semibold transition-colors hover:text-white"
                style={{ color: 'rgba(115,66,226,0.7)' }}
              >
                Change
              </button>
            </div>

            {/* Target URL */}
            <div>
              <FieldLabel required>Target URL</FieldLabel>
              <input
                id="audit-target-url"
                className={inputBase}
                style={inputStyle}
                value={targetUrl}
                onChange={e => { setTargetUrl(e.target.value); if (errors.targetUrl) setErrors(p => ({ ...p, targetUrl: '' })); }}
                placeholder="https://yoursite.com/specific-page"
                onFocus={e => (e.target.style.borderColor = 'rgba(115,66,226,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <FieldError msg={errors.targetUrl} />
            </div>

            {/* Audit Goal */}
            <div>
              <FieldLabel required>Audit Goal</FieldLabel>
              <textarea
                id="audit-goal"
                rows={4}
                className={inputBase + ' resize-none'}
                style={inputStyle}
                value={goal}
                onChange={e => { setGoal(e.target.value); if (errors.goal) setErrors(p => ({ ...p, goal: '' })); }}
                placeholder="e.g. Find and complete the sign-up flow. Check for any confusing steps, unclear labels, or friction points along the way."
                onFocus={e => (e.target.style.borderColor = 'rgba(115,66,226,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <div className="flex items-start justify-between mt-1">
                <FieldError msg={errors.goal} />
                <span className="text-[10px] font-mono ml-auto flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {goal.length} chars
                </span>
              </div>
            </div>

            {/* Persona */}
            <div>
              <FieldLabel>AI Persona</FieldLabel>
              <select
                id="audit-persona"
                className={inputBase}
                style={{ ...inputStyle, color: '#fafafa' }}
                value={persona}
                onChange={e => setPersona(e.target.value)}
              >
                <option>Tech-Savvy User</option>
                <option>Confused Beginner</option>
                <option>Impatient User</option>
                <option>Casual Explorer</option>
              </select>
            </div>

            {/* Advanced Settings — collapsed by default */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => setShowAdvanced(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)' }}
              >
                <span className="font-semibold">Advanced Settings</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 pt-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <FieldLabel>Context Variables</FieldLabel>
                  <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    One <code className="font-mono">key=value</code> per line. Passed to the agent as context.
                  </p>
                  <textarea
                    rows={3}
                    className={inputBase + ' resize-none font-mono text-xs'}
                    style={inputStyle}
                    value={variablesInput}
                    onChange={e => setVariablesInput(e.target.value)}
                    placeholder={'username=testuser\npassword=secret'}
                    onFocus={e => (e.target.style.borderColor = 'rgba(115,66,226,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
              )}
            </div>

            {/* Submission error */}
            {submitWorkflow.error && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rose-400">{submitWorkflow.error.message}</p>
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => { setStep(1); setErrors({}); submitWorkflow.reset(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                ← Back
              </button>
              <button
                id="launch-audit-btn"
                onClick={handleLaunch}
                disabled={submitWorkflow.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 group"
                style={{
                  background: submitWorkflow.isPending ? 'rgba(115,66,226,0.4)' : 'linear-gradient(135deg,#7342E2,#8b5cf6)',
                  boxShadow: submitWorkflow.isPending ? 'none' : '0 0 40px rgba(115,66,226,0.3)',
                }}
              >
                {submitWorkflow.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
                ) : (
                  <>Launch Audit <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
