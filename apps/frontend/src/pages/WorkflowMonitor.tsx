import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, Activity, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronRight, List, Zap, ArrowRight, RefreshCw, Plus,
  Copy, Check, Play, Layers, FileText
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AIPipelineRibbon, AICapabilityId } from '../features/shared/AIPipelineRibbon';

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'TIMEOUT', 'LOOP_DETECTED', 'CANCELLED']);

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  idle:          { label: 'Queued',       color: '#9B72FA', bg: 'rgba(115,66,226,0.08)',   border: 'rgba(115,66,226,0.2)',   Icon: Clock },
  PENDING:       { label: 'Pending',      color: '#9B72FA', bg: 'rgba(115,66,226,0.08)',   border: 'rgba(115,66,226,0.2)',   Icon: Clock },
  QUEUED:        { label: 'Queued',       color: '#9B72FA', bg: 'rgba(115,66,226,0.08)',   border: 'rgba(115,66,226,0.2)',   Icon: Clock },
  RUNNING:       { label: 'Running',      color: '#9B72FA', bg: 'rgba(115,66,226,0.08)',   border: 'rgba(115,66,226,0.2)',   Icon: Activity },
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
  createdAt?: string;
  endedAt?: string;
  project?: {
    projectName: string;
    websiteUrl: string;
  };
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

const RouteError = ({ code, message }: { code: number; message: string }) => {
  const getErrorContent = () => {
    switch (code) {
      case 401:
        return {
          title: 'Sign In Required',
          description: 'You must be signed in to access this workflow audit monitoring page.',
          cta: 'Sign In to Fricta',
          link: '/login',
        };
      case 403:
        return {
          title: "You don't have access to this audit",
          description: "This audit session belongs to another user or you do not have permission to view it.",
          cta: 'Return to Dashboard',
          link: '/app',
        };
      case 404:
        return {
          title: 'Audit Not Found',
          description: 'The requested workflow audit session identifier does not exist in our system.',
          cta: 'Return to Dashboard',
          link: '/app',
        };
      default:
        return {
          title: 'Unexpected Platform Error',
          description: message || 'An unexpected error occurred while loading this monitoring session.',
          cta: 'Return to Dashboard',
          link: '/app',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="flex items-center justify-center min-h-[480px]">
      <div
        className="text-center px-8 py-10 rounded-3xl max-w-md w-full relative overflow-hidden"
        style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto bg-rose-500/10 border border-rose-500/25">
          <XCircle className="w-8 h-8 text-rose-400" />
        </div>
        <p className="text-4xl font-black text-white mb-2">{code}</p>
        <p className="text-lg font-bold text-white mb-3">{content.title}</p>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {content.description}
        </p>
        <Link
          to={content.link}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#7342E2,#8b5cf6)' }}
        >
          <Plus className="w-4 h-4" /> {content.cta}
        </Link>
      </div>
    </div>
  );
};

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

const ThoughtBubble = ({ thought }: { thought: Thought }) => {
  const cleanThoughtContent = (content: string) => {
    if (!content) return '';
    // Strip raw system prompt remnants if any for safety
    return content
      .replace(/<system_prompt>[\s\S]*?<\/system_prompt>/gi, '')
      .replace(/<prompt>[\s\S]*?<\/prompt>/gi, '')
      .replace(/(?:you are an ai|your system prompt is|your task is|system instructions:)[\s\S]*?\n\n/gi, '')
      .trim();
  };

  const cleaned = cleanThoughtContent(thought.thought);
  if (!cleaned) return null;

  return (
    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)' }}
      >
        <Brain className="w-3.5 h-3.5" style={{ color: '#9B72FA' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color: '#9B72FA' }}>
            Step {thought.stepNumber}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {new Date(thought.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{cleaned}</p>
      </div>
    </div>
  );
};

// ─── Action chip ──────────────────────────────────────────────────────────────

const ActionChip = ({ action }: { action: Action }) => {
  const colors = ACTION_COLORS[action.action] ?? 'text-white/60 bg-white/5 border-white/10';
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${colors} animate-in fade-in duration-300`}>
      <span className="font-bold uppercase tracking-wider font-mono flex-shrink-0">{action.action}</span>
      <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
      <span className="font-mono truncate">{action.target}</span>
      {action.value && <span className="opacity-50 truncate ml-1">= "{action.value}"</span>}
      <div className="ml-auto flex-shrink-0 flex items-center gap-2">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Step {action.stepNumber}</span>
        {action.status === 'success'
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          : action.status === 'failed'
          ? <XCircle className="w-3.5 h-3.5 text-rose-400" />
          : <Clock className="w-3.5 h-3.5 text-amber-400" />}
      </div>
    </div>
  );
};

// ─── Milestone Card ───────────────────────────────────────────────────────────

const MilestoneCard = ({ milestone }: { milestone: any }) => {
  const getIcon = () => {
    switch (milestone.action) {
      case 'start':
        return <Play className="w-4 h-4 text-emerald-400" />;
      case 'load':
        return <Layers className="w-4 h-4 text-sky-400" />;
      case 'findings':
        return milestone.status === 'warning'
          ? <AlertTriangle className="w-4 h-4 text-amber-400" />
          : <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'report':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'complete':
        return milestone.status === 'success'
          ? <CheckCircle className="w-4 h-4 text-emerald-400" />
          : <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getBorderColor = () => {
    if (milestone.status === 'warning') return 'border-amber-500/20 bg-amber-500/5';
    if (milestone.status === 'failed') return 'border-rose-500/20 bg-rose-500/5';
    return 'border-indigo-500/15 bg-indigo-500/5';
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${getBorderColor()} animate-in fade-in duration-300`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/10">
        {getIcon()}
      </div>
      <div>
        <h4 className="text-xs font-bold text-white">{milestone.title}</h4>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {milestone.description}
        </p>
        <span className="text-[9px] font-mono mt-1.5 block" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {new Date(milestone.timestamp).toLocaleTimeString()}
        </span>
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
    targetUrl?: string;
    goal?: string;
    model?: string;
    persona?: string;
  };

  const [activeTab, setActiveTab] = useState<'thoughts' | 'actions'>('thoughts');
  const [isTerminal, setIsTerminal] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
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

  // ── Report query (only fetched when terminal to read findings count) ─────────
  const { data: reportData } = useQuery({
    queryKey: ['workflow-report', workflowId],
    queryFn: async () => {
      const res = await apiFetch(`/reports/${workflowId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workflowId && isTerminal,
  });

  const session = statusData?.session;
  const thoughts = thoughtsData?.thoughts ?? [];
  const actions = actionsData?.actions ?? [];

  // Derive metadata
  const projectName = session?.project?.projectName || locationState.projectName || 'Fricta Project';
  const targetUrl = session?.project?.websiteUrl || locationState.targetUrl || 'Target site';

  // Which AI pipeline stages are live right now, given real session/tab state.
  const aiActiveStages: AICapabilityId[] = (() => {
    const stages: AICapabilityId[] = ['persona'];
    if (!isTerminal) {
      stages.push(activeTab === 'actions' ? 'navigation' : 'reasoning', 'intelligence');
    } else {
      stages.push('correlation', 'severity', 'recommendations');
    }
    return stages;
  })();

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

  // Live running elapsed duration tracker
  useEffect(() => {
    if (!session?.startedAt || isTerminal) return;
    const startTime = new Date(session.startedAt).getTime();
    
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed > 0 ? elapsed : 0);
    }, 500);

    return () => clearInterval(id);
  }, [session?.startedAt, isTerminal]);

  // Polling Health ticks since update
  useEffect(() => {
    if (isTerminal || !statusData) return;
    setSecondsSinceUpdate(0);
    const id = setInterval(() => {
      setSecondsSinceUpdate(prev => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [statusData, isTerminal]);

  // Auto-scroll thoughts
  useEffect(() => {
    if (activeTab === 'thoughts') {
      thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts.length, activeTab]);

  const effectiveStep = Math.max(session?.stepCount ?? 0, thoughts.length, actions.length);
  const progressPct = Math.min((effectiveStep / 30) * 100, 100);

  // Elapsed duration in seconds (final duration calculated using endedAt if terminal)
  const finalDuration = (() => {
    if (session?.startedAt && session?.endedAt) {
      return Math.max(0, Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
    }
    return elapsedSeconds;
  })();

  // Format seconds to human string
  const formatDuration = (totalSec: number) => {
    if (totalSec < 60) return `${totalSec}s`;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s}s`;
  };

  // Estimated remaining time calculator
  const estimatedRemainingStr = (() => {
    if (isTerminal) return '';
    if (session?.status !== 'RUNNING') return 'Waiting...';
    if (effectiveStep < 3) return 'Calculating...';
    
    const avgDurationPerStep = finalDuration / effectiveStep;
    const remainingSteps = Math.max(0, 30 - effectiveStep);
    const estSeconds = Math.round(remainingSteps * avgDurationPerStep);
    
    if (estSeconds < 60) return `~${estSeconds}s`;
    const m = Math.floor(estSeconds / 60);
    const s = estSeconds % 60;
    return `~${m}m ${s}s`;
  })();

  // Failure categories definitions
  const getFailureCategory = (status: string) => {
    switch (status) {
      case 'TIMEOUT':
        return {
          title: 'Audit Timeout',
          description: 'The audit exceeded the maximum execution time limit (30 steps).',
        };
      case 'LOOP_DETECTED':
        return {
          title: 'Agent Loop Detected',
          description: 'The AI agent became stuck repeating the same sequence of actions.',
        };
      default:
        return {
          title: 'Target Site Error',
          description: 'The target website was unreachable or failed to respond, or an unexpected platform error occurred.',
        };
    }
  };

  // Chronological Storytelling Milestone Timeline
  const timelineMilestones = (() => {
    const list: any[] = [];

    if (!session) return [];

    // 1. Workflow Started
    list.push({
      id: 'milestone-start',
      type: 'milestone',
      action: 'start',
      title: 'Workflow Started',
      description: `Audit session initialized with goal: "${session.goal || 'Not specified'}"`,
      timestamp: session.startedAt || session.createdAt,
      status: 'success'
    });

    // 2. Page Loaded (if first action exists)
    const firstAction = actions.find(a => a.action === 'navigate' || a.action === 'click' || a.action === 'type');
    if (firstAction) {
      list.push({
        id: 'milestone-load',
        type: 'milestone',
        action: 'load',
        title: 'Page Loaded',
        description: `Successfully loaded target site: ${targetUrl}`,
        timestamp: firstAction.timestamp,
        status: 'success'
      });
    }

    // 3. Actions taken
    actions.forEach(a => {
      list.push({
        id: a.id,
        type: 'action',
        action: a.action,
        target: a.target,
        value: a.value,
        status: a.status,
        errorMessage: a.errorMessage,
        timestamp: a.timestamp,
        stepNumber: a.stepNumber
      });
    });

    // If terminal, add completion events
    if (isTerminal) {
      const findingsCount = reportData?.uxFindings?.length ?? 0;
      
      // 4. UX Findings Flagged
      list.push({
        id: 'milestone-findings',
        type: 'milestone',
        action: 'findings',
        title: 'UX Intelligence Analysis',
        description: findingsCount > 0 
          ? `Flagged ${findingsCount} design friction and usability issues.` 
          : 'No major usability defects detected.',
        timestamp: session.endedAt || new Date().toISOString(),
        status: findingsCount > 0 ? 'warning' : 'success'
      });

      // 5. Report Compiled
      list.push({
        id: 'milestone-report',
        type: 'milestone',
        action: 'report',
        title: 'Diagnostic Report Compiled',
        description: 'Diagnostic report and recommendations successfully persisted.',
        timestamp: session.endedAt || new Date().toISOString(),
        status: 'success'
      });

      // 6. Audit Completed / Terminated
      list.push({
        id: 'milestone-completed',
        type: 'milestone',
        action: 'complete',
        title: session.status === 'COMPLETED' ? 'Audit Completed' : 'Audit Terminated',
        description: session.status === 'COMPLETED' 
          ? 'Workflow goal completed successfully.' 
          : `Audit ended with status: ${session.status}`,
        timestamp: session.endedAt || new Date().toISOString(),
        status: session.status === 'COMPLETED' ? 'success' : 'failed'
      });
    }

    // Logical chronologically sorted mapping
    return list.sort((a, b) => {
      if (a.id === 'milestone-start') return -1;
      if (b.id === 'milestone-start') return 1;
      
      const endMilestones = ['milestone-findings', 'milestone-report', 'milestone-completed'];
      if (endMilestones.includes(a.id) && !endMilestones.includes(b.id)) return 1;
      if (endMilestones.includes(b.id) && !endMilestones.includes(a.id)) return -1;
      if (endMilestones.includes(a.id) && endMilestones.includes(b.id)) {
        return endMilestones.indexOf(a.id) - endMilestones.indexOf(b.id);
      }

      if (a.id === 'milestone-load') return -1;
      if (b.id === 'milestone-load') return 1;

      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  })();

  // ── Route error states ─────────────────────────────────────────────────────
  if (statusError) {
    const code = (statusErrObj as any)?.code ?? 0;
    const msg = (statusErrObj as Error)?.message ?? 'Something went wrong';
    
    // Check if network error and not explicit code
    if (code === 401 || code === 403 || code === 404) {
      return <RouteError code={code} message={msg} />;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">

      <AIPipelineRibbon active={aiActiveStages} persona={session?.persona} />

      {/* ── Active Running Banner ─────────────────────────────────────────── */}
      {!isTerminal && (
        <div
          className="rounded-3xl p-6 relative overflow-hidden border"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(115,66,226,0.08), transparent 60%), rgba(9,9,11,0.8)',
            borderColor: 'rgba(115,66,226,0.2)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7342E2]/40 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-indigo-500/10 border border-indigo-500/25">
              <Activity className="w-6 h-6 animate-pulse text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">Audit Running</h1>
                  {session?.status && <StatusBadge status={session.status} animate />}
                </div>
                
                {/* Polling Health Indicator */}
                {statusError ? (
                  <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    Connection Lost · Retrying...
                  </span>
                ) : (
                  secondsSinceUpdate <= 2 ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      Live · updated just now
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 font-medium font-mono">
                      Live · updated {secondsSinceUpdate}s ago
                    </span>
                  )
                )}
              </div>

              {/* Running details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs mb-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Project</p>
                  <p className="text-white mt-0.5 truncate">{projectName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Target URL</p>
                  <p className="text-indigo-400 font-mono truncate mt-0.5">{targetUrl}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Duration</p>
                  <p className="text-white font-mono mt-0.5">{formatDuration(finalDuration)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Est. Remaining</p>
                  <p className="text-white font-mono mt-0.5">{estimatedRemainingStr}</p>
                </div>
              </div>

              {/* Goal */}
              {session?.goal && (
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <span className="font-semibold text-zinc-400">Goal:</span> {session.goal}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {effectiveStep > 0 && (
            <div className="mt-5 pt-3 border-t border-white/5">
              <div className="flex justify-between text-[11px] mb-1.5 text-zinc-500">
                <span className="font-semibold">Execution Progress</span>
                <span className="font-mono">{effectiveStep} / 30 steps ({Math.round(progressPct)}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Success Completion Card ───────────────────────────────────────── */}
      {isTerminal && session?.status === 'COMPLETED' && (
        <div
          className="rounded-3xl p-6 relative overflow-hidden border"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.06), transparent 60%), rgba(9,9,11,0.85)',
            borderColor: 'rgba(16,185,129,0.25)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">Audit Completed Successfully ✓</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Fricta AI has completed analyzing the workflow. A diagnostic report has been compiled and is ready for review.
              </p>
              
              {/* Completion Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Project</p>
                  <p className="text-white font-medium mt-0.5 truncate">{projectName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Target URL</p>
                  <p className="text-indigo-400 font-medium font-mono truncate mt-0.5">{targetUrl}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Completion Time</p>
                  <p className="text-white mt-0.5">
                    {session?.endedAt ? new Date(session.endedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Workflow ID</p>
                  <p className="text-white font-mono truncate mt-0.5">{workflowId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Duration</p>
                  <p className="text-white mt-0.5">{formatDuration(finalDuration)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Findings Count</p>
                  <p className="text-white font-semibold mt-0.5">
                    {reportData?.uxFindings?.length ?? 0} Flagged
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Failure Banner / Recovery Layout ─────────────────────────────── */}
      {isTerminal && session?.status !== 'COMPLETED' && (
        <div
          className="rounded-3xl p-6 relative overflow-hidden border animate-in fade-in duration-500"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(244,63,94,0.06), transparent 60%), rgba(9,9,11,0.85)',
            borderColor: 'rgba(244,63,94,0.2)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-500/10 border border-rose-500/25">
              <XCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">
                {getFailureCategory(session?.status ?? '').title}
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {getFailureCategory(session?.status ?? '').description}
              </p>
              
              {/* Recovery Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Project</p>
                  <p className="text-white font-medium mt-0.5 truncate">{projectName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Target URL</p>
                  <p className="text-indigo-400 font-medium font-mono truncate mt-0.5">{targetUrl}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Workflow ID</p>
                  <p className="text-white font-mono truncate mt-0.5">{workflowId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Duration</p>
                  <p className="text-white mt-0.5">{formatDuration(finalDuration)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons / CTAs for Terminal State ─────────────────────── */}
      {isTerminal && (
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
          <Link
            to={`/app/reports/${workflowId}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{
              background: session?.status === 'COMPLETED'
                ? 'linear-gradient(135deg,#10b981,#34d399)'
                : session?.status === 'LOOP_DETECTED'
                ? 'linear-gradient(135deg,#eab308,#fb923c)'
                : 'linear-gradient(135deg,#f43f5e,#fb7185)',
              boxShadow: session?.status === 'COMPLETED'
                ? '0 0 24px rgba(16,185,129,0.25)'
                : session?.status === 'LOOP_DETECTED'
                ? '0 0 24px rgba(234,179,8,0.25)'
                : '0 0 24px rgba(244,63,94,0.25)'
            }}
          >
            {session?.status === 'COMPLETED' ? (
              <>
                <CheckCircle className="w-4 h-4" /> View Report <ArrowRight className="w-4 h-4" />
              </>
            ) : session?.status === 'LOOP_DETECTED' ? (
              <>
                <AlertTriangle className="w-4 h-4" /> View Diagnostic Report <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" /> View Diagnostic Report <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Link>
          <button
            onClick={() => navigate('/app/workflow')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)', color: '#9B72FA' }}
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
        <div className="h-px bg-gradient-to-r from-transparent via-[#7342E2]/22 to-transparent pointer-events-none" />

        {/* Tab bar */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['thoughts', 'actions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(115,66,226,0.12)' : 'transparent',
                  border: activeTab === tab ? '1px solid rgba(115,66,226,0.25)' : '1px solid transparent',
                  color: activeTab === tab ? '#9B72FA' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab === 'thoughts' ? <Brain className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {tab === 'thoughts' ? 'Thought Stream' : 'Timeline'}
                {tab === 'thoughts' && thoughts.length > 0 && (
                  <span className="rounded-full px-1.5 text-[10px]" style={{ background: 'rgba(115,66,226,0.15)', color: '#9B72FA' }}>
                    {thoughts.length}
                  </span>
                )}
                {tab === 'actions' && timelineMilestones.length > 0 && (
                  <span className="rounded-full px-1.5 text-[10px]" style={{ background: 'rgba(115,66,226,0.15)', color: '#9B72FA' }}>
                    {timelineMilestones.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          {!isTerminal && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400">
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
                style={{ background: 'rgba(115,66,226,0.08)', border: '1px solid rgba(115,66,226,0.18)' }}
              >
                <Zap className="w-7 h-7 animate-pulse text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-bold">Connecting…</p>
                <p className="text-sm mt-1 text-zinc-500">
                  Waiting for the AI agent to launch the browser and connect...
                </p>
              </div>
            </div>
          )}

          {/* Thought Stream */}
          {session && activeTab === 'thoughts' && (
            <div className="space-y-5">
              {thoughts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-12 justify-center text-zinc-500">
                  <Brain className="w-4 h-4 animate-pulse" />
                  <span>Waiting for first agent thought…</span>
                </div>
              ) : (
                thoughts.map(t => <ThoughtBubble key={t.id} thought={t} />)
              )}
              
              {/* Pulsating thinking loader */}
              {!isTerminal && session?.status === 'RUNNING' && (
                <div className="flex gap-3 items-start animate-pulse pt-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 bg-indigo-500/10 border border-indigo-500/25">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400">
                      Agent is analyzing page behaviors...
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={thoughtsEndRef} />
            </div>
          )}

          {/* Chronological Action Timeline */}
          {session && activeTab === 'actions' && (
            <div className="space-y-3">
              {timelineMilestones.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-12 justify-center text-zinc-500">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Waiting for first execution event…</span>
                </div>
              ) : (
                timelineMilestones.map((item, index) => (
                  <div key={item.id || index}>
                    {item.type === 'milestone' ? (
                      <MilestoneCard milestone={item} />
                    ) : (
                      <div className="flex items-start gap-3 pl-2">
                        <span
                          className="text-[10px] font-mono mt-3 w-14 text-right flex-shrink-0"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="flex-1">
                          <ActionChip action={item} />
                          {item.errorMessage && (
                            <p className="text-[11px] text-rose-400/80 mt-1 font-mono pl-1">{item.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    )}
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
