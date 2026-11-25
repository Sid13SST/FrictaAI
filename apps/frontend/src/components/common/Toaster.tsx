import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '../../lib/toast';

const TONE: Record<ToastTone, { color: string; border: string; glow: string; Icon: typeof Info }> = {
  success: { color: '#34d399', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.12)', Icon: CheckCircle2 },
  error:   { color: '#fb7185', border: 'rgba(244,63,94,0.3)',  glow: 'rgba(244,63,94,0.12)',  Icon: AlertTriangle },
  info:    { color: '#9B72FA', border: 'rgba(115,66,226,0.35)', glow: 'rgba(115,66,226,0.14)', Icon: Info },
};

/** Renders the toast stack. Mounted once, at the app root. */
export const Toaster = () => {
  const toasts = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  return (
    <div
      className="fixed z-[100] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 flex flex-col gap-2.5 sm:w-[360px] pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const tone = TONE[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5"
              style={{
                background: `radial-gradient(circle at top left, ${tone.glow}, transparent 60%), rgba(13,13,15,0.96)`,
                border: `1px solid ${tone.border}`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <tone.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tone.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-snug break-words">{t.title}</p>
                {t.message && (
                  <p className="text-xs mt-1 leading-relaxed break-words" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 w-6 h-6 -mr-1 -mt-0.5 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
