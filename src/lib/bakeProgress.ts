/**
 * Отметки шагов выпечки. В отличие от рецепта хранятся локально: выпечка растягивается
 * на часы и дни (юдане с вечера, тесто сутки в холодильнике), и страницу успевают закрыть.
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

/** Сквозные номера выполненных шагов способа и действия с ними. */
export function useBakeSteps(bakeId: string, methodId: string) {
  const store = stepsStore(`menu:bake:${bakeId}:${methodId}:v1`);
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
