import { create } from 'zustand';
import { describeError } from './errors';

/**
 * The single toast helper for the app. Every user-visible failure that isn't
 * rendered inline goes through `toast.error(err)`, which runs the value
 * through `describeError` so the copy is always human-readable.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>, durationMs: number) => number;
  dismiss: (id: number) => void;
}

const MAX_VISIBLE = 4;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, durationMs) => {
    // Polling views can fail every few seconds — don't stack identical toasts.
    const dup = get().toasts.find(x => x.tone === t.tone && x.title === t.title && x.message === t.message);
    if (dup) return dup.id;

    const id = nextId++;
    set(s => ({ toasts: [...s.toasts, { ...t, id }].slice(-MAX_VISIBLE) }));
    if (durationMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), durationMs);
    }
    return id;
  },
  dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ tone: 'success', title, message }, 4000),

  info: (title: string, message?: string) =>
    useToastStore.getState().push({ tone: 'info', title, message }, 5000),

  /**
   * @param err    Anything thrown from a fetch path (ApiError, Error, Response-derived...).
   * @param action What the user was trying to do, e.g. "delete this project".
   */
  error: (err: unknown, action?: string) => {
    const { title, message } = describeError(err, action);
    return useToastStore.getState().push({ tone: 'error', title, message }, 7000);
  },

  dismiss: (id: number) => useToastStore.getState().dismiss(id),
};
