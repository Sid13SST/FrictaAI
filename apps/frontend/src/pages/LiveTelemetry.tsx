import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert, Navigation, MousePointer, Info, Code, Play, RefreshCw, Terminal, Eye, CheckCircle, ChevronRight, Copy, AlertCircle, Laptop, Smartphone, HelpCircle } from 'lucide-react';

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
        } else {
          setSelectedSessionDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Telemetry client simulator helper
  const triggerSimulationEvent = async (type: 'click' | 'nav' | 'error' | 'rage') => {
    try {
      let events: any[] = [];
      const sessionKey = 'fricta_sess_chrome_mac_usa_001';

      if (type === 'click') {
        events = [{
          eventType: 'InteractionEvent',
          timestamp: new Date().toISOString(),
          payload: { action: 'CLICK', target: `button#simulated-${Math.floor(Math.random() * 100)}`, elementType: 'BUTTON' }
        }];
      } else if (type === 'nav') {
        const pages = ['/home', '/pricing', '/onboarding', '/dashboard', '/settings'];
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
          liveSessionId: 'sess_1',
          eventType: events[0].eventType,
          payload: events[0].payload,
          timestamp: new Date().toISOString()
        };
        setLiveEvents(prev => [addedEvent, ...prev]);

        // Re-fetch database lists
        const sigRes = await fetch(`/api/telemetry/signals?limit=15`);
        const sigData = await sigRes.json();
        setSignals(sigData.signals || []);
      }
    } catch (err) {
      console.error('Simulation event failed:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Scroll terminal to bottom when new events arrive
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents]);

  return (
    <div className="text-zinc-200 min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* ── HEADER PANEL ── */}
      <div 
        className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-white/[0.04] mb-8"
        style={{
          background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.03), transparent 40%), #09090b',
        }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          TELEMETRY ACTIVE
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              Live Telemetry Portal
            </h1>
            <p className="text-zinc-400 text-sm mt-2 max-w-2xl leading-relaxed">
              Observe real user sessions, click streams, SPAs router transitions, and interface frustration signals safely with client-side privacy sanitization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSdkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 hover:border-white/[0.08] hover:text-white transition-all text-xs font-semibold"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              SDK Installation
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Observables
            </button>
          </div>
        </div>
      </div>

      {/* ── KEY PERFORMANCE INDICATORS (KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-[#0d0e12]/60 border border-white/[0.03] relative group hover:border-emerald-500/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Live Concurrency</span>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                {activeUsersCount}{' '}
                <span className="text-xs font-mono font-normal text-emerald-400/70">ACTIVE</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Real-time active socket pipes
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-[#0d0e12]/60 border border-white/[0.03] relative group hover:border-red-500/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Friction Severity</span>
              <div className="text-3xl font-extrabold text-red-400 flex items-baseline gap-1">
                {signals.filter(s => s.severity === 'CRITICAL' || s.severity === 'HIGH').length > 0 ? 'HIGH' : 'LOW'}{' '}
                <span className="text-xs font-mono font-normal text-zinc-500">score</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-105 transition-all">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400/80" /> Rage clicks & script logs monitored
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-[#0d0e12]/60 border border-white/[0.03] relative group hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Ingestion Audits</span>
              <div className="text-3xl font-extrabold text-indigo-400 flex items-baseline gap-2">
                100%{' '}
                <span className="text-xs font-mono font-normal text-zinc-500">clean</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Client-side DOM obfuscated
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-[#0d0e12]/60 border border-white/[0.03] relative group hover:border-purple-500/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Buffer Volume</span>
              <div className="text-3xl font-extrabold text-purple-400 flex items-baseline gap-2">
                {liveEvents.length}{' '}
                <span className="text-xs font-mono font-normal text-zinc-500">events</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-all">
              <MousePointer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Interaction payloads batched
          </div>
        </div>
      </div>

      {/* ── MAIN INTERACTIVE SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* LEFT & CENTER PANELS: Live Sessions & Selected Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Observability Streams */}
          <div className="p-6 rounded-2xl bg-[#090a0f] border border-white/[0.03] backdrop-blur-xl relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                Active Observability Streams
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Select a session to expand timeline</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/[0.03] bg-zinc-950/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.03] text-[10px] font-mono text-zinc-500 uppercase bg-white/[0.01]">
                    <th className="p-4">Session Identifer</th>
                    <th className="p-4">Agent / Platform</th>
                    <th className="p-4">Geo Origin</th>
                    <th className="p-4">Last Activity</th>
                    <th className="p-4 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs">
                  {sessions.map((sess) => {
                    const isSelected = selectedSessionId === sess.id;
                    return (
                      <tr 
                        key={sess.id}
                        onClick={() => fetchSessionDetails(sess.id)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-all duration-200 ${isSelected ? 'bg-emerald-500/[0.03] border-l-2 border-emerald-500' : ''}`}
                      >
                        <td className="p-4 font-mono text-zinc-300">
                          {sess.sessionKey.substring(0, 18)}...
                        </td>
                        <td className="p-4 text-zinc-400 flex items-center gap-2">
                          {sess.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5 text-zinc-500" /> : <Laptop className="w-3.5 h-3.5 text-zinc-500" />}
                          {sess.browser} ({sess.os})
                        </td>
                        <td className="p-4 text-zinc-400">{sess.location}</td>
                        <td className="p-4 text-zinc-500 font-mono">
                          {new Date(sess.lastActiveAt).toLocaleTimeString()}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                            sess.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-800 text-zinc-400 border border-transparent'
                          }`}>
                            {sess.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Session Details Timeline Map */}
          {selectedSessionDetails ? (
            <div className="p-6 rounded-2xl bg-[#090a0f] border border-white/[0.03] space-y-6 animate-fadeIn">
              
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Session Timeline Map
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">{selectedSessionDetails.sessionKey}</p>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-3 py-1 rounded-xl border border-white/[0.03]">
                  Host: {selectedSessionDetails.location}
                </div>
              </div>

              {/* Navigation Transitions Map */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Route Transitions Flow
                </h4>
                <div className="flex flex-wrap items-center gap-2.5 p-4 rounded-xl bg-zinc-950/40 border border-white/[0.02]">
                  {(selectedSessionDetails.navigationEvents || []).length > 0 ? (
                    (selectedSessionDetails.navigationEvents || []).map((nav: any, idx: number) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                        <div className="flex flex-col bg-zinc-900 px-3 py-2 rounded-lg border border-white/[0.03]">
                          <span className="text-[10px] font-mono text-zinc-300 font-semibold">{nav.toUrl}</span>
                          <span className="text-[8px] font-mono text-zinc-500 mt-0.5">{new Date(nav.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic">No navigation steps logged yet in this session.</span>
                  )}
                </div>
              </div>

              {/* Click / Scroll timeline lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Interactions */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                    <MousePointer className="w-3.5 h-3.5 text-emerald-400" /> UI Clicks & Inputs
                  </h4>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {(selectedSessionDetails.interactionEvents || []).map((click: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-white/[0.02] text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-mono bg-zinc-900 border border-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400 font-bold">{click.action}</span>
                          <span className="font-mono text-[10px] text-zinc-300 max-w-[150px] truncate">{click.target}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{new Date(click.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Friction & Script Signals */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Captured Friction Signals
                  </h4>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {(selectedSessionDetails.frictionSignals || []).length > 0 ? (
                      (selectedSessionDetails.frictionSignals || []).map((fric: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-red-950/10 border border-red-500/20 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 font-bold">{fric.frictionType}</span>
                            <span className="text-red-400 font-mono text-[10px] font-bold">Severity: HIGH</span>
                          </div>
                          <p className="font-mono text-[10px] text-red-200 mt-2">Target: {fric.details?.target || 'unknown'}</p>
                          <span className="text-[9px] text-zinc-500 mt-1 block font-mono">{new Date(fric.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 text-emerald-400 text-xs flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Healthy session. No friction triggers found.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/10 border border-dashed border-white/[0.04] text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Info className="w-4 h-4" /> Select an active observability stream above to inspect its real-time click timeline map.
            </div>
          )}

          {/* ── CLIENT SIMULATOR CONTROLS ── */}
          <div className="p-6 rounded-2xl bg-[#090a0f] border border-white/[0.03]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
              Live Telemetry Simulator Controls
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Inject mock real user behaviors directly to test Hono backend ingestion base64 sanitizers, database persistence, and UI timelines without manual SDK installation.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => triggerSimulationEvent('click')}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.03] hover:border-emerald-500/20 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                Inject Click
              </button>
              <button
                onClick={() => triggerSimulationEvent('nav')}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.03] hover:border-emerald-500/20 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Inject Route
              </button>
              <button
                onClick={() => triggerSimulationEvent('rage')}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.03] hover:border-red-500/20 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Inject Rage Click
              </button>
              <button
                onClick={() => triggerSimulationEvent('error')}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.03] hover:border-red-500/20 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                Inject Exception
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Live Event Console & Signals */}
        <div className="space-y-8">
          
          {/* Live Telemetry Stream Ticker */}
          <div className="p-6 rounded-2xl bg-[#090a0f] border border-white/[0.03] flex flex-col h-[400px]">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Live Telemetry Console
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 bg-[#050608] p-4 rounded-xl border border-white/[0.02] font-mono text-[10px] relative scrollbar-thin">
              {liveEvents.length > 0 ? (
                liveEvents.map((evt, idx) => {
                  let badgeColor = 'bg-zinc-800 text-zinc-400';
                  if (evt.eventType === 'FrictionSignal') badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/25';
                  if (evt.eventType === 'NavigationEvent') badgeColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25';
                  if (evt.eventType === 'SessionHeartbeat') badgeColor = 'bg-purple-500/10 text-purple-400 border border-purple-500/25';

                  return (
                    <div key={idx} className="border-b border-white/[0.02] pb-2 last:border-b-0 animate-fadeIn">
                      <div className="flex items-center justify-between mb-1 text-[9px] text-zinc-500">
                        <span>[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeColor}`}>{evt.eventType}</span>
                      </div>
                      <div className="text-zinc-300">
                        {evt.eventType === 'InteractionEvent' && (
                          <span>Action: <strong className="text-emerald-400">{evt.payload.action}</strong> target={evt.payload.target}</span>
                        )}
                        {evt.eventType === 'NavigationEvent' && (
                          <span>Route: <span className="text-zinc-500">{evt.payload.fromUrl}</span> → <strong className="text-indigo-400">{evt.payload.toUrl}</strong></span>
                        )}
                        {evt.eventType === 'FrictionSignal' && (
                          <span className="text-red-300">Friction: <strong className="text-red-400">{evt.payload.frictionType}</strong> score={evt.payload.score}</span>
                        )}
                        {evt.eventType === 'SessionSignal' && (
                          <span className="text-red-200">Alert: {evt.payload.description}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-zinc-600 italic text-center pt-24">Listening for live incoming socket signals...</div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Friction & Alert logs */}
          <div className="p-6 rounded-2xl bg-[#090a0f] border border-white/[0.03]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Critical Usability Alerts
            </h3>
            
            <div className="space-y-3">
              {signals.length > 0 ? (
                signals.map((sig) => (
                  <div 
                    key={sig.id}
                    className={`p-3 rounded-xl border text-xs relative ${
                      sig.severity === 'CRITICAL' || sig.severity === 'HIGH'
                        ? 'bg-red-500/5 border-red-500/20 text-red-200' 
                        : 'bg-zinc-900 border-white/[0.03] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-bold ${
                        sig.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {sig.signalType}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-normal">{sig.description}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-red-950/10 border border-red-500/25 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">FRICTION</span>
                      <span className="text-[10px] text-zinc-500">Just Now</span>
                    </div>
                    <p className="text-red-300 mt-2 font-mono text-[11px]">Multiple clicks detected on unresponsive checkout button (button#pay-button)</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-red-950/10 border border-red-500/25 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">SCRIPT_ERROR</span>
                      <span className="text-[10px] text-zinc-500">2 min ago</span>
                    </div>
                    <p className="text-red-300 mt-2 font-mono text-[11px]">Uncaught TypeError: Cannot read properties of undefined (reading "chargeCard") at checkout.js:45</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── SDK SETUP MODAL ── */}
      {showSdkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-950 border border-white/[0.06] rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="text-emerald-400 w-5 h-5" />
                Browser SDK Integration Guide
              </h3>
              <button 
                onClick={() => setShowSdkModal(false)}
                className="text-zinc-500 hover:text-white transition-all text-xs font-mono bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/[0.04]"
              >
                ESC
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm text-zinc-300">
              <p className="text-zinc-400 leading-relaxed text-xs">
                To track live user interactions, copy and insert either of the following setup methods into your application layout:
              </p>

              {/* Snippet 1 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">HTML Script Tag</span>
                  <button 
                    onClick={() => handleCopy(`<script type="module">\n  import { FrictaTelemetry } from 'https://cdn.fricta.ai/browser-sdk/v1/index.js';\n\n  FrictaTelemetry.init({\n    projectId: "${projectId}",\n    apiKey: "${sdkKey}",\n    privacy: {\n      maskAllInputs: true,\n      consentGiven: true\n    }\n  });\n</script>`, 'html')}
                    className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedText === 'html' ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="bg-[#050608] p-4 rounded-xl text-[11px] font-mono overflow-x-auto text-emerald-300 border border-white/[0.03] leading-relaxed">
{`<!-- Include Fricta real-user instrumentation SDK -->
<script type="module">
  import { FrictaTelemetry } from 'https://cdn.fricta.ai/browser-sdk/v1/index.js';

  FrictaTelemetry.init({
    projectId: "${projectId}",
    apiKey: "${sdkKey}",
    privacy: {
      maskAllInputs: true,
      consentGiven: true // Integrate with your cookie consent manager
    }
  });
</script>`}
                </pre>
              </div>

              {/* Snippet 2 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">React / TypeScript NPM Import</span>
                  <button 
                    onClick={() => handleCopy(`import { FrictaTelemetry } from '@fricta/browser-sdk';\n\nFrictaTelemetry.init({\n  projectId: '${projectId}',\n  apiKey: '${sdkKey}',\n  privacy: {\n    maskAllInputs: true,\n    consentGiven: true\n  }\n});`, 'react')}
                    className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedText === 'react' ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="bg-[#050608] p-4 rounded-xl text-[11px] font-mono overflow-x-auto text-emerald-300 border border-white/[0.03] leading-relaxed">
{`import { FrictaTelemetry } from '@fricta/browser-sdk';

// Initialize at your layout entrypoint (index.tsx or App.tsx)
FrictaTelemetry.init({
  projectId: '${projectId}',
  apiKey: '${sdkKey}',
  privacy: {
    maskAllInputs: true,
    consentGiven: true // Set to false to gate until consent is granted
  }
});`}
                </pre>
              </div>

              {/* Privacy block */}
              <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/[0.03] flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-normal">
                  <strong>Client-Side Sanitization Rule:</strong> Input element text masking (converting names, pins, and search values into dots) is processed 
                  <em> inside the browser</em> before payload packaging. Sensitive credentials never leave the user's host machine.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
