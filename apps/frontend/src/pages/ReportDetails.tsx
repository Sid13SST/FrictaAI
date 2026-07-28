import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain } from 'lucide-react';
import { UnifiedReportViewer } from '../features/reports/UnifiedReportViewer';

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="p-8">
        <Link
          to="/app/reports"
          className="flex items-center gap-2 text-xs font-mono mb-6 transition-colors w-fit group"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#7342E2')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Reports
        </Link>
        <div
          className="p-6 rounded-xl text-sm"
          style={{
            background: 'rgba(244,63,94,0.05)',
            border: '1px solid rgba(244,63,94,0.2)',
            color: '#fb7185',
          }}
        >
          Invalid Session Identifier.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 space-y-6">
      {/* ── Back navigation ─────────────────────────────────────────────────── */}
      <Link
        to="/app/reports"
        className="inline-flex items-center gap-2 text-xs font-mono transition-colors w-fit group"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#7342E2')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Reports
      </Link>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-black uppercase tracking-widest font-mono px-2.5 py-0.5 rounded-full"
            style={{ color: '#7342E2', background: 'rgba(115, 66, 226,0.1)', border: '1px solid rgba(115, 66, 226,0.2)' }}
          >
            Intelligence Report
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(115, 66, 226,0.1)', border: '1px solid rgba(115, 66, 226,0.2)' }}
          >
            <Brain className="w-5 h-5" style={{ color: '#7342E2' }} />
          </div>
          UX Intelligence Console
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Unified behavior correlation, discoverability assessment, and automated design friction diagnostics.
        </p>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Session ID: {id}
        </p>
      </div>

      {/* ── Report Viewer ────────────────────────────────────────────────────── */}
      <UnifiedReportViewer sessionId={id} />
    </div>
  );
}
