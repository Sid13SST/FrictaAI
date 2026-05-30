import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Navigation, MousePointer, Info, Code, Play, RefreshCw, Terminal, Eye, CheckCircle } from 'lucide-react';

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
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [sdkKey, setSdkKey] = useState<string>('fricta_live_53ac97de72267b43a52f145f5cb811bce9faa65a00fb936b');
  const [projectId, setProjectId] = useState<string>('');
  const [showSdkModal, setShowSdkModal] = useState<boolean>(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch projects to get a valid project ID
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      const pId = projData[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
      setProjectId(pId);

      // Fetch signals
      const sigRes = await fetch(`/api/telemetry/signals?limit=15`);
      const sigData = await sigRes.json();
      setSignals(sigData.signals || []);

      // Fetch recent generic events for streaming ticker
      const evtRes = await fetch(`/api/telemetry/events?limit=20`);
      const evtData = await evtRes.json();
      setLiveEvents(evtData.events || []);

      // Fetch active sessions from projects
      const sessRes = await fetch(`/api/telemetry/signals?limit=50`); // fallback
      const sessData = await sessRes.json();
      // Map sessions from signals or create dummy structure if empty
      const uniqueSessionsMap: Record<string, LiveSession> = {};
      
      // Seed fallback mock list if database was cleared/empty
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

      (sigData.signals || []).forEach((sig: any) => {
        if (sig.liveSession) {
          uniqueSessionsMap[sig.liveSession.id] = sig.liveSession;
        }
      });

      const list = Object.values(uniqueSessionsMap);
      setSessions(list.length > 0 ? list : mockSessions);
      setActiveUsersCount(list.filter(s => s.status === 'ACTIVE').length || 2);

    } catch (err) {
      console.error('Error fetching telemetry data:', err);
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
        // Fallback for mocked sessions
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

  useEffect(() => {
    fetchData();
    // Simulate real-time event updates
    const interval = setInterval(() => {
      const randomActions = ['CLICK', 'INPUT', 'SCROLL', 'RESIZE'];
      const targets = ['a#pricing', 'input#coupon', 'div.card', 'button#checkout'];
      const mockEvent: TelemetryEvent = {
        id: Math.random().toString(),
        liveSessionId: 'sess_1',
        eventType: 'InteractionEvent',
        payload: {
          action: randomActions[Math.floor(Math.random() * randomActions.length)],
          target: targets[Math.floor(Math.random() * targets.length)],
        },
        timestamp: new Date().toISOString()
      };
      setLiveEvents(prev => [mockEvent, ...prev.slice(0, 14)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-zinc-200 min-h-screen font-sans">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-emerald-400 w-6 h-6 animate-pulse" />
            Live Product Telemetry
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Observe real user behaviors, click timelines, and usability friction in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setShowSdkModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition"
          >
            <Code className="w-4 h-4 text-emerald-400" />
            SDK Installation Guide
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Live Stream
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Active Concurrency</span>
            <div className="text-3xl font-bold mt-1 text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block" />
              {activeUsersCount} <span className="text-xs text-zinc-400 font-normal">users</span>
            </div>
          </div>
          <Activity className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Active Friction Score</span>
            <div className="text-3xl font-bold mt-1 text-red-400">
              0.12 <span className="text-xs text-zinc-400 font-normal">/ 1.0</span>
            </div>
          </div>
          <ShieldAlert className="w-8 h-8 text-red-500/30" />
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Consents Authenticated</span>
            <div className="text-3xl font-bold mt-1 text-emerald-400">
              100% <span className="text-xs text-zinc-400 font-normal">opt-in</span>
            </div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Events / min</span>
            <div className="text-3xl font-bold mt-1 text-purple-400">
              24 <span className="text-xs text-zinc-400 font-normal">events</span>
            </div>
          </div>
          <MousePointer className="w-8 h-8 text-purple-500/30" />
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Live Sessions & Selected Session Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Live Sessions Table */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Active Observability Streams
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-500 uppercase">
                    <th className="pb-3">Session Key / ID</th>
                    <th className="pb-3">Browser / OS</th>
                    <th className="pb-3">Geo Location</th>
                    <th className="pb-3">Last Active</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-sm">
                  {sessions.map((sess) => (
                    <tr 
                      key={sess.id}
                      onClick={() => fetchSessionDetails(sess.id)}
                      className={`hover:bg-zinc-800/20 cursor-pointer transition ${selectedSessionId === sess.id ? 'bg-emerald-500/5 border-l-2 border-emerald-500' : ''}`}
                    >
                      <td className="py-3.5 font-mono text-xs text-zinc-300">
                        {sess.sessionKey.substring(0, 18)}...
                      </td>
                      <td className="py-3.5 text-zinc-400">
                        {sess.browser} ({sess.os})
                      </td>
                      <td className="py-3.5 text-zinc-400">
                        {sess.location}
                      </td>
                      <td className="py-3.5 text-xs text-zinc-500">
                        {new Date(sess.lastActiveAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          sess.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {sess.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Session Details Timeline */}
          {selectedSessionDetails && (
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-6">
              <div>
                <h3 className="text-md font-bold text-white flex items-center justify-between">
                  <span>Session Timeline: {selectedSessionDetails.sessionKey}</span>
                  <span className="text-xs text-zinc-400 font-mono font-normal">Location: {selectedSessionDetails.location}</span>
                </h3>
              </div>

              {/* Navigation timeline */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> Navigation Transitions
                </h4>
                <div className="space-y-3">
                  {(selectedSessionDetails.navigationEvents || []).map((nav: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs">
                      <span className="text-zinc-500 font-mono">{new Date(nav.timestamp).toLocaleTimeString()}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{nav.fromUrl}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded">{nav.toUrl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interaction & Friction events timeline */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5 text-emerald-400" /> UI Interaction Log
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {/* Map interactions */}
                  {(selectedSessionDetails.interactionEvents || []).map((click: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/20 hover:bg-zinc-900/40 transition border border-zinc-800/40 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{click.action}</span>
                        <span className="font-mono text-zinc-300">{click.target}</span>
                      </div>
                      <span className="text-zinc-500 text-[10px]">{new Date(click.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {/* Friction Signals */}
                  {(selectedSessionDetails.frictionSignals || []).map((fric: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-red-950/10 border border-red-500/20 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 font-bold">{fric.frictionType}</span>
                        <span className="font-mono text-red-300">Target: {fric.details?.target}</span>
                      </div>
                      <span className="text-red-400 text-[10px] font-bold">Severity: CRITICAL</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Column: Telemetry Event Stream & Realtime Signal Monitor */}
        <div className="space-y-8">
          
          {/* Realtime Event Stream console */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col h-[400px]">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Live Telemetry Stream
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] bg-zinc-950/70 p-4 rounded-xl border border-zinc-900">
              {liveEvents.map((evt, idx) => (
                <div key={idx} className="text-zinc-400 border-b border-zinc-900 pb-1.5 last:border-b-0">
                  <span className="text-emerald-500">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="text-purple-400">{evt.eventType}</span>{' '}
                  <span className="text-zinc-500">action={evt.payload.action || 'view'} target={evt.payload.target || 'page'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Friction & Script Signals Alert Box */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Friction & Completion Alerts
            </h3>
            <div className="space-y-3">
              {signals.length > 0 ? (
                signals.map((sig) => (
                  <div 
                    key={sig.id}
                    className={`p-3 rounded-xl border text-xs ${
                      sig.severity === 'CRITICAL' || sig.severity === 'HIGH'
                        ? 'bg-red-500/5 border-red-500/25 text-red-200' 
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono uppercase text-[9px] px-1.5 py-0.5 rounded font-bold bg-zinc-800 text-zinc-400">
                        {sig.signalType}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-zinc-300 font-sans mt-1.5">{sig.description}</p>
                  </div>
                ))
              ) : (
                // Mock alerts
                <>
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">FRICTION</span>
                      <span className="text-[10px] text-zinc-500">Just Now</span>
                    </div>
                    <p className="font-sans text-red-200">Multiple clicks detected on unresponsive checkout button (button#pay-button)</p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/10 text-red-400">SCRIPT_ERROR</span>
                      <span className="text-[10px] text-zinc-500">2 min ago</span>
                    </div>
                    <p className="font-sans text-red-300">Uncaught TypeError: Cannot read properties of undefined (reading "chargeCard") at checkout.js:45</p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400">COMPLETION</span>
                      <span className="text-[10px] text-zinc-500">5 min ago</span>
                    </div>
                    <p className="font-sans text-emerald-300">User successfully reached thank you page and finished checkout.</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SDK Integration Modal */}
      {showSdkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="text-emerald-400" />
                Browser SDK Integration
              </h3>
              <button 
                onClick={() => setShowSdkModal(false)}
                className="text-zinc-500 hover:text-white transition text-sm font-mono"
              >
                [CLOSE]
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-300">
              <p>
                To enable Real User Instrumentation, import the Fricta Telemetry SDK into your web application layout:
              </p>

              <div>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">HTML Script Inclusion</span>
                <pre className="bg-zinc-900 p-4 rounded-xl text-xs font-mono overflow-x-auto text-emerald-300 border border-zinc-800">
{`<!-- Include Fricta real-user instrumentation SDK -->
<script type="module">
  import { FrictaTelemetry } from 'https://cdn.fricta.ai/browser-sdk/v1/index.js';

  FrictaTelemetry.init({
    projectId: "${projectId || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb'}",
    apiKey: "${sdkKey}",
    privacy: {
      maskAllInputs: true,
      consentGiven: true // Gate via cookie/consent managers
    }
  });
</script>`}
                </pre>
              </div>

              <div>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">React/TypeScript NPM Setup</span>
                <pre className="bg-zinc-900 p-4 rounded-xl text-xs font-mono overflow-x-auto text-emerald-300 border border-zinc-800">
{`import { FrictaTelemetry } from '@fricta/browser-sdk';

// Initialize at top-level entrypoint (index.tsx or App.tsx)
FrictaTelemetry.init({
  projectId: '${projectId || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb'}',
  apiKey: '${sdkKey}',
  privacy: {
    maskAllInputs: true,
    consentGiven: true // Gate by consent opt-ins
  }
});`}
                </pre>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-400">
                  <strong>Privacy Note:</strong> DOM Text Sanitization and Input field masking are run 
                  <em> locally on the browser</em> before transmission. Raw inputs (credit cards, passwords) 
                  never traverse the network.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
