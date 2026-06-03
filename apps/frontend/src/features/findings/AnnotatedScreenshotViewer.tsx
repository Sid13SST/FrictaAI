import React, { useState } from 'react';
import { apiFetch, API_BASE } from '../../lib/api';

interface BoundingBox {
  x: number;
  y: number;
  w?: number;
  width?: number;
  h?: number;
  height?: number;
  label: string;
}

interface VisualFinding {
  id: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  boundingBoxes: any; // Could be JSON array of BoundingBox
}

interface AnnotatedScreenshotViewerProps {
  screenshot: {
    id: string;
    filePath: string;
    viewportWidth: number;
    viewportHeight: number;
    metadata?: any;
    pageUrl: string;
  };
  visualFindings: VisualFinding[];
}

export const AnnotatedScreenshotViewer: React.FC<AnnotatedScreenshotViewerProps> = ({
  screenshot,
  visualFindings,
}) => {
  const [hoveredBox, setHoveredBox] = useState<any | null>(null);

  const viewportWidth = screenshot.viewportWidth || 1280;
  const viewportHeight = screenshot.viewportHeight || 720;

  // Flatten bounding boxes from all visual findings
  const boxes: Array<BoundingBox & { parent: VisualFinding }> = [];
  visualFindings.forEach(vf => {
    let bboxList: any[] = [];
    if (Array.isArray(vf.boundingBoxes)) {
      bboxList = vf.boundingBoxes;
    } else if (vf.boundingBoxes && typeof vf.boundingBoxes === 'string') {
      try {
        bboxList = JSON.parse(vf.boundingBoxes);
      } catch (e) {}
    } else if (vf.boundingBoxes && typeof vf.boundingBoxes === 'object') {
      bboxList = [vf.boundingBoxes];
    }

    bboxList.forEach(box => {
      boxes.push({
        x: box.x,
        y: box.y,
        w: box.w || box.width || 0,
        h: box.h || box.height || 0,
        label: box.label || vf.title,
        parent: vf
      });
    });
  });

  // Extract screenshot elements from metadata for secondary overlays
  let pageElements: any[] = [];
  if (screenshot.metadata) {
    let meta = screenshot.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (e) {}
    }
    if (meta && Array.isArray(meta.elements)) {
      pageElements = meta.elements;
    }
  }

  const imageUrl = screenshot.filePath.startsWith('http')
    ? screenshot.filePath
    : `${API_BASE}/workflows/screenshots/raw/${screenshot.filePath}`;

  return (
    <div className="relative border border-[#222226] rounded-xl overflow-hidden bg-[#0d0d0f] flex flex-col items-center">
      {/* Target URL Header */}
      <div className="w-full bg-[#121214] px-4 py-2 text-xs font-mono text-[#a1a1aa] border-b border-[#222226] flex justify-between items-center">
        <span className="truncate max-w-[80%]">{screenshot.pageUrl || 'fricta-agent://browser'}</span>
        <span className="shrink-0 text-[10px] bg-[#222226] px-1.5 py-0.5 rounded text-[#71717a]">
          {viewportWidth}x{viewportHeight}
        </span>
      </div>

      <div className="relative w-full aspect-video select-none">
        {/* The screenshot */}
        <img
          src={imageUrl}
          alt={`Step screenshot`}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Hover details overlay */}
        {hoveredBox && (
          <div 
            className="absolute bottom-4 left-4 right-4 bg-[#121214]/90 backdrop-blur-md border border-[#f43f5e]/45 rounded-lg p-3 z-20 text-xs transition-opacity duration-200"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-white">{hoveredBox.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                hoveredBox.parent.severity.toLowerCase() === 'critical' ? 'bg-red-500/20 text-red-400' :
                hoveredBox.parent.severity.toLowerCase() === 'high' ? 'bg-orange-500/20 text-orange-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {hoveredBox.parent.severity}
              </span>
            </div>
            <p className="text-[#a1a1aa] leading-relaxed">{hoveredBox.parent.description}</p>
          </div>
        )}

        {/* Interactive bounding boxes */}
        {boxes.map((box, idx) => {
          const w = box.w || 0;
          const h = box.h || 0;

          // Convert coordinates to percentages for scaling layout
          const leftPercent = (box.x / viewportWidth) * 100;
          const topPercent = (box.y / viewportHeight) * 100;
          const widthPercent = (w / viewportWidth) * 100;
          const heightPercent = (h / viewportHeight) * 100;

          const isCritical = box.parent.severity.toLowerCase() === 'critical';
          const isHigh = box.parent.severity.toLowerCase() === 'high';

          const colorClass = isCritical 
            ? 'border-red-500 bg-red-500/10 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            : isHigh
              ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
              : 'border-blue-500 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.3)]';

          return (
            <div
              key={`box-${idx}`}
              className={`absolute border-2 rounded transition-all duration-200 cursor-help ${colorClass}`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
              onMouseEnter={() => setHoveredBox(box)}
              onMouseLeave={() => setHoveredBox(null)}
            >
              {/* Box tooltip badge */}
              <div 
                className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold text-white pointer-events-none truncate max-w-[120px] ${
                  isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-blue-500'
                }`}
              >
                {box.label}
              </div>
            </div>
          );
        })}

        {/* Highlight regular elements if hovered */}
        {pageElements.map((el, idx) => {
          if (!el.boundingBox) return null;
          const leftPercent = (el.boundingBox.x / viewportWidth) * 100;
          const topPercent = (el.boundingBox.y / viewportHeight) * 100;
          const widthPercent = (el.boundingBox.width / viewportWidth) * 100;
          const heightPercent = (el.boundingBox.height / viewportHeight) * 100;

          return (
            <div
              key={`element-${idx}`}
              className="absolute border border-white/10 hover:border-white/40 hover:bg-white/5 pointer-events-auto cursor-crosshair rounded group"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
              title={`${el.tagName} | ${el.text || ''}`}
            >
              <div className="absolute hidden group-hover:block -bottom-6 left-0 bg-[#121214] text-white text-[9px] px-1 py-0.5 rounded border border-[#222226] whitespace-nowrap z-30">
                {el.tagName.toLowerCase()} {el.role ? `[role=${el.role}]` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
