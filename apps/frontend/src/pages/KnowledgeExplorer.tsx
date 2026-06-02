import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Network, Search, ShieldAlert, Scale, GitBranch, GitCommit, GitMerge,
  Eye, FileClock, RefreshCcw, Compass, HelpCircle, Activity, Info,
  CheckCircle2, AlertTriangle, User, Database, ChevronRight, Award
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  entityType: 'PROJECT' | 'WORKSPACE' | 'OBJECTIVE' | 'INITIATIVE' | 'KPI' | 'OUTCOME' | 'RECOMMENDATION' | 'INVESTIGATION' | 'REPLAY' | 'PERSONA' | 'RISK' | 'GOVERNANCE_RECORD';
  referenceId: string;
  name: string;
  description?: string | null;
  metadata?: any;
  createdAt: string;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: 'SUPPORTS' | 'BLOCKS' | 'INFLUENCES' | 'DEPENDS_ON' | 'CORRELATES_WITH' | 'DERIVED_FROM' | 'RELATED_TO' | 'REFERENCES';
  confidence: number;
  description?: string | null;
  evidenceCount: number;
}

interface DiscoveryRecord {
  id: string;
  discoveryType: 'FINDING' | 'RISK' | 'INITIATIVE' | 'OUTCOME' | 'PERSONA' | 'OBJECTIVE';
  title: string;
  details: string;
  confidence: number;
  discoveredAt: string;
}

interface GraphTimeline {
  id: string;
  eventType: 'ENTITY_CREATED' | 'RELATIONSHIP_CREATED' | 'DISCOVERY_LOGGED' | 'EVIDENCE_LINKED';
  title: string;
  description: string;
  timestamp: string;
}

interface GraphHealth {
  density: number;
  connectivity: number;
  orphanCount: number;
  stabilityIndex: number;
  checkedAt: string;
}

export function KnowledgeExplorer() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'map' | 'explorer' | 'discovery' | 'timeline'>('map');

  // Page Data States
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [discoveries, setDiscoveries] = useState<DiscoveryRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<GraphTimeline[]>([]);
  const [healthHistory, setHealthHistory] = useState<GraphHealth[]>([]);
  const [alignmentMetrics, setAlignmentMetrics] = useState<any>({ alignmentRate: 100, status: 'PASSED', details: 'No active discrepancies' });

  // Interactive Map Selections
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [incomingEdges, setIncomingEdges] = useState<any[]>([]);
  const [outgoingEdges, setOutgoingEdges] = useState<any[]>([]);

  // Evidence Details Modal
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load project ID
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) {
          headers['x-user-id'] = user.id;
        }
        const res = await fetch(`${API}/api/projects`, { headers });
        const data = await res.json();
        const projectsList = data.projects || data;
        const pid = projectsList?.[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
        setProjectId(pid);
      } catch (err) {
        console.error('Failed to load project, using fallback:', err);
        setProjectId('56b8722a-c7c4-47db-a855-b5d3e0ad32cb');
      }
    };
    fetchProject();
  }, [user]);

  // Load page data
  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  // Handle Search Query
  useEffect(() => {
    if (!projectId || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API}/api/knowledge/search?projectId=${projectId}&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. Fetch Entities & Graph
      const entitiesR = await fetch(`${API}/api/knowledge/entities?projectId=${projectId}`).then(r => r.json());
      setNodes(entitiesR.entities || []);

      const relationshipsR = await fetch(`${API}/api/knowledge/relationships?projectId=${projectId}`).then(r => r.json());
      setEdges(relationshipsR.relationships || []);

      // 2. Fetch Discoveries
      const discoveryR = await fetch(`${API}/api/knowledge/discovery?projectId=${projectId}`).then(r => r.json());
      setDiscoveries(discoveryR.discoveries || []);

      // 3. Fetch Timelines
      const timelineR = await fetch(`${API}/api/knowledge/timeline?projectId=${projectId}`).then(r => r.json());
      setTimelineEvents(timelineR.timeline || []);

      // 4. Fetch Health Metrics
      const healthR = await fetch(`${API}/api/knowledge/health?projectId=${projectId}`).then(r => r.json());
      setHealthHistory(healthR.healthRecords || []);
      setAlignmentMetrics(healthR.alignment || { alignmentRate: 100, status: 'PASSED', details: 'Aligned' });

    } catch (err) {
      console.error('Failed to load knowledge network data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync Graph
  const handleSyncGraph = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/knowledge/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error('Synchronization failed.');
      alert('Graph fully synchronized! Re-evaluating density indices and timelines.');
      await loadAll();
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Inspect Node details
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    
    // Resolve incoming and outgoing relations
    const outgoing = edges.filter(e => e.sourceId === nodeId).map(e => ({
      edge: e,
      node: nodes.find(n => n.id === e.targetId)
    }));

    const incoming = edges.filter(e => e.targetId === nodeId).map(e => ({
      edge: e,
      node: nodes.find(n => n.id === e.sourceId)
    }));

    setOutgoingEdges(outgoing);
    setIncomingEdges(incoming);
  };

  // Fetch Evidence details
  const handleInspectEvidence = async (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setLoadingEvidence(true);
    try {
      const res = await fetch(`${API}/api/knowledge/evidence/${edge.id}?projectId=${projectId}`);
      const data = await res.json();
      setEvidenceList(data.evidence || []);
    } catch (err) {
      console.error('Failed to load evidence trail:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Get type HSL coloring
  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      OBJECTIVE: '#3b82f6',
      INITIATIVE: '#10b981',
      KPI: '#a855f7',
      OUTCOME: '#818cf8',
      RECOMMENDATION: '#f59e0b',
      RISK: '#ef4444',
      GOVERNANCE_RECORD: '#ec4899',
      REPLAY: '#6b7280'
    };
    return map[type] || '#fff';
  };

  // Get active health stats
  const activeHealth = healthHistory[0] || { density: 12.5, connectivity: 85.0, orphanCount: 1, stabilityIndex: 83.0 };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#050707', padding: '32px 36px', fontFamily: 'Inter, sans-serif', color: '#e5e7eb' }}>
      
      {/* Dynamic Style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .net-card {
          background: rgba(15, 23, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          transition: border-color 0.2s, transform 0.2s;
        }
        .net-card:hover {
          border-color: rgba(16, 185, 129, 0.25);
          transform: translateY(-1px);
        }
        .net-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }
        .net-tab-btn:hover {
          color: #d1d5db;
          background: rgba(255, 255, 255, 0.02);
        }
        .net-tab-btn.active {
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
          border-color: rgba(16, 185, 129, 0.35);
        }
        .net-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rel-btn {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          color: #9ca3af;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .rel-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .entity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }
      ` }} />

      {/* Header Panel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <Network size={22} color="#10b981" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>Organizational Knowledge Network</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>Traceable intelligence map connecting objectives, initiatives, outcomes, and UX evidence</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSyncGraph} disabled={syncing} className="rel-btn" style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', fontWeight: 600 }}>
              <RefreshCcw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing Network...' : 'Sync Graph Network'}
            </button>
          </div>
        </div>
      </div>

      {/* Search & Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Search Bar */}
        <div className="net-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizational intelligence (e.g. 'checkout', 'retention', 'kpi')..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13 }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11 }}>Clear</button>
          )}
        </div>

        {/* Strategic Alignment rate */}
        <div className="net-card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Strategic Alignment</span>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{alignmentMetrics.details}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: alignmentMetrics.status === 'PASSED' ? '#34d399' : '#fbbf24' }}>
            {alignmentMetrics.alignmentRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Search Results Display */}
      {searchQuery.trim() !== '' && (
        <div className="net-card" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#9ca3af' }}>Search Results for "{searchQuery}"</h3>
          {isSearching ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>Running query...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>No matching organizational intelligence elements found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map(res => (
                <div key={res.node.id} onClick={() => { handleSelectNode(res.node.id); setActiveTab('map'); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="entity-dot" style={{ backgroundColor: getTypeColor(res.node.entityType) }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{res.node.name}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{res.node.description}</div>
                    </div>
                  </div>
                  <span className="net-badge" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                    {res.node.entityType} | Score: {(res.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dashboard KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="net-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Active Graph Nodes</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: '4px 0 2px 0' }}>{nodes.length}</div>
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Mapped strategic entities</p>
        </div>
        <div className="net-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Verified Relations</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: '4px 0 2px 0' }}>{edges.length}</div>
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Traceable linkages</p>
        </div>
        <div className="net-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Connection Density</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: '4px 0 2px 0' }}>{activeHealth.density.toFixed(1)}%</div>
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Graph network density index</p>
        </div>
        <div className="net-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Graph Stability Rating</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: '4px 0 2px 0' }}>{activeHealth.stabilityIndex.toFixed(0)}%</div>
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Orphan count: {activeHealth.orphanCount}</p>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(10,15,15,0.4)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid rgba(255,255,255,0.02)', marginBottom: 24 }}>
        <button onClick={() => setActiveTab('map')} className={`net-tab-btn ${activeTab === 'map' ? 'active' : ''}`}>
          <Network size={13} />Network Map
        </button>
        <button onClick={() => setActiveTab('explorer')} className={`net-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}>
          <Compass size={13} />Entity Explorer
        </button>
        <button onClick={() => setActiveTab('discovery')} className={`net-tab-btn ${activeTab === 'discovery' ? 'active' : ''}`}>
          <HelpCircle size={13} />Intelligence Discovery
        </button>
        <button onClick={() => setActiveTab('timeline')} className={`net-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}>
          <FileClock size={13} />Audit Timeline
        </button>
      </div>

      {/* ── Tab: Network Map ─────────────────────────────────────────────────── */}
      {activeTab === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Map Node list representation */}
          <div className="net-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700 }}>Select Node to Traversal Connected Paths</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              {nodes.map(node => (
                <div key={node.id} onClick={() => handleSelectNode(node.id)} style={{ padding: 12, background: selectedNodeId === node.id ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.01)', border: `1px solid ${selectedNodeId === node.id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.03)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <span className="entity-dot" style={{ backgroundColor: getTypeColor(node.entityType) }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>{node.entityType}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Node details and relations */}
          <div className="net-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
            {!selectedNodeId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', padding: 24, textAlign: 'center' }}>
                <Compass size={28} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 12 }}>Select a node in the map panel to inspect incoming/outgoing evidence paths.</p>
              </div>
            ) : (
              <div>
                {/* Node details */}
                {(() => {
                  const node = nodes.find(n => n.id === selectedNodeId);
                  if (!node) return null;
                  return (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="entity-dot" style={{ backgroundColor: getTypeColor(node.entityType) }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af' }}>{node.entityType}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{node.name}</h4>
                      <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{node.description}</p>
                    </div>
                  );
                })()}

                {/* Path traversals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Outgoing relationships */}
                  <div>
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Outgoing Connections</span>
                    {outgoingEdges.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>No outgoing paths.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {outgoingEdges.map(item => (
                          <div key={item.edge.id} style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>{item.edge.relationshipType} ➜</span>
                              <span style={{ fontSize: 9, color: '#9ca3af' }}>Confidence: {(item.edge.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ color: '#fff', fontWeight: 600 }}>{item.node?.name || 'Unknown Node'}</div>
                            <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{item.edge.description}</div>
                            <div style={{ marginTop: 8 }}>
                              <button onClick={() => handleInspectEvidence(item.edge)} className="rel-btn" style={{ padding: '3px 8px', fontSize: 9 }}>
                                <Eye size={10} />Trace Evidence ({item.edge.evidenceCount})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Incoming relationships */}
                  <div>
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Incoming Connections</span>
                    {incomingEdges.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>No incoming paths.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {incomingEdges.map(item => (
                          <div key={item.edge.id} style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: '#3b82f6', fontWeight: 700 }}>🛬 {item.edge.relationshipType}</span>
                              <span style={{ fontSize: 9, color: '#9ca3af' }}>Confidence: {(item.edge.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ color: '#fff', fontWeight: 600 }}>{item.node?.name || 'Unknown Node'}</div>
                            <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{item.edge.description}</div>
                            <div style={{ marginTop: 8 }}>
                              <button onClick={() => handleInspectEvidence(item.edge)} className="rel-btn" style={{ padding: '3px 8px', fontSize: 9 }}>
                                <Eye size={10} />Trace Evidence ({item.edge.evidenceCount})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Entity Explorer ────────────────────────────────────────────── */}
      {activeTab === 'explorer' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {nodes.map(node => (
            <div key={node.id} className="net-card" style={{ borderLeft: `4px solid ${getTypeColor(node.entityType)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="net-badge" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                  {node.entityType}
                </span>
                <span style={{ fontSize: 9, color: '#6b7280' }}>Synced {new Date(node.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: '#fff' }}>{node.name}</h4>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{node.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Intelligence Discovery ─────────────────────────────────────── */}
      {activeTab === 'discovery' && (
        <div>
          <div className="net-card" style={{ background: 'rgba(245,158,11,0.01)', borderColor: 'rgba(245,158,11,0.12)', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#fbcbf4' }}>Strategic Intelligence Discovery Scanner</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
              Fricta automatically scans the organizational graph to flag strategic gaps (unmapped objectives), dependency bottlenecks, and failing user cohorts.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {discoveries.length === 0 ? (
              <div style={{ padding: 48, gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No active discoveries surfaced. Sync graph to execute scanner.
              </div>
            ) : (
              discoveries.map(disc => (
                <div key={disc.id} className="net-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className="net-badge" style={{ color: '#fbbf24', border: '1px solid #fbbf24', background: 'transparent' }}>
                      {disc.discoveryType}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24' }}>
                      {(disc.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: '#fff' }}>{disc.title}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{disc.details}</p>
                  <p style={{ margin: 0, fontSize: 9, color: '#6b7280', textAlign: 'right' }}>Scanned: {new Date(disc.discoveredAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Audit Timeline ──────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="net-card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileClock size={18} color="#10b981" />
            Knowledge Graph Audit Log History
          </h3>
          {timelineEvents.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
              No timeline events logged. Sync graph network first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {timelineEvents.map((evt, index) => (
                <div key={evt.id} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: evt.eventType === 'ENTITY_CREATED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', border: `1px solid ${evt.eventType === 'ENTITY_CREATED' ? '#10b981' : '#3b82f6'}` }} />
                    {index < timelineEvents.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{evt.title}</span>
                      <span style={{ fontSize: 8, color: '#6b7280' }}>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: 0, color: '#9ca3af' }}>{evt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Evidence Navigator ───────────────────────────────────────── */}
      {selectedEdge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="net-card" style={{ width: '100%', maxWidth: 500, background: '#0a0d0d', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 800, color: '#fff' }}>Relationship Verification Evidence Navigator</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#6b7280' }}>
              Inspect trace paths verifying the relation: "{selectedEdge.relationshipType}" (Confidence: {(selectedEdge.confidence * 100).toFixed(0)}%)
            </p>

            {loadingEvidence ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                <RefreshCcw className="animate-spin" size={16} style={{ marginRight: 6 }} /> Resolving evidence records...
              </div>
            ) : evidenceList.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No evidence items links logged for this relation.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
                {evidenceList.map((ev, index) => (
                  <div key={ev.evidenceId} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#10b981' }}>
                        {index + 1}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 10 }}>Type: {ev.evidenceType}</span>
                        <span style={{ fontSize: 8, color: '#6b7280' }}>Ref ID: {ev.referenceId.substring(0, 8)}...</span>
                      </div>
                      <p style={{ margin: 0, color: '#9ca3af' }}>{ev.description}</p>
                      {ev.entityDetails && (
                        <div style={{ marginTop: 6, padding: 6, background: '#050707', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: 4, fontSize: 9, fontFamily: 'monospace', color: '#34d399' }}>
                          Title: {ev.entityDetails.title || ev.entityDetails.name || ev.entityDetails.metricKey || 'Session Logged'} | Status: {ev.entityDetails.status || ev.entityDetails.successVerdict || ev.entityDetails.severity || 'ACTIVE'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEdge(null)} className="rel-btn" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', color: '#fff' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
