/** Фильтры каталога рецептов. Состояние живёт в query-параметрах URL — ссылкой можно поделиться. */
import type { Diet, Recipe, RecipeCategory } from '../types/recipe.gen.ts';
import { CATEGORIES, DIETS } from './labels.ts';
import { search, type SearchIndexEntry } from './search.ts';

export type FlagId = 'quick' | 'season' | 'freeze' | 'light';
export type SortId = 'title' | 'time' | 'kcal';

export interface RecipeFilters {
  q: string;
  cat: RecipeCategory | null;
  flags: FlagId[];
  diets: Diet[];
  tag: string | null;
  sort: SortId;
}

export interface FlagDef {
  id: FlagId;
  label: (month: number) => string;
  test: (r: Recipe, month: number) => boolean;
}

const MONTH_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const isSeasonal = (r: Recipe, month: number) =>
  r.seasonality.months.length < 12 && r.seasonality.months.includes(month);

export const FLAGS: FlagDef[] = [
  { id: 'quick', label: () => 'До 30 минут', test: (r) => r.time.total <= 30 },
  { id: 'season', label: (m) => `Сезон: ${MONTH_NOM[m - 1]}`, test: isSeasonal },
  { id: 'freeze', label: () => 'Можно заморозить', test: (r) => r.freezing.suitable },
  { id: 'light', label: () => 'До 400 ккал', test: (r) => r.nutrition.kcal <= 400 },
];

export const SORTS: Record<SortId, string> = {
  title: 'По названию',
  time: 'Сначала быстрые',
  kcal: 'Сначала лёгкие',
};

const FLAG_IDS = new Set<string>(FLAGS.map((f) => f.id));

export function parseFilters(query: URLSearchParams): RecipeFilters {
  const cat = query.get('cat');
  const sort = query.get('sort');
  return {
    q: query.get('q') ?? '',
    cat: cat && cat in CATEGORIES ? (cat as RecipeCategory) : null,
    flags: (query.get('f') ?? '').split(',').filter((f): f is FlagId => FLAG_IDS.has(f)),
    diets: (query.get('diet') ?? '').split(',').filter((d): d is Diet => d in DIETS),
    tag: query.get('tag'),
    sort: sort && sort in SORTS ? (sort as SortId) : 'title',
  };
}

export function filtersToQuery(f: RecipeFilters): Record<string, string | null> {
  return {
    q: f.q.trim() || null,
    cat: f.cat,
    f: f.flags.join(',') || null,
    diet: f.diets.join(',') || null,
    tag: f.tag,
    sort: f.sort === 'title' ? null : f.sort,
  };
}

/** Количество активных фильтров из «листа» (без поиска и категории). */
export const extraFilterCount = (f: RecipeFilters) => f.flags.length + f.diets.length + (f.tag ? 1 : 0);

export function matchesExtras(r: Recipe, f: RecipeFilters, month: number): boolean {
  const flags = FLAGS.filter((def) => f.flags.includes(def.id));
  if (!flags.every((def) => def.test(r, month))) return false;
  if (!f.diets.every((d) => r.diet?.includes(d) || (d === 'vegetarian' && r.diet?.includes('vegan')))) return false;
  if (f.tag && !r.tags.includes(f.tag)) return false;
  return true;
}

export function applyFilters(index: SearchIndexEntry[], f: RecipeFilters, month: number): Recipe[] {
  const found = search(index, f.q).filter((r) => (!f.cat || r.category === f.cat) && matchesExtras(r, f, month));
  if (f.q.trim() && f.sort === 'title') return found; // при поиске — по релевантности
  const by: Record<SortId, (a: Recipe, b: Recipe) => number> = {
    title: () => 0,
    time: (a, b) => a.time.total - b.time.total,
    kcal: (a, b) => a.nutrition.kcal - b.nutrition.kcal,
  };
  return [...found].sort(by[f.sort]);
}
