import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Play,
  X,
  FileText,
  Shield,
  Clock,
  Send,
  Sliders,
  HelpCircle
} from 'lucide-react';

const baseApiUrl = 'http://127.0.0.1:3001/api';

export function AutonomousDashboard() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Autonomous Engine States
  const [runs, setRuns] = useState<any[]>([]);
  const [adaptationRules, setAdaptationRules] = useState<any[]>([]);
  const [governanceEvents, setGovernanceEvents] = useState<any[]>([]);

  // Selection states
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  
  // Interactive UI flags
  const [loading, setLoading] = useState(false);
  const [runningProposal, setRunningProposal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [executingRollback, setExecutingRollback] = useState(false);

  // Proposal Creation Modal form states
  const [workflowPath, setWorkflowPath] = useState('/checkout');
  const [remediationPlan, setRemediationPlan] = useState('Consolidate billing address fields, auto-fill zip codes, and contrast purchase buttons.');
  const [targetSelector, setTargetSelector] = useState('button#submit-checkout');
  const [showProposalModal, setShowProposalModal] = useState(false);

  useEffect(() => {
    fetchInitialContext();
  }, []);

  const fetchInitialContext = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseApiUrl}/projects`);
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      if (projectList.length > 0) {
        const defaultProj = projectList[0];
        setProjectId(defaultProj.id);
        setWorkspaceId(defaultProj.workspaceId || null);
        fetchAutonomousData(defaultProj.id, defaultProj.workspaceId);
      }
    } catch (err) {
      console.error('Failed to load initial context:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutonomousData = async (projId: string, wId: string | null) => {
    try {
      setLoading(true);
      const wQuery = wId ? `&workspaceId=${wId}` : '';

      const [runsRes, rulesRes, govRes] = await Promise.all([
        fetch(`${baseApiUrl}/autonomous/optimization?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/autonomous/adaptation?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/autonomous/governance?workspaceId=${wId || ''}`)
      ]);

      const runsData = await runsRes.json();
      const rulesData = await rulesRes.json();
      const govData = await govRes.json();

      setRuns(runsData.runs || []);
      setAdaptationRules(rulesData.rules || []);
      setGovernanceEvents(govData.events || []);

      if (runsData.runs && runsData.runs.length > 0) {
        setSelectedRun(runsData.runs[0]);
      }
    } catch (err) {
      console.error('Failed to fetch autonomous optimization data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = projects.find(p => p.id === e.target.value);
    if (selected) {
      setProjectId(selected.id);
      setWorkspaceId(selected.workspaceId || null);
      fetchAutonomousData(selected.id, selected.workspaceId);
      setSelectedRun(null);
    }
  };

  const triggerProposal = async () => {
    try {
      setRunningProposal(true);
      const res = await fetch(`${baseApiUrl}/autonomous/optimization/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          workspaceId,
          workflowPath,
          remediationPlan,
          targetSelector
        })
      });
      const data = await res.json();
      if (data.id) {
        setShowProposalModal(false);
        fetchAutonomousData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to trigger proposal:', err);
    } finally {
      setRunningProposal(false);
    }
  };

  const submitReview = async (action: 'APPROVED' | 'REJECTED' | 'REQUESTED_CHANGES') => {
    if (!selectedRun) return;
    try {
      setSubmittingReview(true);
      const res = await fetch(`${baseApiUrl}/autonomous/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationRunId: selectedRun.id,
          roleScope: 'UX_LEAD',
          action,
          comments: reviewComment,
          workspaceId
        })
      });
      const data = await res.json();
      if (data.id) {
        setReviewComment('');
        fetchAutonomousData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to submit approval review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedRun || !rollbackReason) return;
    try {
      setExecutingRollback(true);
      const res = await fetch(`${baseApiUrl}/autonomous/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationRunId: selectedRun.id,
          rollbackReason,
          workspaceId
        })
      });
      const data = await res.json();
      if (data.id) {
        setRollbackReason('');
        fetchAutonomousData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to execute rollback:', err);
    } finally {
      setExecutingRollback(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 p-6 font-mono selection:bg-[#5ed29c]/30 selection:text-white">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222226] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#5ed29c]/10 text-[#5ed29c] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#5ed29c]/20 uppercase tracking-widest">
              Autonomous Systems Engaged
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
              Supervised Bounded Orchestrator
            </span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#5ed29c]" /> Optimization Orchestration Command Center
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Supervised UX outcome simulation, threshold adaptation rules, human-in-the-loop approvals, and state rollbacks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase">Context Project:</span>
            <select
              value={projectId}
              onChange={handleProjectChange}
              className="bg-transparent text-white text-xs border-none focus:outline-none cursor-pointer font-bold font-mono"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowProposalModal(true)}
            className="flex items-center gap-2 bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase font-mono"
          >
            <Play className="w-3.5 h-3.5 fill-[#5ed29c]" /> Propose Optimization Run
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121214] border border-[#222226] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#5ed29c] animate-spin mb-4" />
          <span className="text-xs text-zinc-500 uppercase">Syncing orchestration state...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLS: PROPOSALS, SIMULATIONS & DECISION TRACES */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Proposals grid list */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> Active Optimization Proposals
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {runs.length === 0 ? (
                  <div className="col-span-2 text-center py-10 text-zinc-500 text-xs border border-[#222226] border-dashed rounded-xl">
                    No optimization proposals initialized. Click Propose Optimization Run to start.
                  </div>
                ) : (
                  runs.map((r) => {
                    const isSelected = selectedRun && selectedRun.id === r.id;
                    const statusColors: any = {
                      PENDING_APPROVAL: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
                      APPLIED: 'border-emerald-500/20 bg-emerald-500/5 text-[#5ed29c]',
                      ROLLED_BACK: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
                      FAILED: 'border-red-500/20 bg-red-500/5 text-red-400'
                    };
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRun(r)}
                        className={`border p-4 rounded-xl cursor-pointer transition-all ${
                          isSelected ? 'border-[#5ed29c]/50 bg-[#161619]' : 'border-[#222226] bg-[#0f0f11] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-white text-xs font-bold truncate block flex-1">{r.workflowPath}</span>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColors[r.status] || 'border-zinc-700 bg-zinc-800'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 leading-normal line-clamp-2 mb-3">
                          {r.remediationPlan}
                        </p>
                        <div className="flex justify-between items-center text-[9px] border-t border-[#222226] pt-2 text-zinc-500 uppercase">
                          <span>Safety Score:</span>
                          <span className="text-white font-bold">{r.overallSafetyScore}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected run detailed workspace */}
            {selectedRun && (
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-black uppercase text-white mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" /> Simulated Outcomes Explorer
                  </h2>
                  <span className="text-[9.5px] text-zinc-500 uppercase">Projected performance drift analysis across user archetypes</span>
                </div>

                {/* Simulated Outcome SVG Chart */}
                <div className="bg-[#0c0c0e] border border-[#222226] p-4 rounded-xl relative">
                  <div className="flex justify-between items-center mb-4 text-[9px] text-zinc-500 uppercase">
                    <span>Cognitive Load Comparison (% Load)</span>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-400 rounded-full" /> Before</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#5ed29c] rounded-full" /> After</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 py-2">
                    {selectedRun.simulations?.map((sim: any) => (
                      <div key={sim.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#222226]/50 pb-2">
                        <div className="w-24 flex-shrink-0">
                          <span className="text-[10px] text-white font-bold uppercase">{sim.personaType}</span>
                        </div>
                        <div className="flex-1 w-full flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-zinc-500 w-8">Before:</span>
                            <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-red-400 h-full" style={{ width: `${sim.cognitiveLoadBefore}%` }} />
                            </div>
                            <span className="text-[9px] text-zinc-400 w-8 text-right">{sim.cognitiveLoadBefore}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-zinc-500 w-8">After:</span>
                            <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#5ed29c] h-full" style={{ width: `${sim.cognitiveLoadAfter}%` }} />
                            </div>
                            <span className="text-[9px] text-white font-bold w-8 text-right">{sim.cognitiveLoadAfter}%</span>
                          </div>
                        </div>
                        <div className="w-20 text-right flex-shrink-0">
                          <span className="text-[10px] text-[#5ed29c] font-extrabold">+{sim.simulatedSurvivalGain}% Survivability</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Trace Timeline */}
                <div>
                  <h3 className="text-[10px] text-zinc-500 uppercase block mb-3 font-bold">Autonomous Decision trace log</h3>
                  <div className="flex flex-col gap-3 border-l border-[#222226] pl-4 ml-2 relative">
                    {selectedRun.decisionTraces?.map((trace: any) => (
                      <div key={trace.id} className="relative">
                        <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#5ed29c] border-2 border-[#121214]" />
                        <span className="text-[9px] text-zinc-500 block uppercase">Step #{trace.stepIndex} — {trace.decisionNode.replace('_', ' ')}</span>
                        <p className="text-[10.5px] text-zinc-300 mt-0.5">{trace.outcomeDescription}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 1 COL: APPROVAL GATES, ROLLBACK CONTROLS, COMPLIANCE */}
          <div className="flex flex-col gap-8">
            
            {/* Human in the loop approval gate */}
            {selectedRun && selectedRun.status === 'PENDING_APPROVAL' && (
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col gap-4">
                <div>
                  <h2 className="text-xs font-black uppercase text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-yellow-500" /> Human Approval Gate
                  </h2>
                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Authorization mandate before sandbox application</p>
                </div>

                <div className="bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl text-[10px] text-zinc-400 leading-normal">
                  <span className="text-yellow-400 font-bold block mb-1">Mandate:</span>
                  Review simulated clarity gains and overall safety signal scores. Approving triggers sandbox state transition.
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Enter evaluation remarks or review comments..."
                  className="w-full bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5ed29c]/50 font-mono min-h-[80px]"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => submitReview('APPROVED')}
                    disabled={submittingReview}
                    className="bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold px-4 py-2 rounded-xl text-[10px] uppercase font-mono transition-all"
                  >
                    Approve Run
                  </button>
                  <button
                    onClick={() => submitReview('REJECTED')}
                    disabled={submittingReview}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold px-4 py-2 rounded-xl text-[10px] uppercase font-mono transition-all"
                  >
                    Reject Proposal
                  </button>
                </div>
              </div>
            )}

            {/* Reversible Rollback Interface */}
            {selectedRun && selectedRun.status === 'APPLIED' && (
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col gap-4">
                <div>
                  <h2 className="text-xs font-black uppercase text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-500" /> Reversible Rollback Control
                  </h2>
                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Safely revert layout configuration state snapshot</p>
                </div>

                <div className="bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl text-[10px] text-zinc-400 leading-normal">
                  <span className="text-amber-400 font-bold block mb-1">State Snapshot Reversion:</span>
                  Instantly reverts contrast values, visual grids, and custom progressive disclosure bounds back to baseline configurations.
                </div>

                <input
                  type="text"
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  placeholder="Enter rollback explanation (mandatory)..."
                  className="w-full bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono"
                />

                <button
                  onClick={handleRollback}
                  disabled={executingRollback || !rollbackReason}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold px-4 py-2 rounded-xl text-[10px] uppercase font-mono transition-all disabled:opacity-50"
                >
                  {executingRollback ? 'Executing Rollback...' : 'Execute Replay Rollback'}
                </button>
              </div>
            )}

            {/* Safety Signals Checklist */}
            {selectedRun && (
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col gap-4">
                <h2 className="text-xs font-black uppercase text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#5ed29c]" /> Safety Verification checklist
                </h2>
                <div className="flex flex-col gap-3">
                  {selectedRun.safetySignals?.map((sig: any) => (
                    <div key={sig.id} className="bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase">Signal</span>
                        <span className="text-white text-xs font-bold">{sig.metricName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 block uppercase">Limit: {sig.thresholdLimit}%</span>
                        <span className={`text-[10px] font-bold ${sig.policyPassed ? 'text-[#5ed29c]' : 'text-red-400'}`}>
                          Value: {sig.metricValue}% {sig.policyPassed ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Governance Audit Logs */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Compliance Audit Trail
              </h2>
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {governanceEvents.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs">No governance events logged.</div>
                ) : (
                  governanceEvents.map((ev) => (
                    <div key={ev.id} className="bg-[#18181b] border border-[#222226] p-2.5 rounded-xl text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#5ed29c] font-bold uppercase">{ev.action}</span>
                        <span className="text-zinc-600 text-[8px]">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-400 leading-normal">{ev.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── NEW PROPOSAL CREATION MODAL ────────────────────────────────────── */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-[#070b0a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-[#222226] rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowProposalModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[#1c1c22] rounded-lg border border-transparent hover:border-[#222226] transition-all"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-white" />
            </button>

            <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Cpu className="w-4 h-4 text-[#5ed29c]" /> Propose Optimization Run
            </h3>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 uppercase font-bold text-[9px]">Target Workflow URL Path</label>
                <input
                  type="text"
                  value={workflowPath}
                  onChange={(e) => setWorkflowPath(e.target.value)}
                  className="bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#5ed29c]/50 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 uppercase font-bold text-[9px]">Target Element CSS Selector</label>
                <input
                  type="text"
                  value={targetSelector}
                  onChange={(e) => setTargetSelector(e.target.value)}
                  className="bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#5ed29c]/50 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 uppercase font-bold text-[9px]">Remediation Strategy Description</label>
                <textarea
                  value={remediationPlan}
                  onChange={(e) => setRemediationPlan(e.target.value)}
                  className="bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl text-white focus:outline-none focus:border-[#5ed29c]/50 font-mono min-h-[80px]"
                />
              </div>

              <button
                onClick={triggerProposal}
                disabled={runningProposal}
                className="bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold py-2.5 rounded-xl uppercase font-mono transition-all mt-2"
              >
                {runningProposal ? 'Running simulations...' : 'Initialize proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
