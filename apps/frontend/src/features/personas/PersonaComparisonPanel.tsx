import React from 'react';
import { User, ShieldAlert, Sparkles, Sliders } from 'lucide-react';

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
}

export const PersonaComparisonPanel: React.FC<PersonaComparisonPanelProps> = ({
  personaProfiles,
  uxFindings,
}) => {
  // Count how many findings impact each persona
  const getFindingCount = (personaName: string) => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-[#f4f4f5] tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f43f5e]" /> Persona Simulation Modifiers
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Behavioral boundaries modeling different user cohorts passing through this workflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personaProfiles.map((persona, index) => {
          const findingCount = getFindingCount(persona.name);

          return (
            <div 
              key={index}
              className="bg-[#121214] border border-[#222226] hover:border-[#f43f5e]/25 transition-all rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Card top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f43f5e]/30 to-transparent" />

              {/* Title & Desc */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#f43f5e]" /> {persona.name}
                  </span>
                  {findingCount > 0 ? (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 border border-red-500/20 px-1.5 py-0.5 rounded font-medium">
                      <ShieldAlert className="w-3 h-3" /> {findingCount} Issues
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-500/20 px-1.5 py-0.5 rounded font-medium">
                      Clear Path
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed min-h-[48px]">{persona.description}</p>
              </div>

              <hr className="border-[#222226]" />

              {/* Traits */}
              <div className="flex flex-col gap-2">
                <h5 className="text-[10px] text-[#71717a] font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#71717a]" /> Cognitive Traits
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1 text-center bg-[#0d0d0f] rounded py-1.5 border border-[#222226]">
                    <span className="text-[9px] text-[#71717a]">Guidance</span>
                    <span className={`text-[10px] font-mono capitalize rounded px-1 mt-0.5 inline-block mx-2 ${getTraitColor(persona.traits.guidanceDependency)}`}>
                      {persona.traits.guidanceDependency}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-center bg-[#0d0d0f] rounded py-1.5 border border-[#222226]">
                    <span className="text-[9px] text-[#71717a]">Patience</span>
                    <span className={`text-[10px] font-mono capitalize rounded px-1 mt-0.5 inline-block mx-2 ${getTraitColor(persona.traits.patience)}`}>
                      {persona.traits.patience}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-center bg-[#0d0d0f] rounded py-1.5 border border-[#222226]">
                    <span className="text-[9px] text-[#71717a]">IA Comfort</span>
                    <span className={`text-[10px] font-mono capitalize rounded px-1 mt-0.5 inline-block mx-2 ${getTraitColor(persona.traits.comfortWithIA)}`}>
                      {persona.traits.comfortWithIA}
                    </span>
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="bg-[#0d0d0f] rounded-lg p-3 border border-[#222226] text-[11px] flex flex-col gap-2 font-mono">
                <div className="flex justify-between items-center text-[#a1a1aa]">
                  <span>Hesitation Limit:</span>
                  <span className="text-[#f4f4f5]">{persona.behaviorModifiers.idleHesitationThresholdMs / 1000}s</span>
                </div>
                <div className="flex justify-between items-center text-[#a1a1aa]">
                  <span>Loop Cycles Allowed:</span>
                  <span className="text-[#f4f4f5]">{persona.behaviorModifiers.maxActionCyclesAllowed} cycles</span>
                </div>
                <div className="flex justify-between items-center text-[#a1a1aa]">
                  <span>Max Step Budget:</span>
                  <span className="text-[#f4f4f5]">{persona.behaviorModifiers.excessiveStepsThreshold} steps</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
