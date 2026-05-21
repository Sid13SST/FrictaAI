import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Square, Loader2, Brain, Zap, CheckCircle, XCircle,
  Clock, ChevronRight, Eye, List, AlertTriangle, Sparkles,
  PlusCircle, RefreshCw, Activity
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3001/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Thought { id: string; thought: string; stepNumber: number; timestamp: string; }
interface Action { id: string; action: string; target: string; value?: string; status: string; stepNumber: number; errorMessage?: string; timestamp: string; }
interface SessionStatus { id: string; status: string; stepCount: number; model: string; goal: string; persona: string; startedAt: string; endedAt?: string; }

const ACTION_COLORS: Record<string, string> = {
  click: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  type: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  scroll: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  navigate: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  wait: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  goBack: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  idle:         { label: 'Idle',         color: 'text-slate-400',  icon: <Clock className="w-4 h-4" /> },
  RUNNING:      { label: 'Running',      color: 'text-blue-400',   icon: <Activity className="w-4 h-4 animate-pulse" /> },
  COMPLETED:    { label: 'Completed',    color: 'text-emerald-400',icon: <CheckCircle className="w-4 h-4" /> },
  FAILED:       { label: 'Failed',       color: 'text-red-400',    icon: <XCircle className="w-4 h-4" /> },
  TIMEOUT:      { label: 'Timeout',      color: 'text-orange-400', icon: <AlertTriangle className="w-4 h-4" /> },
  LOOP_DETECTED:{ label: 'Loop Detected',color: 'text-yellow-400', icon: <AlertTriangle className="w-4 h-4" /> },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const ThoughtBubble = ({ thought, step }: { thought: Thought; step: number }) => (
  <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mt-0.5">
      <Brain className="w-3.5 h-3.5 text-indigo-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Step {step}</span>
        <span className="text-[10px] text-white/30">{new Date(thought.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{thought.thought}</p>
    </div>
  </div>
);

const ActionChip = ({ action }: { action: Action }) => {
  const colors = ACTION_COLORS[action.action] ?? 'text-white/60 bg-white/5 border-white/10';
  const statusIcon = action.status === 'success'
    ? <CheckCircle className="w-3 h-3 text-emerald-400" />
    : action.status === 'failed'
    ? <XCircle className="w-3 h-3 text-red-400" />
    : <Clock className="w-3 h-3 text-yellow-400" />;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${colors} animate-in fade-in duration-300`}>
      <span className="font-bold uppercase tracking-wider">{action.action}</span>
      <ChevronRight className="w-3 h-3 opacity-40" />
      <span className="font-mono truncate max-w-[200px]">{action.target}</span>
      {action.value && <span className="opacity-60 truncate max-w-[100px]">= "{action.value}"</span>}
      <div className="ml-auto flex-shrink-0">{statusIcon}</div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const WorkflowRunner = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');

  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [goal, setGoal] = useState('Find and click the "More information" link on the page.');
  const [persona, setPersona] = useState('Tech-Savvy User');
  const [variablesInput, setVariablesInput] = useState('username=testuser\npassword=Password123!');

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [uiStatus, setUiStatus] = useState<'idle' | 'running' | 'done'>('idle');

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [activeTab, setActiveTab] = useState<'thoughts' | 'actions'>('thoughts');
  const [model, setModel] = useState<string>('');

  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-scroll thoughts ──────────────────────────────────────────────────
  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughts]);

  // ── Fetch projects ────────────────────────────────────────────────────────
  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      const projectList = data.projects ?? [];
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
        setTargetUrl(projectList[0].websiteUrl);
      }
    } catch (err: any) {
      console.error("Fetch projects failed:", err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectUrl) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newProjectName, websiteUrl: newProjectUrl }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.project) {
        setProjects(prev => [...prev, data.project]);
        setSelectedProjectId(data.project.id);
        setTargetUrl(data.project.websiteUrl);
        setNewProjectName(''); setNewProjectUrl('');
      } else {
        throw new Error("No project returned from server");
      }
    } catch (err: any) {
      console.error("Create project failed:", err);
      alert(`Failed to create project: ${err.message}`);
    }
  };

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const [statusRes, thoughtsRes, actionsRes] = await Promise.all([
          fetch(`${API_BASE}/agent/workflow/${id}/status`),
          fetch(`${API_BASE}/agent/workflow/${id}/thoughts`),
          fetch(`${API_BASE}/agent/workflow/${id}/actions`),
        ]);
        const [statusData, thoughtsData, actionsData] = await Promise.all([
          statusRes.json(), thoughtsRes.json(), actionsRes.json(),
        ]);

        if (statusData.session) setSessionStatus(statusData.session);
        if (thoughtsData.thoughts) setThoughts(thoughtsData.thoughts);
        if (actionsData.actions) setActions(actionsData.actions);

        const done = ['COMPLETED','FAILED','TIMEOUT','LOOP_DETECTED'].includes(statusData.session?.status);
        if (done) {
          setUiStatus('done');
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {}
    }, 2000);
  };

  const handleStartWorkflow = async () => {
    if (!selectedProjectId || !targetUrl || !goal) return;

    const variables: Record<string, string> = {};
    variablesInput.split('\n').forEach(line => {
      const [k, ...rest] = line.split('=');
      if (k && rest.length > 0) variables[k.trim()] = rest.join('=').trim();
    });

    setLoading(true);
    setThoughts([]); setActions([]); setSessionStatus(null);
    try {
      const res = await fetch(`${API_BASE}/agent/workflow/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, url: targetUrl, goal, persona, variables }),
      });
      const data = await res.json();
      if (data.workflowId) {
        setWorkflowId(data.workflowId);
        setModel(data.model ?? '');
        setUiStatus('running');
        startPolling(data.workflowId);
      } else { setUiStatus('done'); }
    } catch { setUiStatus('done'); }
    finally { setLoading(false); }
  };

  const handleStop = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setUiStatus('done');
  };

  const currentStatus = sessionStatus?.status ?? (uiStatus === 'running' ? 'RUNNING' : 'idle');
  const statusCfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG['idle'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-indigo-400" />
          Agent Execution Viewer
        </h1>
        <p className="text-white/40 mt-1 text-sm">
          Autonomous AI workflow agent — observe every thought, decision, and action in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column: Configuration ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Create Project */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-white text-sm">Create Project</h2>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-2">
              <input type="text" placeholder="Project Name" value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-colors" />
              <input type="text" placeholder="Root URL (https://...)" value={newProjectUrl}
                onChange={e => setNewProjectUrl(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-colors" />
              <button type="submit"
                className="w-full bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                Add Project
              </button>
            </form>
          </div>

          {/* Workflow Config */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-white text-sm">Agent Configuration</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Project</label>
              <select value={selectedProjectId} onChange={e => {
                const val = e.target.value;
                setSelectedProjectId(val);
                const proj = projects.find(p => p.id === val);
                if (proj) setTargetUrl(proj.websiteUrl);
              }}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors">
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Target URL</label>
              <input type="text" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Workflow Goal</label>
              <textarea rows={3} value={goal} onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Find and click the Sign Up button"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 resize-none transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Persona</label>
              <select value={persona} onChange={e => setPersona(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors">
                <option>Tech-Savvy User</option>
                <option>Confused Beginner</option>
                <option>Impatient User</option>
                <option>Casual Explorer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Context Variables (key=value)</label>
              <textarea rows={2} value={variablesInput} onChange={e => setVariablesInput(e.target.value)}
                placeholder="username=testuser&#10;password=secret"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 resize-none transition-colors" />
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              {uiStatus === 'running' ? (
                <button onClick={handleStop}
                  className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
                  <Square className="w-4 h-4" /> Stop Session
                </button>
              ) : (
                <button onClick={handleStartWorkflow} disabled={loading || !selectedProjectId}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? 'Starting Agent...' : 'Run Autonomous Agent'}
                </button>
              )}
            </div>
          </div>

          {/* Session Status Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white text-sm">Session Status</h2>
            <div className={`flex items-center gap-2 ${statusCfg.color}`}>
              {statusCfg.icon}
              <span className="font-semibold text-sm">{statusCfg.label}</span>
            </div>
            {sessionStatus && (
              <div className="space-y-2 text-xs text-white/40">
                <div className="flex justify-between">
                  <span>Steps Taken</span>
                  <span className="text-white font-mono">{Math.max(sessionStatus.stepCount, thoughts.length, actions.length)} / 30</span>
                </div>
                {model && (
                  <div className="flex justify-between">
                    <span>Model</span>
                    <span className="text-indigo-400 font-mono truncate max-w-[140px]">{model}</span>
                  </div>
                )}
                {workflowId && (
                  <div className="flex justify-between">
                    <span>Session ID</span>
                    <span className="text-white/50 font-mono">{workflowId.slice(0, 12)}...</span>
                  </div>
                )}
              </div>
            )}
            {/* Step progress bar */}
            {(sessionStatus || thoughts.length > 0 || actions.length > 0) && (
              (() => {
                const effectiveStep = Math.max(
                  sessionStatus?.stepCount ?? 0,
                  thoughts.length,
                  actions.length
                );
                return effectiveStep > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>Progress</span>
                      <span className="font-mono">{effectiveStep} / 30 steps</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${Math.min((effectiveStep / 30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null;
              })()
            )}
          </div>
        </div>

        {/* ── Right Column: Execution Viewer ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab Switcher */}
          <div className="flex bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit">
            {(['thoughts', 'actions'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                    : 'text-white/40 hover:text-white/70'
                }`}>
                {tab === 'thoughts' ? <Brain className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {tab === 'thoughts' ? 'AI Thought Stream' : 'Action Timeline'}
                {tab === 'thoughts' && thoughts.length > 0 && (
                  <span className="ml-1 bg-indigo-500/30 text-indigo-300 rounded-full px-1.5 py-0 text-[10px]">
                    {thoughts.length}
                  </span>
                )}
                {tab === 'actions' && actions.length > 0 && (
                  <span className="ml-1 bg-indigo-500/30 text-indigo-300 rounded-full px-1.5 py-0 text-[10px]">
                    {actions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content Panel */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden" style={{ minHeight: '520px' }}>

            {/* Panel Header */}
            <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                {uiStatus === 'running' && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                )}
                <span className="text-white/60 text-xs font-medium">
                  {activeTab === 'thoughts' ? 'Agent reasoning — live' : 'Executed actions — chronological'}
                </span>
              </div>
              {uiStatus === 'running' && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Polling every 2s</span>
                </div>
              )}
            </div>

            {/* Empty State */}
            {uiStatus === 'idle' && (
              <div className="flex flex-col items-center justify-center h-80 gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Zap className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Agent Ready</h3>
                  <p className="text-white/35 text-sm mt-1 max-w-xs">
                    Configure a workflow goal and click "Run Autonomous Agent" to begin. The AI will navigate and reason in real-time.
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-80 gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-white/50 text-sm">Initializing agent session...</p>
              </div>
            )}

            {/* Thought Stream */}
            {!loading && uiStatus !== 'idle' && activeTab === 'thoughts' && (
              <div className="p-5 space-y-5 max-h-[520px] overflow-y-auto">
                {thoughts.length === 0 ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
                    <Brain className="w-4 h-4 animate-pulse" />
                    <span>Waiting for first agent thought...</span>
                  </div>
                ) : (
                  thoughts.map(t => <ThoughtBubble key={t.id} thought={t} step={t.stepNumber} />)
                )}
                <div ref={thoughtsEndRef} />
              </div>
            )}

            {/* Action Timeline */}
            {!loading && uiStatus !== 'idle' && activeTab === 'actions' && (
              <div className="p-5 space-y-2 max-h-[520px] overflow-y-auto">
                {actions.length === 0 ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>Waiting for first action...</span>
                  </div>
                ) : (
                  actions.map(a => (
                    <div key={a.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-white/25 font-mono w-14 text-right flex-shrink-0">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1"><ActionChip action={a} /></div>
                      </div>
                      {a.errorMessage && (
                        <p className="text-[11px] text-red-400/80 ml-16 mt-0.5 font-mono">{a.errorMessage}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Summary Banner (on completion) */}
          {uiStatus === 'done' && sessionStatus && (
            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
              sessionStatus.status === 'COMPLETED'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              {sessionStatus.status === 'COMPLETED'
                ? <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                : <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />}
              <div>
                <p className={`font-semibold text-sm ${sessionStatus.status === 'COMPLETED' ? 'text-emerald-400' : 'text-red-400'}`}>
                  Workflow {statusCfg.label}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  Completed {sessionStatus.stepCount} steps · Model: {sessionStatus.model}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <Link to={`/app/reports/${workflowId}`}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View Report
                </Link>
                <button onClick={() => { setUiStatus('idle'); setThoughts([]); setActions([]); setSessionStatus(null); setWorkflowId(null); }}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> New Run
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
