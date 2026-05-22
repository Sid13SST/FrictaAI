import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Activity, ArrowRight, Brain, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, Search,
  RefreshCw, Layers
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3001/api';

// ─── Score Ring ───────────────────────────────────────────────────────────────

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color =
    score >= 80 ? '#6366f1' :
    score >= 60 ? '#eab308' :
    score >= 40 ? '#f97316' :
    '#f43f5e';

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="flex-shrink-0">
      {/* Track */}
      <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      {/* Progress */}
      <circle
        cx="34" cy="34" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 34 34)"
        style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Label */}
      <text x="34" y="38" textAnchor="middle" fill={color} fontSize="12" fontWeight="800" fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
};

// ─── Severity Badge ───────────────────────────────────────────────────────────

const severityStyle = (sev: string) => {
  switch (sev) {
    case 'CRITICAL': return { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' };
    case 'HIGH':     return { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)' };
    case 'MEDIUM':   return { color: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' };
    default:         return { color: '#6366f1', bg: 'rgba(99, 102, 241,0.08)', border: 'rgba(99, 102, 241,0.2)' };
  }
};

// ─── Grade helper ─────────────────────────────────────────────────────────────

const gradeFromScore = (score: number) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const Reports = () => {
  const [reports, setReports]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState<'newest' | 'score_high' | 'score_low'>('newest');
  const [filterGrade, setFilterGrade] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'F'>('ALL');

  const fetchReports = () => {
    setLoading(true);
    fetch(`${API_BASE}/reports`)
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const gradeOf = (r: any) => gradeFromScore(r.score ?? 0);

  const filtered = reports
    .filter(r => {
      if (search && !r.sessionId?.toLowerCase().includes(search.toLowerCase()) &&
          !r.summary?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGrade !== 'ALL' && gradeOf(r) !== filterGrade) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score_high') return (b.score ?? 0) - (a.score ?? 0);
      if (sortBy === 'score_low')  return (a.score ?? 0) - (b.score ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Summary stats
  const avgScore   = reports.length ? Math.round(reports.reduce((s, r) => s + (r.score ?? 0), 0) / reports.length) : 0;
  const critical   = reports.filter(r => (r.score ?? 100) < 50).length;
  const excellent  = reports.filter(r => (r.score ?? 0) >= 80).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[9px] font-black uppercase tracking-widest font-mono px-2.5 py-0.5 rounded-full"
              style={{ color: '#6366f1', background: 'rgba(99, 102, 241,0.1)', border: '1px solid rgba(99, 102, 241,0.2)' }}
            >
              Intelligence Reports
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99, 102, 241,0.1)', border: '1px solid rgba(99, 102, 241,0.2)' }}
            >
              <FileText className="w-5 h-5" style={{ color: '#6366f1' }} />
            </div>
            UX Analysis Reports
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Automated friction diagnostics, heuristic findings, and evidence-based improvement paths.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl font-mono uppercase tracking-wider transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────────────────── */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: String(reports.length), icon: Layers,       color: '#6366f1',  glow: 'rgba(99, 102, 241,0.15)'  },
            { label: 'Avg UX Score',  value: `${avgScore}/100`,      icon: TrendingUp,   color: '#6366f1',  glow: 'rgba(99, 102, 241,0.12)'  },
            { label: 'Excellent (A+)',value: String(excellent),       icon: CheckCircle2, color: '#34d399',  glow: 'rgba(52,211,153,0.12)'  },
            { label: 'Critical Issues',value: String(critical),       icon: AlertTriangle,color: '#fb923c',  glow: 'rgba(251,146,60,0.12)'  },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
              style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${stat.glow}, transparent)` }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.glow}`, border: `1px solid ${stat.color}28` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</p>
                <p className="text-xl font-black text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      {reports.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 rounded-xl focus:outline-none transition-all"
              style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(99, 102, 241,0.35)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Grade filter pills */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['ALL', 'A', 'B', 'C', 'D', 'F'] as const).map(g => (
              <button
                key={g}
                onClick={() => setFilterGrade(g)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-wider transition-all"
                style={{
                  background: filterGrade === g ? 'rgba(99, 102, 241,0.12)' : 'transparent',
                  border: filterGrade === g ? '1px solid rgba(99, 102, 241,0.25)' : '1px solid transparent',
                  color: filterGrade === g ? '#6366f1' : 'rgba(255,255,255,0.4)',
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs font-mono text-white px-3 py-2.5 rounded-xl focus:outline-none"
            style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid rgba(255,255,255,0.08)', color: '#fafafa' }}
          >
            <option value="newest">Newest First</option>
            <option value="score_high">Highest Score</option>
            <option value="score_low">Lowest Score</option>
          </select>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Activity className="w-6 h-6 animate-spin" style={{ color: '#6366f1' }} />
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Loading intelligence reports...
          </span>
        </div>

      ) : reports.length === 0 ? (
        <div
          className="rounded-2xl p-16 flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(99, 102, 241,0.2), transparent)' }}
          />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(99, 102, 241,0.08)', border: '1px solid rgba(99, 102, 241,0.18)' }}
          >
            <Brain className="w-8 h-8" style={{ color: '#6366f1' }} />
          </div>
          <h3 className="text-white font-bold text-lg">No Reports Yet</h3>
          <p className="text-sm mt-2 max-w-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Run a workflow audit to generate your first intelligence report. Results appear here automatically.
          </p>
          <Link
            to="/app/workflow"
            className="mt-6 flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl font-mono uppercase tracking-wider"
            style={{ background: '#6366f1', color: '#070b0a' }}
          >
            Run First Audit <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No reports match your current filters.</p>
        </div>

      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((report) => {
            const grade = gradeOf(report);
            const sev = report.score >= 80 ? 'LOW' : report.score >= 60 ? 'MEDIUM' : report.score >= 40 ? 'HIGH' : 'CRITICAL';
            const sevStyle = severityStyle(sev);
            const date = new Date(report.createdAt);
            const timeAgo = (() => {
              const diff = Date.now() - date.getTime();
              const h = Math.floor(diff / 3600000);
              const d = Math.floor(h / 24);
              if (d > 0) return `${d}d ago`;
              if (h > 0) return `${h}h ago`;
              return 'Just now';
            })();

            return (
              <div
                key={report.id}
                className="group rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden transition-all duration-300"
                style={{
                  background: 'rgba(9,9,11,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(99, 102, 241,0.2)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(99, 102, 241,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Top mint edge */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(to right, transparent, rgba(99, 102, 241,0.18), transparent)' }}
                />

                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <ScoreRing score={report.score ?? 0} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full font-black font-mono uppercase tracking-wider"
                          style={{ background: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}` }}
                        >
                          {sev}
                        </span>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full font-black font-mono uppercase"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          Grade {grade}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">
                        Session <span className="font-mono text-[#6366f1]">{report.sessionId?.slice(0, 8) ?? '—'}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {timeAgo} · {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score bar breakdown */}
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Overall UX',   val: report.score ?? 0 },
                  ].map(bar => {
                    const barColor = bar.val >= 80 ? '#6366f1' : bar.val >= 60 ? '#eab308' : bar.val >= 40 ? '#f97316' : '#f43f5e';
                    return (
                      <div key={bar.label} className="flex items-center gap-3">
                        <span className="text-[10px] w-24 flex-shrink-0 font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{bar.label}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${bar.val}%`, background: barColor, boxShadow: `0 0 6px ${barColor}60` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: barColor }}>{bar.val}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                {report.summary && (
                  <p
                    className="text-xs leading-relaxed line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {report.summary}
                  </p>
                )}

                {/* Footer CTA */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {report.uxFindingsCount ?? '—'} findings compiled
                    </span>
                  </div>
                  <Link
                    to={`/app/reports/${report.sessionId}`}
                    className="flex items-center gap-1.5 text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: 'rgba(99, 102, 241,0.08)',
                      border: '1px solid rgba(99, 102, 241,0.2)',
                      color: '#6366f1',
                    }}
                  >
                    View Analysis <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
