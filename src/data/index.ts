/**
 * Данные сайта. JSON из data/ попадает в бандл на этапе сборки и к этому моменту
 * уже проверен Vite-плагином (scripts/vite-plugin-menu-data.ts), поэтому здесь
 * только типизированный доступ.
 */
import type { CookPlan } from '../types/cook-plan.gen.ts';
import type { Kitchen } from '../types/kitchen.gen.ts';
import type { Recipe } from '../types/recipe.gen.ts';
import type { Bake } from '../types/bake.gen.ts';
import type { Baking } from '../types/baking.gen.ts';
import { typograph } from '../lib/format.ts';

const collator = new Intl.Collator('ru');

const recipeModules = import.meta.glob<Recipe>('/data/recipes/*.json', { eager: true, import: 'default' });
const planModules = import.meta.glob<CookPlan>('/data/plans/*.json', { eager: true, import: 'default' });
const bakeModules = import.meta.glob<Bake>('/data/bakes/*.json', { eager: true, import: 'default' });

/** Ключи, значения которых сравниваются как есть (идентификаторы, теги в URL). */
const RAW_KEYS = new Set(['id', 'tags', 'date', 'start', 'url', 'method', '$schema']);

/** Применяет typograph ко всем текстам документа. */
function polish<T>(value: T): T {
  if (typeof value === 'string') return typograph(value) as T;
  if (Array.isArray(value)) return value.map(polish) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, RAW_KEYS.has(k) ? v : polish(v)])) as T;
  }
  return value;
}

export const recipes: Recipe[] = Object.values(recipeModules)
  .map(polish)
  .sort((a, b) => collator.compare(a.title, b.title));

/** В порядке файлов в data/plans — без сортировки. */
export const plans: CookPlan[] = Object.entries(planModules)
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([, plan]) => polish(plan));

const kitchenModules = import.meta.glob<Kitchen>('/data/kitchen.json', { eager: true, import: 'default' });

/** Справочник кухни (data/kitchen.json) — для составления техкарт. */
export const kitchen: Kitchen | null = Object.values(kitchenModules).map(polish)[0] ?? null;

/** Рецептуры выпечки по названию; по группам их раскладывает страница. */
export const bakes: Bake[] = Object.values(bakeModules)
  .map(polish)
  .sort((a, b) => collator.compare(a.title, b.title));

const bakingModules = import.meta.glob<Baking>('/data/baking.json', { eager: true, import: 'default' });

/** Справочник выпечки (data/baking.json): руководства, что купить, идеи. */
export const baking: Baking | null = Object.values(bakingModules).map(polish)[0] ?? null;

const recipeById = new Map(recipes.map((r) => [r.id, r]));
const planById = new Map(plans.map((p) => [p.id, p]));
const bakeById = new Map(bakes.map((b) => [b.id, b]));

export const getRecipe = (id: string) => recipeById.get(id);
export const getPlan = (id: string) => planById.get(id);
export const getBake = (id: string) => bakeById.get(id);
