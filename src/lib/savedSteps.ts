/**
 * Отметки шагов, которые хранятся локально: выпечка и партии на заморозку растягиваются
 * на часы и дни (тесто сутки в холодильнике, 4 часа остывания до ларя), и страницу успевают закрыть.
 */
import { useMemo } from 'preact/hooks';
import { persistentStore, type Store, useStore } from './store.ts';

const isIndexList = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => Number.isInteger(x));

const stores = new Map<string, Store<number[]>>();

function stepsStore(key: string): Store<number[]> {
  let store = stores.get(key);
  if (!store) {
    store = persistentStore(key, [], isIndexList);
    stores.set(key, store);
  }
  return store;
}

/** Сквозные номера выполненных шагов под ключом localStorage и действия с ними. */
export function useSavedSteps(key: string) {
  const store = stepsStore(key);
  const list = useStore(store);
  const done = useMemo(() => new Set(list), [list]);
  const actions = useMemo(
    () => ({
      toggle(i: number) {
        store.set((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));
      },
      reset() {
        store.set([]);
      },
    }),
    [store],
  );
  return [done, actions] as const;
}
