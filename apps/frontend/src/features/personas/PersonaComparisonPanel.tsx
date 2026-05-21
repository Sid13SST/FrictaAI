import React, { useState } from 'react';
import { User, ShieldAlert, Sparkles, Sliders, Brain, Gauge, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface PersonaProfile {
  id?: string;
  name: string;
  description: string;
  traits: {
    guidanceDependency: 'low' | 'medium' | 'high';
    patience: 'low' | 'medium' | 'high';
    comfortWithIA: 'low' | 'medium' | 'high';
  };
  behaviorModifiers: {
    idleHesitationThresholdMs: number;
    maxActionCyclesAllowed: number;
    excessiveStepsThreshold: number;
  };
}

interface PersonaComparisonPanelProps {
  personaProfiles: PersonaProfile[];
  uxFindings: any[];
  cognitiveSignals?: any[];
  recommendations?: any[];
  scores?: any;
}

export const PersonaComparisonPanel: React.FC<PersonaComparisonPanelProps> = ({
  personaProfiles,
  uxFindings,
  cognitiveSignals = [],
  recommendations = [],
  scores,
}) => {
  const [activePersona, setActivePersona] = useState<string>('Standard Explorer');
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Standard Aggregated profile definition
  const standardProfile: PersonaProfile = {
    name: "Standard Explorer",
    description: "Aggregate metrics representing standard user behaviors, patience thresholds, and interaction models.",
    traits: {
      guidanceDependency: 'medium',
      patience: 'medium',
      comfortWithIA: 'medium'
    },
    behaviorModifiers: {
      idleHesitationThresholdMs: 15000,
      maxActionCyclesAllowed: 3,
      excessiveStepsThreshold: 12
    }
  };

  const allProfiles = [standardProfile, ...personaProfiles];

  // Count how many findings impact each persona
  const getFindingCount = (personaName: string) => {
    if (personaName === 'Standard Explorer') {
      return uxFindings.length;
    }
    const normName = personaName.toUpperCase();
    return uxFindings.filter(f => {
      const pType = f.personaType?.toUpperCase();
      if (normName.includes('BEGINNER') && pType === 'BEGINNER') return true;
      if (normName.includes('POWER') && pType === 'POWER_USER') return true;
      if (normName.includes('FIRST') && pType === 'FIRST_TIME_USER') return true;
      if (normName.includes('STANDARD') && pType === 'STANDARD') return true;
      return false;
    }).length;
  };

  const getTraitColor = (val: 'low' | 'medium' | 'high') => {
    if (val === 'high') return 'text-red-400 bg-red-400/10 border border-red-500/20';
    if (val === 'medium') return 'text-yellow-400 bg-yellow-400/10 border border-yellow-500/20';
    return 'text-green-400 bg-green-400/10 border border-green-500/20';
  };

  // Dynamic simulated scores
  const getSimulatedScores = (name: string) => {
    const norm = name.toLowerCase();
    let clarity = scores?.clarityScore ?? 80;
    let onboarding = scores?.onboardingScore ?? 80;
    let ia = scores?.iaScore ?? 80;
    let efficiency = scores?.efficiencyScore ?? 80;

    if (norm.includes('beginner')) {
      clarity = 72;
      onboarding = 68;
      ia = 80;
      efficiency = 88;
    } else if (norm.includes('power')) {
      clarity = 90;
      onboarding = 92;
      ia = 86;
      efficiency = 58;
    } else if (norm.includes('first')) {
      clarity = 82;
      onboarding = 62;
      ia = 54;
      efficiency = 80;
    }

    const overall = Math.round((clarity + onboarding + ia + efficiency) / 4);
    return { clarity, onboarding, ia, efficiency, overall };
  };

  const currentScores = getSimulatedScores(activePersona);

  // Filter findings based on selected persona
  const filteredFindings = uxFindings.filter(f => {
    if (activePersona === 'Standard Explorer') return true;
    const normActive = activePersona.toLowerCase();
    const normFinding = f.personaType?.toLowerCase() || '';
    if (normActive.includes('beginner') && normFinding.includes('beginner')) return true;
    if (normActive.includes('power') && normFinding.includes('power')) return true;
    if (normActive.includes('first') && normFinding.includes('first')) return true;
    if (normFinding === 'standard' || normFinding === '') return true;
    return false;
  });

  // Filter recommendations based on active findings
  const filteredRecs = recommendations.filter(rec => 
    filteredFindings.some(f => f.title === rec.title)
  );

  // Fallback to top recommendations if filtered ones are empty to provide content
  const displayRecs = filteredRecs.length > 0 ? filteredRecs : recommendations.slice(0, 3);

  // Create Step Heatmap based on cognitive load
  const stepCount = Math.max(5, Math.max(...uxFindings.map(f => {
    const match = f.evidence?.match(/step (\d+)/i);
    return match ? parseInt(match[1]) : 1;
  }), cognitiveSignals?.length || 0));

  const getStepFriction = (step: number) => {
    let intensity = 0.15;
    filteredFindings.forEach(f => {
      if (f.evidence?.toLowerCase().includes(`step ${step}`)) {
        if (f.severity === 'LOW') intensity += 0.15;
        if (f.severity === 'MEDIUM') intensity += 0.3;
        if (f.severity === 'HIGH') intensity += 0.55;
        if (f.severity === 'CRITICAL') intensity += 0.75;
      }
    });
    return Math.min(1.0, intensity);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* 1. Selector Cards */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#f4f4f5] tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f43f5e]" /> Persona Simulation Modifiers
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Select a cohort card to project dynamic scores and view friction overlays.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allProfiles.map((persona, index) => {
            const findingCount = getFindingCount(persona.name);
            const isSelected = activePersona === persona.name;

            return (
              <button 
                key={index}
                onClick={() => {
                  setActivePersona(persona.name);
                  setSelectedStep(null);
                }}
                className={`text-left border transition-all duration-300 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#1a1315] border-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : 'bg-[#121214] border-[#222226] hover:border-[#222226]/80'
                }`}
              >
                {/* Selected highlight line */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#f43f5e]" />
                )}

                {/* Title & Issue count */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <User className={`w-3.5 h-3.5 ${isSelected ? 'text-[#f43f5e]' : 'text-slate-400'}`} /> {persona.name}
                    </span>
                    {findingCount > 0 ? (
                      <span className="flex items-center gap-1 text-[9px] text-red-400 bg-red-400/10 border border-red-500/20 px-1.5 py-0.5 rounded font-medium">
                        <ShieldAlert className="w-2.5 h-2.5" /> {findingCount} Issues
                      </span>
                    ) : (
                      <span className="text-[9px] text-green-400 bg-green-400/10 border border-green-500/20 px-1.5 py-0.5 rounded font-medium">
                        Clear Path
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#a1a1aa] leading-relaxed min-h-[48px]">{persona.description}</p>
                </div>

                <hr className="border-[#222226]" />

                {/* Traits */}
                <div className="flex flex-col gap-2">
                  <h5 className="text-[9px] text-[#71717a] font-bold tracking-wider uppercase flex items-center gap-1">
                    <Sliders className="w-2.5 h-2.5 text-[#71717a]" /> Cognitive Traits
                  </h5>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="flex flex-col gap-0.5 text-center bg-[#0d0d0f] rounded py-1 border border-[#222226]">
                      <span className="text-[8px] text-[#71717a]">Guidance</span>
                      <span className={`text-[8px] font-mono capitalize rounded px-0.5 mt-0.5 inline-block mx-1 ${getTraitColor(persona.traits.guidanceDependency)}`}>
                        {persona.traits.guidanceDependency}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-center bg-[#0d0d0f] rounded py-1 border border-[#222226]">
                      <span className="text-[8px] text-[#71717a]">Patience</span>
                      <span className={`text-[8px] font-mono capitalize rounded px-0.5 mt-0.5 inline-block mx-1 ${getTraitColor(persona.traits.patience)}`}>
                        {persona.traits.patience}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-center bg-[#0d0d0f] rounded py-1 border border-[#222226]">
                      <span className="text-[8px] text-[#71717a]">IA Comfort</span>
                      <span className={`text-[8px] font-mono capitalize rounded px-0.5 mt-0.5 inline-block mx-1 ${getTraitColor(persona.traits.comfortWithIA)}`}>
                        {persona.traits.comfortWithIA}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modifiers */}
                <div className="bg-[#0d0d0f] rounded-lg p-2.5 border border-[#222226] text-[10px] flex flex-col gap-1.5 font-mono">
                  <div className="flex justify-between items-center text-[#a1a1aa]">
                    <span>Hesitation Limit:</span>
                    <span className="text-white">{persona.behaviorModifiers.idleHesitationThresholdMs / 1000}s</span>
                  </div>
                  <div className="flex justify-between items-center text-[#a1a1aa]">
                    <span>Loop Cycles:</span>
                    <span className="text-white">{persona.behaviorModifiers.maxActionCyclesAllowed} max</span>
                  </div>
                  <div className="flex justify-between items-center text-[#a1a1aa]">
                    <span>Max Step Budget:</span>
                    <span className="text-white">{persona.behaviorModifiers.excessiveStepsThreshold} steps</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Simulated Score & Cognitive Load Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simulated Score gauges */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-4 flex items-center">
              <Gauge className="w-4 h-4 mr-2 text-[#f43f5e]" /> Projected Usability Scores
            </h4>
            
            <div className="flex items-center gap-5 mb-5">
              <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="currentColor" className="text-[#222226]" strokeWidth="5" fill="transparent" />
                  <circle cx="40" cy="40" r="34" stroke="currentColor" className="text-[#f43f5e]" strokeWidth="5" fill="transparent"
                    strokeDasharray={213.6}
                    strokeDashoffset={213.6 - (213.6 * currentScores.overall) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-lg font-black text-white">{currentScores.overall}</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Cohort Aggregate</div>
                <p className="text-[10px] text-[#a1a1aa] mt-0.5 leading-relaxed">
                  Projected task completion metrics adjusted for {activePersona} patience boundaries.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-medium text-[#a1a1aa] mb-1">
                  <span>Visual Clarity</span>
                  <span className="text-white font-mono">{currentScores.clarity}%</span>
                </div>
                <div className="w-full bg-[#0d0d0f] h-1.5 rounded-full overflow-hidden border border-[#222226]">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${currentScores.clarity}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-[#a1a1aa] mb-1">
                  <span>Guided Onboarding</span>
                  <span className="text-white font-mono">{currentScores.onboarding}%</span>
                </div>
                <div className="w-full bg-[#0d0d0f] h-1.5 rounded-full overflow-hidden border border-[#222226]">
                  <div className="bg-[#f43f5e] h-full rounded-full" style={{ width: `${currentScores.onboarding}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-[#a1a1aa] mb-1">
                  <span>Information Architecture</span>
                  <span className="text-white font-mono">{currentScores.ia}%</span>
                </div>
                <div className="w-full bg-[#0d0d0f] h-1.5 rounded-full overflow-hidden border border-[#222226]">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${currentScores.ia}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-[#a1a1aa] mb-1">
                  <span>Interaction Efficiency</span>
                  <span className="text-white font-mono">{currentScores.efficiency}%</span>
                </div>
                <div className="w-full bg-[#0d0d0f] h-1.5 rounded-full overflow-hidden border border-[#222226]">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${currentScores.efficiency}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cognitive load profile */}
        <div className="lg:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-4 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-[#f43f5e]" /> Cognitive Load Telemetry
            </h4>

            {cognitiveSignals.length === 0 ? (
              <div className="py-8 text-center text-[#71717a] text-xs">
                No active cognitive signals compiled. Click Run Diagnostics above to populate data.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cognitiveSignals.map((signal, idx) => {
                  const label = signal.signalType.replace(/_/g, ' ');
                  const intensity = signal.intensity;
                  let barColor = 'bg-emerald-500';
                  let textWeight = 'Optimal';
                  if (intensity > 0.4) {
                    barColor = 'bg-amber-500';
                    textWeight = 'Slight Friction';
                  }
                  if (intensity > 0.7) {
                    barColor = 'bg-[#f43f5e]';
                    textWeight = 'Overload Warning';
                  }

                  return (
                    <div key={signal.id || idx} className="p-3 bg-[#0d0d0f] border border-[#222226] rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-slate-300 font-mono">{label}</span>
                        <span className="text-[10px] font-bold text-[#a1a1aa]">{(intensity * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-[#121214] h-2 rounded-full overflow-hidden mb-2 border border-[#222226]">
                        <div className={`${barColor} h-full rounded-full`} style={{ width: `${intensity * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-[#71717a]">
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
            )}
          </div>
        </div>
      </div>

      {/* 3. Horizontal Step Heatmap Timeline */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[#f43f5e]" /> Friction Heatmap Timeline
          </h4>
          <div className="flex items-center gap-4 text-[9px] text-[#71717a] font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Friction</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Critical Friction</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center mb-4">
          {Array.from({ length: stepCount }).map((_, i) => {
            const step = i + 1;
            const friction = getStepFriction(step);
            
            let color = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
            if (friction > 0.3) {
              color = 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20';
            }
            if (friction > 0.6) {
              color = 'bg-[#f43f5e]/10 border-[#f43f5e]/20 text-[#f43f5e] hover:bg-[#f43f5e]/20';
            }

            const isActive = selectedStep === step;

            return (
              <button
                key={step}
                onClick={() => setSelectedStep(isActive ? null : step)}
                className={`flex-1 min-w-[75px] py-2.5 rounded-lg border text-center transition-all duration-300 flex flex-col justify-between items-center cursor-pointer ${color} ${
                  isActive ? 'ring-1 ring-[#f43f5e] shadow-[0_0_10px_rgba(244,63,94,0.2)] bg-[#1a1315]' : ''
                }`}
              >
                <span className="text-[9px] text-[#71717a] font-bold mb-0.5">STEP {step}</span>
                <span className="text-xs font-bold font-mono">{(friction * 100).toFixed(0)}%</span>
                <span className="text-[8px] mt-0.5 font-mono text-[#71717a]">
                  {friction > 0.6 ? 'Critical' : friction > 0.3 ? 'Warning' : 'Good'}
                </span>
              </button>
            );
          })}
        </div>

        {selectedStep && (
          <div className="p-4 bg-[#0d0d0f] rounded-lg border border-[#222226] animate-in slide-in-from-top-2 duration-200">
            <h5 className="text-xs font-semibold text-white mb-2">Step {selectedStep} Heuristic Insights</h5>
            {filteredFindings.filter(f => f.evidence?.toLowerCase().includes(`step ${selectedStep}`)).length === 0 ? (
              <p className="text-xs text-[#71717a] italic">No active findings targeting step {selectedStep} for the selected persona profile.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredFindings.filter(f => f.evidence?.toLowerCase().includes(`step ${selectedStep}`)).map((f, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      f.severity === 'HIGH' || f.severity === 'CRITICAL' ? 'text-[#f43f5e]' : 'text-amber-500'
                    }`} />
                    <div>
                      <span className="font-semibold text-white">{f.title}:</span>{' '}
                      <span className="text-[#a1a1aa]">{f.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Actionable UX Findings & Pattern Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Heuristic Findings column */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f43f5e]" /> Active Heuristic Findings
          </h4>

          {filteredFindings.length === 0 ? (
            <div className="py-12 text-center text-[#71717a] text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No friction findings detected under this persona filter.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredFindings.map((finding, idx) => {
                let badgeColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                if (finding.severity === 'MEDIUM') badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                if (finding.severity === 'HIGH' || finding.severity === 'CRITICAL') badgeColor = 'bg-red-500/10 border-red-500/20 text-red-400';

                return (
                  <div key={finding.id || idx} className="p-4 bg-[#0d0d0f] border border-[#222226] rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-white text-xs">{finding.title}</h5>
                        <div className="text-[10px] text-[#f43f5e] font-mono mt-0.5">{finding.findingType?.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">{finding.description}</p>
                    {finding.evidence && (
                      <div className="text-[10px] bg-[#121214] p-2.5 rounded border border-[#222226] font-mono text-slate-500">
                        <span className="font-bold text-[#a1a1aa]">Evidence:</span> {finding.evidence}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pattern Library Recommendations column */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#f43f5e]" /> Pattern Recommendations Checklist
          </h4>

          {displayRecs.length === 0 ? (
            <div className="py-12 text-center text-[#71717a] text-xs">
              No recommendations generated. Run diagnostics above to compile.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {displayRecs.map((rec, i) => (
                <div key={i} className="p-4 border border-[#f43f5e]/10 bg-[#f43f5e]/5 rounded-xl flex flex-col gap-3">
                  <h5 className="font-bold text-white text-xs flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-[#f43f5e]" /> {rec.title}
                  </h5>
                  <div className="text-xs text-[#a1a1aa] italic">"{rec.description}"</div>
                  
                  <div className="p-3 bg-[#0d0d0f] rounded border border-[#222226]">
                    <div className="text-[10px] font-bold text-[#f43f5e] mb-1">WHY IT MATTERS</div>
                    <div className="text-xs text-[#a1a1aa]">{rec.whyItMatters}</div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-[#f43f5e]">REMEDY STEPS (UX PATTERN LIBRARY)</div>
                    <div className="flex flex-col gap-2">
                      {rec.remedySteps?.map((step: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-400 shrink-0" />
                          <span className="text-[#a1a1aa]">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
