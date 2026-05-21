import React, { useState, useEffect } from 'react';
import { Download, Clipboard, PlayCircle, ShieldAlert, Sparkles, Code, FileText, Check, Brain } from 'lucide-react';
import { CinematicReplayViewer } from '../replay/CinematicReplayViewer';
import { PersonaComparisonPanel } from '../personas/PersonaComparisonPanel';
import { GlobalInsightEngine } from '../insights/GlobalInsightEngine';
import { CorrelatedTimeline } from '../timeline/CorrelatedTimeline';
import { FrictionProgressionGraph } from '../visuals/FrictionProgressionGraph';

interface UnifiedReportViewerProps {
  sessionId: string;
}

export const UnifiedReportViewer: React.FC<UnifiedReportViewerProps> = ({ sessionId }) => {
  const [activeTab, setActiveTab] = useState<'replay' | 'personas' | 'insights'>('replay');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for unified API responses
  const [reportData, setReportData] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [recommendationsData, setRecommendationsData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchReportData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const backendBase = 'http://127.0.0.1:3001';
      
      // Fetch concurrently
      const [repRes, execRes, expRes, timeRes, recRes] = await Promise.all([
        fetch(`${backendBase}/api/reports/${sessionId}`),
        fetch(`${backendBase}/api/reports/${sessionId}/executive`),
        fetch(`${backendBase}/api/reports/${sessionId}/export`),
        fetch(`${backendBase}/api/reports/${sessionId}/timeline`),
        fetch(`${backendBase}/api/ux/recommendations/${sessionId}`)
      ]);

      if (!repRes.ok) throw new Error('Report dataset not found');

      const rep = await repRes.json();
      const exec = await execRes.json();
      const exp = await expRes.json();
      const time = await timeRes.json();
      const rec = await recRes.json();

      setReportData(rep);
      setExecutiveSummary(exec);
      setExportData(exp);
      setTimelineData(time);
      setRecommendationsData(rec);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflow report analytics.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(true);
  }, [sessionId]);

  const handleRunDiagnostics = async () => {
    setAnalyzing(true);
    try {
      const backendBase = 'http://127.0.0.1:3001';
      const analyzeRes = await fetch(`${backendBase}/api/ux/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!analyzeRes.ok) throw new Error('Analysis run failed');
      
      // Refresh report data without showing global spinner
      await fetchReportData(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to trigger UX diagnostics: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyText = () => {
    if (exportData?.textSheet) {
      navigator.clipboard.writeText(exportData.textSheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      downloadFile(exportData.textSheet, `fricta-pm-summary-${sessionId}.txt`, 'text/plain');
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-4 text-[#a1a1aa]">
        <div className="w-8 h-8 rounded-full border-2 border-t-[#f43f5e] border-r-transparent border-b-[#f43f5e]/20 border-l-transparent animate-spin" />
        <span className="text-xs font-mono">Aggregating UX session intelligence telemetry...</span>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 animate-bounce" />
        <h3 className="text-base font-semibold text-white">Analysis Generation Failed</h3>
        <p className="text-xs text-[#71717a] max-w-[320px]">{error || 'Session report details are missing.'}</p>
      </div>
    );
  }

  const scores = reportData.scores;
  const screenshots = timelineData?.screenshots || [];
  const timeline = timelineData?.timeline || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      {/* Left Sidebar - Executive Overview & Export Tools */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        {/* Grade Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-6 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f43f5e]/40 to-transparent" />
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Executive UX Grade</span>
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#f43f5e]/5 to-[#f43f5e]/20 border-2 border-[#f43f5e]/30 flex items-center justify-center text-3xl font-black text-[#f43f5e] mt-4 shadow-[0_0_24px_rgba(244,63,94,0.15)]">
            {executiveSummary?.overallUXGrade || 'C'}
          </div>
          <div className="text-xl font-bold text-white mt-4">{scores.overallScore}/100</div>
          <p className="text-xs text-[#a1a1aa] mt-1 italic px-4">
            Workflow goal: "{reportData.session.goal || 'Not specified'}"
          </p>
        </div>

        {/* Scores breakdown */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase">Usability Pillars</h4>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#a1a1aa]">Onboarding Smoothness</span>
              <span className="font-mono text-white font-semibold">{scores.onboardingScore}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#a1a1aa]">Layout & Clarity</span>
              <span className="font-mono text-white font-semibold">{scores.clarityScore}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#a1a1aa]">Information Architecture</span>
              <span className="font-mono text-white font-semibold">{scores.iaScore}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#a1a1aa]">Interaction Efficiency</span>
              <span className="font-mono text-white font-semibold">{scores.efficiencyScore}%</span>
            </div>
          </div>
        </div>

        {/* Export Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-1">Export & Share</h4>
          
          <button
            onClick={() => downloadFile(exportData.markdown, `fricta-ux-report-${sessionId}.md`, 'text/markdown')}
            className="w-full py-2.5 px-3 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#222226] text-xs font-medium text-[#f4f4f5] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#f43f5e]" /> Markdown Document
            </span>
            <Download className="w-3.5 h-3.5 text-[#71717a]" />
          </button>

          <button
            onClick={handleCopyText}
            className="w-full py-2.5 px-3 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#222226] text-xs font-medium text-[#f4f4f5] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-purple-400" /> PM Summary Sheet
            </span>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Download className="w-3.5 h-3.5 text-[#71717a]" />}
          </button>

          <button
            onClick={() => downloadFile(exportData.developerJson, `fricta-ux-dump-${sessionId}.json`, 'application/json')}
            className="w-full py-2.5 px-3 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#222226] text-xs font-medium text-[#f4f4f5] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" /> Developer Debug JSON
            </span>
            <Download className="w-3.5 h-3.5 text-[#71717a]" />
          </button>
        </div>
      </div>

      {/* Main Panel Content & Tab Switcher */}
      <div className="xl:col-span-3 flex flex-col gap-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#222226] pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('replay')}
              className={`pb-3 px-4 text-xs font-medium border-b-2 transition-all relative ${
                activeTab === 'replay' 
                  ? 'border-[#f43f5e] text-white' 
                  : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              Timeline Replay
            </button>

            <button
              onClick={() => setActiveTab('personas')}
              className={`pb-3 px-4 text-xs font-medium border-b-2 transition-all relative ${
                activeTab === 'personas' 
                  ? 'border-[#f43f5e] text-white' 
                  : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              Persona Simulations
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-3 px-4 text-xs font-medium border-b-2 transition-all relative ${
                activeTab === 'insights' 
                  ? 'border-[#f43f5e] text-white' 
                  : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              UX Insights & Analytics
            </button>
          </div>

          <button
            onClick={handleRunDiagnostics}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f43f5e] to-[#e11d48] hover:from-[#e11d48] hover:to-[#be123c] text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
          >
            {analyzing ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-white animate-spin" />
                <span>Running Diagnostics...</span>
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5" />
                <span>Run UX Diagnostics</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'replay' && (
          <div className="flex flex-col gap-6">
            <CinematicReplayViewer 
              screenshots={screenshots}
              timeline={timeline}
              visualFindings={reportData.visualFindings}
              activeStep={activeStep}
              setActiveStep={setActiveStep}
            />

            {timeline.length > 0 && (
              <FrictionProgressionGraph 
                timeline={timeline}
                activeStep={activeStep}
                onStepSelect={setActiveStep}
              />
            )}

            {timeline.length > 0 && (
              <CorrelatedTimeline 
                timeline={timeline}
                screenshots={screenshots}
                activeStep={activeStep}
                onStepSelect={setActiveStep}
              />
            )}
          </div>
        )}

        {activeTab === 'personas' && (
          <PersonaComparisonPanel 
            personaProfiles={reportData.personaProfiles}
            uxFindings={reportData.uxFindings}
            cognitiveSignals={reportData.cognitiveSignals}
            recommendations={recommendationsData?.recommendations || []}
            scores={scores}
          />
        )}

        {activeTab === 'insights' && (
          <div className="flex flex-col gap-6">
            <GlobalInsightEngine executiveSummary={executiveSummary} />

            {/* Detailed Findings Checklist */}
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
              <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-4">Detailed UX Findings Checklist</h4>
              {reportData.uxFindings.length === 0 ? (
                <p className="text-xs text-[#71717a] italic">No major UX/usability defects flagged in this workflow.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {reportData.uxFindings.map((finding: any, i: number) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-lg bg-[#0d0d0f] border border-[#222226] flex flex-col gap-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">{finding.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          finding.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          finding.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-[#a1a1aa] leading-relaxed">{finding.description}</p>
                      <div className="bg-[#121214] p-2.5 rounded border border-[#222226] text-[11px] font-mono mt-1 text-[#71717a]">
                        <span className="text-[#a1a1aa] font-semibold">Recommendation:</span> {finding.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
