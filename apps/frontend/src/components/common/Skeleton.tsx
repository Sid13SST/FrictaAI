import type { CSSProperties } from 'react';

/**
 * Skeleton primitives. Every data-fetching view composes these while its first
 * request is in flight so the layout is visible immediately and nothing looks
 * blank or frozen. The shimmer keyframes live in index.css (`.skeleton`).
 */

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** A single shimmering block. Size it with Tailwind classes. */
export const Skeleton = ({ className = '', style }: SkeletonProps) => (
  <div className={`skeleton rounded-lg ${className}`} style={style} aria-hidden="true" />
);

/** Wrapper that announces loading to assistive tech once, not per block. */
export const SkeletonGroup = ({
  label = 'Loading',
  className = '',
  children,
}: { label?: string; className?: string; children: React.ReactNode }) => (
  <div role="status" aria-busy="true" aria-label={label} className={className}>
    {children}
    <span className="sr-only">{label}…</span>
  </div>
);

const surface: CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
};

export const SkeletonStatCard = () => (
  <div className="rounded-2xl p-5" style={surface}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-2.5 w-20 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-14" />
    <Skeleton className="h-2 w-24 rounded-full mt-3" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    <div className="flex-1 min-w-0">
      <Skeleton className="h-3 w-3/5 max-w-[240px] rounded-full" />
      <Skeleton className="h-2 w-2/5 max-w-[150px] rounded-full mt-2" />
    </div>
    <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
  </div>
);

export const SkeletonRows = ({ count = 4 }: { count?: number }) => (
  <div>
    {Array.from({ length: count }, (_, i) => <SkeletonRow key={i} />)}
  </div>
);

/** Generic content card: icon tile, two text lines, footer line. */
export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-2xl p-5 ${className}`} style={surface}>
    <Skeleton className="h-10 w-10 rounded-xl mb-4" />
    <Skeleton className="h-3 w-2/3 rounded-full" />
    <Skeleton className="h-2.5 w-1/2 rounded-full mt-2.5" />
    <Skeleton className="h-2 w-1/3 rounded-full mt-5" />
  </div>
);

export const SkeletonPageHeader = () => (
  <div>
    <Skeleton className="h-8 w-44 rounded-xl" />
    <Skeleton className="h-3 w-64 max-w-full rounded-full mt-3" />
  </div>
);
