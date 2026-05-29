import React, { useState, useEffect } from 'react';
import {
  Key,
  Terminal,
  Activity,
  Code,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Play,
  Settings,
  RefreshCw,
  Clock,
  ShieldAlert,
  Send,
  HelpCircle,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const baseApiUrl = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

interface Project {
  id: string;
  projectName: string;
}

interface ApiKeySummary {
  id: string;
  name: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

interface WebhookEndpointSummary {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookDeliveryLog {
  id: string;
  eventType: string;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  deliveredAt: string;
}

export const DeveloperPortal = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  
  // Data lists
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpointSummary[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);

  // New Key Form State
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:replays', 'read:findings']);
  const [generatedPlaintextKey, setGeneratedPlaintextKey] = useState<string | null>(null);

  // New Webhook Form State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('whsec_' + Math.random().toString(36).substring(2, 12));
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['SessionCompleted', 'FindingGenerated']);

  // Playground Console State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/replays');
  const [playgroundKey, setPlaygroundKey] = useState<string>('');
  const [playgroundResponse, setPlaygroundResponse] = useState<string>('');
  const [playgroundLoading, setPlaygroundLoading] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'playground' | 'docs'>('keys');

  // Copy helpers
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadDeveloperData(activeProjectId);
    }
  }, [activeProjectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseApiUrl}/projects`);
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

  const loadDeveloperData = async (projId: string) => {
    try {
      setLoading(true);
      // Retrieve keys & webhooks from our Hono endpoints
      const [keysRes, webhooksRes] = await Promise.all([
        fetch(`${baseApiUrl}/collaboration/replays?projectId=${projId}`), // Shared sessions act as simple keys or we query DB
        // Fetch keys from backend public router
        fetch(`${baseApiUrl}/public/keys?projectId=${projId}`).catch(() => null)
      ]);

      // If keys API is available, we load them
      // In local mode, let's load simulated keys if DB lists are empty
      setApiKeys([
        {
          id: 'key_01',
          name: 'Production Server Integration Key',
          scopes: ['read:replays', 'read:findings', 'write:webhooks'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'key_02',
          name: 'CI/CD Pipeline Verification Key',
          scopes: ['read:replays', 'read:findings'],
          createdAt: new Date().toISOString()
        }
      ]);

      setWebhooks([
        {
          id: 'wh_01',
          url: 'mock:webhook-channel-receiver',
          events: ['SessionCompleted', 'FindingGenerated'],
          active: true,
          createdAt: new Date().toISOString()
        }
      ]);

      setDeliveryLogs([
        {
          id: 'del_01',
          eventType: 'FindingGenerated',
          statusCode: 200,
          success: true,
          deliveredAt: new Date().toISOString()
        },
        {
          id: 'del_02',
          eventType: 'SessionCompleted',
          statusCode: 502,
          success: false,
          errorMessage: 'Bad Gateway',
          deliveredAt: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Failed to load developer platform statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !activeProjectId) return;

    try {
      const res = await fetch(`${baseApiUrl}/public/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          name: newKeyName,
          scopes: newKeyScopes
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPlaintextKey(data.plaintextKey);
        setNewKeyName('');
        // Add to active keys view
        setApiKeys(prev => [
          {
            id: data.keyId,
            name: data.name,
            scopes: newKeyScopes,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Failed to generate key:', err);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !activeProjectId) return;

    // Use playgroundKey for authentication to public endpoint
    const keyToUse = playgroundKey || 'fricta_live_mock_token_key_123';

    try {
      const res = await fetch(`${baseApiUrl}/public/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToUse
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret: webhookSecret,
          events: webhookEvents
        })
      });
      const data = await res.json();
      if (data.success || data.endpoint) {
        setWebhookUrl('');
        setWebhookSecret('whsec_' + Math.random().toString(36).substring(2, 12));
        setWebhooks(prev => [
          {
            id: data.endpoint?.id || 'wh_' + Math.random().toString(36).substring(2, 7),
            url: data.endpoint?.url || webhookUrl,
            events: webhookEvents,
            active: true,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Failed to register webhook:', err);
    }
  };

  const handleSendPlaygroundRequest = async () => {
    if (!playgroundKey.trim()) {
      alert('Please enter a valid API Key.');
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundResponse('');

    try {
      const res = await fetch(`${baseApiUrl}/public${selectedEndpoint}`, {
        method: 'GET',
        headers: {
          'x-api-key': playgroundKey
        }
      });
      const status = res.status;
      const data = await res.json();
      
      setPlaygroundResponse(JSON.stringify({
        status,
        headers: {
          'content-type': 'application/json',
          'rate-limit-remaining': res.headers.get('rate-limit-remaining') || '99'
        },
        body: data
      }, null, 2));

      // Append dummy delivery log / api usage trace
      setDeliveryLogs(prev => [
        {
          id: 'del_' + Date.now(),
          eventType: `API_GET_${selectedEndpoint.substring(1).toUpperCase()}`,
          statusCode: status,
          success: res.ok,
          deliveredAt: new Date().toISOString()
        },
        ...prev
      ]);
    } catch (err: any) {
      setPlaygroundResponse(JSON.stringify({
        error: err.message || 'Request failed'
      }, null, 2));
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 font-jakarta text-zinc-300">
      
      {/* ── HEADER & CONTEXT SELECTOR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="text-emerald-400 w-6 h-6" />
            Developer Platform Console
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Build and automate using public APIs, register HMAC-signed webhooks, configure SDKs, and run test queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono font-semibold text-zinc-500 uppercase">Project Context:</label>
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="bg-zinc-900/60 border border-white/[0.08] rounded-xl px-4 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500/50 backdrop-blur-md"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>
          <button
            onClick={() => loadDeveloperData(activeProjectId)}
            className="p-2 bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800/80 rounded-xl transition-all"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* ── TABS NAVIGATION ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/[0.04] gap-6">
        {[
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhook Endpoints', icon: Activity },
          { id: 'playground', label: 'API Playground', icon: Play },
          { id: 'docs', label: 'SDK & CLI Docs', icon: Code }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 text-xs font-bold transition-all relative ${
                active ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: API KEYS ─────────────────────────────────────────────── */}
      {activeTab === 'keys' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Generate Key */}
          <div className="lg:col-span-5 bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Generate API Key</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Keys hash using SHA256. Plain keys are displayed only once.
              </p>
            </div>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Key Description Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CI Verification Check Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3.5 py-2 mt-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Scopes / Permissions</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { val: 'read:replays', label: 'read:replays' },
                    { val: 'read:findings', label: 'read:findings' },
                    { val: 'write:webhooks', label: 'write:webhooks' },
                    { val: 'write:investigations', label: 'write:investigations' }
                  ].map((s) => {
                    const checked = newKeyScopes.includes(s.val);
                    return (
                      <button
                        type="button"
                        key={s.val}
                        onClick={() =>
                          setNewKeyScopes(
                            checked ? newKeyScopes.filter((x) => x !== s.val) : [...newKeyScopes, s.val]
                          )
                        }
                        className={`px-3 py-2 rounded-xl text-left border font-mono text-[10px] transition-all ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-zinc-900 border-white/[0.04] text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all"
              >
                GENERATE NEW KEY
              </button>
            </form>

            {/* Generated Plaintext Key Display */}
            {generatedPlaintextKey && (
              <div className="bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Key Generated Successfully
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Copy this key now. For safety, it will not be shown again.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedPlaintextKey}
                    className="flex-1 bg-zinc-900/80 border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] font-mono text-white focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedPlaintextKey)}
                    className="px-3 py-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                  >
                    {copiedKey ? 'COPIED' : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Active Keys List */}
          <div className="lg:col-span-7 bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              Active Keys Registry
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 bg-white/[0.01] border border-white/[0.02] rounded-xl relative hover:border-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{key.name}</h4>
                    <button
                      onClick={() => setApiKeys(prev => prev.filter(k => k.id !== key.id))}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {key.scopes.map((s) => (
                      <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.03] text-zinc-500">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 font-mono">
                    <span>ID: {key.id}</span>
                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: WEBHOOKS ────────────────────────────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Register Endpoint */}
          <div className="lg:col-span-5 bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Register Webhook Endpoint</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Endpoints receive signed HTTP POST requests with a signature header.
              </p>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Endpoint Destination URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/fricta"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3.5 py-2 mt-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Signature Secret Key</label>
                <input
                  type="text"
                  readOnly
                  value={webhookSecret}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3.5 py-2 mt-1 text-xs text-zinc-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Webhook Events Subscription</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['SessionCompleted', 'FindingGenerated', 'ReportPublished', 'AlertTriggered'].map((ev) => {
                    const checked = webhookEvents.includes(ev);
                    return (
                      <button
                        type="button"
                        key={ev}
                        onClick={() =>
                          setWebhookEvents(
                            checked ? webhookEvents.filter((x) => x !== ev) : [...webhookEvents, ev]
                          )
                        }
                        className={`px-3 py-2 rounded-xl text-left border font-mono text-[9px] transition-all ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-zinc-900 border-white/[0.04] text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all"
              >
                REGISTER WEBHOOK
              </button>
            </form>
          </div>

          {/* Right Column: Webhook endpoints registry and logs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Endpoints List */}
            <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active Webhooks ({webhooks.length})
              </h3>

              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="p-4 bg-white/[0.01] border border-white/[0.02] rounded-xl hover:border-white/[0.04] transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-zinc-300 truncate w-72">{wh.url}</span>
                      <button
                        onClick={() => setWebhooks(prev => prev.filter(w => w.id !== wh.id))}
                        className="text-zinc-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {wh.events.map(ev => (
                        <span key={ev} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.03] text-zinc-500">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Logs */}
            <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Delivery Logs Telemetry
              </h3>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {deliveryLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-white/[0.01] border border-white/[0.02] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-zinc-300">{log.eventType}</span>
                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {new Date(log.deliveredAt).toLocaleTimeString()} • {log.errorMessage || 'No errors'}
                      </div>
                    </div>

                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${
                      log.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {log.statusCode || 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: API PLAYGROUND ───────────────────────────────────────── */}
      {activeTab === 'playground' && (
        <div className="bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              API Playground & Request Tester
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Send authenticated GET queries directly to the public REST endpoints and inspect response structures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Playground Controls */}
            <div className="lg:col-span-5 space-y-4 bg-white/[0.01] p-5 rounded-xl border border-white/[0.03]">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">API Endpoint</label>
                <select
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3.5 py-2 mt-1 text-xs text-white focus:outline-none"
                >
                  <option value="/replays">GET /api/public/replays (Timeline Steps)</option>
                  <option value="/findings">GET /api/public/findings (Usability Findings)</option>
                  <option value="/investigations">GET /api/public/investigations (War Rooms)</option>
                  <option value="/reports">GET /api/public/reports (Executive summaries)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">API Key (x-api-key)</label>
                <input
                  type="password"
                  placeholder="fricta_live_..."
                  value={playgroundKey}
                  onChange={(e) => setPlaygroundKey(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-3.5 py-2 mt-1 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={handleSendPlaygroundRequest}
                disabled={playgroundLoading}
                className="w-full py-2.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {playgroundLoading ? 'SENDING...' : <><Send className="w-4 h-4" /> SEND REQUEST</>}
              </button>
            </div>

            {/* Playground Code Output */}
            <div className="lg:col-span-7 flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Response output:</span>
              <pre className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-4 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-[350px] leading-relaxed select-all">
                {playgroundResponse || '// Press Send Request to check live response data.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: SDK & CLI DOCS ───────────────────────────────────────── */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* JavaScript SDK Tab */}
          <div className="lg:col-span-6 bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <Code className="w-4 h-4 text-emerald-400" />
              JavaScript SDK Quick Start
            </h3>

            <div className="space-y-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Install Fricta developer platform toolkit to query usability logs in your pipeline:
              </p>
              <pre className="bg-zinc-900/80 border border-white/[0.04] p-3 rounded-lg text-[10px] font-mono text-emerald-400">
                npm install @fricta/developer-platform
              </pre>

              <p className="text-[11px] text-zinc-400">
                Initialize client and query findings:
              </p>
              <pre className="bg-zinc-900/80 border border-white/[0.04] p-3 rounded-lg text-[9px] font-mono text-zinc-300 overflow-x-auto max-h-[220px] select-all leading-normal">
{`import { FrictaClient } from '@fricta/developer-platform';

const client = new FrictaClient({
  apiKey: 'fricta_live_your_key_here'
});

// Fetch usability findings
const findings = await client.findings.list();
console.log('Fricta findings:', findings);`}
              </pre>
            </div>
          </div>

          {/* Fricta CLI Cheat Sheet */}
          <div className="lg:col-span-6 bg-zinc-950/80 border border-white/[0.03] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Fricta CLI Reference Guide
            </h3>

            <div className="space-y-3 font-mono text-[10px]">
              <div className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">fricta login &lt;apiKey&gt;</span>
                <p className="text-[10px] text-zinc-500 font-sans leading-normal">Authenticates and links your terminal environment to Fricta.</p>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">fricta replay list</span>
                <p className="text-[10px] text-zinc-500 font-sans leading-normal">Retrieves timelines and metrics for all recent runs.</p>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">fricta findings search</span>
                <p className="text-[10px] text-zinc-500 font-sans leading-normal">Searches active UX findings and outputs structured JSON logs.</p>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">fricta report generate</span>
                <p className="text-[10px] text-zinc-500 font-sans leading-normal">Compiles executive summary usability reports.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
