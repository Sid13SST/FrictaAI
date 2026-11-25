const STATUS: Record<string, { bg: string; color: string; dot: string; label: string; live?: boolean }> = {
  RUNNING:       { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', dot: '#f59e0b', label: 'Running', live: true },
  PENDING:       { bg: 'rgba(115,66,226,0.1)',  color: '#9B72FA', dot: '#7342E2', label: 'Queued',  live: true },
  QUEUED:        { bg: 'rgba(115,66,226,0.1)',  color: '#9B72FA', dot: '#7342E2', label: 'Queued',  live: true },
  COMPLETED:     { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', dot: '#10b981', label: 'Done' },
  FAILED:        { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', dot: '#ef4444', label: 'Failed' },
  TIMEOUT:       { bg: 'rgba(249,115,22,0.1)',  color: '#fb923c', dot: '#f97316', label: 'Timed out' },
  LOOP_DETECTED: { bg: 'rgba(234,179,8,0.1)',   color: '#facc15', dot: '#eab308', label: 'Stopped' },
  CANCELLED:     { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', dot: '#94a3b8', label: 'Cancelled' },
};

export const isActiveAuditStatus = (status: string) => !!STATUS[status]?.live;

/** Status pill for an audit (workflow session). Active states pulse. */
export const AuditStatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS[status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', dot: '#555', label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.live ? 'animate-pulse' : ''}`}
        style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80` }}
      />
      {cfg.label}
    </span>
  );
};
