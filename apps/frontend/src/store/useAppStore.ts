import { create } from 'zustand';

interface AppState {
  user: { id: string; name: string } | null;
  activeProject: string | null;
  setUser: (user: any) => void;
  setActiveProject: (projectId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeProject: null,
  setUser: (user) => set({ user }),
  setActiveProject: (projectId) => set({ activeProject: projectId }),
}));
