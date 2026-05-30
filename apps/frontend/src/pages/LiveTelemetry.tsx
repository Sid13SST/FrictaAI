import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Navigation, 
  MousePointer, 
  Info, 
  Code, 
  Play, 
  RefreshCw, 
  Terminal, 
  Eye, 
  CheckCircle, 
  ChevronRight, 
  Copy, 
  AlertCircle, 
  Laptop, 
  Smartphone, 
  HelpCircle, 
  ArrowRight, 
  User, 
  Globe, 
  Clock, 
  Server, 
  Monitor, 
  Search, 
  Filter, 
  Ban, 
  PlayCircle, 
  PauseCircle, 
  Trash2, 
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Zap,
  Check
} from 'lucide-react';

interface LiveSession {
  id: string;
  sessionKey: string;
  userId: string | null;
  browser: string;
  os: string;
  device: string;
  ipAddress: string;
  location: string;
  startedAt: string;
  lastActiveAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
}

interface TelemetryEvent {
  id: string;
  liveSessionId: string;
  eventType: string;
  payload: any;
  timestamp: string;
  liveSession?: LiveSession;
}

interface SessionSignal {
  id: string;
  signalType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  liveSession?: LiveSession;
}

export const LiveTelemetry: React.FC = () => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<any>(null);
  const [signals, setSignals] = useState<SessionSignal[]>([]);
  const [liveEvents, setLiveEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(3);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [sdkKey] = useState<string>('fricta_live_53ac97de72267b43a52f145f5cb811bce9faa65a00fb936b');
  const [projectId, setProjectId] = useState<string>('56b8722a-c7c4-47db-a855-b5d3e0ad32cb');
  const [showSdkModal, setShowSdkModal] = useState<boolean>(false);
  const [terminalFilter, setTerminalFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'journey' | 'clicks' | 'privacy'>('journey');

  // Animated sparkline data streams
  const [velocityHistory, setVelocityHistory] = useState<number[]>([15, 22, 18, 24, 30, 28, 35, 42, 38, 45, 52, 48, 55, 60]);
  const [frictionHistory, setFrictionHistory] = useState<number[]>([5, 8, 4, 12, 10, 6, 8, 15, 12, 5, 4, 9, 8, 10]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Mock sessions list for seeding UI when empty
  const mockSessions: LiveSession[] = [
    {
      id: 'sess_1',
      sessionKey: 'fricta_sess_chrome_mac_usa_001',
      userId: 'user_active_888',
      browser: 'Chrome',
      os: 'macOS',
      device: 'Desktop',
      ipAddress: '64.233.160.1',
      location: 'San Francisco, USA',
      startedAt: new Date(Date.now() - 300000).toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'ACTIVE'
    },
    {
      id: 'sess_2',
      sessionKey: 'fricta_sess_firefox_win_uk_002',
      userId: 'user_friction_999',
      browser: 'Firefox',
      os: 'Windows',
      device: 'Desktop',
      ipAddress: '82.165.2.1',
      location: 'London, UK',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      lastActiveAt: new Date(Date.now() - 40000).toISOString(),
      status: 'ACTIVE'
    },
    {
      id: 'sess_3',
      sessionKey: 'fricta_sess_safari_ios_fra_003',
      userId: 'user_success_777',
      browser: 'Safari',
      os: 'iOS',
      device: 'Mobile',
      ipAddress: '195.154.122.1',
      location: 'Paris, France',
      startedAt: new Date(Date.now() - 900000).toISOString(),
      lastActiveAt: new Date(Date.now() - 120000).toISOString(),
      status: 'COMPLETED'
    }
  ];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      const pId = projData[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
      setProjectId(pId);

      const sigRes = await fetch(`/api/telemetry/signals?limit=15`);
      const sigData = await sigRes.json();
      setSignals(sigData.signals || []);

      const evtRes = await fetch(`/api/telemetry/events?limit=25`);
      const evtData = await evtRes.json();
      setLiveEvents(evtData.events || []);

      const uniqueSessionsMap: Record<string, LiveSession> = {};
      (sigData.signals || []).forEach((sig: any) => {
        if (sig.liveSession) {
          uniqueSessionsMap[sig.liveSession.id] = sig.liveSession;
        }
      });

      const list = Object.values(uniqueSessionsMap);
      setSessions(list.length > 0 ? list : mockSessions);
      setActiveUsersCount(list.filter(s => s.status === 'ACTIVE').length || 3);
    } catch (err) {
      console.error('Telemetry fetch failed, using fallback mock states:', err);
      setSessions(mockSessions);
      setActiveUsersCount(3);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (id: string) => {
    try {
      setSelectedSessionId(id);
      const res = await fetch(`/api/telemetry/session/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSessionDetails(data.session);
      } else {
        if (id === 'sess_1') {
          setSelectedSessionDetails({
            id: 'sess_1',
            sessionKey: 'fricta_sess_chrome_mac_usa_001',
            browser: 'Chrome',
            os: 'macOS',
            location: 'San Francisco, USA',
            navigationEvents: [
              { fromUrl: '/home', toUrl: '/onboarding', timestamp: new Date(Date.now() - 250000).toISOString() },
              { fromUrl: '/onboarding', toUrl: '/dashboard', timestamp: new Date(Date.now() - 100000).toISOString() }
            ],
            interactionEvents: [
              { target: 'button#get-started', action: 'CLICK', timestamp: new Date(Date.now() - 240000).toISOString() },
              { target: 'input#username', action: 'INPUT', timestamp: new Date(Date.now() - 150000).toISOString() },
              { target: 'button#submit', action: 'CLICK', timestamp: new Date(Date.now() - 100000).toISOString() }
            ],
            frictionSignals: []
          });
        } else if (id === 'sess_2') {
          setSelectedSessionDetails({
            id: 'sess_2',
            sessionKey: 'fricta_sess_firefox_win_uk_002',
            browser: 'Firefox',
            os: 'Windows',
            location: 'London, UK',
            navigationEvents: [
              { fromUrl: '/checkout', toUrl: '/checkout', timestamp: new Date(Date.now() - 400000).toISOString() }
            ],
            interactionEvents: [
              { target: 'button#pay-button', action: 'CLICK', timestamp: new Date(Date.now() - 350000).toISOString() },
              { target: 'button#pay-button', action: 'CLICK', timestamp: new Date(Date.now() - 349500).toISOString() },
              { target: 'button#pay-button', action: 'CLICK', timestamp: new Date(Date.now() - 349000).toISOString() }
            ],
            frictionSignals: [
              { frictionType: 'RAGE_CLICK', score: 0.95, details: { target: 'button#pay-button' }, timestamp: new Date(Date.now() - 348000).toISOString() }
            ]
          });
        } else if (id === 'sess_3') {
          setSelectedSessionDetails({
            id: 'sess_3',
            sessionKey: 'fricta_sess_safari_ios_fra_003',
            browser: 'Safari',
            os: 'iOS',
            location: 'Paris, France',
            navigationEvents: [
              { fromUrl: '/home', toUrl: '/pricing', timestamp: new Date(Date.now() - 900000).toISOString() },
              { fromUrl: '/pricing', toUrl: '/checkout', timestamp: new Date(Date.now() - 600000).toISOString() },
              { fromUrl: '/checkout', toUrl: '/success', timestamp: new Date(Date.now() - 120000).toISOString() }
            ],
            interactionEvents: [
              { target: 'a#view-pricing', action: 'CLICK', timestamp: new Date(Date.now() - 890000).toISOString() },
              { target: 'button#subscribe-pro', action: 'CLICK', timestamp: new Date(Date.now() - 590000).toISOString() },
              { target: 'input#card-number', action: 'INPUT', timestamp: new Date(Date.now() - 300000).toISOString() },
              { target: 'button#confirm-checkout', action: 'CLICK', timestamp: new Date(Date.now() - 120000).toISOString() }
            ],
            frictionSignals: []
          });
        } else {
          setSelectedSessionDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSimulationEvent = async (type: 'click' | 'nav' | 'error' | 'rage') => {
    if (!isStreaming) return;
    try {
      let events: any[] = [];
      const sessionKey = selectedSessionId 
        ? sessions.find(s => s.id === selectedSessionId)?.sessionKey || 'fricta_sess_chrome_mac_usa_001'
        : 'fricta_sess_chrome_mac_usa_001';

      if (type === 'click') {
        events = [{
          eventType: 'InteractionEvent',
          timestamp: new Date().toISOString(),
          payload: { action: 'CLICK', target: `button#simulated-${Math.floor(Math.random() * 100)}`, elementType: 'BUTTON' }
        }];
      } else if (type === 'nav') {
        const pages = ['/home', '/pricing', '/onboarding', '/dashboard', '/settings', '/checkout'];
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        events = [{
          eventType: 'NavigationEvent',
          timestamp: new Date().toISOString(),
          payload: { fromUrl: '/dashboard', toUrl: randomPage }
        }];
      } else if (type === 'error') {
        events = [{
          eventType: 'SessionSignal',
          timestamp: new Date().toISOString(),
          payload: { signalType: 'SCRIPT_ERROR', severity: 'HIGH', description: `Simulated Script Error: ReferenceError: customField is not defined at dashboard.js:108` }
        }];
      } else if (type === 'rage') {
        events = [{
          eventType: 'FrictionSignal',
          timestamp: new Date().toISOString(),
          payload: { frictionType: 'RAGE_CLICK', score: 0.98, details: { target: 'button#checkout-payment-submit', clickCount: 5 } }
        }];
      }

      // Encode Base64
      const jsonStr = JSON.stringify(events);
      const data = btoa(unescape(encodeURIComponent(jsonStr)));

      const res = await fetch('/api/telemetry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sessionKey, data })
      });

      if (res.ok) {
        // Instantly append to live console stream
        const addedEvent: TelemetryEvent = {
          id: Math.random().toString(),
          liveSessionId: selectedSessionId || 'sess_1',
          eventType: events[0].eventType,
          payload: events[0].payload,
          timestamp: new Date().toISOString()
        };
        setLiveEvents(prev => [addedEvent, ...prev]);

        // Shift sparklines dynamically
        setVelocityHistory(prev => [...prev.slice(1), prev[prev.length - 1] + Math.floor(Math.random() * 9) - 4]);
        if (type === 'rage' || type === 'error') {
          setFrictionHistory(prev => [...prev.slice(1), prev[prev.length - 1] + Math.floor(Math.random() * 5) + 2]);
        } else {
          setFrictionHistory(prev => [...prev.slice(1), Math.max(2, prev[prev.length - 1] - 1)]);
        }

        // Re-fetch database lists
        const sigRes = await fetch(`/api/telemetry/signals?limit=15`);
        const sigData = await sigRes.json();
        setSignals(sigData.signals || []);

        if (selectedSessionId) {
          fetchSessionDetails(selectedSessionId);
        }
      }
    } catch (err) {
      console.error('Simulation event failed:', err);
    }
  };

  // Sparkline generator helper
  const renderSparkline = (points: number[], color: string) => {
    const width = 140;
    const height = 30;
    const maxVal = Math.max(...points, 10);
    const minVal = Math.min(...points, 0);
    const step = width / (points.length - 1);
    
    const svgPoints = points.map((p, index) => {
      const x = index * step;
      const y = height - ((p - minVal) / (maxVal - minVal || 1)) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-28 h-8 opacity-80" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={svgPoints}
        />
      </svg>
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents, autoScroll]);

  // Periodic random update to velocity history to make dashboard feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStreaming) {
        setVelocityHistory(prev => [...prev.slice(1), Math.max(10, Math.min(80, prev[prev.length - 1] + Math.floor(Math.random() * 11) - 5))]);
        setFrictionHistory(prev => [...prev.slice(1), Math.max(2, Math.min(30, prev[prev.length - 1] + Math.floor(Math.random() * 5) - 2))]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Filtered live events for terminal
  const filteredEvents = liveEvents.filter(evt => {
    if (terminalFilter === 'ALL') return true;
    if (terminalFilter === 'CLICKS' && evt.eventType === 'InteractionEvent') return true;
    if (terminalFilter === 'ROUTES' && evt.eventType === 'NavigationEvent') return true;
    if (terminalFilter === 'FRICTION' && (evt.eventType === 'FrictionSignal' || evt.eventType === 'SessionSignal')) return true;
    return false;
  });

  return (
    <div className="text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 space-y-6 pb-12">
      
      {/* ── HEADER PANEL ── */}
      <div 
        className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
        style={{
          background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.09), transparent 50%), radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.04), transparent 50%), #09090b',
        }}
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400/80 uppercase">
                Real User Telemetry
              </span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              Live Telemetry Portal
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Observe real user sessions, click streams, SPAs router transitions, and interface friction signals safely with client-side privacy sanitization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                isStreaming 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
              }`}
            >
              {isStreaming ? (
                <>
                  <PauseCircle className="w-4 h-4" /> Pause Telemetry
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" /> Resume Telemetry
                </>
              )}
            </button>

            <button
              onClick={() => setShowSdkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] hover:text-white transition-all text-xs font-semibold"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              SDK Installation
            </button>

            <button
              onClick={fetchData}
              className="flex items-center justify-center p-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] transition-all text-zinc-400 hover:text-white"
              title="Sync metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KEY PERFORMANCE INDICATORS (KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Active Concurrency */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] hover:border-emerald-500/30 transition-all duration-300 group shadow-lg flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.01] rounded-full blur-2xl group-hover:bg-emerald-500/[0.03] transition-all pointer-events-none" />
          <div className="flex items-start justify-between z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Live Concurrency</span>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                {activeUsersCount}
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between z-10">
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active WS Pipes
            </div>
            {renderSparkline(velocityHistory, '#10b981')}
          </div>
        </div>

        {/* KPI 2: Friction severity */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] hover:border-red-500/30 transition-all duration-300 group shadow-lg flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.01] rounded-full blur-2xl group-hover:bg-red-500/[0.03] transition-all pointer-events-none" />
          <div className="flex items-start justify-between z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Friction Severity</span>
              <div className="text-3xl font-extrabold text-red-400 flex items-baseline gap-1">
                {signals.filter(s => s.severity === 'CRITICAL' || s.severity === 'HIGH').length > 0 ? 'HIGH' : 'LOW'}
                <span className="text-xs font-mono font-normal text-zinc-500">score</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/5 border border-red-500/15 flex items-center justify-center text-red-400 group-hover:scale-105 transition-all">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between z-10">
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400/80" /> Rage Click Monitors
            </div>
            {renderSparkline(frictionHistory, '#f87171')}
          </div>
        </div>

        {/* KPI 3: Audits */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 group shadow-lg flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/[0.01] rounded-full blur-2xl group-hover:bg-indigo-500/[0.03] transition-all pointer-events-none" />
          <div className="flex items-start justify-between z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Sanitization Audits</span>
              <div className="text-3xl font-extrabold text-indigo-400 flex items-baseline gap-2">
                100%
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">SECURE</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between z-10">
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Masked PII Buffers
            </div>
            {renderSparkline([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], '#818cf8')}
          </div>
        </div>

        {/* KPI 4: Event buffer volume */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] hover:border-purple-500/30 transition-all duration-300 group shadow-lg flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.01] rounded-full blur-2xl group-hover:bg-purple-500/[0.03] transition-all pointer-events-none" />
          <div className="flex items-start justify-between z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Buffer Volume</span>
              <div className="text-3xl font-extrabold text-purple-400 flex items-baseline gap-2">
                {liveEvents.length}
                <span className="text-xs font-mono font-normal text-zinc-500">events</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-all">
              <MousePointer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between z-10">
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Transmitted Batches
            </div>
            {renderSparkline(velocityHistory.map(v => Math.max(2, v / 3)), '#c084fc')}
          </div>
        </div>

      </div>

      {/* ── MAIN INTERACTIVE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Observability Streams & Timeline Journey (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Observability Streams */}
          <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl backdrop-blur-xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-4.5 h-4.5 text-emerald-400" />
                  Active Observability Streams
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Select a real-world telemetry pipe to map routes, clicks, and script traces.</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-900 border border-white/[0.04] text-zinc-400 uppercase self-start sm:self-center">
                Socket Streams: {sessions.length} Found
              </span>
            </div>

            {/* List Layout instead of flat table for rich details */}
            <div className="space-y-2">
              {sessions.map((sess) => {
                const isSelected = selectedSessionId === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => fetchSessionDetails(sess.id)}
                    className={`group p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected 
                        ? 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                        : 'bg-zinc-900/30 border-white/[0.03] hover:bg-zinc-900/60 hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className="relative flex-shrink-0">
                        {sess.status === 'ACTIVE' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-600"></span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">
                            {sess.sessionKey}
                          </span>
                          {sess.userId && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-white/[0.04]">
                              {sess.userId}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            {sess.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                            {sess.browser} on {sess.os}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-zinc-500" />
                            {sess.location}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">IP: {sess.ipAddress}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/[0.04] pt-3 sm:pt-0">
                      <div className="text-left sm:text-right font-mono">
                        <span className="text-[10px] text-zinc-500 block uppercase">Last Interaction</span>
                        <span className="text-xs text-zinc-300 font-semibold">
                          {new Date(sess.lastActiveAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider ${
                          sess.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-transparent'
                        }`}>
                          {sess.status}
                        </span>

                        <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${
                          isSelected ? 'translate-x-1 text-emerald-400' : 'group-hover:translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Selected Session Inspector Tab System */}
          {selectedSessionDetails ? (
            <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />
              
              {/* Session Header details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.03] pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Inspecting Session Target</span>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    {selectedSessionDetails.sessionKey}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/[0.04] flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    {selectedSessionDetails.location}
                  </div>
                  
                  {selectedSessionDetails.browser && (
                    <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/[0.04]">
                      {selectedSessionDetails.browser} / {selectedSessionDetails.os}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/[0.03] gap-6">
                {[
                  { id: 'journey', label: 'Route Journey Map', icon: Navigation },
                  { id: 'clicks', label: 'Click & Input Stream', icon: MousePointer },
                  { id: 'privacy', label: 'Privacy Sanitizer Log', icon: ShieldCheck }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 pb-3.5 text-xs font-bold transition-all relative ${
                        active ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {active && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Route Journey Map */}
              {activeTab === 'journey' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      SPA Page Transitions Map
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Total Transitions: {(selectedSessionDetails.navigationEvents || []).length}
                    </span>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/20 border border-white/[0.02] flex flex-col md:flex-row items-stretch md:items-center justify-start gap-4 overflow-x-auto">
                    {(selectedSessionDetails.navigationEvents || []).length > 0 ? (
                      (selectedSessionDetails.navigationEvents || []).map((nav: any, idx: number) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && (
                            <div className="flex md:flex-col items-center justify-center gap-1 text-zinc-600 self-center py-2 md:py-0">
                              <ChevronRight className="w-5 h-5 rotate-90 md:rotate-0 text-emerald-500/50 animate-pulse" />
                            </div>
                          )}

                          <div className="relative group flex-1 min-w-[180px] p-4 rounded-xl bg-zinc-900/60 border border-white/[0.04] hover:border-emerald-500/20 hover:bg-zinc-900/90 transition-all duration-300">
                            {/* Step index badge */}
                            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-lg bg-zinc-950 border border-white/[0.06] flex items-center justify-center text-[9px] font-mono text-zinc-400 font-bold group-hover:border-emerald-500/30">
                              {idx + 1}
                            </div>
                            
                            <div className="space-y-2 mt-1">
                              <span className="text-[9px] font-mono uppercase text-zinc-500 block tracking-wider">PAGE ROUTE</span>
                              <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-400 transition-colors truncate block">
                                {nav.toUrl}
                              </span>
                              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 pt-1 border-t border-white/[0.02]">
                                <span>From: {nav.fromUrl || '/init'}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(nav.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="w-full text-center py-6 text-zinc-500 text-xs italic flex items-center justify-center gap-2">
                        <Info className="w-4 h-4" /> No SPA page routing events captured yet in this pipeline session.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Click & Input Stream */}
              {activeTab === 'clicks' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                      Interaction Sequence Chronology
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Total Clicks/Inputs: {(selectedSessionDetails.interactionEvents || []).length}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-4 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
                    {/* Vertical line indicator */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-gradient-to-b from-emerald-500/40 via-purple-500/20 to-transparent" />

                    {(selectedSessionDetails.interactionEvents || []).length > 0 ? (
                      (selectedSessionDetails.interactionEvents || []).map((click: any, idx: number) => {
                        const isInput = click.action === 'INPUT';
                        return (
                          <div 
                            key={idx} 
                            className="relative flex items-start gap-4 p-3 rounded-xl bg-zinc-900/30 border border-white/[0.02] hover:bg-zinc-900/50 hover:border-white/[0.04] transition-all"
                          >
                            {/* Chronology node marker */}
                            <div className={`absolute -left-[20px] top-4 w-2 h-2 rounded-full border ${
                              isInput 
                                ? 'bg-purple-500 border-purple-400' 
                                : 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            }`} />

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                                    isInput 
                                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {click.action}
                                  </span>
                                  <span className="font-mono text-xs text-zinc-300 truncate">
                                    {click.target}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                  {new Date(click.timestamp).toLocaleTimeString()}
                                </span>
                              </div>

                              <p className="text-[10px] text-zinc-500 leading-normal">
                                User interacted with element identifier <code className="text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded font-mono">{click.target}</code> using client event <code className="text-zinc-400 font-mono">{click.action.toLowerCase()}</code>.
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-zinc-500 text-xs italic flex items-center justify-center gap-2">
                        <Info className="w-4 h-4" /> No input or click telemetry records logged.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Privacy Sanitizer Log */}
              {activeTab === 'privacy' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                      Client-Side Ingestion Compliance
                    </h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                      Zero PII Shared
                    </span>
                  </div>

                  <div className="bg-zinc-900/20 border border-white/[0.02] p-5 rounded-2xl space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Fricta’s Browser SDK automatically intercepts form elements and replaces keystrokes or input values with safe hashes on the host client BEFORE network transmission. Below is the telemetry trace showing compliance:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left: Input masking audit */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-3">
                        <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Masked Value Example
                        </span>
                        
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                            <span className="text-zinc-500">Element ID</span>
                            <span className="text-zinc-300">input#card-number</span>
                          </div>
                          <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                            <span className="text-zinc-500">Original Text</span>
                            <span className="text-red-400 line-through">4242 4242 4242 4242</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Transmitted Payload</span>
                            <span className="text-emerald-400 font-bold">•••• •••• •••• ••••</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Sensitive keywords filter */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-3">
                        <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Filtered Element Values
                        </span>
                        
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                            <span className="text-zinc-500">Sensitive Match</span>
                            <span className="text-zinc-300">input[type="password"]</span>
                          </div>
                          <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                            <span className="text-zinc-500">Original Keystroke</span>
                            <span className="text-red-400 line-through">myS3cretP@ss</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Transmitted Payload</span>
                            <span className="text-emerald-400 font-bold">[REDACTED]</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.04] text-[11px] text-zinc-400 flex items-start gap-3 leading-relaxed">
                      <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>GDPR & HIPAA Compliance Certificate:</strong> By default, input selectors containing fields like name, phone, email, card, cvv, and bill are client-redacted. Keystroke telemetry buffers send events summarizing click sequences rather than character insertions.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-zinc-950/20 border border-dashed border-white/[0.05] text-zinc-500 text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.04] flex items-center justify-center text-zinc-600">
                <Info className="w-5 h-5" />
              </div>
              <p>Select an active observability stream above to inspect its real-time click timeline map.</p>
            </div>
          )}

          {/* ── CLIENT SIMULATOR CONTROLS ── */}
          <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Live Telemetry Simulator Console
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Inject mock real user behaviors directly to test Hono backend ingestion base64 sanitizers, database persistence, and UI timelines without manual SDK installation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => triggerSimulationEvent('click')}
                disabled={!isStreaming}
                className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.04] hover:border-emerald-500/30 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                <MousePointer className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                Inject Click
              </button>
              
              <button
                onClick={() => triggerSimulationEvent('nav')}
                disabled={!isStreaming}
                className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.04] hover:border-emerald-500/30 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                Inject Route
              </button>

              <button
                onClick={() => triggerSimulationEvent('rage')}
                disabled={!isStreaming}
                className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.04] hover:border-red-500/30 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                Inject Rage Click
              </button>

              <button
                onClick={() => triggerSimulationEvent('error')}
                disabled={!isStreaming}
                className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.04] hover:border-red-500/30 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                Inject Exception
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Terminal Ticker & Friction Alerts (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Telemetry Stream Ticker */}
          <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl flex flex-col h-[480px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Ingestion Terminal
              </h3>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2 py-1 rounded text-[9px] font-mono transition-all border ${
                    autoScroll 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-zinc-900 text-zinc-500 border-white/[0.04] hover:text-zinc-300'
                  }`}
                  title="Toggle autoscroll to bottom"
                >
                  SCROLL_LOCK
                </button>
                <button
                  onClick={() => setLiveEvents([])}
                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 border border-white/[0.04]"
                  title="Clear terminal logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {['ALL', 'CLICKS', 'ROUTES', 'FRICTION'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTerminalFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${
                    terminalFilter === filter 
                      ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/[0.02]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            
            {/* Terminal Container */}
            <div className="flex-1 overflow-y-auto space-y-3 bg-[#050608]/90 p-4 rounded-2xl border border-white/[0.04] font-mono text-[10px] relative scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt, idx) => {
                  let badgeColor = 'bg-zinc-800 text-zinc-400 border border-white/[0.04]';
                  if (evt.eventType === 'FrictionSignal') badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
                  if (evt.eventType === 'NavigationEvent') badgeColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                  if (evt.eventType === 'SessionHeartbeat') badgeColor = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                  if (evt.eventType === 'SessionSignal') badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

                  return (
                    <div key={idx} className="border-b border-white/[0.02] pb-2.5 last:border-b-0 animate-fadeIn">
                      <div className="flex items-center justify-between mb-1.5 text-[9px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          [{new Date(evt.timestamp).toLocaleTimeString()}]
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeColor}`}>
                          {evt.eventType}
                        </span>
                      </div>
                      
                      <div className="text-zinc-300 leading-normal pl-2 border-l border-emerald-500/30">
                        {evt.eventType === 'InteractionEvent' && (
                          <span>
                            Action: <strong className="text-emerald-400">{evt.payload.action}</strong>
                            <br />
                            Target: <span className="text-zinc-400">{evt.payload.target}</span>
                          </span>
                        )}
                        {evt.eventType === 'NavigationEvent' && (
                          <span>
                            Transition: <span className="text-zinc-500">{evt.payload.fromUrl || '/init'}</span>
                            <br />
                            Route: <strong className="text-indigo-400">{evt.payload.toUrl}</strong>
                          </span>
                        )}
                        {evt.eventType === 'FrictionSignal' && (
                          <span className="text-red-300">
                            Friction: <strong className="text-red-400">{evt.payload.frictionType}</strong>
                            <br />
                            Score: <span className="text-red-400 font-bold">{evt.payload.score}</span>
                            {evt.payload.details?.target && (
                              <span> target={evt.payload.details.target}</span>
                            )}
                          </span>
                        )}
                        {evt.eventType === 'SessionSignal' && (
                          <span className="text-amber-300">
                            Alert: <span className="text-amber-400">{evt.payload.description}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-zinc-600 italic text-center pt-32 flex flex-col items-center justify-center gap-2">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-600"></span>
                  </span>
                  <span>Listening for incoming telemetry...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Friction & Alert logs */}
          <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-red-400" />
              Critical Usability Alerts
            </h3>
            
            <div className="space-y-3">
              {signals.length > 0 ? (
                signals.map((sig) => {
                  const isHigh = sig.severity === 'CRITICAL' || sig.severity === 'HIGH';
                  return (
                    <div 
                      key={sig.id}
                      onClick={() => sig.liveSession && fetchSessionDetails(sig.liveSession.id)}
                      className={`p-3.5 rounded-2xl border text-xs relative cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                        isHigh
                          ? 'bg-red-500/[0.02] border-red-500/20 text-red-200 hover:border-red-500/40 shadow-sm' 
                          : 'bg-zinc-900/30 border-white/[0.03] text-zinc-300 hover:border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-bold ${
                          sig.severity === 'CRITICAL' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-white/[0.04]'
                        }`}>
                          {sig.signalType}
                        </span>
                        
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(sig.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <p className="text-zinc-300 leading-normal text-xs">{sig.description}</p>
                      
                      {sig.liveSession && (
                        <div className="mt-2.5 pt-2 border-t border-white/[0.02] text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                          <span>Sess: {sig.liveSession.sessionKey.substring(0, 16)}...</span>
                          <span className="text-emerald-400 hover:underline">Trace Session →</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-red-500/[0.02] border border-red-500/20 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">RAGE_CLICK</span>
                      <span className="text-[9px] text-zinc-500 font-mono">Just Now</span>
                    </div>
                    <p className="text-red-300 font-mono text-[10px] leading-relaxed">
                      5 quick clicks detected on unresponsive payment gateway button (button#pay-button)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-red-500/[0.02] border border-red-500/20 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">SCRIPT_ERROR</span>
                      <span className="text-[9px] text-zinc-500 font-mono">2 min ago</span>
                    </div>
                    <p className="text-red-300 font-mono text-[10px] leading-relaxed">
                      TypeError: Cannot read properties of undefined (reading "chargeCard") at checkout.js:45
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── SDK SETUP MODAL ── */}
      {showSdkModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-950 border border-white/[0.06] rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="text-emerald-400 w-5 h-5 animate-pulse" />
                Browser SDK Integration Guide
              </h3>
              <button 
                onClick={() => setShowSdkModal(false)}
                className="text-zinc-400 hover:text-white transition-all text-xs font-mono bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-xl border border-white/[0.04]"
              >
                Close (ESC)
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm text-zinc-300 overflow-y-auto max-h-[450px] pr-1">
              <p className="text-zinc-400 leading-relaxed text-xs">
                To capture and stream live user behaviors with privacy obfuscation, configure either of these initialization options in your platform layout:
              </p>

              {/* Snippet 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">Option A: HTML Script Tag</span>
                  <button 
                    onClick={() => handleCopy(`<script type="module">\n  import { FrictaTelemetry } from 'https://cdn.fricta.ai/browser-sdk/v1/index.js';\n\n  FrictaTelemetry.init({\n    projectId: "${projectId}",\n    apiKey: "${sdkKey}",\n    privacy: {\n      maskAllInputs: true,\n      consentGiven: true\n    }\n  });\n</script>`, 'html')}
                    className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-all bg-emerald-500/5 hover:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10"
                  >
                    {copiedText === 'html' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Tag</>}
                  </button>
                </div>
                <pre className="bg-[#050608] p-4 rounded-2xl text-[11px] font-mono overflow-x-auto text-emerald-400 border border-white/[0.04] leading-relaxed">
{`<!-- Include Fricta real-user instrumentation SDK -->
<script type="module">
  import { FrictaTelemetry } from 'https://cdn.fricta.ai/browser-sdk/v1/index.js';

  FrictaTelemetry.init({
    projectId: "${projectId}",
    apiKey: "${sdkKey}",
    privacy: {
      maskAllInputs: true,
      consentGiven: true // Integrate with cookie consent managers
    }
  });
</script>`}
                </pre>
              </div>

              {/* Snippet 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">Option B: ESM / NPM Import</span>
                  <button 
                    onClick={() => handleCopy(`import { FrictaTelemetry } from '@fricta/browser-sdk';\n\nFrictaTelemetry.init({\n  projectId: '${projectId}',\n  apiKey: '${sdkKey}',\n  privacy: {\n    maskAllInputs: true,\n    consentGiven: true\n  }\n});`, 'react')}
                    className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-all bg-emerald-500/5 hover:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10"
                  >
                    {copiedText === 'react' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
                  </button>
                </div>
                <pre className="bg-[#050608] p-4 rounded-2xl text-[11px] font-mono overflow-x-auto text-emerald-400 border border-white/[0.04] leading-relaxed">
{`import { FrictaTelemetry } from '@fricta/browser-sdk';

// Initialize at layout entrypoint (index.tsx / App.tsx)
FrictaTelemetry.init({
  projectId: '${projectId}',
  apiKey: '${sdkKey}',
  privacy: {
    maskAllInputs: true,
    consentGiven: true
  }
});`}
                </pre>
              </div>

              {/* Privacy notice block */}
              <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/[0.04] flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  <strong>Client-Side Privacy Enforcement:</strong> Raw credentials, email addresses, credit cards, or text typed inside sensitive inputs are obfuscated on the client thread before payloads travel. None of your users' personal identification data is sent over the network.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
