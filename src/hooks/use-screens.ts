import { useCallback } from 'react';

import { usePersistentState } from '@/hooks/use-persistent-state';
import { deleteImage } from '@/lib/media';
import type { ScreenContent } from '@/lib/types';

export type ScreensApi = {
  screens: ScreenContent[];
  status: 'loading' | 'ready' | 'error';
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  add: (screen: ScreenContent) => void;
  update: (id: string, patch: Partial<ScreenContent>) => void;
  remove: (id: string) => Promise<void>;
  /** The screen the projector shows, or null when the user has none yet. */
  active: ScreenContent | null;
};

/**
 * The saved screens and which one is on the projector. Both live under one hook so the
 * list screen and the projector always agree — the persistence layer keeps screens that
 * share a key in step.
 */
export function useScreens(): ScreensApi {
  const [screens, setScreens, status] = usePersistentState<ScreenContent[]>('screens', []);
  const [activeId, setActiveId] = usePersistentState<string | null>('active-screen', null);

  const add = useCallback(
    (screen: ScreenContent) => {
      setScreens((prev) => [screen, ...prev]);
      setActiveId(screen.id);
    },
    [setScreens, setActiveId],
  );

  const update = useCallback(
    (id: string, patch: Partial<ScreenContent>) => {
      setScreens((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [setScreens],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = screens.find((item) => item.id === id);
      setScreens((prev) => prev.filter((item) => item.id !== id));
      if (activeId === id) setActiveId(null);
      await deleteImage(target?.imageUri ?? null);
    },
    [screens, setScreens, setActiveId, activeId],
  );

  const active = screens.find((item) => item.id === activeId) ?? null;

  return { screens, status, activeId, setActiveId, add, update, remove, active };
}
