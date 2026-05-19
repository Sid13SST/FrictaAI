import React, { useState } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Screenshot {
  path: string;
  timestamp: string;
}

export function ScreenshotViewer({ screenshots }: { screenshots: Screenshot[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 h-96 flex flex-col items-center justify-center">
        <ImageIcon className="w-8 h-8 mb-4 opacity-50" />
        No screenshots captured for this session.
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  };

  const current = screenshots[currentIndex];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-blue-500" /> Session Screenshots
        </h3>
        <div className="text-sm text-slate-400">
          {currentIndex + 1} / {screenshots.length}
        </div>
      </div>
      <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
        {/* Placeholder for actual image since paths might need to be resolved via backend static file serving */}
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
           <img 
             src={`http://localhost:3000${current.path.startsWith('/') ? current.path : `/${current.path}`}`} 
             alt={`Screenshot at ${current.timestamp}`}
             className="max-h-full max-w-full object-contain"
             onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
               (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
             }}
           />
           <div className="hidden flex-col items-center text-slate-500">
             <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
             <span className="text-xs">Image unavailable: {current.path}</span>
           </div>
        </div>

        <button 
          onClick={handlePrev}
          className="absolute left-2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="text-xs text-white">
            Captured at: {new Date(current.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
