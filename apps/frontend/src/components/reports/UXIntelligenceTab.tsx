import React, { useState, useEffect } from 'react';
import { 
  Brain, User, AlertCircle, CheckCircle2, Gauge, 
  Clock, Shuffle, HelpCircle, TrendingUp, HelpCircle as HelpIcon, ArrowRight
} from 'lucide-react';

interface UXFinding {
  id: string;
  findingType: string;
  severity: string;
  personaType: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  timestamp: string;
}

interface CognitiveSignal {
  id: string;
  signalType: string;
  intensity: number;
  metadata?: any;
}

interface Recommendation {
  title: string;
  description: string;
  evidence: string;
  severity: string;
  whyItMatters: string;
  remedySteps: string[];
}

export function UXIntelligenceTab({ sessionId }: { sessionId: string }) {
  const [activePersona, setActivePersona] = useState<'STANDARD' | 'BEGINNER' | 'POWER_USER' | 'FIRST_TIME_USER'>('STANDARD');
  const [findings, setFindings] = useState<UXFinding[]>([]);
  const [cognitiveSignals, setCognitiveSignals] = useState<CognitiveSignal[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Trigger analysis if findings are empty, or just load them
  const loadUXData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Trigger analysis first to make sure findings are compiled
      const analyzeRes = await fetch(`http://127.0.0.1:3001/api/ux/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const analyzeData = await analyzeRes.json();

      if (analyzeData.error) {
        throw new Error(analyzeData.error);
      }

      setFindings(analyzeData.findings || []);
      setCognitiveSignals(analyzeData.cognitiveSignals || []);

      // Fetch recommendations
      const recRes = await fetch(`http://127.0.0.1:3001/api/ux/recommendations/${sessionId}`);
      const recData = await recRes.json();
      setRecommendations(recData.recommendations || []);
    } catch (err: any) {
      console.error('Failed to load UX data:', err);
      setError(err.message || 'Failed to retrieve UX heuristics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUXData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-slate-800 animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Running cognitive friction & heuristic simulations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <p className="font-semibold">{error}</p>
        <button 
          onClick={loadUXData}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  // Filter findings based on selected persona
  const filteredFindings = findings.filter(f => {
    if (activePersona === 'STANDARD') return true;
    return f.personaType === activePersona;
  });

  // Calculate persona-specific simulated scores
  const getSimulatedScores = () => {
    let clarity = 92;
    let onboarding = 90;
    let ia = 88;
    let efficiency = 85;

    // Beginner Teacher struggles with clarity/onboarding
    if (activePersona === 'BEGINNER') {
      clarity = 72;
      onboarding = 68;
      ia = 80;
      efficiency = 88;
    }
    // Power User struggles with efficiency
    else if (activePersona === 'POWER_USER') {
      clarity = 90;
      onboarding = 92;
      ia = 86;
      efficiency = 58;
    }
    // First-Time User struggles with IA / Onboarding
    else if (activePersona === 'FIRST_TIME_USER') {
      clarity = 82;
      onboarding = 62;
      ia = 54;
      efficiency = 80;
    }
    // Standard gets average from database compiled scores if available
    else {
      // Look for signals in state
      const overload = cognitiveSignals.find(s => s.signalType === 'COGNITIVE_OVERLOAD')?.intensity || 0.2;
      const IA = cognitiveSignals.find(s => s.signalType === 'BRANCHING_DEPTH')?.intensity || 0.3;
      const density = cognitiveSignals.find(s => s.signalType === 'WORKFLOW_DENSITY')?.intensity || 0.4;

      clarity = Math.round(100 - overload * 40);
      onboarding = Math.round(100 - (overload + IA) * 20);
      ia = Math.round(100 - IA * 60);
      efficiency = Math.round(100 - density * 40);
    }

    const overall = Math.round((clarity + onboarding + ia + efficiency) / 4);

    return { clarity, onboarding, ia, efficiency, overall };
  };

  const scores = getSimulatedScores();

  // Create Step Heatmap based on cognitive load
  const stepCount = Math.max(5, Math.max(...findings.map(f => {
    const match = f.evidence.match(/step (\d+)/i);
    return match ? parseInt(match[1]) : 1;
  }), cognitiveSignals.length));

  const getStepFriction = (step: number) => {
    // Generate a simulated step friction value between 0.0 and 1.0 based on finding step references
    let intensity = 0.15;
    findings.forEach(f => {
      if (f.evidence.toLowerCase().includes(`step ${step}`)) {
        if (f.severity === 'LOW') intensity += 0.15;
        if (f.severity === 'MEDIUM') intensity += 0.3;
        if (f.severity === 'HIGH') intensity += 0.55;
        if (f.severity === 'CRITICAL') intensity += 0.75;
      }
    });

    return Math.min(1.0, intensity);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Persona Profile Toggle Panel */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Persona Usability Projections</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Persona Card: Standard */}
          <button 
            onClick={() => setActivePersona('STANDARD')}
            className={`text-left p-4 rounded-xl border transition-all duration-300 ${
              activePersona === 'STANDARD' 
                ? 'bg-slate-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-slate-200">Standard Explorer</span>
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 mb-2">Aggregate metrics representing standard user behaviors and interactions.</p>
            <div className="text-[10px] text-slate-500 font-mono">Patience: Med • IA Comfort: Med</div>
          </button>

          {/* Persona Card: Beginner Teacher */}
          <button 
            onClick={() => setActivePersona('BEGINNER')}
            className={`text-left p-4 rounded-xl border transition-all duration-300 ${
              activePersona === 'BEGINNER' 
                ? 'bg-slate-800 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-amber-400">Beginner Teacher</span>
              <User className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs text-slate-400 mb-2">Low tech familiarity, relies heavily on onboarding tooltips and prompts.</p>
            <div className="text-[10px] text-amber-500/80 font-mono">Patience: High • IA Comfort: Low</div>
          </button>

          {/* Persona Card: Power User */}
          <button 
            onClick={() => setActivePersona('POWER_USER')}
            className={`text-left p-4 rounded-xl border transition-all duration-300 ${
              activePersona === 'POWER_USER' 
                ? 'bg-slate-800 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-purple-400">Power Administrator</span>
              <User className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xs text-slate-400 mb-2">Speed-focused, seeks hotkeys and shortcuts. Annoyed by deep workflows.</p>
            <div className="text-[10px] text-purple-500/80 font-mono">Patience: Low • IA Comfort: High</div>
          </button>

          {/* Persona Card: First-Time User */}
          <button 
            onClick={() => setActivePersona('FIRST_TIME_USER')}
            className={`text-left p-4 rounded-xl border transition-all duration-300 ${
              activePersona === 'FIRST_TIME_USER' 
                ? 'bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm text-emerald-400">First-Time Explorer</span>
              <User className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-400 mb-2">New visitor, highly sensitive to routing structure, bad empty states.</p>
            <div className="text-[10px] text-emerald-500/80 font-mono">Patience: Med • IA Comfort: Med</div>
          </button>

        </div>
      </section>

      {/* 2. Cognitive Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sub-Scores Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
              <Gauge className="w-4 h-4 mr-2 text-indigo-400" /> Simulated UX Scores
            </h4>
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-slate-800" strokeWidth="6" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-indigo-500" strokeWidth="6" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * scores.overall) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xl font-bold text-white">{scores.overall}</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Overall Score</div>
                <p className="text-xs text-slate-400">Calculated usability score weighted on the active persona profile.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Visual Clarity</span>
                  <span>{scores.clarity}%</span>
                </div>
                <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${scores.clarity}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Guided Onboarding</span>
                  <span>{scores.onboarding}%</span>
                </div>
                <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scores.onboarding}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Mental-Model IA Alignment</span>
                  <span>{scores.ia}%</span>
                </div>
                <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${scores.ia}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Workflow Efficiency</span>
                  <span>{scores.efficiency}%</span>
                </div>
                <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${scores.efficiency}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cognitive Load Telemetry */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-6 flex items-center">
            <Brain className="w-4 h-4 mr-2 text-indigo-400" /> Cognitive Load Profile
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {cognitiveSignals.map(signal => {
              const label = signal.signalType.replace(/_/g, ' ');
              const intensity = signal.intensity;
              let barColor = 'bg-emerald-500';
              let textWeight = 'Optimal';
              if (intensity > 0.4) {
                barColor = 'bg-amber-500';
                textWeight = 'Slight Friction';
              }
              if (intensity > 0.7) {
                barColor = 'bg-red-500';
                textWeight = 'Overload Warning';
              }

              return (
                <div key={signal.id || signal.signalType} className="p-3 bg-slate-950/30 border border-slate-850 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-300 font-mono">{label}</span>
                    <span className="text-xs font-bold text-slate-400">{(intensity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden mb-2">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${intensity * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Friction: {textWeight}</span>
                    {signal.metadata?.maxInteractiveElements && (
                      <span>{signal.metadata.maxInteractiveElements} choices visible</span>
                    )}
                    {signal.metadata?.totalSteps && (
                      <span>{signal.metadata.totalSteps} steps executed</span>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* 3. Horizontal Step Heatmap Timeline */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-indigo-400" /> Friction Heatmap Timeline
          </h4>
          <div className="flex items-center space-x-4 text-[10px] text-slate-500">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> Low</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" /> Moderate</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1" /> Critical</span>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
          {Array.from({ length: stepCount }).map((_, i) => {
            const step = i + 1;
            const friction = getStepFriction(step);
            
            let color = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20';
            if (friction > 0.3) {
              color = 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20';
            }
            if (friction > 0.6) {
              color = 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
            }

            const isActive = selectedStep === step;

            return (
              <button
                key={step}
                onClick={() => setSelectedStep(isActive ? null : step)}
                className={`flex-1 min-w-[70px] py-3 rounded-lg border text-center transition-all duration-300 flex flex-col justify-between items-center cursor-pointer ${color} ${
                  isActive ? 'ring-2 ring-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] scale-[1.03] bg-slate-800' : ''
                }`}
              >
                <span className="text-[10px] text-slate-500 font-bold mb-1">STEP {step}</span>
                <span className="text-sm font-bold">{(friction * 100).toFixed(0)}%</span>
                <span className="text-[8px] mt-1 font-mono text-slate-500">
                  {friction > 0.6 ? 'Critical' : friction > 0.3 ? 'Warning' : 'Good'}
                </span>
              </button>
            );
          })}
        </div>

        {selectedStep && (
          <div className="mt-4 p-4 bg-slate-950/40 rounded-lg border border-slate-850 animate-in slide-in-from-top-2 duration-200">
            <h5 className="text-xs font-semibold text-slate-200 mb-2">Step {selectedStep} Heuristic Insights</h5>
            {filteredFindings.filter(f => f.evidence.toLowerCase().includes(`step ${selectedStep}`)).length === 0 ? (
              <p className="text-xs text-slate-500">No active findings targeting step {selectedStep} for the selected persona profile.</p>
            ) : (
              <div className="space-y-2">
                {filteredFindings.filter(f => f.evidence.toLowerCase().includes(`step ${selectedStep}`)).map((f, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs">
                    <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      f.severity === 'HIGH' || f.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <span className="font-semibold text-slate-300">{f.title}:</span>{' '}
                      <span className="text-slate-400">{f.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Actionable UX Findings & Pattern Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Heuristic Findings column */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-6 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-indigo-400" /> Active Heuristic Findings
          </h4>

          {filteredFindings.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No friction findings detected under this persona filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map(finding => {
                let badgeColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                if (finding.severity === 'MEDIUM') badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                if (finding.severity === 'HIGH' || finding.severity === 'CRITICAL') badgeColor = 'bg-red-500/10 border-red-500/20 text-red-400';

                return (
                  <div key={finding.id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-slate-200 text-sm">{finding.title}</h5>
                        <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{finding.findingType.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{finding.description}</p>
                    <div className="text-[10px] bg-slate-950/50 p-2 rounded border border-slate-900 font-mono text-slate-500">
                      <span className="font-bold text-slate-400">Evidence:</span> {finding.evidence}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pattern Library Recommendations column */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-6 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-400" /> UX Recommendations Timeline
          </h4>

          {recommendations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No recommendations generated. Scan session to run.
            </div>
          ) : (
            <div className="space-y-6">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="p-4 border border-indigo-950/40 bg-indigo-950/5 rounded-xl space-y-3">
                  <h5 className="font-bold text-slate-200 text-sm flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-indigo-400" /> {rec.title}
                  </h5>
                  <div className="text-xs text-slate-400 italic">"{rec.description}"</div>
                  
                  <div className="p-3 bg-slate-950/40 rounded border border-slate-900">
                    <div className="text-[10px] font-bold text-indigo-400 mb-1">WHY IT MATTERS</div>
                    <div className="text-xs text-slate-400">{rec.whyItMatters}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-indigo-400">REMEDY STEPS (UX PATTERN LIBRARY)</div>
                    <div className="space-y-1.5">
                      {rec.remedySteps.map((step, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-400">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
