import React from 'react';

interface FrictionProgressionGraphProps {
  timeline: any[];
  activeStep: number;
  onStepSelect: (stepIndex: number) => void;
}

export const FrictionProgressionGraph: React.FC<FrictionProgressionGraphProps> = ({
  timeline,
  activeStep,
  onStepSelect,
}) => {
  // Aggregate data points per step
  // Max step count is the highest stepNumber/stepIndex
  const maxStep = Math.max(
    ...timeline.map(e => e.stepIndex),
    0
  );

  const stepData = Array.from({ length: maxStep + 1 }, (_, i) => {
    // Find cognitive signals for this step
    const spikes = timeline.filter(e => e.stepIndex === i && e.eventType === 'COGNITIVE_SPIKE');
    const visualFindings = timeline.filter(e => e.stepIndex === i && e.eventType === 'VISUAL_FINDING');
    const errors = timeline.filter(e => e.stepIndex === i && e.eventType === 'ERROR');

    // Calculate synthetic friction intensity
    let cognitiveIntensity = 0.2; // base cognitive load
    spikes.forEach(s => {
      if (s.metadata?.intensity > cognitiveIntensity) {
        cognitiveIntensity = s.metadata.intensity;
      }
    });

    let clutterIntensity = 0.1;
    visualFindings.forEach(v => {
      const severity = v.metadata?.severity?.toLowerCase();
      if (severity === 'critical') clutterIntensity = Math.max(clutterIntensity, 0.9);
      else if (severity === 'high') clutterIntensity = Math.max(clutterIntensity, 0.7);
      else if (severity === 'medium') clutterIntensity = Math.max(clutterIntensity, 0.5);
      else clutterIntensity = Math.max(clutterIntensity, 0.3);
    });

    if (errors.length > 0) {
      cognitiveIntensity = Math.min(cognitiveIntensity + 0.3, 1.0);
    }

    return {
      step: i,
      cognitive: cognitiveIntensity,
      clutter: clutterIntensity,
      hasError: errors.length > 0
    };
  });

  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // SVG Coordinates calculations
  const getX = (index: number) => {
    if (stepData.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (stepData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - val * chartHeight;
  };

  // Generate path coordinates
  const cognitivePoints = stepData.map((d, idx) => `${getX(idx)},${getY(d.cognitive)}`).join(' ');
  const clutterPoints = stepData.map((d, idx) => `${getX(idx)},${getY(d.clutter)}`).join(' ');

  const cognitivePath = stepData.length > 1 ? `M ${cognitivePoints}` : '';
  const clutterPath = stepData.length > 1 ? `M ${clutterPoints}` : '';

  return (
    <div className="bg-[#121214] border border-[#222226] rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#f4f4f5] tracking-wide">Friction Progression Curve</h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Step-by-step telemetry of cognitive load & visual clutter</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] opacity-80" />
            <span className="text-[#a1a1aa]">Cognitive Strain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] opacity-80" />
            <span className="text-[#a1a1aa]">Visual Clutter</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="mx-auto select-none">
          <defs>
            <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="clutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i * 0.25;
            const y = getY(val);
            return (
              <g key={i} className="opacity-20">
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 4" />
                <text x={padding.left - 10} y={y + 4} fill="#a1a1aa" fontSize={10} textAnchor="end">{`${val * 100}%`}</text>
              </g>
            );
          })}

          {/* Fill Areas */}
          {stepData.length > 1 && (
            <>
              <path
                d={`${cognitivePath} L ${getX(stepData.length - 1)},${getY(0)} L ${getX(0)},${getY(0)} Z`}
                fill="url(#cogGrad)"
              />
              <path
                d={`${clutterPath} L ${getX(stepData.length - 1)},${getY(0)} L ${getX(0)},${getY(0)} Z`}
                fill="url(#clutGrad)"
              />
            </>
          )}

          {/* Draw lines */}
          {cognitivePath && (
            <path d={cognitivePath} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinecap="round" className="opacity-90" />
          )}
          {clutterPath && (
            <path d={clutterPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" className="opacity-80" />
          )}

          {/* Step markers and interactable columns */}
          {stepData.map((d, idx) => {
            const x = getX(idx);
            const isSelected = activeStep === idx;

            return (
              <g key={idx} className="cursor-pointer" onClick={() => onStepSelect(idx)}>
                {/* Interactive background column */}
                <rect
                  x={x - 15}
                  y={padding.top}
                  width={30}
                  height={chartHeight}
                  fill="transparent"
                  className="hover:fill-white/[0.03] transition-colors"
                />

                {/* Vertical hover marker */}
                {isSelected && (
                  <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#f4f4f5" strokeWidth={1} className="opacity-50" />
                )}

                {/* Cognitive Strain Dot */}
                <circle
                  cx={x}
                  cy={getY(d.cognitive)}
                  r={isSelected ? 5 : 3.5}
                  fill={d.hasError ? '#ef4444' : '#f43f5e'}
                  stroke="#121214"
                  strokeWidth={1.5}
                  className="transition-all duration-200"
                />

                {/* Clutter Dot */}
                <circle
                  cx={x}
                  cy={getY(d.clutter)}
                  r={isSelected ? 5 : 3}
                  fill="#3b82f6"
                  stroke="#121214"
                  strokeWidth={1.5}
                  className="transition-all duration-200"
                />

                {/* Step labels */}
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  fill={isSelected ? '#ffffff' : '#a1a1aa'}
                  fontSize={10}
                  textAnchor="middle"
                  fontWeight={isSelected ? '600' : '400'}
                >
                  {`S${idx}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
