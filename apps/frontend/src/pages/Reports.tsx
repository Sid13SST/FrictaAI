import { useEffect, useState } from 'react';
import { FileText, Download, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Reports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:3001/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UX Reports</h1>
          <p className="text-foreground/60 mt-1">Detailed analysis of workflow friction and usability issues.</p>
        </div>
        <button className="bg-card hover:bg-card/80 border border-border px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center">
          <Download className="w-4 h-4 mr-2" /> Export All
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Activity className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-xl text-center text-foreground/50">
          No reports generated yet. Run a workflow or test seed script to see data here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-card/50 backdrop-blur-xl border border-border p-6 rounded-xl space-y-4 hover:border-primary/50 transition-all hover:shadow-mint-glow">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold truncate max-w-[200px]" title={report.sessionId}>Session: {report.sessionId.slice(0, 8)}</h3>
                    <p className="text-xs text-foreground/50">{new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold px-2 py-1 rounded-md ${report.score >= 80 ? 'text-emerald-500 bg-emerald-500/10' : report.score >= 60 ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10'}`}>
                  Score: {report.score}
                </span>
              </div>
              
              <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">
                {report.summary}
              </p>
              
              <div className="pt-4 border-t border-border flex justify-end">
                <Link to={`/app/reports/${report.sessionId}`} className="text-sm text-primary hover:underline font-medium">
                  View Full Analysis
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
