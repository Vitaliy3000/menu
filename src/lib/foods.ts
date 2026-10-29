/** Каталог продуктов: шкала заморозки, поиск и фильтры. Состояние фильтров живёт в query-параметрах URL. */
import type { Food, FoodGroup, Foods } from '../types/foods.gen.ts';
import { CUISINES } from './flavor.ts';
import { normalize } from './search.ts';

export interface ScoreBand {
  min: number;
  max: number;
  label: string;
  hint: string;
}

/** От лучшей к худшей — те же границы, что в описании freezeScore в schemas/foods.schema.json. */
export const SCORE_BANDS: ScoreBand[] = [
  { min: 95, max: 100, label: 'Не отличить', hint: 'даже рядом со свежим' },
  { min: 85, max: 90, label: 'Почти без потерь', hint: 'разница видна только рядом или снимается простым приёмом' },
  { min: 70, max: 80, label: 'Хорошо', hint: 'заметно, но в обычном виде хорошо' },
  { min: 50, max: 65, label: 'С потерями', hint: 'хорошо после восстановления или в другом применении' },
  { min: 30, max: 45, label: 'Только в готовку', hint: 'годится как ингредиент в горячее' },
  { min: 10, max: 25, label: 'Плохо', hint: 'теряет смысл, спасти почти нечем' },
  { min: 0, max: 5, label: 'Не замораживать', hint: 'испортится или бессмысленно' },
];

export const bandOf = (score: number): ScoreBand => SCORE_BANDS.find((b) => score >= b.min)!;

export type FoodSort = 'shelf' | 'best' | 'worst';

export const FOOD_SORTS: Record<FoodSort, string> = {
  shelf: 'По группам',
  best: 'Сначала лучшие',
  worst: 'Сначала худшие',
};

export interface FoodFilters {
  q: string;
  group: string | null;
  min: number;
  sort: FoodSort;
}

export interface FoodEntry {
  food: Food;
  group: FoodGroup;
  text: string;
}

export function indexFoods(foods: Foods): FoodEntry[] {
  return foods.groups.flatMap((group) =>
    group.items.map((food) => {
      const cuisines = food.cuisines?.map((c) => CUISINES[c]).join(' ') ?? '';
      return { food, group, text: normalize(`${food.name} ${group.title} ${cuisines}`) };
    }),
  );
}

export function parseFoodFilters(query: URLSearchParams, groups: FoodGroup[]): FoodFilters {
  const group = query.get('group');
  const min = Number(query.get('min'));
  const sort = query.get('sort');
  return {
    q: query.get('q') ?? '',
    group: groups.some((g) => g.id === group) ? group : null,
    min: SCORE_BANDS.some((b) => b.min === min) ? min : 0,
    sort: sort && sort in FOOD_SORTS ? (sort as FoodSort) : 'shelf',
  };
}

export function foodFiltersToQuery(f: FoodFilters): Record<string, string | null> {
  return {
    q: f.q.trim() || null,
    group: f.group,
    min: f.min ? String(f.min) : null,
    sort: f.sort === 'shelf' ? null : f.sort,
  };
}

const matchesQuery = (e: FoodEntry, words: string[]) => words.every((w) => e.text.includes(w));
const queryWords = (q: string) => normalize(q).split(' ').filter(Boolean);

/** Без учёта группы — по ним считаются чипы групп. */
export function matchAllGroups(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const words = queryWords(f.q);
  return index.filter((e) => e.food.freezeScore >= f.min && matchesQuery(e, words));
}

/** Без учёта порога — по ним считается распределение оценок. */
export function matchAllScores(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const words = queryWords(f.q);
  return index.filter((e) => (!f.group || e.group.id === f.group) && matchesQuery(e, words));
}

export function filterFoods(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const found = matchAllScores(index, f).filter((e) => e.food.freezeScore >= f.min);
  const by: Record<FoodSort, (a: FoodEntry, b: FoodEntry) => number> = {
    shelf: () => 0,
    best: (a, b) => b.food.freezeScore - a.food.freezeScore,
    worst: (a, b) => a.food.freezeScore - b.food.freezeScore,
  };
  return [...found].sort(by[f.sort]);
}

/** Сколько позиций в каждой полосе шкалы — в порядке SCORE_BANDS. */
export function bandCounts(entries: FoodEntry[]): { band: ScoreBand; count: number }[] {
  return SCORE_BANDS.map((band) => ({ band, count: entries.filter((e) => bandOf(e.food.freezeScore) === band).length }));
}

/** Результаты по группам в порядке каталога. */
export function byGroup(entries: FoodEntry[]): { group: FoodGroup; entries: FoodEntry[] }[] {
  const groups = new Map<FoodGroup, FoodEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.group);
    if (list) list.push(e);
    else groups.set(e.group, [e]);
  }
  return [...groups].map(([group, list]) => ({ group, entries: list }));
}
