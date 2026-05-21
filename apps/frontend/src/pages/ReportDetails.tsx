import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { UnifiedReportViewer } from '../features/reports/UnifiedReportViewer';

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="p-8">
        <Link to="/app/reports" className="text-slate-400 hover:text-white flex items-center mb-6 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl">
          Invalid Session Identifier.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 animate-in fade-in zoom-in-95 duration-300">
      <Link to="/app/reports" className="text-slate-400 hover:text-white flex items-center mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
      </Link>

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#f43f5e]" /> UX Intelligence Console
        </h1>
        <p className="text-xs text-[#a1a1aa] max-w-2xl">
          Unified behavior correlation, discoverability assessment, and automated design friction diagnostics.
        </p>
      </div>

      <UnifiedReportViewer sessionId={id} />
    </div>
  );
}
