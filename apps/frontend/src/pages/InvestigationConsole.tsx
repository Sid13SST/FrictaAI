import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, Terminal, Layers, ShieldAlert, Cpu, Sparkles, Database, Eye, Activity } from 'lucide-react';
import { apiFetch } from '../lib/api';

import { OrchestrationOverview } from '../features/orchestration/OrchestrationOverview';
import { MultiAgentTimeline } from '../features/timeline/MultiAgentTimeline';
import { AgentIntelligenceDetails } from '../features/agents/AgentIntelligenceDetails';
import { FindingCorrelationInspector } from '../features/correlations/FindingCorrelationInspector';
import { CollaborativeInsightCenter } from '../features/insights/CollaborativeInsightCenter';
import { SharedMemoryStream } from '../features/shared-memory/SharedMemoryStream';
import { SynchronizedReplayPlayer } from '../features/replay-sync/SynchronizedReplayPlayer';
import { RuntimeObservabilityPanel } from '../features/orchestrator/RuntimeObservabilityPanel';

export const InvestigationConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Layout Tab selection
  type ActiveViewTab = 'overview' | 'timeline' | 'evidence' | 'agents' | 'insights' | 'memory' | 'runtime';
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('overview');

  // Unified Replay Scrubbing Sync State
  const [activeStep, setActiveStep] = useState<number>(0);
  const [liveStepCount, setLiveStepCount] = useState<number>(0);

  const activeStepRef = useRef<number>(0);
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // Raw API Datasets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overviewData, setOverviewData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [agentsData, setAgentsData] = useState<any>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [replayData, setReplayData] = useState<any>(null);

  const [selectedAgentType, setSelectedAgentType] = useState<string>('VISUAL_AGENT');

  const fetchConsoleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = '/console';
      const [
        overviewRes,
        timelineRes,
        evidenceRes,
        insightsRes,
        agentsRes,
        memoryRes,
        replayRes
      ] = await Promise.all([
        apiFetch(`${base}/${id}/overview`),
        apiFetch(`${base}/${id}/timeline`),
        apiFetch(`${base}/${id}/evidence`),
        apiFetch(`${base}/${id}/insights`),
        apiFetch(`${base}/${id}/agents`),
        apiFetch(`${base}/${id}/memory`),
        apiFetch(`${base}/${id}/replay-sync`),
      ]);

      if (!overviewRes.ok) throw new Error('Investigation session details not found');
      
      const [overview, timeline, evidence, insights, agents, memory, replay] = await Promise.all([
        overviewRes.json(),
        timelineRes.json(),
        evidenceRes.json(),
        insightsRes.json(),
        agentsRes.json(),
        memoryRes.json(),
        replayRes.json()
      ]);

      setOverviewData(overview);
      setTimelineData(timeline);
      setEvidenceData(evidence);
      setInsightsData(insights);
      setAgentsData(agents);
      setMemoryData(memory);
      setReplayData(replay);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to aggregate multi-agent console telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchConsoleData();
  }, [id]);

  const handleResetLiveStep = () => {
    if (replayData && replayData.frames) {
      setActiveStep(replayData.frames.length - 1);
    }
    setLiveStepCount(0);
  };

  useEffect(() => {
    if (replayData && replayData.frames && activeStep >= replayData.frames.length - 1) {
      setLiveStepCount(0);
    }
  }, [activeStep, replayData]);

  useEffect(() => {
    if (!id || loading) return;

    const streamNames = ['orchestration', 'timeline', 'agents', 'memory', 'replay', 'insights'] as const;
    const sources: { [key: string]: EventSource } = {};
    let active = true;

    const mapSSEEventToTimelineItem = (eventType: string, data: any) => {
      const timestamp = data.timestamp || new Date().toISOString();
      switch (eventType) {
        case 'delegation.triggered':
          return {
            id: `delegation-${timestamp}-${Math.random()}`,
            type: 'DELEGATION',
            timestamp,
            source: data.fromAgent,
            target: data.toAgent,
            title: `Delegated to ${data.toAgent}`,
            description: `Agent ${data.fromAgent} delegated control task: "${data.eventType}"`,
            metadata: data.payload
          };
        case 'memory.updated':
          return {
            id: data.id,
            type: 'CORRELATION',
            timestamp,
            source: data.sourceAgent,
            title: `Memory Sync Event: ${data.eventType}`,
            description: `Agent ${data.sourceAgent} updated shared memory with keys: ${Object.keys(data.payload || {}).join(', ')}`,
            metadata: data.payload
          };
        case 'agent.finding':
          return {
            id: data.finding?.id || `finding-${timestamp}-${Math.random()}`,
            type: 'FINDING',
            timestamp,
            source: data.agentType || 'UX_ORCHESTRATOR',
            title: data.finding?.title || 'UX Defect Detected',
            description: data.finding?.description || '',
            metadata: {
              severity: data.finding?.severity,
              recommendation: data.finding?.recommendation,
              evidence: data.finding?.evidence
            }
          };
        case 'screenshot.captured':
          return {
            id: data.id,
            type: 'SCREENSHOT',
            timestamp,
            source: 'VISUAL_AGENT',
            title: `Captured screenshot at step ${data.stepIndex}`,
            description: `Captured screenshot of url: ${data.pageUrl} (Context: ${data.actionContext || 'N/A'})`,
            metadata: {
              stepIndex: data.stepIndex,
              filePath: data.filePath,
              thumbnailPath: data.thumbnailPath,
              pageUrl: data.pageUrl,
              viewport: `${data.viewportWidth}x${data.viewportHeight}`
            }
          };
        case 'agent.failed':
          return {
            id: data.taskId || `failed-${timestamp}`,
            type: 'RECOVERY',
            timestamp,
            source: data.agentType,
            title: `${data.agentType} execution failure`,
            description: `Attempting automated fallback / error recovery path.`,
            metadata: { error: data.error, retryCount: data.retryCount }
          };
        case 'agent.progress':
          return {
            id: `progress-${timestamp}-${Math.random()}`,
            type: 'REASONING',
            timestamp,
            source: data.agentType,
            title: `${data.agentType} reasoning step`,
            description: data.description,
            metadata: { stepType: data.step }
          };
        default:
          return {
            id: `event-${timestamp}-${Math.random()}`,
            type: 'CONTEXT',
            timestamp,
            source: 'SYSTEM',
            title: `System event: ${eventType}`,
            description: JSON.stringify(data)
          };
      }
    };

    const initSSE = async () => {
      let token = '';
      try {
        const clerk = (window as any).__clerk__;
        if (clerk?.session) {
          token = await clerk.session.getToken() || '';
        }
      } catch (err) {
        console.error('Failed to get Clerk token for SSE:', err);
      }

      if (!active) return;

      streamNames.forEach(streamName => {
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const url = `/api/realtime/${streamName}/${id}${tokenParam}`;
        const source = new EventSource(url);
        sources[streamName] = source;

        source.onerror = (err) => {
          console.error(`[SSE Connection Error] Stream: ${streamName}`, err);
        };
      });

      // orchestration stream listeners
    sources.orchestration.addEventListener('orchestration.started', (e: any) => {
      const data = JSON.parse(e.data);
      setOverviewData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            workflowSessionId: data.workflowSessionId,
            goal: data.goal,
            startedAt: data.startedAt
          }
        };
      });
    });

    const handleOrchUpdate = (e: any) => {
      const data = JSON.parse(e.data);
      setOverviewData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            status: data.status,
            completedAt: data.completedAt || prev.session.completedAt,
            metadata: data.metadata || prev.session.metadata
          }
        };
      });
    };
    sources.orchestration.addEventListener('orchestration.updated', handleOrchUpdate);
    sources.orchestration.addEventListener('orchestration.completed', handleOrchUpdate);

    // timeline stream listeners
    const timelineEventNames = [
      'delegation.triggered',
      'memory.updated',
      'agent.finding',
      'screenshot.captured',
      'agent.failed',
      'agent.progress'
    ];
    timelineEventNames.forEach(evtName => {
      sources.timeline.addEventListener(evtName, (e: any) => {
        const data = JSON.parse(e.data);
        const item = mapSSEEventToTimelineItem(evtName, data);
        
        setTimelineData((prev: any) => {
          if (!prev) return prev;
          const list = prev.timeline || [];
          const existsIndex = list.findIndex((x: any) => x.id === item.id);
          let updatedList;
          if (existsIndex > -1) {
            updatedList = [...list];
            updatedList[existsIndex] = item;
          } else {
            updatedList = [...list, item];
          }
          updatedList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return { ...prev, timeline: updatedList };
        });

        if (evtName === 'screenshot.captured') {
          setEvidenceData((prev: any) => {
            if (!prev) return prev;
            const exists = (prev.screenshots || []).some((s: any) => s.id === data.id);
            if (exists) return prev;
            return {
              ...prev,
              screenshots: [...(prev.screenshots || []), data]
            };
          });
        }
      });
    });

    // agents stream listeners
    sources.agents.addEventListener('agent.started', (e: any) => {
      const data = JSON.parse(e.data);
      setAgentsData((prev: any) => {
        if (!prev) return prev;
        const list = prev.agents || [];
        const existsIndex = list.findIndex((a: any) => a.id === data.taskId || a.agentType === data.agentType);
        if (existsIndex > -1) {
          const updatedList = [...list];
          updatedList[existsIndex] = {
            ...updatedList[existsIndex],
            id: data.taskId,
            status: 'RUNNING',
            task: data.description
          };
          return { ...prev, agents: updatedList };
        }
        const newAgent = {
          id: data.taskId,
          agentType: data.agentType,
          status: 'RUNNING',
          task: data.description,
          startedAt: new Date().toISOString(),
          completedAt: null,
          findings: [],
          signals: [],
          reasoningTraces: []
        };
        return { ...prev, agents: [...list, newAgent] };
      });
    });

    sources.agents.addEventListener('agent.progress', (e: any) => {
      const data = JSON.parse(e.data);
      setAgentsData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: (prev.agents || []).map((a: any) => {
            if (a.id !== data.taskId && a.agentType !== data.agentType) return a;
            const traceExists = (a.reasoningTraces || []).some((t: any) => t.summary === data.description && t.stepType === data.step);
            if (traceExists) return { ...a, id: data.taskId };
            return {
              ...a,
              id: data.taskId,
              reasoningTraces: [
                ...(a.reasoningTraces || []),
                {
                  id: `trace-${Date.now()}-${Math.random()}`,
                  summary: data.description,
                  stepType: data.step,
                  timestamp: new Date().toISOString()
                }
              ]
            };
          })
        };
      });
    });

    sources.agents.addEventListener('agent.finding', (e: any) => {
      const data = JSON.parse(e.data);
      setAgentsData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: (prev.agents || []).map((a: any) => {
            if (a.id !== data.taskId && a.agentType !== data.agentType) return a;
            const findingExists = (a.findings || []).some((f: any) => f.id === data.finding.id);
            if (findingExists) return { ...a, id: data.taskId };
            return {
              ...a,
              id: data.taskId,
              findings: [...(a.findings || []), data.finding]
            };
          })
        };
      });

      setOverviewData((prev: any) => {
        if (!prev) return prev;
        const sev = (data.finding.severity || 'LOW').toUpperCase();
        return {
          ...prev,
          severity: {
            ...prev.severity,
            [sev]: (prev.severity[sev] || 0) + 1
          }
        };
      });

      setEvidenceData((prev: any) => {
        if (!prev) return prev;
        const exists = (prev.uxFindings || []).some((f: any) => f.id === data.finding.id);
        if (exists) return prev;
        return {
          ...prev,
          uxFindings: [
            ...(prev.uxFindings || []),
            {
              id: data.finding.id,
              workflowSessionId: id,
              findingType: data.finding.findingType,
              severity: data.finding.severity,
              title: data.finding.title,
              description: data.finding.description,
              evidence: data.finding.evidence,
              timestamp: new Date().toISOString()
            }
          ]
        };
      });
    });

    sources.agents.addEventListener('agent.failed', (e: any) => {
      const data = JSON.parse(e.data);
      setAgentsData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: (prev.agents || []).map((a: any) => {
            if (a.id !== data.taskId && a.agentType !== data.agentType) return a;
            return {
              ...a,
              id: data.taskId,
              status: 'FAILED',
              completedAt: new Date().toISOString()
            };
          })
        };
      });
    });

    // memory stream listeners
    sources.memory.addEventListener('memory.updated', (e: any) => {
      const data = JSON.parse(e.data);
      setMemoryData((prev: any) => {
        if (!prev) return prev;
        const list = prev.events || [];
        const exists = list.some((x: any) => x.id === data.id);
        if (exists) return prev;
        return {
          ...prev,
          events: [...list, {
            id: data.id,
            eventType: data.eventType,
            sourceAgent: data.sourceAgent,
            payload: data.payload,
            timestamp: new Date(data.timestamp)
          }]
        };
      });
    });

    // replay stream listeners
    sources.replay.addEventListener('replay.updated', (e: any) => {
      const data = JSON.parse(e.data);
      setReplayData((prev: any) => {
        if (!prev) return prev;
        const frames = prev.frames || [];
        const existingIndex = frames.findIndex((f: any) => f.stepIndex === data.stepIndex);
        let updatedFrames;
        if (existingIndex > -1) {
          updatedFrames = [...frames];
          updatedFrames[existingIndex] = data;
        } else {
          updatedFrames = [...frames, data];
        }
        updatedFrames.sort((a, b) => a.stepIndex - b.stepIndex);

        const lastFrameIndex = frames.length - 1;
        const isNewFrame = existingIndex === -1;

        if (isNewFrame) {
          const currentActiveStep = activeStepRef.current;
          if (currentActiveStep >= lastFrameIndex || lastFrameIndex < 0) {
            const newLastIndex = updatedFrames.length - 1;
            setActiveStep(newLastIndex);
            setLiveStepCount(0);
          } else {
            setLiveStepCount(c => c + 1);
          }
        }

        return { ...prev, frames: updatedFrames };
      });
    });

    // insights stream listeners
    sources.insights.addEventListener('insight.generated', (e: any) => {
      const data = JSON.parse(e.data);
      setInsightsData((prev: any) => {
        if (!prev) return prev;
        const list = prev.insights || [];
        const exists = list.some((i: any) => i.id === data.insightId);
        if (exists) return prev;
        return {
          ...prev,
          insights: [...list, {
            id: data.insightId,
            orchestrationSessionId: id,
            title: data.title,
            summary: data.summary,
            supportingEvidence: data.supportingEvidence,
            severity: data.severity,
            confidence: data.confidence,
            timestamp: new Date().toISOString()
          }]
        };
      });

      setOverviewData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          insightsCount: (prev.insightsCount || 0) + 1
        };
      });
    });

    sources.insights.addEventListener('correlation.generated', (e: any) => {
      const data = JSON.parse(e.data);
      setEvidenceData((prev: any) => {
        if (!prev) return prev;
        const list = prev.correlations || [];
        const exists = list.some((c: any) => c.id === data.correlationId);
        if (exists) return prev;
        return {
          ...prev,
          correlations: [...list, {
            id: data.correlationId,
            orchestrationSessionId: id,
            findingIds: data.findingIds,
            correlationType: data.correlationType,
            summary: data.summary,
            confidence: data.confidence,
            metadata: data.metadata,
            timestamp: new Date().toISOString()
          }]
        };
      });
    });
  };

  initSSE();

  return () => {
      streamNames.forEach(streamName => {
        if (sources[streamName]) {
          sources[streamName].close();
        }
      });
    };
  }, [id, loading]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#070b0a] flex flex-col items-center justify-center gap-4 text-zinc-400 font-mono">
        <div className="w-10 h-10 border-2 border-t-transparent animate-spin rounded-full" style={{ borderColor: 'rgba(94, 210, 156, 0.2)', borderTopColor: '#5ed29c' }} />
        <span className="text-[10px] tracking-[0.2em] text-[#5ed29c] font-black uppercase animate-pulse">Aggregating investigation telemetry...</span>
      </div>
    );
  }

  if (error || !overviewData) {
    return (
      <div className="h-screen w-screen bg-[#070b0a] flex flex-col items-center justify-center gap-4 text-center p-8">
        <ShieldAlert className="w-12 h-12 text-red-400 animate-bounce" />
        <h3 className="text-base font-bold text-white font-mono">Operational Console Failed</h3>
        <p className="text-xs text-zinc-500 max-w-sm font-sans">{error || 'Session intelligence data could not be retrieved.'}</p>
        <Link to="/app/reports" className="text-xs font-mono text-[#5ed29c] border border-[#5ed29c]/20 bg-[#5ed29c]/5 px-4 py-2 rounded-xl mt-4">
          Return to Reports
        </Link>
      </div>
    );
  }

  const { session, severity } = overviewData;
  const totalFindings = (severity.CRITICAL || 0) + (severity.HIGH || 0) + (severity.MEDIUM || 0) + (severity.LOW || 0);

  const menuItems = [
    { key: 'overview', label: 'Console Overview', icon: Terminal },
    { key: 'timeline', label: 'Chronological Timeline', icon: Layers },
    { key: 'evidence', label: 'Evidence Explorer', icon: Eye },
    { key: 'agents', label: 'Specialist Agents', icon: Cpu },
    { key: 'insights', label: 'Insight Center', icon: Sparkles },
    { key: 'memory', label: 'Shared Memory Stream', icon: Database },
    { key: 'runtime', label: 'Runtime Observability', icon: Activity },
  ] as const;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b0a] text-zinc-100 flex flex-col font-sans select-none">
      
      {/* ── Minimalist Nav Header ────────────────────────────────────────── */}
      <header className="h-12 border-b border-[#222226] bg-[#09090b]/80 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/app/reports"
            className="p-1.5 rounded-lg border border-[#222226] hover:bg-[#121214] text-zinc-500 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <span className="text-zinc-700 font-mono text-xs">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#5ed29c]/5 border border-[#5ed29c]/20 flex items-center justify-center shrink-0">
              <Brain className="w-3.5 h-3.5 text-[#5ed29c]" />
            </div>
            <span className="text-xs font-black tracking-tight text-white font-mono uppercase">Investigation Console</span>
          </div>
          <span className="text-[10px] bg-[#121214] px-2 py-0.5 rounded border border-[#222226] font-mono text-zinc-500 truncate max-w-[200px]">
            ID: {id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#5ed29c]/5 border border-[#5ed29c]/20 px-3 py-1 rounded-lg text-[9px] font-mono font-bold text-[#5ed29c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5ed29c] animate-pulse" />
            INVESTIGATION LIVE
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* ── Left Rail Menu ────────────────────────────────────────────── */}
        <aside className="w-60 border-r border-[#222226] bg-[#09090b]/40 flex flex-col flex-shrink-0 min-h-0">
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black px-3.5 mb-2 block">
              Console Navigation
            </span>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    isActive
                      ? 'bg-[#5ed29c]/10 text-white border-[#5ed29c]/20'
                      : 'border-transparent text-zinc-400 hover:bg-[#121214] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#5ed29c]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Central Canvas and Right Sidebar Wrapper ───────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Primary Content Canvas */}
            <main className="flex-1 overflow-y-auto p-6 min-w-0 bg-[#070b0a]">
              {activeTab === 'overview' && overviewData && (
                <OrchestrationOverview 
                  overviewData={overviewData} 
                  onAgentSelect={(agentType) => {
                    setSelectedAgentType(agentType);
                    setActiveTab('agents');
                  }}
                />
              )}
              {activeTab === 'timeline' && timelineData && (
                <MultiAgentTimeline 
                  timelineEvents={timelineData.timeline || []} 
                  activeStep={activeStep} 
                  onStepSelect={setActiveStep} 
                />
              )}
              {activeTab === 'evidence' && evidenceData && (
                <div className="flex flex-col gap-6">
                  {replayData && replayData.frames && replayData.frames.length > 0 && (
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-[#222226] pb-3">
                        <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Active Step Screenshot Details</h4>
                        <span className="text-[9.5px] font-mono text-zinc-500">
                          STEP {activeStep + 1} / {replayData.frames.length}
                        </span>
                      </div>
                      <SynchronizedReplayPlayer
                        frames={replayData.frames}
                        activeStep={activeStep}
                        setActiveStep={setActiveStep}
                        visualFindings={evidenceData.visualFindings || []}
                        mode="full"
                        liveStepCount={liveStepCount}
                        onResetLiveStep={handleResetLiveStep}
                      />
                    </div>
                  )}

                  <FindingCorrelationInspector 
                    screenshots={evidenceData.screenshots || []} 
                    visualFindings={evidenceData.visualFindings || []} 
                    cognitiveSignals={evidenceData.cognitiveSignals || []} 
                    correlations={evidenceData.correlations || []}
                    onSelectStep={(step) => {
                      setActiveStep(step);
                    }}
                  />
                </div>
              )}
              {activeTab === 'agents' && agentsData && (
                <AgentIntelligenceDetails 
                  agentsData={agentsData.agents || []} 
                  selectedAgentType={selectedAgentType} 
                  onSelectAgent={setSelectedAgentType} 
                />
              )}
              {activeTab === 'insights' && insightsData && (
                <CollaborativeInsightCenter 
                  insights={insightsData.insights || []} 
                />
              )}
              {activeTab === 'memory' && memoryData && (
                <SharedMemoryStream 
                  memoryEvents={memoryData.events || []} 
                />
              )}
              {activeTab === 'runtime' && id && (
                <RuntimeObservabilityPanel sessionId={id} />
              )}
            </main>

            {/* Right Side Stats Panel */}
            <aside className="w-80 border-l border-[#222226] bg-[#09090b]/20 overflow-y-auto hidden xl:block p-5 flex-shrink-0">
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 font-black uppercase tracking-widest border-b border-[#222226] pb-2">
                    Orchestration Health
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase font-black">Status</span>
                      <span className="text-xs font-mono text-[#5ed29c] font-bold uppercase">{session.status}</span>
                    </div>
                    <div className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase font-black">Findings</span>
                      <span className="text-xs font-mono text-white font-bold">{totalFindings} defects</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 font-black uppercase tracking-widest border-b border-[#222226] pb-2">
                    Severity Metrics
                  </h4>
                  <div className="flex flex-col gap-2.5 mt-3">
                    {[
                      { label: 'CRITICAL', val: severity.CRITICAL || 0, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                      { label: 'HIGH', val: severity.HIGH || 0, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                      { label: 'MEDIUM', val: severity.MEDIUM || 0, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                      { label: 'LOW', val: severity.LOW || 0, color: 'text-[#5ed29c] bg-[#5ed29c]/10 border-[#5ed29c]/20' }
                    ].map(s => (
                      <div key={s.label} className="flex justify-between items-center text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded border font-bold ${s.color}`}>{s.label}</span>
                        <span className="font-bold text-white">{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 font-black uppercase tracking-widest border-b border-[#222226] pb-2">
                    Telemetry Context
                  </h4>
                  <div className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex flex-col gap-2.5 mt-3 text-[11px] font-mono text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Workflow:</span>
                      <span className="text-zinc-300 truncate max-w-[120px]">{overviewData.workflowSession?.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Total Steps:</span>
                      <span className="text-zinc-300">{overviewData.workflowSession?.stepCount || 0} frames</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Elapsed:</span>
                      <span className="text-zinc-300">{overviewData.health?.duration || 0}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* ── Bottom Timeline Scrubber Dock ──────────────────────────────── */}
          <footer className="h-28 border-t border-[#222226] bg-[#09090b]/80 backdrop-blur-md px-6 py-4 flex-shrink-0 z-10 overflow-hidden flex flex-col justify-center">
            {replayData && replayData.frames && replayData.frames.length > 0 ? (
              <SynchronizedReplayPlayer
                frames={replayData.frames}
                activeStep={activeStep}
                setActiveStep={setActiveStep}
                visualFindings={evidenceData?.visualFindings || []}
                mode="minimal"
                liveStepCount={liveStepCount}
                onResetLiveStep={handleResetLiveStep}
              />
            ) : (
              <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
                Gathering active workflow replay streams...
              </div>
            )}
          </footer>
        </div>

      </div>

    </div>
  );
};
