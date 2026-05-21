import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, Brain } from 'lucide-react';
import { UXScoreCards } from '../components/reports/UXScoreCards';
import { FrictionTimeline } from '../components/reports/FrictionTimeline';
import { SessionReplayTimeline } from '../components/reports/SessionReplayTimeline';
import { VisualReplayViewer } from '../components/reports/VisualReplayViewer';
import { RecommendationCards } from '../components/reports/RecommendationCards';
import { WorkflowGraph } from '../components/reports/WorkflowGraph';
import { UXIntelligenceTab } from '../components/reports/UXIntelligenceTab';

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REPLAY' | 'UX_HEURISTICS'>('REPLAY');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [reportRes, timelineRes] = await Promise.all([
        fetch(`http://127.0.0.1:3001/api/reports/${id}`),
        fetch(`http://127.0.0.1:3001/api/reports/${id}/timeline`)
      ]);
      const reportData = await reportRes.json();
      const timelineData = await timelineRes.json();
      
      setData(reportData);
      setTimeline(timelineData.timeline);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="p-8">
        <Link to="/app/reports" className="text-blue-500 flex items-center mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl">
          Report not found or an error occurred.
        </div>
      </div>
    );
  }

  const { report, scores, signals, recommendations, session } = data;

  // Combine actions and thoughts for replay timeline
  const combinedEvents = [
    ...(timeline?.actions?.map((a: any) => ({
      type: 'action' as const,
      content: a.action,
      target: a.target,
      status: a.status,
      timestamp: a.timestamp
    })) || []),
    ...(timeline?.thoughts?.map((t: any) => ({
      type: 'thought' as const,
      content: t.thought,
      timestamp: t.timestamp
    })) || [])
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="max-w-7xl mx-auto p-8 animate-in fade-in zoom-in-95 duration-300">
      <Link to="/app/reports" className="text-slate-400 hover:text-white flex items-center mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-500" /> UX Intelligence Report
          </h1>
          <p className="text-slate-400 max-w-2xl">
            {report?.summary || 'No summary available.'}
          </p>
          <div className="mt-4 flex items-center space-x-4 text-sm text-slate-500">
            <span className="px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
              Session ID: <span className="font-mono">{session?.id.slice(0,8)}</span>
            </span>
            {session?.goal && (
              <span className="px-3 py-1 bg-slate-900 rounded-full border border-slate-800 truncate max-w-xs">
                Goal: {session.goal}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={fetchReport}
          className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
        </button>
      </div>

      <UXScoreCards scores={scores || { overallScore: 0, clarityScore: 0, efficiencyScore: 0, smoothnessScore: 0 }} />

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 mb-8 space-x-8">
        <button 
          onClick={() => setActiveTab('REPLAY')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'REPLAY' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Session Replay
        </button>
        <button 
          onClick={() => setActiveTab('UX_HEURISTICS')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center ${
            activeTab === 'UX_HEURISTICS' ? 'border-indigo-500 text-white animate-pulse' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain className="w-4 h-4 mr-2" /> UX Heuristics Engine
        </button>
      </div>

      {activeTab === 'REPLAY' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-4 text-slate-200">Actionable UX Recommendations</h2>
                <RecommendationCards recommendations={recommendations || []} />
              </section>

              <section>
                <FrictionTimeline signals={signals || []} />
              </section>
            </div>

            <div className="space-y-8">
              <WorkflowGraph actions={timeline?.actions || []} />
              <SessionReplayTimeline events={combinedEvents} />
            </div>
          </div>

          {session && (
            <section className="mt-8">
              <VisualReplayViewer sessionId={session.id} />
            </section>
          )}
        </>
      ) : (
        session && <UXIntelligenceTab sessionId={session.id} />
      )}
    </div>
  );
}
