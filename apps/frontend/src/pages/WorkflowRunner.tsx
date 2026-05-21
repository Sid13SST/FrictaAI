import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Square, Loader2, Brain, Zap, CheckCircle, XCircle,
  Clock, ChevronRight, Eye, List, AlertTriangle, Activity,
  PlusCircle, RefreshCw
} from 'lucide-react';
import { AgentOrchestrationConsole } from '../features/orchestrator/AgentOrchestrationConsole';

const API_BASE = 'http://127.0.0.1:3001/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Thought { id: string; thought: string; stepNumber: number; timestamp: string; }
interface Action { id: string; action: string; target: string; value?: string; status: string; stepNumber: number; errorMessage?: string; timestamp: string; }
interface SessionStatus { id: string; status: string; stepCount: number; model: string; goal: string; persona: string; startedAt: string; endedAt?: string; }

// ─── Action color map (Fricta palette) ──────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  click:    'text-[#5ed29c] bg-[#5ed29c]/8 border-[#5ed29c]/20',
  type:     'text-sky-400 bg-sky-500/8 border-sky-500/20',
  scroll:   'text-amber-400 bg-amber-500/8 border-amber-500/20',
  navigate: 'text-violet-400 bg-violet-500/8 border-violet-500/20',
  wait:     'text-zinc-400 bg-zinc-500/8 border-zinc-500/20',
  goBack:   'text-orange-400 bg-orange-500/8 border-orange-500/20',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  idle:          { label: 'Idle',          color: 'text-zinc-400',    icon: <Clock className="w-4 h-4" /> },
  RUNNING:       { label: 'Running',       color: 'text-[#5ed29c]',   icon: <Activity className="w-4 h-4 animate-pulse" /> },
  COMPLETED:     { label: 'Completed',     color: 'text-[#5ed29c]',   icon: <CheckCircle className="w-4 h-4" /> },
  FAILED:        { label: 'Failed',        color: 'text-rose-400',    icon: <XCircle className="w-4 h-4" /> },
  TIMEOUT:       { label: 'Timeout',       color: 'text-orange-400',  icon: <AlertTriangle className="w-4 h-4" /> },
  LOOP_DETECTED: { label: 'Loop Detected', color: 'text-yellow-400',  icon: <AlertTriangle className="w-4 h-4" /> },
};

// ─── Input component ───────────────────────────────────────────────────────────

const FieldInput = ({
  label, value, onChange, type = 'text', placeholder, rows
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; rows?: number;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      className="text-[9px] font-black uppercase tracking-widest font-mono"
      style={{ color: 'rgba(255,255,255,0.35)' }}
    >
      {label}
    </label>
    {rows ? (
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm text-white placeholder-zinc-600 resize-none px-3 py-2 rounded-lg font-mono transition-all focus:outline-none"
        style={{
          background: 'rgba(9,9,11,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onFocus={e => (e.target.style.borderColor = 'rgba(94,210,156,0.4)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm text-white placeholder-zinc-600 px-3 py-2 rounded-lg transition-all focus:outline-none"
        style={{
          background: 'rgba(9,9,11,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onFocus={e => (e.target.style.borderColor = 'rgba(94,210,156,0.4)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
      />
    )}
  </div>
);

const FieldSelect = ({
  label, value, onChange, children
}: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      className="text-[9px] font-black uppercase tracking-widest font-mono"
      style={{ color: 'rgba(255,255,255,0.35)' }}
    >
      {label}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm text-white px-3 py-2 rounded-lg transition-all focus:outline-none"
      style={{
        background: 'rgba(9,9,11,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fafafa',
      }}
    >
      {children}
    </select>
  </div>
);

// ─── Sub-components ────────────────────────────────────────────────────────────

const ThoughtBubble = ({ thought, step }: { thought: Thought; step: number }) => (
  <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
      style={{
        background: 'rgba(94,210,156,0.1)',
        border: '1px solid rgba(94,210,156,0.25)',
      }}
    >
      <Brain className="w-3.5 h-3.5" style={{ color: '#5ed29c' }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-bold uppercase tracking-wider font-mono"
          style={{ color: '#5ed29c' }}
        >
          Step {step}
        </span>
        <span className="text-[10px] text-white/30">{new Date(thought.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{thought.thought}</p>
    </div>
  </div>
);

const ActionChip = ({ action }: { action: Action }) => {
  const colors = ACTION_COLORS[action.action] ?? 'text-white/60 bg-white/5 border-white/10';
  const statusIcon = action.status === 'success'
    ? <CheckCircle className="w-3 h-3 text-[#5ed29c]" />
    : action.status === 'failed'
    ? <XCircle className="w-3 h-3 text-rose-400" />
    : <Clock className="w-3 h-3 text-yellow-400" />;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${colors} animate-in fade-in duration-300`}>
      <span className="font-bold uppercase tracking-wider font-mono">{action.action}</span>
      <ChevronRight className="w-3 h-3 opacity-40" />
      <span className="font-mono truncate max-w-[200px]">{action.target}</span>
      {action.value && <span className="opacity-60 truncate max-w-[100px]">= "{action.value}"</span>}
      <div className="ml-auto flex-shrink-0">{statusIcon}</div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

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

  // Auto-scroll thoughts
  useEffect(() => { thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thoughts]);

  // Fetch projects on mount
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
    } catch (err: any) { console.error('Fetch projects failed:', err); }
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
      }
    } catch (err: any) {
      console.error('Create project failed:', err);
      alert(`Failed to create project: ${err.message}`);
    }
  };

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
        const done = ['COMPLETED', 'FAILED', 'TIMEOUT', 'LOOP_DETECTED'].includes(statusData.session?.status);
        if (done) { setUiStatus('done'); if (pollingRef.current) clearInterval(pollingRef.current); }
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

  // ── Panel component ────────────────────────────────────────────────────────
  const Panel = ({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div
      className={`rounded-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'rgba(9,9,11,0.80)',
        border: '1px solid rgba(255,255,255,0.07)',
        ...style,
      }}
    >
      {/* Top mint edge line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(94,210,156,0.22), transparent)' }}
      />
      {children}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest font-mono px-2.5 py-0.5 rounded-full"
            style={{
              color: '#5ed29c',
              background: 'rgba(94,210,156,0.1)',
              border: '1px solid rgba(94,210,156,0.2)',
            }}
          >
            Workflow Auditor
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3 mt-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(94,210,156,0.1)',
              border: '1px solid rgba(94,210,156,0.2)',
            }}
          >
            <Brain className="w-5 h-5" style={{ color: '#5ed29c' }} />
          </div>
          Agent Execution Console
        </h1>
        <p className="text-zinc-500 mt-1 text-sm font-sans">
          Configure an AI audit goal and observe every reasoning step, decision, and action in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column: Configuration ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Create Project */}
          <Panel>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <PlusCircle className="w-4 h-4" style={{ color: '#5ed29c' }} />
                <h2 className="font-bold text-white text-sm tracking-tight">Create Project</h2>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-2.5">
                <FieldInput
                  label="Project Name"
                  value={newProjectName}
                  onChange={setNewProjectName}
                  placeholder="e.g. My SaaS App"
                />
                <FieldInput
                  label="Root URL"
                  value={newProjectUrl}
                  onChange={setNewProjectUrl}
                  placeholder="https://..."
                />
                <button
                  type="submit"
                  className="w-full text-xs font-bold py-2 rounded-lg transition-all mt-1 font-mono uppercase tracking-wider"
                  style={{
                    background: 'rgba(94,210,156,0.1)',
                    border: '1px solid rgba(94,210,156,0.25)',
                    color: '#5ed29c',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'rgba(94,210,156,0.18)';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'rgba(94,210,156,0.1)';
                  }}
                >
                  Add Project
                </button>
              </form>
            </div>
          </Panel>

          {/* Agent Config */}
          <Panel>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: '#5ed29c' }} />
                <h2 className="font-bold text-white text-sm tracking-tight">Agent Configuration</h2>
              </div>

              <FieldSelect label="Project" value={selectedProjectId} onChange={(val) => {
                setSelectedProjectId(val);
                const proj = projects.find(p => p.id === val);
                if (proj) setTargetUrl(proj.websiteUrl);
              }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </FieldSelect>

              <FieldInput label="Target URL" value={targetUrl} onChange={setTargetUrl} placeholder="https://example.com" />
              <FieldInput label="Workflow Goal" value={goal} onChange={setGoal}
                placeholder="e.g. Find and click the Sign Up button" rows={3} />
              
              <FieldSelect label="Persona" value={persona} onChange={setPersona}>
                <option>Tech-Savvy User</option>
                <option>Confused Beginner</option>
                <option>Impatient User</option>
                <option>Casual Explorer</option>
              </FieldSelect>

              <FieldInput
                label="Context Variables (key=value per line)"
                value={variablesInput}
                onChange={setVariablesInput}
                placeholder={"username=testuser\npassword=secret"}
                rows={2}
              />

              <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {uiStatus === 'running' ? (
                  <button
                    onClick={handleStop}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(244,63,94,0.1)',
                      border: '1px solid rgba(244,63,94,0.25)',
                      color: '#fb7185',
                    }}
                  >
                    <Square className="w-4 h-4" /> Stop Session
                  </button>
                ) : (
                  <button
                    onClick={handleStartWorkflow}
                    disabled={loading || !selectedProjectId}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 font-mono uppercase tracking-wider"
                    style={{
                      background: loading ? 'rgba(94,210,156,0.1)' : '#5ed29c',
                      color: loading ? '#5ed29c' : '#070b0a',
                    }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {loading ? 'Starting Agent...' : 'Run Autonomous Agent'}
                  </button>
                )}
              </div>
            </div>
          </Panel>

          {/* Session Status Card */}
          <Panel>
            <div className="p-5 space-y-3">
              <h2 className="font-bold text-white text-sm tracking-tight">Session Status</h2>
              <div className={`flex items-center gap-2 ${statusCfg.color}`}>
                {statusCfg.icon}
                <span className="font-semibold text-sm">{statusCfg.label}</span>
              </div>
              {sessionStatus && (
                <div className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <div className="flex justify-between">
                    <span>Steps Taken</span>
                    <span className="text-white font-mono">
                      {Math.max(sessionStatus.stepCount, thoughts.length, actions.length)} / 30
                    </span>
                  </div>
                  {model && (
                    <div className="flex justify-between">
                      <span>Model</span>
                      <span className="font-mono truncate max-w-[140px]" style={{ color: '#5ed29c' }}>{model}</span>
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
              {(sessionStatus || thoughts.length > 0 || actions.length > 0) && (() => {
                const effectiveStep = Math.max(sessionStatus?.stepCount ?? 0, thoughts.length, actions.length);
                return effectiveStep > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <span>Progress</span>
                      <span className="font-mono">{effectiveStep} / 30 steps</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((effectiveStep / 30) * 100, 100)}%`,
                          background: 'linear-gradient(to right, #10b981, #5ed29c)',
                        }}
                      />
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </Panel>
        </div>

        {/* ── Right Column: Execution Viewer ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{
            background: 'rgba(9,9,11,0.8)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {(['thoughts', 'actions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(94,210,156,0.12)' : 'transparent',
                  border: activeTab === tab ? '1px solid rgba(94,210,156,0.25)' : '1px solid transparent',
                  color: activeTab === tab ? '#5ed29c' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab === 'thoughts' ? <Brain className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {tab === 'thoughts' ? 'Thought Stream' : 'Action Timeline'}
                {tab === 'thoughts' && thoughts.length > 0 && (
                  <span
                    className="ml-1 rounded-full px-1.5 py-0 text-[10px]"
                    style={{ background: 'rgba(94,210,156,0.15)', color: '#5ed29c' }}
                  >
                    {thoughts.length}
                  </span>
                )}
                {tab === 'actions' && actions.length > 0 && (
                  <span
                    className="ml-1 rounded-full px-1.5 py-0 text-[10px]"
                    style={{ background: 'rgba(94,210,156,0.15)', color: '#5ed29c' }}
                  >
                    {actions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content Panel */}
          <Panel className="overflow-hidden" style={{ minHeight: '520px' }}>
            {/* Panel Header */}
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
            >
              <div className="flex items-center gap-2">
                {uiStatus === 'running' && (
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: '#5ed29c' }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ background: '#5ed29c' }}
                    />
                  </span>
                )}
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {activeTab === 'thoughts' ? 'Agent reasoning — live' : 'Executed actions — chronological'}
                </span>
              </div>
              {uiStatus === 'running' && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(94,210,156,0.7)' }}>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="font-mono text-[10px]">Polling every 2s</span>
                </div>
              )}
            </div>

            {/* Empty State */}
            {uiStatus === 'idle' && (
              <div className="flex flex-col items-center justify-center h-80 gap-4 text-center px-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(94,210,156,0.08)',
                    border: '1px solid rgba(94,210,156,0.18)',
                  }}
                >
                  <Zap className="w-7 h-7" style={{ color: '#5ed29c' }} />
                </div>
                <div>
                  <h3 className="text-white font-bold">Agent Ready</h3>
                  <p className="text-sm mt-1 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Configure a workflow goal and click "Run Autonomous Agent" to begin.
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-80 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5ed29c' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Initializing agent session...</p>
              </div>
            )}

            {/* Thought Stream */}
            {!loading && uiStatus !== 'idle' && activeTab === 'thoughts' && (
              <div className="p-5 space-y-5 max-h-[520px] overflow-y-auto">
                {thoughts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm py-8 justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
                  <div className="flex items-center gap-2 text-sm py-8 justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>Waiting for first action...</span>
                  </div>
                ) : (
                  actions.map(a => (
                    <div key={a.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-mono w-14 text-right flex-shrink-0"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1"><ActionChip action={a} /></div>
                      </div>
                      {a.errorMessage && (
                        <p className="text-[11px] text-rose-400/80 ml-16 mt-0.5 font-mono">{a.errorMessage}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Panel>

          {/* Completion Banner */}
          {uiStatus === 'done' && sessionStatus && (
            <div
              className="rounded-2xl border p-4 flex items-center gap-4"
              style={{
                background: sessionStatus.status === 'COMPLETED'
                  ? 'rgba(94,210,156,0.05)'
                  : 'rgba(244,63,94,0.05)',
                border: sessionStatus.status === 'COMPLETED'
                  ? '1px solid rgba(94,210,156,0.2)'
                  : '1px solid rgba(244,63,94,0.2)',
              }}
            >
              {sessionStatus.status === 'COMPLETED'
                ? <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#5ed29c' }} />
                : <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />}
              <div>
                <p className="font-bold text-sm" style={{ color: sessionStatus.status === 'COMPLETED' ? '#5ed29c' : '#fb7185' }}>
                  Workflow {statusCfg.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Completed {sessionStatus.stepCount} steps · Model: {sessionStatus.model}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <Link
                  to={`/app/reports/${workflowId}`}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors font-mono uppercase tracking-wider"
                  style={{
                    background: 'rgba(94,210,156,0.1)',
                    border: '1px solid rgba(94,210,156,0.25)',
                    color: '#5ed29c',
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> View Report
                </Link>
                <button
                  onClick={() => { setUiStatus('idle'); setThoughts([]); setActions([]); setSessionStatus(null); setWorkflowId(null); }}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> New Run
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Intelligence Console (Phase 6 — always rendered when session exists) */}
      {workflowId && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-px flex-1"
              style={{ background: 'linear-gradient(to right, rgba(94,210,156,0.2), transparent)' }}
            />
            <span
              className="text-[9px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-full"
              style={{
                color: '#5ed29c',
                background: 'rgba(94,210,156,0.08)',
                border: '1px solid rgba(94,210,156,0.18)',
              }}
            >
              Intelligence Operations Console
            </span>
            <div
              className="h-px flex-1"
              style={{ background: 'linear-gradient(to left, rgba(94,210,156,0.2), transparent)' }}
            />
          </div>
          <AgentOrchestrationConsole
            sessionId={workflowId}
            onOrchestrationComplete={() => console.log('[WorkflowRunner] Orchestration completed')}
          />
        </div>
      )}
    </div>
  );
};
