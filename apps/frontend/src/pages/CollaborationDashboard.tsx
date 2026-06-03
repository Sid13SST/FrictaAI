import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE } from '../lib/api';
const baseApiUrl = API_BASE.replace('/api', '');
import {
  MessageSquare,
  Users,
  ShieldAlert,
  Mail,
  Send,
  Plus,
  Play,
  Pause,
  Layers,
  MapPin,
  ExternalLink,
  CheckCircle,
  Bell,
  RefreshCw,
  Clock,
  Sparkles,
  Link2,
  Trash2,
  ArrowRight
} from 'lucide-react';


interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
}

interface SharedSession {
  id: string;
  shareToken: string;
  sharedWithEmail?: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
}

interface InvestigationThread {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  annotations: Array<{
    id: string;
    stepIndex: number;
    author: string;
    content: string;
    x?: number;
    y?: number;
    timestamp: string;
  }>;
}

interface OperationalAlert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  escalations: Array<{
    id: string;
    channel: string;
    recipient: string;
    status: string;
  }>;
}

export const CollaborationDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  
  // Data lists
  const [threads, setThreads] = useState<InvestigationThread[]>([]);
  const [sharedSessions, setSharedSessions] = useState<SharedSession[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Active Thread Details & Interactive Player State
  const [selectedThread, setSelectedThread] = useState<InvestigationThread | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [presenceUsers, setPresenceUsers] = useState([
    { email: 'developer_alpha@fricta.ai', action: 'Scrubbing Timeline', status: 'online' },
    { email: 'designer_beta@fricta.ai', action: 'Viewing Comments', status: 'online' },
    { email: 'reviewer@enterprise.com', action: 'Idle', status: 'away' }
  ]);

  // Comment Placement State
  const [commentText, setCommentText] = useState('');
  const [placementCoords, setPlacementCoords] = useState<{ x: number; y: number } | null>(null);
  const playerScreenRef = useRef<HTMLDivElement>(null);

  // New Thread Modal/Form State
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showThreadModal, setShowThreadModal] = useState(false);

  // Manual Alert Form State
  const [alertType, setAlertType] = useState<'SURVIVABILITY_DROP' | 'COGNITIVE_OVERLOAD' | 'REGRESSION'>('SURVIVABILITY_DROP');
  const [alertSeverity, setAlertSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertChannels, setAlertChannels] = useState<string[]>(['SLACK', 'EMAIL']);
  const [alertSlackHook, setAlertSlackHook] = useState('https://hooks.slack.com/services/T00/B00/mock-webhook');
  const [alertEmail, setAlertEmail] = useState('team-leads@fricta.ai');

  // Share Token Form State
  const [shareEmail, setShareEmail] = useState('');
  const [shareNotes, setShareNotes] = useState('');

  // Digest Subscription Form State
  const [digestEmail, setDigestEmail] = useState('');
  const [digestFrequency, setDigestFrequency] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [digestSubscriptionSuccess, setDigestSubscriptionSuccess] = useState(false);

  // Compiled Digest Overlay State
  const [compiledDigest, setCompiledDigest] = useState<any | null>(null);

  // Step Screenshot mapping (Simulated premium UI snapshots)
  const stepsScreenshots = [
    { title: 'Landing Dashboard View', url: '/landing', load: 10, survivability: 98, action: 'PageView' },
    { title: 'Configure Account Settings', url: '/settings', load: 15, survivability: 96, action: 'InputFields' },
    { title: 'Open Workspace Setup Wizard', url: '/wizard', load: 24, survivability: 95, action: 'Click Button' },
    { title: 'API Integration Setup', url: '/integrations', load: 68, survivability: 72, action: 'Wait for Sync' },
    { title: 'Create Collaborative Room', url: '/rooms', load: 45, survivability: 88, action: 'Add Annotation' },
    { title: 'Configure Slack Webhook Integration', url: '/config', load: 38, survivability: 92, action: 'Save Settings' },
    { title: 'Trigger Escalation Matrix', url: '/escalations', load: 50, survivability: 89, action: 'Choose Channel' },
    { title: 'Executive Digest Summary', url: '/digest', load: 18, survivability: 97, action: 'Click Export' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadCollaborationData(activeProjectId);
    }
  }, [activeProjectId]);

  // Handle auto-playing of steps
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % stepsScreenshots.length);
      }, 3000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/projects`);
      const data = await res.json();
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0) {
        setActiveProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborationData = async (projId: string) => {
    try {
      setLoading(true);
      const [threadsRes, sharedRes, alertsRes] = await Promise.all([
        apiFetch(`/collaboration/investigations?projectId=${projId}`),
        apiFetch(`/collaboration/replays?projectId=${projId}`),
        apiFetch(`/collaboration/alerts/escalations?projectId=${projId}`)
      ]);

      const threadsData = await threadsRes.json();
      const sharedData = await sharedRes.json();
      const alertsData = await alertsRes.json();

      setThreads(threadsData.threads || []);
      setSharedSessions(sharedData.sessions || []);
      setAlerts(alertsData.alerts || []);

      if (threadsData.threads && threadsData.threads.length > 0) {
        setSelectedThread(threadsData.threads[0]);
      } else {
        setSelectedThread(null);
      }
    } catch (err) {
      console.error('Failed to load collaboration lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !activeProjectId) return;

    try {
      const res = await apiFetch(`/collaboration/investigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          title: newThreadTitle
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewThreadTitle('');
        setShowThreadModal(false);
        loadCollaborationData(activeProjectId);
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
  };

  const handleResolveThread = async (threadId: string) => {
    try {
      const res = await apiFetch(`/collaboration/investigations/resolve/${threadId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        loadCollaborationData(activeProjectId);
      }
    } catch (err) {
      console.error('Failed to resolve thread:', err);
    }
  };

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !commentText.trim()) return;

    try {
      const res = await apiFetch(`/collaboration/threads/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThread.id,
          stepIndex: currentStep,
          author: 'you@local.fricta.internal',
          content: commentText,
          x: placementCoords?.x,
          y: placementCoords?.y
        })
      });
      const data = await res.json();
      if (data.success) {
        setCommentText('');
        setPlacementCoords(null);
        // Refresh active thread inside state
        const threadsRes = await apiFetch(`/collaboration/investigations?projectId=${activeProjectId}`);
        const threadsData = await threadsRes.json();
        const updatedList: InvestigationThread[] = threadsData.threads || [];
        setThreads(updatedList);
        const match = updatedList.find(t => t.id === selectedThread.id);
        if (match) {
          setSelectedThread(match);
        }
      }
    } catch (err) {
      console.error('Failed to add annotation comment:', err);
    }
  };

  const handleTriggerAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim() || !activeProjectId) return;

    try {
      const recipients: Record<string, string> = {};
      if (alertChannels.includes('SLACK')) recipients.SLACK = alertSlackHook;
      if (alertChannels.includes('EMAIL')) recipients.EMAIL = alertEmail;

      const res = await apiFetch(`/collaboration/alerts/escalations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          alertType,
          severity: alertSeverity,
          message: alertMessage,
          channels: alertChannels,
          recipients
        })
      });
      const data = await res.json();
      if (data.success) {
        setAlertMessage('');
        loadCollaborationData(activeProjectId);
      }
    } catch (err) {
      console.error('Failed to trigger manual incident alert:', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await apiFetch(`/collaboration/alerts/resolve/${alertId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        loadCollaborationData(activeProjectId);
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleGenerateShareToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    try {
      const res = await apiFetch(`/collaboration/replays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          workflowSessionId: selectedThread?.id || 'simulated-session-uuid',
          sharedWithEmail: shareEmail || 'anyone@local.fricta.internal',
          notes: shareNotes,
          expiresInDays: 3
        })
      });
      const data = await res.json();
      if (data.success) {
        setShareEmail('');
        setShareNotes('');
        loadCollaborationData(activeProjectId);
      }
    } catch (err) {
      console.error('Failed to create share token:', err);
    }
  };

  const handleSubscribeDigest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digestEmail.trim() || !activeProjectId) return;

    try {
      const res = await apiFetch(`/collaboration/digests/executive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          email: digestEmail,
          frequency: digestFrequency
        })
      });
      const data = await res.json();
      if (data.success) {
        setDigestSubscriptionSuccess(true);
        setDigestEmail('');
        setTimeout(() => setDigestSubscriptionSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to subscribe to digest:', err);
    }
  };

  const handleCompileDigest = async () => {
    if (!activeProjectId) return;

    try {
      const res = await apiFetch(`/collaboration/digests/executive?projectId=${activeProjectId}`);
      const data = await res.json();
      setCompiledDigest(data.digest);
    } catch (err) {
      console.error('Failed to compile digest:', err);
    }
  };

  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerScreenRef.current) return;
    const rect = playerScreenRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    setPlacementCoords({ x, y });
  };

  return (
    <div className="space-y-8 font-jakarta text-zinc-300">
      
      {/* ── HEADER & CONTEXT SELECTOR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessagesSquareIcon className="text-indigo-400 w-6 h-6" />
            Collaborative Investigation War Room
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Replay-aware operational coordination layer with Slack/Teams alerts, thread discussions, and weekly executive digests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono font-semibold text-zinc-500 uppercase">Context:</label>
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="bg-zinc-900/60 border border-white/[0.08] rounded-xl px-4 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50 backdrop-blur-md"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>

          <button
            onClick={() => loadCollaborationData(activeProjectId)}
            className="p-2 bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800/80 rounded-xl transition-all"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* ── TOP SECTION: WAR ROOMS & ACTIVE REPLAY VIEWER ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Shared Investigation Rooms (List) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Active War Rooms ({threads.length})
              </h2>
              <button
                onClick={() => setShowThreadModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg transition-all"
              >
                <Plus className="w-3 h-3" />
                NEW ROOM
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
              {threads.map((t) => {
                const isSelected = selectedThread?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 relative ${
                      isSelected
                        ? 'border-indigo-500/30 bg-indigo-500/[0.04]'
                        : 'border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {t.title}
                      </h3>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-zinc-500" />
                        {t.annotations.length} comments
                      </span>
                      <span>
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {t.status === 'ACTIVE' && isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveThread(t.id);
                        }}
                        className="mt-3 w-full py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg transition-all"
                      >
                        MARK AS RESOLVED
                      </button>
                    )}
                  </div>
                );
              })}

              {threads.length === 0 && (
                <div className="text-center py-8 text-xs text-zinc-600 font-mono">
                  No active rooms. Create one above to begin collaborative analysis.
                </div>
              )}
            </div>
          </div>

          {/* Local Sharing Token Generator (Solo Mode Fallback) */}
          <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-purple-400" />
              Solo Replay Sharing
            </h2>
            <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
              Generate a sharing token to invite external reviewers. Local sharing functions instantly without enterprise Slack integrations.
            </p>

            <form onSubmit={handleGenerateShareToken} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Reviewer Email (Optional)"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <textarea
                  placeholder="Notes for reviewer..."
                  value={shareNotes}
                  onChange={(e) => setShareNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-400 text-xs font-bold rounded-xl transition-all"
              >
                GENERATE SHARE LINK
              </button>
            </form>

            {sharedSessions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2">
                <span className="text-[10px] font-mono text-zinc-500">Active Share Links:</span>
                {sharedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/[0.02] text-[10px] font-mono">
                    <span className="text-zinc-400 truncate w-36">{s.shareToken}</span>
                    <a
                      href={`${baseApiUrl}/collaboration/replays/validate/${s.shareToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-0.5"
                    >
                      TEST <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Simulated Replay & Interactive Overlay Player */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
            
            {/* Player Header */}
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  Shared Session Viewer: {selectedThread?.title || 'No active investigation'}
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Active step: {currentStep + 1} of {stepsScreenshots.length} — {stepsScreenshots[currentStep].title}
                </span>
              </div>

              {/* Active presence indicators */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 mr-2">
                  {presenceUsers.map((u, i) => (
                    <div
                      key={u.email}
                      className={`w-6 h-6 rounded-full border border-zinc-950 flex items-center justify-center text-[10px] font-bold text-white shadow-lg`}
                      style={{
                        background: `hsl(${(i * 120) % 360}, 65%, 45%)`
                      }}
                      title={`${u.email} (${u.action})`}
                    >
                      {u.email[0].toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">({presenceUsers.length} in room)</span>
              </div>
            </div>

            {/* Interactive Player Screen Canvas */}
            <div
              ref={playerScreenRef}
              onClick={handlePlayerClick}
              className="relative aspect-video rounded-xl bg-zinc-900 border border-white/[0.06] overflow-hidden group cursor-crosshair flex flex-col items-center justify-center"
            >
              {/* Simulated UI App Screenshot */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-zinc-950 to-zinc-900 select-none">
                <div className="w-full max-w-md bg-zinc-900/90 rounded-xl border border-white/[0.08] p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-[10px] font-mono text-zinc-500">FRICTA SIMULATED ENVIRONMENT</span>
                    <span className="text-[10px] font-mono text-indigo-400">{stepsScreenshots[currentStep].url}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">{stepsScreenshots[currentStep].title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Simulated screen execution step #{currentStep + 1}. The user triggered action type <code className="text-purple-400 font-mono text-[10px]">{stepsScreenshots[currentStep].action}</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg text-center">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Cognitive Load</span>
                      <p className={`text-base font-bold font-mono mt-0.5 ${
                        stepsScreenshots[currentStep].load > 60 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {stepsScreenshots[currentStep].load}%
                      </p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg text-center">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Survivability Rate</span>
                      <p className={`text-base font-bold font-mono mt-0.5 ${
                        stepsScreenshots[currentStep].survivability < 80 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {stepsScreenshots[currentStep].survivability}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Placed annotation indicator */}
              {placementCoords && (
                <div
                  className="absolute w-5 h-5 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce"
                  style={{ left: `${placementCoords.x}%`, top: `${placementCoords.y}%` }}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Historic Step-linked Annotations on Canvas */}
              {selectedThread?.annotations
                .filter((a) => a.stepIndex === currentStep && a.x !== undefined && a.y !== undefined)
                .map((anno) => (
                  <div
                    key={anno.id}
                    className="absolute w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg group/marker cursor-help"
                    style={{ left: `${anno.x}%`, top: `${anno.y}%` }}
                  >
                    <MapPin className="w-3 h-3 text-white" />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/[0.08] px-3 py-1.5 rounded-lg text-[10px] text-zinc-300 w-48 hidden group-hover/marker:block z-20 shadow-2xl">
                      <p className="font-bold text-white truncate">{anno.author}</p>
                      <p className="mt-0.5">{anno.content}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Timeline player controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                {/* Timeline slider */}
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={stepsScreenshots.length - 1}
                    value={currentStep}
                    onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-zinc-900 border border-white/[0.04] rounded-lg cursor-pointer appearance-none"
                  />
                  {/* Annotation markers on timelines */}
                  {selectedThread?.annotations.map((a) => {
                    const ratio = a.stepIndex / (stepsScreenshots.length - 1);
                    return (
                      <div
                        key={a.id}
                        className="absolute w-2 h-2 bg-emerald-500 rounded-full border border-zinc-950 cursor-pointer"
                        style={{ left: `calc(${ratio * 100}% - 4px)` }}
                        title={`Comment by ${a.author} on Step ${a.stepIndex + 1}`}
                        onClick={() => setCurrentStep(a.stepIndex)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Discussion Comment Box Form */}
              {selectedThread ? (
                <form onSubmit={handleAddAnnotation} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={
                        placementCoords
                          ? `Annotate coordinate x:${placementCoords.x}% y:${placementCoords.y}% on Step ${currentStep + 1}...`
                          : `Type message... (Use @engineering to test @mentions)`
                      }
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      SEND
                    </button>
                  </div>
                  {placementCoords && (
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Clicking another area or sending saves comment to coordinates.</span>
                      <button
                        type="button"
                        onClick={() => setPlacementCoords(null)}
                        className="text-rose-400 hover:underline"
                      >
                        Clear marker
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="text-center text-xs text-zinc-600 font-mono py-2">
                  Select or create an investigation thread to post comments.
                </div>
              )}
            </div>

            {/* Render selected thread discussions list */}
            {selectedThread && selectedThread.annotations.length > 0 && (
              <div className="mt-4 border-t border-white/[0.04] pt-4 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Timeline Discussions:</span>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {selectedThread.annotations.map((comment) => (
                    <div key={comment.id} className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-zinc-300">{comment.author}</span>
                        <span className="font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Step {comment.stepIndex + 1} • {new Date(comment.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{comment.content}</p>
                      {comment.x !== null && comment.y !== null && (
                        <div className="text-[9px] font-mono text-indigo-400">
                          Linked coordinates: x:{comment.x}% y:{comment.y}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTIONS: INCIDENT ALERTS & WEEKLY EXECUTIVE DIGESTS ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Operational Incident Alerts */}
        <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Operational Alert Center
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Trigger manual incident alerts, choose routing channels, and view active survivability escalations.
            </p>
          </div>

          <form onSubmit={handleTriggerAlert} className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-white/[0.03]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Alert Type</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none"
                >
                  <option value="SURVIVABILITY_DROP">Survivability Drop</option>
                  <option value="COGNITIVE_OVERLOAD">Cognitive Overload</option>
                  <option value="REGRESSION">Regression</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Severity</label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Message</label>
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Describe the incident load parameters..."
                rows={2}
                className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Escalation Channels</label>
              <div className="flex gap-4">
                {['SLACK', 'EMAIL', 'DISCORD', 'TEAMS'].map((ch) => {
                  const active = alertChannels.includes(ch);
                  return (
                    <button
                      type="button"
                      key={ch}
                      onClick={() =>
                        setAlertChannels(
                          active ? alertChannels.filter((c) => c !== ch) : [...alertChannels, ch]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        active
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-zinc-900 border-white/[0.04] text-zinc-400'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {alertChannels.includes('SLACK') && (
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase">Slack Webhook URL</label>
                <input
                  type="text"
                  value={alertSlackHook}
                  onChange={(e) => setAlertSlackHook(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            )}

            {alertChannels.includes('EMAIL') && (
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase">Recipient Email</label>
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-all"
            >
              ESCALATE INCIDENT
            </button>
          </form>

          {/* Active incidents list */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Active Alert Logs:</span>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {alerts.map((al) => (
                <div key={al.id} className="bg-white/[0.01] border border-white/[0.02] p-4 rounded-xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        al.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {al.severity}
                      </span>
                      <span className="text-xs font-bold text-zinc-300">{al.alertType}</span>
                    </div>
                    {!al.resolved ? (
                      <button
                        onClick={() => handleResolveAlert(al.id)}
                        className="text-[10px] font-mono text-emerald-400 hover:underline"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">{al.message}</p>
                  
                  {al.escalations && al.escalations.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {al.escalations.map((esc) => (
                        <span key={esc.id} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          esc.status === 'SENT' ? 'bg-zinc-800 text-zinc-400' : 'bg-rose-500/5 text-rose-400'
                        }`}>
                          {esc.channel}: {esc.status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Weekly Executive Digest Subscriptions */}
        <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              Executive Digest Console
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Configure daily/weekly executive email summary schedules and compile mock digest trend reports.
            </p>
          </div>

          <form onSubmit={handleSubscribeDigest} className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-white/[0.03]">
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Subscriber Email</label>
                <input
                  type="email"
                  required
                  placeholder="executive@company.com"
                  value={digestEmail}
                  onChange={(e) => setDigestEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Frequency</label>
                <select
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all"
            >
              SUBSCRIBE TO DIGESTS
            </button>
            {digestSubscriptionSuccess && (
              <p className="text-[10px] text-emerald-400 font-mono text-center">Subscription saved successfully!</p>
            )}
          </form>

          {/* Test compile summary */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Weekly Compilation Preview:</span>
              <button
                onClick={handleCompileDigest}
                className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> COMPILE DIGEST NOW
              </button>
            </div>

            {compiledDigest ? (
              <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-xs font-bold text-white font-mono">Fricta Operational Digest</span>
                  <span className="text-[9px] font-mono text-zinc-500">Seeded: {new Date(compiledDigest.compiledAt).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.02]">
                    <span className="text-[8px] font-mono text-zinc-500">Sessions</span>
                    <p className="text-xs font-bold text-white mt-0.5">{compiledDigest.totalSessionsAnalyzed}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.02]">
                    <span className="text-[8px] font-mono text-zinc-500">Survivability</span>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{compiledDigest.avgSurvivability}%</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.02]">
                    <span className="text-[8px] font-mono text-zinc-500">Spikes</span>
                    <p className="text-xs font-bold text-rose-400 mt-0.5">{compiledDigest.criticalIncidentsCount}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">Top High-Friction timeline steps:</span>
                  {compiledDigest.topFrictionPoints?.map((pt: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>{pt.step}</span>
                      <span className="font-mono text-rose-400">{pt.count} abandonment triggers</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white/[0.01] rounded-xl border border-dashed border-white/[0.04] text-xs text-zinc-600 font-mono">
                Click Compile Digest Preview above to generate executive trend analytics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NEW THREAD MODAL ─────────────────────────────────────────────────── */}
      {showThreadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/[0.08] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Create Investigation Room</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Initiate a collaborative discussion thread around a replay session.</p>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Thread Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken checkout CTA button behavior"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3 py-2 mt-1 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowThreadModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold rounded-xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all"
                >
                  CREATE ROOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple icon mappings to avoid missing custom imports
function MessagesSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}
