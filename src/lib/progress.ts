/** Прогресс по техкарте: отмеченные шаги, собранные продукты, сделанное заранее. Хранится локально. */
import { useMemo } from 'preact/hooks';
import { isObject, isStringArray, persistentStore, readJSON, type Store, useStore } from './store.ts';

export interface PlanProgress {
  /** id выполненных шагов. */
  done: string[];
  /** id собранных продуктов. */
  got: string[];
  /** id выполненных задач «заранее». */
  prep: string[];
  /** Когда нажали «Начать готовку», epoch ms. */
  startedAt: number | null;
}

const EMPTY: PlanProgress = { done: [], got: [], prep: [], startedAt: null };

const isProgress = (v: unknown): v is PlanProgress =>
  isObject(v) &&
  isStringArray(v.done) &&
  isStringArray(v.got) &&
  isStringArray(v.prep) &&
  (v.startedAt === null || typeof v.startedAt === 'number');

const storageKey = (planId: string) => `menu:plan:${planId}:v1`;
const stores = new Map<string, Store<PlanProgress>>();

function planStore(planId: string): Store<PlanProgress> {
  let store = stores.get(planId);
  if (!store) {
    store = persistentStore(storageKey(planId), EMPTY, isProgress);
    stores.set(planId, store);
  }
  return store;
}

/** Прогресс без подписки — для каталога. */
export function peekProgress(planId: string): PlanProgress {
  return stores.get(planId)?.get() ?? readJSON(storageKey(planId), EMPTY, isProgress);
}

type ListKey = 'done' | 'got' | 'prep';

const toggleIn = (list: string[], id: string, on?: boolean) => {
  const has = list.includes(id);
  const want = on ?? !has;
  if (want === has) return list;
  return want ? [...list, id] : list.filter((x) => x !== id);
};

export function usePlanProgress(planId: string) {
  const store = planStore(planId);
  const progress = useStore(store);

  const actions = useMemo(
    () => ({
      toggle(list: ListKey, id: string, on?: boolean) {
        store.set((p) => ({ ...p, [list]: toggleIn(p[list], id, on) }));
      },
      start() {
        store.set((p) => (p.startedAt ? p : { ...p, startedAt: Date.now() }));
      },
      resetSteps() {
        store.set((p) => ({ ...p, done: [], startedAt: null }));
      },
      resetAll() {
        store.set(EMPTY);
      },
    }),
    [store],
  );

  return [progress, actions] as const;
}
