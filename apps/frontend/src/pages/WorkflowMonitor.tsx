import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, Activity, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronRight, List, Zap, ArrowRight, RefreshCw, Plus,
  Copy, Check,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'TIMEOUT', 'LOOP_DETECTED', 'CANCELLED']);

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  idle:          { label: 'Queued',       color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.2)',   Icon: Clock },
  QUEUED:        { label: 'Queued',       color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.2)',   Icon: Clock },
  RUNNING:       { label: 'Running',      color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.2)',   Icon: Activity },
  COMPLETED:     { label: 'Completed',    color: '#34d399', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.25)',  Icon: CheckCircle },
  FAILED:        { label: 'Failed',       color: '#f87171', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)',    Icon: XCircle },
  TIMEOUT:       { label: 'Timed Out',    color: '#fb923c', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.2)',   Icon: AlertTriangle },
  LOOP_DETECTED: { label: 'Loop',         color: '#facc15', bg: 'rgba(234,179,8,0.08)',    border: 'rgba(234,179,8,0.2)',    Icon: AlertTriangle },
  CANCELLED:     { label: 'Cancelled',    color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', Icon: XCircle },
};

const ACTION_COLORS: Record<string, string> = {
  click:    'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  type:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
  scroll:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  navigate: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  wait:     'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  goBack:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionData {
  id: string;
  status: string;
  stepCount: number;
  model: string;
  goal: string;
  persona: string;
  startedAt: string;
  endedAt?: string;
}

interface Thought {
  id: string;
  thought: string;
  stepNumber: number;
  timestamp: string;
}

interface Action {
  id: string;
  action: string;
  target: string;
  value?: string;
  status: string;
  stepNumber: number;
  errorMessage?: string;
  timestamp: string;
}

// ─── Error screen ─────────────────────────────────────────────────────────────

const RouteError = ({ code, message }: { code: number; message: string }) => (
  <div className="flex items-center justify-center min-h-96">
    <div
      className="text-center px-8 py-10 rounded-3xl max-w-sm w-full"
      style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-5xl font-black text-white mb-3">{code}</p>
      <p className="text-base font-bold text-white mb-2">{message}</p>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
        This session may not exist or you may not have access to it.
      </p>
      <Link
        to="/app/workflow"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        <Plus className="w-4 h-4" /> Launch New Audit
      </Link>
    </div>
  </div>
);

// ─── Copy button ──────────────────────────────────────────────────────────────

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="ml-1.5 transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status, animate = false }: { status: string; animate?: boolean }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['idle'];
  const { Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon className={`w-3.5 h-3.5 ${animate && status === 'RUNNING' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
};

// ─── Thought bubble ───────────────────────────────────────────────────────────

const ThoughtBubble = ({ thought }: { thought: Thought }) => (
  <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
    >
      <Brain className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color: '#818cf8' }}>
          Step {thought.stepNumber}
        </span>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {new Date(thought.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{thought.thought}</p>
    </div>
  </div>
);

// ─── Action chip ──────────────────────────────────────────────────────────────

const ActionChip = ({ action }: { action: Action }) => {
  const colors = ACTION_COLORS[action.action] ?? 'text-white/60 bg-white/5 border-white/10';
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${colors} animate-in fade-in duration-300`}>
      <span className="font-bold uppercase tracking-wider font-mono flex-shrink-0">{action.action}</span>
      <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
      <span className="font-mono truncate">{action.target}</span>
      {action.value && <span className="opacity-50 truncate ml-1">= "{action.value}"</span>}
      <div className="ml-auto flex-shrink-0">
        {action.status === 'success'
          ? <CheckCircle className="w-3 h-3 text-emerald-400" />
          : action.status === 'failed'
          ? <XCircle className="w-3 h-3 text-rose-400" />
          : <Clock className="w-3 h-3 text-amber-400" />}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkflowMonitor = () => {
  const { id: workflowId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Metadata passed from WorkflowRunner via location.state
  const locationState = (location.state ?? {}) as {
    projectName?: string;
    goal?: string;
    model?: string;
    persona?: string;
  };

  const [activeTab, setActiveTab] = useState<'thoughts' | 'actions'>('thoughts');
  const [isTerminal, setIsTerminal] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  // ── Status polling ─────────────────────────────────────────────────────────
  const {
    data: statusData,
    isError: statusError,
    error: statusErrObj,
  } = useQuery({
    queryKey: ['workflow-status', workflowId],
    queryFn: async () => {
      const res = await apiFetch(`/agent/workflow/${workflowId}/status`);
      if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { code: 401 });
      if (res.status === 403) throw Object.assign(new Error('Access Denied'), { code: 403 });
      if (res.status === 404) throw Object.assign(new Error('Session Not Found'), { code: 404 });
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json() as Promise<{ session: SessionData; isActive: boolean }>;
    },
    refetchInterval: isTerminal ? false : 2000,
    enabled: !!workflowId,
    retry: false,
  });

  // ── Thoughts polling ───────────────────────────────────────────────────────
  const { data: thoughtsData } = useQuery({
    queryKey: ['workflow-thoughts', workflowId],
    queryFn: async () => {
      const res = await apiFetch(`/agent/workflow/${workflowId}/thoughts`);
      if (!res.ok) return { thoughts: [] as Thought[] };
      return res.json() as Promise<{ thoughts: Thought[] }>;
    },
    refetchInterval: isTerminal ? false : 2000,
    enabled: !!workflowId,
  });

  // ── Actions polling ────────────────────────────────────────────────────────
  const { data: actionsData } = useQuery({
    queryKey: ['workflow-actions', workflowId],
    queryFn: async () => {
      const res = await apiFetch(`/agent/workflow/${workflowId}/actions`);
      if (!res.ok) return { actions: [] as Action[] };
      return res.json() as Promise<{ actions: Action[] }>;
    },
    refetchInterval: isTerminal ? false : 2000,
    enabled: !!workflowId,
  });

  const session = statusData?.session;
  const thoughts = thoughtsData?.thoughts ?? [];
  const actions = actionsData?.actions ?? [];

  // Stop polling when terminal state reached
  useEffect(() => {
    if (session?.status && TERMINAL_STATES.has(session.status)) {
      setIsTerminal(true);
    }
  }, [session?.status]);

  // Live countdown ticker — 2 → 1 → 0 → 2 …, stops when terminal
  useEffect(() => {
    if (isTerminal) { setCountdown(2); return; }
    setCountdown(2); // reset on (re)start
    const id = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 2 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isTerminal]);

  // Auto-scroll thoughts
  useEffect(() => {
    if (activeTab === 'thoughts') {
      thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts.length, activeTab]);

  const effectiveStep = Math.max(session?.stepCount ?? 0, thoughts.length, actions.length);
  const progressPct = Math.min((effectiveStep / 30) * 100, 100);

  // ── Route error states ─────────────────────────────────────────────────────
  if (statusError) {
    const code = (statusErrObj as any)?.code ?? 0;
    const msg = (statusErrObj as Error)?.message ?? 'Something went wrong';
    if (code === 401) return <RouteError code={401} message="Authentication Required" />;
    if (code === 403) return <RouteError code={403} message="Access Denied" />;
    if (code === 404) return <RouteError code={404} message="Session Not Found" />;
    return <RouteError code={500} message={msg} />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">

      {/* ── Success / Running Banner ─────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: isTerminal && session?.status === 'COMPLETED'
            ? 'radial-gradient(ellipse at top left, rgba(16,185,129,0.08), transparent 60%), rgba(9,9,11,0.8)'
            : isTerminal
            ? 'radial-gradient(ellipse at top left, rgba(239,68,68,0.08), transparent 60%), rgba(9,9,11,0.8)'
            : 'radial-gradient(ellipse at top left, rgba(99,102,241,0.1), transparent 60%), rgba(9,9,11,0.8)',
          border: isTerminal && session?.status === 'COMPLETED'
            ? '1px solid rgba(16,185,129,0.25)'
            : isTerminal
            ? '1px solid rgba(239,68,68,0.2)'
            : '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {/* Top edge line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: isTerminal && session?.status === 'COMPLETED'
              ? 'linear-gradient(to right, transparent, rgba(16,185,129,0.4), transparent)'
              : isTerminal
              ? 'linear-gradient(to right, transparent, rgba(239,68,68,0.3), transparent)'
              : 'linear-gradient(to right, transparent, rgba(99,102,241,0.4), transparent)',
          }}
        />

        <div className="flex flex-wrap items-start gap-4">
          {/* Status icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isTerminal && session?.status === 'COMPLETED'
                ? 'rgba(16,185,129,0.12)'
                : isTerminal
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(99,102,241,0.12)',
              border: isTerminal && session?.status === 'COMPLETED'
                ? '1px solid rgba(16,185,129,0.3)'
                : isTerminal
                ? '1px solid rgba(239,68,68,0.25)'
                : '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {isTerminal && session?.status === 'COMPLETED'
              ? <CheckCircle className="w-6 h-6 text-emerald-400" />
              : isTerminal
              ? <XCircle className="w-6 h-6 text-rose-400" />
              : <Activity className="w-6 h-6 animate-pulse" style={{ color: '#818cf8' }} />}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-lg font-bold text-white">
                {isTerminal && session?.status === 'COMPLETED'
                  ? 'Audit Complete'
                  : isTerminal
                  ? `Audit ${STATUS_CONFIG[session?.status ?? '']?.label ?? 'Ended'}`
                  : 'Audit Running'}
              </h1>
              {session?.status && <StatusBadge status={session.status} animate />}
            </div>

            {/* Metadata chips */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {workflowId && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-white/60">Workflow ID</span>
                  <span className="font-mono">{workflowId.slice(0, 20)}…</span>
                  <CopyButton text={workflowId} />
                </span>
              )}
              {locationState.projectName && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-white/60">Project</span>
                  {locationState.projectName}
                </span>
              )}
              {session?.startedAt && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-white/60">Started</span>
                  {new Date(session.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              {session?.model && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-white/60">Model</span>
                  <span className="font-mono" style={{ color: '#818cf8' }}>{session.model.split('/').pop()}</span>
                </span>
              )}
            </div>

            {/* Goal */}
            {(locationState.goal ?? session?.goal) && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="font-semibold text-white/60">Goal: </span>
                {locationState.goal ?? session?.goal}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {effectiveStep > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span className="font-semibold">Progress</span>
              <span className="font-mono">{effectiveStep} / 30 steps</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: isTerminal && session?.status === 'COMPLETED'
                    ? 'linear-gradient(to right, #10b981, #34d399)'
                    : isTerminal
                    ? 'linear-gradient(to right, #ef4444, #f87171)'
                    : 'linear-gradient(to right, #6366f1, #8b5cf6)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Completion CTAs ───────────────────────────────────────────────── */}
      {isTerminal && (
        <div className="flex flex-wrap items-center gap-3">
          {session?.status === 'COMPLETED' ? (
            <Link
              to={`/app/reports/${workflowId}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#10b981,#34d399)', boxShadow: '0 0 24px rgba(16,185,129,0.25)' }}
            >
              <CheckCircle className="w-4 h-4" /> View Report <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              <RefreshCw className="w-4 h-4 animate-spin" /> Report processing…
            </div>
          )}
          <button
            onClick={() => navigate('/app/workflow')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
          >
            <Plus className="w-4 h-4" /> Launch Another Audit
          </button>
        </div>
      )}

      {/* ── Live Stream Panel ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Top edge */}
        <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.22), transparent)' }} />

        {/* Tab bar */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['thoughts', 'actions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: activeTab === tab ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  color: activeTab === tab ? '#818cf8' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab === 'thoughts' ? <Brain className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {tab === 'thoughts' ? 'Thought Stream' : 'Actions'}
                {tab === 'thoughts' && thoughts.length > 0 && (
                  <span className="rounded-full px-1.5 text-[10px]" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {thoughts.length}
                  </span>
                )}
                {tab === 'actions' && actions.length > 0 && (
                  <span className="rounded-full px-1.5 text-[10px]" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {actions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          {!isTerminal && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(99,102,241,0.7)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
              </span>
              <span className="font-mono text-[10px]">Live · {countdown}s</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-h-72 max-h-[520px] overflow-y-auto p-5 scrollbar-thin">

          {/* Idle / Loading state */}
          {!session && !statusError && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}
              >
                <Zap className="w-7 h-7 animate-pulse" style={{ color: '#818cf8' }} />
              </div>
              <div>
                <p className="text-white font-bold">Connecting…</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Waiting for the agent to start.
                </p>
              </div>
            </div>
          )}

          {/* Thought Stream */}
          {session && activeTab === 'thoughts' && (
            <div className="space-y-5">
              {thoughts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Brain className="w-4 h-4 animate-pulse" />
                  <span>Waiting for first agent thought…</span>
                </div>
              ) : (
                thoughts.map(t => <ThoughtBubble key={t.id} thought={t} />)
              )}
              <div ref={thoughtsEndRef} />
            </div>
          )}

          {/* Action Timeline */}
          {session && activeTab === 'actions' && (
            <div className="space-y-2">
              {actions.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Waiting for first action…</span>
                </div>
              ) : (
                actions.map(a => (
                  <div key={a.id}>
                    <div className="flex items-start gap-3">
                      <span
                        className="text-[10px] font-mono mt-3 w-14 text-right flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                      >
                        {new Date(a.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <div className="flex-1">
                        <ActionChip action={a} />
                        {a.errorMessage && (
                          <p className="text-[11px] text-rose-400/80 mt-1 font-mono pl-1">{a.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
