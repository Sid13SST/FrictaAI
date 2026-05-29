import { useState, useEffect } from 'react';
import {
  Link2, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw,
  Figma, Github, FileText, Zap, Layers, LayoutGrid, ArrowRight,
  Shield, Activity, ExternalLink, Database, Webhook, ChevronRight,
  Eye, Cpu, Terminal, Sparkles
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'FIGMA' | 'FIGJAM' | 'NOTION' | 'JIRA' | 'LINEAR' | 'GITHUB' | 'PRODUCTBOARD';
type Status = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';

interface Integration {
  id: string;
  provider: Provider;
  status: Status;
  providerOrgId?: string;
  lastSyncedAt?: string;
  connections: Connection[];
}

interface Connection {
  id: string;
  provider: Provider;
  externalId: string;
  externalName: string;
  externalUrl?: string;
  connectionType: string;
  active: boolean;
}

interface ReplayLink {
  id: string;
  provider: Provider;
  externalResourceId: string;
  externalResourceName?: string;
  externalResourceUrl?: string;
  linkType: string;
  evidenceSummary?: string;
  createdAt: string;
}

interface AuditEvent {
  id: string;
  provider: Provider;
  action: string;
  description: string;
  policyPassed: boolean;
  createdAt: string;
}

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDER_META: Record<Provider, {
  label: string;
  color: string;
  glowColor: string;
  bgColor: string;
  borderColor: string;
  icon: React.FC<any>;
  category: string;
}> = {
  FIGMA: {
    label: 'Figma',
    color: '#FF7262',
    glowColor: 'rgba(255, 114, 98, 0.3)',
    bgColor: 'rgba(255, 114, 98, 0.06)',
    borderColor: 'rgba(255, 114, 98, 0.2)',
    icon: Figma,
    category: 'Design'
  },
  FIGJAM: {
    label: 'FigJam',
    color: '#F9A825',
    glowColor: 'rgba(249, 168, 37, 0.3)',
    bgColor: 'rgba(249, 168, 37, 0.06)',
    borderColor: 'rgba(249, 168, 37, 0.2)',
    icon: Layers,
    category: 'Design'
  },
  NOTION: {
    label: 'Notion',
    color: '#a3b1c6',
    glowColor: 'rgba(163, 177, 198, 0.25)',
    bgColor: 'rgba(163, 177, 198, 0.06)',
    borderColor: 'rgba(163, 177, 198, 0.18)',
    icon: FileText,
    category: 'Knowledge'
  },
  JIRA: {
    label: 'Jira',
    color: '#2684FF',
    glowColor: 'rgba(38, 132, 255, 0.3)',
    bgColor: 'rgba(38, 132, 255, 0.06)',
    borderColor: 'rgba(38, 132, 255, 0.2)',
    icon: LayoutGrid,
    category: 'Product'
  },
  LINEAR: {
    label: 'Linear',
    color: '#5E6AD2',
    glowColor: 'rgba(94, 106, 210, 0.3)',
    bgColor: 'rgba(94, 106, 210, 0.06)',
    borderColor: 'rgba(94, 106, 210, 0.2)',
    icon: Zap,
    category: 'Product'
  },
  GITHUB: {
    label: 'GitHub',
    color: '#C8D1D9',
    glowColor: 'rgba(200, 209, 217, 0.25)',
    bgColor: 'rgba(200, 209, 217, 0.05)',
    borderColor: 'rgba(200, 209, 217, 0.18)',
    icon: Github,
    category: 'Engineering'
  },
  PRODUCTBOARD: {
    label: 'Productboard',
    color: '#FF8B5E',
    glowColor: 'rgba(255, 139, 94, 0.3)',
    bgColor: 'rgba(255, 139, 94, 0.06)',
    borderColor: 'rgba(255, 139, 94, 0.2)',
    icon: Cpu,
    category: 'Product'
  }
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: Status }) => {
  const config = {
    CONNECTED: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', label: 'Connected', Icon: CheckCircle2 },
    DISCONNECTED: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)', label: 'Disconnected', Icon: XCircle },
    ERROR: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', label: 'Error', Icon: AlertCircle },
    PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', label: 'Pending', Icon: Clock }
  }[status];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.border}` }}
    >
      <config.Icon size={10} />
      {config.label}
    </div>
  );
};

// ─── Provider Card ────────────────────────────────────────────────────────────

const ProviderCard = ({
  integration,
  provider,
  onConnect,
  onRevoke
}: {
  integration?: Integration;
  provider: Provider;
  onConnect: (p: Provider) => void;
  onRevoke: (p: Provider) => void;
}) => {
  // Use the passed `provider` prop directly — do NOT fall back to 'FIGMA'
  const meta = PROVIDER_META[provider];
  const Icon = meta.icon;
  const isConnected = integration?.status === 'CONNECTED';

  return (
    <div
      className="relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.01] group"
      style={{
        background: `linear-gradient(135deg, ${meta.bgColor}, rgba(9, 9, 11, 0.8))`,
        border: `1px solid ${isConnected ? meta.borderColor : 'rgba(255,255,255,0.04)'}`,
        boxShadow: isConnected ? `0 0 20px ${meta.glowColor}` : 'none'
      }}
    >
      {/* Connection pulse indicator */}
      {isConnected && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: '#10b981' }}
            />
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: '#10b981', opacity: 0.4 }}
            />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.bgColor, border: `1px solid ${meta.borderColor}` }}
        >
          <Icon size={18} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm">{meta.label}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: meta.color, background: meta.bgColor }}
            >
              {meta.category}
            </span>
          </div>
          {integration?.providerOrgId && (
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {integration.providerOrgId}
            </p>
          )}
        </div>
      </div>

      <div className="mb-4">
        {integration ? (
          <StatusBadge status={integration.status} />
        ) : (
          <StatusBadge status="DISCONNECTED" />
        )}
        {integration?.lastSyncedAt && (
          <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Last sync: {new Date(integration.lastSyncedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {integration?.connections && integration.connections.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {integration.connections.length} connection{integration.connections.length > 1 ? 's' : ''}
          </p>
          {integration.connections.slice(0, 2).map(conn => (
            <div key={conn.id} className="flex items-center gap-1.5 mb-1">
              <div className="w-1 h-1 rounded-full" style={{ background: meta.color }} />
              <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {conn.externalName}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => isConnected ? onRevoke(provider) : onConnect(provider)}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-90"
        style={{
          background: isConnected ? 'rgba(239,68,68,0.1)' : `linear-gradient(135deg, ${meta.color}22, ${meta.color}11)`,
          color: isConnected ? '#ef4444' : meta.color,
          border: isConnected ? '1px solid rgba(239,68,68,0.3)' : `1px solid ${meta.borderColor}`
        }}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
};

// ─── Timeline Event ───────────────────────────────────────────────────────────

const TimelineEvent = ({ event }: { event: AuditEvent }) => {
  const meta = PROVIDER_META[event.provider];
  const Icon = meta?.icon || Activity;

  const actionColors: Record<string, string> = {
    CONNECT: '#10b981',
    DISCONNECT: '#6b7280',
    REPLAY_LINKED: '#818cf8',
    EVIDENCE_ATTACHED: '#f59e0b',
    TICKET_CREATED: '#2684FF',
    WEBHOOK_RECEIVED: '#8b5cf6',
    TOKEN_REFRESH: '#06b6d4'
  };

  const actionColor = actionColors[event.action] || '#6b7280';

  return (
    <div className="flex gap-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: meta?.bgColor || 'rgba(255,255,255,0.05)' }}
      >
        <Icon size={12} style={{ color: meta?.color || '#6b7280' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ color: actionColor, background: `${actionColor}15` }}
          >
            {event.action.replace(/_/g, ' ')}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {new Date(event.createdAt).toLocaleTimeString()}
          </span>
          {event.policyPassed && (
            <Shield size={9} style={{ color: '#10b981' }} />
          )}
        </div>
        <p className="text-[11px] leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {event.description}
        </p>
      </div>
    </div>
  );
};

// ─── Replay Link Row ──────────────────────────────────────────────────────────

const ReplayLinkRow = ({ link }: { link: ReplayLink }) => {
  const meta = PROVIDER_META[link.provider];
  const Icon = meta?.icon || Link2;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl mb-2 transition-all hover:opacity-90"
      style={{
        background: meta?.bgColor || 'rgba(255,255,255,0.03)',
        border: `1px solid ${meta?.borderColor || 'rgba(255,255,255,0.06)'}`
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${meta?.color}15` }}
      >
        <Icon size={13} style={{ color: meta?.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold" style={{ color: meta?.color }}>
            {link.provider} · {link.linkType}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {link.externalResourceId}
          </span>
          {link.externalResourceUrl && (
            <ExternalLink size={9} style={{ color: 'rgba(255,255,255,0.3)' }} />
          )}
        </div>
        {link.evidenceSummary && (
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {link.evidenceSummary}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Stat Chip ────────────────────────────────────────────────────────────────

const StatChip = ({
  label, value, color, icon: IconComp
}: {
  label: string;
  value: number | string;
  color: string;
  icon: React.FC<any>;
}) => (
  <div
    className="flex items-center gap-3 p-4 rounded-xl"
    style={{
      background: `${color}08`,
      border: `1px solid ${color}20`
    }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
      <IconComp size={16} style={{ color }} />
    </div>
    <div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const IntegrationDashboard = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [replayLinks, setReplayLinks] = useState<ReplayLink[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'providers' | 'replay' | 'audit' | 'sync'>('providers');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Provider | null>(null);

  const providers = Object.keys(PROVIDER_META) as Provider[];

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [intRes, auditRes] = await Promise.all([
        fetch('/api/integrations/connections').then(r => r.ok ? r.json() : { integrations: [] }),
        fetch('/api/integrations/governance').then(r => r.ok ? r.json() : { events: [] })
      ]);
      setIntegrations(intRes.integrations || []);
      setAuditEvents(auditRes.events || []);
    } catch {}
    setLoading(false);
  };

  const handleConnect = async (provider: Provider) => {
    setConnecting(provider);
    try {
      const res = await fetch('/api/integrations/oauth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          accessToken: `demo-token-${provider.toLowerCase()}-${Date.now()}`,
          providerOrgId: `demo-org-${provider.toLowerCase()}`,
          metadata: { demo: true, connectedAt: new Date().toISOString() }
        })
      });
      if (res.ok) await fetchAll();
    } catch {}
    setConnecting(null);
  };

  const handleRevoke = async (provider: Provider) => {
    try {
      await fetch('/api/integrations/oauth/revoke', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      await fetchAll();
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  // Compute stats
  const connected = integrations.filter(i => i.status === 'CONNECTED').length;
  const totalConnections = integrations.reduce((s, i) => s + i.connections.length, 0);

  const tabs = [
    { id: 'providers', label: 'Providers', icon: Link2 },
    { id: 'replay', label: 'Replay Links', icon: Eye },
    { id: 'audit', label: 'Audit Log', icon: Shield },
    { id: 'sync', label: 'Sync Diagnostics', icon: Webhook }
  ];

  return (
    <div
      className="min-h-screen p-6 font-jakarta"
      style={{ background: '#07090b' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <Link2 size={18} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Integration Ecosystem</h1>
            <p className="text-[11px] font-mono uppercase tracking-widest mt-0.5" style={{ color: 'rgba(16, 185, 129, 0.7)' }}>
              Design &middot; Product &middot; Engineering
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Fricta propagates replay-backed UX intelligence across your design and product ecosystem.
          Every integration preserves cognitive findings, survivability data, and full replay lineage.
        </p>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatChip label="Connected" value={connected} color="#10b981" icon={CheckCircle2} />
        <StatChip label="Providers" value={providers.length} color="#818cf8" icon={Link2} />
        <StatChip label="Connections" value={totalConnections} color="#f59e0b" icon={Database} />
        <StatChip label="Audit Events" value={auditEvents.length} color="#06b6d4" icon={Shield} />
      </div>

      {/* ── Category Pills ─────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {['All', 'Design', 'Product', 'Engineering', 'Knowledge'].map(cat => (
            <div
              key={cat}
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {cat}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all justify-center"
              style={{
                background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: isActive ? '#10b981' : 'rgba(255,255,255,0.4)',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
              }}
            >
              <TabIcon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Provider Grid ─────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {providers.map(p => (
                <div key={p} className="h-48 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {providers.map(provider => {
                const integration = integrations.find(i => i.provider === provider);
                return (
                  <ProviderCard
                    key={provider}
                    provider={provider}
                    integration={integration}
                    onConnect={handleConnect}
                    onRevoke={handleRevoke}
                  />
                );
              })}
            </div>
          )}

          {/* Ecosystem Architecture Note */}
          <div
            className="mt-6 p-5 rounded-xl"
            style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.12)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: '#10b981' }} />
              <span className="text-xs font-bold text-white">Operationally Intelligent Connectors</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Fricta integrations are not shallow notification connectors. Every ticket, frame annotation, and
              page embed carries full replay lineage, cognitive load metrics, and survivability intelligence.
              Design decisions become traceable to operational UX evidence.
            </p>
          </div>
        </>
      )}

      {/* ── Replay Links Panel ──────────────────────────────────── */}
      {activeTab === 'replay' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Replay Link Explorer</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Session replays correlated to external design, product, and engineering resources
              </p>
            </div>
          </div>

          {replayLinks.length === 0 ? (
            <div
              className="p-8 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Eye size={24} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-sm text-white/60 mb-1">No replay links yet</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Connect integrations and run analyses to create replay-to-resource links.
              </p>
            </div>
          ) : (
            replayLinks.map(link => <ReplayLinkRow key={link.id} link={link} />)
          )}
        </div>
      )}

      {/* ── Audit Log Panel ─────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Governance Audit Log</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Immutable chronological record of all integration operations
              </p>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <Shield size={12} style={{ color: '#10b981' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {auditEvents.length} events · All policy-checked
              </span>
            </div>
            <div className="px-4">
              {auditEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity size={20} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No audit events recorded yet</p>
                </div>
              ) : (
                auditEvents.map(e => <TimelineEvent key={e.id} event={e} />)
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sync Diagnostics Panel ─────────────────────────────── */}
      {activeTab === 'sync' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Sync Diagnostics</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Asynchronous sync job status, retry counters, and dead-letter monitoring
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {(['QUEUED', 'COMPLETED', 'FAILED'] as const).map(status => {
              const cfg = {
                QUEUED: { color: '#f59e0b', label: 'Queued' },
                COMPLETED: { color: '#10b981', label: 'Completed' },
                FAILED: { color: '#ef4444', label: 'Failed / Dead Letter' }
              }[status];

              return (
                <div
                  key={status}
                  className="p-4 rounded-xl"
                  style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
                >
                  <div className="text-2xl font-bold mb-1" style={{ color: cfg.color }}>0</div>
                  <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="p-5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Sync Architecture: Asynchronous · Observable · Failure-tolerant · Replay-safe
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              All integration sync operations are queued asynchronously. Failed jobs use exponential backoff
              (2^n × 30s). After max retries (default 3), jobs enter dead-letter for manual inspection.
              No replay intelligence is mutated by sync failures.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationDashboard;
